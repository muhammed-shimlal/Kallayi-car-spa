/**
 * KALLAYI CAR SPA & AUTO CARE - AI OVERDUE KHATA CREDIT ROUTE
 * 
 * Secure endpoint designed for Google Gemini AI agent to query customers
 * with overdue credit balances for WhatsApp reminder automation.
 * 
 * Protected by Bearer token authentication (AI_SECRET_KEY).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseServer';
import { normalizePhone } from '@/lib/phone';
import { verifyAiAuth } from '@/lib/security/aiAuth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export interface AiOverdueKhataRecord {
  khataId: number;
  customerId: string;
  customerName: string;
  customerPhone: string;
  amount: number;
  transactionDate: string;
  dueDate: string;
  daysOverdue: number;
  reminderCount: number;
  lastReminderSentAt: string | null;
  bookingId: number | null;
  invoiceId: number | null;
  description: string;
}

export async function GET(request: NextRequest) {
  // 1. Authenticate Request via Bearer Token
  const authResponse = verifyAiAuth(request);
  if (authResponse) {
    return authResponse;
  }

  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);

    const minDaysOverdue = parseInt(searchParams.get('min_days_overdue') || '0', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);

    const now = new Date();
    const nowIso = now.toISOString();

    // 2. Query overdue Khata records
    let { data: rawLedgers, error: ledgerErr } = await supabase
      .from('khata_ledgers')
      .select(`
        id,
        customer_id,
        amount,
        transaction_type,
        description,
        related_booking_id,
        booking_id,
        invoice_id,
        number_plate_image,
        transaction_date,
        due_date,
        status,
        settled_at,
        last_reminder_sent_at,
        reminder_count,
        customer_phone,
        created_at,
        customer:customers(id, name, phone_number, outstanding_balance)
      `)
      .eq('transaction_type', 'CHARGE')
      .order('due_date', { ascending: true })
      .limit(limit);

    // Fallback if transaction_date or due_date columns are not yet recognized by PostgREST
    if (ledgerErr && (ledgerErr.code === '42703' || ledgerErr.code === 'PGRST204')) {
      console.warn('[AI Khata Overdue] Using backward-compatible fallback query for unmigrated schema');
      const fallbackQuery = await supabase
        .from('khata_ledgers')
        .select(`
          id,
          customer_id,
          amount,
          transaction_type,
          description,
          related_booking_id,
          number_plate_image,
          created_at,
          customer:customers(id, name, phone_number, outstanding_balance)
        `)
        .eq('transaction_type', 'CHARGE')
        .order('created_at', { ascending: true })
        .limit(limit);

      rawLedgers = fallbackQuery.data as any;
      ledgerErr = fallbackQuery.error;
    }

    if (ledgerErr) {
      console.error('[AI Khata Overdue DB Error]:', ledgerErr);
      return NextResponse.json(
        { success: false, error: `Failed to query Khata ledger records: ${ledgerErr.message}` },
        { status: 500 }
      );
    }

    // 3. Process, filter overdue records, and format response
    const overdueRecords: AiOverdueKhataRecord[] = [];

    for (const row of (rawLedgers || []) as any[]) {
      // Filter out settled records
      if (row.status === 'SETTLED') {
        continue;
      }

      // Calculate effective transaction date and due date
      const txDateStr = row.transaction_date || row.created_at || nowIso;
      const txDate = new Date(txDateStr);

      let dueDateStr = row.due_date;
      if (!dueDateStr) {
        // Default due date: 7 days after transaction
        const calculatedDue = new Date(txDate.getTime() + 7 * 24 * 60 * 60 * 1000);
        dueDateStr = calculatedDue.toISOString();
      }

      const dueDate = new Date(dueDateStr);
      const isPastDue = dueDate.getTime() <= now.getTime();

      // Only include records that are past due
      if (!isPastDue) {
        continue;
      }

      const diffMs = now.getTime() - dueDate.getTime();
      const daysOverdue = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

      if (daysOverdue < minDaysOverdue) {
        continue;
      }

      const customerObj = Array.isArray(row.customer) ? row.customer[0] : row.customer;
      const rawPhone = row.customer_phone || customerObj?.phone_number || '';
      const canonicalPhone = normalizePhone(rawPhone);

      overdueRecords.push({
        khataId: Number(row.id),
        customerId: String(row.customer_id),
        customerName: customerObj?.name || 'Valued Customer',
        customerPhone: canonicalPhone || rawPhone,
        amount: Number(row.amount || 0),
        transactionDate: txDate.toISOString(),
        dueDate: dueDate.toISOString(),
        daysOverdue,
        reminderCount: Number(row.reminder_count || 0),
        lastReminderSentAt: row.last_reminder_sent_at || null,
        bookingId: row.booking_id || row.related_booking_id || null,
        invoiceId: row.invoice_id || null,
        description: row.description || 'Credit Wash Services',
      });
    }

    return NextResponse.json({
      success: true,
      count: overdueRecords.length,
      overdueCutoff: nowIso,
      records: overdueRecords,
    });
  } catch (err: any) {
    console.error('[AI Khata Overdue Unhandled Error]:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error processing AI overdue query.' },
      { status: 500 }
    );
  }
}
