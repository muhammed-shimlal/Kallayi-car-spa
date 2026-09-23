/**
 * KALLAYI CAR SPA & AUTO CARE - BOOKINGS API ROUTE
 * Next.js 16 Route Handler: GET /api/bookings & POST /api/bookings
 * Pure Supabase PostgreSQL + TypeScript Engine
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, getAuthUserFromRequest } from '@/lib/supabaseServer';
import { deriveBookingPricing } from '@/lib/logic/booking';
import { normalizePhone, getPhoneVariants } from '@/lib/phone';
import { BookingStatus, VehicleType } from '@/types/database';
import { normalizeVehicleType } from '@/lib/vehicleCatalog';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const authUser = await getAuthUserFromRequest(request);
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

    // ─────────────────────────────────────────────────────────────────────────────
    // STRICT CUSTOMER DATA ISOLATION
    // ─────────────────────────────────────────────────────────────────────────────
    if (authUser) {
      const userRole = (authUser.user_metadata?.role || '').toUpperCase();
      const isStaffOrAdmin = ['ADMIN', 'MANAGER', 'WASHER', 'TECHNICIAN', 'DRIVER'].includes(userRole);

      if (!isStaffOrAdmin) {
        // Find customer record matching this authenticated user
        const { data: userCustomer } = await supabase
          .from('customers')
          .select('id, phone_number')
          .eq('user_id', authUser.id)
          .maybeSingle();

        if (!userCustomer) {
          // If no customer profile found for user, strictly return empty list to prevent leaks
          return NextResponse.json({
            success: true,
            count: 0,
            data: [],
          });
        }

        // Strictly isolate bookings to this customer only
        query = query.eq('customer_id', userCustomer.id);
      }
    } else {
      // Unauthenticated requests cannot list bookings
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Authentication required to view bookings.' },
        { status: 401 }
      );
    }

    const excludeStatus = searchParams.get('exclude_status');
    const activeOnly = searchParams.get('active_only') === 'true' || searchParams.get('queue') === 'true';

    if (status) {
      if (status.includes(',')) {
        const statuses = status.split(',').map((s) => s.trim()) as BookingStatus[];
        query = query.in('status', statuses);
      } else {
        query = query.eq('status', status as BookingStatus);
      }
    } else if (activeOnly) {
      query = query.neq('status', 'COMPLETED').neq('status', 'CANCELLED');
    } else if (excludeStatus) {
      const excludedStatuses = excludeStatus.split(',').map((s) => s.trim());
      excludedStatuses.forEach((s) => {
        query = query.neq('status', s as BookingStatus);
      });
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

    // 1. Flexible Field Extraction supporting standard and camelCase aliases
    const customerId = body.customer_id || body.customerId;
    const incomingPhone = body.phone || body.customer_phone || body.phoneNumber || body.phone_number || '';
    const phone = incomingPhone ? normalizePhone(incomingPhone) : '';
    const vehicleId = body.vehicle_id || body.vehicleId;
    const plateNumber = String(body.plate_number || body.license_plate || body.plateNumber || body.registration_number || '').toUpperCase().trim();

    let customer_id = customerId || undefined;
    let vehicle_id = vehicleId ? Number(vehicleId) : undefined;

    let {
      technician_id,
      service_package_id,
      package_id,
      name,
      customer_name,
      make = 'Standard',
      model = 'Vehicle',
      vehicle_type = 'HATCHBACK',
      color = 'White',
      time_slot,
      duration_minutes,
      base_price,
      final_price,
      custom_price,
      discount_reason,
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
    // IMPORTANT: Only auto-resolve if the caller is an end-customer (not staff or admin processing a walk-in)
    const authUser = await getAuthUserFromRequest(request);
    const userRole = (authUser?.user_metadata?.role || '').toUpperCase();
    const isStaffOrAdmin = ['ADMIN', 'MANAGER', 'WASHER', 'TECHNICIAN', 'DRIVER'].includes(userRole);

    if (!customer_id && authUser && !isStaffOrAdmin) {
      const { data: custRecord } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', authUser.id)
        .maybeSingle();

      if (custRecord) {
        customer_id = custRecord.id;
      } else {
        const userPhone = authUser.phone || authUser.user_metadata?.phone;
        if (userPhone) {
          const canonicalPhone = normalizePhone(userPhone);
          const { variants } = getPhoneVariants(canonicalPhone);
          const { data: existingCust } = await supabase
            .from('customers')
            .select('id')
            .in('phone_number', variants)
            .limit(1)
            .maybeSingle();

          if (existingCust) {
            customer_id = existingCust.id;
          } else {
            const { data: newCust } = await supabase
              .from('customers')
              .insert({
                user_id: authUser.id,
                name: authUser.user_metadata?.name || authUser.user_metadata?.full_name || 'Valued Customer',
                phone_number: canonicalPhone,
                address: '',
                loyalty_points: 0,
                outstanding_balance: 0.0,
                credit_limit: 5000.0,
              })
              .select('id')
              .maybeSingle();

            if (newCust) {
              customer_id = newCust.id;
            }
          }
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
      const canonicalPhone = phone;
      const { variants } = getPhoneVariants(phone);

      const { data: existingCust } = await supabase
        .from('customers')
        .select('*')
        .in('phone_number', variants)
        .order('user_id', { ascending: false, nullsFirst: false })
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
        // Create guest customer record in customers with canonical E.164 phone
        const { data: newCust, error: custErr } = await supabase
          .from('customers')
          .insert({
            user_id: null,
            name: resolvedCustName || 'Guest Customer',
            phone_number: canonicalPhone,
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
          console.error('[Bookings Customer Insert Error]:', custErr.message);
        }
      }
    } else if (!customer_id) {
      // Fallback for walk-in guest without phone number
      const guestPhone = '+919999999999';
      const { data: defaultCust } = await supabase
        .from('customers')
        .select('*')
        .eq('phone_number', guestPhone)
        .maybeSingle();

      if (defaultCust) {
        customer_id = defaultCust.id;
      } else {
        const { data: newWalkinCust } = await supabase
          .from('customers')
          .insert({
            user_id: null,
            name: resolvedCustName || 'Walk-In Customer',
            phone_number: guestPhone,
            address: address || '',
            loyalty_points: 0,
            outstanding_balance: 0.00,
            credit_limit: 5000.00,
          })
          .select('*')
          .maybeSingle();
        if (newWalkinCust) {
          customer_id = newWalkinCust.id;
        }
      }
    }

    // Auto-resolve Vehicle by Plate Number if vehicle_id not supplied
    const cleanPlate = plateNumber || ('KL-' + Math.floor(1000 + Math.random() * 9000));
    if (!vehicle_id && cleanPlate) {
      const { data: existingVehicle } = await supabase
        .from('customer_vehicles')
        .select('*')
        .eq('plate_number', cleanPlate)
        .maybeSingle();

      if (existingVehicle) {
        vehicle_id = existingVehicle.id;
      } else {
        // Insert vehicle for walk-in guest (user_id is null until customer claims account)
        const normalizedType = normalizeVehicleType(vehicle_type);
        const { data: newVehicle, error: vehErr } = await supabase
          .from('customer_vehicles')
          .insert({
            user_id: null,
            plate_number: cleanPlate,
            make: make || 'Standard',
            model: model || 'Vehicle',
            vehicle_type: normalizedType,
            color: color || 'White',
          })
          .select('*')
          .maybeSingle();

        if (newVehicle) {
          vehicle_id = newVehicle.id;
        } else {
          if (vehErr) {
            console.error('[Bookings Vehicle Insert Error]:', vehErr.message);
          }
          // Concurrent insert / conflict recovery
          const { data: retryVeh } = await supabase
            .from('customer_vehicles')
            .select('*')
            .eq('plate_number', cleanPlate)
            .maybeSingle();
          if (retryVeh) {
            vehicle_id = retryVeh.id;
          }
        }
      }
    }

    if (!customer_id || !vehicle_id) {
      const missingDetails: string[] = [];
      if (!customer_id) missingDetails.push('customer_id (or a valid phone number)');
      if (!vehicle_id) missingDetails.push('vehicle_id (or plate_number)');
      return NextResponse.json(
        {
          success: false,
          error: `Missing required parameters: ${missingDetails.join(' and ')} are required.`,
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
            const canonicalVType = normalizeVehicleType(veh.vehicle_type);
            const { data: allTiers } = await supabase
              .from('service_package_prices')
              .select('*')
              .eq('package_id', service_package_id);

            const matchingTier = (allTiers || []).find(
              (t: any) => t.vehicle_type && normalizeVehicleType(t.vehicle_type) === canonicalVType
            );

            if (matchingTier && matchingTier.price != null && !isNaN(Number(matchingTier.price))) {
              packagePrice = Number(matchingTier.price);
              if (matchingTier.estimated_time_minutes) {
                pkgDuration = Number(matchingTier.estimated_time_minutes);
              }
            } else {
              // Semantic fallbacks
              let fallbackTier: any = null;
              if (canonicalVType === 'COMPACT_SUV') {
                fallbackTier = (allTiers || []).find((t: any) => normalizeVehicleType(t.vehicle_type) === 'SUV');
              } else if (canonicalVType === 'SUV') {
                fallbackTier = (allTiers || []).find((t: any) => normalizeVehicleType(t.vehicle_type) === 'COMPACT_SUV');
              } else if (canonicalVType === 'VAN') {
                fallbackTier = (allTiers || []).find((t: any) => normalizeVehicleType(t.vehicle_type) === 'MUV');
              } else if (canonicalVType === 'MUV') {
                fallbackTier = (allTiers || []).find((t: any) => normalizeVehicleType(t.vehicle_type) === 'VAN');
              }

              if (fallbackTier && fallbackTier.price != null && !isNaN(Number(fallbackTier.price))) {
                packagePrice = Number(fallbackTier.price);
                if (fallbackTier.estimated_time_minutes) {
                  pkgDuration = Number(fallbackTier.estimated_time_minutes);
                }
              } else {
                // Graceful fallback to package default price
                packagePrice = Number(base_price || pkg.price || 0);
                pkgDuration = duration_minutes ?? pkg.duration_minutes ?? 60;
              }
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
      basePrice: packagePrice > 0 ? packagePrice : base_price,
      finalPrice: final_price != null && Number(final_price) > 0 ? Number(final_price) : packagePrice,
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
      discount_reason: discount_reason || null,
      address: address || '123 Main St, City',
      latitude: latitude != null ? Number(latitude) : 0.0,
      longitude: longitude != null ? Number(longitude) : 0.0,
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

    // Fallback: If PostgREST throws schema cache error for discount_reason, retry cleanly without it
    if (insertError && (insertError.message?.includes('discount_reason') || insertError.code === '42703' || insertError.code === 'PGRST204')) {
      console.warn('[Supabase Fallback] discount_reason column missing in bookings table, retrying without it:', insertError.message);
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
      return NextResponse.json(
        { success: false, error: insertError?.message || 'Failed to create booking' },
        { status: 500 }
      );
    }

    // Auto-generate Invoice and record POS payment splits
    const rawPaymentMethod = (body.payment_method || 'CASH').toUpperCase();
    const isPaid = body.is_paid !== undefined ? Boolean(body.is_paid) : true;
    let splitCash = 0;
    let splitOnline = 0;
    let splitKhata = 0;

    if (isPaid) {
      if (rawPaymentMethod === 'CASH') {
        splitCash = pricing.finalPrice;
      } else if (['UPI', 'ONLINE', 'CARD'].includes(rawPaymentMethod)) {
        splitOnline = pricing.finalPrice;
      } else if (rawPaymentMethod === 'KHATA') {
        splitKhata = pricing.finalPrice;
        const { data: cData } = await supabase.from('customers').select('outstanding_balance').eq('id', customer_id).single();
        const currentBal = Number(cData?.outstanding_balance || 0);
        await supabase.from('customers').update({ outstanding_balance: currentBal + splitKhata }).eq('id', customer_id);
      } else if (rawPaymentMethod === 'SPLIT') {
        splitCash = Number(body.split_cash || 0);
        splitOnline = Number(body.split_online || 0);
        splitKhata = Number(body.split_khata || 0);
        if (splitKhata > 0) {
          const { data: cData } = await supabase.from('customers').select('outstanding_balance').eq('id', customer_id).single();
          const currentBal = Number(cData?.outstanding_balance || 0);
          await supabase.from('customers').update({ outstanding_balance: currentBal + splitKhata }).eq('id', customer_id);
        }
      }
    }

    try {
      await supabase.from('invoices').insert({
        booking_id: newBooking.id,
        amount: pricing.finalPrice,
        base_price: pricing.basePrice,
        final_price: pricing.finalPrice,
        discount_amount: pricing.discountAmount,
        discount_percentage: pricing.discountPercentage,
        payment_method: ['CASH', 'CARD', 'ONLINE', 'SPLIT'].includes(rawPaymentMethod) ? rawPaymentMethod : 'CASH',
        is_paid: isPaid,
        split_cash: splitCash,
        split_online: splitOnline,
        split_khata: splitKhata,
      });
    } catch (invErr) {
      console.warn('[Bookings Route] Optional invoice creation note:', invErr);
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Booking created successfully.',
        booking_id: newBooking.id,
        booking: newBooking,
        data: newBooking,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
