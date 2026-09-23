/**
 * KALLAYI CAR SPA & AUTO CARE - PDF INVOICE GENERATION ROUTE
 * Next.js 16 Route Handler: GET /api/finance/invoice/[id]/pdf
 * Generates a clean, professional, print-ready PDF invoice using jsPDF.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseServer';
import { jsPDF } from 'jspdf';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface RouteContext {
  params: Promise<{ id: string }> | { id: string };
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const params = await context.params;
    const rawId = params?.id;

    if (!rawId || rawId === 'undefined' || rawId === 'null') {
      return NextResponse.json(
        { success: false, error: 'A valid invoice ID or booking ID is required.' },
        { status: 400 }
      );
    }

    const numericId = parseInt(String(rawId), 10);
    if (isNaN(numericId) || numericId <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invoice identifier must be a valid positive integer.' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // 1. Fetch invoice by either invoice ID or booking ID
    let { data: invoice } = await supabase
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

    // 2. Fallback: If no invoice record found, lookup booking directly
    let bookingData: any = invoice?.booking || null;
    if (!invoice) {
      const { data: bRecord } = await supabase
        .from('bookings')
        .select(`
          *,
          customer:customers(*),
          vehicle:customer_vehicles(*),
          service_package:service_packages(*)
        `)
        .eq('id', numericId)
        .maybeSingle();

      if (bRecord) {
        bookingData = bRecord;
        invoice = {
          id: bRecord.id,
          booking_id: bRecord.id,
          amount: Number(bRecord.final_price || bRecord.base_price || 0),
          base_price: Number(bRecord.base_price || 0),
          final_price: Number(bRecord.final_price || bRecord.base_price || 0),
          discount_amount: Number(bRecord.discount_amount || 0),
          discount_percentage: Number(bRecord.discount_percentage || 0),
          is_paid: bRecord.status === 'COMPLETED',
          payment_method: 'CASH',
          split_cash: Number(bRecord.final_price || 0),
          split_online: 0,
          split_khata: 0,
          created_at: bRecord.created_at || new Date().toISOString(),
        } as any;
      }
    }

    if (!invoice) {
      return NextResponse.json(
        { success: false, error: `Invoice or Booking #${numericId} not found.` },
        { status: 404 }
      );
    }

    // 3. Resolve Relations
    const customer = bookingData?.customer || null;
    const vehicle = bookingData?.vehicle || null;
    const pkg = bookingData?.service_package || null;

    let customerName = customer?.name;
    if (!customerName || customerName === 'Guest Customer') {
      customerName = bookingData?.customer_name || 'Walk-In Customer';
    }
    const customerPhone = customer?.phone_number || bookingData?.customer_phone || 'N/A';
    const customerAddress = customer?.address || 'Calicut, Kerala';

    const plateNumber = vehicle?.plate_number || bookingData?.plate_number || 'KL-XX-0000';
    const vehicleMakeModel = `${vehicle?.make || 'Standard'} ${vehicle?.model || 'Vehicle'}`.trim();
    const vehicleType = vehicle?.vehicle_type || 'CAR';

    const serviceName = pkg?.name || 'Car Spa Wash & Detailing';
    const serviceDescription = pkg?.description || 'Full exterior foam wash, tire dressing & interior vacuum';
    const basePrice = Number(invoice.base_price || invoice.amount || 0);
    const finalPrice = Number(invoice.final_price || invoice.amount || 0);
    const discountAmount = Number(invoice.discount_amount || 0);
    const discountPercentage = Number(invoice.discount_percentage || 0);
    const discountReason = invoice.discount_reason || bookingData?.discount_reason || '';

    const paymentMethod = String(invoice.payment_method || 'CASH').toUpperCase();
    const isPaid = invoice.is_paid !== false;
    const splitCash = Number(invoice.split_cash || 0);
    const splitOnline = Number(invoice.split_online || 0);
    const splitKhata = Number(invoice.split_khata || 0);
    const isSplit = paymentMethod === 'SPLIT' || (splitCash > 0 && splitOnline > 0);

    const invoiceDate = new Date(invoice.created_at || Date.now());
    const formattedDate = invoiceDate.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const formattedTime = invoiceDate.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    const invoiceNumber = `INV-${String(invoice.id).padStart(4, '0')}`;

    // 4. Generate PDF using jsPDF (A4 format, millimeters)
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
    const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
    const margin = 15;

    // Header Background Accent
    doc.setFillColor(18, 20, 24); // Dark slate
    doc.rect(0, 0, pageWidth, 48, 'F');

    // Gold Top Accent Line
    doc.setFillColor(212, 175, 55); // Gold
    doc.rect(0, 0, pageWidth, 2.5, 'F');

    // Brand Title & Tagline
    doc.setTextColor(212, 175, 55);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('KALLAYI CAR SPA & AUTO CARE', margin, 18);

    doc.setTextColor(160, 165, 175);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Luxury Detailing • Steam Wash • Ceramic & Graphene Coating', margin, 24);
    doc.text('Kallayi Bridge Road, Calicut, Kerala 673003 | Helpline: +91 98470 00000', margin, 29);
    doc.text('GSTIN: 32AABCK9876Q1Z2 | Email: info@kallayicarspa.com', margin, 34);

    // Invoice Number & Status Badge in Header (Right Side)
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(invoiceNumber, pageWidth - margin, 18, { align: 'right' });

    doc.setTextColor(180, 185, 195);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`${formattedDate} • ${formattedTime}`, pageWidth - margin, 24, { align: 'right' });
    doc.text(`Booking Ref: #${bookingData?.id || invoice.booking_id || invoice.id}`, pageWidth - margin, 29, { align: 'right' });

    // Status Pill
    if (isPaid) {
      doc.setFillColor(16, 185, 129); // Emerald
      doc.roundedRect(pageWidth - margin - 22, 33, 22, 6, 2, 2, 'F');
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text('PAID', pageWidth - margin - 11, 37.5, { align: 'center' });
    } else {
      doc.setFillColor(239, 68, 68); // Red
      doc.roundedRect(pageWidth - margin - 25, 33, 25, 6, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text('PENDING', pageWidth - margin - 12.5, 37.5, { align: 'center' });
    }

    let currentY = 56;

    // Customer & Vehicle Information Box
    doc.setFillColor(248, 250, 252); // Soft light grey
    doc.roundedRect(margin, currentY, pageWidth - margin * 2, 38, 3, 3, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, currentY, pageWidth - margin * 2, 38, 3, 3, 'S');

    // Left Column: Customer
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('BILLED TO (CUSTOMER)', margin + 6, currentY + 7);

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(customerName, margin + 6, currentY + 14);

    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Phone: ${customerPhone}`, margin + 6, currentY + 20);
    doc.text(`Address: ${customerAddress.slice(0, 45)}`, margin + 6, currentY + 26);

    // Right Column: Vehicle Details
    const rightColX = pageWidth / 2 + 10;
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('VEHICLE CREDENTIALS', rightColX, currentY + 7);

    // Number Plate Badge
    doc.setFillColor(15, 23, 42);
    doc.roundedRect(rightColX, currentY + 10, 48, 8, 1.5, 1.5, 'F');
    doc.setTextColor(1, 255, 255); // Cyan
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(plateNumber, rightColX + 24, currentY + 15.5, { align: 'center' });

    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Model: ${vehicleMakeModel}`, rightColX, currentY + 25);
    doc.text(`Type: ${vehicleType}`, rightColX, currentY + 31);

    currentY += 46;

    // Itemized Services Table Header
    doc.setFillColor(15, 23, 42);
    doc.roundedRect(margin, currentY, pageWidth - margin * 2, 9, 2, 2, 'F');

    doc.setTextColor(212, 175, 55);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('SERVICE DESCRIPTION', margin + 6, currentY + 6);
    doc.text('BASE RATE', pageWidth - margin - 55, currentY + 6, { align: 'right' });
    doc.text('DISCOUNT', pageWidth - margin - 28, currentY + 6, { align: 'right' });
    doc.text('AMOUNT (INR)', pageWidth - margin - 6, currentY + 6, { align: 'right' });

    currentY += 12;

    // Service Row
    doc.setFillColor(255, 255, 255);
    doc.rect(margin, currentY - 2, pageWidth - margin * 2, 20, 'F');

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(serviceName, margin + 6, currentY + 4);

    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(serviceDescription.slice(0, 70), margin + 6, currentY + 9);

    doc.setTextColor(51, 65, 85);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.text(`Rs. ${basePrice.toFixed(2)}`, pageWidth - margin - 55, currentY + 5, { align: 'right' });

    if (discountAmount > 0) {
      doc.setTextColor(16, 185, 129);
      doc.text(`-Rs. ${discountAmount.toFixed(2)}`, pageWidth - margin - 28, currentY + 5, { align: 'right' });
    } else {
      doc.setTextColor(148, 163, 184);
      doc.text('0.00', pageWidth - margin - 28, currentY + 5, { align: 'right' });
    }

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`Rs. ${finalPrice.toFixed(2)}`, pageWidth - margin - 6, currentY + 5, { align: 'right' });

    // Table Underline
    currentY += 18;
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, currentY, pageWidth - margin, currentY);

    currentY += 8;

    // Payment Details & Totals Section
    const halfWidth = (pageWidth - margin * 2 - 10) / 2;

    // Left Box: Payment Breakdown
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, currentY, halfWidth, 42, 3, 3, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, currentY, halfWidth, 42, 3, 3, 'S');

    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('PAYMENT BREAKDOWN', margin + 6, currentY + 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);

    if (isSplit) {
      doc.text('Settlement: Split Payment', margin + 6, currentY + 14);
      let splitY = currentY + 20;
      if (splitCash > 0) {
        doc.text(`• Cash in Hand: Rs. ${splitCash.toFixed(2)}`, margin + 6, splitY);
        splitY += 6;
      }
      if (splitOnline > 0) {
        doc.text(`• Online UPI / QR: Rs. ${splitOnline.toFixed(2)}`, margin + 6, splitY);
        splitY += 6;
      }
      if (splitKhata > 0) {
        doc.text(`• Digital Khata: Rs. ${splitKhata.toFixed(2)}`, margin + 6, splitY);
      }
    } else {
      doc.text(`Payment Method: ${paymentMethod}`, margin + 6, currentY + 15);
      doc.text(`Transaction Status: ${isPaid ? 'Settled & Verified' : 'Pending Payment'}`, margin + 6, currentY + 22);
      doc.text('Channel: POS Cash Desk / UPI Scanner', margin + 6, currentY + 29);
    }

    // Right Box: Net Totals
    const rightBoxX = margin + halfWidth + 10;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(rightBoxX, currentY, halfWidth, 42, 3, 3, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(rightBoxX, currentY, halfWidth, 42, 3, 3, 'S');

    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text('Subtotal:', rightBoxX + 6, currentY + 10);
    doc.text(`Rs. ${basePrice.toFixed(2)}`, rightBoxX + halfWidth - 6, currentY + 10, { align: 'right' });

    if (discountAmount > 0) {
      doc.setTextColor(16, 185, 129);
      const discountLabel = discountReason
        ? `Discount (${discountPercentage}% - ${discountReason.slice(0, 16)}):`
        : `Discount (${discountPercentage}%):`;
      doc.text(discountLabel, rightBoxX + 6, currentY + 18);
      doc.text(`-Rs. ${discountAmount.toFixed(2)}`, rightBoxX + halfWidth - 6, currentY + 18, { align: 'right' });
    } else {
      doc.setTextColor(100, 116, 139);
      doc.text('Discount:', rightBoxX + 6, currentY + 18);
      doc.text('Rs. 0.00', rightBoxX + halfWidth - 6, currentY + 18, { align: 'right' });
    }

    // Divider inside total box
    doc.setDrawColor(212, 175, 55);
    doc.setLineWidth(0.5);
    doc.line(rightBoxX + 6, currentY + 23, rightBoxX + halfWidth - 6, currentY + 23);

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('TOTAL NET AMOUNT:', rightBoxX + 6, currentY + 32);

    doc.setTextColor(212, 175, 55); // Gold highlight
    doc.setFontSize(13);
    doc.text(`Rs. ${finalPrice.toFixed(2)}`, rightBoxX + halfWidth - 6, currentY + 32, { align: 'right' });

    // Terms & Guarantee Note
    currentY += 52;
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin, currentY, pageWidth - margin * 2, 22, 2, 2, 'F');

    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('SERVICE GUARANTEE & INVOICE TERMS:', margin + 6, currentY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text('1. All detailing and wash services come with a 24-hour shine satisfaction guarantee.', margin + 6, currentY + 11);
    doc.text('2. Please inspect your vehicle thoroughly before leaving the spa premises.', margin + 6, currentY + 15);
    doc.text('3. This is an electronically generated tax invoice that does not require a physical signature.', margin + 6, currentY + 19);

    // Footer
    const footerY = pageHeight - 16;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);

    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.text('"Thank you for trusting Kallayi Car Spa with your vehicle!"', pageWidth / 2, footerY, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(`Autogenerated via Kallayi OS • Verified Digital Receipt • WhatsApp Synced • ID: ${invoice.id}`, pageWidth / 2, footerY + 5, { align: 'center' });

    // 5. Output PDF arraybuffer and stream response
    const pdfArrayBuffer = doc.output('arraybuffer');
    const pdfBuffer = Buffer.from(pdfArrayBuffer);

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="invoice-${invoice.id || numericId}.pdf"`,
        'Content-Length': String(pdfBuffer.length),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (err: unknown) {
    console.error('[PDF Generation Error]:', err);
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
