/**
 * KALLAYI CAR SPA & AUTO CARE - SUPABASE AUTH CALLBACK ROUTE
 * Next.js 16 Route Handler: GET /api/auth/callback
 * 
 * Handles Supabase OAuth / Phone OTP sign-in redirects, checks phone against
 * public.staff_profiles, links user_id, synchronizes user_metadata.role to 'STAFF',
 * and redirects strictly to the Staff Dashboard (/staff/queue).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseServer';
import { getPhoneVariants, normalizePhone } from '@/lib/phone';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const origin = requestUrl.origin;
  const redirectParam = requestUrl.searchParams.get('redirect');

  const supabase = getSupabaseAdmin();

  if (code) {
    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error && data?.user) {
        const user = data.user;
        const rawPhone = user.phone || user.user_metadata?.phone || '';
        const { variants, e164 } = getPhoneVariants(rawPhone);
        const normalizedPhone = e164 || normalizePhone(rawPhone);

        // Check if user is in staff_profiles
        let staffProfile: any = null;
        const { data: staffById } = await supabase
          .from('staff_profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (staffById) {
          staffProfile = staffById;
        } else if (variants.length > 0) {
          const { data: staffByPhone } = await supabase
            .from('staff_profiles')
            .select('*')
            .in('phone_number', variants)
            .limit(1)
            .maybeSingle();

          if (staffByPhone) {
            staffProfile = staffByPhone;
            // Link staff_profiles to auth user
            await supabase
              .from('staff_profiles')
              .update({ user_id: user.id, phone_number: normalizedPhone })
              .eq('id', staffByPhone.id);
          }
        }

        if (staffProfile) {
          const staffRole = (staffProfile.role || '').toUpperCase();
          const isAdmin = staffRole === 'ADMIN' || staffRole === 'MANAGER';
          const assignedRole = isAdmin ? 'ADMIN' : 'STAFF';

          // Ensure GoTrue metadata is STAFF
          if (user.user_metadata?.role !== assignedRole) {
            await supabase.auth.admin.updateUserById(user.id, {
              user_metadata: {
                ...user.user_metadata,
                role: assignedRole,
                staff_role: staffProfile.role,
              },
            });
          }

          const targetUrl = isAdmin ? `${origin}/admin/dashboard` : `${origin}/staff/dashboard`;
          const response = NextResponse.redirect(targetUrl);
          if (data.session?.access_token) {
            response.cookies.set('auth_token', data.session.access_token, {
              path: '/',
              httpOnly: false,
              sameSite: 'lax',
              maxAge: 60 * 60 * 24 * 30,
            });
          }
          return response;
        }

        // Standard user fallback
        const metaRole = (user.user_metadata?.role || '').toUpperCase();
        let target = `${origin}/customer/dashboard`;
        if (metaRole === 'ADMIN' || metaRole === 'MANAGER') {
          target = `${origin}/admin/dashboard`;
        } else if (metaRole === 'STAFF') {
          target = `${origin}/staff/dashboard`;
        } else if (redirectParam && !redirectParam.startsWith('/staff') && !redirectParam.startsWith('/admin')) {
          target = `${origin}${redirectParam}`;
        }

        const response = NextResponse.redirect(target);
        if (data.session?.access_token) {
          response.cookies.set('auth_token', data.session.access_token, {
            path: '/',
            httpOnly: false,
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 30,
          });
        }
        return response;
      }
    } catch (err) {
      console.error('[Auth Callback Error]:', err);
    }
  }

  // Fallback to login if code exchange failed
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
