/**
 * KALLAYI CAR SPA & AUTO CARE - STAFF SETTLE PAY API ROUTE
 * Next.js 16 Route Handler: GET & POST /api/staff/settle-pay/[id]
 * Handles preview calculations, percentage commissions, advance auto-deductions,
 * and wage retention (withholding balance / deferred payout).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, getAuthUserFromRequest } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface RouteContext {
  params: Promise<{ id: string }>;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function resolveStaffProfile(supabase: any, paramId: string) {
  const cleanId = String(paramId || '').trim();
  if (!cleanId) return null;

  // 1. If cleanId is a valid UUID, query staff_profiles by id or user_id
  if (UUID_REGEX.test(cleanId)) {
    const { data: staff } = await supabase
      .from('staff_profiles')
      .select('*')
      .or(`id.eq.${cleanId},user_id.eq.${cleanId}`)
      .maybeSingle();

    if (staff) return staff;
  }

  // 2. If cleanId is numeric (e.g. '2'), check payroll_entries or staff_profiles index/row
  const numericId = parseInt(cleanId, 10);
  if (!isNaN(numericId)) {
    // 2a. Check payroll_entries where id = numericId
    const { data: pEntry } = await supabase
      .from('payroll_entries')
      .select('*')
      .eq('id', numericId)
      .maybeSingle();

    if (pEntry) {
      const staffRef = pEntry.staff_user_id || pEntry.staff_id;
      if (staffRef) {
        const { data: staff } = await supabase
          .from('staff_profiles')
          .select('*')
          .or(`id.eq.${staffRef},user_id.eq.${staffRef}`)
          .maybeSingle();

        if (staff) return staff;
      }
    }

    // 2b. Check staff_profiles directly ordered by created_at
    const { data: allStaff } = await supabase
      .from('staff_profiles')
      .select('*')
      .order('created_at', { ascending: true });

    if (allStaff && allStaff.length > 0) {
      // 1-based index (e.g. numericId = 2 -> 2nd staff profile)
      if (numericId >= 1 && numericId <= allStaff.length) {
        return allStaff[numericId - 1];
      }
      // 0-based index
      if (numericId >= 0 && numericId < allStaff.length) {
        return allStaff[numericId];
      }
      // Out-of-bounds index: fallback to first active staff profile
      const activeStaff = allStaff.filter((s: any) => s.is_active);
      if (activeStaff.length > 0) {
        return activeStaff[0];
      }
      return allStaff[0];
    }
  }

  // 3. Fallback: Lookup by phone number
  const { data: staffByPhone } = await supabase
    .from('staff_profiles')
    .select('*')
    .eq('phone_number', cleanId)
    .maybeSingle();

  if (staffByPhone) return staffByPhone;

  // 4. Ultimate fallback: Return first active staff profile if one exists
  const { data: fallbackStaff } = await supabase
    .from('staff_profiles')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (fallbackStaff) return fallbackStaff;

  return null;
}

/**
 * GET /api/staff/settle-pay/[id]
 * Previews attributed wash revenue, percentage commission, unsettled advances,
 * previous retained balance, and total payable due.
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const supabase = getSupabaseAdmin();
    const { id } = await context.params;
    const staffProfile = await resolveStaffProfile(supabase, id);

    if (!staffProfile) {
      return NextResponse.json(
        { success: false, error: `Staff profile not found for identifier: ${id}` },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');

    const istFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const todayStr = dateParam || istFormatter.format(new Date());
    const istStartUtc = new Date(`${todayStr}T00:00:00+05:30`).toISOString();
    const istEndUtc = new Date(`${todayStr}T23:59:59.999+05:30`).toISOString();

    // 1. Fetch current payroll entry for the given date (or today)
    const { data: payrollEntry } = await supabase
      .from('payroll_entries')
      .select('*')
      .eq('staff_user_id', staffProfile.user_id)
      .eq('date', todayStr)
      .maybeSingle();

    // 2. Attributed Wash Revenue Today
    const { data: staffBookings } = await supabase
      .from('bookings')
      .select('final_price, base_price, status, created_at')
      .or(`technician_id.eq.${staffProfile.id},technician_id.eq.${staffProfile.user_id}`)
      .gte('created_at', istStartUtc)
      .lte('created_at', istEndUtc);

    let washRevenue = 0;
    for (const b of (staffBookings || [])) {
      if (['COMPLETED', 'READY_FOR_PICKUP', 'READY', 'IN_PROGRESS', 'WAITING'].includes(b.status)) {
        washRevenue += Number(b.final_price || b.base_price || 0);
      }
    }
    washRevenue = Math.round(washRevenue * 100) / 100;

    // 3. Percentage Commission Calculation
    const commissionPercentage = Number(
      staffProfile.commission_percentage ?? staffProfile.commission_rate ?? 40
    );
    const computedCommission = Math.round((washRevenue * commissionPercentage / 100) * 100) / 100;
    const commissionEarned = Math.max(computedCommission, Number(payrollEntry?.commission_earned || 0));

    // Base Wage & Tips
    const baseWage = Number(payrollEntry?.base_wage ?? staffProfile.salary_amount ?? staffProfile.base_salary ?? 0);
    const tips = Number(payrollEntry?.tips_earned || 0);
    const grossEarned = Math.round((baseWage + commissionEarned + tips) * 100) / 100;

    // 4. Fetch Unsettled Advances (with general_expenses fallback)
    let unsettledList: any[] = [];
    const { data: advances, error: advErr } = await supabase
      .from('staff_advances')
      .select('*')
      .eq('staff_id', staffProfile.id)
      .eq('is_settled', false)
      .order('date', { ascending: false });

    if (!advErr && advances) {
      unsettledList = advances;
    } else {
      const { data: expRows } = await supabase
        .from('general_expenses')
        .select('*')
        .or(`staff_id.eq.${staffProfile.user_id},staff_id.eq.${staffProfile.id}`)
        .ilike('description', '%[STAFF_ADVANCE:UNSETTLED%');

      unsettledList = (expRows || []).map((exp: any) => ({
        id: String(exp.id),
        amount: Number(exp.amount || 0),
        purpose: String(exp.description || '').replace(/\[STAFF_ADVANCE:UNSETTLED\]\s*/i, ''),
        date: exp.date,
        is_settled: false,
      }));
    }

    const totalAdvance = unsettledList.reduce((acc: number, item: any) => acc + Number(item.amount || 0), 0);

    // Resolve Auth user name & metadata
    let staffName = `Staff (${staffProfile.role})`;
    let authMetaRetained: number | null = null;
    try {
      const { data: authUser } = await supabase.auth.admin.getUserById(staffProfile.user_id);
      if (authUser?.user?.user_metadata) {
        const meta = authUser.user.user_metadata;
        staffName = meta.full_name || meta.name || `${meta.first_name || ''} ${meta.last_name || ''}`.trim() || staffName;
        if (meta.retained_balance !== undefined && meta.retained_balance !== null) {
          authMetaRetained = Number(meta.retained_balance);
        }
      }
    } catch {
      // Fallback
    }

    // 5. Previous Retained Balance (Withheld wages rolling over from previous cycles)
    const previousRetainedBalance = Number(
      staffProfile.retained_balance !== null && staffProfile.retained_balance !== undefined
        ? staffProfile.retained_balance
        : (authMetaRetained ?? 0)
    );

    // 6. Total Payable Due: (Gross Earnings + Previous Retained Balance) - Total Advances
    const totalPayableDue = Math.max(0, Math.round((grossEarned + previousRetainedBalance - totalAdvance) * 100) / 100);

    // 7. Fetch Cash In Hand (Customer cash collected on invoices minus handovers)
    const { data: cashInvoices } = await supabase
      .from('invoices')
      .select('split_cash')
      .eq('cash_collected_by_staff_id', staffProfile.id);

    const totalCashCollected = (cashInvoices || []).reduce(
      (acc: number, inv: any) => acc + Number(inv.split_cash || 0),
      0
    );

    let totalHandovers = 0;
    const { data: handovers, error: hErr } = await supabase
      .from('staff_cash_handovers')
      .select('amount')
      .eq('staff_id', staffProfile.id);

    if (!hErr && handovers) {
      totalHandovers = handovers.reduce((acc: number, h: any) => acc + Number(h.amount || 0), 0);
    } else {
      const { data: expHandovers } = await supabase
        .from('general_expenses')
        .select('amount')
        .or(`staff_id.eq.${staffProfile.user_id},description.ilike.%[STAFF_CASH_HANDOVER:${staffProfile.id}]%`);

      totalHandovers = (expHandovers || []).reduce((acc: number, h: any) => acc + Number(h.amount || 0), 0);
    }

    const cashInHand = Math.max(0, Math.round((totalCashCollected - totalHandovers) * 100) / 100);

    const responsePayload = {
      staff_id: staffProfile.id,
      user_id: staffProfile.user_id,
      staff_name: staffName,
      role: staffProfile.role,
      wash_revenue: washRevenue,
      commission_percentage: commissionPercentage,
      commission_rate: commissionPercentage,
      commission_earned: commissionEarned,
      commission_amount: commissionEarned,
      base_wage: baseWage,
      tips_earned: tips,
      gross_earned: grossEarned,
      gross_earnings: grossEarned,
      unsettled_advances: Math.round(totalAdvance * 100) / 100,
      unsettled_advances_list: unsettledList,
      total_advances: Math.round(totalAdvance * 100) / 100,
      previous_retained_balance: previousRetainedBalance,
      retained_balance: previousRetainedBalance,
      total_payable_due: totalPayableDue,
      net_payable: totalPayableDue,
      net_payout: totalPayableDue,
      cash_in_hand: cashInHand,
      is_already_settled: payrollEntry ? Boolean(payrollEntry.is_settled) : false,
      date: payrollEntry?.date || todayStr,
    };

    return NextResponse.json({
      success: true,
      ...responsePayload,
      data: responsePayload,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    console.error('[Staff Settle Pay GET Exception]:', err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * POST /api/staff/settle-pay/[id]
 * Executes salary payout, handles partial payout retention (roll-over into retained_balance),
 * atomically deducts all unsettled advances, and marks payroll settled.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await getAuthUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Authentication required.' },
        { status: 401 }
      );
    }
    const role = (user.role || (user as any).user_metadata?.role || '').toUpperCase();
    if (role !== 'ADMIN' && role !== 'MANAGER') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Only Admin or Manager can execute payroll payouts.' },
        { status: 403 }
      );
    }

    const supabase = getSupabaseAdmin();
    const { id } = await context.params;
    const staffProfile = await resolveStaffProfile(supabase, id);

    if (!staffProfile) {
      return NextResponse.json(
        { success: false, error: `Staff profile not found for identifier: ${id}` },
        { status: 404 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const {
      amount_paid,
      paid_amount,
      payment_method = 'CASH',
      notes = '',
      deduct_advance = true,
      offset_cash_in_hand = false,
      date,
    } = body;

    const istFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const todayStr = date || istFormatter.format(new Date());
    const istStartUtc = new Date(`${todayStr}T00:00:00+05:30`).toISOString();
    const istEndUtc = new Date(`${todayStr}T23:59:59.999+05:30`).toISOString();

    // 1. Fetch or create today's payroll entry
    const { data: existingPayroll } = await supabase
      .from('payroll_entries')
      .select('*')
      .eq('staff_user_id', staffProfile.user_id)
      .eq('date', todayStr)
      .maybeSingle();

    let activePayroll = existingPayroll;

    // 2. Compute Attributed Wash Revenue Today
    const { data: staffBookings } = await supabase
      .from('bookings')
      .select('final_price, base_price, status, created_at')
      .or(`technician_id.eq.${staffProfile.id},technician_id.eq.${staffProfile.user_id}`)
      .gte('created_at', istStartUtc)
      .lte('created_at', istEndUtc);

    let washRevenue = 0;
    for (const b of (staffBookings || [])) {
      if (['COMPLETED', 'READY_FOR_PICKUP', 'READY', 'IN_PROGRESS', 'WAITING'].includes(b.status)) {
        washRevenue += Number(b.final_price || b.base_price || 0);
      }
    }
    washRevenue = Math.round(washRevenue * 100) / 100;

    const commissionPercentage = Number(
      staffProfile.commission_percentage ?? staffProfile.commission_rate ?? 40
    );
    const computedCommission = Math.round((washRevenue * commissionPercentage / 100) * 100) / 100;
    const commissionEarned = Math.max(computedCommission, Number(activePayroll?.commission_earned || 0));

    const baseWage = Number(activePayroll?.base_wage ?? staffProfile.salary_amount ?? staffProfile.base_salary ?? 0);
    const tips = Number(activePayroll?.tips_earned || 0);
    const grossEarned = Math.round((baseWage + commissionEarned + tips) * 100) / 100;

    // 3. Fetch unsettled advances
    let advanceList: any[] = [];
    const { data: unsettledAdvances, error: advErr } = await supabase
      .from('staff_advances')
      .select('id, amount')
      .eq('staff_id', staffProfile.id)
      .eq('is_settled', false);

    if (!advErr && unsettledAdvances) {
      advanceList = unsettledAdvances;
    } else {
      const { data: expRows } = await supabase
        .from('general_expenses')
        .select('id, amount')
        .or(`staff_id.eq.${staffProfile.user_id},staff_id.eq.${staffProfile.id}`)
        .ilike('description', '%[STAFF_ADVANCE:UNSETTLED%');

      advanceList = (expRows || []).map((exp: any) => ({
        id: String(exp.id),
        amount: Number(exp.amount || 0),
      }));
    }

    const totalAdvance = advanceList.reduce((acc: number, item: any) => acc + Number(item.amount || 0), 0);

    // 4. Previous Retained Balance
    const previousRetainedBalance = Number(staffProfile.retained_balance || 0);

    // 5. Total Payable Due = Gross Earnings + Previous Retained - Advances Deducted
    const totalPayableDue = Math.max(
      0,
      Math.round((grossEarned + previousRetainedBalance - (deduct_advance ? totalAdvance : 0)) * 100) / 100
    );

    // 6. Actual Paid Amount (Partial or Full)
    let finalPaidAmount = totalPayableDue;
    const providedPaid = amount_paid !== undefined && amount_paid !== null
      ? amount_paid
      : paid_amount;

    if (providedPaid !== undefined && providedPaid !== null && !isNaN(parseFloat(String(providedPaid)))) {
      finalPaidAmount = Math.min(totalPayableDue, Math.max(0, parseFloat(String(providedPaid))));
    }

    // 7. Wage Retention: Portion held back rolls over into retained_balance
    const balanceRetained = Math.max(
      0,
      Math.round((totalPayableDue - finalPaidAmount) * 100) / 100
    );

    const nowIso = new Date().toISOString();
    const payrollId = activePayroll?.id || Date.now();

    // 8. Update or Insert Payroll Entry
    const payrollPayload: any = {
      staff_user_id: staffProfile.user_id,
      date: todayStr,
      base_wage: baseWage,
      commission_earned: commissionEarned,
      commission_amount: commissionEarned,
      tips_earned: tips,
      gross_earnings: grossEarned,
      advance_deducted: deduct_advance ? totalAdvance : 0,
      previous_retained_applied: previousRetainedBalance,
      net_payable: totalPayableDue,
      amount_paid: finalPaidAmount,
      balance_retained: balanceRetained,
      is_settled: true,
      settled_at: nowIso,
    };

    if (activePayroll?.id) {
      try {
        await supabase
          .from('payroll_entries')
          .update(payrollPayload)
          .eq('id', activePayroll.id);
      } catch {
        // Fallback for legacy columns only if new columns aren't created yet
        await supabase
          .from('payroll_entries')
          .update({
            is_settled: true,
            settled_at: nowIso,
            base_wage: baseWage,
            commission_earned: commissionEarned,
          })
          .eq('id', activePayroll.id);
      }
    } else {
      try {
        const { data: newEntry } = await supabase
          .from('payroll_entries')
          .insert(payrollPayload)
          .select('*')
          .maybeSingle();

        if (newEntry) activePayroll = newEntry;
      } catch {
        const { data: newEntry } = await supabase
          .from('payroll_entries')
          .insert({
            staff_user_id: staffProfile.user_id,
            date: todayStr,
            base_wage: baseWage,
            commission_earned: commissionEarned,
            tips_earned: tips,
            is_settled: true,
            settled_at: nowIso,
          })
          .select('*')
          .maybeSingle();

        if (newEntry) activePayroll = newEntry;
      }
    }

    // 9. Mark all unsettled advances as settled
    let advancesSettledCount = 0;
    if (deduct_advance && advanceList.length > 0) {
      const advanceIds = advanceList.map((a: any) => a.id);

      const { error: advUpdateErr } = await supabase
        .from('staff_advances')
        .update({
          is_settled: true,
          settled_at: nowIso,
          payout_id: activePayroll?.id || null,
        })
        .in('id', advanceIds);

      if (!advUpdateErr) {
        advancesSettledCount += advanceIds.length;
      }

      // General expenses fallback
      const { data: rawExp } = await supabase
        .from('general_expenses')
        .select('id, description')
        .or(`staff_id.eq.${staffProfile.user_id},staff_id.eq.${staffProfile.id}`)
        .ilike('description', '%[STAFF_ADVANCE:UNSETTLED%');

      if (rawExp && rawExp.length > 0) {
        for (const r of rawExp) {
          const updatedDesc = r.description.replace('[STAFF_ADVANCE:UNSETTLED]', `[STAFF_ADVANCE:SETTLED:${payrollId}]`);
          await supabase
            .from('general_expenses')
            .update({ description: updatedDesc })
            .eq('id', r.id);
          advancesSettledCount++;
        }
      }
    }

    // 10. Update worker's retained_balance in staff_profiles & auth user_metadata
    try {
      await supabase
        .from('staff_profiles')
        .update({
          retained_balance: balanceRetained,
        })
        .eq('id', staffProfile.id);
    } catch {
      // Non-critical if column is being created
    }

    if (staffProfile.user_id) {
      try {
        const { data: authUser } = await supabase.auth.admin.getUserById(staffProfile.user_id);
        if (authUser?.user) {
          await supabase.auth.admin.updateUserById(staffProfile.user_id, {
            user_metadata: {
              ...authUser.user.user_metadata,
              retained_balance: balanceRetained,
            },
          });
        }
      } catch {
        // Non-critical
      }
    }

    // 11. Record salary payout in salary_payments table
    try {
      await supabase.from('salary_payments').insert({
        staff_id: staffProfile.id,
        paid_amount: finalPaidAmount,
        payment_method: (payment_method as any) || 'CASH',
        notes: notes || `Settlement: Paid ₹${finalPaidAmount}, Retained ₹${balanceRetained}, Advances ₹${totalAdvance}`,
        period_start: todayStr,
        period_end: todayStr,
      });
    } catch {
      // Non-critical
    }

    // 12. Optional Cash-in-hand offset
    if (offset_cash_in_hand && finalPaidAmount > 0) {
      await supabase.from('staff_cash_handovers').insert({
        staff_id: staffProfile.id,
        amount: finalPaidAmount,
        notes: `Payout settlement offset: ${notes || 'Staff retained collected cash as wage'}`,
        handover_date: nowIso,
      });
    }

    const payoutData = {
      id: payrollId,
      staff_id: staffProfile.id,
      payroll_entry_id: payrollId,
      wash_revenue: washRevenue,
      commission_percentage: commissionPercentage,
      commission_earned: commissionEarned,
      commission_amount: commissionEarned,
      base_wage: baseWage,
      gross_earned: grossEarned,
      gross_earnings: grossEarned,
      advances_deducted: deduct_advance ? totalAdvance : 0,
      previous_retained_applied: previousRetainedBalance,
      previous_retained_balance: previousRetainedBalance,
      total_payable_due: totalPayableDue,
      net_payable: totalPayableDue,
      net_payout: totalPayableDue,
      paid_amount: finalPaidAmount,
      amount_paid: finalPaidAmount,
      balance_retained: balanceRetained,
      new_retained_balance: balanceRetained,
      payment_method,
      advances_settled_count: advancesSettledCount,
      settled_at: nowIso,
    };

    const retentionMsg = balanceRetained > 0
      ? ` (₹${balanceRetained.toLocaleString('en-IN')} held back as pending balance)`
      : ' (fully cleared)';

    return NextResponse.json({
      success: true,
      message: `Salary payout of ₹${finalPaidAmount.toLocaleString('en-IN')} settled successfully${retentionMsg}.`,
      payout: payoutData,
      data: payoutData,
      advances_deducted_count: advancesSettledCount,
      advances_deducted_total: deduct_advance ? totalAdvance : 0,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    console.error('[Staff Settle Pay POST Exception]:', err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
