/**
 * KALLAYI CAR SPA & AUTO CARE - CUSTOMER VEHICLES GARAGE API
 * Next.js 16 Route Handler: GET & POST /api/customer-vehicles
 * Fetches and manages customer vehicles registered to the authenticated account.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, getAuthUserFromRequest } from '@/lib/supabaseServer';
import { VehicleType } from '@/types/database';
import { normalizeVehicleType, getVehicleBodyType } from '@/lib/vehicleCatalog';

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

    const { data: vehicles, error } = await supabase
      .from('customer_vehicles')
      .select('*')
      .eq('user_id', authUser.id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    const formattedVehicles = (vehicles || []).map((v) => ({
      id: v.id,
      user_id: v.user_id,
      make: v.make,
      model: v.model,
      plate: v.plate_number,
      plate_number: v.plate_number,
      registration_number: v.registration_number || v.plate_number,
      color: v.color || '',
      year: v.year,
      notes: v.notes || '',
      vehicle_type: v.vehicle_type,
      created_at: v.created_at,
    }));

    // Return as array for direct consumer compatibility and provide object properties
    const response = NextResponse.json(formattedVehicles);
    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const authUser = await getAuthUserFromRequest(request);

    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      make,
      model,
      plate_number,
      plate,
      vehicle_type,
      color,
      year,
      notes,
    } = body;

    const rawPlate = (plate_number || plate || '').trim().toUpperCase();
    const cleanMake = (make || 'Standard').trim();
    const cleanModel = (model || 'Vehicle').trim();
    const vType: VehicleType = vehicle_type
      ? normalizeVehicleType(vehicle_type)
      : getVehicleBodyType(`${cleanMake} ${cleanModel}`);

    if (!rawPlate) {
      return NextResponse.json(
        { success: false, error: 'Vehicle license plate number is required.' },
        { status: 400 }
      );
    }

    // Check if plate already registered
    const { data: existing } = await supabase
      .from('customer_vehicles')
      .select('id, user_id')
      .eq('plate_number', rawPlate)
      .maybeSingle();

    if (existing) {
      if (existing.user_id === authUser.id) {
        return NextResponse.json(
          { success: true, message: 'Vehicle already in your garage.', vehicle: existing },
          { status: 200 }
        );
      } else {
        // Transfer or reassign vehicle
        const { data: updated, error: updateErr } = await supabase
          .from('customer_vehicles')
          .update({
            user_id: authUser.id,
            make: cleanMake,
            model: cleanModel,
            color: (color || '').trim(),
            vehicle_type: vType,
            year: year ? Number(year) : null,
          })
          .eq('id', existing.id)
          .select('*')
          .single();

        if (updateErr) {
          return NextResponse.json({ success: false, error: updateErr.message }, { status: 500 });
        }
        return NextResponse.json({ success: true, vehicle: updated, data: updated });
      }
    }

    // Insert new vehicle
    const { data: newVehicle, error: insertErr } = await supabase
      .from('customer_vehicles')
      .insert({
        user_id: authUser.id,
        make: cleanMake,
        model: cleanModel,
        plate_number: rawPlate,
        registration_number: rawPlate,
        vehicle_type: vType,
        color: (color || '').trim(),
        year: year ? Number(year) : null,
        notes: (notes || '').trim(),
      })
      .select('*')
      .single();

    if (insertErr) {
      return NextResponse.json(
        { success: false, error: `Failed to add vehicle: ${insertErr.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      vehicle: newVehicle,
      data: newVehicle,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
