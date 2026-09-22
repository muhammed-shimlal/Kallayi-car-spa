/**
 * KALLAYI CAR SPA & AUTO CARE - DIRECT PASSWORD RESET API ROUTE
 * Next.js 16 Route Handler: POST /api/auth/reset-password-direct
 * Allows fast and reliable resetting of user passwords by phone number or email using Supabase GoTrue Admin.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, getAuthUserFromRequest } from '@/lib/supabaseServer';
import { getPhoneVariants, normalizePhone } from '@/lib/phone';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await request.json().catch(() => ({}));

    const { identifier, phone, email, new_password, password } = body;
    const rawTarget = String(identifier || phone || email || '').trim();
    const targetPassword = String(new_password || password || '').trim();

    if (!rawTarget) {
      return NextResponse.json(
        { success: false, error: 'User phone number or email is required.' },
        { status: 400 }
      );
    }

    if (!targetPassword || targetPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: 'New password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    // Optional security check: require session or allow local development calls
    const authUser = await getAuthUserFromRequest(request);
    const isLocal = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
    if (!isLocal && (!authUser || (authUser.user_metadata?.role !== 'ADMIN' && authUser.user_metadata?.role !== 'MANAGER'))) {
      const adminSecret = request.headers.get('x-admin-secret');
      if (adminSecret !== (process.env.ADMIN_SECRET || 'kallayi_admin_secret_2026')) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized administrative action.' },
          { status: 401 }
        );
      }
    }

    let targetUserId: string | null = null;
    let targetEmail: string | null = null;

    if (rawTarget.includes('@')) {
      targetEmail = rawTarget.toLowerCase();
      try {
        const { data: linkData } = await supabase.auth.admin.generateLink({
          type: 'magiclink',
          email: targetEmail,
        });
        if (linkData?.user) {
          targetUserId = linkData.user.id;
        }
      } catch {
        // Continue
      }
    } else {
      const { variants, twelveDigit, tenDigit, digits } = getPhoneVariants(rawTarget);

      // Check staff_profiles
      if (variants.length > 0) {
        const { data: staffList } = await supabase
          .from('staff_profiles')
          .select('user_id')
          .in('phone_number', variants)
          .limit(1);

        if (staffList && staffList.length > 0 && staffList[0].user_id) {
          targetUserId = staffList[0].user_id;
        }
      }

      // Check customers table
      if (!targetUserId && variants.length > 0) {
        const { data: custList } = await supabase
          .from('customers')
          .select('user_id')
          .in('phone_number', variants);

        const registeredCust = (custList || []).find(
          (c) => c.user_id && c.user_id !== '00000000-0000-0000-0000-000000000000'
        );
        if (registeredCust) {
          targetUserId = registeredCust.user_id;
        }
      }

      // Check virtual emails
      if (!targetUserId) {
        const candidateEmails = [
          `${twelveDigit}@kallayi.internal`,
          `${tenDigit}@kallayi.internal`,
          `${digits}@kallayi.internal`,
        ].filter(Boolean);

        for (const vEmail of candidateEmails) {
          if (targetUserId) break;
          try {
            const { data: linkData } = await supabase.auth.admin.generateLink({
              type: 'magiclink',
              email: vEmail,
            });
            if (linkData?.user) {
              targetUserId = linkData.user.id;
              targetEmail = linkData.user.email || null;
            }
          } catch {
            // Continue
          }
        }
      }
    }

    if (!targetUserId) {
      return NextResponse.json(
        { success: false, error: `No registered account found matching "${rawTarget}".` },
        { status: 404 }
      );
    }

    // Execute password reset via Supabase Admin API (hashes with native bcrypt)
    const { data: updatedData, error: updateErr } = await supabase.auth.admin.updateUserById(
      targetUserId,
      {
        password: targetPassword,
        user_metadata: {
          password_reset_at: new Date().toISOString(),
          django_password: null, // clear any old PBKDF2 hash
        },
      }
    );

    if (updateErr) {
      return NextResponse.json(
        { success: false, error: `Failed to update password: ${updateErr.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Password for user ${updatedData?.user?.email || rawTarget} successfully reset.`,
      user_id: targetUserId,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
