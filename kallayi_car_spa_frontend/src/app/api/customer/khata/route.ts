/**
 * KALLAYI CAR SPA & AUTO CARE - CUSTOMER KHATA (CREDIT) SCOPED API
 * Next.js 16 Route Handler: GET /api/customer/khata
 * Strictly scoped to authenticated customer session to prevent cross-customer data leakage.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, getAuthUserFromRequest } from '@/lib/supabaseServer';
import { normalizePhone, getPhoneVariants } from '@/lib/phone';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const authUser = await getAuthUserFromRequest(request);

    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Authentication required to view your personal credit ledger.' },
        { status: 401 }
      );
    }

    // 1. Resolve customer record matching authenticated user
    let customer: any = null;

    // Check by user_id
    const { data: userCust } = await supabase
      .from('customers')
      .select('id, name, phone_number, outstanding_balance, credit_limit, loyalty_points')
      .eq('user_id', authUser.id)
      .maybeSingle();

    if (userCust) {
      customer = userCust;
    } else {
      // Fallback check by authenticated phone
      const userPhone = authUser.phone || authUser.user_metadata?.phone;
      if (userPhone) {
        const canonicalPhone = normalizePhone(userPhone);
        const { variants } = getPhoneVariants(canonicalPhone);
        const { data: phoneCust } = await supabase
          .from('customers')
          .select('id, name, phone_number, outstanding_balance, credit_limit, loyalty_points')
          .in('phone_number', variants)
          .limit(1)
          .maybeSingle();

        if (phoneCust) {
          customer = phoneCust;
        }
      }
    }

    if (!customer) {
      return NextResponse.json({
        success: true,
        customer: null,
        outstanding_balance: 0,
        credit_limit: 5000,
        total_credit: 0,
        total_settled: 0,
        transactions: [],
        history: [],
      });
    }

    // 2. Fetch all khata ledger entries strictly for this customer
    const { data: ledgers, error: ledgerErr } = await supabase
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
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false });

    if (ledgerErr) {
      console.error('[Customer Khata Ledger Error]:', ledgerErr);
      return NextResponse.json(
        { success: false, error: `Failed to load credit transactions: ${ledgerErr.message}` },
        { status: 500 }
      );
    }

    const rawList = ledgers || [];

    // 3. Format transactions with complete transparency
    const formattedTransactions = rawList.map((entry: any) => {
      const isSettlement = entry.transaction_type === 'SETTLEMENT';
      const bookingData = entry.booking;
      const vehicleData = bookingData?.vehicle;
      const serviceName = bookingData?.service_package?.name || entry.description || 'Car Spa Service';
      const plateNumber = vehicleData?.plate_number || entry.plate_number || 'N/A';
      const vehicleModel = vehicleData ? `${vehicleData.make} ${vehicleData.model}`.trim() : null;

      const dateStr = entry.date || (entry.created_at ? entry.created_at.split('T')[0] : new Date().toISOString().split('T')[0]);

      return {
        id: entry.id,
        raw_id: entry.id,
        date: dateStr,
        created_at: entry.created_at,
        service: serviceName,
        description: entry.description || serviceName,
        amount: Number(entry.amount || 0),
        transaction_type: entry.transaction_type,
        status: isSettlement ? 'PAID' : 'UNPAID',
        number_plate_image: entry.number_plate_image || null,
        plate_number: plateNumber,
        vehicle_model: vehicleModel,
        booking_id: entry.related_booking_id,
      };
    });

    // 4. Calculate totals
    const totalCredit = formattedTransactions
      .filter((t) => t.transaction_type === 'CHARGE')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalSettled = formattedTransactions
      .filter((t) => t.transaction_type === 'SETTLEMENT')
      .reduce((sum, t) => sum + t.amount, 0);

    const outstandingBalance = Number(
      customer.outstanding_balance !== undefined
        ? customer.outstanding_balance
        : Math.max(0, totalCredit - totalSettled)
    );

    return NextResponse.json({
      success: true,
      customer: {
        id: customer.id,
        name: customer.name,
        phone_number: customer.phone_number,
        outstanding_balance: outstandingBalance,
        credit_limit: Number(customer.credit_limit || 5000),
      },
      outstanding_balance: outstandingBalance,
      credit_limit: Number(customer.credit_limit || 5000),
      total_credit: totalCredit,
      total_settled: totalSettled,
      transactions: formattedTransactions,
      history: formattedTransactions,
      results: formattedTransactions, // For backwards compatibility
    });
  } catch (err: unknown) {
    console.error('[Customer Khata Exception]:', err);
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
