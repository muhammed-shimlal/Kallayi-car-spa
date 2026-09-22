/**
 * KALLAYI CAR SPA & AUTO CARE - DASHBOARD OVERVIEW UNIFIED API
 * Next.js 16 Route Handler: GET /api/dashboard/overview
 * Delivers 7-day revenue charts, live queue bookings, today's completed wash feed, and real-time financial KPIs.
 */

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseServer';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    // ─────────────────────────────────────────────────────────────────────────────
    // 1. STRICT INDIAN STANDARD TIME (IST - Asia/Kolkata) TIME BOUNDARIES
    // ─────────────────────────────────────────────────────────────────────────────
    const istFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const istDateStr = istFormatter.format(new Date()); // "YYYY-MM-DD" in IST
    const istStartUtc = new Date(`${istDateStr}T00:00:00+05:30`).toISOString();
    const istEndUtc = new Date(`${istDateStr}T23:59:59.999+05:30`).toISOString();

    // ─────────────────────────────────────────────────────────────────────────────
    // 2. 7-DAY REVENUE TREND (IST Rolling 7 Days)
    // ─────────────────────────────────────────────────────────────────────────────
    const sevenDaysAgo = new Date(`${istDateStr}T00:00:00+05:30`);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const sevenDaysAgoUtc = sevenDaysAgo.toISOString();

    const { data: weekInvoices } = await supabase
      .from('invoices')
      .select('*')
      .gte('created_at', sevenDaysAgoUtc)
      .lte('created_at', istEndUtc);

    const revenueByDayMap = new Map<string, number>();
    const chartData = [];

    // Initialize 7 days in order
    for (let i = 6; i >= 0; i--) {
      const d = new Date(`${istDateStr}T00:00:00+05:30`);
      d.setDate(d.getDate() - i);
      const dayIso = istFormatter.format(d);
      revenueByDayMap.set(dayIso, 0);
    }

    for (const inv of ((weekInvoices || []) as any[])) {
      if (inv.created_at) {
        const invDay = istFormatter.format(new Date(inv.created_at));
        if (revenueByDayMap.has(invDay)) {
          const invTotal = Number(
            inv.final_price ||
            inv.total_amount ||
            (Number(inv.split_cash || 0) + Number(inv.split_online || 0) + Number(inv.split_khata || 0)) ||
            inv.amount ||
            0
          );
          if (inv.is_paid || invTotal > 0) {
            const current = revenueByDayMap.get(invDay) || 0;
            revenueByDayMap.set(invDay, current + invTotal);
          }
        }
      }
    }

    for (const [dayIso, val] of revenueByDayMap.entries()) {
      const d = new Date(`${dayIso}T00:00:00+05:30`);
      const dayName = DAY_NAMES[d.getDay()];
      const formattedVal = Math.round(val * 100) / 100;
      chartData.push({
        name: dayName,
        date: dayIso,
        day: dayName,
        value: formattedVal,
        revenue: formattedVal,
        total: formattedVal,
        amount: formattedVal,
      });
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 3. FETCH TODAY'S WASHED VEHICLES & QUEUE (IST)
    // ─────────────────────────────────────────────────────────────────────────────
    const { data: todayBookings } = await supabase
      .from('bookings')
      .select(`
        *,
        customer:customers(*),
        vehicle:customer_vehicles(*),
        service_package:service_packages(*)
      `)
      .or(`created_at.gte.${istStartUtc},time_slot.gte.${istStartUtc}`)
      .lte('created_at', istEndUtc)
      .order('created_at', { ascending: false });

    // Fetch staff directory in memory to resolve technician names without schema relationship errors
    const { data: staffList } = await supabase
      .from('staff_profiles')
      .select('id, user_id, role');

    const staffMap = new Map();
    (staffList || []).forEach((s: any) => {
      staffMap.set(s.id, s);
      staffMap.set(s.user_id, s);
    });

    const rawTodayBookings = (todayBookings || []) as any[];

    const todayWashedVehicles = await Promise.all(
      rawTodayBookings.map(async (b) => {
        const customer = b.customer;
        const vehicle = b.vehicle;
        const pkg = b.service_package;
        const techProfile = b.technician_id ? staffMap.get(b.technician_id) : null;

        let customerName = (customer?.name && customer.name !== 'Guest Customer') ? customer.name : '';
        if (!customerName && customer?.user_id) {
          try {
            const { data: authUser } = await supabase.auth.admin.getUserById(customer.user_id);
            if (authUser?.user?.user_metadata) {
              const meta = authUser.user.user_metadata;
              const fullName =
                meta.full_name ||
                meta.name ||
                `${meta.first_name || ''} ${meta.last_name || ''}`.trim();
              if (fullName) customerName = fullName;
            }
          } catch {
            // Fallback
          }
        }
        if (!customerName) {
          customerName = customer?.name || 'Walk-In Customer';
        }

        let technicianName = techProfile ? `Staff (${techProfile.role})` : 'Unassigned';

        const dateObj = new Date(b.time_slot || b.created_at);
        const timeFormatted = dateObj.toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });

        const effectivePrice = Number(b.final_price || b.base_price || pkg?.price || 0);

        return {
          id: b.id,
          booking_id: b.id,
          date: timeFormatted,
          time: timeFormatted,
          is_today: true,
          plate_number: vehicle?.plate_number || 'UNKNOWN',
          vehicle_plate: vehicle?.plate_number || 'UNKNOWN',
          vehicle_model: vehicle ? `${vehicle.make || ''} ${vehicle.model || ''}`.trim() || 'Standard Car' : 'Standard Car',
          customer_name: customerName,
          customer_phone: customer?.phone_number || '',
          service_package_name: pkg?.name || 'Car Spa Wash',
          technician_name: technicianName,
          price: effectivePrice,
          invoice_amount: effectivePrice,
          status: b.status,
          invoice_status: b.status === 'COMPLETED' ? 'PAID' : 'PENDING',
        };
      })
    );

    // Active Queue Bookings for Kanban/List
    const { data: queueBookings } = await supabase
      .from('bookings')
      .select(`
        *,
        customer:customers(*),
        vehicle:customer_vehicles(*),
        service_package:service_packages(*)
      `)
      .in('status', ['WAITING', 'IN_BAY_1', 'IN_BAY_2', 'DETAILING', 'READY', 'IN_PROGRESS', 'CONFIRMED', 'COMPLETED'])
      .order('time_slot', { ascending: false })
      .limit(30);

    const recentBookings = ((queueBookings || []) as any[]).map((b) => ({
      id: b.id,
      customer_name: b.customer?.name || (b.customer?.phone_number ? `Customer (${b.customer.phone_number.slice(-4)})` : 'Walk-In'),
      customer_phone: b.customer?.phone_number || '',
      vehicle_plate: b.vehicle?.plate_number || 'UNKNOWN',
      vehicle_type: b.vehicle?.vehicle_type || 'CAR',
      service_package_name: b.service_package?.name || 'Standard Wash',
      status: b.status,
      bay_assignment: b.bay_assignment,
      time_slot: b.time_slot,
      base_price: Number(b.base_price || 0),
      final_price: Number(b.final_price || 0),
    }));

    // ─────────────────────────────────────────────────────────────────────────────
    // 4. REAL-TIME FINANCIAL KPI AGGREGATIONS (IST TODAY)
    // ─────────────────────────────────────────────────────────────────────────────
    
    // (A) Washed Today Count
    const completedWashes = rawTodayBookings.filter((b) =>
      ['COMPLETED', 'READY_FOR_PICKUP', 'READY', 'IN_PROGRESS', 'WAITING'].includes(b.status)
    );
    const washedToday = completedWashes.length > 0 ? completedWashes.length : rawTodayBookings.length;

    // (B) Today's Revenue & Invoiced Khata Credit
    const { data: todayInvoices } = await supabase
      .from('invoices')
      .select('*')
      .gte('created_at', istStartUtc)
      .lte('created_at', istEndUtc);

    let todayRevenue = 0;
    let todayInvoiceCredit = 0;
    for (const inv of ((todayInvoices || []) as any[])) {
      const invTotal = Number(
        inv.final_price ||
        inv.total_amount ||
        (Number(inv.split_cash || 0) + Number(inv.split_online || 0) + Number(inv.split_khata || 0)) ||
        inv.amount ||
        0
      );
      if (inv.is_paid || invTotal > 0) {
        todayRevenue += invTotal;
      }
      todayInvoiceCredit += Number(inv.split_khata || 0);
    }

    // (C) Today's Credit as Asset (Max of invoice split_khata and khata_ledgers CHARGE records)
    const { data: todayKhataCharges } = await supabase
      .from('khata_ledgers')
      .select('amount')
      .eq('transaction_type', 'CHARGE')
      .gte('created_at', istStartUtc)
      .lte('created_at', istEndUtc);

    const ledgerCharges = (todayKhataCharges || []).reduce(
      (sum: number, k: any) => sum + Number(k.amount || 0),
      0
    );
    const todayCreditAsset = Math.max(todayInvoiceCredit, ledgerCharges);

    // (D) Labor Cost Today
    const { data: todayPayrollEntries } = await supabase
      .from('payroll_entries')
      .select('base_wage, commission_earned, tips_earned, total_earned')
      .eq('date', istDateStr);

    let laborCostToday = 0;
    if (todayPayrollEntries && todayPayrollEntries.length > 0) {
      laborCostToday = todayPayrollEntries.reduce(
        (sum: number, p: any) => sum + Number(p.total_earned || (Number(p.base_wage || 0) + Number(p.commission_earned || 0) + Number(p.tips_earned || 0))),
        0
      );
    } else {
      // Fallback: Active staff daily base salaries + commission rules from today's completed jobs
      const { data: activeStaff } = await supabase
        .from('staff_profiles')
        .select('base_salary, salary_amount, salary_type, commission_rate, id, user_id')
        .eq('is_active', true);

      const baseSalaries = (activeStaff || []).reduce((sum: number, s: any) => {
        if (s.salary_type === 'DAILY' || s.salary_type === 'SALARY') {
          return sum + Number(s.salary_amount ?? s.base_salary ?? 0);
        }
        return sum;
      }, 0);

      let estimatedCommissions = 0;
      for (const b of rawTodayBookings) {
        if (b.status === 'COMPLETED' || b.status === 'READY') {
          const techId = b.technician_id;
          const staff = (activeStaff || []).find((s: any) => s.id === techId || s.user_id === techId);
          if (staff && Number(staff.commission_rate || 0) > 0) {
            const price = Number(b.final_price || b.base_price || 0);
            estimatedCommissions += (price * Number(staff.commission_rate)) / 100;
          }
        }
      }
      laborCostToday = Math.round((baseSalaries + estimatedCommissions) * 100) / 100;
    }

    // (E) General Expenses Today
    const { data: todayExpList } = await supabase
      .from('general_expenses')
      .select('amount, status, description')
      .eq('date', istDateStr)
      .neq('status', 'CANCELLED');

    const generalExpensesToday = (todayExpList || [])
      .filter((e: any) => !e.description?.includes('[STAFF_CASH_HANDOVER') && !e.description?.includes('[STAFF_ADVANCE:UNSETTLED'))
      .reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0);

    // (F) Bank Deposits Today
    let bankToday = 0;
    try {
      const { data: bankTxList, error: bErr } = await supabase
        .from('bank_transactions')
        .select('amount, transaction_type, transaction_date')
        .eq('transaction_type', 'DEPOSIT')
        .or(`transaction_date.eq.${istDateStr},transaction_date.gte.${istDateStr}T00:00:00`);

      if (!bErr && bankTxList && bankTxList.length > 0) {
        bankToday = bankTxList.reduce((sum: number, tx: any) => sum + Number(tx.amount || 0), 0);
      }
    } catch {
      // ignore
    }

    if (bankToday === 0) {
      const { data: todayBankDepositRecord } = await supabase
        .from('collection_banks')
        .select('amount')
        .eq('date', istDateStr)
        .maybeSingle();

      if (todayBankDepositRecord) {
        bankToday = Number(todayBankDepositRecord.amount || 0);
      }
    }

    // (G) Net Operating Profit Today
    // Net Profit = Today Revenue - (Labor Cost Today + General Expense Today)
    const netProfitToday = Math.round((todayRevenue - (laborCostToday + generalExpensesToday)) * 100) / 100;

    const kpiSummary = {
      // 1. Net Operating Profit Today
      net_profit_today: netProfitToday,

      // 2. Washed Today Count
      washed_today: washedToday,
      today_washed_count: washedToday,

      // 3. Today Revenue
      today_revenue: Math.round(todayRevenue * 100) / 100,
      revenue_today: Math.round(todayRevenue * 100) / 100,

      // 4. Today Credit as Asset
      today_credit_asset: Math.round(todayCreditAsset * 100) / 100,
      today_total_credit: Math.round(todayCreditAsset * 100) / 100,

      // 5. Labor Cost Today
      labor_cost_today: Math.round(laborCostToday * 100) / 100,

      // 6. General Expense Today
      general_expense_today: Math.round(generalExpensesToday * 100) / 100,
      general_expenses_today: Math.round(generalExpensesToday * 100) / 100,

      // 7. Bank Deposits Today
      bank_today: Math.round(bankToday * 100) / 100,
      today_collection_bank: Math.round(bankToday * 100) / 100,

      // Pre-booking Cash
      pre_booking_revenue: 0,
    };

    return NextResponse.json({
      success: true,
      chartData,
      todayWashedVehicles,
      todayWashedCount: washedToday,
      washed_today: washedToday,
      recentBookings,
      kpiData: kpiSummary,
      results: todayWashedVehicles,
      count: todayWashedVehicles.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    console.error('[Dashboard Overview Error]:', err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
