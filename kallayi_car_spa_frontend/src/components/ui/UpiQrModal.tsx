"use client";

import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check, QrCode, ExternalLink, ShieldCheck, Sparkles, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export interface UpiQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  upiId?: string;
  shopName?: string;
  bookingId?: string | number;
  customerName?: string;
  logoUrl?: string;
  onConfirm?: () => void;
  onPaymentConfirmed?: () => void;
}

export function UpiQrModal({
  isOpen,
  onClose,
  amount,
  upiId: propUpiId,
  shopName: propShopName,
  bookingId,
  customerName,
  logoUrl = "/images/logo/QRlogo.png",
  onConfirm,
  onPaymentConfirmed
}: UpiQrModalProps) {
  const [copiedId, setCopiedId] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 min session timer

  const handleConfirm = onConfirm || onPaymentConfirmed;

  // Strictly resolve UPI ID and Merchant Name (NO hardcoded fallback IDs)
  const upiId = (propUpiId || process.env.NEXT_PUBLIC_UPI_ID || "").trim();
  const shopName = (propShopName || process.env.NEXT_PUBLIC_MERCHANT_NAME || "Kallayi Car Spa").trim();

  // Build standard UPI intent string
  const formattedAmount = Number(amount || 0).toFixed(2);
  const note = bookingId ? `Kallayi Wash #${bookingId}` : `Kallayi Car Spa Payment`;
  const upiUrl = upiId ? `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(shopName)}&am=${formattedAmount}&cu=INR&tn=${encodeURIComponent(note)}` : "";

  useEffect(() => {
    if (!isOpen) return;
    setTimeLeft(300);
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  const handleCopyUpiId = () => {
    if (!upiId) return;
    navigator.clipboard.writeText(upiId);
    setCopiedId(true);
    toast.success("UPI ID copied to clipboard!");
    setTimeout(() => setCopiedId(false), 2000);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTimer = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-2xl flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-[fadeIn_0.2s_ease-out]">
      <div className="bg-[#0c0d10] border border-white/10 rounded-[2.5rem] w-full max-w-md shadow-[0_0_90px_rgba(1,255,255,0.18)] flex flex-col max-h-[90vh] sm:max-h-[95vh] overflow-y-auto scrollbar-hide [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden relative my-auto">
        
        {/* Ambient Top Glow Line */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#01FFFF] via-[#FF2A6D] to-[#01FFFF] shrink-0" />

        {/* Header */}
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#01FFFF]/10 border border-[#01FFFF]/30 text-[#01FFFF]">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-syncopate font-bold text-sm tracking-wider text-white uppercase">Instant UPI Payment</h3>
              <p className="text-[10px] text-[#8E939B] font-mono tracking-widest mt-0.5">Scan &amp; Verify Payment</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition"
            aria-label="Close Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Container */}
        <div className="p-6 flex flex-col items-center justify-center text-center space-y-5 bg-gradient-to-b from-[#12141a]/60 to-[#08090c] shrink-0">
          
          {/* Amount Badge */}
          <div className="bg-black/60 border border-white/10 rounded-2xl px-6 py-3 shadow-inner text-center w-full">
            <span className="text-[10px] text-zinc-400 font-mono uppercase tracking-[0.2em] block mb-0.5">Total Payable Amount</span>
            <div className="text-3xl font-syncopate font-black text-[#01FFFF] tracking-tight">
              ₹{formattedAmount}
            </div>
            {customerName && (
              <p className="text-xs text-zinc-400 mt-1 font-semibold">For: <span className="text-white">{customerName}</span></p>
            )}
          </div>

          {/* QR Code Card or Missing Env Warning */}
          {upiId ? (
            <div className="relative p-5 bg-white rounded-3xl shadow-[0_0_40px_rgba(1,255,255,0.25)] border-4 border-[#01FFFF] transition-transform hover:scale-[1.02]">
              <QRCodeSVG
                value={upiUrl}
                size={210}
                level="H"
                bgColor="#ffffff"
                fgColor="#0a0a0d"
                imageSettings={{
                  src: logoUrl,
                  x: undefined,
                  y: undefined,
                  height: 44,
                  width: 44,
                  excavate: true,
                }}
              />
            </div>
          ) : (
            <div className="w-full p-6 bg-rose-950/20 border border-rose-500/30 rounded-2xl flex flex-col items-center justify-center text-center">
              <AlertCircle className="w-10 h-10 text-[#FF2A6D] mb-2" />
              <h4 className="font-bold text-xs text-white uppercase tracking-wider mb-1">UPI ID Not Configured</h4>
              <p className="text-[11px] text-zinc-400 max-w-xs">
                Please add <code className="bg-black/60 px-1.5 py-0.5 rounded text-[#01FFFF]">NEXT_PUBLIC_UPI_ID</code> to your <code className="bg-black/60 px-1.5 py-0.5 rounded text-[#01FFFF]">.env.local</code> file and restart the dev server.
              </p>
            </div>
          )}

          {/* Apps Supported Badges */}
          <div className="flex items-center justify-center gap-2 text-[10px] text-zinc-400 font-mono tracking-wider uppercase bg-white/5 px-4 py-1.5 rounded-full border border-white/5">
            <span>GPay</span> • <span>PhonePe</span> • <span>Paytm</span> • <span>BHIM UPI</span>
          </div>

          {/* Countdown & Status */}
          <div className="flex items-center justify-between w-full text-xs px-2 text-zinc-400 font-mono">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>256-Bit Encrypted</span>
            </div>
            <div className="flex items-center gap-1.5 font-bold text-amber-400">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Expires: {formattedTimer}</span>
            </div>
          </div>

          {/* Copy UPI Details */}
          <div className="w-full bg-black/40 border border-white/10 rounded-2xl p-3 text-left space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-zinc-400 font-mono uppercase tracking-wider">UPI VPA ID</span>
              <button
                type="button"
                onClick={handleCopyUpiId}
                className="text-[10px] text-[#01FFFF] hover:text-white flex items-center gap-1 font-bold uppercase transition"
              >
                {copiedId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copiedId ? 'Copied!' : 'Copy ID'}
              </button>
            </div>
            <div className="font-mono text-xs font-bold text-white tracking-wide truncate bg-white/5 px-3 py-2 rounded-xl border border-white/5">
              {upiId}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-white/10 bg-black/60 flex flex-col gap-3 shrink-0">
          <a
            href={upiUrl}
            className="w-full py-3 bg-white/10 border border-white/20 hover:border-[#01FFFF] hover:bg-[#01FFFF]/10 text-white font-syncopate font-bold text-xs uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95 text-center"
          >
            <ExternalLink className="w-4 h-4 text-[#01FFFF]" /> Open in Mobile UPI App
          </a>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="w-1/3 py-3.5 bg-white/5 border border-white/10 text-zinc-300 hover:text-white font-syncopate font-bold text-xs uppercase tracking-widest rounded-xl transition hover:bg-white/10 active:scale-95"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={() => {
                if (handleConfirm) {
                  handleConfirm();
                }
                onClose();
              }}
              className="flex-1 py-3.5 bg-[#00FF9D] text-slate-950 font-syncopate font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-white transition shadow-[0_0_25px_rgba(0,255,157,0.4)] flex items-center justify-center gap-2 active:scale-95"
            >
              <Sparkles className="w-4 h-4" /> Confirm Payment Received
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
