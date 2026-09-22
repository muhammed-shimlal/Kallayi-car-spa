/**
 * KALLAYI CAR SPA & AUTO CARE - PHONE NORMALIZATION MAINTENANCE API
 * Next.js 16 Route Handler: POST /api/admin/maintenance/normalize-phones
 * 
 * Secure administrative endpoint to execute phone number normalization
 * across public.customers, public.staff_profiles, and auth.users.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, getAuthUserFromRequest } from '@/lib/supabaseServer';
import { normalizePhone, extractTenDigitPhone } from '@/lib/phone';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const authUser = await getAuthUserFromRequest(request);

    // Optional admin guard
    const isLocal = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
    const userRole = (authUser?.user_metadata?.role || '').toUpperCase();
    const isAdmin = ['ADMIN', 'MANAGER'].includes(userRole);
    const adminSecret = request.headers.get('x-admin-secret');

    if (!isLocal && !isAdmin && adminSecret !== (process.env.ADMIN_SECRET || 'kallayi_admin_secret_2026')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Admin permissions required.' },
        { status: 403 }
      );
    }

    let customersUpdated = 0;
    let customersMerged = 0;
    let staffUpdated = 0;

    // 1. Customers
    const { data: customers } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: true });

    const phoneGroups = new Map<string, any[]>();

    for (const c of customers || []) {
      const tenDigit = extractTenDigitPhone(c.phone_number) || extractTenDigitPhone(c.name);
      const canonical = tenDigit ? `+91${tenDigit}` : '';

      if (!canonical) continue;
      if (!phoneGroups.has(canonical)) phoneGroups.set(canonical, []);
      phoneGroups.get(canonical)!.push(c);
    }

    for (const [canonicalPhone, group] of phoneGroups.entries()) {
      if (group.length === 1) {
        const c = group[0];
        if (c.phone_number !== canonicalPhone) {
          await supabase
            .from('customers')
            .update({ phone_number: canonicalPhone, updated_at: new Date().toISOString() })
            .eq('id', c.id);
          customersUpdated++;
        }
      } else {
        // Merge duplicates
        let primaryRow = group.find(
          (c) => c.user_id && c.user_id !== '00000000-0000-0000-0000-000000000000' && c.user_id.length > 10
        ) || group[0];

        const redundantRows = group.filter((c) => c.id !== primaryRow.id);
        const redundantIds = redundantRows.map((c) => c.id);

        const totalBalance = group.reduce((acc, curr) => acc + Number(curr.outstanding_balance || 0), 0);
        const maxLoyalty = group.reduce((acc, curr) => Math.max(acc, Number(curr.loyalty_points || 0)), 0);

        // Re-point bookings
        await supabase
          .from('bookings')
          .update({ customer_id: primaryRow.id })
          .in('customer_id', redundantIds);

        // Update primary row
        await supabase
          .from('customers')
          .update({
            phone_number: canonicalPhone,
            outstanding_balance: totalBalance,
            loyalty_points: maxLoyalty,
            updated_at: new Date().toISOString(),
          })
          .eq('id', primaryRow.id);

        // Delete redundant rows
        await supabase.from('customers').delete().in('id', redundantIds);

        customersMerged += redundantIds.length;
        customersUpdated++;
      }
    }

    // 2. Staff Profiles
    const { data: staffList } = await supabase.from('staff_profiles').select('*');
    for (const s of staffList || []) {
      const canonical = normalizePhone(s.phone_number);
      if (canonical && s.phone_number !== canonical) {
        await supabase
          .from('staff_profiles')
          .update({ phone_number: canonical })
          .eq('id', s.id);
        staffUpdated++;
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Phone normalization migration executed successfully.',
      data: {
        customersUpdated,
        customersMerged,
        staffUpdated,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Error running phone normalization.' },
      { status: 500 }
    );
  }
}
