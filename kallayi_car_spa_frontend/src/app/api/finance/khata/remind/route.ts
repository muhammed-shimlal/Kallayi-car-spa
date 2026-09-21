/**
 * KALLAYI CAR SPA & AUTO CARE - DIGITAL KHATA PAYMENT REMINDER API
 * Next.js 16 Route Handler: POST /api/finance/khata/remind
 * Dispatches polite Malayalam WhatsApp reminders for pending credit balances.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseServer';
import { WhatsAppService } from '@/lib/services/whatsapp';

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await request.json();

    const { customer_id } = body;

    if (!customer_id) {
      return NextResponse.json(
        { success: false, error: 'customer_id is required.' },
        { status: 400 }
      );
    }

    // 1. Fetch customer
    const { data: customer, error: custErr } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customer_id)
      .single();

    if (custErr || !customer) {
      return NextResponse.json(
        { success: false, error: 'Customer not found.' },
        { status: 404 }
      );
    }

    const outstanding = Number(customer.outstanding_balance || 0);
    if (outstanding <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Customer has no outstanding balance to remind.',
        },
        { status: 400 }
      );
    }

    if (!customer.phone_number) {
      return NextResponse.json(
        {
          success: false,
          error: 'Customer does not have a registered phone number.',
        },
        { status: 400 }
      );
    }

    // 2. Resolve Customer Name
    let customerName = 'പ്രിയ ഉപഭോക്താവേ';
    if (customer.user_id) {
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

    // 3. Dispatch WhatsApp Reminder
    const dispatchResult = await WhatsAppService.notifyKhataReminder({
      customerPhone: customer.phone_number,
      customerName,
      outstandingBalance: outstanding,
    });

    if (!dispatchResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: dispatchResult.error || 'Failed to dispatch WhatsApp reminder.',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Khata payment reminder dispatched to ${customer.phone_number}.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
