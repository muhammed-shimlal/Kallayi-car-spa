'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Montserrat, Playfair_Display, JetBrains_Mono } from 'next/font/google';

const montserrat = Montserrat({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700'] });
const playfair = Playfair_Display({ subsets: ['latin'], weight: ['400', '500', '600', '700'], style: ['normal', 'italic'] });
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500', '700'] });

interface InvoiceData {
  id: number;
  invoice_number: string;
  booking_id: number | null;
  created_at: string;
  amount: number;
  base_price: number;
  final_price: number;
  discount_amount: number;
  discount_percentage: number;
  is_paid: boolean;
  payment_method: string;
  split_cash: number;
  split_online: number;
  split_khata: number;
  customer: {
    id: string | null;
    name: string;
    phone: string;
    address: string;
    outstanding_balance?: number;
  };
  vehicle: {
    id: number | null;
    plate_number: string;
    make: string;
    model: string;
    color: string;
    vehicle_type: string;
  };
  service_package: {
    id: number | null;
    name: string;
    description: string;
    price: number;
    duration_minutes?: number;
  };
}

function InvoiceContent() {
  const searchParams = useSearchParams();
  const idStr = searchParams?.get('id');

  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setInvoice(null);
    setError('');
    setIsLoading(true);

    if (!idStr) {
      setError('No invoice ID provided.');
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const fetchInvoiceData = async () => {
      try {
        const res = await fetch(`/api/invoices/${idStr}`);
        const result = await res.json();

        if (!isMounted) return;

        if (res.ok && result.success && result.data) {
          setInvoice(result.data);
        } else {
          setError(result.error || `Invoice #${idStr} could not be retrieved.`);
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : 'Network error loading invoice.';
        setError(msg);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchInvoiceData();

    return () => {
      isMounted = false;
    };
  }, [idStr]);

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  if (isLoading) {
    return (
      <div className={`min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center ${montserrat.className}`}>
        <div className="w-12 h-12 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin mb-4" />
        <div className="text-[#D4AF37] font-bold tracking-widest uppercase text-xs animate-pulse">
          Retrieving Digital Receipt...
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className={`min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-6 ${montserrat.className}`}>
        <div className="w-16 h-16 rounded-full bg-[#E52323]/10 border border-[#E52323]/30 flex items-center justify-center mb-4 text-[#E52323] text-2xl font-bold">
          !
        </div>
        <h2 className="text-white text-lg font-bold mb-2 uppercase tracking-wide">Receipt Not Available</h2>
        <p className="text-[#888888] text-xs text-center max-w-sm mb-6">{error || 'The requested invoice was not found.'}</p>
        <button
          onClick={() => window.history.back()}
          className="px-6 py-2.5 bg-[#141414] hover:bg-[#202020] border border-[#333333] text-white text-xs font-semibold rounded-lg transition-all"
        >
          Return to App
        </button>
      </div>
    );
  }

  const invoiceDate = new Date(invoice.created_at);
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

  const isSplit = invoice.payment_method === 'SPLIT' || (invoice.split_cash > 0 && invoice.split_online > 0);

  return (
    <div className={`min-h-screen bg-[#0a0a0a] py-6 sm:py-12 px-3 sm:px-6 flex flex-col items-center justify-start print:bg-white print:p-0 print:m-0 ${montserrat.className}`}>
      
      {/* Top Action Bar (Screen Only) */}
      <div className="w-full max-w-[850px] mb-6 flex items-center justify-between print:hidden">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#00FF88] animate-ping" />
          <span className="text-[#00FF88] text-xs font-bold uppercase tracking-wider">
            Live Receipt
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#D4AF37] to-[#AA8010] hover:from-[#e5c04b] hover:to-[#be9117] text-black font-bold text-xs uppercase tracking-widest rounded-lg shadow-lg hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] transition-all cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Receipt (Thermal / 80mm)
          </button>
        </div>
      </div>

      {/* Main Luxury Receipt Container */}
      <div className="w-full max-w-[850px] bg-[#141414] print:bg-white print:text-black print:shadow-none print:border-none shadow-[0_25px_60px_rgba(0,0,0,0.7)] border border-[#2a2a2a] relative overflow-hidden rounded-xl print:rounded-none">
        
        {/* Top Gold Accent Ribbon (Screen Only) */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#8a6c14] via-[#D4AF37] to-[#8a6c14] print:hidden" />

        <div className="p-6 sm:p-10 md:p-12 print:p-4">
          
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row justify-between items-start pb-8 border-b border-[#262626] print:border-black print:border-b gap-6 sm:gap-0">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[#D4AF37] print:text-black font-extrabold text-sm tracking-widest uppercase">
                  ✦ Luxury Auto Care
                </span>
              </div>
              <h1 className={`${playfair.className} text-3xl sm:text-4xl text-[#D4AF37] print:text-black font-bold tracking-tight mb-2`}>
                Kallayi Car Spa
              </h1>
              <div className="text-[#888888] print:text-black text-xs leading-relaxed space-y-0.5">
                <p>Kallayi Bridge Road, Calicut, Kerala 673003</p>
                <p>Helpline: +91 98470 00000 | info@kallayicarspa.com</p>
                <p className="font-mono text-[11px] text-[#666] print:text-black">GSTIN: 32AABCK9876Q1Z2</p>
              </div>
            </div>

            <div className="text-left sm:text-right flex flex-col sm:items-end">
              <div className="inline-block px-3 py-1 bg-[#D4AF37]/10 print:bg-gray-100 border border-[#D4AF37]/30 print:border-black rounded text-[#D4AF37] print:text-black text-[10px] font-bold tracking-widest uppercase mb-2">
                Tax Invoice / Receipt
              </div>
              <div className="text-sm font-semibold text-[#EAEAEA] print:text-black">
                {invoice.invoice_number}
              </div>
              <div className="text-xs text-[#888888] print:text-black mt-1 font-mono">
                {formattedDate} • {formattedTime}
              </div>
              <div className="text-[11px] text-[#888888] print:text-black mt-0.5">
                Booking Ref: <span className="text-white print:text-black font-medium">#{invoice.booking_id || invoice.id}</span>
              </div>
            </div>
          </div>

          {/* Customer & Vehicle Credentials Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-6 border-b border-[#262626] print:border-black print:border-b">
            <div>
              <span className="text-[#D4AF37] print:text-black text-[10px] font-bold uppercase tracking-wider block mb-1">
                Customer Name
              </span>
              <p className="text-white print:text-black font-semibold text-sm truncate">
                {invoice.customer.name}
              </p>
              <p className="text-[#777777] print:text-black text-xs font-mono">
                {invoice.customer.phone || 'Walk-In'}
              </p>
            </div>

            <div>
              <span className="text-[#D4AF37] print:text-black text-[10px] font-bold uppercase tracking-wider block mb-1">
                Vehicle Plate
              </span>
              <span className={`${mono.className} text-[#00FF88] print:text-black font-bold text-sm tracking-wider uppercase bg-[#00FF88]/10 print:bg-transparent px-2 py-0.5 rounded border border-[#00FF88]/30 print:border-none inline-block`}>
                {invoice.vehicle.plate_number}
              </span>
            </div>

            <div>
              <span className="text-[#D4AF37] print:text-black text-[10px] font-bold uppercase tracking-wider block mb-1">
                Vehicle Model
              </span>
              <p className="text-white print:text-black font-medium text-xs">
                {invoice.vehicle.make} {invoice.vehicle.model}
              </p>
              <p className="text-[#777777] print:text-black text-[11px] uppercase">
                {invoice.vehicle.vehicle_type}
              </p>
            </div>

            <div>
              <span className="text-[#D4AF37] print:text-black text-[10px] font-bold uppercase tracking-wider block mb-1">
                Payment Status
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                  invoice.is_paid
                    ? 'bg-[#00FF88]/10 print:bg-gray-100 border-[#00FF88]/40 print:border-black text-[#00FF88] print:text-black'
                    : 'bg-[#FF2A6D]/10 border-[#FF2A6D]/40 text-[#FF2A6D] print:text-black'
                }`}>
                  {invoice.is_paid ? 'PAID' : 'PENDING'}
                </span>
              </div>
            </div>
          </div>

          {/* Itemized Services Table */}
          <div className="my-6 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#333333] print:border-black">
                  <th className="py-3 text-[#D4AF37] print:text-black font-semibold text-xs uppercase tracking-wider w-1/2">
                    Service Description
                  </th>
                  <th className="py-3 text-[#D4AF37] print:text-black font-semibold text-xs uppercase tracking-wider text-right w-1/4">
                    Base Rate
                  </th>
                  <th className="py-3 text-[#D4AF37] print:text-black font-semibold text-xs uppercase tracking-wider text-right w-1/4">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222222] print:divide-black">
                <tr>
                  <td className="py-4 pr-4">
                    <div className="text-white print:text-black font-semibold text-sm">
                      {invoice.service_package.name}
                    </div>
                    {invoice.service_package.description && (
                      <div className="text-[#777777] print:text-gray-600 text-xs mt-0.5">
                        {invoice.service_package.description}
                      </div>
                    )}
                  </td>
                  <td className="py-4 text-right text-[#aaaaaa] print:text-black text-sm font-mono">
                    ₹{invoice.base_price.toFixed(2)}
                  </td>
                  <td className="py-4 text-right text-white print:text-black text-sm font-semibold font-mono">
                    ₹{invoice.base_price.toFixed(2)}
                  </td>
                </tr>

                {/* Itemized Discount Row (if any) */}
                {invoice.discount_amount > 0 && (
                  <tr className="bg-[#00FF88]/5 print:bg-gray-50">
                    <td className="py-2.5 pr-4">
                      <span className="text-[#00FF88] print:text-black text-xs font-semibold">
                        Special Promo / Loyalty Discount ({invoice.discount_percentage}% OFF)
                      </span>
                    </td>
                    <td className="py-2.5 text-right text-[#00FF88] print:text-black text-xs font-mono">
                      -{invoice.discount_percentage}%
                    </td>
                    <td className="py-2.5 text-right text-[#00FF88] print:text-black text-xs font-mono font-bold">
                      -₹{invoice.discount_amount.toFixed(2)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pricing & Split Breakdown Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-[#262626] print:border-black">
            
            {/* Left: Payment Method & Split Ledger */}
            <div className="space-y-3">
              <span className="text-[#D4AF37] print:text-black text-[10px] font-bold uppercase tracking-wider block">
                Payment Breakdown
              </span>

              {isSplit ? (
                <div className="bg-[#1a1a1a] print:bg-transparent border border-[#2d2d2d] print:border-black rounded-lg p-3 space-y-2">
                  <div className="text-[11px] text-[#888888] print:text-black uppercase font-bold tracking-wider mb-1">
                    Split Settlement:
                  </div>
                  {invoice.split_cash > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-white print:text-black flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00FF88]" /> Cash in Hand
                      </span>
                      <span className="font-mono text-white print:text-black font-semibold">
                        ₹{invoice.split_cash.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {invoice.split_online > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-white print:text-black flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#01FFFF]" /> Online UPI / QR
                      </span>
                      <span className="font-mono text-white print:text-black font-semibold">
                        ₹{invoice.split_online.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {invoice.split_khata > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-white print:text-black flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#FFB800]" /> Digital Khata (Credit)
                      </span>
                      <span className="font-mono text-[#FFB800] print:text-black font-semibold">
                        ₹{invoice.split_khata.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 bg-[#1a1a1a] print:bg-transparent border border-[#2d2d2d] print:border-black rounded-lg">
                  <span className="text-xs text-[#aaaaaa] print:text-black uppercase font-bold tracking-wider">
                    Paid via:
                  </span>
                  <span className="text-xs text-[#00FF88] print:text-black font-bold uppercase font-mono">
                    {invoice.payment_method || 'CASH'}
                  </span>
                </div>
              )}

              {/* WhatsApp Verified Badge */}
              <div className="flex items-center gap-2 px-3 py-2 bg-[#00FF88]/10 print:bg-transparent border border-[#00FF88]/30 print:border-black rounded-lg">
                <svg className="w-4 h-4 text-[#00FF88] print:text-black flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <div className="text-[11px] text-[#00FF88] print:text-black font-semibold">
                  Verified Digital Receipt • WhatsApp Synced
                </div>
              </div>
            </div>

            {/* Right: Net Total Box */}
            <div className="flex flex-col justify-end">
              <div className="bg-[#181818] print:bg-transparent border-l-4 border-[#D4AF37] print:border-black p-5 rounded-r-lg space-y-2">
                <div className="flex justify-between text-xs text-[#888888] print:text-black">
                  <span>Subtotal</span>
                  <span className="font-mono text-white print:text-black font-medium">₹{invoice.base_price.toFixed(2)}</span>
                </div>

                {invoice.discount_amount > 0 && (
                  <div className="flex justify-between text-xs text-[#00FF88] print:text-black">
                    <span>Discount</span>
                    <span className="font-mono font-medium">-₹{invoice.discount_amount.toFixed(2)}</span>
                  </div>
                )}

                <div className="border-t border-[#333333] print:border-black pt-2 flex justify-between items-baseline">
                  <div>
                    <span className="text-[#888888] print:text-black text-xs uppercase font-bold tracking-wider block">
                      Total Net Amount
                    </span>
                    <span className="text-[#666666] print:text-black text-[10px]">
                      GST & Service Included
                    </span>
                  </div>
                  <div className={`${playfair.className} text-3xl sm:text-4xl font-bold text-[#D4AF37] print:text-black leading-none`}>
                    ₹{Math.floor(invoice.final_price)}
                    <span className="text-xl sm:text-2xl text-[#b38e21] print:text-black">
                      .{(invoice.final_price % 1).toFixed(2).split('.')[1]}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Thermal / Standard Footer */}
          <div className="mt-10 pt-6 border-t border-[#262626] print:border-black flex flex-col sm:flex-row justify-between items-center text-center sm:text-left gap-4 text-xs text-[#777777] print:text-black">
            <p className={`${playfair.className} italic text-sm text-[#aaaaaa] print:text-black`}>
              &quot;Thank you for trusting Kallayi Car Spa with your vehicle!&quot;
            </p>
            <div className="font-mono text-[11px] text-[#555] print:text-black">
              Autogenerated via Kallayi OS • ID: {invoice.id}
            </div>
          </div>

        </div>
      </div>

      {/* Embedded Thermal Printer CSS */}
      <style jsx global>{`
        @media print {
          body {
            background: #ffffff !important;
            color: #000000 !important;
          }
          @page {
            size: auto;
            margin: 5mm;
          }
        }
      `}</style>
    </div>
  );
}

export default function InvoicePreviewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
          <div className="text-[#D4AF37] font-bold tracking-widest uppercase text-xs animate-pulse">
            Loading Secure Invoice...
          </div>
        </div>
      }
    >
      <InvoiceContent />
    </Suspense>
  );
}
