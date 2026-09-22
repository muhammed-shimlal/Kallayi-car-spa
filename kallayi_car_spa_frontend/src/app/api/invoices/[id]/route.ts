/**
 * KALLAYI CAR SPA & AUTO CARE - INVOICE DETAILS API ROUTE
 * Next.js 16 Route Handler: GET /api/invoices/[id]
 * Fetches structured invoice details, joined booking relations, customer & vehicle data, and split payment breakdown.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, getAuthUserFromRequest } from '@/lib/supabaseServer';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUserFromRequest(request);
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Please log in to view invoice details.' },
        { status: 401 }
      );
    }

    const supabase = getSupabaseAdmin();
    const { id } = await context.params;

    if (!id || id === 'undefined' || id === 'null') {
      return NextResponse.json(
        { success: false, error: 'A valid invoice ID or booking ID is required.' },
        { status: 400 }
      );
    }

    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      return NextResponse.json(
        { success: false, error: 'Invoice ID must be a numeric integer.' },
        { status: 400 }
      );
    }

    // Query invoice with joined booking, customer, vehicle, and service package
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select(`
        *,
        booking:bookings(
          *,
          customer:customers(*),
          vehicle:customer_vehicles(*),
          service_package:service_packages(*)
        )
      `)
      .or(`id.eq.${numericId},booking_id.eq.${numericId}`)
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { success: false, error: `Database error: ${error.message}` },
        { status: 500 }
      );
    }

    if (!invoice) {
      return NextResponse.json(
        { success: false, error: `Invoice #${id} not found.` },
        { status: 404 }
      );
    }

    // Resolve relation objects
    const rawBooking = (invoice.booking as unknown) as {
      id: number;
      time_slot: string;
      end_time: string | null;
      created_at: string;
      customer?: {
        id: string;
        user_id: string;
        phone_number: string;
        address: string;
        outstanding_balance: number;
      } | null;
      vehicle?: {
        id: number;
        plate_number: string;
        make: string;
        model: string;
        color: string;
        vehicle_type: string;
      } | null;
      service_package?: {
        id: number;
        name: string;
        description: string;
        price: number;
        duration_minutes: number;
      } | null;
    } | null;

    const customer = rawBooking?.customer;
    const vehicle = rawBooking?.vehicle;
    const pkg = rawBooking?.service_package;

    // ─────────────────────────────────────────────────────────────────────────────
    // STRICT DATA ISOLATION (PREVENT INVOICE LEAKS)
    // ─────────────────────────────────────────────────────────────────────────────
    const userRole = (authUser.user_metadata?.role || '').toUpperCase();
    const isStaffOrAdmin = ['ADMIN', 'MANAGER', 'WASHER', 'TECHNICIAN', 'DRIVER'].includes(userRole);

    if (!isStaffOrAdmin) {
      const cleanAuthDigits = (authUser.phone || '').replace(/\D/g, '');
      const cleanCustDigits = (customer?.phone_number || '').replace(/\D/g, '');

      const isOwner = Boolean(
        (customer?.user_id && customer.user_id === authUser.id) ||
        (cleanAuthDigits && cleanCustDigits && cleanCustDigits.endsWith(cleanAuthDigits.slice(-10)))
      );

      if (!isOwner) {
        return NextResponse.json(
          { success: false, error: 'Forbidden. You do not have permission to view this invoice.' },
          { status: 403 }
        );
      }
    }

    // Resolve customer display name from customer record or Auth user metadata
    let customerName = ((customer as any)?.name && (customer as any)?.name !== 'Guest Customer') ? (customer as any).name : '';
    if (!customerName && customer?.user_id) {
      try {
        const { data: authUser } = await supabase.auth.admin.getUserById(customer.user_id);
        if (authUser?.user?.user_metadata) {
          const meta = authUser.user.user_metadata;
          const fullName = meta.full_name || meta.name || `${meta.first_name || ''} ${meta.last_name || ''}`.trim();
          if (fullName) {
            customerName = fullName;
          } else if (authUser.user.email) {
            customerName = authUser.user.email.split('@')[0];
          }
        }
      } catch {
        // Fallback to default
      }
    }
    if (!customerName) {
      customerName = (customer as any)?.name || 'Walk-In Guest';
    }

    const responsePayload = {
      id: invoice.id,
      invoice_number: `INV-${invoice.id.toString().padStart(4, '0')}`,
      booking_id: invoice.booking_id,
      created_at: invoice.created_at,
      amount: Number(invoice.amount || 0),
      base_price: Number(invoice.base_price || 0),
      final_price: Number(invoice.final_price || invoice.amount || 0),
      discount_amount: Number(invoice.discount_amount || 0),
      discount_percentage: Number(invoice.discount_percentage || 0),
      is_paid: invoice.is_paid,
      payment_method: invoice.payment_method || 'CASH',
      split_cash: Number(invoice.split_cash || 0),
      split_online: Number(invoice.split_online || 0),
      split_khata: Number(invoice.split_khata || 0),
      customer: {
        id: customer?.id ?? null,
        name: customerName,
        phone: customer?.phone_number ?? '',
        address: customer?.address ?? '',
        outstanding_balance: Number(customer?.outstanding_balance ?? 0),
      },
      vehicle: {
        id: vehicle?.id ?? null,
        plate_number: vehicle?.plate_number ?? 'Vehicle',
        make: vehicle?.make ?? 'Standard',
        model: vehicle?.model ?? 'Car',
        color: vehicle?.color ?? '',
        vehicle_type: vehicle?.vehicle_type ?? 'CAR',
      },
      service_package: {
        id: pkg?.id ?? null,
        name: pkg?.name ?? 'Car Spa Wash & Detailing',
        description: pkg?.description ?? '',
        price: Number(pkg?.price ?? invoice.base_price ?? 0),
        duration_minutes: pkg?.duration_minutes ?? 60,
      },
    };

    return NextResponse.json({
      success: true,
      data: responsePayload,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
