/**
 * KALLAYI CAR SPA & AUTO CARE - DIGITAL KHATA SETTLEMENT API
 * Next.js 16 Route Handler: POST /api/finance/khata/settle
 * Deducts paid amount from customer balance, records SETTLEMENT in ledger, and sends WhatsApp confirmation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, getAuthUserFromRequest } from '@/lib/supabaseServer';
import { calculateKhataBalance } from '@/lib/logic/finance';
import { WhatsAppService } from '@/lib/services/whatsapp';
import { normalizePhone } from '@/lib/phone';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    // 1. Verify caller has staff / admin authorization
    const user = await getAuthUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Staff or Admin authentication required.' },
        { status: 401 }
      );
    }

    const userRole = (user.role || (user as any).user_metadata?.role || '').toUpperCase();
    if (userRole === 'CUSTOMER') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Customers cannot self-settle credit balances.' },
        { status: 403 }
      );
    }

    const supabase = getSupabaseAdmin();
    const body = await request.json();

    const targetCustomerId = body.customer_id || body.customerId || body.id;
    const rawAmount = body.amount_paid ?? body.amount ?? body.settlement_amount ?? 0;
    const paymentMethod = String(body.payment_method || body.paymentMethod || 'CASH').toUpperCase();
    const description = body.description || `Khata payment settlement via ${paymentMethod}`;

    if (!targetCustomerId) {
      return NextResponse.json(
        { success: false, error: 'customer_id is required for settlement.' },
        { status: 400 }
      );
    }

    const numericAmount = parseFloat(String(rawAmount));
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Settlement amount must be a positive number.' },
        { status: 400 }
      );
    }

    // 1. Fetch customer by id or user_id
    const { data: customer, error: custErr } = await supabase
      .from('customers')
      .select('*')
      .or(`id.eq.${targetCustomerId},user_id.eq.${targetCustomerId}`)
      .maybeSingle();

    if (custErr || !customer) {
      return NextResponse.json(
        { success: false, error: 'Customer record not found.' },
        { status: 404 }
      );
    }

    // 2. Pure Balance Deduction Logic
    const balanceResult = calculateKhataBalance(
      Number(customer.outstanding_balance || 0),
      Number(customer.credit_limit || 5000),
      'SETTLEMENT',
      numericAmount
    );

    // 3. Insert Settlement record into Khata Ledgers with strict timestamps & audit fields
    const nowIso = new Date().toISOString();
    const sanitizedPhone = customer.phone_number ? normalizePhone(customer.phone_number) : null;

    const settlePayload: Record<string, any> = {
      customer_id: customer.id,
      amount: numericAmount,
      transaction_type: 'SETTLEMENT',
      description,
      transaction_date: nowIso,
      status: 'SETTLED',
      settled_at: nowIso,
      customer_phone: sanitizedPhone,
    };

    let { data: newLedger, error: ledgerErr } = await supabase
      .from('khata_ledgers')
      .insert(settlePayload)
      .select('*')
      .single();

    if (ledgerErr && (ledgerErr.code === 'PGRST204' || ledgerErr.code === '42703')) {
      const basicPayload = {
        customer_id: customer.id,
        amount: numericAmount,
        transaction_type: 'SETTLEMENT' as const,
        description,
      };
      const retryRes = await supabase
        .from('khata_ledgers')
        .insert(basicPayload)
        .select('*')
        .single();
      newLedger = retryRes.data;
      ledgerErr = retryRes.error;
    }

    if (ledgerErr || !newLedger) {
      console.error('[Khata Settle Insert Error]:', ledgerErr);
      return NextResponse.json(
        { success: false, error: `Failed to record settlement: ${ledgerErr?.message}` },
        { status: 500 }
      );
    }

    // 4. Update customer outstanding balance
    await supabase
      .from('customers')
      .update({
        outstanding_balance: balanceResult.newBalance,
      })
      .eq('id', customer.id);

    // 5. Update status of prior pending charge ledgers for this customer
    try {
      if (balanceResult.newBalance <= 0) {
        await supabase
          .from('khata_ledgers')
          .update({
            status: 'SETTLED',
            settled_at: nowIso,
          })
          .eq('customer_id', customer.id)
          .in('status', ['PENDING', 'PARTIALLY_PAID']);
      } else {
        // Find oldest pending charge and mark partially paid
        const { data: oldestPending } = await supabase
          .from('khata_ledgers')
          .select('id')
          .eq('customer_id', customer.id)
          .eq('status', 'PENDING')
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (oldestPending?.id) {
          await supabase
            .from('khata_ledgers')
            .update({ status: 'PARTIALLY_PAID' })
            .eq('id', oldestPending.id);
        }
      }
    } catch {
      // Non-blocking status sync
    }

    // 5. WhatsApp Confirmation (Non-blocking safe execution)
    try {
      let customerName = 'Valued Customer';
      if (customer.user_id) {
        const { data: authUser } = await supabase.auth.admin.getUserById(customer.user_id);
        if (authUser?.user?.user_metadata) {
          const meta = authUser.user.user_metadata;
          const fullName =
            meta.full_name ||
            meta.name ||
            `${meta.first_name || ''} ${meta.last_name || ''}`.trim();
          if (fullName) customerName = fullName;
        }
      }

      if (customer.phone_number) {
        await WhatsAppService.notifyKhataSettlement({
          customerPhone: customer.phone_number,
          customerName,
          amountPaid: numericAmount,
          remainingBalance: balanceResult.newBalance,
        });
      }
    } catch (waErr) {
      console.warn('[Khata Settle WhatsApp Warning]:', waErr);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully received ₹${numericAmount.toFixed(2)}. Remaining balance: ₹${balanceResult.newBalance.toFixed(2)}.`,
      new_balance: balanceResult.newBalance,
      data: {
        customer_id: customer.id,
        amount_paid: numericAmount,
        new_balance: balanceResult.newBalance,
        ledger: newLedger,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    console.error('[Khata Settle Exception]:', err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
