'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
    X, Lock, CheckCircle, AlertTriangle, Printer, RefreshCw, 
    Calendar, TrendingUp, TrendingDown, IndianRupee, ShieldCheck, 
    FileText, Sparkles, Building2, Wallet, Smartphone, Clock
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';

interface EODInflow {
    gross_revenue: number;
    total_cash_collected: number;
    total_upi_collected: number;
    total_credit_issued: number;
    total_washes_count: number;
    invoices_count: number;
}

interface EODOutflow {
    general_expenses_cash: number;
    general_expenses_online: number;
    staff_cash_payouts: number;
    advances_paid: number;
    settled_wages_paid: number;
    bank_savings_deposited: number;
    total_expenses: number;
}

interface EODReconciliation {
    opening_float: number;
    cash_in: number;
    cash_out: number;
    expected_cash_in_hand: number;
}

interface EODProfitability {
    gross_revenue: number;
    total_expenses: number;
    net_profit: number;
}

interface EODPayload {
    date: string;
    is_closed: boolean;
    closing_record: any;
    inflow: EODInflow;
    outflow: EODOutflow;
    reconciliation: EODReconciliation;
    profitability: EODProfitability;
}

interface EODCloseoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialDate?: string;
    onSuccess?: () => void;
}

export default function EODCloseoutModal({ isOpen, onClose, initialDate, onSuccess }: EODCloseoutModalProps) {
    const queryClient = useQueryClient();
    const printAreaRef = useRef<HTMLDivElement>(null);

    // Current IST Date as default
    const todayStr = useMemo(() => {
        try {
            return new Intl.DateTimeFormat('en-CA', {
                timeZone: 'Asia/Kolkata',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
            }).format(new Date());
        } catch {
            return new Date().toISOString().split('T')[0];
        }
    }, []);

    const [selectedDate, setSelectedDate] = useState<string>(initialDate || todayStr);
    const [openingFloat, setOpeningFloat] = useState<number | string>('');
    const [actualCashCounted, setActualCashCounted] = useState<number | string>('');
    const [closingNotes, setClosingNotes] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [eodData, setEodData] = useState<EODPayload | null>(null);

    // Fetch EOD calculations from backend
    const fetchEODData = useCallback(async (date: string, floatVal?: number | string) => {
        setIsLoading(true);
        try {
            const url = new URL('/api/finance/eod', window.location.origin);
            url.searchParams.set('date', date);
            if (floatVal !== undefined && floatVal !== '' && !isNaN(Number(floatVal))) {
                url.searchParams.set('opening_float', String(floatVal));
            }

            const res = await fetch(url.toString(), { cache: 'no-store' });
            const json = await res.json();

            if (json.success && json.data) {
                setEodData(json.data);
                // If opening float not manually set yet, populate from server
                if (floatVal === undefined || floatVal === '') {
                    setOpeningFloat(json.data.reconciliation?.opening_float || 0);
                }
                // If day is already closed, pre-populate actual cash & notes
                if (json.data.is_closed && json.data.closing_record) {
                    setActualCashCounted(json.data.closing_record.actual_cash ?? '');
                    setClosingNotes(json.data.closing_record.notes || '');
                }
            } else {
                toast.error(json.error || 'Failed to calculate EOD metrics.');
            }
        } catch (err: unknown) {
            console.error('[EOD Modal Fetch Error]:', err);
            toast.error('Network error loading EOD metrics.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            fetchEODData(selectedDate);
        }
    }, [isOpen, selectedDate, fetchEODData]);

    // Handle Float change dynamically
    const handleFloatChange = (val: string) => {
        setOpeningFloat(val);
        const num = parseFloat(val);
        if (!isNaN(num)) {
            fetchEODData(selectedDate, num);
        }
    };

    // Calculate dynamic expected cash based on current float
    const dynamicExpectedCash = useMemo(() => {
        if (!eodData) return 0;
        const floatNum = Number(openingFloat || 0);
        const cashIn = Number(eodData.inflow?.total_cash_collected || 0);
        const cashOut = Number(eodData.outflow?.general_expenses_cash || 0) +
                        Number(eodData.outflow?.staff_cash_payouts || 0) +
                        Number(eodData.outflow?.bank_savings_deposited || 0);
        return Math.round(((floatNum + cashIn) - cashOut) * 100) / 100;
    }, [eodData, openingFloat]);

    // Live discrepancy: Actual Cash Counted - Expected Cash
    const discrepancy = useMemo(() => {
        if (actualCashCounted === '' || isNaN(Number(actualCashCounted))) {
            return null;
        }
        const actual = Number(actualCashCounted);
        return Math.round((actual - dynamicExpectedCash) * 100) / 100;
    }, [actualCashCounted, dynamicExpectedCash]);

    // Submit closing / seal register
    const handleSubmitCloseout = async (e: React.FormEvent) => {
        e.preventDefault();
        if (actualCashCounted === '' || isNaN(Number(actualCashCounted))) {
            toast.error('Please enter the physically counted cash amount in drawer.');
            return;
        }

        const confirmMsg = discrepancy === 0
            ? 'Confirm Register Closeout? Drawer is perfectly balanced.'
            : discrepancy! < 0
                ? `Confirm Closeout with a SHORTAGE of -₹${Math.abs(discrepancy!).toLocaleString()}?`
                : `Confirm Closeout with an OVERAGE of +₹${discrepancy!.toLocaleString()}?`;

        if (!window.confirm(confirmMsg)) return;

        setIsSubmitting(true);
        try {
            const res = await fetch('/api/finance/eod', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    date: selectedDate,
                    actual_cash_counted: Number(actualCashCounted),
                    opening_float: Number(openingFloat || 0),
                    notes: closingNotes,
                }),
            });

            const json = await res.json();
            if (json.success) {
                toast.success(json.message || 'Register closed successfully!');
                queryClient.invalidateQueries({ queryKey: ['eodData'] });
                queryClient.invalidateQueries({ queryKey: ['kpiData'] });
                queryClient.invalidateQueries({ queryKey: ['dashboardOverview'] });
                fetchEODData(selectedDate, openingFloat);
                onSuccess?.();
            } else {
                toast.error(json.error || 'Failed to close register.');
            }
        } catch {
            toast.error('Network error saving register closing.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Thermal / Paper print handler
    const handlePrintSummary = () => {
        window.print();
    };

    if (!isOpen) return null;

    const inflow = eodData?.inflow || {
        gross_revenue: 0,
        total_cash_collected: 0,
        total_upi_collected: 0,
        total_credit_issued: 0,
        total_washes_count: 0,
        invoices_count: 0,
    };

    const outflow = eodData?.outflow || {
        general_expenses_cash: 0,
        general_expenses_online: 0,
        staff_cash_payouts: 0,
        advances_paid: 0,
        settled_wages_paid: 0,
        bank_savings_deposited: 0,
        total_expenses: 0,
    };

    const isClosed = Boolean(eodData?.is_closed);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-[fadeIn_0.2s_ease-out]">
            {/* Modal Container */}
            <div className="relative w-full max-w-4xl bg-[#101114] border border-[#01FFFF]/25 rounded-3xl sm:rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden my-auto max-h-[95vh] flex flex-col">
                
                {/* ── TOP HEADER ──────────────────────────────────────────────── */}
                <div className="p-5 sm:p-7 border-b border-white/10 bg-[#0C0D0F] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider bg-[#01FFFF]/10 text-[#01FFFF] border border-[#01FFFF]/30">
                                Official Daily Audit
                            </span>
                            <span className="text-[10px] text-[#8E939B] font-bold uppercase tracking-widest">
                                Kallayi Car Spa &amp; Auto Care
                            </span>
                        </div>
                        <h2 className="font-syncopate font-black text-xl sm:text-2xl text-white tracking-widest flex items-center gap-2.5">
                            <Lock className="w-5 h-5 text-[#01FFFF]" />
                            END OF DAY (EOD) REGISTER CLOSEOUT
                        </h2>
                        <p className="text-[10px] text-[#8E939B] uppercase font-bold tracking-wider mt-0.5">
                            എൻഡ് ഓഫ് ഡേ ക്ലോസിങ് &amp; ക്യാഷ് ഓഡിറ്റ്
                        </p>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        {/* Date Selector */}
                        <div className="flex items-center gap-1.5 bg-[#141518] border border-white/10 px-3 py-1.5 rounded-xl">
                            <Calendar className="w-3.5 h-3.5 text-purple-400" />
                            <input 
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="bg-transparent text-white font-mono text-xs font-bold focus:outline-none cursor-pointer"
                            />
                        </div>

                        {/* Refresh */}
                        <button
                            onClick={() => fetchEODData(selectedDate, openingFloat)}
                            title="Refresh Audit Data"
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-[#8E939B] hover:text-white border border-white/10 transition-colors"
                        >
                            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        </button>

                        {/* Close Modal */}
                        <button
                            onClick={onClose}
                            className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/20 text-[#8E939B] hover:text-rose-400 border border-white/10 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* ── MODAL SCROLLABLE BODY ───────────────────────────────────── */}
                <div ref={printAreaRef} className="p-5 sm:p-7 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                    
                    {/* Status Alert Banner if already closed */}
                    {isClosed && (
                        <div className="bg-emerald-500/10 border border-emerald-500/40 p-4 rounded-2xl flex items-center justify-between gap-3 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                            <div className="flex items-center gap-3">
                                <ShieldCheck className="w-6 h-6 text-emerald-400 flex-shrink-0" />
                                <div>
                                    <h4 className="font-bold text-xs sm:text-sm text-emerald-300 uppercase tracking-wide">
                                        Day Register Locked &amp; Closed
                                    </h4>
                                    <p className="text-[10px] text-emerald-400/80 mt-0.5">
                                        Today&apos;s ledger has been audited and finalized. Physical cash in drawer was sealed.
                                    </p>
                                </div>
                            </div>
                            <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 whitespace-nowrap">
                                LOCKED 🔒
                            </span>
                        </div>
                    )}

                    {/* ── SECTION 1: 3-PILLAR INFLOW BREAKDOWN (THE TRI-SPLIT) ────── */}
                    <div>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-3">
                            <h3 className="font-syncopate font-bold text-xs sm:text-sm text-white uppercase tracking-wider flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-[#01FFFF]" />
                                1. The Inflow Tri-Split (ആകെ വരുമാനം)
                            </h3>
                            <p className="text-[10px] text-[#8E939B] font-mono font-semibold">
                                Total Revenue: <span className="text-[#01FFFF] font-bold">₹{inflow.gross_revenue.toLocaleString('en-IN')}</span> across {inflow.total_washes_count} vehicles
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                            {/* Pillar 1: Physical Cash */}
                            <div className="bg-[#141518]/90 border border-emerald-500/30 p-4 sm:p-5 rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.06)] relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all pointer-events-none" />
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                                        <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                                        Physical Cash
                                    </span>
                                    <span className="text-[9px] text-[#8E939B] font-mono">ഫിസിക്കൽ ക്യാഷ്</span>
                                </div>
                                <h3 className="text-2xl sm:text-3xl font-syncopate font-black text-white tracking-tight">
                                    ₹{inflow.total_cash_collected.toLocaleString('en-IN')}
                                </h3>
                                <div className="mt-2 text-[10px] text-emerald-400/90 font-mono flex items-center justify-between">
                                    <span>Collected in hand</span>
                                    <span className="font-bold">
                                        {inflow.gross_revenue > 0 ? Math.round((inflow.total_cash_collected / inflow.gross_revenue) * 100) : 0}% of rev
                                    </span>
                                </div>
                            </div>

                            {/* Pillar 2: Digital / UPI */}
                            <div className="bg-[#141518]/90 border border-cyan-500/30 p-4 sm:p-5 rounded-2xl shadow-[0_0_20px_rgba(1,255,255,0.06)] relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition-all pointer-events-none" />
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                                        <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
                                        Digital / UPI
                                    </span>
                                    <span className="text-[9px] text-[#8E939B] font-mono">യുപിഐ ഓൺലൈൻ</span>
                                </div>
                                <h3 className="text-2xl sm:text-3xl font-syncopate font-black text-white tracking-tight">
                                    ₹{inflow.total_upi_collected.toLocaleString('en-IN')}
                                </h3>
                                <div className="mt-2 text-[10px] text-cyan-400/90 font-mono flex items-center justify-between">
                                    <span>Direct to Bank</span>
                                    <span className="font-bold">
                                        {inflow.gross_revenue > 0 ? Math.round((inflow.total_upi_collected / inflow.gross_revenue) * 100) : 0}% of rev
                                    </span>
                                </div>
                            </div>

                            {/* Pillar 3: Credit / Khata */}
                            <div className="bg-[#141518]/90 border border-rose-500/30 p-4 sm:p-5 rounded-2xl shadow-[0_0_20px_rgba(244,63,94,0.06)] relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 rounded-full blur-2xl group-hover:bg-rose-500/20 transition-all pointer-events-none" />
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                                        <FileText className="w-3.5 h-3.5 text-rose-400" />
                                        Credit (Khata)
                                    </span>
                                    <span className="text-[9px] text-rose-300 font-mono">ഉദാർ / കടം</span>
                                </div>
                                <h3 className="text-2xl sm:text-3xl font-syncopate font-black text-rose-200 tracking-tight">
                                    ₹{inflow.total_credit_issued.toLocaleString('en-IN')}
                                </h3>
                                <div className="mt-2 text-[10px] text-rose-400/90 font-mono flex items-center justify-between">
                                    <span>Pending Receivables</span>
                                    <span className="font-bold">
                                        {inflow.gross_revenue > 0 ? Math.round((inflow.total_credit_issued / inflow.gross_revenue) * 100) : 0}% of rev
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── SECTION 2: CASH-IN-HAND RECONCILIATION BOX (പെട്ടിയിലെ പണം) ─ */}
                    <div className="bg-[#141518]/80 border border-white/10 rounded-3xl p-5 sm:p-6 space-y-5 shadow-xl">
                        <div className="flex items-center justify-between border-b border-white/5 pb-3">
                            <div>
                                <h3 className="font-syncopate font-bold text-xs sm:text-sm text-white uppercase tracking-wider flex items-center gap-2">
                                    <IndianRupee className="w-4 h-4 text-emerald-400" />
                                    2. Cash Drawer Truth Audit (ക്യാഷ് പെട്ടിയിലെ കണക്ക്)
                                </h3>
                                <p className="text-[10px] text-[#8E939B] uppercase font-bold mt-0.5">
                                    Physical register reconciliation &amp; variance tracking
                                </p>
                            </div>
                            <span className="text-[10px] font-mono text-[#8E939B] hidden sm:inline">
                                Opening Float + Cash In - Outflows
                            </span>
                        </div>

                        {/* Step-by-Step Mathematical Ledger Table */}
                        <div className="space-y-2.5 text-xs font-mono">
                            {/* Opening Float */}
                            <div className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/5">
                                <div className="flex items-center gap-2.5">
                                    <span className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-[11px] font-bold text-white">
                                        (+)
                                    </span>
                                    <span className="text-gray-300 font-sans text-xs">Opening Cash Float (രാവിലെ പെട്ടിയിലുണ്ടായിരുന്ന കാശ്)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-400 text-xs">₹</span>
                                    <input 
                                        type="number"
                                        min="0"
                                        step="any"
                                        disabled={isClosed}
                                        value={openingFloat}
                                        onChange={(e) => handleFloatChange(e.target.value)}
                                        placeholder="0"
                                        className="w-24 bg-[#0A0B0D] border border-white/10 px-2.5 py-1 rounded-lg text-right font-bold text-white focus:outline-none focus:border-[#01FFFF] disabled:opacity-60"
                                    />
                                </div>
                            </div>

                            {/* Customer Cash In */}
                            <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                                <div className="flex items-center gap-2.5">
                                    <span className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center text-[11px] font-bold text-emerald-400">
                                        (+)
                                    </span>
                                    <span className="text-emerald-300 font-sans text-xs">Customer Cash Collected (ഇന്ന് കസ്റ്റമർ തന്ന ഫിസിക്കൽ ക്യാഷ്)</span>
                                </div>
                                <span className="font-bold text-emerald-400 text-sm">
                                    +₹{inflow.total_cash_collected.toLocaleString('en-IN')}
                                </span>
                            </div>

                            {/* General Cash Expenses */}
                            <div className="flex items-center justify-between p-3 rounded-xl bg-rose-500/5 border border-rose-500/20">
                                <div className="flex items-center gap-2.5">
                                    <span className="w-6 h-6 rounded-lg bg-rose-500/20 flex items-center justify-center text-[11px] font-bold text-rose-400">
                                        (-)
                                    </span>
                                    <span className="text-rose-300 font-sans text-xs">Shop Expenses in Cash (ചായ, സാധനങ്ങൾ, ഷോപ്പ് ചിലവുകൾ)</span>
                                </div>
                                <span className="font-bold text-rose-400 text-sm">
                                    -₹{outflow.general_expenses_cash.toLocaleString('en-IN')}
                                </span>
                            </div>

                            {/* Staff Advances / Wages Paid in Cash */}
                            <div className="flex items-center justify-between p-3 rounded-xl bg-rose-500/5 border border-rose-500/20">
                                <div className="flex items-center gap-2.5">
                                    <span className="w-6 h-6 rounded-lg bg-rose-500/20 flex items-center justify-center text-[11px] font-bold text-rose-400">
                                        (-)
                                    </span>
                                    <span className="text-rose-300 font-sans text-xs">Staff Cash Payouts &amp; Advances (തൊഴിലാളി അഡ്വാൻസ് &amp; കൂലി)</span>
                                </div>
                                <span className="font-bold text-rose-400 text-sm">
                                    -₹{outflow.staff_cash_payouts.toLocaleString('en-IN')}
                                </span>
                            </div>

                            {/* Bank Deposits / Savings */}
                            <div className="flex items-center justify-between p-3 rounded-xl bg-rose-500/5 border border-rose-500/20">
                                <div className="flex items-center gap-2.5">
                                    <span className="w-6 h-6 rounded-lg bg-rose-500/20 flex items-center justify-center text-[11px] font-bold text-rose-400">
                                        (-)
                                    </span>
                                    <span className="text-rose-300 font-sans text-xs">Cash Sent to Bank / Daily Savings (ബാങ്കിലേക്ക് അയച്ച ക്യാഷ്)</span>
                                </div>
                                <span className="font-bold text-rose-400 text-sm">
                                    -₹{outflow.bank_savings_deposited.toLocaleString('en-IN')}
                                </span>
                            </div>
                        </div>

                        {/* Expected Cash In Drawer Highlight Box */}
                        <div className="p-4 sm:p-5 rounded-2xl bg-black/60 border border-[#01FFFF]/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-[0_0_30px_rgba(1,255,255,0.06)]">
                            <div>
                                <span className="text-[10px] text-[#01FFFF] font-bold uppercase tracking-[0.2em] block">
                                    (=) Expected Cash in Drawer (പെട്ടിയിൽ ഉണ്ടാവേണ്ട തുക)
                                </span>
                                <p className="text-[11px] text-[#8E939B] mt-0.5">
                                    Theoretical paper cash balance that should exist in the drawer right now
                                </p>
                            </div>
                            <h2 className="font-syncopate font-black text-2xl sm:text-4xl text-white tracking-tight">
                                ₹{dynamicExpectedCash.toLocaleString('en-IN')}
                            </h2>
                        </div>

                        {/* Interactive Counting Form */}
                        <form onSubmit={handleSubmitCloseout} className="space-y-4 pt-2">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Actual Cash Counted */}
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-200 uppercase tracking-wider mb-1.5">
                                        Actual Cash Counted (എണ്ണിത്തിട്ടപ്പെടുത്തിയ ക്യാഷ്) <span className="text-rose-400">*</span>
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-mono font-bold text-sm">
                                            ₹
                                        </span>
                                        <input
                                            type="number"
                                            step="any"
                                            required
                                            disabled={isClosed}
                                            value={actualCashCounted}
                                            onChange={(e) => setActualCashCounted(e.target.value)}
                                            placeholder="Enter total cash counted in drawer..."
                                            className="w-full bg-[#0C0D0F] border border-white/20 pl-9 pr-4 py-3 rounded-xl font-mono text-base font-bold text-white placeholder:text-gray-600 focus:outline-none focus:border-[#01FFFF] transition-all disabled:opacity-75"
                                        />
                                    </div>
                                    <p className="text-[10px] text-[#8E939B] mt-1 font-mono">
                                        Physical currency notes and coins counted by counter manager
                                    </p>
                                </div>

                                {/* Closing Notes */}
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-200 uppercase tracking-wider mb-1.5">
                                        Closing Notes / Discrepancy Reason (കുറിപ്പുകൾ)
                                    </label>
                                    <input
                                        type="text"
                                        disabled={isClosed}
                                        value={closingNotes}
                                        onChange={(e) => setClosingNotes(e.target.value)}
                                        placeholder="e.g., Shortage of ₹50 in coins; all notes verified."
                                        className="w-full bg-[#0C0D0F] border border-white/20 px-4 py-3 rounded-xl text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-[#01FFFF] transition-all disabled:opacity-75"
                                    />
                                    <p className="text-[10px] text-[#8E939B] mt-1 font-mono">
                                        Recorded on permanent audit ledger
                                    </p>
                                </div>
                            </div>

                            {/* Reactive Discrepancy Status Banner */}
                            {discrepancy !== null && (
                                <div className={`p-4 rounded-2xl border transition-all animate-[fadeIn_0.2s_ease-out] flex items-center justify-between ${
                                    discrepancy === 0
                                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                                        : discrepancy < 0
                                            ? 'bg-rose-500/15 border-rose-500/50 text-rose-200 shadow-[0_0_20px_rgba(244,63,94,0.15)]'
                                            : 'bg-cyan-500/15 border-cyan-500/50 text-cyan-200 shadow-[0_0_20px_rgba(1,255,255,0.15)]'
                                }`}>
                                    <div className="flex items-center gap-3">
                                        {discrepancy === 0 ? (
                                            <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                                        ) : discrepancy < 0 ? (
                                            <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 animate-bounce" />
                                        ) : (
                                            <Sparkles className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                                        )}
                                        <div>
                                            <h4 className="font-bold text-xs uppercase tracking-wider">
                                                {discrepancy === 0 
                                                    ? '🟢 Balanced / Perfect Match (₹0 difference)' 
                                                    : discrepancy < 0 
                                                        ? `🔴 Cash Shortage Detected: Missing ₹${Math.abs(discrepancy).toLocaleString('en-IN')}` 
                                                        : `🔵 Cash Surplus / Overage: Extra ₹${discrepancy.toLocaleString('en-IN')}`}
                                            </h4>
                                            <p className="text-[10px] opacity-80 mt-0.5">
                                                {discrepancy === 0 
                                                    ? 'The physically counted cash matches the theoretical register total exactly.' 
                                                    : discrepancy < 0 
                                                        ? 'Physical drawer is short compared to recorded collections minus cash outflows.' 
                                                        : 'Drawer has surplus physical cash beyond recorded invoice cash settlements.'}
                                            </p>
                                        </div>
                                    </div>

                                    <span className="font-syncopate font-black text-lg sm:text-xl">
                                        {discrepancy === 0 ? '₹0' : discrepancy < 0 ? `-₹${Math.abs(discrepancy).toLocaleString('en-IN')}` : `+₹${discrepancy.toLocaleString('en-IN')}`}
                                    </span>
                                </div>
                            )}

                            {/* ── SECTION 3: NET OPERATING POSITION ────────────────────── */}
                            <div className="p-4 rounded-2xl bg-black/40 border border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-[#8E939B] uppercase tracking-wider block">
                                        3. Net Operating Position (ഇന്നത്തെ ലാഭം)
                                    </span>
                                    <p className="text-xs text-white">
                                        Revenue <span className="font-bold font-mono">₹{inflow.gross_revenue.toLocaleString('en-IN')}</span> &minus; Total Operating Costs <span className="font-bold font-mono text-rose-400">₹{outflow.total_expenses.toLocaleString('en-IN')}</span>
                                    </p>
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">
                                        Today&apos;s Net Profit
                                    </span>
                                    <span className={`text-xl sm:text-2xl font-syncopate font-black ${eodData?.profitability?.net_profit && eodData.profitability.net_profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        ₹{(eodData?.profitability?.net_profit ?? (inflow.gross_revenue - outflow.total_expenses)).toLocaleString('en-IN')}
                                    </span>
                                </div>
                            </div>

                            {/* ── ACTION BUTTONS ─────────────────────────────────────── */}
                            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-3 border-t border-white/10">
                                {/* Print Summary */}
                                <button
                                    type="button"
                                    onClick={handlePrintSummary}
                                    className="w-full sm:w-auto px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-wider border border-white/15 transition-all flex items-center justify-center gap-2 active:scale-95"
                                >
                                    <Printer className="w-4 h-4 text-[#01FFFF]" />
                                    Print / Export EOD Summary
                                </button>

                                {/* Lock & Close Day Register */}
                                {!isClosed ? (
                                    <button
                                        type="submit"
                                        disabled={isSubmitting || actualCashCounted === ''}
                                        className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#E52323] hover:bg-red-700 text-white font-syncopate font-bold text-xs uppercase tracking-widest transition-all shadow-[0_0_25px_rgba(229,35,35,0.4)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-95"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <RefreshCw className="w-4 h-4 animate-spin" />
                                                Locking Register...
                                            </>
                                        ) : (
                                            <>
                                                <Lock className="w-4 h-4" />
                                                Lock &amp; Close Day Register
                                            </>
                                        )}
                                    </button>
                                ) : (
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider border border-white/20 transition-all flex items-center justify-center gap-2 active:scale-95"
                                    >
                                        {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4 text-emerald-400" />}
                                        Update Re-Audit Notes
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
