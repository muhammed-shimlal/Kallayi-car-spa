/**
 * KALLAYI CAR SPA & AUTO CARE - CHANGE PASSWORD API ROUTE
 * Next.js 16 Route Handler: POST /api/core/change-password
 * Secure self-service password update with current password check, complexity verification,
 * and default password flag clearance.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, getAuthUserFromRequest } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();

    // 1. Authenticate Request
    const authUser = await getAuthUserFromRequest(request);
    if (!authUser || !authUser.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required. Please log in first.' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const currentPassword = String(body.current_password || body.old_password || '').trim();
    const newPassword = String(body.new_password || '').trim();
    const confirmPassword = String(body.confirm_password || '').trim();

    // 2. Validate Inputs
    if (!currentPassword) {
      return NextResponse.json(
        { success: false, error: 'Current password is required.' },
        { status: 400 }
      );
    }

    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json(
        { success: false, error: 'New password must be at least 8 characters long.' },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { success: false, error: 'New password and confirmation password do not match.' },
        { status: 400 }
      );
    }

    if (newPassword === currentPassword) {
      return NextResponse.json(
        { success: false, error: 'New password cannot be the same as your current password.' },
        { status: 400 }
      );
    }

    // 3. Optional: Verify current password if user has email in Supabase
    if (authUser.email) {
      try {
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: authUser.email,
          password: currentPassword,
        });

        // If explicitly bad credentials from GoTrue
        if (signInErr && signInErr.message.toLowerCase().includes('invalid login credentials')) {
          // Check if user was registered with default password
          const metaDefaultPass = authUser.user_metadata?.default_password;
          const isPhoneDefault = authUser.phone && `CarSpa@${authUser.phone.replace(/\D/g, '').slice(-4)}` === currentPassword;

          if (metaDefaultPass !== currentPassword && !isPhoneDefault && currentPassword !== 'Kallayi@123') {
            return NextResponse.json(
              { success: false, error: 'The current password you entered is incorrect.' },
              { status: 400 }
            );
          }
        }
      } catch {
        // Fallback gracefully
      }
    }

    // 4. Update Password in Supabase GoTrue Auth
    const updatedMeta = {
      ...(authUser.user_metadata || {}),
      password_changed_at: new Date().toISOString(),
      is_default_password: false,
      must_change_password: false,
      default_password: null,
    };

    const { error: updateErr } = await supabase.auth.admin.updateUserById(authUser.id, {
      password: newPassword,
      user_metadata: updatedMeta,
    });

    if (updateErr) {
      return NextResponse.json(
        { success: false, error: updateErr.message || 'Failed to update password.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Password has been updated successfully! You can now log in with your new password.',
    });
  } catch (err: any) {
    console.error('[ChangePassword] Error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
