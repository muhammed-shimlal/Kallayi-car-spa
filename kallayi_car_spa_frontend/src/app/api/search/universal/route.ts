/**
 * KALLAYI CAR SPA & AUTO CARE - UNIFIED UNIVERSAL SEARCH API
 * Next.js 16 Route Handler: GET /api/search/universal
 * 
 * Performs high-speed, cross-table search across Customers, Customer Vehicles, and Bookings.
 * Automatically resolves walk-in vehicle owners via recent bookings when user_id is null.
 * Securely executes server-side via Supabase Service Role to bypass RLS.
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
  last_visited?: string | null;
  total_visits?: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawQuery = (
      searchParams.get('q') ||
      searchParams.get('query') ||
      searchParams.get('search') ||
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

    // ─────────────────────────────────────────────────────────────────────────────
    // 1. SANITIZE SEARCH VARIANTS
    // ─────────────────────────────────────────────────────────────────────────────
    const cleanPlate = rawQuery.replace(/[\s-]/g, '').toUpperCase();
    const cleanDigits = rawQuery.replace(/\D/g, '');
    const pureTenDigit =
      cleanDigits.length >= 10 && cleanDigits.startsWith('91')
        ? cleanDigits.slice(2)
        : cleanDigits.length === 10
        ? cleanDigits
        : '';

    // Safe string for PostgREST .or() filter (remove commas, quotes, parens)
    const sanitizedText = rawQuery.replace(/[,()"'%]/g, ' ').trim();

    const isExact = searchParams.get('exact') === 'true' || searchParams.has('exact_plate');

    // ─────────────────────────────────────────────────────────────────────────────
    // 2. PARALLEL VEHICLE & CUSTOMER DISCOVERY
    // ─────────────────────────────────────────────────────────────────────────────
    // A. Vehicle Filters: Plate, Registration, Make, Model
    const vehicleConditions: string[] = isExact
      ? [
          `plate_number.eq.${cleanPlate}`,
          `registration_number.eq.${cleanPlate}`,
          `plate_number.eq.${rawQuery.trim().toUpperCase()}`,
        ]
      : [
          `plate_number.ilike.%${cleanPlate}%`,
          `registration_number.ilike.%${cleanPlate}%`,
        ];
    if (!isExact && sanitizedText.length >= 2) {
      vehicleConditions.push(`make.ilike.%${sanitizedText}%`);
      vehicleConditions.push(`model.ilike.%${sanitizedText}%`);
    }
    const vehicleFilter = vehicleConditions.join(',');

    // B. Customer Filters: Name, Clean Digits Phone, 10-Digit Phone
    const custConditions: string[] = [];
    if (sanitizedText.length >= 2) {
      custConditions.push(`name.ilike.%${sanitizedText}%`);
    }
    if (pureTenDigit.length >= 3) {
      custConditions.push(`phone_number.ilike.%${pureTenDigit}%`);
    }
    if (cleanDigits.length >= 3 && cleanDigits !== pureTenDigit) {
      custConditions.push(`phone_number.ilike.%${cleanDigits}%`);
    }
    const custFilter = custConditions.length > 0 ? custConditions.join(',') : `name.ilike.%${sanitizedText}%`;

    const [vehiclesResult, customersResult] = await Promise.all([
      supabase
        .from('customer_vehicles')
        .select('*')
        .or(vehicleFilter)
        .order('id', { ascending: false })
        .limit(15),
      supabase
        .from('customers')
        .select('*')
        .or(custFilter)
        .order('id', { ascending: false })
        .limit(15),
    ]);

    if (vehiclesResult.error) {
      console.error('[Universal Search] Vehicles query error:', vehiclesResult.error);
    }
    if (customersResult.error) {
      console.error('[Universal Search] Customers query error:', customersResult.error);
    }

    const matchedVehicles = vehiclesResult.data || [];
    const matchedCustomers = customersResult.data || [];

    // ─────────────────────────────────────────────────────────────────────────────
    // 3. CROSS-TABLE ENRICHMENT VIA BOOKINGS & USER_ID
    // ─────────────────────────────────────────────────────────────────────────────
    // For matched vehicles: resolve customer owner via Bookings (vital for walk-ins where user_id is null)
    const vehicleIds = matchedVehicles.map((v) => v.id);
    const vehicleCustomerMap = new Map<number, any>();

    if (vehicleIds.length > 0) {
      // Find latest booking for each matched vehicle
      const { data: recentBookings, error: bErr } = await supabase
        .from('bookings')
        .select('vehicle_id, customer_id, customer:customers(*)')
        .in('vehicle_id', vehicleIds)
        .order('id', { ascending: false });

      if (bErr) {
        console.error('[Universal Search] Booking enrichment error:', bErr);
      } else if (recentBookings) {
        for (const bk of recentBookings) {
          if (bk.vehicle_id && bk.customer && !vehicleCustomerMap.has(bk.vehicle_id)) {
            vehicleCustomerMap.set(bk.vehicle_id, bk.customer);
          }
        }
      }

      // Fallback: vehicles with user_id matching customers
      const unlinkedUserIds = matchedVehicles
        .filter((v) => !vehicleCustomerMap.has(v.id) && v.user_id)
        .map((v) => v.user_id as string);

      if (unlinkedUserIds.length > 0) {
        const { data: userCusts } = await supabase
          .from('customers')
          .select('*')
          .in('user_id', unlinkedUserIds);

        if (userCusts) {
          for (const c of userCusts) {
            for (const v of matchedVehicles) {
              if (v.user_id === c.user_id && !vehicleCustomerMap.has(v.id)) {
                vehicleCustomerMap.set(v.id, c);
              }
            }
          }
        }
      }
    }

    // For matched customers: resolve linked vehicles via Bookings & user_id
    const customerIds = matchedCustomers.map((c) => c.id);
    const customerVehicleMap = new Map<string, any[]>();

    if (customerIds.length > 0) {
      const { data: custBookings, error: cbErr } = await supabase
        .from('bookings')
        .select('customer_id, vehicle_id, vehicle:customer_vehicles(*)')
        .in('customer_id', customerIds)
        .order('id', { ascending: false });

      if (cbErr) {
        console.error('[Universal Search] Customer vehicle booking enrichment error:', cbErr);
      } else if (custBookings) {
        for (const cb of custBookings) {
          if (cb.customer_id && cb.vehicle) {
            const list = customerVehicleMap.get(cb.customer_id) || [];
            if (!list.some((v) => v.id === cb.vehicle.id)) {
              list.push(cb.vehicle);
            }
            customerVehicleMap.set(cb.customer_id, list);
          }
        }
      }

      // Check customer_vehicles by user_id
      const custUserIds = matchedCustomers
        .map((c) => c.user_id)
        .filter((uid): uid is string => Boolean(uid));

      if (custUserIds.length > 0) {
        const { data: userVehs } = await supabase
          .from('customer_vehicles')
          .select('*')
          .in('user_id', custUserIds);

        if (userVehs) {
          for (const v of userVehs) {
            const cust = matchedCustomers.find((c) => c.user_id === v.user_id);
            if (cust) {
              const list = customerVehicleMap.get(cust.id) || [];
              if (!list.some((existing) => existing.id === v.id)) {
                list.push(v);
              }
              customerVehicleMap.set(cust.id, list);
            }
          }
        }
      }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 4. UNIFIED RESULTS AGGREGATION & DEDUPLICATION
    // ─────────────────────────────────────────────────────────────────────────────
    const results: UnifiedSearchResult[] = [];
    const seenCombos = new Set<string>();

    const addUnifiedResult = (res: UnifiedSearchResult) => {
      const key = `${(res.plate_number || '').toUpperCase()}_${res.phone_number || ''}_${res.customer_id || ''}`;
      if (!seenCombos.has(key)) {
        seenCombos.add(key);
        results.push(res);
      }
    };

    // A. Add from matched vehicles
    for (const v of matchedVehicles) {
      const linkedCustomer = vehicleCustomerMap.get(v.id);
      const custName =
        linkedCustomer?.name && linkedCustomer.name !== 'Guest Customer'
          ? linkedCustomer.name
          : 'Walk-In Customer';
      const custPhone = linkedCustomer?.phone_number || '';
      const balance = Number(linkedCustomer?.outstanding_balance || 0);
      const points = Number(linkedCustomer?.loyalty_points || 0);

      addUnifiedResult({
        vehicle_id: v.id,
        plate_number: v.plate_number || v.registration_number || '',
        make: v.make || 'Standard',
        model: v.model || 'Vehicle',
        vehicle_type: v.vehicle_type || 'CAR',
        color: v.color || 'White',
        year: v.year || null,
        notes: v.notes || '',
        customer_id: linkedCustomer?.id || null,
        user_id: v.user_id || linkedCustomer?.user_id || null,
        customer_name: custName,
        phone_number: custPhone,
        outstanding_balance: balance,
        loyalty_points: points,
        address: linkedCustomer?.address || '',
      });
    }

    // B. Add from matched customers
    for (const c of matchedCustomers) {
      const linkedVehs = customerVehicleMap.get(c.id) || [];
      const balance = Number(c.outstanding_balance || 0);
      const points = Number(c.loyalty_points || 0);

      if (linkedVehs.length > 0) {
        for (const v of linkedVehs) {
          addUnifiedResult({
            vehicle_id: v.id,
            plate_number: v.plate_number || v.registration_number || '',
            make: v.make || 'Standard',
            model: v.model || 'Vehicle',
            vehicle_type: v.vehicle_type || 'CAR',
            color: v.color || 'White',
            year: v.year || null,
            notes: v.notes || '',
            customer_id: c.id,
            user_id: c.user_id || v.user_id || null,
            customer_name: c.name || 'Valued Customer',
            phone_number: c.phone_number || '',
            outstanding_balance: balance,
            loyalty_points: points,
            address: c.address || '',
          });
        }
      } else {
        // Customer without vehicle
        addUnifiedResult({
          vehicle_id: null,
          plate_number: '',
          make: 'Standard',
          model: 'Vehicle',
          vehicle_type: 'CAR',
          color: 'White',
          year: null,
          notes: '',
          customer_id: c.id,
          user_id: c.user_id || null,
          customer_name: c.name || 'Valued Customer',
          phone_number: c.phone_number || '',
          outstanding_balance: balance,
          loyalty_points: points,
          address: c.address || '',
        });
      }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 5. RESPONSE PAYLOAD WITH 100% BACKWARD COMPATIBILITY
    // ─────────────────────────────────────────────────────────────────────────────
    const topResult = results[0] || null;

    return NextResponse.json({
      success: true,
      count: results.length,
      results,
      // Backward compatibility fields for single-record consumers
      id: topResult?.vehicle_id ?? null,
      vehicle_id: topResult?.vehicle_id ?? null,
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
      loyalty_points: topResult?.loyalty_points ?? 0,
      address: topResult?.address ?? '',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    console.error('[Universal Search API Exception]:', err);
    return NextResponse.json({ success: false, error: message, results: [] }, { status: 500 });
  }
}
