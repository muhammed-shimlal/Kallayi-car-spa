/**
 * KALLAYI CAR SPA & AUTO CARE - CUSTOMER DIGITAL KHATA LEDGER API
 * Next.js 16 Route Handler: GET /api/customers/me/ledger
 * Returns customer transactions, settlements, and credit balances.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, getAuthUserFromRequest } from '@/lib/supabaseServer';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const authUser = await getAuthUserFromRequest(request);

    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized.' },
        { status: 401 }
      );
    }

    const userId = authUser.id;

    // 1. Fetch Customer Record
    const { data: customer } = await supabase
      .from('customers')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (!customer) {
      return NextResponse.json({
        success: true,
        total_credit: 0,
        total_settled: 0,
        outstanding_balance: 0,
        transactions: [],
        data: [],
      });
    }

    // 2. Fetch Ledger Entries
    const { data: ledgers, error: ledgerErr } = await supabase
      .from('khata_ledgers')
      .select('*')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false });

    if (ledgerErr) {
      return NextResponse.json(
        { success: false, error: ledgerErr.message },
        { status: 500 }
      );
    }

    const rawLedgers = ledgers || [];

    // 3. Compute Totals
    let totalCredit = 0;
    let totalSettled = 0;

    const transactions = rawLedgers.map((entry) => {
      const amount = Number(entry.amount || 0);
      const isSettlement = entry.transaction_type === 'SETTLEMENT';

      if (isSettlement) {
        totalSettled += amount;
      } else {
        totalCredit += amount;
      }

      const anyEntry = entry as any;
      return {
        id: entry.id,
        raw_id: entry.id,
        date: entry.created_at ? entry.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
        created_at: entry.created_at,
        description:
          entry.description ||
          (isSettlement ? 'Khata Settlement Payment' : 'Car Wash Service Credit Charge'),
        service:
          entry.description ||
          (isSettlement ? 'Khata Settlement Payment' : 'Car Wash Service Credit Charge'),
        amount,
        transaction_type: entry.transaction_type,
        status: isSettlement ? 'PAID' : 'UNPAID',
        number_plate_image: entry.number_plate_image || null,
        plate_number: anyEntry.plate_number || anyEntry.vehicle_plate || 'N/A',
      };
    });


    const outstandingBalance = Number(
      customer.outstanding_balance !== undefined
        ? customer.outstanding_balance
        : Math.max(totalCredit - totalSettled, 0)
    );

    return NextResponse.json({
      success: true,
      total_credit: Math.round(totalCredit * 100) / 100,
      total_settled: Math.round(totalSettled * 100) / 100,
      outstanding_balance: Math.round(outstandingBalance * 100) / 100,
      credit_limit: Number(customer.credit_limit || 5000),
      transactions,
      data: transactions,
      results: transactions,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
