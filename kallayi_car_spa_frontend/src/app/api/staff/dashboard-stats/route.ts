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

    // Fallback batch resolution for any bookings where vehicle is null
    const missingVehicleIds = bookingsList
      .filter((b: any) => !b.vehicle && b.vehicle_id)
      .map((b: any) => b.vehicle_id);

    const vehicleFallbackMap = new Map();
    if (missingVehicleIds.length > 0) {
      const { data: vFallback } = await supabase
        .from('customer_vehicles')
        .select('*')
        .in('id', missingVehicleIds);
      (vFallback || []).forEach((v: any) => vehicleFallbackMap.set(v.id, v));
    }

    const completedVehicles = completedBookings.map((b: any) => {
      // Strictly use final_price (the counter discounted collected amount)
      const finalPrice = Number(b.final_price ?? b.service_package?.price ?? b.base_price ?? 0);
      totalRevenueToday += finalPrice;

      // Commission strictly computed on final_price
      const commissionEarned = Math.round((finalPrice * (commissionRate / 100)) * 100) / 100;
      laborCostCommission += commissionEarned;

      const v = b.vehicle || vehicleFallbackMap.get(b.vehicle_id);
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

    // 6. Calculate Cash in Hand (Customer cash collected minus staff handovers)
    // Includes cash physically collected by this staff member
    const { data: allCollectedInvoices } = await supabase
      .from('invoices')
      .select('id, amount, final_price, payment_method, split_cash, is_paid, cash_collected_by_staff_id, collector_type')
      .in('cash_collected_by_staff_id', staffIds)
      .eq('is_paid', true);

    let totalCashCollected = 0;
    (allCollectedInvoices || []).forEach((inv: any) => {
      // For staff members, any cash invoice assigned to them as collector counts as cash collected
      if (staffProfile?.role !== 'ADMIN' || inv.collector_type !== 'ADMIN') {
        if (inv.payment_method === 'CASH') {
          totalCashCollected += Number(inv.final_price ?? inv.amount ?? 0);
        } else if (inv.payment_method === 'SPLIT' && inv.split_cash) {
          totalCashCollected += Number(inv.split_cash);
        }
      }
    });

    // Deduct all staff cash handovers submitted to till/admin
    const { data: handovers, error: hErr } = await supabase
      .from('staff_cash_handovers')
      .select('amount')
      .in('staff_id', staffIds);

    let totalHandedOver = 0;
    if (!hErr && handovers) {
      totalHandedOver = handovers.reduce((sum: number, h: any) => sum + Number(h.amount || 0), 0);
    } else {
      const { data: expHandovers } = await supabase
        .from('general_expenses')
        .select('amount')
        .in('staff_id', staffIds)
        .ilike('description', '%[STAFF_CASH_HANDOVER%');
      totalHandedOver = (expHandovers || []).reduce((sum: number, h: any) => sum + Number(h.amount || 0), 0);
    }

    const cashInHand = Math.max(0, Math.round((totalCashCollected - totalHandedOver) * 100) / 100);

    // 7. Calculate Unsettled Staff Advances (Borrowings owed back to shop)
    let totalUnsettledAdvances = 0;
    const { data: advances, error: advErr } = await supabase
      .from('staff_advances')
      .select('amount')
      .in('staff_id', staffIds)
      .eq('is_settled', false);

    if (!advErr && advances) {
      totalUnsettledAdvances = advances.reduce((sum: number, a: any) => sum + Number(a.amount || 0), 0);
    } else {
      const { data: expAdvances } = await supabase
        .from('general_expenses')
        .select('amount')
        .in('staff_id', staffIds)
        .ilike('description', '%[STAFF_ADVANCE:UNSETTLED%');
      totalUnsettledAdvances = (expAdvances || []).reduce((sum: number, a: any) => sum + Number(a.amount || 0), 0);
    }

    // Receivable from staff (Cash in Hand to submit + pending advance balance)
    const receivableFromStaff = Math.round((cashInHand + totalUnsettledAdvances) * 100) / 100;

    // 8. Calculate Payable to Staff (Shop owes staff: Unsettled commission + wage retention + today's commission)
    let unsettledPayrollSum = 0;
    let hasTodayPayrollRow = false;

    const { data: unsettledPayroll } = await supabase
      .from('payroll_entries')
      .select('*')
      .or(`staff_id.in.(${staffIds.join(',')}),staff_user_id.in.(${staffIds.join(',')})`)
      .eq('is_settled', false);

    (unsettledPayroll || []).forEach((p: any) => {
      const pDate = p.date ? String(p.date).split('T')[0] : '';
      if (pDate === todayStr) {
        hasTodayPayrollRow = true;
      }
      const netPayable = p.net_payable !== undefined && p.net_payable !== null
        ? Number(p.net_payable)
        : Number(p.commission_earned || p.commission_amount || 0) + Number(p.base_wage || 0) + Number(p.tips_earned || 0) - Number(p.advance_deducted || 0);

      unsettledPayrollSum += Math.max(0, netPayable);
    });

    // Previous retained wage balance (from staff profile)
    const retainedBalance = Math.max(0, Number(staffProfile?.retained_balance || 0));

    // If today's payroll entry hasn't been generated yet, include today's live earned commission
    const todayUnrecordedCommission = hasTodayPayrollRow ? 0 : laborCostCommission;

    // Pending approved expense reimbursements owed to staff
    const { data: pendingReimbursementsData } = await supabase
      .from('general_expenses')
      .select('amount')
      .in('staff_id', staffIds)
      .eq('expense_type', 'STAFF')
      .eq('status', 'APPROVED');

    const totalReimbursements = (pendingReimbursementsData || []).reduce(
      (sum: number, r: any) => sum + Number(r.amount || 0),
      0
    );

    const payableToStaff = Math.max(
      0,
      Math.round((unsettledPayrollSum + retainedBalance + todayUnrecordedCommission + totalReimbursements) * 100) / 100
    );

    const financialSummary = {
      payableToStaff,
      receivableFromStaff,
      currency: 'INR',
      details: {
        todayCommission: Math.round(laborCostCommission * 100) / 100,
        unsettledPayroll: Math.round(unsettledPayrollSum * 100) / 100,
        retainedWages: retainedBalance,
        cashInHand,
        pendingAdvances: totalUnsettledAdvances,
        reimbursements: totalReimbursements,
      },
    };

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
      payable_to_staff: payableToStaff,
      receivable_from_staff: receivableFromStaff,
      receivable_by_staff: payableToStaff, // What staff receives
      payable_by_staff: receivableFromStaff, // What staff submits
      cash_in_hand: cashInHand,
      financialSummary,
      financial_summary: financialSummary,
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
