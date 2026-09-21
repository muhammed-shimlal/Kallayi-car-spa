/**
 * KALLAYI CAR SPA & AUTO CARE - DIGITAL KHATA ACCOUNTS & MANUAL CHARGE API
 * Next.js 16 Route Handler: GET & POST /api/finance/khata
 * Lists active credit ledger accounts and records manual khata charges.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseServer';
import { calculateKhataBalance } from '@/lib/logic/finance';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);

    const filterOnlyOutstanding = searchParams.get('all') !== 'true';

    // 1. Fetch Customers
    let query = supabase.from('customers').select('*');
    if (filterOnlyOutstanding) {
      query = query.gt('outstanding_balance', 0);
    }
    query = query.order('outstanding_balance', { ascending: false });

    const { data: customers, error: custErr } = await query;

    if (custErr) {
      return NextResponse.json(
        { success: false, error: `Error fetching customers: ${custErr.message}` },
        { status: 500 }
      );
    }

    const rawCustomers = (customers || []) as any[];

    // 2. Fetch User metadata and vehicle info for each customer
    const khataCustomers = await Promise.all(
      rawCustomers.map(async (c) => {
        let name = (c.name && c.name !== 'Guest Customer') ? c.name : '';
        if (!name && c.user_id) {
          try {
            const { data: authUser } = await supabase.auth.admin.getUserById(c.user_id);
            if (authUser?.user?.user_metadata) {
              const meta = authUser.user.user_metadata;
              const fullName =
                meta.full_name ||
                meta.name ||
                `${meta.first_name || ''} ${meta.last_name || ''}`.trim();
              if (fullName) name = fullName;
            }
          } catch {
            // Keep fallback
          }
        }
        if (!name) {
          name = c.name || 'Walk-In Guest';
        }

        const { data: vehicles } = c.user_id
          ? await supabase
              .from('customer_vehicles')
              .select('plate_number, make, model')
              .eq('user_id', c.user_id)
              .limit(1)
          : { data: [] };

        const primaryVehicle = vehicles && vehicles.length > 0 ? vehicles[0] : null;

        return {
          id: c.id,
          user_id: c.user_id,
          name,
          phone_number: c.phone_number || '',
          address: c.address || '',
          outstanding_balance: Number(c.outstanding_balance || 0),
          credit_limit: Number(c.credit_limit || 5000),
          vehicle_plate: primaryVehicle?.plate_number || 'N/A',
          vehicle_model: primaryVehicle ? `${primaryVehicle.make} ${primaryVehicle.model}` : '',
        };
      })
    );

    // 3. Fetch Recent Ledger Entries
    const { data: ledgers } = await supabase
      .from('khata_ledgers')
      .select(`
        *,
        customer:customers(*)
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    const totalOutstanding = khataCustomers.reduce(
      (sum, item) => sum + Number(item.outstanding_balance || 0),
      0
    );

    return NextResponse.json({
      success: true,
      total_outstanding: Math.round(totalOutstanding * 100) / 100,
      count: khataCustomers.length,
      customers: khataCustomers,
      results: khataCustomers, // Backward compatibility with Django paginator
      recent_ledgers: ledgers || [],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await request.json();

    const {
      customer_id,
      amount,
      description = 'Manual Khata Credit Charge',
      related_booking_id = null,
      number_plate_image = null,
    } = body;

    if (!customer_id) {
      return NextResponse.json(
        { success: false, error: 'customer_id is required.' },
        { status: 400 }
      );
    }

    const numericAmount = parseFloat(String(amount));
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Charge amount must be a positive number.' },
        { status: 400 }
      );
    }

    // Fetch customer
    const { data: customer, error: custErr } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customer_id)
      .single();

    if (custErr || !customer) {
      return NextResponse.json(
        { success: false, error: 'Customer not found.' },
        { status: 404 }
      );
    }

    // Evaluate Credit Limit using pure logic
    const khataCalc = calculateKhataBalance(
      customer.outstanding_balance,
      customer.credit_limit,
      'CHARGE',
      numericAmount
    );

    if (khataCalc.isCreditLimitExceeded) {
      return NextResponse.json(
        {
          success: false,
          error: `Khata credit limit of ₹${customer.credit_limit} exceeded. Current balance: ₹${customer.outstanding_balance}, Attempted charge: ₹${numericAmount}. Maximum available credit: ₹${khataCalc.availableCredit}.`,
        },
        { status: 400 }
      );
    }

    // Insert into Khata Ledger
    const { data: newLedger, error: ledgerErr } = await supabase
      .from('khata_ledgers')
      .insert({
        customer_id: customer.id,
        amount: numericAmount,
        transaction_type: 'CHARGE',
        description,
        related_booking_id: related_booking_id ? parseInt(String(related_booking_id), 10) : null,
        number_plate_image: number_plate_image || null,
      })
      .select('*')
      .single();

    if (ledgerErr || !newLedger) {
      return NextResponse.json(
        { success: false, error: `Failed to record khata ledger: ${ledgerErr?.message}` },
        { status: 500 }
      );
    }

    // Update Customer Balance
    await supabase
      .from('customers')
      .update({
        outstanding_balance: khataCalc.newBalance,
      })
      .eq('id', customer.id);

    return NextResponse.json({
      success: true,
      message: `Khata charge of ₹${numericAmount.toFixed(2)} applied successfully.`,
      data: {
        ledger: newLedger,
        new_balance: khataCalc.newBalance,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
