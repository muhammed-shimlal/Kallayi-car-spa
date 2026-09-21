/**
 * KALLAYI CAR SPA & AUTO CARE - COMPLETED BOOKINGS / INVOICE DOSSIER API ROUTE
 * Next.js 16 Route Handler: GET /api/bookings/completed
 * Returns all completed bookings joined with vehicle, customer, service package, and invoice metadata.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);

    const date = searchParams.get('date');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const limit = parseInt(searchParams.get('limit') || '200', 10);

    let query = supabase
      .from('bookings')
      .select(`
        *,
        customer:customers(id, user_id, phone_number, name),
        vehicle:customer_vehicles(id, make, model, plate_number, vehicle_type, color),
        service_package:service_packages(id, name, price, duration_minutes, description),
        invoice:invoices(id, amount, payment_method, split_cash, split_online, split_khata, is_paid, created_at)
      `)
      .eq('status', 'COMPLETED')
      .order('created_at', { ascending: false })
      .limit(Math.min(limit, 500));

    const isValidDate = (d: string | null) =>
      Boolean(d && d.trim().length >= 8 && d !== 'undefined' && d !== 'null' && !isNaN(Date.parse(d)));

    if (isValidDate(date)) {
      query = query
        .gte('created_at', `${date?.trim()}T00:00:00.000Z`)
        .lte('created_at', `${date?.trim()}T23:59:59.999Z`);
    } else {
      if (isValidDate(startDate)) {
        query = query.gte('created_at', `${startDate?.trim()}T00:00:00.000Z`);
      }
      if (isValidDate(endDate)) {
        query = query.lte('created_at', `${endDate?.trim()}T23:59:59.999Z`);
      }
    }

    const { data: bookings, error } = await query;

    if (error) {
      console.error('[Completed Bookings Query Error]:', error);
      return NextResponse.json([], { status: 200 });
    }

    const list = bookings || [];

    // Format fields expected by PDF Invoices and Admin Dashboard tables
    const formatted = list.map((b: any) => {
      const plate = b.vehicle?.plate_number || b.vehicle_plate || '';
      const makeModel = b.vehicle ? `${b.vehicle.make || ''} ${b.vehicle.model || ''}`.trim() : '';
      const vehicleInfo = makeModel ? `${makeModel} (${plate})` : plate || 'Walk-In Vehicle';
      
      const inv = Array.isArray(b.invoice) ? b.invoice[0] : (b.invoice || null);

      return {
        ...b,
        booking_id: b.id,
        vehicle_info: vehicleInfo,
        customer_name: b.customer?.name || b.customer_name || 'Valued Customer',
        customer_phone: b.customer?.phone_number || b.customer_phone || 'N/A',
        service_package_name: b.service_package?.name || 'Standard Wash',
        service_package_details: b.service_package || null,
        final_price: Number(b.final_price || b.agreed_price || b.service_package?.price || 0),
        amount: Number(inv?.amount || b.final_price || b.agreed_price || b.service_package?.price || 0),
        invoice_id: inv?.id || null,
        payment_method: inv?.payment_method || 'CASH',
        is_paid: inv?.is_paid ?? true,
      };
    });

    return NextResponse.json(formatted, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    console.error('[Completed Bookings Exception]:', err);
    return NextResponse.json([], { status: 200 });
  }
}
