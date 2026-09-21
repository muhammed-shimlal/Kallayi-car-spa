/**
 * KALLAYI CAR SPA & AUTO CARE - DAILY REGISTER AUDIT API ROUTE
 * Next.js 16 Route Handler: GET & POST /api/finance/daily-audit
 * End-of-Day (EOD) financial reconciliations, cash-in-till calculations, and register locking.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseServer';
import { roundToTwoDecimals } from '@/lib/logic/booking';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);

    const dateParam = searchParams.get('date');
    const targetDate = dateParam || new Date().toISOString().split('T')[0];

    // 1. Fetch Paid Invoices for the target date
    const startOfDay = `${targetDate}T00:00:00.000Z`;
    const endOfDay = `${targetDate}T23:59:59.999Z`;

    const { data: invoices, error: invErr } = await supabase
      .from('invoices')
      .select('*')
      .eq('is_paid', true)
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay);

    if (invErr) {
      return NextResponse.json(
        { success: false, error: `Error fetching invoices: ${invErr.message}` },
        { status: 500 }
      );
    }

    const paidInvoices = invoices || [];
    let grossRevenue = 0;
    let splitCashTotal = 0;
    let splitOnlineTotal = 0;
    let splitKhataTotal = 0;

    for (const inv of paidInvoices) {
      grossRevenue += Number(inv.amount || 0);
      splitCashTotal += Number(inv.split_cash || 0);
      splitOnlineTotal += Number(inv.split_online || 0);
      splitKhataTotal += Number(inv.split_khata || 0);
    }

    // 2. Fetch General Expenses for the target date
    const { data: expenses, error: expErr } = await supabase
      .from('general_expenses')
      .select('*')
      .eq('date', targetDate)
      .neq('status', 'CANCELLED');

    if (expErr) {
      return NextResponse.json(
        { success: false, error: `Error fetching expenses: ${expErr.message}` },
        { status: 500 }
      );
    }

    const activeExpenses = expenses || [];
    let totalExpenses = 0;
    let cashExpenses = 0;
    let onlineExpenses = 0;

    for (const exp of activeExpenses) {
      const amt = Number(exp.amount || 0);
      totalExpenses += amt;
      if (exp.payment_method === 'CASH') {
        cashExpenses += amt;
      } else {
        onlineExpenses += amt;
      }
    }

    // 3. Mathematical Reconciliations
    const expectedCashInTill = Math.max(0, splitCashTotal - cashExpenses);
    const netCashFlow = grossRevenue - totalExpenses;

    // 4. Check if Register is already locked
    const { data: auditRecord } = await supabase
      .from('daily_register_audits')
      .select('*')
      .eq('date', targetDate)
      .maybeSingle();

    const isLocked = Boolean(auditRecord?.is_locked);

    return NextResponse.json({
      success: true,
      data: {
        date: targetDate,
        is_locked: isLocked,
        summary: {
          gross_revenue: roundToTwoDecimals(grossRevenue),
          split_cash: roundToTwoDecimals(splitCashTotal),
          split_online: roundToTwoDecimals(splitOnlineTotal),
          split_khata: roundToTwoDecimals(splitKhataTotal),
          total_expenses: roundToTwoDecimals(totalExpenses),
          cash_expenses: roundToTwoDecimals(cashExpenses),
          online_expenses: roundToTwoDecimals(onlineExpenses),
          expected_cash_in_till: roundToTwoDecimals(expectedCashInTill),
          net_cash_flow: roundToTwoDecimals(netCashFlow),
          invoice_count: paidInvoices.length,
          expense_count: activeExpenses.length,
        },
        audit_record: auditRecord || null,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await request.json();

    const {
      date: dateParam,
      closed_by_id = null,
      gross_revenue: customGross,
      expected_cash_in_till: customCash,
      total_expenses: customExpenses,
    } = body;

    const targetDate = dateParam || new Date().toISOString().split('T')[0];

    // Check if audit record already exists
    const { data: existingAudit } = await supabase
      .from('daily_register_audits')
      .select('*')
      .eq('date', targetDate)
      .maybeSingle();

    if (existingAudit?.is_locked) {
      return NextResponse.json(
        {
          success: false,
          error: `Daily register audit for ${targetDate} is already locked and finalized.`,
        },
        { status: 400 }
      );
    }

    // Derive totals if not explicitly passed
    let finalGrossRevenue = customGross !== undefined ? Number(customGross) : 0;
    let finalExpectedCash = customCash !== undefined ? Number(customCash) : 0;
    let finalTotalExpenses = customExpenses !== undefined ? Number(customExpenses) : 0;

    if (customGross === undefined || customCash === undefined || customExpenses === undefined) {
      // Calculate server-side
      const startOfDay = `${targetDate}T00:00:00.000Z`;
      const endOfDay = `${targetDate}T23:59:59.999Z`;

      const { data: invoices } = await supabase
        .from('invoices')
        .select('*')
        .eq('is_paid', true)
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay);

      let splitCashTotal = 0;
      let calculatedGross = 0;
      for (const inv of invoices || []) {
        calculatedGross += Number(inv.amount || 0);
        splitCashTotal += Number(inv.split_cash || 0);
      }

      const { data: expenses } = await supabase
        .from('general_expenses')
        .select('*')
        .eq('date', targetDate)
        .neq('status', 'CANCELLED');

      let calculatedTotalExp = 0;
      let cashExpenses = 0;
      for (const exp of expenses || []) {
        const amt = Number(exp.amount || 0);
        calculatedTotalExp += amt;
        if (exp.payment_method === 'CASH') {
          cashExpenses += amt;
        }
      }

      finalGrossRevenue = roundToTwoDecimals(calculatedGross);
      finalTotalExpenses = roundToTwoDecimals(calculatedTotalExp);
      finalExpectedCash = roundToTwoDecimals(Math.max(0, splitCashTotal - cashExpenses));
    }

    let savedAudit;
    if (existingAudit) {
      const { data: updated, error: updErr } = await supabase
        .from('daily_register_audits')
        .update({
          closed_by_id: closed_by_id || existingAudit.closed_by_id,
          closed_at: new Date().toISOString(),
          gross_revenue: finalGrossRevenue,
          expected_cash_in_till: finalExpectedCash,
          total_expenses: finalTotalExpenses,
          is_locked: true,
        })
        .eq('id', existingAudit.id)
        .select('*')
        .single();

      if (updErr || !updated) {
        return NextResponse.json(
          { success: false, error: `Failed to lock daily audit: ${updErr?.message}` },
          { status: 500 }
        );
      }
      savedAudit = updated;
    } else {
      const { data: inserted, error: insErr } = await supabase
        .from('daily_register_audits')
        .insert({
          date: targetDate,
          closed_by_id: closed_by_id || null,
          closed_at: new Date().toISOString(),
          gross_revenue: finalGrossRevenue,
          expected_cash_in_till: finalExpectedCash,
          total_expenses: finalTotalExpenses,
          is_locked: true,
        })
        .select('*')
        .single();

      if (insErr || !inserted) {
        return NextResponse.json(
          { success: false, error: `Failed to create daily audit: ${insErr?.message}` },
          { status: 500 }
        );
      }
      savedAudit = inserted;
    }

    return NextResponse.json({
      success: true,
      message: `Daily register audit for ${targetDate} locked and finalized successfully.`,
      data: savedAudit,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
