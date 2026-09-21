/**
 * KALLAYI CAR SPA & AUTO CARE - CUSTOMER REGISTRATION API ROUTE
 * Next.js 16 Route Handler: POST /api/customers/register
 * Creates Supabase Auth User, inserts Customer Profile, registers optional vehicle, and issues session cookie.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseServer';
import { getPhoneVariants } from '@/lib/services/whatsapp';
import { VehicleType } from '@/types/database';

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await request.json();

    const {
      name,
      phone,
      email,
      password,
      vehicle,
    } = body;

    // 1. Validation
    const trimmedName = (name || '').trim();
    const trimmedPhone = (phone || '').trim();
    const trimmedPassword = (password || '').trim();

    if (!trimmedName || trimmedName.length < 2) {
      return NextResponse.json(
        { success: false, error: 'Name must be at least 2 characters long.' },
        { status: 400 }
      );
    }

    if (!trimmedPhone) {
      return NextResponse.json(
        { success: false, error: 'Phone number is required.' },
        { status: 400 }
      );
    }

    if (!trimmedPassword || trimmedPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    // 2. Normalize Phone Number Variants
    const { digits, e164, twelveDigit, variants } = getPhoneVariants(trimmedPhone);

    if (digits.length < 10) {
      return NextResponse.json(
        { success: false, error: 'Invalid phone number. Must contain at least 10 digits.' },
        { status: 400 }
      );
    }

    // 3. Check if customer already exists with this phone number in `customers` table
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id, user_id, phone_number, name')
      .in('phone_number', variants)
      .limit(1)
      .maybeSingle();

    const isExistingClaimed = Boolean(
      existingCustomer &&
      existingCustomer.user_id &&
      existingCustomer.user_id !== '00000000-0000-0000-0000-000000000000'
    );

    if (isExistingClaimed) {
      return NextResponse.json(
        {
          success: false,
          error: 'customer_already_exists',
          message: 'An account with this phone number already exists. Please log in.',
        },
        { status: 400 }
      );
    }

    // 4. Resolve Target Email
    const targetEmail = email && email.includes('@')
      ? email.trim().toLowerCase()
      : `${twelveDigit}@kallayi.internal`;

    // 5. Create Auth User in Supabase Auth GoTrue
    let userId: string;

    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email: targetEmail,
      phone: e164,
      password: trimmedPassword,
      email_confirm: true,
      phone_confirm: true,
      user_metadata: {
        full_name: trimmedName,
        first_name: trimmedName.split(' ')[0],
        name: trimmedName,
        phone: e164,
        role: 'CUSTOMER',
      },
    });

    if (authErr || !authData.user) {
      // If user already exists in auth.users (e.g. registered before but no customer row)
      const { data: allUsers } = await supabase.auth.admin.listUsers();
      const matched = allUsers?.users?.find(
        (u) =>
          u.email?.toLowerCase() === targetEmail.toLowerCase() ||
          (u.phone && variants.includes(u.phone)) ||
          (u.user_metadata?.phone && variants.includes(u.user_metadata.phone))
      );

      if (matched) {
        userId = matched.id;
        // Update user metadata and password if needed
        await supabase.auth.admin.updateUserById(userId, {
          password: trimmedPassword,
          user_metadata: {
            ...matched.user_metadata,
            full_name: trimmedName,
            first_name: trimmedName.split(' ')[0],
            name: trimmedName,
            phone: e164,
            role: 'CUSTOMER',
          },
        });
      } else {
        return NextResponse.json(
          {
            success: false,
            error: authErr?.message || 'Failed to create user authentication record.',
          },
          { status: 500 }
        );
      }
    } else {
      userId = authData.user.id;
    }

    // 6. Insert or Claim Customer Profile in `public.customers`
    let newCustomer: any = null;

    if (existingCustomer) {
      // Claim unlinked walk-in record with the new user_id and registered name
      const { data: updatedCust, error: updateErr } = await supabase
        .from('customers')
        .update({
          user_id: userId,
          name: trimmedName,
          phone_number: e164,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingCustomer.id)
        .select('*')
        .single();

      if (!updateErr && updatedCust) {
        newCustomer = updatedCust;
      }
    }

    if (!newCustomer) {
      const { data: insertedCust, error: custErr } = await supabase
        .from('customers')
        .upsert(
          {
            user_id: userId,
            name: trimmedName,
            phone_number: e164,
            address: '',
            loyalty_points: 0,
            outstanding_balance: 0.0,
            credit_limit: 5000.0,
          },
          { onConflict: 'user_id' }
        )
        .select('*')
        .single();

      if (custErr && !insertedCust) {
        const { data: retryCustomer } = await supabase
          .from('customers')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (!retryCustomer) {
          return NextResponse.json(
            {
              success: false,
              error: `Failed to create customer profile: ${custErr.message}`,
            },
            { status: 500 }
          );
        }
        newCustomer = retryCustomer;
      } else {
        newCustomer = insertedCust;
      }
    }

    // 7. Register Optional Vehicle
    if (vehicle && vehicle.plate_number && String(vehicle.plate_number).trim()) {
      const cleanPlate = String(vehicle.plate_number).trim().toUpperCase();
      const vehicleType: VehicleType = (vehicle.vehicle_type as VehicleType) || 'CAR';

      const { data: existingVehicle } = await supabase
        .from('customer_vehicles')
        .select('id')
        .eq('plate_number', cleanPlate)
        .maybeSingle();

      if (!existingVehicle) {
        await supabase.from('customer_vehicles').insert({
          user_id: userId,
          make: String(vehicle.make || 'Standard').trim(),
          model: String(vehicle.model || 'Vehicle').trim(),
          plate_number: cleanPlate,
          vehicle_type: vehicleType,
          color: String(vehicle.color || '').trim(),
          year: vehicle.year ? Number(vehicle.year) : null,
          registration_number: cleanPlate,
        });
      }
    }

    // 8. Generate Session Token & Set Cookie
    const token = `auth_${userId}`;

    const userPayload = {
      id: userId,
      email: targetEmail,
      phone: e164,
      first_name: trimmedName.split(' ')[0],
      name: trimmedName,
      full_name: trimmedName,
      username: trimmedName.split(' ')[0],
      role: 'CUSTOMER',
      is_staff: false,
      is_superuser: false,
    };

    const response = NextResponse.json({
      success: true,
      token,
      user: userPayload,
      customer: newCustomer,
      redirect: '/customer/dashboard',
    });

    response.cookies.set('auth_token', token, {
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
