/**
 * KALLAYI CAR SPA & AUTO CARE - INDIVIDUAL CUSTOMER VEHICLE API
 * Next.js 16 Route Handler: GET, PATCH, DELETE /api/customer-vehicles/[id]
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, getAuthUserFromRequest } from '@/lib/supabaseServer';
import { VehicleType, CustomerVehicleRow } from '@/types/database';
import { normalizeVehicleType } from '@/lib/vehicleCatalog';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const vehicleId = parseInt(id, 10);
    const supabase = getSupabaseAdmin();
    const authUser = await getAuthUserFromRequest(request);

    if (!authUser) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
    }

    if (isNaN(vehicleId)) {
      return NextResponse.json({ success: false, error: 'Invalid vehicle ID.' }, { status: 400 });
    }

    const { data: vehicle, error } = await supabase
      .from('customer_vehicles')
      .select('*')
      .eq('id', vehicleId)
      .eq('user_id', authUser.id)
      .single();

    if (error || !vehicle) {
      return NextResponse.json({ success: false, error: 'Vehicle not found.' }, { status: 404 });
    }

    return NextResponse.json({
      id: vehicle.id,
      user_id: vehicle.user_id,
      make: vehicle.make,
      model: vehicle.model,
      plate: vehicle.plate_number,
      plate_number: vehicle.plate_number,
      registration_number: vehicle.registration_number || vehicle.plate_number,
      color: vehicle.color || '',
      year: vehicle.year,
      notes: vehicle.notes || '',
      vehicle_type: vehicle.vehicle_type,
      created_at: vehicle.created_at,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const vehicleId = parseInt(id, 10);
    const supabase = getSupabaseAdmin();
    const authUser = await getAuthUserFromRequest(request);

    if (!authUser) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
    }

    if (isNaN(vehicleId)) {
      return NextResponse.json({ success: false, error: 'Invalid vehicle ID.' }, { status: 400 });
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

    const updates: Partial<CustomerVehicleRow> = {};

    if (make !== undefined) updates.make = String(make).trim();
    if (model !== undefined) updates.model = String(model).trim();
    if (plate_number !== undefined || plate !== undefined) {
      const rawPlate = String(plate_number || plate || '').trim().toUpperCase();
      if (rawPlate) {
        updates.plate_number = rawPlate;
        updates.registration_number = rawPlate;
      }
    }
    if (vehicle_type !== undefined) {
      updates.vehicle_type = normalizeVehicleType(vehicle_type);
    }
    if (color !== undefined) updates.color = String(color).trim();
    if (year !== undefined) updates.year = year ? Number(year) : null;
    if (notes !== undefined) updates.notes = String(notes).trim();

    const { data: updated, error: updateErr } = await supabase
      .from('customer_vehicles')
      .update(updates)
      .eq('id', vehicleId)
      .eq('user_id', authUser.id)
      .select('*')
      .single();

    if (updateErr || !updated) {
      return NextResponse.json(
        { success: false, error: updateErr?.message || 'Vehicle not found or could not be updated.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      id: updated.id,
      make: updated.make,
      model: updated.model,
      plate: updated.plate_number,
      plate_number: updated.plate_number,
      vehicle_type: updated.vehicle_type,
      color: updated.color,
      year: updated.year,
      notes: updated.notes,
      data: updated,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const vehicleId = parseInt(id, 10);
    const supabase = getSupabaseAdmin();
    const authUser = await getAuthUserFromRequest(request);

    if (!authUser) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
    }

    if (isNaN(vehicleId)) {
      return NextResponse.json({ success: false, error: 'Invalid vehicle ID.' }, { status: 400 });
    }

    const { error: delErr } = await supabase
      .from('customer_vehicles')
      .delete()
      .eq('id', vehicleId)
      .eq('user_id', authUser.id);

    if (delErr) {
      return NextResponse.json({ success: false, error: delErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Vehicle deleted successfully.' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
