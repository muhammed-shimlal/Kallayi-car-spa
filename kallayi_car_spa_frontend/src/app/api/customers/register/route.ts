/**
 * KALLAYI CAR SPA & AUTO CARE - CUSTOMER REGISTRATION API ROUTE
 * Next.js 16 Route Handler: POST /api/customers/register
 * 
 * Implements:
 * Case A (New User): Creates Supabase Auth User, inserts Customer Profile, issues session.
 * Case B (Existing Walk-in): Claims unlinked walk-in customer row, sets password, links bookings & garage vehicles, issues session.
 * Case C (Already Registered): Friendly error instructing user to log in.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseServer';
import { getPhoneVariants, normalizePhone, isValidIndianMobile, extractTenDigitPhone } from '@/lib/phone';
import { VehicleType } from '@/types/database';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await request.json().catch(() => ({}));

    const {
      name,
      phone,
      email,
      password,
      vehicle,
    } = body;

    // 1. Validation & Input Sanitization
    const trimmedName = String(name || '').trim();
    const trimmedPhone = String(phone || '').trim();
    const trimmedPassword = String(password || '').trim();
    const trimmedEmail = String(email || '').trim().toLowerCase();

    if (!trimmedName || trimmedName.length < 2) {
      return NextResponse.json(
        { success: false, error: 'Name must be at least 2 characters long.' },
        { status: 400 }
      );
    }

    if (!trimmedPhone) {
      return NextResponse.json(
        { success: false, error: 'Mobile number is required.' },
        { status: 400 }
      );
    }

    if (!isValidIndianMobile(trimmedPhone)) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid 10-digit Indian mobile number.' },
        { status: 400 }
      );
    }

    if (!trimmedPassword || trimmedPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    // 2. Normalize Phone Number to Canonical E.164 and Multi-Variants
    const canonicalPhone = normalizePhone(trimmedPhone);
    const { digits, e164, tenDigit, twelveDigit, variants } = getPhoneVariants(trimmedPhone);

    // 3. Resolve Target Email (Use user's email if provided, otherwise internal virtual email)
    const targetEmail = trimmedEmail && trimmedEmail.includes('@')
      ? trimmedEmail
      : `${twelveDigit || digits}@kallayi.internal`;

    // 3b. Check if this phone number is registered as a Staff Member in `public.staff_profiles`
    const { data: matchedStaff } = await supabase
      .from('staff_profiles')
      .select('*')
      .in('phone_number', variants)
      .limit(1)
      .maybeSingle();

    if (matchedStaff) {
      // Worker is signing up via frontend signup page.
      // Provision/upgrade their GoTrue account with role 'STAFF', link staff_profile, and redirect to /staff/queue!
      let staffUserId: string | null = matchedStaff.user_id;

      // Find or create auth user
      let matchedUser: any = null;
      if (staffUserId) {
        try {
          const { data: userById } = await supabase.auth.admin.getUserById(staffUserId);
          if (userById?.user) matchedUser = userById.user;
        } catch {}
      }

      if (!matchedUser) {
        const candidateEmails = [
          targetEmail.toLowerCase(),
          `${twelveDigit}@kallayi.internal`.toLowerCase(),
          `${tenDigit}@kallayi.internal`.toLowerCase(),
          `${digits}@kallayi.internal`.toLowerCase(),
        ];
        const { data: allUsers } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
        matchedUser = allUsers?.users?.find((u) => {
          if (u.id === staffUserId) return true;
          if (u.email && candidateEmails.includes(u.email.toLowerCase())) return true;
          const uPhoneDigits = u.phone?.replace(/\D/g, '');
          const uMetaPhoneDigits = u.user_metadata?.phone?.replace(/\D/g, '');
          return variants.some((v) => {
            const vDigits = v.replace(/\D/g, '');
            return (vDigits && vDigits === uPhoneDigits) || (vDigits && vDigits === uMetaPhoneDigits);
          });
        });
      }

      if (matchedUser) {
        staffUserId = matchedUser.id;
        await supabase.auth.admin.updateUserById(matchedUser.id, {
          password: trimmedPassword,
          phone_confirm: true,
          email_confirm: true,
          user_metadata: {
            ...matchedUser.user_metadata,
            role: 'STAFF',
            staff_role: matchedStaff.role,
            full_name: trimmedName,
            name: trimmedName,
            first_name: trimmedName.split(' ')[0],
            phone: e164,
          },
        });
      } else {
        const { data: newAuth, error: newAuthErr } = await supabase.auth.admin.createUser({
          phone: e164,
          email: targetEmail,
          password: trimmedPassword,
          phone_confirm: true,
          email_confirm: true,
          user_metadata: {
            role: 'STAFF',
            staff_role: matchedStaff.role,
            full_name: trimmedName,
            name: trimmedName,
            first_name: trimmedName.split(' ')[0],
            phone: e164,
          },
        });

        if (newAuth?.user) {
          staffUserId = newAuth.user.id;
        } else {
          // If creation failed because email was already registered, resolve user and update
          try {
            const { data: linkData } = await supabase.auth.admin.generateLink({
              type: 'magiclink',
              email: targetEmail,
            });
            if (linkData?.user) {
              staffUserId = linkData.user.id;
              await supabase.auth.admin.updateUserById(linkData.user.id, {
                password: trimmedPassword,
                user_metadata: {
                  ...linkData.user.user_metadata,
                  role: 'STAFF',
                  staff_role: matchedStaff.role,
                  full_name: trimmedName,
                  name: trimmedName,
                  phone: e164,
                },
              });
            }
          } catch {}

          if (!staffUserId) {
            return NextResponse.json(
              { success: false, error: newAuthErr?.message || 'Failed to setup staff account' },
              { status: 500 }
            );
          }
        }
      }

      // Link staff_profiles to staffUserId
      await supabase
        .from('staff_profiles')
        .update({ user_id: staffUserId!, phone_number: e164 })
        .eq('id', matchedStaff.id);

      const token = `auth_${staffUserId}`;
      const staffTradeRole = (matchedStaff.role || '').toUpperCase();
      const isAdminStaff = staffTradeRole === 'ADMIN' || staffTradeRole === 'MANAGER';
      const redirectPath = isAdminStaff ? '/admin/dashboard' : '/staff/dashboard';

      const response = NextResponse.json({
        success: true,
        token,
        user: {
          id: staffUserId,
          email: targetEmail,
          phone: e164,
          first_name: trimmedName.split(' ')[0],
          name: trimmedName,
          full_name: trimmedName,
          role: isAdminStaff ? 'ADMIN' : 'STAFF',
          is_staff: true,
          is_superuser: isAdminStaff,
        },
        redirect: redirectPath,
      });

      response.cookies.set('auth_token', token, {
        path: '/',
        httpOnly: false,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30,
      });

      return response;
    }

    // 4. Query all existing records in `public.customers` matching any phone variants
    const { data: matchedCustomers, error: queryErr } = await supabase
      .from('customers')
      .select('*')
      .in('phone_number', variants);

    if (queryErr) {
      console.warn('[Register Customer Query Warning]:', queryErr.message);
    }

    // Filter to find registered customer rows vs walk-in/unregistered rows
    const registeredCustomer = (matchedCustomers || []).find(
      (c) =>
        c.user_id &&
        c.user_id !== '00000000-0000-0000-0000-000000000000' &&
        c.user_id.length > 10
    );

    // Filter unlinked walk-in records
    const walkinRecords = (matchedCustomers || []).filter(
      (c) =>
        !c.user_id ||
        c.user_id === '00000000-0000-0000-0000-000000000000'
    );

    // ─────────────────────────────────────────────────────────────────────────────
    // CASE C: ALREADY REGISTERED USER CHECK
    // ─────────────────────────────────────────────────────────────────────────────
    if (registeredCustomer && registeredCustomer.user_id) {
      // Verify if the associated user_id actually exists in GoTrue auth
      try {
        const { data: authCheck } = await supabase.auth.admin.getUserById(registeredCustomer.user_id);
        if (authCheck?.user) {
          return NextResponse.json(
            {
              success: false,
              error: 'customer_already_exists',
              message: 'An account with this phone number already exists. Please log in.',
            },
            { status: 400 }
          );
        }
      } catch {
        // If auth user check failed or was deleted, allow re-claiming
      }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 5. PROVISION AUTH USER (Create or Update Existing GoTrue Account)
    // ─────────────────────────────────────────────────────────────────────────────
    let userId: string | null = null;

    // Check if an auth user already exists for this candidate targetEmail
    try {
      const { data: linkData } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: targetEmail,
      });

      if (linkData?.user) {
        userId = linkData.user.id;
        // Update user's password and metadata to finalize registration
        await supabase.auth.admin.updateUserById(userId, {
          password: trimmedPassword,
          email_confirm: true,
          phone_confirm: true,
          user_metadata: {
            ...linkData.user.user_metadata,
            full_name: trimmedName,
            first_name: trimmedName.split(' ')[0],
            name: trimmedName,
            phone: e164,
            role: 'CUSTOMER',
          },
        });
      }
    } catch {
      // User does not exist yet via magiclink check
    }

    // Also check virtual emails if user provided a custom email or vice versa
    if (!userId) {
      const fallbackEmails = [
        `${twelveDigit}@kallayi.internal`,
        `${tenDigit}@kallayi.internal`,
        `${digits}@kallayi.internal`,
      ];
      for (const fbEmail of fallbackEmails) {
        if (userId) break;
        if (fbEmail === targetEmail) continue;
        try {
          const { data: fbData } = await supabase.auth.admin.generateLink({
            type: 'magiclink',
            email: fbEmail,
          });
          if (fbData?.user) {
            userId = fbData.user.id;
            await supabase.auth.admin.updateUserById(userId, {
              password: trimmedPassword,
              email_confirm: true,
              phone_confirm: true,
              user_metadata: {
                ...fbData.user.user_metadata,
                full_name: trimmedName,
                first_name: trimmedName.split(' ')[0],
                name: trimmedName,
                phone: e164,
                role: 'CUSTOMER',
              },
            });
          }
        } catch {
          // Continue
        }
      }
    }

    // If still no existing auth user, create one
    if (!userId) {
      // First attempt: create with email
      const { data: newAuthData, error: authErr } = await supabase.auth.admin.createUser({
        email: targetEmail,
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

      if (authErr || !newAuthData.user) {
        // If targetEmail is already taken, try virtual email
        const virtualEmail = `${twelveDigit || digits}@kallayi.internal`;
        const { data: retryAuth, error: retryErr } = await supabase.auth.admin.createUser({
          email: virtualEmail,
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

        if (retryErr || !retryAuth.user) {
          // If already registered by another user error
          const msg = (authErr?.message || retryErr?.message || '').toLowerCase();
          if (msg.includes('already') || msg.includes('exists')) {
            return NextResponse.json(
              {
                success: false,
                error: 'customer_already_exists',
                message: 'An account with this phone number or email already exists. Please log in.',
              },
              { status: 400 }
            );
          }

          return NextResponse.json(
            {
              success: false,
              error: authErr?.message || retryErr?.message || 'Failed to create user authentication record.',
            },
            { status: 500 }
          );
        }

        userId = retryAuth.user.id;
      } else {
        userId = newAuthData.user.id;
      }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 6. CUSTOMER RECORD CLAIM OR CREATION (CASE A vs CASE B)
    // ─────────────────────────────────────────────────────────────────────────────
    let customerRecord: any = null;

    // Check if a customer row for this user already exists (e.g. from trigger or previous attempt)
    const { data: existingUserCust } = await supabase
      .from('customers')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (walkinRecords.length > 0) {
      // CASE B: Existing Walk-in Customer Record
      // Pick the primary walk-in record (sort by highest outstanding_balance or newest)
      const primaryWalkin = walkinRecords.sort(
        (a, b) => Number(b.outstanding_balance || 0) - Number(a.outstanding_balance || 0)
      )[0];

      const allWalkinIds = walkinRecords.map((w) => w.id);

      if (existingUserCust) {
        // Merge walk-in into the existing user customer row to avoid duplicate user_id key error!
        const totalBalance = Math.max(
          Number(existingUserCust.outstanding_balance || 0),
          Number(primaryWalkin.outstanding_balance || 0)
        );
        const totalPoints = Math.max(
          Number(existingUserCust.loyalty_points || 0),
          Number(primaryWalkin.loyalty_points || 0)
        );

        const { data: mergedCust } = await supabase
          .from('customers')
          .update({
            name: trimmedName,
            phone_number: e164,
            outstanding_balance: totalBalance,
            loyalty_points: totalPoints,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingUserCust.id)
          .select('*')
          .single();

        customerRecord = mergedCust || existingUserCust;

        // Re-point all bookings and invoices to existingUserCust.id
        await supabase
          .from('bookings')
          .update({ customer_id: existingUserCust.id })
          .in('customer_id', allWalkinIds);

        // Delete redundant walkin rows
        await supabase.from('customers').delete().in('id', allWalkinIds);
      } else {
        // No row with user_id exists yet: safely update primaryWalkin
        const { data: updatedCust, error: updateErr } = await supabase
          .from('customers')
          .update({
            user_id: userId,
            name: trimmedName,
            phone_number: e164,
            updated_at: new Date().toISOString(),
          })
          .eq('id', primaryWalkin.id)
          .select('*')
          .single();

        customerRecord = (!updateErr && updatedCust) ? updatedCust : primaryWalkin;

        // Re-assign bookings from other duplicate walk-in records
        const otherWalkinIds = allWalkinIds.filter((id) => id !== primaryWalkin.id);
        if (otherWalkinIds.length > 0) {
          await supabase
            .from('bookings')
            .update({ customer_id: primaryWalkin.id })
            .in('customer_id', otherWalkinIds);

          await supabase.from('customers').delete().in('id', otherWalkinIds);
        }
      }

      // Claim all walk-in vehicles associated with this customer's bookings
      try {
        const targetCustId = customerRecord?.id || primaryWalkin.id;
        const { data: customerBookings } = await supabase
          .from('bookings')
          .select('vehicle_id')
          .eq('customer_id', targetCustId);

        const vehicleIds = (customerBookings || [])
          .map((b) => b.vehicle_id)
          .filter(Boolean);

        if (vehicleIds.length > 0) {
          await supabase
            .from('customer_vehicles')
            .update({ user_id: userId })
            .in('id', vehicleIds)
            .or('user_id.is.null,user_id.eq.00000000-0000-0000-0000-000000000000');
        }
      } catch (vehClaimErr) {
        console.warn('[Vehicle Claim Warning]:', vehClaimErr);
      }
    } else {
      // CASE A: New User (No existing customer profile)
      const { data: newCust, error: custErr } = await supabase
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
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        )
        .select('*')
        .single();

      if (custErr && !newCust) {
        const { data: fallbackCust } = await supabase
          .from('customers')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        customerRecord = fallbackCust;
      } else {
        customerRecord = newCust;
      }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 7. REGISTER OPTIONAL VEHICLE
    // ─────────────────────────────────────────────────────────────────────────────
    if (vehicle && vehicle.plate_number && String(vehicle.plate_number).trim()) {
      const cleanPlate = String(vehicle.plate_number).trim().toUpperCase();
      const vehicleType: VehicleType = (vehicle.vehicle_type as VehicleType) || 'CAR';

      const { data: existingVehicle } = await supabase
        .from('customer_vehicles')
        .select('id, user_id')
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
      } else if (!existingVehicle.user_id || existingVehicle.user_id === '00000000-0000-0000-0000-000000000000') {
        // Link existing unowned vehicle to the registered user
        await supabase
          .from('customer_vehicles')
          .update({ user_id: userId })
          .eq('id', existingVehicle.id);
      }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 8. GENERATE SESSION TOKEN & SET COOKIE
    // ─────────────────────────────────────────────────────────────────────────────
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
      customer: customerRecord,
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
    console.error('[Registration Exception]:', err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
