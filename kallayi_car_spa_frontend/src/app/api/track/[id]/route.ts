/**
 * KALLAYI CAR SPA & AUTO CARE - PUBLIC LIVE WASH TRACKING API
 * Next.js 16 Route Handler: GET /api/track/[id]
 * Allows customers scanning QR codes on intake job slips to track real-time
 * wash status without authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface RouteContext {
  params: Promise<{ id: string }> | { id: string };
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const resolvedParams = await Promise.resolve(context.params);
    const bookingId = parseInt(resolvedParams.id, 10);

    if (isNaN(bookingId) || bookingId <= 0) {
      return NextResponse.json({ success: false, error: 'Invalid booking ID' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data: booking, error } = await supabase
      .from('bookings')
      .select(`
        id,
        status,
        bay_assignment,
        start_time,
        end_time,
        time_slot,
        created_at,
        final_price,
        base_price,
        vehicle:customer_vehicles(
          plate_number,
          make,
          model,
          vehicle_type,
          color
        ),
        service_package:service_packages(
          name,
          duration_minutes
        )
      `)
      .eq('id', bookingId)
      .maybeSingle();

    if (error || !booking) {
      return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      booking: {
        id: booking.id,
        status: booking.status,
        bay_assignment: booking.bay_assignment || 'Bay 1',
        start_time: booking.start_time,
        end_time: booking.end_time,
        time_slot: booking.time_slot,
        created_at: booking.created_at,
        final_price: booking.final_price || booking.base_price,
        plate_number: (booking.vehicle as any)?.plate_number || 'Vehicle',
        vehicle_make: (booking.vehicle as any)?.make || '',
        vehicle_model: (booking.vehicle as any)?.model || '',
        vehicle_type: (booking.vehicle as any)?.vehicle_type || 'Car',
        service_name: (booking.service_package as any)?.name || 'Wash Service',
        duration_minutes: (booking.service_package as any)?.duration_minutes || 45,
      },
    });
  } catch (err: unknown) {
    console.error('[Public Tracking API Error]:', err);
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
