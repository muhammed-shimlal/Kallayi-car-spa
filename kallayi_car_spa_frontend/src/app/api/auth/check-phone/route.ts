/**
 * KALLAYI CAR SPA & AUTO CARE - PHONE AVAILABILITY & ACCOUNT TYPE CHECK API
 * Next.js 16 Route Handler: POST & GET /api/auth/check-phone
 * 
 * Determines whether a mobile number belongs to:
 * - An existing registered user (must log in)
 * - An unregistered walk-in profile (can claim account on signup)
 * - A completely new customer (fresh signup)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseServer';
import { getPhoneVariants, normalizePhone, isValidIndianMobile, extractTenDigitPhone } from '@/lib/phone';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function handleCheckPhone(rawPhone: string) {
  const trimmed = String(rawPhone || '').trim();
  if (!trimmed) {
    return NextResponse.json(
      { success: false, error: 'Mobile number is required.' },
      { status: 400 }
    );
  }

  const tenDigit = extractTenDigitPhone(trimmed);
  if (!tenDigit || !isValidIndianMobile(trimmed)) {
    return NextResponse.json(
      { success: false, error: 'Please enter a valid 10-digit Indian mobile number.' },
      { status: 400 }
    );
  }

  const canonical = normalizePhone(trimmed);
  const { variants } = getPhoneVariants(trimmed);
  const supabase = getSupabaseAdmin();

  // 1. Check in staff_profiles
  const { data: staffList } = await supabase
    .from('staff_profiles')
    .select('id, user_id, role, phone_number')
    .in('phone_number', variants);

  const matchedStaff = (staffList || []).find((s) => s.user_id && s.user_id.length > 10);
  if (matchedStaff) {
    return NextResponse.json({
      success: true,
      exists: true,
      isRegistered: true,
      isWalkin: false,
      isStaff: true,
      role: matchedStaff.role,
      phone: canonical,
      tenDigit,
      message: 'Staff account detected. Please proceed to login.',
    });
  }

  // 2. Check in customers table
  const { data: custList, error: custErr } = await supabase
    .from('customers')
    .select('id, user_id, name, phone_number, outstanding_balance, loyalty_points')
    .in('phone_number', variants);

  if (custErr) {
    return NextResponse.json(
      { success: false, error: custErr.message },
      { status: 500 }
    );
  }

  const matchedCustomers = custList || [];

  // Check for registered customer account
  const registeredCust = matchedCustomers.find(
    (c) => c.user_id && c.user_id !== '00000000-0000-0000-0000-000000000000' && c.user_id.length > 10
  );

  if (registeredCust) {
    return NextResponse.json({
      success: true,
      exists: true,
      isRegistered: true,
      isWalkin: false,
      isStaff: false,
      phone: canonical,
      tenDigit,
      name: registeredCust.name || '',
      message: 'Account already registered. Please log in with your password.',
    });
  }

  // Check for walk-in unlinked customer profile
  const walkinCust = matchedCustomers.find(
    (c) => !c.user_id || c.user_id === '00000000-0000-0000-0000-000000000000'
  );

  if (walkinCust) {
    return NextResponse.json({
      success: true,
      exists: true,
      isRegistered: false,
      isWalkin: true,
      isStaff: false,
      phone: canonical,
      tenDigit,
      customerId: walkinCust.id,
      name: (walkinCust.name && walkinCust.name !== 'Guest Customer') ? walkinCust.name : '',
      outstandingBalance: Number(walkinCust.outstanding_balance || 0),
      loyaltyPoints: Number(walkinCust.loyalty_points || 0),
      message: 'Walk-in customer record found. You can activate this account by completing signup.',
    });
  }

  // Brand new customer
  return NextResponse.json({
    success: true,
    exists: false,
    isRegistered: false,
    isWalkin: false,
    isStaff: false,
    phone: canonical,
    tenDigit,
    message: 'New customer phone number ready for signup.',
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const rawPhone = body.phone || body.phone_number || body.mobile || '';
    return await handleCheckPhone(rawPhone);
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Error checking phone number.' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawPhone = searchParams.get('phone') || searchParams.get('phone_number') || searchParams.get('q') || '';
    return await handleCheckPhone(rawPhone);
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Error checking phone number.' },
      { status: 500 }
    );
  }
}
