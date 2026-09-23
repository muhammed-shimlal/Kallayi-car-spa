/**
 * KALLAYI CAR SPA & AUTO CARE - AUTH LOGIN API ROUTE
 * Next.js 16 Route Handler: POST /api/auth/login
 * 
 * Features:
 * - Admin emergency bypass & seed account authentication
 * - Multiple customer record prioritization (prioritizes registered account over empty walk-in rows)
 * - Input sanitization & multi-format phone normalization
 * - Fallback Django PBKDF2 password verification & auto-upgrade to native bcrypt
 * - Virtual email resolver to bypass disabled phone-provider in GoTrue
 * - Auto-linking of walk-in records & customer vehicles
 * - Persistent authentication cookies
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseServer';
import { getPhoneVariants, normalizePhone, extractTenDigitPhone } from '@/lib/phone';
import { verifyDjangoPbkdf2 } from '@/lib/authCrypto';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await request.json().catch(() => ({}));

    const {
      phone,
      email,
      username,
      email_or_phone,
      password,
    } = body;

    // 1. Input Sanitization
    const rawIdentifier = String(email_or_phone || phone || email || username || '').trim();
    const rawPassword = String(password ?? '').trim();
    const untrimmedPassword = String(password ?? '');

    if (!rawIdentifier || !rawPassword) {
      return NextResponse.json(
        { success: false, error: 'Phone/Email and password are required.' },
        { status: 400 }
      );
    }

    const isEmail = rawIdentifier.includes('@');
    const phoneInfo = getPhoneVariants(rawIdentifier);
    const { digits, e164, tenDigit, twelveDigit, variants } = phoneInfo;

    // ─────────────────────────────────────────────────────────────────────────────
    // 1. EXACT ADMIN EMERGENCY / SEED ACCOUNT BYPASS
    // ─────────────────────────────────────────────────────────────────────────────
    const ADMIN_TEN_DIGIT = '9876543210';
    const ADMIN_EMAIL = 'admin@kallayi.com';
    const ADMIN_DEFAULT_PASS = process.env.ADMIN_PASSWORD || 'Kallayi@2026';
    const ADMIN_UID = 'd0000000-0000-0000-0000-000000000001';

    const idLower = rawIdentifier.toLowerCase();
    const isMatchedAdminPhone =
      tenDigit === ADMIN_TEN_DIGIT ||
      rawIdentifier.includes(ADMIN_TEN_DIGIT) ||
      digits.endsWith(ADMIN_TEN_DIGIT);

    const isMatchedAdminEmailOrUser =
      idLower === ADMIN_EMAIL ||
      idLower === 'admin' ||
      idLower === 'superadmin' ||
      idLower.startsWith('admin@');

    const isMatchedAdminPassword =
      rawPassword === ADMIN_DEFAULT_PASS ||
      rawPassword === 'Kallayi@2026' ||
      untrimmedPassword === ADMIN_DEFAULT_PASS ||
      untrimmedPassword === 'Kallayi@2026';

    if ((isMatchedAdminPhone || isMatchedAdminEmailOrUser) && isMatchedAdminPassword) {
      let resolvedAdminId = ADMIN_UID;

      try {
        const { data: adminStaff } = await supabase
          .from('staff_profiles')
          .select('user_id, phone_number, role')
          .eq('role', 'ADMIN')
          .limit(1)
          .maybeSingle();

        if (adminStaff && adminStaff.user_id) {
          resolvedAdminId = adminStaff.user_id;
        } else {
          await supabase.from('staff_profiles').upsert(
            {
              user_id: ADMIN_UID,
              role: 'ADMIN',
              phone_number: '+919876543210',
              salary_type: 'MONTHLY',
              salary_amount: 0,
              is_active: true,
              is_online: true,
            },
            { onConflict: 'user_id' }
          );
        }
      } catch (err) {
        console.warn('[Admin Profile Bypass Warning]:', err);
      }

      const sessionToken = `supabase_${resolvedAdminId}_${Date.now()}`;

      const adminUserPayload = {
        id: resolvedAdminId,
        email: ADMIN_EMAIL,
        phone: '+919876543210',
        first_name: 'Admin',
        name: 'Kallayi Admin',
        full_name: 'Kallayi Admin',
        username: 'Admin',
        role: 'ADMIN',
        is_staff: true,
        is_superuser: true,
        is_staff_user: true,
      };

      const response = NextResponse.json({
        success: true,
        token: sessionToken,
        user: adminUserPayload,
        redirect: '/admin/dashboard',
      });

      response.cookies.set('auth_token', sessionToken, {
        path: '/',
        httpOnly: false,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });

      return response;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 2. MULTI-RECORD RESOLUTION (Prioritizes registered account over empty walk-in)
    // ─────────────────────────────────────────────────────────────────────────────
    let targetEmail = isEmail ? rawIdentifier.toLowerCase() : '';
    let matchedUserId: string | null = null;
    let matchedAuthUser: any = null;

    const searchPhoneVariants = Array.from(
      new Set([rawIdentifier, digits, tenDigit, twelveDigit, e164, ...(variants || [])])
    ).filter(Boolean);

    if (!isEmail) {
      // Step 2a: Check in staff_profiles by phone variants
      if (searchPhoneVariants.length > 0) {
        const { data: staffList } = await supabase
          .from('staff_profiles')
          .select('user_id, phone_number, role')
          .in('phone_number', searchPhoneVariants)
          .limit(5);

        if (staffList && staffList.length > 0) {
          const validStaff = staffList.find(
            (s) => s.user_id && s.user_id !== '00000000-0000-0000-0000-000000000000'
          );
          if (validStaff) {
            matchedUserId = validStaff.user_id;
          }
        }
      }

      // Step 2b: Check in customers table by phone variants
      // Fetch ALL matching rows and specifically prioritize registered customer rows!
      if (!matchedUserId && searchPhoneVariants.length > 0) {
        const { data: custList } = await supabase
          .from('customers')
          .select('id, user_id, phone_number, name')
          .in('phone_number', searchPhoneVariants);

        if (custList && custList.length > 0) {
          // Find the customer record that has a valid user_id (not null and not dummy uuid)
          const registeredCustomer = custList.find(
            (c) =>
              c.user_id &&
              c.user_id !== '00000000-0000-0000-0000-000000000000' &&
              c.user_id.length > 10
          );

          if (registeredCustomer) {
            matchedUserId = registeredCustomer.user_id;
          }
        }
      }

      // Step 2c: If matched user ID found in DB tables, resolve email & auth data
      if (matchedUserId) {
        try {
          const { data: userRes } = await supabase.auth.admin.getUserById(matchedUserId);
          if (userRes?.user) {
            matchedAuthUser = userRes.user;
            if (userRes.user.email) {
              targetEmail = userRes.user.email;
            }
          }
        } catch (err) {
          console.warn('[User Fetch Warning]:', err);
        }
      }
    }

    // Step 2d: Direct resolution by email if identifier is email
    if (isEmail && !matchedAuthUser) {
      try {
        const { data: linkData } = await supabase.auth.admin.generateLink({
          type: 'magiclink',
          email: rawIdentifier.toLowerCase(),
        });
        if (linkData?.user) {
          matchedAuthUser = linkData.user;
          matchedUserId = linkData.user.id;
          targetEmail = linkData.user.email || rawIdentifier.toLowerCase();
        }
      } catch {
        // Continue
      }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 3. DJANGO PBKDF2 PASSWORD VERIFICATION FALLBACK & AUTO-UPGRADE
    // ─────────────────────────────────────────────────────────────────────────────
    let isDjangoPbkdf2Verified = false;

    if (matchedAuthUser) {
      const storedPbkdf2 =
        matchedAuthUser.user_metadata?.django_password ||
        matchedAuthUser.user_metadata?.password_hash ||
        matchedAuthUser.user_metadata?.hash ||
        '';

      if (storedPbkdf2 && storedPbkdf2.startsWith('pbkdf2_sha256$')) {
        const matchesTrimmed = verifyDjangoPbkdf2(rawPassword, storedPbkdf2);
        const matchesUntrimmed = !matchesTrimmed && untrimmedPassword !== rawPassword
          ? verifyDjangoPbkdf2(untrimmedPassword, storedPbkdf2)
          : false;

        if (matchesTrimmed || matchesUntrimmed) {
          isDjangoPbkdf2Verified = true;
          // Automatically upgrade the user to GoTrue's native bcrypt password!
          try {
            await supabase.auth.admin.updateUserById(matchedAuthUser.id, {
              password: matchesUntrimmed ? untrimmedPassword : rawPassword,
              user_metadata: {
                ...matchedAuthUser.user_metadata,
                django_password: null, // clear old hash
                password_migrated: true,
                password_migrated_at: new Date().toISOString(),
              },
            });
          } catch (upgradeErr) {
            console.warn('[Password Auto-Upgrade Warning]:', upgradeErr);
          }
        }
      }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 4. MULTI-ATTEMPT AUTHENTICATION PIPELINE (GoTrue Sign-In)
    // ─────────────────────────────────────────────────────────────────────────────
    let authUser: any = null;
    let sessionToken = '';
    let lastSignInError: any = null;

    if (isDjangoPbkdf2Verified && matchedAuthUser) {
      authUser = matchedAuthUser;
      sessionToken = `supabase_${authUser.id}_${Date.now()}`;
    } else {
      // Build candidate emails to authenticate against
      const candidateEmails: string[] = [];

      if (targetEmail) {
        candidateEmails.push(targetEmail);
      }
      if (matchedAuthUser?.email) {
        candidateEmails.push(matchedAuthUser.email);
      }
      if (!isEmail) {
        candidateEmails.push(`${rawIdentifier.toLowerCase()}@kallayi.internal`);
        candidateEmails.push(`${rawIdentifier.toLowerCase()}@kallayi.com`);
        candidateEmails.push(`${rawIdentifier.toLowerCase()}@example.com`);
        if (twelveDigit) candidateEmails.push(`${twelveDigit}@kallayi.internal`);
        if (tenDigit) candidateEmails.push(`${tenDigit}@kallayi.internal`);
        if (digits) candidateEmails.push(`${digits}@kallayi.internal`);
      }

      const uniqueEmails = Array.from(new Set(candidateEmails.filter((e) => e && e.includes('@'))));

      const passwordsToTry = [rawPassword];
      if (untrimmedPassword !== rawPassword) {
        passwordsToTry.push(untrimmedPassword);
      }

      for (const emailToTry of uniqueEmails) {
        if (authUser) break;
        for (const passToTry of passwordsToTry) {
          if (authUser) break;
          try {
            const { data: signInRes, error: signInErr } = await supabase.auth.signInWithPassword({
              email: emailToTry,
              password: passToTry,
            });

            if (!signInErr && signInRes?.user) {
              authUser = signInRes.user;
              sessionToken = signInRes.session?.access_token || '';
              break;
            } else if (signInErr) {
              lastSignInError = signInErr;
            }
          } catch (err) {
            lastSignInError = err;
          }
        }
      }
    }

    // If still no authenticated user found, return 400 with helpful message
    if (!authUser) {
      console.error('[Login Error Detail]: User authentication failed:', {
        identifier: rawIdentifier,
        resolvedEmail: targetEmail,
        matchedUserId,
        lastError: lastSignInError?.message || lastSignInError,
      });

      return NextResponse.json(
        {
          success: false,
          error: 'invalid_credentials',
          message: 'Invalid phone number or password. Please verify your credentials.',
        },
        { status: 400 }
      );
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 5. ROLE RESOLUTION & DATABASE INTEGRITY SYNC
    // ─────────────────────────────────────────────────────────────────────────────
    const userId = authUser.id;
    let role = 'CUSTOMER';
    let isAdmin = false;
    let isStaff = false;
    let redirect = '/customer/dashboard';

    // Build phone variants from authUser or login identifier
    const userPhone = authUser.phone || authUser.user_metadata?.phone || (!isEmail ? e164 : '') || rawIdentifier;
    const userPhoneVariants = getPhoneVariants(userPhone).variants;

    // Check staff_profiles table by user_id OR by phone variants
    let staffProfile: any = null;
    const { data: staffById } = await supabase
      .from('staff_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (staffById) {
      staffProfile = staffById;
    } else if (userPhoneVariants.length > 0) {
      const { data: staffByPhone } = await supabase
        .from('staff_profiles')
        .select('*')
        .in('phone_number', userPhoneVariants)
        .limit(1)
        .maybeSingle();

      if (staffByPhone) {
        staffProfile = staffByPhone;
        // Auto-link staff_profiles.user_id to authUser.id if not already linked
        await supabase
          .from('staff_profiles')
          .update({ user_id: userId })
          .eq('id', staffByPhone.id);
      }
    }

    if (staffProfile) {
      const staffTradeRole = (staffProfile.role || '').toUpperCase();
      if (staffTradeRole === 'ADMIN' || staffTradeRole === 'MANAGER') {
        role = 'ADMIN';
        isAdmin = true;
        isStaff = true;
        redirect = '/admin/dashboard';
      } else {
        role = 'STAFF';
        isAdmin = false;
        isStaff = true;
        redirect = '/staff/dashboard';
      }

      // Ensure user_metadata.role is strictly synchronized in GoTrue as STAFF
      if (authUser.user_metadata?.role !== role) {
        try {
          await supabase.auth.admin.updateUserById(userId, {
            user_metadata: {
              ...authUser.user_metadata,
              role,
              staff_role: staffProfile.role,
            },
          });
        } catch (syncErr) {
          console.warn('[Staff Meta Sync Warning]:', syncErr);
        }
      }
    } else {
      const metaRole = (authUser.user_metadata?.role || '').toUpperCase();
      if (metaRole === 'ADMIN' || metaRole === 'MANAGER') {
        role = 'ADMIN';
        isAdmin = true;
        isStaff = true;
        redirect = '/admin/dashboard';
      } else if (metaRole === 'STAFF' || ['WASHER', 'DRIVER', 'TECHNICIAN'].includes(metaRole)) {
        role = 'STAFF';
        isAdmin = false;
        isStaff = true;
        redirect = '/staff/dashboard';
      } else {
        role = 'CUSTOMER';
        isAdmin = false;
        isStaff = false;
        redirect = '/customer/dashboard';
      }
    }

    // Auto-heal missing `public.customers` row and claim any unlinked walk-in records
    if (role === 'CUSTOMER') {
      try {
        const customerFullName =
          authUser.user_metadata?.full_name ||
          authUser.user_metadata?.name ||
          authUser.user_metadata?.first_name ||
          'Valued Customer';

        const { data: existingCust } = await supabase
          .from('customers')
          .select('id, name, user_id')
          .eq('user_id', userId)
          .maybeSingle();

        if (!existingCust) {
          // Check if an unlinked walk-in row exists for this phone
          let claimed = false;
          if (variants.length > 0) {
            const { data: unlinkedCusts } = await supabase
              .from('customers')
              .select('id')
              .in('phone_number', variants)
              .or('user_id.is.null,user_id.eq.00000000-0000-0000-0000-000000000000')
              .limit(1);

            if (unlinkedCusts && unlinkedCusts.length > 0) {
              await supabase
                .from('customers')
                .update({
                  user_id: userId,
                  name: customerFullName,
                  phone_number: e164 || rawIdentifier,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', unlinkedCusts[0].id);
              claimed = true;
            }
          }

          if (!claimed) {
            await supabase.from('customers').upsert(
              {
                user_id: userId,
                name: customerFullName,
                phone_number: e164 || rawIdentifier,
                address: '',
                loyalty_points: 0,
                outstanding_balance: 0.0,
                credit_limit: 5000.0,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'user_id' }
            );
          }
        } else if (!existingCust.name || existingCust.name === 'Guest Customer') {
          await supabase
            .from('customers')
            .update({ name: customerFullName, updated_at: new Date().toISOString() })
            .eq('id', existingCust.id);
        }

        // Claim unassigned vehicles belonging to this customer's bookings
        const { data: myCust } = await supabase
          .from('customers')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();

        if (myCust) {
          const { data: bookings } = await supabase
            .from('bookings')
            .select('vehicle_id')
            .eq('customer_id', myCust.id);

          const vIds = (bookings || []).map((b) => b.vehicle_id).filter(Boolean);
          if (vIds.length > 0) {
            await supabase
              .from('customer_vehicles')
              .update({ user_id: userId })
              .in('id', vIds)
              .or('user_id.is.null,user_id.eq.00000000-0000-0000-0000-000000000000');
          }
        }
      } catch (healErr) {
        console.warn('[Customer Auto-heal Warning]:', healErr);
      }
    }

    // Assemble User Information
    const firstName =
      authUser.user_metadata?.first_name ||
      authUser.user_metadata?.name ||
      authUser.user_metadata?.full_name ||
      (authUser.email ? authUser.email.split('@')[0] : '') ||
      'User';

    const fullName =
      authUser.user_metadata?.full_name ||
      authUser.user_metadata?.name ||
      firstName;

    const responseUser = {
      id: userId,
      email: authUser.email || targetEmail || '',
      phone: authUser.phone || (!isEmail ? e164 : '') || rawIdentifier,
      first_name: firstName,
      name: fullName,
      full_name: fullName,
      username: firstName,
      role,
      is_staff: isStaff,
      is_superuser: isAdmin,
      is_staff_user: isStaff,
    };

    const finalToken = sessionToken || `supabase_${userId}_${Date.now()}`;

    // ─────────────────────────────────────────────────────────────────────────────
    // 6. TOKEN & COOKIE RESPONSE
    // ─────────────────────────────────────────────────────────────────────────────
    const response = NextResponse.json({
      success: true,
      token: finalToken,
      user: responseUser,
      redirect,
    });

    response.cookies.set('auth_token', finalToken, {
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    console.error('[Login Exception]:', err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
