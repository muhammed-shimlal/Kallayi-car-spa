/**
 * KALLAYI CAR SPA & AUTO CARE - VEHICLE & CUSTOMER DOSSIER LOOKUP API
 * Next.js 16 Route Handler: GET /api/bookings/vehicle-history
 * Performs search by plate or phone and aggregates lifetime visit timeline & spend KPIs.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);

    const query = searchParams.get('q');
    if (!query || String(query).trim() === '') {
      return NextResponse.json({
        success: true,
        plate: '',
        customer_name: 'Customer',
        phone: '',
        make_model: '',
        total_visits: 0,
        total_lifetime_spend: 0,
        timeline: [],
        history: [],
      });
    }

    const cleanQuery = String(query).trim();
    const cleanPlate = cleanQuery.replace(/[\s-]/g, '').toUpperCase();
    const cleanDigits = cleanQuery.replace(/\D/g, '');
    const pureTenDigit = cleanDigits.length > 10 && cleanDigits.startsWith('91') 
      ? cleanDigits.slice(2) 
      : cleanDigits;

    // 1. Search customer vehicles by plate_number, make, or model
    const vehicleFilter = `plate_number.ilike.%${cleanPlate}%,registration_number.ilike.%${cleanPlate}%,make.ilike.%${cleanQuery}%,model.ilike.%${cleanQuery}%`;
    const { data: matchedVehicles } = await supabase
      .from('customer_vehicles')
      .select('*')
      .or(vehicleFilter)
      .limit(5);

    // 2. Search customers by name or phone_number
    let custFilter = `name.ilike.%${cleanQuery}%,phone_number.ilike.%${cleanQuery}%`;
    if (pureTenDigit.length >= 3) {
      custFilter += `,phone_number.ilike.%${pureTenDigit}%,phone_number.ilike.%${cleanDigits}%`;
    }
    const { data: matchedCustomers } = await supabase
      .from('customers')
      .select('*')
      .or(custFilter)
      .limit(5);

    let vehicle = matchedVehicles && matchedVehicles.length > 0 ? matchedVehicles[0] : null;
    let customer = matchedCustomers && matchedCustomers.length > 0 ? matchedCustomers[0] : null;

    // If vehicle was found but customer wasn't, find owner via user_id
    if (vehicle && !customer && vehicle.user_id) {
      const { data: owner } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', vehicle.user_id)
        .maybeSingle();
      if (owner) customer = owner;
    }

    // If customer was found but vehicle wasn't, find customer's primary vehicle via user_id
    if (customer && !vehicle && customer.user_id) {
      const { data: custVehicles } = await supabase
        .from('customer_vehicles')
        .select('*')
        .eq('user_id', customer.user_id)
        .limit(1);
      if (custVehicles && custVehicles.length > 0) {
        vehicle = custVehicles[0];
      }
    }

    // 3. Query all past bookings for this vehicle or customer
    if (!vehicle && !customer) {
      return NextResponse.json({
        success: true,
        plate: cleanQuery.toUpperCase(),
        customer_name: 'No records found',
        phone: '',
        make_model: 'Vehicle',
        total_visits: 0,
        total_lifetime_spend: 0,
        timeline: [],
        history: [],
        vehicle_profile: {
          plate_number: cleanQuery.toUpperCase(),
          model: 'Unknown Vehicle',
          owner_name: 'Unknown',
          owner_phone: '',
        },
        kpis: {
          total_visits: 0,
          total_lifetime_spend: 0,
        },
      });
    }

    let bookingsQuery = supabase
      .from('bookings')
      .select(`
        id,
        status,
        time_slot,
        created_at,
        final_price,
        base_price,
        customer:customers(id, user_id, phone_number, name),
        vehicle:customer_vehicles(id, make, model, plate_number, vehicle_type),
        service_package:service_packages(name)
      `)
      .order('created_at', { ascending: false });

    if (vehicle) {
      bookingsQuery = bookingsQuery.eq('vehicle_id', vehicle.id);
    } else if (customer) {
      bookingsQuery = bookingsQuery.eq('customer_id', customer.id);
    }

    const { data: bookings, error: bError } = await bookingsQuery;

    if (bError) {
      console.error('[Vehicle History Query Error]:', bError);
      return NextResponse.json({
        success: true,
        plate: cleanQuery,
        timeline: [],
        history: [],
        total_visits: 0,
        total_lifetime_spend: 0,
      });
    }

    const rawBookings = (bookings || []) as any[];

    // Resolve owner display name directly from customer record or Auth metadata
    let customerName = (customer?.name && customer.name !== 'Guest Customer') ? customer.name : 'Valued Customer';
    if (customerName === 'Valued Customer' && customer?.user_id) {
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

    const plateNumber = vehicle?.plate_number || cleanQuery.toUpperCase();
    const makeModel = vehicle
      ? `${vehicle.make || ''} ${vehicle.model || ''} (${vehicle.vehicle_type || 'CAR'})`.trim()
      : 'Standard Vehicle';
    const phone = customer?.phone_number || 'N/A';

    let totalLifetimeSpend = 0;

    const timeline = rawBookings.map((b) => {
      const pkg = b.service_package;
      const price = Number(b.final_price || b.base_price || 0);
      totalLifetimeSpend += price;

      const dateObj = new Date(b.time_slot || b.created_at);
      const formattedDate = isNaN(dateObj.getTime())
        ? 'Recent'
        : dateObj.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          });

      return {
        id: b.id,
        booking_id: b.id,
        date: formattedDate,
        plate_number: b.vehicle?.plate_number || plateNumber,
        service_package_name: pkg?.name || 'Standard Wash',
        status: b.status,
        technician_name: 'Spa Technician',
        price: price,
        price_paid: price,
      };
    });

    const totalVisits = rawBookings.length;

    const responsePayload = {
      success: true,
      plate: plateNumber,
      customer_name: customerName,
      phone: phone,
      make_model: makeModel,
      total_visits: totalVisits,
      total_lifetime_spend: Math.round(totalLifetimeSpend * 100) / 100,
      timeline,
      history: timeline,
      vehicle_profile: {
        plate_number: plateNumber,
        model: makeModel,
        owner_name: customerName,
        owner_phone: phone,
      },
      kpis: {
        total_visits: totalVisits,
        total_lifetime_spend: Math.round(totalLifetimeSpend * 100) / 100,
      },
    };

    return NextResponse.json(responsePayload);
  } catch (err: unknown) {
    console.error('[Vehicle History Exception]:', err);
    return NextResponse.json({
      success: true,
      plate: '',
      timeline: [],
      history: [],
      total_visits: 0,
      total_lifetime_spend: 0,
    });
  }
}
