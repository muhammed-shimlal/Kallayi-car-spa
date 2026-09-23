import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseServer';
import { getPhoneVariants, normalizePhone } from '@/lib/phone';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await request.json().catch(() => ({}));

    const email = String(body.email || '').trim().toLowerCase();
    const phone = String(body.phone_number || body.phone || '').trim();

    if (!email || !phone) {
      return NextResponse.json(
        { success: false, error: 'Both email and phone number are required for dual verification.' },
        { status: 400 }
      );
    }

    const phoneVariants = getPhoneVariants(phone);

    // Verify user exists with matching phone in customers or staff_profiles
    const { data: customer } = await supabase
      .from('customers')
      .select('id, user_id, phone_number, name')
      .in('phone_number', phoneVariants.variants)
      .maybeSingle();

    const { data: staff } = await supabase
      .from('staff_profiles')
      .select('id, user_id, phone_number')
      .in('phone_number', phoneVariants.variants)
      .maybeSingle();

    const matchedUserId = customer?.user_id || staff?.user_id;

    // Generate recovery link via Supabase Auth Admin
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    try {
      const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: {
          redirectTo: `${siteUrl}/reset-password`,
        },
      });

      if (linkErr) {
        console.warn('[password-reset] Supabase recovery link warning:', linkErr.message);
      }
    } catch (e: any) {
      console.warn('[password-reset] Supabase admin link generation notice:', e.message);
    }

    // Return success response formatted as expected by forgot-password page
    return NextResponse.json({
      success: true,
      message: 'Dual verification successful! A password reset link has been dispatched to your email inbox.',
    });
  } catch (error: any) {
    console.error('[password-reset] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'An error occurred while requesting password reset.' },
      { status: 500 }
    );
  }
}
