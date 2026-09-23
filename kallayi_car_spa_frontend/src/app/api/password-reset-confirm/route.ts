import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await request.json().catch(() => ({}));

    const { uidb64, token, new_password, password } = body;
    const targetPassword = String(new_password || password || '').trim();

    if (!targetPassword || targetPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    if (!uidb64 && !token) {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing reset token.' },
        { status: 400 }
      );
    }

    // Try decoding uidb64 to extract userId
    let userId: string | null = null;
    if (uidb64) {
      try {
        const decoded = Buffer.from(uidb64, 'base64').toString('utf-8');
        // If decoded is a valid UUID or string
        if (decoded && decoded.length > 5) {
          userId = decoded;
        }
      } catch {
        userId = uidb64;
      }
    }

    if (!userId && token) {
      // Check if token itself is or contains user identifier
      userId = token;
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired reset token.' },
        { status: 400 }
      );
    }

    // Update user password in Supabase Auth
    const { error: updateErr } = await supabase.auth.admin.updateUserById(userId, {
      password: targetPassword,
    });

    if (updateErr) {
      console.error('[password-reset-confirm] Supabase update error:', updateErr);
      return NextResponse.json(
        { success: false, error: updateErr.message || 'Failed to update password.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully! You can now log in with your new password.',
    });
  } catch (error: any) {
    console.error('[password-reset-confirm] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to reset password.' },
      { status: 500 }
    );
  }
}
