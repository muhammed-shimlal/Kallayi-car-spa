/**
 * KALLAYI CAR SPA & AUTO CARE - DASHBOARD OVERVIEW UNIFIED API
 * Next.js 16 Route Handler: GET /api/dashboard/overview
 * Delivers 7-day revenue charts, live queue bookings, today's completed wash feed, and real-time financial KPIs.
 */

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseServer';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const todayStart = `${todayStr}T00:00:00.000Z`;
    const todayEnd = `${todayStr}T23:59:59.999Z`;

    // 1. Calculate 7-Day Revenue Trend
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString();

    const { data: weekInvoices } = await supabase
      .from('invoices')
      .select('amount, created_at, is_paid')
      .eq('is_paid', true)
      .gte('created_at', sevenDaysAgoStr);

    const revenueByDayMap = new Map<string, number>();
    const chartData = [];

    // Initialize 7 days in order
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dayIso = d.toISOString().split('T')[0];
      revenueByDayMap.set(dayIso, 0);
    }

    for (const inv of weekInvoices || []) {
      if (inv.created_at) {
        const invDay = inv.created_at.split('T')[0];
        if (revenueByDayMap.has(invDay)) {
          const current = revenueByDayMap.get(invDay) || 0;
          revenueByDayMap.set(invDay, current + Number(inv.amount || 0));
        }
      }
    }

    for (const [dayIso, val] of revenueByDayMap.entries()) {
      const d = new Date(`${dayIso}T00:00:00.000Z`);
      const dayName = DAY_NAMES[d.getUTCDay()];
      const formattedVal = Math.round(val * 100) / 100;
      chartData.push({
        name: dayName,
        date: dayIso,
        day: dayName,
        value: formattedVal,
        revenue: formattedVal,
        total: formattedVal,
        amount: formattedVal,
      });
    }

    // 2. Fetch Today's Completed Washed Vehicles
    const { data: todayBookings } = await supabase
      .from('bookings')
      .select(`
        *,
        customer:customers(*),
        vehicle:customer_vehicles(*),
        service_package:service_packages(*),
        technician_profile:staff_profiles!technician_id(*)
      `)
      .gte('time_slot', todayStart)
      .lte('time_slot', todayEnd)
      .order('time_slot', { ascending: false });

    const rawTodayBookings = (todayBookings || []) as any[];

    const todayWashedVehicles = await Promise.all(
      rawTodayBookings.map(async (b) => {
        const customer = b.customer;
        const vehicle = b.vehicle;
        const pkg = b.service_package;
        const techProfile = b.technician_profile;

        let customerName = (customer?.name && customer.name !== 'Guest Customer') ? customer.name : '';
        if (!customerName && customer?.user_id) {
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
        if (!customerName) {
          customerName = customer?.name || 'Walk-In Customer';
        }

        let technicianName = 'Unassigned';
        if (techProfile?.user_id) {
          try {
            const { data: techUser } = await supabase.auth.admin.getUserById(techProfile.user_id);
            if (techUser?.user?.user_metadata) {
              const meta = techUser.user.user_metadata;
              const tName =
                meta.full_name ||
                meta.name ||
                `${meta.first_name || ''} ${meta.last_name || ''}`.trim();
              if (tName) technicianName = tName;
            }
          } catch {
            // Fallback
          }
        }

        const dateObj = new Date(b.time_slot || b.created_at);
        const timeFormatted = dateObj.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });

        const effectivePrice = Number(b.final_price || b.base_price || pkg?.price || 0);

        return {
          id: b.id,
          booking_id: b.id,
          date: timeFormatted,
          time: timeFormatted,
          is_today: true,
          plate_number: vehicle?.plate_number || 'UNKNOWN',
          vehicle_plate: vehicle?.plate_number || 'UNKNOWN',
          vehicle_model: vehicle ? `${vehicle.make} ${vehicle.model}` : 'Standard Car',
          customer_name: customerName,
          customer_phone: customer?.phone_number || '',
          service_package_name: pkg?.name || 'Car Spa Wash',
          technician_name: technicianName,
          price: effectivePrice,
          invoice_amount: effectivePrice,
          status: b.status,
          invoice_status: b.status === 'COMPLETED' ? 'PAID' : 'PENDING',
        };
      })
    );

    // 3. Fetch Active Queue Bookings (Recent Bookings for Kanban/List)
    const { data: queueBookings } = await supabase
      .from('bookings')
      .select(`
        *,
        customer:customers(*),
        vehicle:customer_vehicles(*),
        service_package:service_packages(*)
      `)
      .in('status', ['WAITING', 'IN_BAY_1', 'IN_BAY_2', 'DETAILING', 'READY', 'IN_PROGRESS', 'CONFIRMED', 'COMPLETED'])
      .order('time_slot', { ascending: false })
      .limit(30);

    const recentBookings = ((queueBookings || []) as any[]).map((b) => ({
      id: b.id,
      customer_name: b.customer?.name || (b.customer?.phone_number ? `Customer (${b.customer.phone_number.slice(-4)})` : 'Walk-In'),
      customer_phone: b.customer?.phone_number || '',
      vehicle_plate: b.vehicle?.plate_number || 'UNKNOWN',
      vehicle_type: b.vehicle?.vehicle_type || 'CAR',
      service_package_name: b.service_package?.name || 'Standard Wash',
      status: b.status,
      bay_assignment: b.bay_assignment,
      time_slot: b.time_slot,
      base_price: Number(b.base_price || 0),
      final_price: Number(b.final_price || 0),
    }));

    // 4. Aggregate KPIs
    // Today's Revenue & Khata credit from invoices
    const { data: todayInvoices } = await supabase
      .from('invoices')
      .select('*')
      .gte('created_at', todayStart)
      .lte('created_at', todayEnd);

    let todayRevenue = 0;
    let todayCredit = 0;
    for (const inv of todayInvoices || []) {
      if (inv.is_paid) {
        todayRevenue += Number(inv.amount || 0);
      }
      todayCredit += Number(inv.split_khata || 0);
    }

    // Today's General Expenses
    const { data: todayExpList } = await supabase
      .from('general_expenses')
      .select('amount')
      .eq('date', todayStr)
      .neq('status', 'CANCELLED');

    const todayExpenses = (todayExpList || []).reduce(
      (sum, e) => sum + Number(e.amount || 0),
      0
    );

    // Today's Collection Bank Deposit
    const { data: todayBankDepositRecord } = await supabase
      .from('collection_banks')
      .select('amount')
      .eq('date', todayStr)
      .maybeSingle();

    const todayBankDeposit = Number(todayBankDepositRecord?.amount || 0);

    const completedTodayCount = todayWashedVehicles.filter((v) => v.status === 'COMPLETED').length;
    const todayWashedCount = completedTodayCount > 0 ? completedTodayCount : todayWashedVehicles.length;

    const netProfitToday = Math.max(0, todayRevenue - todayExpenses);

    const kpiSummary = {
      revenue_today: Math.round(todayRevenue * 100) / 100,
      today_revenue: Math.round(todayRevenue * 100) / 100,
      net_profit_today: Math.round(netProfitToday * 100) / 100,
      today_washed_count: todayWashedCount,
      general_expenses_today: Math.round(todayExpenses * 100) / 100,
      today_collection_bank: Math.round(todayBankDeposit * 100) / 100,
      today_total_credit: Math.round(todayCredit * 100) / 100,
      labor_cost_today: 0,
      pre_booking_revenue: 0,
    };

    return NextResponse.json({
      success: true,
      chartData,
      todayWashedVehicles,
      todayWashedCount,
      recentBookings,
      kpiData: kpiSummary,
      results: todayWashedVehicles,
      count: todayWashedVehicles.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
