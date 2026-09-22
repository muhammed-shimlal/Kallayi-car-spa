'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
    IndianRupee, TrendingUp, TrendingDown, RefreshCw, Printer, 
    Smartphone, CreditCard, Wallet, Car, Activity, CheckCircle2,
    Calendar, ArrowDownRight, ArrowUpRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useDashboard } from '../context/DashboardContext';

export default function EODTab() {
    const { financeState } = useDashboard();
    const [liveData, setLiveData] = useState<any>(financeState?.eodData || null);
    const [isLoading, setIsLoading] = useState(!financeState?.eodData);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Formatted IST Date
    const todayFormatted = new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    }).format(new Date());

    const fetchLiveEOD = useCallback(async (silent = false) => {
        if (!silent) setIsRefreshing(true);
        try {
            const res = await fetch('/api/finance/eod', { cache: 'no-store' });
            if (!res.ok) throw new Error('Failed to load EOD metrics');
            const json = await res.json();
            if (json.success && json.data) {
                setLiveData(json.data);
                if (!silent) toast.success('Live EOD metrics refreshed!');
            }
        } catch (err: any) {
            console.error('[EOD Tab Error]:', err);
            if (!silent) toast.error('Error refreshing EOD data.');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchLiveEOD(true);
        // Auto refresh every 30 seconds for live updates
        const interval = setInterval(() => fetchLiveEOD(true), 30000);
        return () => clearInterval(interval);
    }, [fetchLiveEOD]);

    // Data extractions
    const grossRevenue = Number(liveData?.gross_revenue ?? liveData?.inflow?.gross_revenue ?? 0);
    const totalCash = Number(liveData?.inflow?.total_cash_collected ?? liveData?.cash_in_hand ?? 0);
    const totalUpi = Number(liveData?.inflow?.total_upi_collected ?? liveData?.upi_collected ?? 0);
    const totalCredit = Number(liveData?.inflow?.total_credit_issued ?? liveData?.credit_issued ?? 0);
    const totalWashes = Number(liveData?.inflow?.total_washes_count ?? 0);

    const totalExpenses = Number(liveData?.total_expenses ?? liveData?.outflow?.total_expenses ?? 0);
    const cashExpenses = Number(liveData?.outflow?.general_expenses_cash ?? 0);
    const staffPayouts = Number(liveData?.outflow?.staff_cash_payouts ?? liveData?.labor_payouts ?? 0);
    const bankDeposits = Number(liveData?.outflow?.bank_savings_deposited ?? 0);

    const netProfit = Number(liveData?.profitability?.net_profit ?? (grossRevenue - totalExpenses));
    const expectedCashInTill = Number(liveData?.reconciliation?.expected_cash_in_hand ?? liveData?.expected_cash_in_till ?? 0);

    if (isLoading && !liveData) {
        return (
            <div className="flex flex-col items-center justify-center py-24 animate-[fadeIn_0.3s_ease-out]">
                <Activity className="w-10 h-10 text-[#01FFFF] animate-spin mb-4" />
                <p className="text-xs font-mono uppercase tracking-widest text-[#8E939B]">Loading Live EOD Metrics...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-[fadeIn_0.4s_ease-out] max-w-6xl mx-auto pb-12">
            
            {/* TOP HEADER & ACTION BAR */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-6">
                <div>
                    <div className="flex items-center gap-3">
                        <h3 className="font-syncopate font-bold text-xl sm:text-2xl tracking-widest text-white">
                            END OF DAY SUMMARY
                        </h3>
                        <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                            Register Active
                        </span>
                    </div>
                    <p className="text-xs text-[#8E939B] font-mono tracking-wider mt-1 flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-[#01FFFF]" />
                        <span>{todayFormatted}</span>
                        <span className="text-white/20">•</span>
                        <span>ദിനാന്ത്യ സാമ്പത്തിക അവലോകനം (Always Open)</span>
                    </p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <button
                        onClick={() => fetchLiveEOD(false)}
                        disabled={isRefreshing}
                        className="flex-1 md:flex-none min-h-[44px] px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-[#8E939B] hover:text-white border border-white/10 text-xs font-bold uppercase tracking-widest transition flex items-center justify-center gap-2 active:scale-95 touch-manipulation"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 text-[#01FFFF] ${isRefreshing ? 'animate-spin' : ''}`} />
                        <span>Refresh</span>
                    </button>
                    <button
                        onClick={() => window.print()}
                        className="flex-1 md:flex-none min-h-[44px] px-5 py-2 rounded-xl bg-[#01FFFF]/10 hover:bg-[#01FFFF] text-[#01FFFF] hover:text-black border border-[#01FFFF]/30 text-xs font-bold uppercase tracking-widest transition flex items-center justify-center gap-2 active:scale-95 touch-manipulation shadow-[0_0_20px_rgba(1,255,255,0.1)]"
                    >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print Report</span>
                    </button>
                </div>
            </div>

            {/* REAL-TIME HIGHLIGHT: REGISTER OPEN STATUS */}
            <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-2xl p-4 flex items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    <div>
                        <p className="font-bold text-emerald-300">
                            Register is Unlocked &amp; Ready for Late/Emergency Wash Bookings
                        </p>
                        <p className="text-[11px] text-emerald-400/70 font-mono mt-0.5">
                            വാഷ് ബുക്കിംഗുകൾ തടസ്സമില്ലാതെ തുടരാം. എപ്പോൾ പുതിയ ബുക്കിംഗ് നടത്തിയാലും കണക്കുകൾ തത്സമയം അപ്ഡേറ്റ് ചെയ്യപ്പെടും.
                        </p>
                    </div>
                </div>
                <div className="hidden sm:block text-right">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-[#8E939B]">Completed Washes</span>
                    <p className="font-syncopate font-bold text-base text-white">{totalWashes} Vehicles</p>
                </div>
            </div>

            {/* SECTION 1: PRIMARY PROFITABILITY & REVENUE (3 HERO CARDS) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* 1. Today's Gross Revenue */}
                <div className="bg-[#141518]/80 backdrop-blur-xl border border-white/10 hover:border-[#01FFFF]/40 p-6 sm:p-7 rounded-3xl relative overflow-hidden transition-all shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#01FFFF]/5 rounded-full blur-3xl pointer-events-none"></div>
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#01FFFF]">
                            🌟 Today&apos;s Gross Revenue
                        </span>
                        <span className="text-[10px] text-neutral-400 font-mono">ആകെ വരുമാനം</span>
                    </div>
                    <h2 className="text-3xl sm:text-4xl font-syncopate font-black text-white tracking-tight">
                        ₹{grossRevenue.toLocaleString('en-IN')}
                    </h2>
                    <p className="text-xs text-[#8E939B] mt-4 flex items-center gap-1.5 font-mono">
                        <Car className="w-3.5 h-3.5 text-[#01FFFF]" />
                        <span>{totalWashes} vehicles washed today</span>
                    </p>
                </div>

                {/* 2. Today's Total Expense */}
                <div className="bg-[#141518]/80 backdrop-blur-xl border border-white/10 hover:border-rose-500/40 p-6 sm:p-7 rounded-3xl relative overflow-hidden transition-all shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-3xl pointer-events-none"></div>
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-rose-400">
                            📉 Today&apos;s Total Expense
                        </span>
                        <span className="text-[10px] text-neutral-400 font-mono">ആകെ ചെലവ്</span>
                    </div>
                    <h2 className="text-3xl sm:text-4xl font-syncopate font-black text-rose-300 tracking-tight">
                        ₹{totalExpenses.toLocaleString('en-IN')}
                    </h2>
                    <p className="text-xs text-rose-400/80 mt-4 font-mono">
                        Shop expenses (₹{cashExpenses.toLocaleString()}) + Staff payouts (₹{staffPayouts.toLocaleString()})
                    </p>
                </div>

                {/* 3. Today's Net Profit */}
                <div className={`p-6 sm:p-7 rounded-3xl relative overflow-hidden transition-all border ${
                    netProfit >= 0 
                        ? 'bg-emerald-950/20 border-emerald-500/30 hover:border-emerald-500/60 shadow-[0_0_35px_rgba(16,185,129,0.1)]' 
                        : 'bg-rose-950/20 border-rose-500/30 hover:border-rose-500/60 shadow-[0_0_35px_rgba(244,63,94,0.1)]'
                }`}>
                    <div className="flex items-center justify-between mb-3">
                        <span className={`text-[10px] font-bold uppercase tracking-[0.2em] flex items-center gap-1.5 ${netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {netProfit >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                            💰 Today&apos;s Net Profit
                        </span>
                        <span className="text-[10px] text-neutral-400 font-mono">ലാഭം</span>
                    </div>
                    <h2 className={`text-3xl sm:text-4xl font-syncopate font-black tracking-tight ${netProfit >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                        ₹{netProfit.toLocaleString('en-IN')}
                    </h2>
                    <p className="text-xs text-[#8E939B] mt-4 font-mono">
                        [Gross Revenue] - [Total Operating Expenses]
                    </p>
                </div>

            </div>

            {/* SECTION 2: INFLOW TRI-SPLIT BREAKDOWN (3 ESSENTIAL PILLARS) */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h4 className="font-syncopate font-bold text-sm tracking-widest text-white uppercase">
                        PAYMENT METHOD INFLOW BREAKDOWN
                    </h4>
                    <span className="text-xs text-[#8E939B] font-mono">പണമിടപാട് തരംതിരിവ്</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    
                    {/* Pillar 1: Physical Cash */}
                    <div className="bg-[#141518]/90 border border-emerald-500/20 hover:border-emerald-500/50 p-6 rounded-2xl relative overflow-hidden group transition">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                                <Wallet className="w-5 h-5" />
                            </div>
                            <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-2.5 py-1 rounded-lg">
                                Cash
                            </span>
                        </div>
                        <p className="text-xs text-[#8E939B] uppercase font-bold tracking-wider mb-1">
                            💵 Physical Cash In Hand
                        </p>
                        <p className="text-[11px] text-neutral-400 font-mono mb-3">ഫിസിക്കൽ ക്യാഷ്</p>
                        <h3 className="text-2xl sm:text-3xl font-syncopate font-bold text-white tracking-tight">
                            ₹{totalCash.toLocaleString('en-IN')}
                        </h3>
                        <p className="text-[11px] text-neutral-500 mt-3 font-mono">
                            Actual currency notes received at counter
                        </p>
                    </div>

                    {/* Pillar 2: Digital UPI */}
                    <div className="bg-[#141518]/90 border border-[#01FFFF]/20 hover:border-[#01FFFF]/50 p-6 rounded-2xl relative overflow-hidden group transition">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-10 h-10 rounded-xl bg-[#01FFFF]/10 border border-[#01FFFF]/20 flex items-center justify-center text-[#01FFFF]">
                                <Smartphone className="w-5 h-5" />
                            </div>
                            <span className="text-[10px] font-mono font-bold text-[#01FFFF] uppercase tracking-widest bg-[#01FFFF]/10 px-2.5 py-1 rounded-lg">
                                UPI / Online
                            </span>
                        </div>
                        <p className="text-xs text-[#8E939B] uppercase font-bold tracking-wider mb-1">
                            📱 Digital / UPI Transfers
                        </p>
                        <p className="text-[11px] text-neutral-400 font-mono mb-3">യുപിഐ / ഓൺലൈൻ</p>
                        <h3 className="text-2xl sm:text-3xl font-syncopate font-bold text-[#01FFFF] tracking-tight">
                            ₹{totalUpi.toLocaleString('en-IN')}
                        </h3>
                        <p className="text-[11px] text-neutral-500 mt-3 font-mono">
                            GPay, PhonePe, Paytm, or direct bank transfer
                        </p>
                    </div>

                    {/* Pillar 3: Khata Credit */}
                    <div className="bg-[#141518]/90 border border-amber-500/20 hover:border-amber-500/50 p-6 rounded-2xl relative overflow-hidden group transition">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                                <CreditCard className="w-5 h-5" />
                            </div>
                            <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-widest bg-amber-500/10 px-2.5 py-1 rounded-lg">
                                Khata Credit
                            </span>
                        </div>
                        <p className="text-xs text-[#8E939B] uppercase font-bold tracking-wider mb-1">
                            📋 Unpaid / Credit Issued
                        </p>
                        <p className="text-[11px] text-neutral-400 font-mono mb-3">ഖാത്ത / ബാക്കി നിൽപ്പ്</p>
                        <h3 className="text-2xl sm:text-3xl font-syncopate font-bold text-amber-300 tracking-tight">
                            ₹{totalCredit.toLocaleString('en-IN')}
                        </h3>
                        <p className="text-[11px] text-neutral-500 mt-3 font-mono">
                            Receivable balance logged to regular customers
                        </p>
                    </div>

                </div>
            </div>

            {/* SECTION 3: LIVE CASH DRAWER AUDIT (പെട്ടിയിലെ പണം) */}
            <div className="bg-[#141518]/60 border border-white/10 rounded-3xl p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-white/10 pb-4 mb-6">
                    <div>
                        <h4 className="font-syncopate font-bold text-base text-white tracking-widest uppercase flex items-center gap-2">
                            <IndianRupee className="w-5 h-5 text-[#01FFFF]" />
                            CASH DRAWER AUDIT
                        </h4>
                        <p className="text-xs text-[#8E939B] font-mono mt-0.5">
                            പെട്ടിയിലെ പണത്തിന്റെ കണക്ക് • Live cash ledger tracking
                        </p>
                    </div>
                    <div className="bg-black/50 border border-white/10 px-4 py-2 rounded-xl text-right">
                        <span className="text-[10px] text-[#8E939B] uppercase tracking-wider font-bold">Current Expected in Till</span>
                        <p className="font-syncopate font-bold text-lg text-white">₹{expectedCashInTill.toLocaleString('en-IN')}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-black/40 border border-white/5 p-4 rounded-2xl">
                        <p className="text-[10px] uppercase font-bold text-[#8E939B] tracking-wider flex items-center gap-1.5">
                            <ArrowDownRight className="w-3.5 h-3.5 text-emerald-400" /> Customer Cash In
                        </p>
                        <p className="text-lg font-mono font-bold text-emerald-400 mt-1">
                            + ₹{totalCash.toLocaleString('en-IN')}
                        </p>
                    </div>

                    <div className="bg-black/40 border border-white/5 p-4 rounded-2xl">
                        <p className="text-[10px] uppercase font-bold text-[#8E939B] tracking-wider flex items-center gap-1.5">
                            <ArrowUpRight className="w-3.5 h-3.5 text-rose-400" /> Shop Cash Expenses
                        </p>
                        <p className="text-lg font-mono font-bold text-rose-400 mt-1">
                            - ₹{cashExpenses.toLocaleString('en-IN')}
                        </p>
                    </div>

                    <div className="bg-black/40 border border-white/5 p-4 rounded-2xl">
                        <p className="text-[10px] uppercase font-bold text-[#8E939B] tracking-wider flex items-center gap-1.5">
                            <ArrowUpRight className="w-3.5 h-3.5 text-indigo-400" /> Staff Cash Payouts
                        </p>
                        <p className="text-lg font-mono font-bold text-indigo-400 mt-1">
                            - ₹{staffPayouts.toLocaleString('en-IN')}
                        </p>
                    </div>

                    <div className="bg-black/40 border border-white/5 p-4 rounded-2xl">
                        <p className="text-[10px] uppercase font-bold text-[#8E939B] tracking-wider flex items-center gap-1.5">
                            <ArrowUpRight className="w-3.5 h-3.5 text-purple-400" /> Bank Savings Deposited
                        </p>
                        <p className="text-lg font-mono font-bold text-purple-400 mt-1">
                            - ₹{bankDeposits.toLocaleString('en-IN')}
                        </p>
                    </div>
                </div>
            </div>

        </div>
    );
}
