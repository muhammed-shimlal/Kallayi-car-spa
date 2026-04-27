'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Montserrat, Playfair_Display } from "next/font/google";
import api from '@/lib/api';

const montserrat = Montserrat({ subsets: ["latin"], weight: ["300", "400", "500", "600"] });
const playfair = Playfair_Display({ subsets: ["latin"], weight: ["400", "500", "600", "700"], style: ["normal", "italic"] });

function InvoiceContent() {
  const searchParams = useSearchParams();
  const idStr = searchParams?.get('id');
  
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!idStr) {
      setError("No invoice ID provided.");
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        // Single request — invoice_status & invoice_amount are now embedded in the booking response
        const bookingRes = await api.get(`/bookings/${idStr}/`);
        const b = bookingRes.data;

        const pkgName = b.service_package_name || b.service_package_details?.name || 'Service Wash';
        const vehiclePlate = b.vehicle_plate || b.vehicle_info || 'Unknown Plate';

        // invoice_amount is the source of truth; fall back to package price
        const rawAmount = b.invoice_amount
            ? parseFloat(b.invoice_amount)
            : (b.service_package_details?.price ? parseFloat(b.service_package_details.price) : 0);

        setData({
            invoiceId: `INV-${b.id.toString().padStart(4, '0')}`,
            customerName: b.customer_name || 'Walk-In Guest',
            vehiclePlate,
            date: new Date(b.created_at || b.end_time || b.time_slot).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
            packageName: pkgName,
            price: rawAmount,
            invoiceStatus: b.invoice_status || 'UNPAID',
            paymentMethod: b.payment_method || null,
        });
      } catch (err) {
          console.error(err);
          setError("Failed to fetch invoice details. Ensure you are logged in.");
      } finally {
          setIsLoading(false);
      }
    };

    fetchData();
  }, [idStr]);

  if (isLoading) {
    return (
      <div className={`min-h-screen bg-[#0a0a0a] flex items-center justify-center ${montserrat.className}`}>
        <div className="text-[#D4AF37] font-bold tracking-widest uppercase text-sm animate-pulse">Retrieving Invoice Data...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={`min-h-screen bg-[#0a0a0a] flex items-center justify-center ${montserrat.className}`}>
        <div className="text-[#E52323] font-bold tracking-widest uppercase text-sm">{error || "Data not found"}</div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-[#0a0a0a] py-16 px-4 sm:px-8 flex items-center justify-center ${montserrat.className}`}>
      <div className="w-full max-w-[850px] bg-[#141414] shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-[#333333] relative overflow-hidden">
        
        {/* Top Gold Accent Bar */}
        <div className="h-1 w-full bg-gradient-to-r from-[#b38e21] via-[#D4AF37] to-[#b38e21]" />

        <div className="p-10 md:p-14">
          
          {/* Header Section */}
          <div className="flex flex-col md:flex-row justify-between items-start mb-12 gap-8 md:gap-0">
            <div>
              <h1 className={`${playfair.className} text-4xl md:text-5xl text-[#D4AF37] mb-2 tracking-tight`}>
                Kallayi Car Spa
              </h1>
              <div className="text-[#888888] text-sm leading-relaxed space-y-1">
                <p>123 Luxury Avenue, Suite 100</p>
                <p>Beverly Hills, CA 90210</p>
              </div>
            </div>

            <div className="text-left md:text-right flex flex-col md:items-end">
              <h2 className="text-3xl font-light tracking-[0.2em] text-[#EAEAEA] mb-2 uppercase">Invoice</h2>
              <div className="text-[#888888] mb-3">
                ID: <span className="text-[#EAEAEA] font-medium">{data.invoiceId}</span>
              </div>
              <div className={`${playfair.className} text-[#D4AF37] text-xl tracking-[0.1em]`}>★★★★★</div>
            </div>
          </div>

          {/* Client Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
            {[
              { label: "Date", value: data.date },
              { label: "Client Name", value: data.customerName },
              { label: "Vehicle No", value: data.vehiclePlate }
            ].map((info, idx) => (
              <div key={idx} className="flex flex-col">
                <span className="text-[#D4AF37] text-[10px] font-semibold uppercase tracking-widest mb-1">{info.label}</span>
                <div className="text-[#EAEAEA] pb-2 border-b border-[#333333] text-sm md:text-base font-medium">{info.value}</div>
              </div>
            ))}
          </div>

          {/* Items Table */}
          <div className="mb-12 overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[500px]">
              <thead>
                <tr>
                  <th className={`${playfair.className} text-[#D4AF37] font-semibold text-lg pb-4 border-b-2 border-[#D4AF37] w-1/2`}>Service Description</th>
                  <th className={`${playfair.className} text-[#D4AF37] font-semibold text-lg pb-4 border-b-2 border-[#D4AF37] text-right w-1/4`}>Unit Price</th>
                  <th className={`${playfair.className} text-[#D4AF37] font-semibold text-lg pb-4 border-b-2 border-[#D4AF37] text-right w-1/4`}>Total Price</th>
                </tr>
              </thead>
              <tbody className="text-[#EAEAEA]">
                <tr className="group">
                  <td className="py-5 border-b border-[#333333] text-sm md:text-base pr-4 transition-colors group-hover:bg-[#1a1a1a]">{data.packageName}</td>
                  <td className="py-5 border-b border-[#333333] text-sm md:text-base text-right transition-colors group-hover:bg-[#1a1a1a]">₹{data.price.toFixed(2)}</td>
                  <td className="py-5 border-b border-[#333333] text-sm md:text-base text-right font-medium transition-colors group-hover:bg-[#1a1a1a]">₹{data.price.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Total Section */}
          <div className="flex justify-end mb-16">
            <div className="bg-[#1a1a1a] border-l-[3px] border-[#D4AF37] p-6 md:p-8 w-full sm:w-[350px]">
              <div className="flex justify-between items-end">
                <div className="flex flex-col flex-1">
                  <span className="text-[#888888] text-xs font-semibold tracking-wider uppercase mb-1">Total Amount</span>
                  <span className="text-[#888888] text-[10px] uppercase">Tax Included</span>
                </div>
                <div className={`${playfair.className} text-[#D4AF37] text-3xl md:text-4xl font-bold leading-none`}>
                  ₹{Math.floor(data.price)}
                  <span className="text-xl md:text-2xl text-[#b38e21]">.{(data.price % 1).toFixed(2).split('.')[1]}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Section */}
          <div className="border-t border-[#333333] pt-8 flex flex-col md:flex-row justify-between items-start gap-6 md:gap-0">
            <div className="space-y-4">
              <p className={`${playfair.className} italic text-[#EAEAEA] text-lg`}>&quot;Thank you for trusting us with your vehicle.&quot;</p>
              
              {/* Payment Status Badge */}
              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
                    data.invoiceStatus === 'PAID'
                      ? 'bg-[#01FFFF]/10 border-[#01FFFF]/40 text-[#01FFFF]'
                      : 'bg-[#E52323]/10 border-[#E52323]/40 text-[#E52323]'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    data.invoiceStatus === 'PAID' ? 'bg-[#01FFFF]' : 'bg-[#E52323]'
                  }`} />
                  {data.invoiceStatus === 'PAID' ? 'PAID' : 'NOT PAID'}
                </span>
                {data.paymentMethod && (
                  <span className="text-[#888888] uppercase text-[9px] tracking-widest font-semibold">
                    via {data.paymentMethod === 'SPLIT' ? 'Split Payment' : data.paymentMethod}
                  </span>
                )}
              </div>
            </div>
            <div className="text-left md:text-right text-[#888888] text-xs space-y-2 w-full md:w-auto">
              <p className="hover:text-[#D4AF37] transition-colors cursor-pointer">kallayicarspa@example.com</p>
              <p>+91 (555) 000-0000</p>
              <p className="hover:text-[#D4AF37] transition-colors cursor-pointer">www.kallayicarspa.com</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default function InvoicePreview() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
                <div className="text-[#D4AF37] font-bold tracking-widest uppercase text-sm animate-pulse">Initializing Secure Terminal...</div>
            </div>
        }>
            <InvoiceContent />
        </Suspense>
    );
}
