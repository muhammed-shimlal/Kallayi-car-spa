/**
 * KALLAYI CAR SPA & AUTO CARE - OVERDUE KHATA CREDIT API ROUTE
 * Next.js 16 Route Handler: GET /api/finance/khata/overdue & POST /api/finance/khata/overdue
 * Powers AI-automated WhatsApp payment reminders, credit collection dashboards, and aging analysis.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseServer';
import { normalizePhone } from '@/lib/phone';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);

    const minDaysOverdue = parseInt(searchParams.get('min_days_overdue') || '0', 10);
    const customerIdParam = searchParams.get('customer_id');
    const searchParam = searchParams.get('search');
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 200);

    const now = new Date();
    const nowIso = now.toISOString();

    // 1. Try querying with the enhanced schema fields first
    let ledgers: any[] | null = null;
    let queryError: any = null;

    try {
      let query = supabase
        .from('khata_ledgers')
        .select(`
          *,
          customer:customers(id, name, phone_number, outstanding_balance),
          booking:bookings!related_booking_id(
            id,
            time_slot,
            vehicle:customer_vehicles(plate_number, make, model)
          )
        `)
        .eq('transaction_type', 'CHARGE')
        .eq('status', 'PENDING')
        .lte('due_date', nowIso)
        .order('due_date', { ascending: true })
        .limit(limit);

      if (customerIdParam) {
        query = query.eq('customer_id', customerIdParam);
      }

      const res = await query;
      ledgers = res.data;
      queryError = res.error;
    } catch (err) {
      queryError = err;
    }

    // 2. Resilient fallback: If live schema cache doesn't have status/due_date columns yet,
    // fetch charge ledgers and compute overdue status dynamically using created_at + 7 days
    if (queryError || !ledgers) {
      let fallbackQuery = supabase
        .from('khata_ledgers')
        .select(`
          *,
          customer:customers(id, name, phone_number, outstanding_balance),
          booking:bookings!related_booking_id(
            id,
            time_slot,
            vehicle:customer_vehicles(plate_number, make, model)
          )
        `)
        .eq('transaction_type', 'CHARGE')
        .order('created_at', { ascending: true })
        .limit(limit * 2);

      if (customerIdParam) {
        fallbackQuery = fallbackQuery.eq('customer_id', customerIdParam);
      }

      const fallbackRes = await fallbackQuery;
      if (fallbackRes.error) {
        console.error('[Khata Overdue Fetch Error]:', fallbackRes.error);
        return NextResponse.json(
          { success: false, error: fallbackRes.error.message },
          { status: 500 }
        );
      }
      ledgers = fallbackRes.data || [];
    }

    // 3. Process, filter, and format overdue records for AI WhatsApp automation
    const overdueRecords: any[] = [];
    let totalOverdueAmount = 0;

    for (const item of ledgers || []) {
      const customer = item.customer;
      const custBalance = Number(customer?.outstanding_balance || 0);

      // Skip if customer has already cleared their entire outstanding balance
      if (custBalance <= 0) continue;

      // Skip if explicitly marked SETTLED
      if (item.status && item.status === 'SETTLED') continue;

      const createdAtDate = new Date(item.created_at || nowIso);
      const effectiveTransactionDate = item.transaction_date || item.created_at || nowIso;

      // Determine due date (explicit due_date or default 7 days from created_at)
      const effectiveDueDate = item.due_date
        ? item.due_date
        : new Date(createdAtDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const dueDateObj = new Date(effectiveDueDate);

      // Must be currently past due date
      if (dueDateObj.getTime() > now.getTime()) {
        continue;
      }

      const diffMs = now.getTime() - dueDateObj.getTime();
      const daysOverdue = Math.max(0, Math.floor(diffMs / (24 * 60 * 60 * 1000)));

      if (daysOverdue < minDaysOverdue) {
        continue;
      }

      const customerPhone = item.customer_phone || customer?.phone_number || '';
      const canonicalPhone = customerPhone ? normalizePhone(customerPhone) : '';

      // Optional text search filter
      if (searchParam) {
        const queryLower = searchParam.toLowerCase();
        const matchesName = customer?.name?.toLowerCase().includes(queryLower);
        const matchesPhone = customerPhone.includes(queryLower);
        const matchesPlate = item.booking?.vehicle?.plate_number?.toLowerCase().includes(queryLower);
        if (!matchesName && !matchesPhone && !matchesPlate) continue;
      }

      const chargeAmount = Number(item.amount || 0);
      totalOverdueAmount += chargeAmount;

      overdueRecords.push({
        id: item.id,
        ledger_id: item.id,
        customer_id: item.customer_id,
        customer_name: customer?.name || 'Valued Customer',
        customer_phone: canonicalPhone,
        amount: chargeAmount,
        customer_outstanding_balance: custBalance,
        transaction_date: effectiveTransactionDate,
        due_date: effectiveDueDate,
        days_overdue: daysOverdue,
        reminder_count: Number(item.reminder_count || 0),
        last_reminder_sent_at: item.last_reminder_sent_at || null,
        status: item.status || 'PENDING',
        description: item.description || '',
        booking_id: item.booking_id || item.related_booking_id || null,
        invoice_id: item.invoice_id || null,
        number_plate_image: item.number_plate_image || null,
        vehicle_plate: item.booking?.vehicle?.plate_number || null,
        created_at: item.created_at,
      });
    }

    return NextResponse.json({
      success: true,
      timestamp: nowIso,
      count: overdueRecords.length,
      total_overdue_amount: Math.round(totalOverdueAmount * 100) / 100,
      records: overdueRecords,
      results: overdueRecords, // Paginator alias
    });
  } catch (err: unknown) {
    console.error('[Khata Overdue API Error]:', err);
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * POST /api/finance/khata/overdue
 * Logs automated WhatsApp reminder dispatch by AI agents or background cron tasks.
 * Increments reminder_count and updates last_reminder_sent_at timestamp.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await request.json().catch(() => ({}));

    const rawIds = body.ledger_ids || (body.ledger_id ? [body.ledger_id] : []);
    const targetIds = Array.isArray(rawIds) ? rawIds.map(Number).filter((n) => !isNaN(n)) : [];

    if (targetIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'ledger_id or ledger_ids array is required.' },
        { status: 400 }
      );
    }

    const nowIso = new Date().toISOString();

    // 1. Fetch target ledgers to increment counts
    const { data: targets, error: fetchErr } = await supabase
      .from('khata_ledgers')
      .select('id, reminder_count')
      .in('id', targetIds);

    if (fetchErr) {
      return NextResponse.json(
        { success: false, error: `Failed to fetch target ledgers: ${fetchErr.message}` },
        { status: 500 }
      );
    }

    const updatePromises = (targets || []).map((t: any) => {
      const nextCount = Number(t.reminder_count || 0) + 1;
      return supabase
        .from('khata_ledgers')
        .update({
          last_reminder_sent_at: nowIso,
          reminder_count: nextCount,
        })
        .eq('id', t.id);
    });

    await Promise.all(updatePromises);

    return NextResponse.json({
      success: true,
      message: `Updated reminder audit for ${targets?.length || 0} ledger records.`,
      timestamp: nowIso,
      updated_ids: targets?.map((t: any) => t.id) || [],
    });
  } catch (err: unknown) {
    console.error('[Khata Overdue Reminder Update Error]:', err);
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
