'use client';

import React, { useState, useEffect } from 'react';
import { X, Check, Banknote, Sparkles, Tag, ChevronDown, ChevronUp, QrCode, CreditCard, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { checkoutPOS } from '@/lib/api';

export interface PaymentPickupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
  booking: any;
  staffProfile?: any;
}

export default function PaymentPickupModal({
  isOpen,
  onClose,
  onSuccess,
  booking,
  staffProfile,
}: PaymentPickupModalProps) {
  if (!isOpen || !booking) return null;

  // Derive catalog base rate
  const catalogBasePrice = Number(
    booking.base_price ??
    booking.service_package?.price ??
    booking.service_price ??
    booking.price ??
    0
  );

  const [isDiscountOpen, setIsDiscountOpen] = useState(false);
  const [payableAmountInput, setPayableAmountInput] = useState<string>(
    String(booking.final_price ?? catalogBasePrice)
  );
  const [discountReason, setDiscountReason] = useState<string>(booking.discount_reason || '');
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'ONLINE' | 'SPLIT' | 'KHATA'>('CASH');
  const [splitCash, setSplitCash] = useState<string>('');
  const [splitOnline, setSplitOnline] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cash collector attribution state (Defaults to Counter/Admin)
  const [collectorType, setCollectorType] = useState<'ADMIN' | 'STAFF'>('ADMIN');
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [staffList, setStaffList] = useState<any[]>([]);

  // Load staff list for collector dropdown
  useEffect(() => {
    api.get('/staff/directory?is_active=true')
      .then((res: any) => {
        const list = res.data?.data || res.data || [];
        if (Array.isArray(list)) {
          setStaffList(list);
        }
      })
      .catch(() => {});
  }, []);

  // Sync state whenever booking changes
  useEffect(() => {
    const initialPrice = Number(booking.final_price ?? catalogBasePrice);
    setPayableAmountInput(String(initialPrice));
    setDiscountReason(booking.discount_reason || '');
    setCollectorType('ADMIN');
    setSelectedStaffId('');
    if (initialPrice < catalogBasePrice) {
      setIsDiscountOpen(true);
    }
  }, [booking, catalogBasePrice]);

  const parsedPayable = parseFloat(payableAmountInput);
  const currentPayable = isNaN(parsedPayable) ? catalogBasePrice : Math.max(0, parsedPayable);
  const discountAmt = Math.max(0, catalogBasePrice - currentPayable);
  const discountPct = catalogBasePrice > 0 ? ((discountAmt / catalogBasePrice) * 100).toFixed(1) : '0.0';

  const quickDiscountChips = ['Customer Bargain', 'Regular', 'Regular Customer', 'Fleet Owner', 'Dirtiness Concession'];

  const handleApplyChip = (chip: string) => {
    setDiscountReason(chip);
  };

  const handlePayableAmountChange = (val: string) => {
    setPayableAmountInput(val);
    const parsed = parseFloat(val);
    const newTotal = isNaN(parsed) ? 0 : Math.max(0, parsed);
    if (paymentMode === 'SPLIT') {
      const currentOnline = parseFloat(splitOnline || '0');
      if (currentOnline === 0) {
        setSplitCash(String(newTotal));
      } else {
        setSplitCash(String(Math.max(0, newTotal - currentOnline)));
      }
    }
  };

  const handleSubmitCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (paymentMode === 'SPLIT') {
      const c = parseFloat(splitCash || '0');
      const o = parseFloat(splitOnline || '0');
      if (Math.abs(c + o - currentPayable) > 1.0) {
        toast.error(`Split payment (₹${c + o}) must equal total payable (₹${currentPayable})`);
        return;
      }
    }

    const isCashInvolved = paymentMode === 'CASH' || (paymentMode === 'SPLIT' && parseFloat(splitCash || '0') > 0);
    if (isCashInvolved && collectorType === 'STAFF' && !selectedStaffId) {
      toast.error('Please select the staff member who collected the physical cash.');
      return;
    }

    const finalStaffId = (isCashInvolved && collectorType === 'STAFF') ? selectedStaffId : null;

    setIsSubmitting(true);
    try {
      await checkoutPOS({
        booking_id: booking.id,
        payment_method: paymentMode === 'ONLINE' ? 'ONLINE' : paymentMode,
        base_price: catalogBasePrice,
        final_price: currentPayable,
        custom_price: currentPayable,
        discount_amount: discountAmt,
        discount_reason: discountReason.trim() || undefined,
        split_cash: paymentMode === 'CASH' ? currentPayable : (paymentMode === 'SPLIT' ? parseFloat(splitCash || '0') : 0),
        split_online: paymentMode === 'ONLINE' ? currentPayable : (paymentMode === 'SPLIT' ? parseFloat(splitOnline || '0') : 0),
        cash_collected_by_staff_id: finalStaffId,
        collected_by_staff_id: finalStaffId,
        collector_type: isCashInvolved ? collectorType : 'ADMIN',
      });

      toast.success(`Vehicle Handover Complete! ₹${currentPayable} collected via ${paymentMode}.`);
      await onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Payment handover error:', err);
      toast.error(err.response?.data?.error || err.message || 'Payment handover failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const plate = booking.vehicle?.plate_number || booking.plate_number || 'KL-XX-0000';
  const customerName = booking.customer?.name || booking.customer_name || 'Walk-In Customer';
  const customerPhone = booking.customer?.phone_number || booking.customer_phone || booking.phone || '';
  const serviceName = booking.service_package?.name || booking.service_name || 'Wash Service';

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-[#0E0F12] border border-white/10 rounded-3xl w-full max-w-lg shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden my-auto">
        
        {/* Header */}
        <div className="p-5 sm:p-6 bg-[#141518] border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-mono text-sm sm:text-base font-black uppercase text-white tracking-wider">
                PAYMENT &amp; PICKUP HANDOVER
              </h2>
              <p className="text-[11px] text-neutral-400 font-mono">
                Verify negotiated price &amp; tender settlement
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-full hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmitCheckout} className="p-5 sm:p-6 space-y-5">
          
          {/* Booking Summary Box */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2.5 text-xs font-mono">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-black px-2.5 py-0.5 rounded-lg bg-white/10 border border-white/20 text-white tracking-wider">
                  {plate}
                </span>
                <span className="text-[10px] text-[#01FFFF] bg-[#01FFFF]/10 border border-[#01FFFF]/20 px-2 py-0.5 rounded font-bold uppercase">
                  Ready
                </span>
              </div>
              <div className="text-right">
                <span className="text-neutral-400 text-[10px] uppercase block">Catalog Base</span>
                <span className="text-white font-bold text-sm">₹{catalogBasePrice}</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-neutral-300 pt-1">
              <span>{serviceName}</span>
              <span>{customerName} {customerPhone ? `(${customerPhone})` : ''}</span>
            </div>
          </div>

          {/* Special Discount / Negotiated Price Toggle */}
          <div className="rounded-2xl border border-white/10 bg-black/40 overflow-hidden">
            <button
              type="button"
              onClick={() => setIsDiscountOpen(!isDiscountOpen)}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Tag className="w-4 h-4 text-[#01FFFF]" />
                <div>
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-white block">
                    Apply Special Discount / Custom Price
                  </span>
                  <span className="text-[10px] text-neutral-400 font-mono">
                    Counter bargain or concession override
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {discountAmt > 0 && (
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded font-mono text-[10px] font-bold">
                    Discount: -₹{discountAmt} ({discountPct}% OFF)
                  </span>
                )}
                {isDiscountOpen ? (
                  <ChevronUp className="w-4 h-4 text-neutral-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-neutral-400" />
                )}
              </div>
            </button>

            {isDiscountOpen && (
              <div className="p-4 pt-0 space-y-4 border-t border-white/5">
                <div>
                  <label className="font-mono text-[11px] text-neutral-300 uppercase tracking-wider block mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span>Payable Amount (₹)</span>
                      {discountAmt > 0 && (
                        <span className="text-emerald-400 text-[10px] font-bold">
                          (Discount: -₹{discountAmt} / {discountPct}% OFF)
                        </span>
                      )}
                    </span>
                    <span className="text-neutral-500 text-[10px]">Pre-filled with ₹{catalogBasePrice}</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono font-bold text-lg text-[#01FFFF]">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max={catalogBasePrice}
                      value={payableAmountInput}
                      onChange={(e) => handlePayableAmountChange(e.target.value)}
                      className="w-full bg-[#141518] border border-[#01FFFF]/40 focus:border-[#01FFFF] rounded-xl pl-9 pr-4 py-2.5 text-lg font-mono font-bold text-white outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Discount Reason & Chips */}
                <div>
                  <label className="font-mono text-[10px] text-neutral-400 uppercase tracking-wider block mb-1.5">
                    Discount Reason {discountAmt > 0 ? <strong className="text-amber-400 font-normal">(Reason Recommended)</strong> : ''}
                  </label>
                  <input
                    type="text"
                    value={discountReason}
                    onChange={(e) => setDiscountReason(e.target.value)}
                    placeholder="e.g. Regular Customer, Bargain, Fleet Owner..."
                    className="w-full bg-[#141518] border border-white/10 focus:border-[#01FFFF] rounded-xl px-3 py-2 text-xs font-mono text-white placeholder:text-neutral-600 outline-none"
                  />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {quickDiscountChips.map((chip) => (
                      <button
                        type="button"
                        key={chip}
                        onClick={() => handleApplyChip(chip)}
                        className={`text-[10px] font-mono px-2.5 py-1 rounded-lg border transition-all ${
                          discountReason === chip
                            ? 'bg-[#01FFFF]/20 border-[#01FFFF] text-[#01FFFF] font-bold'
                            : 'bg-white/5 border-white/10 text-neutral-400 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        + {chip}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Payment Method Selection */}
          <div className="space-y-2">
            <label className="font-mono text-xs text-neutral-300 uppercase tracking-wider block">
              Payment Method
            </label>
            <div className="grid grid-cols-3 gap-2 font-mono text-xs">
              {[
                { id: 'CASH', label: 'Cash', icon: Banknote },
                { id: 'ONLINE', label: 'UPI / QR', icon: QrCode },
                { id: 'SPLIT', label: 'Split Pay', icon: CreditCard },
              ].map((m) => {
                const isSelected = paymentMode === m.id;
                const Icon = m.icon;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setPaymentMode(m.id as any);
                      if (m.id === 'SPLIT' && (!splitCash || splitCash === '0')) {
                        setSplitCash(String(currentPayable));
                        setSplitOnline('0');
                      }
                    }}
                    className={`py-3 px-2 rounded-xl border flex flex-col items-center justify-center gap-1 font-bold transition-all ${
                      isSelected
                        ? 'bg-amber-400 text-[#050507] border-amber-400 shadow-md scale-[1.02]'
                        : 'bg-white/5 text-neutral-400 border-white/10 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Split inputs if SPLIT selected */}
            {paymentMode === 'SPLIT' && (
              <div className="grid grid-cols-2 gap-3 p-3 bg-white/5 border border-white/10 rounded-xl mt-2 font-mono text-xs">
                <div>
                  <label className="text-[10px] text-neutral-400 uppercase block mb-1">Cash Part (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={splitCash}
                    onChange={(e) => setSplitCash(e.target.value)}
                    placeholder="0"
                    className="w-full bg-[#141518] border border-white/10 rounded-lg p-2 text-white outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-neutral-400 uppercase block mb-1">Online / UPI Part (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={splitOnline}
                    onChange={(e) => setSplitOnline(e.target.value)}
                    placeholder="0"
                    className="w-full bg-[#141518] border border-white/10 rounded-lg p-2 text-white outline-none focus:border-amber-400"
                  />
                </div>
              </div>
            )}
          </div>

          {/* ── CASH COLLECTOR SELECTION (WHEN CASH IS INVOLVED) ── */}
          {(paymentMode === 'CASH' || (paymentMode === 'SPLIT' && (parseFloat(splitCash || '0') > 0 || !splitCash))) && (
            <div className="space-y-3 p-3.5 sm:p-4 bg-[#141518] border border-white/10 rounded-2xl font-mono text-xs animate-in fade-in">
              <div className="flex items-center justify-between">
                <label className="text-[10px] text-neutral-300 uppercase font-bold tracking-[0.2em] flex items-center gap-1.5">
                  <span>💵 Cash Collection Target</span>
                </label>
                <span className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider">
                  Physical Tender
                </span>
              </div>

              {/* Dual Option Toggle Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCollectorType('ADMIN');
                    setSelectedStaffId('');
                  }}
                  className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                    collectorType === 'ADMIN'
                      ? 'bg-emerald-500/15 border-emerald-500/50 text-white shadow-sm'
                      : 'bg-white/5 border-white/10 text-neutral-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                    collectorType === 'ADMIN' ? 'border-emerald-400 bg-emerald-500' : 'border-neutral-500'
                  }`}>
                    {collectorType === 'ADMIN' && <span className="w-1.5 h-1.5 rounded-full bg-[#050507]" />}
                  </div>
                  <div>
                    <div className="font-bold text-white text-xs">Collected at Counter / Directly by Admin</div>
                    <div className="text-[10px] text-neutral-400">Direct register till deposit</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCollectorType('STAFF');
                    if (!selectedStaffId && staffProfile?.id) {
                      setSelectedStaffId(String(staffProfile.id));
                    }
                  }}
                  className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                    collectorType === 'STAFF'
                      ? 'bg-amber-500/15 border-amber-500/50 text-white shadow-sm'
                      : 'bg-white/5 border-white/10 text-neutral-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                    collectorType === 'STAFF' ? 'border-amber-400 bg-amber-500' : 'border-neutral-500'
                  }`}>
                    {collectorType === 'STAFF' && <span className="w-1.5 h-1.5 rounded-full bg-[#050507]" />}
                  </div>
                  <div>
                    <div className="font-bold text-white text-xs">Collected by Staff Member (at Bay/Floor)</div>
                    <div className="text-[10px] text-neutral-400">Worker cash custody</div>
                  </div>
                </button>
              </div>

              {/* Option 1: Green Badge */}
              {collectorType === 'ADMIN' && (
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>✓ Direct Shop Till Deposit (No staff handover required)</span>
                </div>
              )}

              {/* Option 2: Staff Dropdown & Alert */}
              {collectorType === 'STAFF' && (
                <div className="space-y-2 pt-1 animate-in fade-in">
                  <select
                    required
                    value={selectedStaffId}
                    onChange={(e) => setSelectedStaffId(e.target.value)}
                    className="w-full bg-[#141518] border border-amber-500/40 py-2.5 px-3 rounded-xl text-white text-xs font-semibold focus:outline-none focus:border-amber-400 cursor-pointer"
                  >
                    <option value="" className="text-neutral-400">-- Select Staff Member Who Took Cash --</option>
                    {staffList.map((s: any) => (
                      <option key={String(s.id)} value={String(s.id)} className="bg-[#141518] text-white">
                        {s.first_name || s.name || s.full_name || s.username || `Staff #${s.id}`} ({s.role || 'Staff'})
                      </option>
                    ))}
                  </select>

                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] flex items-start gap-2">
                    <span className="text-base shrink-0 leading-none">⚠️</span>
                    <span>
                      Cash Custody Alert: ₹{paymentMode === 'CASH' ? currentPayable : parseFloat(splitCash || '0')} will be assigned to{' '}
                      <strong>
                        {staffList.find((s: any) => String(s.id) === String(selectedStaffId))?.name ||
                         staffList.find((s: any) => String(s.id) === String(selectedStaffId))?.full_name ||
                         staffList.find((s: any) => String(s.id) === String(selectedStaffId))?.username ||
                         (staffProfile?.id === selectedStaffId ? (staffProfile?.full_name || staffProfile?.username) : 'Selected Staff')}
                      </strong>
                      &apos;s &quot;Cash in Hand&quot; and must be handed over during EOD reconciliation.
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action CTAs */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-white/5 border border-white/10 hover:bg-white/10 py-3.5 rounded-xl font-mono text-xs text-neutral-300 uppercase tracking-wider font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-2 flex-[2] bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-[#050507] font-mono font-black py-3.5 px-4 rounded-xl text-xs uppercase tracking-wider transition-all shadow-[0_0_25px_rgba(245,158,11,0.25)] flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>
                {isSubmitting ? 'Recording Handover...' : `Complete Payment (₹${currentPayable})`}
              </span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
