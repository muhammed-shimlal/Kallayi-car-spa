/**
 * KALLAYI CAR SPA & AUTO CARE - UNIVERSAL CUSTOMER & VEHICLE LIVE SEARCH API
 * Next.js 16 Route Handler: GET /api/customers/search?q=XYZ
 * Performs fast case-insensitive live search across Customer Name, Mobile Number, and Vehicle Plate.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export interface CustomerSearchResult {
  customer_id: string;
  customer_name: string;
  phone_number: string;
  vehicle_id: string | number;
  plate_number: string;
  brand: string;
  make: string;
  model: string;
  vehicle_type: string;
  color: string;
  outstanding_balance?: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || searchParams.get('query') || '').trim();

    if (!q || q.length < 2) {
      return NextResponse.json([]);
    }

    const supabase = getSupabaseAdmin();
    const cleanDigits = q.replace(/\D/g, '');
    const cleanPlate = q.replace(/[\s-]/g, '').toUpperCase();

    // 1. Search customers by name or phone
    let customerQuery = supabase
      .from('customers')
      .select('id, name, phone_number, outstanding_balance, user_id')
      .limit(10);

    if (cleanDigits.length >= 2) {
      customerQuery = customerQuery.or(`phone_number.ilike.%${cleanDigits}%,name.ilike.%${q}%`);
    } else {
      customerQuery = customerQuery.ilike('name', `%${q}%`);
    }

    // 2. Search vehicles by plate, make, or model
    const vehicleQuery = supabase
      .from('customer_vehicles')
      .select('id, plate_number, make, model, vehicle_type, color, user_id')
      .or(`plate_number.ilike.%${cleanPlate}%,make.ilike.%${q}%,model.ilike.%${q}%`)
      .limit(10);

    // Run both queries in parallel
    const [custRes, vehRes] = await Promise.all([customerQuery, vehicleQuery]);

    const matchedCustomers = custRes.data || [];
    const matchedVehicles = vehRes.data || [];

    const results: CustomerSearchResult[] = [];
    const seenCombos = new Set<string>();

    // Helper to add unique entry
    const addResult = (item: CustomerSearchResult) => {
      const key = `${item.plate_number || ''}_${item.phone_number || ''}_${item.customer_id || ''}`;
      if (!seenCombos.has(key)) {
        seenCombos.add(key);
        results.push(item);
      }
    };

    // A. For matched vehicles, try to resolve linked customer
    for (const v of matchedVehicles) {
      let custData: any = null;

      // Check recent bookings for this vehicle
      const { data: b } = await supabase
        .from('bookings')
        .select('customer_id, customer:customers(id, name, phone_number, outstanding_balance)')
        .eq('vehicle_id', v.id)
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (b?.customer) {
        custData = b.customer;
      } else if (v.user_id) {
        const { data: c } = await supabase
          .from('customers')
          .select('id, name, phone_number, outstanding_balance')
          .eq('user_id', v.user_id)
          .maybeSingle();
        custData = c;
      }

      addResult({
        customer_id: custData?.id || '',
        customer_name: custData?.name || 'Walk-in Customer',
        phone_number: custData?.phone_number || '',
        vehicle_id: v.id,
        plate_number: v.plate_number || '',
        brand: v.make || '',
        make: v.make || '',
        model: v.model || '',
        vehicle_type: v.vehicle_type || 'SEDAN',
        color: v.color || '',
        outstanding_balance: custData?.outstanding_balance ? Number(custData.outstanding_balance) : 0,
      });
    }

    // B. For matched customers, try to resolve linked vehicles
    for (const c of matchedCustomers) {
      // Find vehicles through bookings
      const { data: bList } = await supabase
        .from('bookings')
        .select('vehicle_id, vehicle:customer_vehicles(id, plate_number, make, model, vehicle_type, color)')
        .eq('customer_id', c.id)
        .order('id', { ascending: false })
        .limit(3);

      let foundVehicle = false;
      if (bList && bList.length > 0) {
        for (const b of bList) {
          if (b?.vehicle) {
            foundVehicle = true;
            const v: any = b.vehicle;
            addResult({
              customer_id: c.id,
              customer_name: c.name || 'Valued Customer',
              phone_number: c.phone_number || '',
              vehicle_id: v.id,
              plate_number: v.plate_number || '',
              brand: v.make || '',
              make: v.make || '',
              model: v.model || '',
              vehicle_type: v.vehicle_type || 'SEDAN',
              color: v.color || '',
              outstanding_balance: c.outstanding_balance ? Number(c.outstanding_balance) : 0,
            });
          }
        }
      }

      // If no vehicle from bookings, check user_id if present
      if (!foundVehicle && c.user_id) {
        const { data: vList } = await supabase
          .from('customer_vehicles')
          .select('id, plate_number, make, model, vehicle_type, color')
          .eq('user_id', c.user_id)
          .limit(2);

        if (vList && vList.length > 0) {
          for (const v of vList) {
            foundVehicle = true;
            addResult({
              customer_id: c.id,
              customer_name: c.name || 'Valued Customer',
              phone_number: c.phone_number || '',
              vehicle_id: v.id,
              plate_number: v.plate_number || '',
              brand: v.make || '',
              make: v.make || '',
              model: v.model || '',
              vehicle_type: v.vehicle_type || 'SEDAN',
              color: v.color || '',
              outstanding_balance: c.outstanding_balance ? Number(c.outstanding_balance) : 0,
            });
          }
        }
      }

      // If customer has no linked vehicle yet, still return customer info
      if (!foundVehicle) {
        addResult({
          customer_id: c.id,
          customer_name: c.name || 'Valued Customer',
          phone_number: c.phone_number || '',
          vehicle_id: '',
          plate_number: '',
          brand: '',
          make: '',
          model: '',
          vehicle_type: 'SEDAN',
          color: '',
          outstanding_balance: c.outstanding_balance ? Number(c.outstanding_balance) : 0,
        });
      }
    }

    return NextResponse.json(results);
  } catch (error: any) {
    console.error('[Universal Customer Search Error]:', error);
    return NextResponse.json([]);
  }
}
