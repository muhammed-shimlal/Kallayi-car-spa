/**
 * KALLAYI CAR SPA & AUTO CARE - MY TASKS API ROUTE
 * Next.js 16 Route Handler: GET /api/bookings/my-tasks
 * Returns active tasks for staff technicians.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, getAuthUserFromRequest } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const authUser = await getAuthUserFromRequest(request);

    let query = supabase
      .from('bookings')
      .select(`
        *,
        customer:customers(name, phone_number),
        vehicle:customer_vehicles(plate_number, make, model, vehicle_type),
        service_package:service_packages(name, price)
      `)
      .in('status', ['WAITING', 'IN_PROGRESS', 'IN_BAY_1', 'IN_BAY_2', 'DETAILING', 'READY'])
      .order('created_at', { ascending: true });

    if (authUser && authUser.role !== 'ADMIN' && authUser.user_metadata?.role !== 'ADMIN') {
      query = query.or(`technician_id.eq.${authUser.id},technician_id.is.null`);
    }

    const { data: bookings, error } = await query;

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const formattedTasks = (bookings || []).map((b: any) => ({
      id: b.id,
      status: b.status,
      plate_number: b.vehicle?.plate_number || '',
      vehicle_model: `${b.vehicle?.make || ''} ${b.vehicle?.model || ''}`.trim() || 'Vehicle',
      service_name: b.service_package?.name || 'Wash Service',
      service_price: Number(b.final_price || b.base_price || 0),
      customer_name: b.customer?.name || 'Customer',
      bay_assignment: b.bay_assignment || null,
      created_at: b.created_at || null,
      start_time: b.start_time || null,
    }));

    return NextResponse.json(formattedTasks);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
