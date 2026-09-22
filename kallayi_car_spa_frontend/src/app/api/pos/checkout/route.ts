/**
 * KALLAYI CAR SPA & AUTO CARE - POS CHECKOUT & SPLIT INVOICING API
 * Next.js 16 Route Handler: POST /api/pos/checkout
 * Processes cash, online, and digital khata split invoicing, inventory deduction, and WhatsApp invoice dispatch.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseServer';
import {
  deriveInvoicePricing,
  validateSplitPayment,
  calculateKhataBalance,
  planChemicalDeductions,
  calculateStaffBookingCommission,
  aggregateDailyPayroll,
} from '@/lib/logic/finance';
import { InvoicePaymentMethod, ChemicalRecipe } from '@/types/database';
import { WhatsAppService } from '@/lib/services/whatsapp';
import { getPhoneVariants, normalizePhone } from '@/lib/phone';
import { uploadFileToStorage } from '@/lib/storage';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function resolveStaffProfile(supabase: any, paramId: string) {
  const cleanId = String(paramId || '').trim();
  if (!cleanId) return null;

  // 1. Direct UUID check
  if (UUID_REGEX.test(cleanId)) {
    const { data: staff } = await supabase
      .from('staff_profiles')
      .select('id, user_id, phone_number, role, is_active')
      .or(`id.eq.${cleanId},user_id.eq.${cleanId}`)
      .maybeSingle();

    if (staff) return staff;
  }

  // 2. Numeric ID check against payroll_entries or staff_profiles index
  const numericId = parseInt(cleanId, 10);
  if (!isNaN(numericId)) {
    const { data: pEntry } = await supabase
      .from('payroll_entries')
      .select('*')
      .eq('id', numericId)
      .maybeSingle();

    if (pEntry) {
      const staffRef = pEntry.staff_user_id || pEntry.staff_id;
      if (staffRef) {
        const { data: staff } = await supabase
          .from('staff_profiles')
          .select('id, user_id, phone_number, role, is_active')
          .or(`id.eq.${staffRef},user_id.eq.${staffRef}`)
          .maybeSingle();

        if (staff) return staff;
      }
    }

    const { data: allStaff } = await supabase
      .from('staff_profiles')
      .select('id, user_id, phone_number, role, is_active')
      .order('created_at', { ascending: true });

    if (allStaff && allStaff.length > 0) {
      if (numericId >= 1 && numericId <= allStaff.length) {
        return allStaff[numericId - 1];
      }
      if (numericId >= 0 && numericId < allStaff.length) {
        return allStaff[numericId];
      }
      const activeStaff = allStaff.filter((s: any) => s.is_active);
      if (activeStaff.length > 0) {
        return activeStaff[0];
      }
      return allStaff[0];
    }
  }

  // 3. Fallback: Lookup by phone
  const { data: staffByPhone } = await supabase
    .from('staff_profiles')
    .select('id, user_id, phone_number, role, is_active')
    .eq('phone_number', cleanId)
    .maybeSingle();

  if (staffByPhone) return staffByPhone;

  return null;
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
        if (key === 'number_plate_image' || key === 'file' || key === 'proof' || key === 'proof_image') {
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
      booking_id,
      split_cash = 0,
      split_online = 0,
      split_khata = 0,
      payment_method,
      base_price,
      final_price,
      discount_amount,
      revenue_category_id,
      customer_id,
      customer_name,
      customer_phone,
      phone,
      number_plate_image = null,
      plate_number,
      notes,
      description,
      cash_collected_by_staff_id = null,
      staff_id = null,
    } = payload;

    const rawBookingId = booking_id;
    if (!rawBookingId && rawBookingId !== 0) {
      console.error('POS Checkout validation failure: missing booking_id', { body: payload, missingFields: ['booking_id'] });
      return NextResponse.json(
        { success: false, error: 'booking_id is required for POS checkout.' },
        { status: 400 }
      );
    }

    const bookingIdNum = parseInt(String(rawBookingId), 10);

    // 1. Fetch booking with joined relations (supports integer or string/UUID IDs)
    let bookingQuery = supabase
      .from('bookings')
      .select(`
        *,
        customer:customers(*),
        vehicle:customer_vehicles(*),
        service_package:service_packages(
          *,
          commission_rule:commission_rules(*)
        )
      `);

    if (!isNaN(bookingIdNum)) {
      bookingQuery = bookingQuery.eq('id', bookingIdNum);
    } else {
      bookingQuery = bookingQuery.eq('id', String(rawBookingId) as unknown as number);
    }

    const { data: bookingData, error: fetchErr } = await bookingQuery.maybeSingle();

    if (fetchErr || !bookingData) {
      console.error('POS Checkout validation failure: Booking not found', { booking_id: rawBookingId, error: fetchErr });
      return NextResponse.json(
        { success: false, error: `Booking #${rawBookingId} not found.` },
        { status: 404 }
      );
    }

    const rawBooking = bookingData as unknown as {
      id: number;
      customer_id?: string | null;
      customer_phone?: string | null;
      base_price: number;
      final_price: number;
      discount_amount: number;
      discount_percentage: number;
      status: string;
      technician_id: string | null;
      customer?: {
        id: string;
        phone_number: string;
        outstanding_balance: number;
        credit_limit: number;
      } | null;
      vehicle?: { plate_number: string } | null;
      service_package?: {
        name: string;
        price: number;
        chemical_recipe?: ChemicalRecipe;
        commission_rule?: { flat_amount?: number; percentage?: number };
      } | null;
    };

    // 2. Resolve Customer Safely (Handle unjoined or walk-in records)
    let customer: any = rawBooking.customer;
    const incomingPhone = customer_phone || phone || rawBooking.customer_phone;

    if (!customer && (customer_id || rawBooking.customer_id)) {
      const targetId = customer_id || rawBooking.customer_id;
      const { data: cLookup } = await supabase
        .from('customers')
        .select('*')
        .eq('id', targetId)
        .maybeSingle();
      if (cLookup) customer = cLookup;
    }
    if (!customer && incomingPhone) {
      const { variants } = getPhoneVariants(incomingPhone);
      const { data: cLookupByPhone } = await supabase
        .from('customers')
        .select('*')
        .in('phone_number', variants)
        .order('user_id', { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();
      if (cLookupByPhone) customer = cLookupByPhone;
    }

    const vehicle = rawBooking.vehicle;
    const pkg = rawBooking.service_package;

    // 3. Execute pure Invoice pricing synchronization
    const invoicePricing = deriveInvoicePricing({
      basePrice: base_price,
      finalPrice: final_price,
      discountAmount: discount_amount,
      booking: {
        basePrice: rawBooking.base_price,
        finalPrice: rawBooking.final_price,
        discountAmount: rawBooking.discount_amount,
        discountPercentage: rawBooking.discount_percentage,
        servicePackage: pkg,
      },
    });

    let splitCashNum = Math.max(Number(split_cash || 0), 0);
    let splitOnlineNum = Math.max(Number(split_online || 0), 0);
    let splitKhataNum = Math.max(Number(split_khata || 0), 0);

    const rawMethod = String(payment_method || '').toUpperCase().trim();

    // Auto-populate splits if not supplied or all 0
    if (splitCashNum === 0 && splitOnlineNum === 0 && splitKhataNum === 0) {
      if (rawMethod === 'KHATA' || rawMethod === 'CREDIT') {
        splitKhataNum = invoicePricing.amount;
      } else if (rawMethod === 'UPI' || rawMethod === 'ONLINE' || rawMethod === 'CARD' || rawMethod === 'NETBANKING') {
        splitOnlineNum = invoicePricing.amount;
      } else {
        // Default to CASH
        splitCashNum = invoicePricing.amount;
      }
    } else if ((rawMethod === 'KHATA' || rawMethod === 'CREDIT') && splitKhataNum === 0 && (splitCashNum + splitOnlineNum === 0)) {
      splitKhataNum = invoicePricing.amount;
    } else if (rawMethod === 'CASH' && splitCashNum === 0 && (splitOnlineNum + splitKhataNum === 0)) {
      splitCashNum = invoicePricing.amount;
    } else if ((rawMethod === 'UPI' || rawMethod === 'ONLINE' || rawMethod === 'CARD') && splitOnlineNum === 0 && (splitCashNum + splitKhataNum === 0)) {
      splitOnlineNum = invoicePricing.amount;
    }

    // 4. Validate split payments against expected final amount
    const splitValidation = validateSplitPayment(
      invoicePricing.amount,
      splitCashNum,
      splitOnlineNum,
      splitKhataNum
    );

    if (!splitValidation.isValid) {
      console.error('POS Checkout validation failure:', {
        body: payload,
        missingFields: [],
        validationError: splitValidation.message,
        expectedAmount: invoicePricing.amount,
        splitCash: splitCashNum,
        splitOnline: splitOnlineNum,
        splitKhata: splitKhataNum,
      });
      return NextResponse.json(
        { success: false, error: splitValidation.message },
        { status: 400 }
      );
    }

    // 5. Process Digital Khata Credit if split_khata > 0
    let recordedKhataLedger: any = null;
    if (splitKhataNum > 0) {
      if (!customer) {
        // Auto-register walk-in customer into public.customers
        const canonicalPhone = incomingPhone ? normalizePhone(incomingPhone) : '';
        const resolvedName = (customer_name && String(customer_name).trim()) || (rawBooking as any).customer_name || 'Khata Customer';

        const { data: newCust, error: newCustErr } = await supabase
          .from('customers')
          .insert({
            name: resolvedName,
            phone_number: canonicalPhone,
            outstanding_balance: 0.0,
            credit_limit: 5000.0,
          })
          .select('*')
          .single();

        if (newCustErr || !newCust) {
          console.error('[POS Khata Auto-Register Error]:', newCustErr);
          return NextResponse.json(
            { success: false, error: 'Digital Khata credit requires a linked customer profile. Auto-registration failed.' },
            { status: 500 }
          );
        }
        customer = newCust;
        await supabase.from('bookings').update({ customer_id: newCust.id }).eq('id', bookingIdNum);
      } else if (customer_name && (!customer.name || customer.name === 'Guest Customer')) {
        await supabase
          .from('customers')
          .update({ name: String(customer_name).trim() })
          .eq('id', customer.id);
        customer.name = String(customer_name).trim();
      }

      const currentBalance = Number(customer.outstanding_balance || 0);
      const creditLimit = Number(customer.credit_limit || 5000);

      const khataCalc = calculateKhataBalance(
        currentBalance,
        creditLimit,
        'CHARGE',
        splitKhataNum
      );

      if (khataCalc.isCreditLimitExceeded) {
        return NextResponse.json(
          {
            success: false,
            error: `Khata credit limit exceeded! Current Balance: ₹${currentBalance}, Credit Limit: ₹${creditLimit}, Requested Khata: ₹${splitKhataNum}`,
          },
          { status: 400 }
        );
      }

      // Upload vehicle proof photo to Supabase Storage if provided
      let proofUrl: string | null = null;
      if (proofFile) {
        try {
          proofUrl = await uploadFileToStorage(proofFile, 'khata-proofs');
        } catch (uploadErr: any) {
          console.warn('[POS Khata Proof Upload Warning]:', uploadErr.message);
        }
      } else if (typeof number_plate_image === 'string') {
        const trimmed = number_plate_image.trim();
        if (trimmed !== '' && trimmed !== '[object File]' && trimmed !== 'null' && trimmed !== 'undefined') {
          proofUrl = trimmed;
        }
      }

      const targetPlate = plate_number || vehicle?.plate_number || (rawBooking as any).plate_number || 'Vehicle';
      const ledgerDescription = description || notes || `POS Credit for Booking #${bookingIdNum} (${targetPlate})`;

      // Record in double-entry khata ledger
      const { data: newLedger, error: khataInsertErr } = await supabase.from('khata_ledgers').insert({
        customer_id: customer.id,
        amount: splitKhataNum,
        transaction_type: 'CHARGE',
        description: ledgerDescription,
        related_booking_id: bookingIdNum,
        number_plate_image: proofUrl,
      }).select('*').single();

      if (khataInsertErr) {
        console.error('[POS Khata Error]:', khataInsertErr);
        return NextResponse.json(
          { success: false, error: `Failed to record Khata charge: ${khataInsertErr.message}` },
          { status: 500 }
        );
      }
      recordedKhataLedger = newLedger;

      // Update customer outstanding balance
      await supabase
        .from('customers')
        .update({ outstanding_balance: khataCalc.newBalance })
        .eq('id', customer.id);
    }

    // 6. Strict Payment Method Normalization for DB Check Constraint: ('CASH', 'CARD', 'ONLINE', 'SPLIT')
    let finalPaymentMethod: InvoicePaymentMethod = 'CASH';

    if (rawMethod === 'UPI' || rawMethod === 'ONLINE' || rawMethod === 'NETBANKING') {
      finalPaymentMethod = 'ONLINE';
    } else if (rawMethod === 'CARD') {
      finalPaymentMethod = 'CARD';
    } else if (
      rawMethod === 'SPLIT' ||
      splitKhataNum > 0 ||
      (splitCashNum > 0 && splitOnlineNum > 0)
    ) {
      finalPaymentMethod = 'SPLIT';
    } else if (rawMethod === 'CASH') {
      finalPaymentMethod = 'CASH';
    } else if (splitOnlineNum > 0 && splitCashNum === 0 && splitKhataNum === 0) {
      finalPaymentMethod = 'ONLINE';
    } else {
      finalPaymentMethod = 'CASH';
    }

    // Resolve Cash Custody Staff ID with Graceful Fallbacks (Never abort with 400 or fail UUID type)
    let resolvedCashStaffId: string | null = null;
    const isCashInvolved = splitCashNum > 0 || finalPaymentMethod === 'CASH';

    if (isCashInvolved) {
      const candidateId = String(cash_collected_by_staff_id || staff_id || '').trim();
      if (candidateId) {
        const staff = await resolveStaffProfile(supabase, candidateId);
        if (staff?.id) {
          resolvedCashStaffId = staff.id;
        }
      }

      // Fallback 1: booking's assigned technician
      if (!resolvedCashStaffId && rawBooking.technician_id) {
        const techStaff = await resolveStaffProfile(supabase, String(rawBooking.technician_id));
        if (techStaff?.id) {
          resolvedCashStaffId = techStaff.id;
        }
      }

      // Fallback 2: first active staff member
      if (!resolvedCashStaffId) {
        const { data: firstActiveStaff } = await supabase
          .from('staff_profiles')
          .select('id')
          .eq('is_active', true)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (firstActiveStaff?.id) {
          resolvedCashStaffId = firstActiveStaff.id;
        }
      }

      // Fallback 3: any staff profile
      if (!resolvedCashStaffId) {
        const { data: anyStaff } = await supabase
          .from('staff_profiles')
          .select('id')
          .limit(1)
          .maybeSingle();

        if (anyStaff?.id) {
          resolvedCashStaffId = anyStaff.id;
        }
      }
    }

    // 7. Upsert / Create Invoice Record (Safe against unique booking_id constraint)
    const { data: existingInvoice } = await supabase
      .from('invoices')
      .select('*')
      .eq('booking_id', bookingIdNum)
      .maybeSingle();

    let invoiceResult = null;

    if (existingInvoice) {
      const { data: updatedInv, error: updateInvErr } = await supabase
        .from('invoices')
        .update({
          amount: invoicePricing.amount,
          base_price: invoicePricing.basePrice,
          final_price: invoicePricing.finalPrice,
          discount_amount: invoicePricing.discountAmount,
          discount_percentage: invoicePricing.discountPercentage,
          revenue_category_id: revenue_category_id || null,
          is_deferred: false,
          is_paid: true,
          payment_method: finalPaymentMethod,
          split_cash: splitCashNum,
          split_online: splitOnlineNum,
          split_khata: splitKhataNum,
          cash_collected_by_staff_id: (splitCashNum > 0 || finalPaymentMethod === 'CASH') ? resolvedCashStaffId : null,
        })
        .eq('id', existingInvoice.id)
        .select('*')
        .single();

      if (updateInvErr || !updatedInv) {
        console.error('[POS Update Invoice Error]:', updateInvErr);
        return NextResponse.json(
          { success: false, error: `Failed to update invoice: ${updateInvErr?.message}` },
          { status: 500 }
        );
      }
      invoiceResult = updatedInv;
    } else {
      const { data: newInvoice, error: invError } = await supabase
        .from('invoices')
        .insert({
          booking_id: bookingIdNum,
          amount: invoicePricing.amount,
          base_price: invoicePricing.basePrice,
          final_price: invoicePricing.finalPrice,
          discount_amount: invoicePricing.discountAmount,
          discount_percentage: invoicePricing.discountPercentage,
          revenue_category_id: revenue_category_id || null,
          is_deferred: false,
          is_paid: true,
          payment_method: finalPaymentMethod,
          split_cash: splitCashNum,
          split_online: splitOnlineNum,
          split_khata: splitKhataNum,
          cash_collected_by_staff_id: (splitCashNum > 0 || finalPaymentMethod === 'CASH') ? resolvedCashStaffId : null,
        })
        .select('*')
        .single();

      if (invError || !newInvoice) {
        console.error('[POS Create Invoice Error]:', invError);
        return NextResponse.json(
          { success: false, error: `Failed to create invoice: ${invError?.message}` },
          { status: 500 }
        );
      }
      invoiceResult = newInvoice;
    }

    // 8. Explicitly mark booking as COMPLETED, set end_time, and sync final price
    const wasAlreadyCompleted = rawBooking.status === 'COMPLETED';
    const completionTimestamp = new Date().toISOString();
    const { data: completedBooking, error: completeErr } = await supabase
      .from('bookings')
      .update({
        status: 'COMPLETED',
        end_time: completionTimestamp,
        final_price: invoicePricing.finalPrice,
        discount_amount: invoicePricing.discountAmount,
        discount_percentage: invoicePricing.discountPercentage,
      })
      .eq('id', bookingIdNum)
      .select('*')
      .maybeSingle();

    if (completeErr) {
      console.error('[POS Complete Booking Error]:', completeErr);
      return NextResponse.json(
        { success: false, error: `Failed to mark booking as COMPLETED: ${completeErr.message}` },
        { status: 500 }
      );
    }

    // 9. Side-Effects: Chemical inventory deduction & Staff Commission
    if (!wasAlreadyCompleted) {
      try {
        const chemicalRecipe = pkg?.chemical_recipe;
        if (chemicalRecipe && Object.keys(chemicalRecipe).length > 0) {
          const { data: allInventory } = await supabase.from('chemical_inventory').select('*');
          if (allInventory && allInventory.length > 0) {
            const deductionPlan = planChemicalDeductions(chemicalRecipe, allInventory);
            for (const item of deductionPlan.deductions) {
              await supabase
                .from('chemical_inventory')
                .update({ current_volume: item.newVolume })
                .eq('id', item.inventoryItemId);

              await supabase.from('chemical_usage_logs').insert({
                inventory_item_id: item.inventoryItemId,
                booking_id: bookingIdNum,
                amount_used: item.amountUsed,
              });
            }
          }
        }
      } catch (chemErr) {
        console.warn('[POS Chemical Deduction Warning]:', chemErr);
      }

      // Technician Commission & Daily Payroll Aggregation
      if (rawBooking.technician_id) {
        try {
          const { data: staffProfile } = await supabase
            .from('staff_profiles')
            .select('*')
            .eq('user_id', rawBooking.technician_id)
            .maybeSingle();

          if (staffProfile) {
            const commAmount = calculateStaffBookingCommission(staffProfile, {
              final_price: invoicePricing.finalPrice,
              service_package: pkg,
            });

            if (commAmount > 0) {
              const todayDate = new Date().toISOString().split('T')[0];
              const { data: existingPayroll } = await supabase
                .from('payroll_entries')
                .select('*')
                .eq('staff_user_id', rawBooking.technician_id)
                .eq('date', todayDate)
                .maybeSingle();

              const aggregated = aggregateDailyPayroll({
                currentBaseWage: Number(existingPayroll?.base_wage ?? 0),
                currentCommissionEarned: Number(existingPayroll?.commission_earned ?? 0),
                currentTipsEarned: Number(existingPayroll?.tips_earned ?? 0),
                commissionToAdd: commAmount,
              });

              if (existingPayroll) {
                await supabase
                  .from('payroll_entries')
                  .update({ commission_earned: aggregated.commissionEarned })
                  .eq('id', existingPayroll.id);
              } else {
                await supabase.from('payroll_entries').insert({
                  staff_user_id: rawBooking.technician_id,
                  date: todayDate,
                  base_wage: 0.00,
                  commission_earned: aggregated.commissionEarned,
                  tips_earned: 0.00,
                  is_settled: false,
                });
              }
            }
          }
        } catch (commErr) {
          console.warn('[POS Commission Payroll Warning]:', commErr);
        }
      }
    }

    // 10. WhatsApp Notification Dispatch (Safe non-blocking execution)
    try {
      if (customer?.phone_number || rawBooking.customer_phone) {
        await WhatsAppService.notifyPOSCheckout({
          bookingId: bookingIdNum,
          invoiceId: invoiceResult.id,
          customerPhone: customer?.phone_number || rawBooking.customer_phone || '',
          plateNumber: vehicle?.plate_number || 'Vehicle',
          packageName: pkg?.name || 'Car Spa Wash',
          amount: invoicePricing.amount,
          paymentMethod: finalPaymentMethod,
        });
      }
    } catch (waErr) {
      console.warn('[POS WhatsApp Warning]:', waErr);
    }

    return NextResponse.json({
      success: true,
      message: 'POS Checkout completed successfully.',
      data: {
        invoice: invoiceResult,
        booking: completedBooking,
        booking_id: bookingIdNum,
        amount: invoicePricing.amount,
        payment_method: finalPaymentMethod,
        split_summary: {
          cash: splitCashNum,
          online: splitOnlineNum,
          split_khata: splitKhataNum,
        },
        ledger: recordedKhataLedger,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    console.error('[POS Checkout Error]:', err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
