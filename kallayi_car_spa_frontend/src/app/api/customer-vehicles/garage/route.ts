/**
 * KALLAYI CAR SPA & AUTO CARE - CUSTOMER GARAGE BY PHONE LOOKUP API
 * Next.js 16 Route Handler: GET /api/customer-vehicles/garage?phone=XYZ
 * Looks up all vehicles registered to a customer phone number for POS express intake.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseServer';
import { getPhoneVariants, extractTenDigitPhone } from '@/lib/phone';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawPhone = searchParams.get('phone') || searchParams.get('phone_number') || searchParams.get('q') || '';
    const { variants } = getPhoneVariants(rawPhone);
    const tenDigit = extractTenDigitPhone(rawPhone);

    if (!tenDigit && variants.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Valid 10-digit phone number is required.' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // 1. Find customer record matching phone number variants
    const { data: customerList, error: custErr } = await supabase
      .from('customers')
      .select('id, user_id, phone_number, name')
      .in('phone_number', variants);

    if (custErr) {
      return NextResponse.json({ success: false, error: custErr.message }, { status: 500 });
    }

    if (!customerList || customerList.length === 0) {
      return NextResponse.json([]);
    }

    const defaultCustName = customerList.find(c => c.name && c.name !== 'Guest Customer')?.name || '';
    const userIds = customerList
      .map((c) => c.user_id)
      .filter((id): id is string => typeof id === 'string' && id.length > 0);

    if (userIds.length === 0) {
      return NextResponse.json([]);
    }

    // 2. Fetch all vehicles belonging to these userIds
    const { data: vehicles, error: vehErr } = await supabase
      .from('customer_vehicles')
      .select('*')
      .in('user_id', userIds)
      .order('created_at', { ascending: false });

    if (vehErr) {
      return NextResponse.json({ success: false, error: vehErr.message }, { status: 500 });
    }

    const formattedList = (vehicles || []).map((v) => ({
      id: v.id,
      user_id: v.user_id,
      make: v.make,
      model: v.model,
      plate: v.plate_number,
      plate_number: v.plate_number,
      registration_number: v.registration_number || v.plate_number,
      vehicle_type: v.vehicle_type || 'CAR',
      color: v.color || 'White',
      year: v.year,
      notes: v.notes || '',
      customer_name: customerList.find(c => c.user_id === v.user_id)?.name || defaultCustName,
    }));

    return NextResponse.json(formattedList);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
