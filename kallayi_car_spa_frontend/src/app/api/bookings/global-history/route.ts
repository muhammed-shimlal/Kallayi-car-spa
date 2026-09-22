/**
 * KALLAYI CAR SPA & AUTO CARE - GLOBAL WASH HISTORY API ROUTE
 * Next.js 16 Route Handler: GET /api/bookings/global-history
 * Returns completed vehicle wash records and daily KPI metrics for CRM.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    const todayStr = new Date().toISOString().split('T')[0];
    const targetDate = (dateParam && dateParam.trim().length >= 8 && dateParam !== 'undefined') ? dateParam.trim() : todayStr;
    const isTargetToday = targetDate === todayStr;

    const supabase = getSupabaseAdmin();

    const startOfDay = `${targetDate}T00:00:00.000Z`;
    const endOfDay = `${targetDate}T23:59:59.999Z`;

    // Query completed bookings for this date with clean valid Supabase relations
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        id,
        status,
        time_slot,
        created_at,
        final_price,
        base_price,
        bay_assignment,
        technician_id,
        customer:customers(id, phone_number, name, outstanding_balance),
        vehicle:customer_vehicles(make, model, plate_number, vehicle_type),
        service_package:service_packages(name),
        invoice:invoices(id, amount, payment_method, split_cash, split_online, split_khata, is_paid)
      `)
      .eq('status', 'COMPLETED')
      .or(`time_slot.gte.${startOfDay},created_at.gte.${startOfDay}`)
      .or(`time_slot.lte.${endOfDay},created_at.lte.${endOfDay}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[global-history query error]:', error.message);
      return NextResponse.json({
        success: true,
        feed: [],
        stats: { target_date: targetDate, total_services: 0, total_revenue: 0 }
      }, { status: 200 });
    }

    const rawList = (data || []) as any[];

    const feed = rawList.map((b) => {
      const customer = b.customer;
      const vehicle = b.vehicle;
      const pkg = b.service_package;
      const inv = Array.isArray(b.invoice) ? b.invoice[0] : (b.invoice || null);

      const dateObj = new Date(b.time_slot || b.created_at);
      const timeFormatted = isNaN(dateObj.getTime())
        ? 'Today'
        : (isTargetToday
            ? dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
            : dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }));

      const effectivePrice = Number(b.final_price || b.base_price || 0);
      const splitCash = Number(inv?.split_cash || 0);
      const splitOnline = Number(inv?.split_online || 0);
      const splitKhata = Number(inv?.split_khata || 0);
      const totalAmount = Number(inv?.amount ?? effectivePrice);

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

      return {
        id: b.id,
        booking_id: b.id,
        date: timeFormatted,
        is_today: isTargetToday,
        plate_number: vehicle?.plate_number || 'Walk-In Vehicle',
        vehicle_model: vehicle ? `${vehicle.make || ''} ${vehicle.model || ''} (${vehicle.vehicle_type || 'CAR'})`.trim() : 'Standard Vehicle',
        customer_name: customer?.name || 'Walk-In Customer',
        customer_phone: customer?.phone_number || '',
        customer_outstanding_balance: Number(customer?.outstanding_balance || 0),
        service_package_name: pkg?.name || 'Wash Service',
        technician_name: 'Spa Technician',
        price: effectivePrice,
        status: b.status,
        payment_method: paymentMethod,
        split_cash: splitCash,
        split_online: splitOnline,
        split_khata: splitKhata,
        total_amount: totalAmount,
      };
    });

    const totalRevenue = feed.reduce((acc, item) => acc + item.price, 0);

    return NextResponse.json({
      success: true,
      feed,
      stats: {
        target_date: targetDate,
        total_services: feed.length,
        total_revenue: Math.round(totalRevenue * 100) / 100,
      },
    }, { status: 200 });
  } catch (err: unknown) {
    console.error('[global-history exception]:', err);
    return NextResponse.json({
      success: true,
      feed: [],
      stats: { target_date: new Date().toISOString().split('T')[0], total_services: 0, total_revenue: 0 }
    }, { status: 200 });
  }
}
