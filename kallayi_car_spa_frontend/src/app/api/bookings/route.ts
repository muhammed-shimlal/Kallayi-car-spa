/**
 * KALLAYI CAR SPA & AUTO CARE - BOOKINGS API ROUTE
 * Next.js 16 Route Handler: GET /api/bookings & POST /api/bookings
 * Pure Supabase PostgreSQL + TypeScript Engine
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, getAuthUserFromRequest } from '@/lib/supabaseServer';
import { deriveBookingPricing } from '@/lib/logic/booking';
import { BookingStatus, VehicleType } from '@/types/database';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);

    const status = searchParams.get('status');
    const date = searchParams.get('date');
    const technicianId = searchParams.get('technician_id');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    let query = supabase
      .from('bookings')
      .select(`
        *,
        customer:customers(*),
        vehicle:customer_vehicles(*),
        service_package:service_packages(
          *,
          tiered_prices:service_package_prices(*)
        )
      `)
      .order('time_slot', { ascending: false })
      .limit(limit);

    if (status) {
      if (status.includes(',')) {
        const statuses = status.split(',').map((s) => s.trim()) as BookingStatus[];
        query = query.in('status', statuses);
      } else {
        query = query.eq('status', status as BookingStatus);
      }
    }

    if (date) {
      const startOfDay = `${date}T00:00:00.000Z`;
      const endOfDay = `${date}T23:59:59.999Z`;
      query = query.gte('time_slot', startOfDay).lte('time_slot', endOfDay);
    }

    if (technicianId) {
      query = query.eq('technician_id', technicianId);
    }

    const { data: bookings, error } = await query;

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      count: bookings?.length ?? 0,
      data: bookings ?? [],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await request.json();

    let {
      customer_id,
      vehicle_id,
      technician_id,
      service_package_id,
      package_id,
      phone,
      name,
      customer_name,
      plate_number,
      make = 'Standard',
      model = 'Vehicle',
      vehicle_type = 'CAR',
      color = 'White',
      time_slot,
      duration_minutes,
      base_price,
      final_price,
      status = 'WAITING',
      bay_assignment,
      address,
      latitude,
      longitude,
      points_redeemed = 0,
    } = body;

    const resolvedCustName = (customer_name || name || '').trim();

    // Support package_id alias
    if (!service_package_id && package_id) {
      service_package_id = package_id;
    }

    // Default time_slot to now if not provided (Walk-in intake)
    if (!time_slot) {
      time_slot = new Date().toISOString();
    }

    // Auto-resolve Customer from Authenticated Session if customer_id not directly supplied
    if (!customer_id) {
      const authUser = await getAuthUserFromRequest(request);
      if (authUser) {
        const { data: custRecord } = await supabase
          .from('customers')
          .select('id')
          .eq('user_id', authUser.id)
          .maybeSingle();

        if (custRecord) {
          customer_id = custRecord.id;
        }
      }
    }

    // Auto-resolve Customer from Vehicle ownership if vehicle_id supplied
    if (!customer_id && vehicle_id) {
      const { data: vehRecord } = await supabase
        .from('customer_vehicles')
        .select('user_id')
        .eq('id', vehicle_id)
        .maybeSingle();

      if (vehRecord?.user_id) {
        const { data: custRecord } = await supabase
          .from('customers')
          .select('id')
          .eq('user_id', vehRecord.user_id)
          .maybeSingle();

        if (custRecord) {
          customer_id = custRecord.id;
        }
      }
    }

    // Auto-resolve Customer by Phone if customer_id still not resolved
    if (!customer_id && phone) {
      const cleanPhone = String(phone).replace(/\D/g, '');
      const { data: existingCust } = await supabase
        .from('customers')
        .select('*')
        .or(`phone_number.eq.${cleanPhone},phone_number.eq.${phone}`)
        .limit(1)
        .maybeSingle();

      if (existingCust) {
        customer_id = existingCust.id;
        // If an explicit customer name is supplied and existing record had placeholder name, update it
        if (resolvedCustName && (!existingCust.name || existingCust.name === 'Guest Customer')) {
          await supabase
            .from('customers')
            .update({ name: resolvedCustName, updated_at: new Date().toISOString() })
            .eq('id', existingCust.id);
        }
      } else {
        // Create guest customer record in customers
        const { data: newCust, error: custErr } = await supabase
          .from('customers')
          .insert({
            user_id: null,
            name: resolvedCustName || 'Guest Customer',
            phone_number: phone,
            address: address || '',
            loyalty_points: 0,
            outstanding_balance: 0.00,
            credit_limit: 5000.00,
          })
          .select('*')
          .maybeSingle();

        if (newCust) {
          customer_id = newCust.id;
        } else if (custErr) {
          // Fallback to finding any existing customer
          const { data: fallbackCust } = await supabase.from('customers').select('*').limit(1).single();
          if (fallbackCust) customer_id = fallbackCust.id;
        }
      }
    }

    // Auto-resolve Vehicle by Plate Number if vehicle_id not supplied
    if (!vehicle_id && plate_number) {
      const cleanPlate = String(plate_number).toUpperCase().trim();
      const { data: existingVehicle } = await supabase
        .from('customer_vehicles')
        .select('*')
        .eq('plate_number', cleanPlate)
        .maybeSingle();

      if (existingVehicle) {
        vehicle_id = existingVehicle.id;
      } else {
        // Insert vehicle
        const guestUserId = '00000000-0000-0000-0000-000000000000';
        const { data: newVehicle } = await supabase
          .from('customer_vehicles')
          .insert({
            user_id: guestUserId,
            plate_number: cleanPlate,
            make: make || 'Standard',
            model: model || 'Vehicle',
            vehicle_type: (vehicle_type as VehicleType) || 'CAR',
            color: color || 'White',
          })
          .select('*')
          .maybeSingle();

        if (newVehicle) {
          vehicle_id = newVehicle.id;
        } else {
          const { data: fallbackVeh } = await supabase.from('customer_vehicles').select('*').limit(1).single();
          if (fallbackVeh) vehicle_id = fallbackVeh.id;
        }
      }
    }

    if (!customer_id || !vehicle_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameters: customer_id (or phone) and vehicle_id (or plate_number) are required.',
        },
        { status: 400 }
      );
    }

    // Fetch service package details if package ID is provided
    let packagePrice = 0;
    let pkgDuration = duration_minutes ?? 60;

    if (service_package_id) {
      const { data: pkg, error: pkgErr } = await supabase
        .from('service_packages')
        .select('*')
        .eq('id', service_package_id)
        .single();

      if (!pkgErr && pkg) {
        packagePrice = Number(pkg.price);
        pkgDuration = duration_minutes ?? pkg.duration_minutes ?? 60;

        // Auto-check vehicle-tiered pricing from service_package_prices
        if (vehicle_id) {
          const { data: veh } = await supabase
            .from('customer_vehicles')
            .select('vehicle_type')
            .eq('id', vehicle_id)
            .maybeSingle();

          if (veh?.vehicle_type) {
            const cleanVType = String(veh.vehicle_type).trim().toUpperCase();
            const { data: tiered } = await supabase
              .from('service_package_prices')
              .select('price')
              .eq('package_id', service_package_id)
              .eq('vehicle_type', cleanVType)
              .maybeSingle();

            if (tiered && Number(tiered.price) > 0) {
              packagePrice = Number(tiered.price);
            }
          }
        }
      }
    }

    // Execute pure deterministic pricing and duration derivation logic
    const pricing = deriveBookingPricing({
      timeSlot: time_slot,
      durationMinutes: pkgDuration,
      packagePrice,
      basePrice: base_price,
      finalPrice: final_price != null ? Number(final_price) : undefined,
      pointsRedeemed: points_redeemed,
    });


    const insertPayload = {
      customer_id,
      vehicle_id,
      technician_id: technician_id || null,
      service_package_id: service_package_id || null,
      time_slot: pricing.timeSlot,
      end_time: pricing.endTime,
      status: status as BookingStatus,
      bay_assignment: bay_assignment || null,
      points_redeemed,
      base_price: pricing.basePrice,
      final_price: pricing.finalPrice,
      discount_amount: pricing.discountAmount,
      discount_percentage: pricing.discountPercentage,
      address: address || '123 Main St, City',
      latitude: latitude != null ? Number(latitude) : 0.0,
      longitude: longitude != null ? Number(longitude) : 0.0,
    };

    const { data: newBooking, error: insertError } = await supabase
      .from('bookings')
      .insert(insertPayload)
      .select(`
        *,
        customer:customers(*),
        vehicle:customer_vehicles(*),
        service_package:service_packages(*)
      `)
      .single();

    if (insertError) {
      return NextResponse.json(
        { success: false, error: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Booking created successfully.',
        data: newBooking,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
