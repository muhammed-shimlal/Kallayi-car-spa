/**
 * KALLAYI CAR SPA & AUTO CARE - END OF DAY (EOD) REGISTER CLOSEOUT API
 * Next.js 16 Route Handler: GET & POST /api/finance/eod
 * Real-time daily register reconciliation, cash drawer truth audit, and closing persistence.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Helper to compute IST date and UTC range boundaries
 */
function getIstDateRange(dateParam?: string | null) {
  const istFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const istToday = istFormatter.format(new Date()); // YYYY-MM-DD
  const targetDate = (dateParam && dateParam.trim().length >= 8 && dateParam !== 'undefined')
    ? dateParam.trim()
    : istToday;

  const istStartUtc = new Date(`${targetDate}T00:00:00+05:30`).toISOString();
  const istEndUtc = new Date(`${targetDate}T23:59:59.999+05:30`).toISOString();

  return { istToday, targetDate, istStartUtc, istEndUtc };
}

/**
 * GET /api/finance/eod?date=YYYY-MM-DD&opening_float=XX
 * Returns complete EOD calculations for Indian Standard Time today or selected date
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    const floatParam = searchParams.get('opening_float');

    const { targetDate, istStartUtc, istEndUtc } = getIstDateRange(dateParam);

    // ─────────────────────────────────────────────────────────────────────────
    // 1. WASHE COUNT (Bookings completed today in IST)
    // ─────────────────────────────────────────────────────────────────────────
    const { data: bookingsData } = await supabase
      .from('bookings')
      .select('id, status, created_at, time_slot')
      .or(`time_slot.gte.${istStartUtc},created_at.gte.${istStartUtc}`)
      .or(`time_slot.lte.${istEndUtc},created_at.lte.${istEndUtc}`);

    const rawBookings = bookingsData || [];
    const completedWashes = rawBookings.filter((b) =>
      ['COMPLETED', 'READY_FOR_PICKUP', 'DELIVERED', 'IN_PROGRESS', 'READY'].includes(b.status)
    );
    const totalWashesCount = completedWashes.length > 0 ? completedWashes.length : rawBookings.length;

    // ─────────────────────────────────────────────────────────────────────────
    // 2. INFLOW BREAKDOWN (Invoices created today in IST)
    // ─────────────────────────────────────────────────────────────────────────
    const { data: invoicesData, error: invErr } = await supabase
      .from('invoices')
      .select('*')
      .gte('created_at', istStartUtc)
      .lte('created_at', istEndUtc);

    if (invErr) {
      console.error('[EOD GET invoices query error]:', invErr);
    }

    const todayInvoices = invoicesData || [];
    let totalCashCollected = 0;
    let totalUpiCollected = 0;
    let totalCreditIssued = 0;

    for (const inv of todayInvoices) {
      const splitCash = Number(inv.split_cash || 0);
      const splitOnline = Number(inv.split_online || 0);
      const splitKhata = Number(inv.split_khata || 0);
      const invoiceAmount = Number(
        (inv as any).amount ||
        inv.final_price ||
        (inv as any).total_amount ||
        (splitCash + splitOnline + splitKhata) ||
        0
      );

      // If splits were explicitly recorded
      if (splitCash > 0 || splitOnline > 0 || splitKhata > 0) {
        totalCashCollected += splitCash;
        totalUpiCollected += splitOnline;
        totalCreditIssued += splitKhata;
      } else {
        // Fallback based on payment_method if split columns were 0
        const method = String(inv.payment_method || 'CASH').toUpperCase();
        if (method === 'UPI' || method === 'ONLINE' || method === 'CARD') {
          totalUpiCollected += invoiceAmount;
        } else if (method === 'KHATA' || method === 'CREDIT') {
          totalCreditIssued += invoiceAmount;
        } else {
          totalCashCollected += invoiceAmount;
        }
      }
    }

    const grossRevenue = Math.round((totalCashCollected + totalUpiCollected + totalCreditIssued) * 100) / 100;

    // ─────────────────────────────────────────────────────────────────────────
    // 3. OUTFLOW & GENERAL EXPENSES (Cash vs Online)
    // ─────────────────────────────────────────────────────────────────────────
    const { data: expensesData } = await supabase
      .from('general_expenses')
      .select('*')
      .eq('date', targetDate)
      .neq('status', 'CANCELLED');

    let generalExpensesCash = 0;
    let generalExpensesOnline = 0;

    const filteredExpenses = (expensesData || []).filter((e: any) =>
      !e.description?.includes('[STAFF_CASH_HANDOVER') &&
      !e.description?.includes('[STAFF_ADVANCE:UNSETTLED')
    );

    for (const exp of filteredExpenses) {
      const amt = Number(exp.amount || 0);
      const method = String(exp.payment_method || 'CASH').toUpperCase();
      if (method === 'CASH') {
        generalExpensesCash += amt;
      } else {
        generalExpensesOnline += amt;
      }
    }

    generalExpensesCash = Math.round(generalExpensesCash * 100) / 100;
    generalExpensesOnline = Math.round(generalExpensesOnline * 100) / 100;

    // ─────────────────────────────────────────────────────────────────────────
    // 4. STAFF CASH PAYOUTS (Advances & Daily Settlement Wages Paid in Cash)
    // ─────────────────────────────────────────────────────────────────────────
    // A. Staff Cash Advances paid out today
    const { data: advancesData } = await supabase
      .from('staff_advances')
      .select('amount, created_at, date')
      .or(`created_at.gte.${istStartUtc},date.eq.${targetDate}`)
      .or(`created_at.lte.${istEndUtc},date.eq.${targetDate}`);

    const advancesTotal = (advancesData || []).reduce((sum, a) => sum + Number(a.amount || 0), 0);

    // B. Settled Payroll payouts today
    const { data: payrollData } = await supabase
      .from('payroll_entries')
      .select('amount_paid, is_settled, date')
      .eq('date', targetDate)
      .eq('is_settled', true);

    const settledWagesTotal = (payrollData || []).reduce((sum, p) => sum + Number(p.amount_paid || 0), 0);
    const staffCashPayouts = Math.round((advancesTotal + settledWagesTotal) * 100) / 100;

    // ─────────────────────────────────────────────────────────────────────────
    // 5. BANK SAVINGS / DAILY DEPOSITS SENT TO BANK
    // ─────────────────────────────────────────────────────────────────────────
    let bankSavingsDeposited = 0;
    const { data: bankTxData } = await supabase
      .from('bank_transactions')
      .select('amount, transaction_type, transaction_date, created_at')
      .eq('transaction_type', 'DEPOSIT')
      .or(`transaction_date.eq.${targetDate},created_at.gte.${istStartUtc}`)
      .or(`transaction_date.eq.${targetDate},created_at.lte.${istEndUtc}`);

    if (bankTxData && bankTxData.length > 0) {
      bankSavingsDeposited = bankTxData.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
    } else {
      // Legacy fallback
      const { data: legacyBank } = await supabase
        .from('collection_banks')
        .select('amount')
        .eq('date', targetDate);

      bankSavingsDeposited = (legacyBank || []).reduce((sum, b) => sum + Number(b.amount || 0), 0);
    }
    bankSavingsDeposited = Math.round(bankSavingsDeposited * 100) / 100;

    // ─────────────────────────────────────────────────────────────────────────
    // 6. OPENING FLOAT (From query param or previous EOD closing actual cash)
    // ─────────────────────────────────────────────────────────────────────────
    let openingFloat = 0;
    if (floatParam !== null && !isNaN(Number(floatParam))) {
      openingFloat = Math.max(0, Number(floatParam));
    } else {
      // Query previous closing record from eod_closings or daily_register_audits
      try {
        const { data: prevEod } = await (supabase as any)
          .from('eod_closings')
          .select('actual_cash, expected_cash')
          .lt('closing_date', targetDate)
          .order('closing_date', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (prevEod) {
          openingFloat = Number(prevEod.actual_cash ?? prevEod.expected_cash ?? 0);
        } else {
          const { data: prevAudit } = await supabase
            .from('daily_register_audits')
            .select('expected_cash_in_till')
            .lt('date', targetDate)
            .order('date', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (prevAudit) {
            openingFloat = Number(prevAudit.expected_cash_in_till || 0);
          }
        }
      } catch {
        // Fallback default float
        openingFloat = 0;
      }
    }
    openingFloat = Math.round(openingFloat * 100) / 100;

    // ─────────────────────────────────────────────────────────────────────────
    // 7. CASH DRAWER TRUTH & PROFITABILITY CALCULATIONS
    // ─────────────────────────────────────────────────────────────────────────
    const expectedCashInHand = Math.round(
      ((openingFloat + totalCashCollected) - (generalExpensesCash + staffCashPayouts + bankSavingsDeposited)) * 100
    ) / 100;

    const totalExpenses = Math.round((generalExpensesCash + generalExpensesOnline + staffCashPayouts) * 100) / 100;
    const netProfit = Math.round((grossRevenue - totalExpenses) * 100) / 100;

    // ─────────────────────────────────────────────────────────────────────────
    // 8. CHECK IF DAY REGISTER IS ALREADY CLOSED
    // ─────────────────────────────────────────────────────────────────────────
    let isClosed = false;
    let existingClosing: any = null;

    try {
      const { data: closedRecord } = await (supabase as any)
        .from('eod_closings')
        .select('*')
        .eq('closing_date', targetDate)
        .maybeSingle();

      if (closedRecord) {
        isClosed = true;
        existingClosing = closedRecord;
      }
    } catch {
      // Ignore
    }

    if (!isClosed) {
      try {
        const { data: auditRecord } = await supabase
          .from('daily_register_audits')
          .select('*')
          .eq('date', targetDate)
          .maybeSingle();

        if (auditRecord?.is_locked) {
          isClosed = true;
          existingClosing = {
            id: auditRecord.id,
            closing_date: auditRecord.date,
            gross_revenue: auditRecord.gross_revenue,
            expected_cash: auditRecord.expected_cash_in_till,
            actual_cash: auditRecord.expected_cash_in_till,
            discrepancy: 0,
            notes: 'Legacy register lock record',
            created_at: auditRecord.closed_at || auditRecord.created_at,
          };
        }
      } catch {
        // Ignore
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        date: targetDate,
        is_closed: isClosed,
        closing_record: existingClosing,
        inflow: {
          gross_revenue: grossRevenue,
          total_cash_collected: totalCashCollected,
          total_upi_collected: totalUpiCollected,
          total_credit_issued: totalCreditIssued,
          total_washes_count: totalWashesCount,
          invoices_count: todayInvoices.length,
        },
        outflow: {
          general_expenses_cash: generalExpensesCash,
          general_expenses_online: generalExpensesOnline,
          staff_cash_payouts: staffCashPayouts,
          advances_paid: advancesTotal,
          settled_wages_paid: settledWagesTotal,
          bank_savings_deposited: bankSavingsDeposited,
          total_expenses: totalExpenses,
        },
        reconciliation: {
          opening_float: openingFloat,
          cash_in: totalCashCollected,
          cash_out: Math.round((generalExpensesCash + staffCashPayouts + bankSavingsDeposited) * 100) / 100,
          expected_cash_in_hand: expectedCashInHand,
        },
        profitability: {
          gross_revenue: grossRevenue,
          total_expenses: totalExpenses,
          net_profit: netProfit,
        },
      },
    }, { status: 200 });
  } catch (err: unknown) {
    console.error('[EOD GET Exception]:', err);
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : 'Internal Server Error',
    }, { status: 500 });
  }
}

/**
 * POST /api/finance/eod
 * Closes the day register, seals ledger, records actual counted cash & discrepancy.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await request.json();

    const {
      actual_cash_counted = 0,
      notes = '',
      opening_float: customFloat = null,
      date: customDate = null,
      closed_by_user_id = null,
    } = body;

    const { targetDate, istStartUtc, istEndUtc } = getIstDateRange(customDate);

    // ─────────────────────────────────────────────────────────────────────────
    // Re-verify server-side metrics to ensure bulletproof accuracy
    // ─────────────────────────────────────────────────────────────────────────
    const { data: bookingsData } = await supabase
      .from('bookings')
      .select('id, status')
      .or(`time_slot.gte.${istStartUtc},created_at.gte.${istStartUtc}`)
      .or(`time_slot.lte.${istEndUtc},created_at.lte.${istEndUtc}`);

    const rawBookings = bookingsData || [];
    const completedWashes = rawBookings.filter((b) =>
      ['COMPLETED', 'READY_FOR_PICKUP', 'DELIVERED', 'IN_PROGRESS', 'READY'].includes(b.status)
    );
    const totalWashes = completedWashes.length > 0 ? completedWashes.length : rawBookings.length;

    // Invoices
    const { data: invoicesData } = await supabase
      .from('invoices')
      .select('*')
      .gte('created_at', istStartUtc)
      .lte('created_at', istEndUtc);

    let cashCollected = 0;
    let upiCollected = 0;
    let creditIssued = 0;

    for (const inv of invoicesData || []) {
      const splitCash = Number(inv.split_cash || 0);
      const splitOnline = Number(inv.split_online || 0);
      const splitKhata = Number(inv.split_khata || 0);
      const amt = Number(inv.amount || inv.final_price || (splitCash + splitOnline + splitKhata) || 0);

      if (splitCash > 0 || splitOnline > 0 || splitKhata > 0) {
        cashCollected += splitCash;
        upiCollected += splitOnline;
        creditIssued += splitKhata;
      } else {
        const method = String(inv.payment_method || 'CASH').toUpperCase();
        if (method === 'UPI' || method === 'ONLINE' || method === 'CARD') {
          upiCollected += amt;
        } else if (method === 'KHATA' || method === 'CREDIT') {
          creditIssued += amt;
        } else {
          cashCollected += amt;
        }
      }
    }

    const grossRevenue = Math.round((cashCollected + upiCollected + creditIssued) * 100) / 100;

    // General Expenses
    const { data: expensesData } = await supabase
      .from('general_expenses')
      .select('*')
      .eq('date', targetDate)
      .neq('status', 'CANCELLED');

    let cashExpenses = 0;
    let onlineExpenses = 0;

    const filteredExpenses = (expensesData || []).filter((e: any) =>
      !e.description?.includes('[STAFF_CASH_HANDOVER') &&
      !e.description?.includes('[STAFF_ADVANCE:UNSETTLED')
    );

    for (const exp of filteredExpenses) {
      const amt = Number(exp.amount || 0);
      const method = String(exp.payment_method || 'CASH').toUpperCase();
      if (method === 'CASH') {
        cashExpenses += amt;
      } else {
        onlineExpenses += amt;
      }
    }

    // Staff Outflows
    const { data: advancesData } = await supabase
      .from('staff_advances')
      .select('amount')
      .or(`created_at.gte.${istStartUtc},date.eq.${targetDate}`)
      .or(`created_at.lte.${istEndUtc},date.eq.${targetDate}`);

    const advancesTotal = (advancesData || []).reduce((s, a) => s + Number(a.amount || 0), 0);

    const { data: payrollData } = await supabase
      .from('payroll_entries')
      .select('amount_paid')
      .eq('date', targetDate)
      .eq('is_settled', true);

    const settledWages = (payrollData || []).reduce((s, p) => s + Number(p.amount_paid || 0), 0);
    const staffWagesPaid = Math.round((advancesTotal + settledWages) * 100) / 100;

    // Bank Deposits
    let bankDeposited = 0;
    const { data: bankTxData } = await supabase
      .from('bank_transactions')
      .select('amount')
      .eq('transaction_type', 'DEPOSIT')
      .or(`transaction_date.eq.${targetDate},created_at.gte.${istStartUtc}`)
      .or(`transaction_date.eq.${targetDate},created_at.lte.${istEndUtc}`);

    if (bankTxData && bankTxData.length > 0) {
      bankDeposited = bankTxData.reduce((s, tx) => s + Number(tx.amount || 0), 0);
    } else {
      const { data: legBank } = await supabase.from('collection_banks').select('amount').eq('date', targetDate);
      bankDeposited = (legBank || []).reduce((s, b) => s + Number(b.amount || 0), 0);
    }

    // Float
    const floatAmount = customFloat !== null && !isNaN(Number(customFloat))
      ? Math.max(0, Number(customFloat))
      : 0;

    // Expected cash in drawer
    const expectedCash = Math.round(
      ((floatAmount + cashCollected) - (cashExpenses + staffWagesPaid + bankDeposited)) * 100
    ) / 100;

    const actualCash = Math.round(Number(actual_cash_counted || 0) * 100) / 100;
    const discrepancy = Math.round((actualCash - expectedCash) * 100) / 100;
    const totalExpenses = Math.round((cashExpenses + onlineExpenses + staffWagesPaid) * 100) / 100;
    const netProfit = Math.round((grossRevenue - totalExpenses) * 100) / 100;

    // ─────────────────────────────────────────────────────────────────────────
    // Save to eod_closings table (or fallback to daily_register_audits)
    // ─────────────────────────────────────────────────────────────────────────
    let savedRecord: any = null;
    let savedVia = 'eod_closings';

    const closingPayload = {
      closing_date: targetDate,
      total_washes: totalWashes,
      gross_revenue: grossRevenue,
      cash_collected: cashCollected,
      upi_collected: upiCollected,
      credit_issued: creditIssued,
      expenses_paid: cashExpenses + onlineExpenses,
      staff_wages_paid: staffWagesPaid,
      bank_deposited: bankDeposited,
      expected_cash: expectedCash,
      actual_cash: actualCash,
      discrepancy: discrepancy,
      net_profit: netProfit,
      opening_float: floatAmount,
      closed_by_user_id: closed_by_user_id || null,
      notes: notes || 'Register locked and verified.',
      updated_at: new Date().toISOString(),
    };

    // Try eod_closings first
    const { data: eodInsert, error: eodErr } = await (supabase as any)
      .from('eod_closings')
      .upsert(closingPayload, { onConflict: 'closing_date' })
      .select('*')
      .single();

    if (!eodErr && eodInsert) {
      savedRecord = eodInsert;
    } else {
      // Graceful fallback to daily_register_audits if eod_closings schema is pending
      console.warn('[EOD POST eod_closings fallback]:', eodErr?.message);
      savedVia = 'daily_register_audits';

      const { data: auditInsert, error: auditErr } = await supabase
        .from('daily_register_audits')
        .upsert({
          date: targetDate,
          closed_by_id: closed_by_user_id || null,
          closed_at: new Date().toISOString(),
          gross_revenue: grossRevenue,
          expected_cash_in_till: expectedCash,
          total_expenses: totalExpenses,
          is_locked: true,
        }, { onConflict: 'date' })
        .select('*')
        .single();

      if (auditErr) {
        console.error('[EOD POST daily_register_audits error]:', auditErr);
        return NextResponse.json({
          success: false,
          error: `Failed to save register closing: ${auditErr.message}`,
        }, { status: 500 });
      }

      savedRecord = {
        ...closingPayload,
        id: auditInsert?.id || targetDate,
      };
    }

    return NextResponse.json({
      success: true,
      message: `Day register for ${targetDate} has been locked and closed successfully.`,
      saved_via: savedVia,
      closing: savedRecord,
      discrepancy: {
        amount: discrepancy,
        status: discrepancy === 0 ? 'BALANCED' : discrepancy < 0 ? 'SHORTAGE' : 'OVERAGE',
      },
    }, { status: 200 });
  } catch (err: unknown) {
    console.error('[EOD POST Exception]:', err);
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : 'Internal Server Error',
    }, { status: 500 });
  }
}
