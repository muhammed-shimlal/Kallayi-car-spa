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

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await request.json();

    const {
      booking_id,
      split_cash = 0,
      split_online = 0,
      split_khata = 0,
      payment_method,
      base_price,
      final_price,
      discount_amount,
      revenue_category_id,
    } = body;

    if (!booking_id) {
      return NextResponse.json(
        { success: false, error: 'booking_id is required for POS checkout.' },
        { status: 400 }
      );
    }

    const bookingIdNum = parseInt(String(booking_id), 10);
    if (isNaN(bookingIdNum)) {
      return NextResponse.json(
        { success: false, error: 'Invalid booking_id provided.' },
        { status: 400 }
      );
    }

    // 1. Fetch booking with joined relations
    const { data: bookingData, error: fetchErr } = await supabase
      .from('bookings')
      .select(`
        *,
        customer:customers(*),
        vehicle:customer_vehicles(*),
        service_package:service_packages(
          *,
          commission_rule:commission_rules(*)
        )
      `)
      .eq('id', bookingIdNum)
      .single();

    if (fetchErr || !bookingData) {
      return NextResponse.json(
        { success: false, error: `Booking #${booking_id} not found.` },
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
    let customer = rawBooking.customer;
    if (!customer && rawBooking.customer_id) {
      const { data: cLookup } = await supabase
        .from('customers')
        .select('*')
        .eq('id', rawBooking.customer_id)
        .maybeSingle();
      if (cLookup) customer = cLookup;
    }
    if (!customer && rawBooking.customer_phone) {
      const { data: cLookupByPhone } = await supabase
        .from('customers')
        .select('*')
        .eq('phone_number', rawBooking.customer_phone)
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

    const splitCashNum = Math.max(Number(split_cash || 0), 0);
    const splitOnlineNum = Math.max(Number(split_online || 0), 0);
    const splitKhataNum = Math.max(Number(split_khata || 0), 0);

    // 4. Validate split payments against expected final amount
    const splitValidation = validateSplitPayment(
      invoicePricing.amount,
      splitCashNum,
      splitOnlineNum,
      splitKhataNum
    );

    if (!splitValidation.isValid) {
      return NextResponse.json(
        { success: false, error: splitValidation.message },
        { status: 400 }
      );
    }

    // 5. Process Digital Khata Credit if split_khata > 0
    if (splitKhataNum > 0) {
      if (!customer) {
        return NextResponse.json(
          {
            success: false,
            error: 'Digital Khata credit requires a linked customer profile. Please register or select a customer.',
          },
          { status: 400 }
        );
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

      // Record in double-entry khata ledger
      const { error: khataInsertErr } = await supabase.from('khata_ledgers').insert({
        customer_id: customer.id,
        amount: splitKhataNum,
        transaction_type: 'CHARGE',
        description: `POS Checkout for Booking #${bookingIdNum} (${vehicle?.plate_number || 'Vehicle'})`,
        related_booking_id: bookingIdNum,
      });

      if (khataInsertErr) {
        console.error('[POS Khata Error]:', khataInsertErr);
        return NextResponse.json(
          { success: false, error: `Failed to record Khata charge: ${khataInsertErr.message}` },
          { status: 500 }
        );
      }

      // Update customer outstanding balance
      await supabase
        .from('customers')
        .update({ outstanding_balance: khataCalc.newBalance })
        .eq('id', customer.id);
    }

    // 6. Strict Payment Method Normalization for DB Check Constraint: ('CASH', 'CARD', 'ONLINE', 'SPLIT')
    let finalPaymentMethod: InvoicePaymentMethod = 'CASH';
    const rawMethod = String(payment_method || '').toUpperCase().trim();

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

    // 8. Mark booking as COMPLETED and sync final price
    const wasAlreadyCompleted = rawBooking.status === 'COMPLETED';
    await supabase
      .from('bookings')
      .update({
        status: 'COMPLETED',
        final_price: invoicePricing.finalPrice,
        discount_amount: invoicePricing.discountAmount,
        discount_percentage: invoicePricing.discountPercentage,
      })
      .eq('id', bookingIdNum);

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
        booking_id: bookingIdNum,
        amount: invoicePricing.amount,
        payment_method: finalPaymentMethod,
        split_summary: {
          cash: splitCashNum,
          online: splitOnlineNum,
          khata: splitKhataNum,
        },
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    console.error('[POS Checkout Error]:', err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
