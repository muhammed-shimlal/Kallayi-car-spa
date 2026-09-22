/**
 * KALLAYI CAR SPA & AUTO CARE - LIVE QUEUE API ROUTE
 * Next.js 16 Route Handler: GET /api/bookings/queue
 * Returns active live queue bookings strictly excluding COMPLETED and CANCELLED bookings.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, getAuthUserFromRequest } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const authUser = await getAuthUserFromRequest(request);

    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Authentication required to view live queue.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const view = searchParams.get('view'); // 'active' (default) | 'completed'
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    let query = supabase
      .from('bookings')
      .select(`
        *,
        customer:customers(*),
        vehicle:customer_vehicles(*),
        service_package:service_packages(
          *,
          tiered_prices:service_package_prices(*)
        ),
        invoice:invoices(*)
      `)
      .limit(limit);

    if (view === 'completed') {
      query = query.eq('status', 'COMPLETED').order('end_time', { ascending: false, nullsFirst: false });
    } else {
      // Live active queue: strictly exclude finished and cancelled bookings
      query = query
        .neq('status', 'COMPLETED')
        .neq('status', 'CANCELLED')
        .order('time_slot', { ascending: true });
    }

    if (date) {
      const startOfDay = `${date}T00:00:00.000Z`;
      const endOfDay = `${date}T23:59:59.999Z`;
      query = query.gte('time_slot', startOfDay).lte('time_slot', endOfDay);
    }

    const { data: bookings, error } = await query;

    if (error) {
      console.error('[Live Queue API Error]:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      count: bookings?.length ?? 0,
      data: bookings ?? [],
      results: bookings ?? [],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
