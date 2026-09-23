/**
 * KALLAYI CAR SPA & AUTO CARE - AI BUSINESS ADVISOR & ANALYTICS ROUTE
 * 
 * Provides aggregated business intelligence for Gemini AI to provide strategic
 * shop performance advice, peak hour analytics, package popularity, and revenue splits.
 * 
 * Protected by Bearer token authentication (AI_SECRET_KEY).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseServer';
import { verifyAiAuth } from '@/lib/security/aiAuth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export type AnalyticsPeriod = 'today' | 'this_week' | 'this_month';

/**
 * Calculates start and end timestamps in Indian Standard Time (UTC+05:30)
 */
function getPeriodDateRange(period: AnalyticsPeriod): { startIso: string; endIso: string; periodLabel: string } {
  // Current time in IST
  const now = new Date();
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffsetMs);

  const startIst = new Date(istNow);

  if (period === 'today') {
    startIst.setUTCHours(0, 0, 0, 0);
  } else if (period === 'this_week') {
    // Start of week (Monday)
    const day = startIst.getUTCDay();
    const diff = (day === 0 ? -6 : 1) - day;
    startIst.setUTCDate(startIst.getUTCDate() + diff);
    startIst.setUTCHours(0, 0, 0, 0);
  } else if (period === 'this_month') {
    // 1st of current month
    startIst.setUTCDate(1);
    startIst.setUTCHours(0, 0, 0, 0);
  }

  // Convert back to UTC ISO for database query
  const startUtc = new Date(startIst.getTime() - istOffsetMs);
  const endUtc = now;

  return {
    startIso: startUtc.toISOString(),
    endIso: endUtc.toISOString(),
    periodLabel: period,
  };
}

export async function GET(request: NextRequest) {
  // 1. Authenticate Request via Bearer Token
  const authResponse = verifyAiAuth(request);
  if (authResponse) {
    return authResponse;
  }

  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);

    const rawPeriod = searchParams.get('period')?.toLowerCase() || 'today';
    const period: AnalyticsPeriod = 
      rawPeriod === 'this_week' ? 'this_week' :
      rawPeriod === 'this_month' ? 'this_month' : 'today';

    const { startIso, endIso, periodLabel } = getPeriodDateRange(period);

    // 2. Fetch completed / active bookings in period
    const { data: rawBookings, error: bErr } = await supabase
      .from('bookings')
      .select(`
        id,
        status,
        created_at,
        time_slot,
        base_price,
        final_price,
        discount_amount,
        vehicle_id,
        service_package_id,
        vehicle:customer_vehicles(id, vehicle_type, plate_number, make, model),
        service_package:service_packages(id, name, price)
      `)
      .gte('created_at', startIso)
      .lte('created_at', endIso)
      .order('created_at', { ascending: false });

    if (bErr) {
      console.error('[AI Business Summary Bookings Error]:', bErr);
    }

    const bookings = (rawBookings || []) as any[];

    // 3. Vehicle Type Breakdown & Completed Washes
    const completedStatuses = ['COMPLETED', 'READY', 'READY_FOR_PICKUP', 'IN_BAY_1', 'IN_BAY_2', 'DETAILING', 'IN_PROGRESS'];
    const completedBookings = bookings.filter(b => completedStatuses.includes(b.status));
    const totalWashedCount = completedBookings.length > 0 ? completedBookings.length : bookings.length;

    const vehicleTypeCounts: Record<string, number> = {
      HATCHBACK: 0,
      SEDAN: 0,
      SUV: 0,
      LUXURY: 0,
      BIKE: 0,
      OTHER: 0,
    };

    // 4. Service Package Distribution
    const packageStats: Record<string, { count: number; totalRevenue: number }> = {};

    // 5. Hourly Distribution (Peak Hours in IST)
    const hourlyCounts: Record<string, number> = {};
    for (let h = 8; h <= 21; h++) {
      const hourStr = `${h.toString().padStart(2, '0')}:00`;
      hourlyCounts[hourStr] = 0;
    }

    for (const b of bookings) {
      // Vehicle type
      const v = Array.isArray(b.vehicle) ? b.vehicle[0] : b.vehicle;
      const rawType = (v?.vehicle_type || 'OTHER').toUpperCase();
      const normalizedType = 
        rawType.includes('HATCH') ? 'HATCHBACK' :
        rawType.includes('SEDAN') ? 'SEDAN' :
        rawType.includes('SUV') ? 'SUV' :
        rawType.includes('BIKE') || rawType.includes('TWO') ? 'BIKE' :
        rawType.includes('LUX') ? 'LUXURY' : 'OTHER';

      vehicleTypeCounts[normalizedType] = (vehicleTypeCounts[normalizedType] || 0) + 1;

      // Service package
      const pkg = Array.isArray(b.service_package) ? b.service_package[0] : b.service_package;
      const pkgName = pkg?.name || 'Standard Wash';
      const revenue = Number(b.final_price || b.base_price || 0);

      if (!packageStats[pkgName]) {
        packageStats[pkgName] = { count: 0, totalRevenue: 0 };
      }
      packageStats[pkgName].count += 1;
      packageStats[pkgName].totalRevenue += revenue;

      // Peak hour (IST conversion)
      const bTime = new Date(b.time_slot || b.created_at);
      const istHour = (bTime.getUTCHours() + 5 + (bTime.getUTCMinutes() >= 30 ? 1 : 0)) % 24;
      const hourBucket = `${istHour.toString().padStart(2, '0')}:00`;
      if (hourlyCounts[hourBucket] !== undefined) {
        hourlyCounts[hourBucket] += 1;
      } else {
        hourlyCounts[hourBucket] = 1;
      }
    }

    // 6. Invoiced Revenue Split (Cash, UPI/Online, Khata) in period
    const { data: rawInvoices, error: invErr } = await supabase
      .from('invoices')
      .select('id, amount, base_price, final_price, split_cash, split_online, split_khata, payment_method, is_paid')
      .gte('created_at', startIso)
      .lte('created_at', endIso);

    if (invErr) {
      console.error('[AI Business Summary Invoices Error]:', invErr);
    }

    const invoices = (rawInvoices || []) as any[];

    let totalRevenue = 0;
    let totalCash = 0;
    let totalOnline = 0;
    let totalKhataInvoiced = 0;

    for (const inv of invoices) {
      const invFinal = Number(inv.final_price || inv.amount || 0);
      const cash = Number(inv.split_cash || 0);
      const online = Number(inv.split_online || 0);
      const khata = Number(inv.split_khata || 0);

      if (cash > 0 || online > 0 || khata > 0) {
        totalCash += cash;
        totalOnline += online;
        totalKhataInvoiced += khata;
        totalRevenue += (cash + online + khata);
      } else {
        totalRevenue += invFinal;
        if (inv.payment_method === 'CASH') {
          totalCash += invFinal;
        } else if (inv.payment_method === 'CARD' || inv.payment_method === 'ONLINE') {
          totalOnline += invFinal;
        } else {
          totalCash += invFinal;
        }
      }
    }

    // 7. Active Khata Outstanding & Customer Counts (Global Live State)
    const { data: khataCustomers, error: custErr } = await supabase
      .from('customers')
      .select('id, outstanding_balance')
      .gt('outstanding_balance', 0);

    if (custErr) {
      console.error('[AI Business Summary Customers Error]:', custErr);
    }

    const activeKhataCustomerCount = (khataCustomers || []).length;
    const totalActiveKhataOutstanding = (khataCustomers || []).reduce(
      (sum, c) => sum + Number(c.outstanding_balance || 0),
      0
    );

    // Identify busiest rush hour
    let peakHour = '11:00';
    let peakCount = 0;
    for (const [hour, count] of Object.entries(hourlyCounts)) {
      if (count > peakCount) {
        peakCount = count;
        peakHour = hour;
      }
    }

    // Top selling service package
    const sortedPackages = Object.entries(packageStats).map(([name, data]) => ({
      packageName: name,
      unitsSold: data.count,
      totalRevenue: data.totalRevenue,
    })).sort((a, b) => b.unitsSold - a.unitsSold);

    return NextResponse.json({
      success: true,
      period: periodLabel,
      timeframe: {
        start: startIso,
        end: endIso,
      },
      kpiSummary: {
        totalVehiclesWashed: totalWashedCount,
        totalRevenueCollected: totalRevenue,
        averageTicketSize: totalWashedCount > 0 ? Math.round(totalRevenue / totalWashedCount) : 0,
        busiestHour: peakCount > 0 ? `${peakHour} IST (${peakCount} vehicles)` : 'Moderate flow',
      },
      revenueSplit: {
        total: totalRevenue,
        cash: totalCash,
        upiOnline: totalOnline,
        creditKhata: totalKhataInvoiced,
        cashPercentage: totalRevenue > 0 ? Math.round((totalCash / totalRevenue) * 100) : 0,
        upiPercentage: totalRevenue > 0 ? Math.round((totalOnline / totalRevenue) * 100) : 0,
        khataPercentage: totalRevenue > 0 ? Math.round((totalKhataInvoiced / totalRevenue) * 100) : 0,
      },
      creditHealth: {
        activeCreditCustomers: activeKhataCustomerCount,
        totalOutstandingReceivable: totalActiveKhataOutstanding,
      },
      vehicleBreakdown: vehicleTypeCounts,
      topServicePackages: sortedPackages,
      hourlyDistribution: hourlyCounts,
    });
  } catch (err: any) {
    console.error('[AI Business Summary Unhandled Error]:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error computing business analytics.' },
      { status: 500 }
    );
  }
}
