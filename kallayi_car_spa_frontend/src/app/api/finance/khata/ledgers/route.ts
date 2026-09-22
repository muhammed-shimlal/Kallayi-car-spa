/**
 * KALLAYI CAR SPA & AUTO CARE - RECENT KHATA LEDGERS API ROUTE
 * Next.js 16 Route Handler: GET /api/finance/khata/ledgers
 * Returns detailed double-entry credit ledger history with proof URLs and customer relations.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);

    const customerId = searchParams.get('customer_id');
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? Math.min(parseInt(limitParam, 10), 200) : 100;
    const type = searchParams.get('type');

    let query = supabase
      .from('khata_ledgers')
      .select(`
        *,
        customer:customers(id, name, phone_number, outstanding_balance, credit_limit),
        booking:bookings!related_booking_id(
          id,
          final_price,
          status,
          time_slot,
          vehicle:customer_vehicles(plate_number, make, model),
          service_package:service_packages(name)
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (customerId) {
      query = query.eq('customer_id', customerId);
    }

    if (type) {
      query = query.eq('transaction_type', type.toUpperCase() as any);
    }

    const { data: ledgers, error } = await query;

    if (error) {
      console.error('[Khata Ledgers Fetch Error]:', error);
      return NextResponse.json(
        { success: false, error: `Failed to fetch khata ledgers: ${error.message}` },
        { status: 500 }
      );
    }

    const list = ledgers || [];

    return NextResponse.json({
      success: true,
      count: list.length,
      ledgers: list,
      results: list,
      data: list,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    console.error('[Khata Ledgers Exception]:', err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
