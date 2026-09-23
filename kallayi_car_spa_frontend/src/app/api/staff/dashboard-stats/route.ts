/**
 * KALLAYI CAR SPA & AUTO CARE - STAFF DASHBOARD STATS API ROUTE
 * Next.js 16 Route Handler: GET /api/staff/dashboard-stats
 * Returns today's operational analytics, revenue, commission based strictly on final_price,
 * physical cash in hand awaiting reconciliation, and completed vehicle dossiers.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, getAuthUserFromRequest } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();

    // 1. Authenticate Request
    const authUser = await getAuthUserFromRequest(request);
    if (!authUser || !authUser.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required.' },
        { status: 401 }
      );
    }

    // 2. Fetch Staff Profile to get commission rules & role
    const { data: staffProfile } = await supabase
      .from('staff_profiles')
      .select('*')
      .or(`user_id.eq.${authUser.id},id.eq.${authUser.id}`)
      .maybeSingle();

    const commissionRate = Number(staffProfile?.commission_rate || 40); // default 40% if not set
    const staffIds = [authUser.id, staffProfile?.id, staffProfile?.user_id].filter(Boolean);

    // 3. Resolve Today's Window in IST
    const istFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const todayStr = istFormatter.format(new Date());
    const istStartUtc = new Date(`${todayStr}T00:00:00+05:30`).toISOString();
    const istEndUtc = new Date(`${todayStr}T23:59:59.999+05:30`).toISOString();

    // 4. Query Today's Bookings
    const { data: allTodayBookings, error: bErr } = await supabase
      .from('bookings')
      .select(`
        *,
        customer:customers(id, name, phone_number),
        vehicle:customer_vehicles(id, plate_number, registration_number, make, model, vehicle_type),
        service_package:service_packages(id, name, price)
      `)
      .gte('created_at', istStartUtc)
      .lte('created_at', istEndUtc)
      .order('created_at', { ascending: false });

    if (bErr) {
      console.error('[DashboardStats] Booking query error:', bErr);
    }

    const bookingsList = allTodayBookings || [];

    // Filter bookings belonging to this staff member (or all today if single operator)
    const myBookings = bookingsList.filter((b: any) => {
      if (!b.technician_id) return true; // Include unassigned queue items for context
      return staffIds.includes(b.technician_id);
    });

    const completedBookings = myBookings.filter((b: any) =>
      ['COMPLETED', 'READY', 'READY_FOR_PICKUP'].includes(b.status)
    );

    const inProgressBookings = myBookings.filter((b: any) =>
      ['IN_PROGRESS', 'IN_BAY_1', 'IN_BAY_2', 'DETAILING', 'WAITING'].includes(b.status)
    );

    const completedCount = completedBookings.length;
    const inProgressCount = inProgressBookings.length;

    // 5. Build completed list and compute total revenue & commission strictly based on final_price
    let totalRevenueToday = 0;
    let laborCostCommission = 0;

    const completedVehicles = completedBookings.map((b: any) => {
      // Strictly use final_price (the counter discounted collected amount)
      const finalPrice = Number(b.final_price ?? b.service_package?.price ?? b.base_price ?? 0);
      totalRevenueToday += finalPrice;

      // Commission strictly computed on final_price
      const commissionEarned = Math.round((finalPrice * (commissionRate / 100)) * 100) / 100;
      laborCostCommission += commissionEarned;

      const v = b.vehicle;
      const plate = v?.plate_number || v?.registration_number || 'N/A';
      const make = v?.make || '';
      const model = v?.model || 'Vehicle';
      const vehicleModel = `${make} ${model}`.trim() || 'Vehicle';
      const vehicleType = v?.vehicle_type || 'HATCHBACK';
      const pkgName = b.service_package?.name || 'Wash Service';

      const finishDate = b.end_time ? new Date(b.end_time) : new Date(b.created_at);
      const timeStr = finishDate.toLocaleTimeString('en-US', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });

      return {
        id: b.id,
        vehicle_number: plate,
        plate_number: plate,
        vehicle_model: vehicleModel,
        vehicle_type: vehicleType,
        service_package: pkgName,
        time: timeStr,
        final_price: finalPrice,
        commission_earned: commissionEarned,
      };
    });

    // 6. Calculate Cash in Hand awaiting reconciliation
    // Increment a staff member's cash_in_hand ONLY when:
    // payment_method == 'CASH' (or split cash) AND cash_collected_by_staff_id matches this staff member!
    // Cash collected at counter/admin directly goes to the shop register till and does not inflate staff balance.
    const { data: todayInvoices } = await supabase
      .from('invoices')
      .select('id, booking_id, amount, base_price, final_price, payment_method, split_cash, split_online, split_khata, is_paid, cash_collected_by_staff_id, collector_type')
      .gte('created_at', istStartUtc)
      .lte('created_at', istEndUtc);

    let cashInHand = 0;
    (todayInvoices || []).forEach((inv: any) => {
      if (inv.is_paid) {
        const collectorId = inv.cash_collected_by_staff_id;
        const isCollectedByThisStaff = collectorId && staffIds.includes(collectorId) && inv.collector_type !== 'ADMIN';

        if (isCollectedByThisStaff) {
          if (inv.payment_method === 'CASH') {
            cashInHand += Number(inv.final_price ?? inv.amount ?? 0);
          } else if (inv.payment_method === 'SPLIT' && inv.split_cash) {
            cashInHand += Number(inv.split_cash);
          }
        }
      }
    });

    // Deduct any handovers made by this staff today
    const { data: handovers } = await supabase
      .from('staff_cash_handovers')
      .select('amount')
      .in('staff_id', staffIds)
      .gte('created_at', istStartUtc);

    const totalHandedOver = (handovers || []).reduce((sum: number, h: any) => sum + Number(h.amount || 0), 0);
    cashInHand = Math.max(0, cashInHand - totalHandedOver);

    // 7. Calculate Unsettled Commission / Salary Balance (Receivable by Staff)
    let receivableByStaff = Math.round(laborCostCommission * 100) / 100;
    try {
      const { data: unsettledPayroll } = await supabase
        .from('payroll_entries')
        .select('commission_earned, base_wage')
        .in('staff_user_id', staffIds);

      if (unsettledPayroll && unsettledPayroll.length > 0) {
        const totalEarnings = unsettledPayroll.reduce(
          (sum: number, p: any) => sum + Number(p.commission_earned || 0) + Number(p.base_wage || 0),
          0
        );
        receivableByStaff = Math.max(receivableByStaff, Math.round(totalEarnings * 100) / 100);
      }
    } catch {
      // Fallback to today's commission
    }

    const payableByStaff = Math.round(cashInHand * 100) / 100;

    return NextResponse.json({
      success: true,
      cars_washed_today: {
        count: completedCount,
        list: completedVehicles,
      },
      cars_washed_count: completedCount,
      completed_vehicles: completedVehicles,
      total_revenue_today: Math.round(totalRevenueToday * 100) / 100,
      labor_cost_commission: Math.round(laborCostCommission * 100) / 100,
      receivable_by_staff: receivableByStaff,
      payable_by_staff: payableByStaff,
      cash_in_hand: payableByStaff,
      completed_count: completedCount,
      in_progress_count: inProgressCount,
    });
  } catch (err: any) {
    console.error('[DashboardStats] Unhandled error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
