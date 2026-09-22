/**
 * KALLAYI CAR SPA & AUTO CARE - CRM CUSTOMERS API ROUTE
 * Next.js 16 Route Handler: GET /api/crm/customers
 * Returns customer list with latest visit, vehicle info, payment breakdown & credit balances.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || searchParams.get('q') || '';
    const filterCredit = searchParams.get('credit_only') === 'true';

    let query = supabase
      .from('customers')
      .select(`
        id,
        user_id,
        name,
        phone_number,
        outstanding_balance,
        created_at
      `)
      .order('outstanding_balance', { ascending: false });

    if (search.trim()) {
      const clean = search.trim();
      query = query.or(`name.ilike.%${clean}%,phone_number.ilike.%${clean}%`);
    }

    if (filterCredit) {
      query = query.gt('outstanding_balance', 0);
    }

    const { data: customers, error } = await query.limit(100);

    if (error) {
      console.error('[CRM Customers API Query Error]:', error);
      return NextResponse.json({ success: false, customers: [] }, { status: 500 });
    }

    const customerIds = (customers || []).map((c) => c.id);

    // Fetch latest completed booking and invoice for each customer
    let customerBookings: Record<string, any> = {};
    if (customerIds.length > 0) {
      const { data: recentBookings } = await supabase
        .from('bookings')
        .select(`
          id,
          customer_id,
          status,
          created_at,
          final_price,
          base_price,
          vehicle:customer_vehicles(make, model, plate_number),
          service_package:service_packages(name),
          invoice:invoices(id, amount, payment_method, split_cash, split_online, split_khata, is_paid)
        `)
        .in('customer_id', customerIds)
        .order('created_at', { ascending: false });

      if (recentBookings) {
        for (const b of recentBookings) {
          if (!customerBookings[b.customer_id]) {
            const inv = Array.isArray(b.invoice) ? b.invoice[0] : (b.invoice || null);
            const price = Number(b.final_price || b.base_price || 0);
            const splitCash = Number(inv?.split_cash || 0);
            const splitOnline = Number(inv?.split_online || 0);
            const splitKhata = Number(inv?.split_khata || 0);
            const totalAmount = Number(inv?.amount ?? price);

            const rawMethod = String(inv?.payment_method || '').toUpperCase().trim();
            let paymentMethod = 'CASH';

            if (splitKhata > 0 && splitCash === 0 && splitOnline === 0) {
              paymentMethod = 'CREDIT';
            } else if (splitKhata > 0) {
              paymentMethod = 'SPLIT';
            } else if (rawMethod === 'ONLINE' || rawMethod === 'UPI' || (splitOnline > 0 && splitCash === 0)) {
              paymentMethod = 'UPI';
            } else if (rawMethod === 'SPLIT' || (splitCash > 0 && splitOnline > 0)) {
              paymentMethod = 'SPLIT';
            } else if (rawMethod === 'CARD') {
              paymentMethod = 'UPI';
            } else {
              paymentMethod = 'CASH';
            }

            customerBookings[b.customer_id] = {
              booking_id: b.id,
              date: b.created_at,
              service: b.service_package?.name || 'Wash Service',
              plate_number: b.vehicle?.plate_number || 'N/A',
              vehicle_model: b.vehicle ? `${b.vehicle.make || ''} ${b.vehicle.model || ''}`.trim() : 'Vehicle',
              total_amount: totalAmount,
              payment_method: paymentMethod,
              split_cash: splitCash,
              split_online: splitOnline,
              split_khata: splitKhata,
            };
          }
        }
      }
    }

    const formattedCustomers = (customers || []).map((c) => {
      const latest = customerBookings[c.id] || null;
      return {
        id: c.id,
        name: c.name || 'Valued Customer',
        phone_number: c.phone_number || '',
        outstanding_balance: Number(c.outstanding_balance || 0),
        created_at: c.created_at,
        vehicles: (c as any).vehicles || [],
        latest_visit: latest,
      };
    });

    return NextResponse.json({
      success: true,
      customers: formattedCustomers,
      total: formattedCustomers.length,
      credit_customers_count: formattedCustomers.filter((c) => c.outstanding_balance > 0).length,
    });
  } catch (err: unknown) {
    console.error('[CRM Customers API Exception]:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
