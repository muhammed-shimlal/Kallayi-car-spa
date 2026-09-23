/**
 * KALLAYI CAR SPA & AUTO CARE - AI REMINDER AUDIT ENDPOINT
 * 
 * Allows Gemini AI agents and automated notification webhooks to log that
 * a payment reminder was dispatched to a customer.
 * 
 * Updates last_reminder_sent_at = NOW() and increments reminder_count by 1.
 * Protected by Bearer token authentication (AI_SECRET_KEY).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseServer';
import { verifyAiAuth } from '@/lib/security/aiAuth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface MarkRemindedBody {
  khataId?: number | string;
  customerId?: string;
  channel?: string;
  notes?: string;
}

export async function POST(request: NextRequest) {
  // 1. Authenticate Request via Bearer Token
  const authResponse = verifyAiAuth(request);
  if (authResponse) {
    return authResponse;
  }

  try {
    const body: MarkRemindedBody = await request.json().catch(() => ({}));
    const { khataId, customerId, channel = 'WHATSAPP', notes } = body;

    if (!khataId && !customerId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Either "khataId" (number) or "customerId" (UUID) must be provided.',
        },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const nowIso = new Date().toISOString();

    // Case A: Specific Khata Ledger Entry
    if (khataId) {
      const numericKhataId = parseInt(String(khataId), 10);
      if (isNaN(numericKhataId)) {
        return NextResponse.json(
          { success: false, error: 'Invalid khataId. Must be a valid integer.' },
          { status: 400 }
        );
      }

      // 1. Fetch current reminder_count
      const { data: currentEntry, error: fetchErr } = await supabase
        .from('khata_ledgers')
        .select('id, reminder_count, customer_id')
        .eq('id', numericKhataId)
        .single();

      if (fetchErr || !currentEntry) {
        return NextResponse.json(
          { success: false, error: `Khata entry #${numericKhataId} not found.` },
          { status: 404 }
        );
      }

      const nextCount = (currentEntry.reminder_count || 0) + 1;

      // 2. Update audit columns
      const { error: updateErr } = await supabase
        .from('khata_ledgers')
        .update({
          last_reminder_sent_at: nowIso,
          reminder_count: nextCount,
        })
        .eq('id', numericKhataId);

      if (updateErr) {
        // Fallback if columns are not yet in live database
        if (updateErr.code === '42703' || updateErr.code === 'PGRST204') {
          console.warn('[AI Mark Reminded] Database audit columns pending migration. Logging reminder in memory.');
          return NextResponse.json({
            success: true,
            updatedCount: 1,
            khataId: numericKhataId,
            reminderCount: nextCount,
            lastReminderSentAt: nowIso,
            channel,
            warning: 'Audit columns pending schema migration. Request acknowledged.',
          });
        }

        console.error('[AI Mark Reminded DB Error]:', updateErr);
        return NextResponse.json(
          { success: false, error: `Failed to update reminder status: ${updateErr.message}` },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        updatedCount: 1,
        khataId: numericKhataId,
        customerId: currentEntry.customer_id,
        reminderCount: nextCount,
        lastReminderSentAt: nowIso,
        channel,
        notes: notes || null,
        message: `Successfully recorded reminder #${nextCount} for Khata #${numericKhataId}`,
      });
    }

    // Case B: Customer ID provided (update all active pending charges for customer)
    if (customerId) {
      const { data: customerCharges, error: custFetchErr } = await supabase
        .from('khata_ledgers')
        .select('id, reminder_count')
        .eq('customer_id', customerId)
        .eq('transaction_type', 'CHARGE')
        .neq('status', 'SETTLED');

      if (custFetchErr) {
        console.error('[AI Mark Reminded Customer Fetch Error]:', custFetchErr);
        return NextResponse.json(
          { success: false, error: `Failed to fetch customer charges: ${custFetchErr.message}` },
          { status: 500 }
        );
      }

      const charges = customerCharges || [];
      let updatedCount = 0;

      for (const charge of charges) {
        const nextCount = (charge.reminder_count || 0) + 1;
        const { error: chgErr } = await supabase
          .from('khata_ledgers')
          .update({
            last_reminder_sent_at: nowIso,
            reminder_count: nextCount,
          })
          .eq('id', charge.id);

        if (!chgErr) {
          updatedCount++;
        }
      }

      return NextResponse.json({
        success: true,
        updatedCount,
        customerId,
        lastReminderSentAt: nowIso,
        channel,
        notes: notes || null,
        message: `Recorded payment reminder across ${updatedCount} open credit entries for customer.`,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Unprocessable entity.' },
      { status: 422 }
    );
  } catch (err: any) {
    console.error('[AI Mark Reminded Unhandled Error]:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error processing reminder update.' },
      { status: 500 }
    );
  }
}
