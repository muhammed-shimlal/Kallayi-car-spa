/**
 * KALLAYI CAR SPA & AUTO CARE - VEHICLE LOOKUP & EXACT PLATE SEARCH API
 * Next.js 16 Route Handler: GET /api/customer-vehicles/lookup
 * 
 * Supports:
 * 1. Exact plate lookup: /api/customer-vehicles/lookup?plate=KL10AA1234&exact=true
 *    - Sanitizes plate: trim() and toUpperCase()
 *    - Queries Supabase using exact match: eq('plate_number', formattedPlate)
 *    - Enriches with customer and booking data
 * 2. Universal multi-field search fallback when q / query is passed
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseServer';
import { GET as getUniversalSearch } from '@/app/api/search/universal/route';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export type { UnifiedSearchResult } from '@/app/api/search/universal/route';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawPlate = searchParams.get('exact_plate') || searchParams.get('plate') || '';
  const isExact = searchParams.get('exact') === 'true' || searchParams.has('exact_plate');

  // If this is a general query without plate or exact parameter, fall back to universal search
  if (!rawPlate && !isExact) {
    return getUniversalSearch(request);
  }

  // 1. Sanitize the input string before querying: remove unnecessary spaces (trim()) and uppercase
  const formattedPlate = rawPlate.trim().toUpperCase();
  if (!formattedPlate) {
    return NextResponse.json(
      { success: false, found: false, error: 'Vehicle license plate is required.' },
      { status: 400 }
    );
  }

  try {
    const supabase = getSupabaseAdmin();

    // 2. Query Supabase using an EXACT match: eq('plate_number', formattedPlate)
    let { data: vehicle, error: vehErr } = await supabase
      .from('customer_vehicles')
      .select('*')
      .eq('plate_number', formattedPlate)
      .maybeSingle();

    if (vehErr) {
      console.error('[Vehicle Lookup API] Supabase error querying plate_number:', vehErr);
      return NextResponse.json({ success: false, error: vehErr.message }, { status: 500 });
    }

    // Secondary exact fallback: check registration_number with eq
    if (!vehicle) {
      const { data: regVeh } = await supabase
        .from('customer_vehicles')
        .select('*')
        .eq('registration_number', formattedPlate)
        .maybeSingle();
      if (regVeh) {
        vehicle = regVeh;
      }
    }

    // Tertiary exact fallback: normalized comparison (stripped dashes/spaces) using eq
    if (!vehicle) {
      const cleanPlate = formattedPlate.replace(/[\s-]/g, '');
      if (cleanPlate && cleanPlate !== formattedPlate) {
        const { data: normVeh } = await supabase
          .from('customer_vehicles')
          .select('*')
          .or(`plate_number.eq.${cleanPlate},registration_number.eq.${cleanPlate}`)
          .maybeSingle();
        if (normVeh) {
          vehicle = normVeh;
        }
      }
    }

    // If still no vehicle found, return found: false with informative message
    if (!vehicle) {
      return NextResponse.json({
        success: true,
        found: false,
        message: 'No existing record found for this plate. You can proceed with manual entry.',
        vehicle: null,
      });
    }

    // 3. Exact vehicle found: Enrich with customer details
    let customer: any = null;

    // A. By customer_id directly on vehicle (if present)
    if ((vehicle as any).customer_id) {
      const { data: directCust } = await supabase
        .from('customers')
        .select('*')
        .eq('id', (vehicle as any).customer_id)
        .maybeSingle();
      if (directCust) {
        customer = directCust;
      }
    }

    // B. By user_id in customers table
    if (!customer && vehicle.user_id) {
      const { data: custData } = await supabase
        .from('customers')
        .select('*')
        .or(`user_id.eq.${vehicle.user_id},id.eq.${vehicle.user_id}`)
        .maybeSingle();
      if (custData) {
        customer = custData;
      }
    }

    // C. By recent bookings for this vehicle (vital for walk-in customers where user_id is null)
    if (!customer) {
      const { data: bookingData } = await supabase
        .from('bookings')
        .select('customer_id, customer:customers(*)')
        .eq('vehicle_id', vehicle.id)
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (bookingData?.customer) {
        customer = bookingData.customer;
      }
    }

    // Resolve customer's real name (handling name, full_name, and auth.users metadata)
    let resolvedName = String(customer?.name || (customer as any)?.full_name || '').trim();
    const isPlaceholderOrPhone =
      !resolvedName ||
      resolvedName === 'Guest Customer' ||
      resolvedName === 'Valued Customer' ||
      resolvedName === 'Walk-In Customer' ||
      /^[0-9+ \-]+$/.test(resolvedName);

    const effectiveUserId = customer?.user_id || vehicle.user_id;
    if (isPlaceholderOrPhone && effectiveUserId && effectiveUserId.length > 10) {
      try {
        const { data: authUser } = await supabase.auth.admin.getUserById(effectiveUserId);
        if (authUser?.user?.user_metadata) {
          const meta = authUser.user.user_metadata;
          const authName = (meta.full_name || meta.name || meta.first_name || '').trim();
          if (authName && !/^[0-9+ \-]+$/.test(authName)) {
            resolvedName = authName;
            // Heal public.customers table record in database
            if (customer?.id) {
              await supabase
                .from('customers')
                .update({ name: authName, updated_at: new Date().toISOString() })
                .eq('id', customer.id);
            }
          }
        }
      } catch (authFetchErr) {
        console.warn('[Lookup] Auth user metadata fallback error:', authFetchErr);
      }
    }

    const payload = {
      id: vehicle.id,
      vehicle_id: vehicle.id,
      plate_number: vehicle.plate_number || formattedPlate,
      plate: vehicle.plate_number || formattedPlate,
      registration_number: vehicle.registration_number || vehicle.plate_number || formattedPlate,
      make: vehicle.make || 'Standard',
      model: vehicle.model || 'Vehicle',
      vehicle_type: vehicle.vehicle_type || 'CAR',
      color: vehicle.color || 'White',
      year: vehicle.year || null,
      notes: vehicle.notes || '',
      customer_id: customer?.id || null,
      customer_name: resolvedName,
      name: resolvedName,
      full_name: resolvedName,
      customer: customer
        ? {
            id: customer.id,
            name: resolvedName,
            full_name: resolvedName,
            phone: customer.phone_number,
            phone_number: customer.phone_number,
          }
        : null,
      phone: customer?.phone_number || '',
      phone_number: customer?.phone_number || '',
      owner_phone: customer?.phone_number || '',
      outstanding_balance: Number(customer?.outstanding_balance || 0),
      loyalty_points: Number(customer?.loyalty_points || 0),
    };

    return NextResponse.json({
      success: true,
      found: true,
      vehicle: payload,
      ...payload,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    console.error('[Vehicle Lookup API Exception]:', err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
