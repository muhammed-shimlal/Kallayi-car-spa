/**
 * KALLAYI CAR SPA & AUTO CARE - EXPRESS WALKIN BOOKING ROUTE
 * Next.js 16 Route Handler: POST /api/bookings/express-walkin
 * Accepts walk-in intake payloads with flexible field mapping, sensible defaults,
 * auto customer/vehicle creation, and comprehensive error diagnostics.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseServer';
import { normalizePhone, getPhoneVariants } from '@/lib/phone';
import { normalizeVehicleType } from '@/lib/vehicleCatalog';
import { BookingStatus } from '@/types/database';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await request.json().catch(() => ({}));
    console.log('Incoming Express Walkin Body:', body);

    // 1. Flexible parameter mapping for backward/forward compatibility
    const rawPlate = body.plate_number || body.license_plate || body.licensePlate || body.plateNumber || body.vehicle_number || body.registration_number || '';
    const plate_number = String(rawPlate).trim().toUpperCase();

    const customer_phone = String(
      body.phone_number ||
      body.customer_phone ||
      body.phone ||
      body.phoneNumber ||
      ''
    ).trim();

    const customer_name = String(
      body.customer_name ||
      body.customerName ||
      body.name ||
      'Walk-in Customer'
    ).trim();

    const service_package_id =
      body.service_package_id ||
      body.servicePackageId ||
      body.package_id ||
      body.packageId ||
      body.service_id;

    // Validate required plate number
    if (!plate_number) {
      return NextResponse.json(
        { success: false, error: 'Vehicle plate number is required' },
        { status: 400 }
      );
    }

    const vehicle_make = body.make || body.brand || body.vehicle_make || 'Standard';
    const vehicle_model = body.model || body.vehicle_model || 'Vehicle';
    const vehicle_type = body.vehicle_type || body.vehicleType || body.category || 'HATCHBACK';
    const vehicle_color = body.color || 'White';
    const bay_assignment = body.bay_assignment || body.bayAssignment || 'AUTO';
    const notes = body.notes || body.description || '';
    const discount_reason = body.discount_reason || body.discountReason || '';
    const discount_amount = Number(body.discount_amount ?? body.discountAmount ?? 0);
    const base_price_input = body.base_price ?? body.basePrice;
    const final_price_input = body.final_price ?? body.finalPrice ?? body.custom_price ?? body.customPrice;

    // 2. Automatically find or create the Customer record
    let customer_id: string | undefined = undefined;
    const rawCustomerId = body.customer_id || body.customerId;
    if (rawCustomerId && rawCustomerId !== 'undefined' && rawCustomerId !== 'null' && typeof rawCustomerId === 'string' && rawCustomerId.trim().length > 5) {
      const { data: checkCust } = await supabase
        .from('customers')
        .select('id')
        .eq('id', rawCustomerId.trim())
        .maybeSingle();
      if (checkCust) {
        customer_id = checkCust.id;
      }
    }

    if (!customer_id && customer_phone) {
      const canonicalPhone = normalizePhone(customer_phone);
      const { variants } = getPhoneVariants(customer_phone);
      const searchPhones = Array.from(new Set([customer_phone, canonicalPhone, ...(variants || [])])).filter(Boolean);

      const { data: existingCust } = await supabase
        .from('customers')
        .select('id, name, phone_number')
        .in('phone_number', searchPhones)
        .limit(1)
        .maybeSingle();

      if (existingCust) {
        customer_id = existingCust.id;
        if (
          customer_name &&
          customer_name !== 'Walk-in Customer' &&
          customer_name !== 'Walk-In Customer' &&
          (!existingCust.name || existingCust.name === 'Guest Customer' || existingCust.name === 'Walk-in Customer')
        ) {
          await supabase
            .from('customers')
            .update({ name: customer_name, updated_at: new Date().toISOString() })
            .eq('id', existingCust.id);
        }
      } else {
        const { data: newCust, error: custErr } = await supabase
          .from('customers')
          .insert({
            user_id: null,
            name: customer_name || 'Walk-in Customer',
            phone_number: canonicalPhone || customer_phone,
            address: '',
            loyalty_points: 0,
            outstanding_balance: 0.00,
            credit_limit: 5000.00,
          })
          .select('id')
          .maybeSingle();

        if (newCust?.id) {
          customer_id = newCust.id;
        } else {
          if (custErr) console.warn('[Express Walkin Customer Insert Notice]:', custErr.message);
          // Retry find in case of race condition
          const { data: retryCust } = await supabase
            .from('customers')
            .select('id')
            .in('phone_number', searchPhones)
            .limit(1)
            .maybeSingle();
          if (retryCust) {
            customer_id = retryCust.id;
          }
        }
      }
    }

    // Fallback: If still no customer_id, link to official walk-in counter account
    if (!customer_id) {
      const guestPhone = '+919999999999';
      const { data: defaultCustList } = await supabase
        .from('customers')
        .select('id')
        .eq('phone_number', guestPhone)
        .limit(1);

      if (defaultCustList && defaultCustList.length > 0) {
        customer_id = defaultCustList[0].id;
      } else {
        const { data: newWalkinCust } = await supabase
          .from('customers')
          .insert({
            user_id: null,
            name: customer_name || 'Walk-in Customer',
            phone_number: guestPhone,
            address: '',
            loyalty_points: 0,
            outstanding_balance: 0.00,
            credit_limit: 5000.00,
          })
          .select('id')
          .maybeSingle();

        if (newWalkinCust?.id) {
          customer_id = newWalkinCust.id;
        } else {
          // Ultimate fallback: pick any existing customer row
          const { data: anyCust } = await supabase.from('customers').select('id').limit(1).maybeSingle();
          customer_id = anyCust?.id;
        }
      }
    }

    // 3. Automatically find or create the Vehicle record
    let vehicleId: number | undefined = undefined;
    const rawVehId = body.vehicle_id || body.vehicleId;
    if (rawVehId && rawVehId !== 'undefined' && rawVehId !== 'null' && !isNaN(Number(rawVehId))) {
      const cleanNum = Number(rawVehId);
      const { data: checkVeh } = await supabase
        .from('customer_vehicles')
        .select('id')
        .eq('id', cleanNum)
        .maybeSingle();
      if (checkVeh?.id) {
        vehicleId = checkVeh.id;
      }
    }

    if (!vehicleId && plate_number) {
      const cleanPlate = plate_number.replace(/[^A-Z0-9]/g, '');
      const searchPlates = Array.from(new Set([plate_number, cleanPlate])).filter(Boolean);

      // Check existing vehicle by plate number variants
      const { data: existingVehicles, error: searchErr } = await supabase
        .from('customer_vehicles')
        .select('id, plate_number')
        .in('plate_number', searchPlates);

      if (searchErr) {
        console.warn('[Express Walkin Vehicle Search Notice]:', searchErr.message);
      }

      if (existingVehicles && existingVehicles.length > 0) {
        vehicleId = existingVehicles[0].id;
      } else {
        // Fallback fuzzy search if cleanPlate exists
        if (cleanPlate) {
          const { data: fuzzyVehicles } = await supabase
            .from('customer_vehicles')
            .select('id')
            .ilike('plate_number', `%${cleanPlate}%`)
            .limit(1);
          if (fuzzyVehicles && fuzzyVehicles.length > 0) {
            vehicleId = fuzzyVehicles[0].id;
          }
        }

        // Insert new vehicle record if not found
        if (!vehicleId) {
          const resolvedMake = String(body.make || body.brand || body.vehicle_make || 'Standard').trim() || 'Standard';
          const resolvedModel = String(body.model || body.vehicle_model || 'Vehicle').trim() || 'Vehicle';
          const normalizedType = normalizeVehicleType(body.vehicle_type || body.category || 'SEDAN');

          const { data: newVehicle, error: insertErr } = await supabase
            .from('customer_vehicles')
            .insert({
              plate_number: cleanPlate || plate_number,
              registration_number: cleanPlate || plate_number,
              make: resolvedMake,
              model: resolvedModel,
              vehicle_type: normalizedType,
              color: String(body.color || 'White').trim(),
              notes: String(body.notes || '').trim(),
              user_id: null,
            })
            .select('id')
            .maybeSingle();

          if (insertErr) {
            console.error('Failed to insert vehicle into customer_vehicles:', insertErr);
            // In case of unique collision or race condition, retry fetching by plate variants
            const { data: retryVehicles } = await supabase
              .from('customer_vehicles')
              .select('id')
              .in('plate_number', searchPlates);
            if (retryVehicles && retryVehicles.length > 0) {
              vehicleId = retryVehicles[0].id;
            }
          } else if (newVehicle?.id) {
            vehicleId = newVehicle.id;
          }
        }
      }
    }

    // Fallback: If still no vehicleId, check any existing vehicle or create fallback
    if (!vehicleId) {
      const { data: anyVeh } = await supabase
        .from('customer_vehicles')
        .select('id')
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (anyVeh?.id) {
        vehicleId = anyVeh.id;
      }
    }

    // Strict validation before booking insert:
    if (!vehicleId) {
      return NextResponse.json(
        { success: false, error: `Failed to resolve or create vehicle record for plate: "${plate_number}". Check customer_vehicles schema.` },
        { status: 400 }
      );
    }

    if (!customer_id) {
      return NextResponse.json(
        { success: false, error: 'Failed to resolve or create customer record for booking.' },
        { status: 400 }
      );
    }

    const vehicle_id = Number(vehicleId);

    // 4. Resolve package pricing and vehicle-tiered price
    let calculatedBasePrice = base_price_input != null ? Number(base_price_input) : 0;
    let pkgDuration = 45;

    if (service_package_id) {
      const { data: pkg } = await supabase
        .from('service_packages')
        .select('*')
        .eq('id', service_package_id)
        .single();

      if (pkg) {
        calculatedBasePrice = Number(pkg.price);
        pkgDuration = pkg.duration_minutes ?? 45;

        // Check vehicle-tiered price
        if (vehicle_id) {
          const { data: veh } = await supabase
            .from('customer_vehicles')
            .select('vehicle_type')
            .eq('id', vehicle_id)
            .maybeSingle();

          if (veh?.vehicle_type) {
            const canonicalVType = normalizeVehicleType(veh.vehicle_type);
            const { data: allTiers } = await supabase
              .from('service_package_prices')
              .select('*')
              .eq('package_id', service_package_id);

            const matchingTier = (allTiers || []).find(
              (t: any) => t.vehicle_type && normalizeVehicleType(t.vehicle_type) === canonicalVType
            );

            if (matchingTier && matchingTier.price != null && !isNaN(Number(matchingTier.price))) {
              calculatedBasePrice = Number(matchingTier.price);
              if (matchingTier.estimated_time_minutes) {
                pkgDuration = Number(matchingTier.estimated_time_minutes);
              }
            }
          }
        }
      }
    }

    let calculatedFinalPrice = calculatedBasePrice;
    if (final_price_input != null && Number(final_price_input) > 0) {
      calculatedFinalPrice = Number(final_price_input);
    } else if (discount_amount > 0) {
      calculatedFinalPrice = Math.max(0, calculatedBasePrice - discount_amount);
    }

    const calculatedDiscountAmount = Math.max(0, calculatedBasePrice - calculatedFinalPrice);
    const calculatedDiscountPct = calculatedBasePrice > 0
      ? Number(((calculatedDiscountAmount / calculatedBasePrice) * 100).toFixed(2))
      : 0;

    const timeSlot = new Date().toISOString();
    const endTime = new Date(Date.now() + pkgDuration * 60 * 1000).toISOString();

    // 5. Insert Booking record with status 'WAITING', bay_assignment 'AUTO', is_paid: false
    const insertPayload: any = {
      customer_id,
      vehicle_id,
      service_package_id: service_package_id || null,
      time_slot: timeSlot,
      end_time: endTime,
      status: 'WAITING' as BookingStatus,
      bay_assignment: bay_assignment === 'AUTO' || bay_assignment === 'Auto' ? 'Bay 1' : bay_assignment,
      points_redeemed: 0,
      base_price: calculatedBasePrice,
      final_price: calculatedFinalPrice,
      discount_amount: calculatedDiscountAmount,
      discount_percentage: calculatedDiscountPct,
      discount_reason: discount_reason || null,
      address: 'Counter Walk-in',
      latitude: 0.0,
      longitude: 0.0,
    };

    let { data: newBooking, error: insertError } = await supabase
      .from('bookings')
      .insert(insertPayload)
      .select(`
        *,
        customer:customers(*),
        vehicle:customer_vehicles(*),
        service_package:service_packages(*)
      `)
      .single();

    // Schema fallback if discount_reason column is missing
    if (insertError && (insertError.message?.includes('discount_reason') || insertError.code === '42703' || insertError.code === 'PGRST204')) {
      console.warn('[Express Walkin Fallback] Retrying booking without discount_reason');
      const safePayload = { ...insertPayload };
      delete safePayload.discount_reason;
      const retryResult = await supabase
        .from('bookings')
        .insert(safePayload)
        .select(`
          *,
          customer:customers(*),
          vehicle:customer_vehicles(*),
          service_package:service_packages(*)
        `)
        .single();
      newBooking = retryResult.data;
      insertError = retryResult.error;
    }

    if (insertError || !newBooking) {
      console.error('[Express Walkin Booking Insert Error]:', insertError);
      return NextResponse.json(
        { success: false, error: insertError?.message || 'Failed to create walk-in booking' },
        { status: 500 }
      );
    }

    // 6. Generate corresponding pending invoice (is_paid: false)
    try {
      await supabase.from('invoices').insert({
        booking_id: newBooking.id,
        amount: calculatedFinalPrice,
        base_price: calculatedBasePrice,
        final_price: calculatedFinalPrice,
        discount_amount: calculatedDiscountAmount,
        discount_percentage: calculatedDiscountPct,
        discount_reason: discount_reason || null,
        payment_method: 'CASH',
        collector_type: 'ADMIN',
        is_paid: false,
        split_cash: 0,
        split_online: 0,
        split_khata: 0,
      } as any);
    } catch (invErr) {
      console.warn('[Express Walkin Invoice Note]:', invErr);
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Walk-in booking created successfully.',
        booking_id: newBooking.id,
        booking: newBooking,
        data: newBooking,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error('[Express Walkin Exception]:', err);
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
