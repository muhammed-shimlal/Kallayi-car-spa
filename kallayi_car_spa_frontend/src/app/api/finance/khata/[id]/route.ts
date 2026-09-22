/**
 * KALLAYI CAR SPA & AUTO CARE - CUSTOMER KHATA HISTORY API
 * Next.js 16 Route Handler: GET /api/finance/khata/[id]
 * Returns full transaction ledger history for a specific customer.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const cleanId = String(id || '').trim();

    if (!cleanId) {
      return NextResponse.json({ success: false, error: 'Customer ID is required.' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // 1. Resolve customer record by id or user_id
    const { data: customer } = await supabase
      .from('customers')
      .select('id, name, user_id, phone_number, outstanding_balance, credit_limit')
      .or(`id.eq.${cleanId},user_id.eq.${cleanId}`)
      .maybeSingle();

    const targetCustomerId = customer ? customer.id : cleanId;

    let customerName = customer?.name || 'Valued Customer';
    if ((customerName === 'Valued Customer' || customerName === 'Guest Customer') && customer?.user_id) {
      try {
        const { data: authUser } = await supabase.auth.admin.getUserById(customer.user_id);
        if (authUser?.user?.user_metadata) {
          const meta = authUser.user.user_metadata;
          const fullName =
            meta.full_name ||
            meta.name ||
            `${meta.first_name || ''} ${meta.last_name || ''}`.trim();
          if (fullName) customerName = fullName;
        }
      } catch {
        // Fallback
      }
    }

    // 2. Fetch all ledger rows for this customer
    const { data: ledgers, error } = await supabase
      .from('khata_ledgers')
      .select(`
        *,
        booking:bookings!related_booking_id(
          id,
          status,
          time_slot,
          final_price,
          vehicle:customer_vehicles(plate_number, make, model),
          service_package:service_packages(name)
        )
      `)
      .eq('customer_id', targetCustomerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Khata History Error]:', error);
      return NextResponse.json({ success: true, history: [], ledgers: [], data: [] }, { status: 200 });
    }

    const list = ledgers || [];

    return NextResponse.json({
      success: true,
      customer: customer ? { ...customer, name: customerName } : null,
      history: list,
      ledgers: list,
      data: list,
      results: list, // Backward compatibility
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    console.error('[Khata History Exception]:', err);
    return NextResponse.json({ success: true, history: [], ledgers: [], data: [] }, { status: 200 });
  }
}
