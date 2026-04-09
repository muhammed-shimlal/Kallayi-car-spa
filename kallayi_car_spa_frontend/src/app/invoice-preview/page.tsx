import React from 'react';
import { Montserrat, Playfair_Display } from "next/font/google";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

export default function InvoicePreview() {
  return (
    <div className={`min-h-screen bg-[#0a0a0a] py-16 px-4 sm:px-8 flex items-center justify-center ${montserrat.className}`}>
      
      {/* Main Invoice Container */}
      <div className="w-full max-w-[850px] bg-[#141414] shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-[#333333] relative overflow-hidden">
        
        {/* Top Gold Accent Bar */}
        <div className="h-1 w-full bg-gradient-to-r from-[#b38e21] via-[#D4AF37] to-[#b38e21]" />

        <div className="p-10 md:p-14">
          
          {/* Header Section */}
          <div className="flex flex-col md:flex-row justify-between items-start mb-12 gap-8 md:gap-0">
            {/* Left Header */}
            <div>
              <h1 className={`${playfair.className} text-4xl md:text-5xl text-[#D4AF37] mb-2 tracking-tight`}>
                Kallayi Car Spa
              </h1>
              <div className="text-[#888888] text-sm leading-relaxed space-y-1">
                <p>123 Luxury Avenue, Suite 100</p>
                <p>Beverly Hills, CA 90210</p>
              </div>
            </div>

            {/* Right Header */}
            <div className="text-left md:text-right flex flex-col md:items-end">
              <h2 className="text-3xl font-light tracking-[0.2em] text-[#EAEAEA] mb-2 uppercase">
                Invoice
              </h2>
              <div className="text-[#888888] mb-3">
                Invoice ID: <span className="text-[#EAEAEA] font-medium">INV-0097</span>
              </div>
              <div className={`${playfair.className} text-[#D4AF37] text-xl tracking-[0.1em]`}>
                ★★★★★
              </div>
            </div>
          </div>

          {/* Client Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
            {[
              { label: "Date", value: "Oct 24, 2026" },
              { label: "Phone No", value: "+1 (555) 987-6543" },
              { label: "Vehicle No", value: "CA 88X 990" }
            ].map((info, idx) => (
              <div key={idx} className="flex flex-col">
                <span className="text-[#D4AF37] text-[10px] font-semibold uppercase tracking-widest mb-1">
                  {info.label}
                </span>
                <div className="text-[#EAEAEA] pb-2 border-b border-[#333333] text-sm md:text-base font-medium">
                  {info.value}
                </div>
              </div>
            ))}
          </div>

          {/* Items Table */}
          <div className="mb-12 overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[500px]">
              <thead>
                <tr>
                  <th className={`${playfair.className} text-[#D4AF37] font-semibold text-lg pb-4 border-b-2 border-[#D4AF37] w-1/2`}>
                    Service Description
                  </th>
                  <th className={`${playfair.className} text-[#D4AF37] font-semibold text-lg pb-4 border-b-2 border-[#D4AF37] text-right w-1/4`}>
                    Unit Price
                  </th>
                  <th className={`${playfair.className} text-[#D4AF37] font-semibold text-lg pb-4 border-b-2 border-[#D4AF37] text-right w-1/4`}>
                    Total Price
                  </th>
                </tr>
              </thead>
              <tbody className="text-[#EAEAEA]">
                {[
                  { desc: "Exterior Premium Car Wash", price: "$35.00", total: "$35.00" },
                  { desc: "Interior Deep Vacuum & Scent", price: "$20.00", total: "$20.00" },
                  { desc: "Exterior Polish & Ceramic Shine", price: "$40.00", total: "$40.00" }
                ].map((item, idx) => (
                  <tr key={idx} className="group">
                    <td className="py-5 border-b border-[#333333] text-sm md:text-base pr-4 transition-colors group-hover:bg-[#1a1a1a]">
                      {item.desc}
                    </td>
                    <td className="py-5 border-b border-[#333333] text-sm md:text-base text-right transition-colors group-hover:bg-[#1a1a1a]">
                      {item.price}
                    </td>
                    <td className="py-5 border-b border-[#333333] text-sm md:text-base text-right font-medium transition-colors group-hover:bg-[#1a1a1a]">
                      {item.total}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Total Section */}
          <div className="flex justify-end mb-16">
            <div className="bg-[#1a1a1a] border-l-[3px] border-[#D4AF37] p-6 md:p-8 w-full sm:w-[350px]">
              <div className="flex justify-between items-end">
                <div className="flex flex-col flex-1">
                  <span className="text-[#888888] text-xs font-semibold tracking-wider uppercase mb-1">
                    Total Amount Due
                  </span>
                  <span className="text-[#888888] text-[10px] uppercase">
                    Tax Included
                  </span>
                </div>
                <div className={`${playfair.className} text-[#D4AF37] text-4xl md:text-5xl font-bold leading-none`}>
                  $95<span className="text-xl md:text-2xl text-[#b38e21]">.00</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Section */}
          <div className="border-t border-[#333333] pt-8 flex flex-col md:flex-row justify-between items-start gap-6 md:gap-0">
            {/* Footer Left */}
            <div className="space-y-4">
              <p className={`${playfair.className} italic text-[#EAEAEA] text-lg`}>
                "Thank you for trusting us with your vehicle."
              </p>
              <div className="text-sm">
                <span className="text-[#888888] uppercase text-[10px] tracking-wider font-semibold mr-3">Payment Method</span>
                <span className="text-[#EAEAEA] bg-[#1a1a1a] px-3 py-1 border border-[#333333] rounded uppercase text-xs tracking-widest">
                  Credit Card
                </span>
              </div>
            </div>

            {/* Footer Right */}
            <div className="text-left md:text-right text-[#888888] text-xs space-y-2 w-full md:w-auto">
              <p className="hover:text-[#D4AF37] transition-colors cursor-pointer">kallayicarspa@example.com</p>
              <p>+1 (555) 000-0000</p>
              <p className="hover:text-[#D4AF37] transition-colors cursor-pointer">www.kallayicarspa.com</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
