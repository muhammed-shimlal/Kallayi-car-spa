/**
 * KALLAYI CAR SPA & AUTO CARE - STAFF DAILY SETTLEMENT API ROUTE
 * Next.js 16 Route Handler: GET /api/staff/daily-settlement
 * Supports percentage commissions, advance auto-deductions,
 * and wage retention (retained balance) calculations.
 */

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    const istFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const todayStr = istFormatter.format(new Date());
    const istStartUtc = new Date(`${todayStr}T00:00:00+05:30`).toISOString();
    const istEndUtc = new Date(`${todayStr}T23:59:59.999+05:30`).toISOString();

    // 1. Fetch active staff profiles
    const { data: staffList, error: staffErr } = await supabase
      .from('staff_profiles')
      .select('*')
      .eq('is_active', true);

    if (staffErr) {
      return NextResponse.json({ success: false, error: staffErr.message }, { status: 500 });
    }

    // 2. Fetch today's payroll entries
    const { data: entries } = await supabase
      .from('payroll_entries')
      .select('*')
      .eq('date', todayStr);

    const entryMap = new Map();
    (entries || []).forEach((e: any) => {
      if (e.staff_user_id) entryMap.set(e.staff_user_id, e);
      if (e.staff_id) entryMap.set(e.staff_id, e);
    });

    // 3. Fetch today's bookings in IST to attribute wash revenue
    const { data: todayBookings } = await supabase
      .from('bookings')
      .select('technician_id, final_price, base_price, status, created_at')
      .gte('created_at', istStartUtc)
      .lte('created_at', istEndUtc);

    const washRevMap = new Map<string, number>();
    const jobsCountMap = new Map<string, number>();
    (todayBookings || []).forEach((b: any) => {
      if (['COMPLETED', 'READY_FOR_PICKUP', 'READY', 'IN_PROGRESS', 'WAITING'].includes(b.status) && b.technician_id) {
        const amt = Number(b.final_price || b.base_price || 0);
        washRevMap.set(b.technician_id, (washRevMap.get(b.technician_id) || 0) + amt);
        jobsCountMap.set(b.technician_id, (jobsCountMap.get(b.technician_id) || 0) + 1);
      }
    });

    // 4. Fetch all unsettled advances
    const { data: advances } = await supabase
      .from('staff_advances')
      .select('staff_id, amount')
      .eq('is_settled', false);

    const advanceMap = new Map<string, number>();
    if (advances && advances.length > 0) {
      advances.forEach((a: any) => {
        advanceMap.set(a.staff_id, (advanceMap.get(a.staff_id) || 0) + Number(a.amount || 0));
      });
    } else {
      const { data: expAdvances } = await supabase
        .from('general_expenses')
        .select('staff_id, amount')
        .ilike('description', '%[STAFF_ADVANCE:UNSETTLED%');
      (expAdvances || []).forEach((ea: any) => {
        if (ea.staff_id) {
          advanceMap.set(ea.staff_id, (advanceMap.get(ea.staff_id) || 0) + Number(ea.amount || 0));
        }
      });
    }

    // 5. Fetch all cash invoices collected by staff
    const { data: cashInvoices } = await supabase
      .from('invoices')
      .select('cash_collected_by_staff_id, split_cash')
      .not('cash_collected_by_staff_id', 'is', null);

    const cashCustodyMap = new Map<string, number>();
    (cashInvoices || []).forEach((inv: any) => {
      if (inv.cash_collected_by_staff_id) {
        cashCustodyMap.set(
          inv.cash_collected_by_staff_id,
          (cashCustodyMap.get(inv.cash_collected_by_staff_id) || 0) + Number(inv.split_cash || 0)
        );
      }
    });

    // 6. Fetch all cash handovers by staff
    const { data: handovers } = await supabase
      .from('staff_cash_handovers')
      .select('staff_id, amount');

    const handoverMap = new Map<string, number>();
    if (handovers && handovers.length > 0) {
      handovers.forEach((h: any) => {
        handoverMap.set(h.staff_id, (handoverMap.get(h.staff_id) || 0) + Number(h.amount || 0));
      });
    } else {
      const { data: expHandovers } = await supabase
        .from('general_expenses')
        .select('staff_id, amount')
        .ilike('description', '%[STAFF_CASH_HANDOVER%');
      (expHandovers || []).forEach((eh: any) => {
        if (eh.staff_id) {
          handoverMap.set(eh.staff_id, (handoverMap.get(eh.staff_id) || 0) + Number(eh.amount || 0));
        }
      });
    }

    const activeStaff = staffList || [];

    const payrollWorkers = await Promise.all(
      activeStaff.map(async (s: any) => {
        let name = `Staff (${s.role})`;
        let userMeta: any = null;
        try {
          const { data: user } = await supabase.auth.admin.getUserById(s.user_id);
          if (user?.user?.user_metadata) {
            userMeta = user.user.user_metadata;
            name =
              userMeta.full_name ||
              userMeta.name ||
              `${userMeta.first_name || ''} ${userMeta.last_name || ''}`.trim() ||
              user.user.email?.split('@')[0] ||
              name;
          }
        } catch {
          // Fallback
        }

        const p = entryMap.get(s.user_id) || entryMap.get(s.id);

        // Attributed wash revenue today & jobs count
        const washRev = Math.round(((washRevMap.get(s.id) || 0) + (washRevMap.get(s.user_id) || 0)) * 100) / 100;
        const jobsDone = (jobsCountMap.get(s.id) || 0) + (jobsCountMap.get(s.user_id) || 0);

        // Commission percentage & gross commission
        const commissionRate = Number(s.commission_percentage ?? s.commission_rate ?? 40);
        const computedCommission = Math.round((washRev * (commissionRate / 100)) * 100) / 100;
        const commissionEarned = Math.max(computedCommission, Number(p?.commission_earned ?? s.commission_amount ?? 0));

        // Base wage & tips
        const baseWage = Number(p?.base_wage ?? s.salary_amount ?? s.base_salary ?? 0);
        const tips = Number(p?.tips_earned ?? 0);
        const grossEarned = Math.round((baseWage + commissionEarned + tips) * 100) / 100;

        // Unsettled advances
        const staffAdvance = (advanceMap.get(s.id) || 0) + (advanceMap.get(s.user_id) || 0);

        // Previous retained balance rolling over (with auth user_metadata fallback)
        const previousRetainedBalance = Number(
          s.retained_balance !== null && s.retained_balance !== undefined
            ? s.retained_balance
            : (userMeta?.retained_balance ?? 0)
        );

        // Total Payable Due formula:
        // Total Payable Due = Gross Earnings + Previous Retained Balance - Unsettled Advances
        const totalPayableDue = Math.max(0, Math.round((grossEarned + previousRetainedBalance - staffAdvance) * 100) / 100);

        // Cash custody
        const totalCashCollected = (cashCustodyMap.get(s.id) || 0) + (cashCustodyMap.get(s.user_id) || 0);
        const totalHandedOver = (handoverMap.get(s.id) || 0) + (handoverMap.get(s.user_id) || 0);
        const cashInHand = Math.max(0, Math.round((totalCashCollected - totalHandedOver) * 100) / 100);

        const isSettled = p ? Boolean(p.is_settled) : false;
        const amountPaid = Number(p?.amount_paid || 0);
        const balanceRetained = Number(p?.balance_retained ?? (isSettled ? 0 : previousRetainedBalance));

        return {
          id: s.id,
          payroll_id: p?.id || null,
          profile_id: s.id,
          staff_id: s.id,
          staff_user_id: s.user_id,
          name,
          role: s.role,
          date: p?.date || todayStr,
          base_salary: baseWage,
          base_wage: baseWage,
          commission_percentage: commissionRate,
          commission_rate: commissionRate,
          wash_revenue_today: washRev,
          wash_revenue: washRev,
          commission_earned: commissionEarned,
          commission_amount: commissionEarned,
          tips_earned: tips,
          gross_earnings: grossEarned,
          total_earned: grossEarned,
          advances: staffAdvance,
          unsettled_advances: staffAdvance,
          previous_retained_balance: previousRetainedBalance,
          retained_balance: previousRetainedBalance,
          total_payable_due: totalPayableDue,
          final_payout: totalPayableDue,
          net_payable: totalPayableDue,
          amount_paid: amountPaid,
          balance_retained: balanceRetained,
          cash_in_hand: cashInHand,
          collected_cash_holding: cashInHand,
          status: isSettled ? 'Paid' : 'Pending',
          is_settled: isSettled,
          jobs_completed: jobsDone,
        };
      })
    );

    return NextResponse.json(payrollWorkers);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
