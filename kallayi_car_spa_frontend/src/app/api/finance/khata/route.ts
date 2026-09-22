/**
 * KALLAYI CAR SPA & AUTO CARE - DIGITAL KHATA FINANCE API ROUTE
 * Next.js 16 Route Handler: GET /api/finance/khata & POST /api/finance/khata
 * Manages customer credit accounts, ledger charge entries, and proof photo uploads.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseServer';
import { calculateKhataBalance } from '@/lib/logic/finance';
import { uploadFileToStorage } from '@/lib/storage';
import { normalizePhone, getPhoneVariants } from '@/lib/phone';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);

    const search = searchParams.get('search');
    const customerId = searchParams.get('customer_id');
    const hasBalance = searchParams.get('has_balance') === 'true';

    // 1. Fetch Customers with Khata balances
    let custQuery = supabase
      .from('customers')
      .select('*')
      .order('outstanding_balance', { ascending: false });

    if (customerId) {
      custQuery = custQuery.eq('id', customerId);
    }

    if (hasBalance) {
      custQuery = custQuery.gt('outstanding_balance', 0);
    }

    if (search) {
      custQuery = custQuery.or(`name.ilike.%${search}%,phone_number.ilike.%${search}%`);
    }

    const { data: customers, error: custErr } = await custQuery;

    if (custErr) {
      console.error('[Khata Fetch Customers Error]:', custErr);
      return NextResponse.json(
        { success: false, error: `Database error: ${custErr.message}` },
        { status: 500 }
      );
    }

    // 2. Fetch Recent Khata Ledgers with customer and booking relations
    let ledgerQuery = supabase
      .from('khata_ledgers')
      .select(`
        *,
        customer:customers(id, name, phone_number),
        booking:bookings!related_booking_id(
          id,
          final_price,
          status,
          time_slot,
          vehicle:customer_vehicles(plate_number, make, model),
          service_package:service_packages(name)
        )
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (customerId) {
      ledgerQuery = ledgerQuery.eq('customer_id', customerId);
    }

    const { data: ledgers, error: ledgerErr } = await ledgerQuery;

    if (ledgerErr) {
      console.error('[Khata Fetch Ledgers Error]:', ledgerErr);
    }

    // Calculate total outstanding credit and enrich customer records
    const rawCustomers = customers || [];
    const allLedgers = ledgers || [];

    const enrichedCustomers = rawCustomers.map((cust) => {
      const custLedgers = allLedgers.filter((l) => l.customer_id === cust.id);
      const latestProofEntry = custLedgers.find((l) => l.number_plate_image);
      const latestProofPhoto = latestProofEntry ? latestProofEntry.number_plate_image : null;

      const plateSet = new Set<string>();
      custLedgers.forEach((l: any) => {
        const plate = l.booking?.vehicle?.plate_number || l.plate_number;
        if (plate) plateSet.add(plate);
      });
      const vehiclePlates = Array.from(plateSet);
      const vehicleCount = vehiclePlates.length || (cust as any).vehicle_count || (cust as any).vehicles_count || (custLedgers.length > 0 ? 1 : 0);

      return {
        ...cust,
        latest_proof_photo: latestProofPhoto,
        vehicle_plates: vehiclePlates,
        vehicle_count: vehicleCount,
        recent_ledger_count: custLedgers.length,
      };
    });

    const totalOutstanding = enrichedCustomers.reduce(
      (acc, curr) => acc + Number(curr.outstanding_balance || 0),
      0
    );

    return NextResponse.json({
      success: true,
      total_outstanding: Math.round(totalOutstanding * 100) / 100,
      count: enrichedCustomers.length,
      customers: enrichedCustomers,
      results: enrichedCustomers, // Backward compatibility with Django paginator
      recent_ledgers: allLedgers,
    });
  } catch (err: unknown) {
    console.error('[Khata API Error]:', err);
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();

    let payload: any = {};
    let proofFile: File | Blob | null = null;

    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      formData.forEach((value, key) => {
        if (key === 'number_plate_image' || key === 'file' || key === 'proof' || key === 'image') {
          if (typeof value === 'object' && value && 'size' in value && (value as any).size > 0) {
            proofFile = value as unknown as File;
          } else if (typeof value === 'string' && value.trim() !== '') {
            payload[key] = value;
          }
        } else {
          payload[key] = value;
        }
      });
    } else {
      payload = await request.json().catch(() => ({}));
    }

    let {
      customer_id,
      phone,
      name,
      amount,
      description = 'Manual Khata Credit Charge',
      related_booking_id = null,
      number_plate_image = null,
    } = payload;

    const numericAmount = parseFloat(String(amount));
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Charge amount must be a positive number.' },
        { status: 400 }
      );
    }

    // 1. Resolve Customer (by customer_id or phone)
    let customer: any = null;

    if (customer_id) {
      const { data: cRecord } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customer_id)
        .maybeSingle();
      if (cRecord) customer = cRecord;
    }

    if (!customer && phone) {
      const canonicalPhone = normalizePhone(phone);
      const { variants } = getPhoneVariants(phone);

      const { data: existingCust } = await supabase
        .from('customers')
        .select('*')
        .in('phone_number', variants)
        .order('user_id', { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();

      if (existingCust) {
        customer = existingCust;
        if (name && (!existingCust.name || existingCust.name === 'Guest Customer')) {
          await supabase
            .from('customers')
            .update({ name: String(name).trim() })
            .eq('id', existingCust.id);
          customer.name = String(name).trim();
        }
      } else {
        // Auto-register customer for Khata credit ledger
        const { data: newCust, error: newCustErr } = await supabase
          .from('customers')
          .insert({
            name: (name && String(name).trim()) || 'Khata Customer',
            phone_number: canonicalPhone,
            outstanding_balance: 0.0,
            credit_limit: 5000.0,
          })
          .select('*')
          .single();

        if (newCustErr || !newCust) {
          console.error('[Khata Customer Creation Error]:', newCustErr);
          return NextResponse.json(
            { success: false, error: 'Failed to create customer for Khata charge.' },
            { status: 500 }
          );
        }
        customer = newCust;
      }
    }

    if (!customer) {
      return NextResponse.json(
        { success: false, error: 'Valid customer_id or customer phone number is required.' },
        { status: 400 }
      );
    }

    // 2. Evaluate Credit Limit using pure logic
    const currentBalance = Number(customer.outstanding_balance || 0);
    const creditLimit = Number(customer.credit_limit || 5000);

    const khataCalc = calculateKhataBalance(
      currentBalance,
      creditLimit,
      'CHARGE',
      numericAmount
    );

    if (khataCalc.isCreditLimitExceeded) {
      return NextResponse.json(
        {
          success: false,
          error: `Khata credit limit of ₹${creditLimit} exceeded. Current balance: ₹${currentBalance}, Attempted charge: ₹${numericAmount}. Maximum available credit: ₹${khataCalc.availableCredit}.`,
        },
        { status: 400 }
      );
    }

    // 3. Upload Proof Photo to Supabase Storage if provided
    let finalProofUrl: string | null = null;
    if (proofFile) {
      try {
        finalProofUrl = await uploadFileToStorage(proofFile, 'khata-proofs');
      } catch (uploadErr: any) {
        console.warn('[Khata Proof Upload Warning]:', uploadErr.message);
      }
    } else if (typeof number_plate_image === 'string') {
      const trimmed = number_plate_image.trim();
      if (trimmed !== '' && trimmed !== '[object File]' && trimmed !== 'null' && trimmed !== 'undefined') {
        finalProofUrl = trimmed;
      }
    }

    // 4. Insert into Khata Ledger
    const { data: newLedger, error: ledgerErr } = await supabase
      .from('khata_ledgers')
      .insert({
        customer_id: customer.id,
        amount: numericAmount,
        transaction_type: 'CHARGE',
        description: description || 'Manual Khata Entry',
        related_booking_id: related_booking_id ? parseInt(String(related_booking_id), 10) : null,
        number_plate_image: finalProofUrl,
      })
      .select('*')
      .single();

    if (ledgerErr || !newLedger) {
      console.error('[Khata Ledger Error]:', ledgerErr);
      return NextResponse.json(
        { success: false, error: `Failed to record khata ledger: ${ledgerErr?.message}` },
        { status: 500 }
      );
    }

    // 5. Update Customer Balance
    await supabase
      .from('customers')
      .update({
        outstanding_balance: khataCalc.newBalance,
      })
      .eq('id', customer.id);

    return NextResponse.json({
      success: true,
      message: `Khata charge of ₹${numericAmount.toFixed(2)} applied successfully.`,
      customer_name: customer.name,
      new_balance: khataCalc.newBalance,
      data: {
        ledger: newLedger,
        new_balance: khataCalc.newBalance,
        customer_name: customer.name,
      },
      ledger: newLedger,
    });
  } catch (err: unknown) {
    console.error('[Khata POST Error]:', err);
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
