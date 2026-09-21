/**
 * KALLAYI CAR SPA & AUTO CARE - UNIFIED MULTI-FIELD SEARCH & VEHICLE LOOKUP API
 * Next.js 16 Route Handler: GET /api/customer-vehicles/lookup?q=XYZ
 * Performs universal search across Customer Name, License Plate, and Phone Number.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export interface UnifiedSearchResult {
  vehicle_id?: number | null;
  plate_number: string;
  make: string;
  model: string;
  vehicle_type: string;
  color: string;
  year?: number | null;
  notes?: string;
  customer_id?: string | null;
  user_id?: string | null;
  customer_name: string;
  phone_number: string;
  outstanding_balance: number;
  loyalty_points: number;
  address?: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawQuery = (
      searchParams.get('q') ||
      searchParams.get('query') ||
      searchParams.get('plate') ||
      searchParams.get('plate_number') ||
      searchParams.get('phone') ||
      searchParams.get('name') ||
      ''
    ).trim();

    if (!rawQuery || rawQuery.length < 2) {
      return NextResponse.json({
        success: true,
        count: 0,
        results: [],
      });
    }

    const supabase = getSupabaseAdmin();

    // 1. Sanitize query variants
    const cleanPlate = rawQuery.replace(/[\s-]/g, '').toUpperCase();
    const cleanDigits = rawQuery.replace(/\D/g, '');
    const pureTenDigit = cleanDigits.length > 10 && cleanDigits.startsWith('91') 
      ? cleanDigits.slice(2) 
      : cleanDigits;

    // 2. Parallel Search across Vehicles and Customers tables
    const vehicleFilter = `plate_number.ilike.%${cleanPlate}%,registration_number.ilike.%${cleanPlate}%,make.ilike.%${rawQuery}%,model.ilike.%${rawQuery}%`;

    let custFilter = `name.ilike.%${rawQuery}%`;
    if (pureTenDigit.length >= 3) {
      custFilter += `,phone_number.ilike.%${pureTenDigit}%,phone_number.ilike.%${cleanDigits}%`;
    } else if (cleanDigits.length >= 3) {
      custFilter += `,phone_number.ilike.%${cleanDigits}%`;
    }
    custFilter += `,phone_number.ilike.%${rawQuery}%`;

    const [vehiclesResult, customersResult] = await Promise.all([
      supabase
        .from('customer_vehicles')
        .select('*')
        .or(vehicleFilter)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('customers')
        .select('*')
        .or(custFilter)
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    const matchedVehicles = vehiclesResult.data || [];
    const matchedCustomers = customersResult.data || [];

    // 3. Resolve Missing Cross-References
    // Find customer records for matched vehicles not already in matchedCustomers
    const vehicleUserIds = matchedVehicles
      .map((v) => v.user_id)
      .filter((id): id is string => typeof id === 'string' && id.length > 0 && !matchedCustomers.some((c) => c.user_id === id));

    let additionalCustomers: any[] = [];
    if (vehicleUserIds.length > 0) {
      const { data: addCusts } = await supabase
        .from('customers')
        .select('*')
        .in('user_id', vehicleUserIds);
      if (addCusts) additionalCustomers = addCusts;
    }

    const allCustomers = [...matchedCustomers, ...additionalCustomers];

    // Find registered vehicles for matched customers not already in matchedVehicles
    const custUserIds = allCustomers
      .map((c) => c.user_id)
      .filter((id): id is string => typeof id === 'string' && id.length > 0 && !matchedVehicles.some((v) => v.user_id === id));

    let additionalVehicles: any[] = [];
    if (custUserIds.length > 0) {
      const { data: addVehs } = await supabase
        .from('customer_vehicles')
        .select('*')
        .in('user_id', custUserIds);
      if (addVehs) additionalVehicles = addVehs;
    }

    const allVehicles = [...matchedVehicles, ...additionalVehicles];

    // 4. Merge & Format Unified Search Results
    const unifiedResults: UnifiedSearchResult[] = [];
    const seenKeys = new Set<string>();

    // Add entries from vehicle records joined with owner customer
    for (const v of allVehicles) {
      const linkedCustomer = allCustomers.find((c) => c.user_id && c.user_id === v.user_id);
      const custName = linkedCustomer?.name && linkedCustomer.name !== 'Guest Customer'
        ? linkedCustomer.name
        : 'Walk-In Customer';
      const custPhone = linkedCustomer?.phone_number || '';
      const dedupeKey = `${v.plate_number}_${linkedCustomer?.id || v.user_id || 'guest'}`;

      if (!seenKeys.has(dedupeKey)) {
        seenKeys.add(dedupeKey);
        unifiedResults.push({
          vehicle_id: v.id,
          plate_number: v.plate_number,
          make: v.make || 'Standard',
          model: v.model || 'Vehicle',
          vehicle_type: v.vehicle_type || 'CAR',
          color: v.color || 'White',
          year: v.year,
          notes: v.notes || '',
          customer_id: linkedCustomer?.id ?? null,
          user_id: v.user_id ?? null,
          customer_name: custName,
          phone_number: custPhone,
          outstanding_balance: Number(linkedCustomer?.outstanding_balance || 0),
          loyalty_points: Number(linkedCustomer?.loyalty_points || 0),
          address: linkedCustomer?.address || '',
        });
      }
    }

    // Add customer entries who have no registered vehicles yet
    for (const c of allCustomers) {
      const hasVehicles = allVehicles.some((v) => v.user_id && v.user_id === c.user_id);
      if (!hasVehicles) {
        const dedupeKey = `no_veh_${c.id}`;
        if (!seenKeys.has(dedupeKey)) {
          seenKeys.add(dedupeKey);
          unifiedResults.push({
            vehicle_id: null,
            plate_number: '',
            make: 'Standard',
            model: 'Vehicle',
            vehicle_type: 'CAR',
            color: 'White',
            year: null,
            notes: '',
            customer_id: c.id,
            user_id: c.user_id ?? null,
            customer_name: c.name || 'Valued Customer',
            phone_number: c.phone_number || '',
            outstanding_balance: Number(c.outstanding_balance || 0),
            loyalty_points: Number(c.loyalty_points || 0),
            address: c.address || '',
          });
        }
      }
    }

    // Primary exact/top match for backward compatibility
    const topResult = unifiedResults[0] || null;

    return NextResponse.json({
      success: true,
      count: unifiedResults.length,
      results: unifiedResults,
      // Backward compatibility fields for single-vehicle lookups:
      id: topResult?.vehicle_id ?? null,
      user_id: topResult?.user_id ?? null,
      make: topResult?.make ?? '',
      model: topResult?.model ?? '',
      plate: topResult?.plate_number ?? '',
      plate_number: topResult?.plate_number ?? '',
      registration_number: topResult?.plate_number ?? '',
      vehicle_type: topResult?.vehicle_type ?? 'CAR',
      color: topResult?.color ?? 'White',
      year: topResult?.year ?? null,
      notes: topResult?.notes ?? '',
      phone: topResult?.phone_number ?? '',
      owner_phone: topResult?.phone_number ?? '',
      customer_name: topResult?.customer_name ?? '',
      customer_id: topResult?.customer_id ?? null,
      outstanding_balance: topResult?.outstanding_balance ?? 0,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    console.error('[Unified Lookup API Exception]:', err);
    return NextResponse.json({ success: false, error: message, results: [] }, { status: 500 });
  }
}
