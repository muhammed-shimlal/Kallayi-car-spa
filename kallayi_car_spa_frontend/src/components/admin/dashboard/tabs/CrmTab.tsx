'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    BookOpen, Car, Calendar, Search, RefreshCw, 
    User, Phone, Sparkles, CheckCircle, AlertCircle, 
    BadgeDollarSign, Download, ArrowLeft, Filter, FileText
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Skeleton } from '@/components/ui/Skeleton';
import { fetchGlobalWashHistory, lookupVehicleDossier, extractErrorMessage } from '@/lib/api';

export interface WashedVehicle {
    id: number;
    booking_id?: number;
    date: string;
    is_today: boolean;
    plate_number: string;
    vehicle_model: string;
    customer_name: string;
    customer_phone: string;
    customer_outstanding_balance?: number;
    service_package_name: string;
    technician_name: string;
    price: number;
    payment_method?: string;
    split_cash?: number;
    split_online?: number;
    split_khata?: number;
    total_amount?: number;
}

export interface DailyStats {
    target_date: string;
    total_services: number;
    total_revenue: number;
}

export default function CrmTab() {
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [washedVehicles, setWashedVehicles] = useState<WashedVehicle[]>([]);
    const [stats, setStats] = useState<DailyStats>({
        target_date: new Date().toISOString().split('T')[0],
        total_services: 0,
        total_revenue: 0,
    });
    const [isLoading, setIsLoading] = useState<boolean>(true);
    
    // Vehicle Dossier Search state
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [dossierData, setDossierData] = useState<any | null>(null);
    const [isSearching, setIsSearching] = useState<boolean>(false);

    // Fetch Completed Washes History from Internal API
    const fetchHistory = useCallback(async (dateStr: string, silent = false) => {
        if (!silent) setIsLoading(true);

        try {
            const data = await fetchGlobalWashHistory(dateStr);
            setWashedVehicles(data.feed || []);
            if (data.stats) {
                setStats({
                    target_date: data.stats.target_date || dateStr,
                    total_services: data.stats.total_services || 0,
                    total_revenue: data.stats.total_revenue || 0,
                });
            }
        } catch {
            toast.error('Failed to load wash history from server.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchHistory(selectedDate);
    }, [selectedDate, fetchHistory]);

    // Dynamic calculations for today's metrics
    const totalWashedToday = useMemo(() => {
        const todayCount = washedVehicles.filter(v => v.is_today).length;
        return todayCount > 0 ? todayCount : stats.total_services;
    }, [washedVehicles, stats.total_services]);

    const totalRevenueToday = useMemo(() => {
        const sum = washedVehicles.reduce((acc, v) => acc + (Number(v.price) || 0), 0);
        return sum > 0 ? sum : stats.total_revenue;
    }, [washedVehicles, stats.total_revenue]);

    // Vehicle Dossier Lookup
    const handleSearchSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        try {
            const data = await lookupVehicleDossier(searchQuery.trim());
            setDossierData(data);
        } catch (err: unknown) {
            toast.error(extractErrorMessage(err) || `No service records found for "${searchQuery}".`);
            setDossierData(null);
        } finally {
            setIsSearching(false);
        }
    };

    const viewReceipt = (bookingId?: number) => {
        if (!bookingId) return;
        window.open(`/invoice-preview?id=${bookingId}`, '_blank');
    };

    // Quick payment filter state
    const [paymentFilter, setPaymentFilter] = useState<'ALL' | 'CASH' | 'UPI' | 'CREDIT'>('ALL');

    // Helper to identify if a visit involves Khata / Credit
    const isCreditVisit = useCallback((item: { payment_method?: string; split_khata?: number }) => {
        const method = String(item.payment_method || '').toUpperCase();
        const khata = Number(item.split_khata || 0);
        return method === 'CREDIT' || method === 'KHATA' || khata > 0;
    }, []);

    // Breakdown counts for quick filters
    const filterCounts = useMemo(() => {
        let cash = 0;
        let upi = 0;
        let credit = 0;

        washedVehicles.forEach((v) => {
            if (isCreditVisit(v)) {
                credit++;
            } else {
                const m = String(v.payment_method || '').toUpperCase();
                const online = Number(v.split_online || 0);
                const cashAmt = Number(v.split_cash || 0);
                if (m === 'UPI' || m === 'ONLINE' || (online > 0 && cashAmt === 0)) {
                    upi++;
                } else {
                    cash++;
                }
            }
        });

        return { all: washedVehicles.length, cash, upi, credit };
    }, [washedVehicles, isCreditVisit]);

    // Filtered visits based on selected quick filter
    const filteredVehicles = useMemo(() => {
        if (paymentFilter === 'ALL') return washedVehicles;
        if (paymentFilter === 'CREDIT') {
            return washedVehicles.filter(isCreditVisit);
        }
        if (paymentFilter === 'UPI') {
            return washedVehicles.filter((v) => {
                if (isCreditVisit(v)) return false;
                const m = String(v.payment_method || '').toUpperCase();
                const online = Number(v.split_online || 0);
                const cashAmt = Number(v.split_cash || 0);
                return m === 'UPI' || m === 'ONLINE' || (online > 0 && cashAmt === 0);
            });
        }
        if (paymentFilter === 'CASH') {
            return washedVehicles.filter((v) => {
                if (isCreditVisit(v)) return false;
                const m = String(v.payment_method || '').toUpperCase();
                const online = Number(v.split_online || 0);
                const cashAmt = Number(v.split_cash || 0);
                if (m === 'UPI' || m === 'ONLINE' || (online > 0 && cashAmt === 0)) {
                    return false;
                }
                return true;
            });
        }
        return washedVehicles;
    }, [washedVehicles, paymentFilter, isCreditVisit]);

    // Payment badge renderer adhering strictly to specs
    const renderPaymentBadge = (item: {
        payment_method?: string;
        split_cash?: number;
        split_online?: number;
        split_khata?: number;
        price?: number;
        total_amount?: number;
    }) => {
        const khata = Number(item.split_khata || 0);
        const cash = Number(item.split_cash || 0);
        const online = Number(item.split_online || 0);
        const rawMethod = String(item.payment_method || 'CASH').toUpperCase();
        const effectiveTotal = Number(item.total_amount || item.price || 0);

        // 1. Pure Credit (Khata)
        if ((khata > 0 && cash === 0 && online === 0) || rawMethod === 'CREDIT' || rawMethod === 'KHATA') {
            const creditAmount = khata > 0 ? khata : effectiveTotal;
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.15)] whitespace-nowrap">
                    <span>📋</span>
                    <span>Credit (₹{creditAmount.toLocaleString('en-IN')})</span>
                </span>
            );
        }

        // 2. Split Payment with Credit
        if (khata > 0 && (cash > 0 || online > 0)) {
            const splitLabels: string[] = [];
            if (cash > 0) splitLabels.push('Cash');
            if (online > 0) splitLabels.push('UPI');
            return (
                <div className="inline-flex flex-col xl:flex-row items-start xl:items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 whitespace-nowrap">
                        <span>🟣</span>
                        <span>Split ({splitLabels.join(' + ') || 'Partial'})</span>
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-[0_0_8px_rgba(244,63,94,0.2)] animate-pulse whitespace-nowrap">
                        <span>⚠️ Credit: ₹{khata.toLocaleString('en-IN')}</span>
                    </span>
                </div>
            );
        }

        // 3. Regular Split (Cash + UPI)
        if (rawMethod === 'SPLIT' || (cash > 0 && online > 0)) {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 whitespace-nowrap">
                    <span>🟣</span>
                    <span>Split (Cash + UPI)</span>
                </span>
            );
        }

        // 4. UPI / Online
        if (rawMethod === 'UPI' || rawMethod === 'ONLINE' || (online > 0 && cash === 0)) {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 whitespace-nowrap">
                    <span>📱</span>
                    <span>UPI</span>
                </span>
            );
        }

        // 5. Cash
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
                <span>💵</span>
                <span>Cash</span>
            </span>
        );
    };

    return (
        <div className="space-y-8 animate-[fadeIn_0.4s_ease-out]">
            {/* ── HEADER BAR & SEARCH ───────────────────────────────────────── */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-white/5 pb-6">
                <div>
                    <h3 className="font-syncopate font-black text-xl sm:text-2xl tracking-widest flex items-center gap-3 text-white">
                        <BookOpen className="w-6 h-6 text-[#01FFFF]" />
                        DIGITAL GARAGE CRM &amp; HISTORY
                    </h3>
                    <p className="text-[10px] text-[#8E939B] uppercase tracking-[0.25em] font-bold mt-1">
                        Completed Wash Ledger &amp; Customer Vehicle History
                    </p>
                </div>

                {/* Quick Vehicle Search Form */}
                <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full lg:w-auto">
                    <div className="relative flex-1 lg:w-72">
                        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8E939B]" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search plate, customer name, or phone..."
                            className="w-full bg-[#141518] border border-white/10 py-2.5 pl-10 pr-4 rounded-xl text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#01FFFF] transition-all"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isSearching}
                        className="px-4 py-2.5 rounded-xl bg-[#01FFFF] text-black font-bold text-xs uppercase tracking-wider hover:bg-white transition-all disabled:opacity-50 active:scale-95 touch-manipulation min-h-[40px]"
                    >
                        {isSearching ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Lookup Dossier'}
                    </button>
                </form>
            </div>

            {/* ── VEHICLE DOSSIER VIEW (IF LOOKUP SEARCH ACTIVE) ─────────────── */}
            {dossierData ? (
                <div className="bg-[#141518]/90 border border-[#01FFFF]/30 p-6 sm:p-8 rounded-3xl space-y-6 shadow-[0_0_30px_rgba(1,255,255,0.1)] relative">
                    <button
                        onClick={() => setDossierData(null)}
                        className="flex items-center gap-2 text-xs font-bold text-[#8E939B] hover:text-white uppercase tracking-widest transition-colors mb-2"
                    >
                        <ArrowLeft className="w-4 h-4 text-[#01FFFF]" /> Back to All History
                    </button>

                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-4">
                        <div>
                            <span className="text-[10px] text-[#01FFFF] uppercase tracking-widest font-bold">Vehicle &amp; Customer Dossier</span>
                            <h2 className="text-2xl sm:text-3xl font-syncopate font-black tracking-widest text-white mt-1">
                                {dossierData.plate || dossierData.vehicle_profile?.plate_number || searchQuery.toUpperCase()}
                            </h2>
                        </div>
                        <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-right">
                            <span className="text-[10px] text-[#8E939B] uppercase font-bold block">Registered Owner</span>
                            <span className="text-sm font-bold text-white">{dossierData.customer_name || dossierData.vehicle_profile?.owner_name || 'Walk-In Customer'}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                        <div className="bg-black/40 border border-white/5 p-4 rounded-2xl">
                            <p className="text-[10px] text-[#8E939B] uppercase tracking-wider font-bold">Vehicle Model</p>
                            <p className="text-base font-bold text-white mt-1 truncate">{dossierData.make_model || dossierData.vehicle_profile?.model || 'Standard Vehicle'}</p>
                        </div>
                        <div className="bg-black/40 border border-white/5 p-4 rounded-2xl">
                            <p className="text-[10px] text-[#8E939B] uppercase tracking-wider font-bold">Owner Phone</p>
                            <p className="text-base font-mono font-bold text-emerald-400 mt-1">{dossierData.phone || dossierData.vehicle_profile?.owner_phone || 'N/A'}</p>
                        </div>
                        <div className="bg-black/40 border border-white/5 p-4 rounded-2xl">
                            <p className="text-[10px] text-[#8E939B] uppercase tracking-wider font-bold">Total Visits</p>
                            <p className="text-base font-mono font-bold text-[#01FFFF] mt-1">{dossierData.total_visits || dossierData.kpis?.total_visits || 0} Visits</p>
                        </div>
                        <div className="bg-black/40 border border-white/5 p-4 rounded-2xl">
                            <p className="text-[10px] text-[#8E939B] uppercase tracking-wider font-bold">Lifetime Spend</p>
                            <p className="text-base font-mono font-bold text-white mt-1">₹{(dossierData.total_lifetime_spend || dossierData.kpis?.total_lifetime_spend || 0).toLocaleString()}</p>
                        </div>
                        {/* Outstanding Khata Due Alert */}
                        <div className={`border p-4 rounded-2xl transition-all ${
                            Number(dossierData.outstanding_balance || dossierData.vehicle_profile?.outstanding_balance || 0) > 0
                                ? 'bg-rose-500/10 border-rose-500/40 shadow-[0_0_20px_rgba(244,63,94,0.15)]'
                                : 'bg-black/40 border-white/5'
                        }`}>
                            <p className={`text-[10px] uppercase tracking-wider font-bold flex items-center gap-1.5 ${
                                Number(dossierData.outstanding_balance || dossierData.vehicle_profile?.outstanding_balance || 0) > 0
                                    ? 'text-rose-400'
                                    : 'text-[#8E939B]'
                            }`}>
                                <AlertCircle className="w-3.5 h-3.5" />
                                Khata Balance Due
                            </p>
                            <p className={`text-base font-mono font-bold mt-1 ${
                                Number(dossierData.outstanding_balance || dossierData.vehicle_profile?.outstanding_balance || 0) > 0
                                    ? 'text-rose-300 font-black'
                                    : 'text-emerald-400'
                            }`}>
                                {Number(dossierData.outstanding_balance || dossierData.vehicle_profile?.outstanding_balance || 0) > 0
                                    ? `₹${Number(dossierData.outstanding_balance || dossierData.vehicle_profile?.outstanding_balance || 0).toLocaleString('en-IN')}`
                                    : '₹0 (Clear)'}
                            </p>
                        </div>
                    </div>

                    {/* Timeline / History Table */}
                    <div className="border border-white/10 rounded-2xl overflow-hidden bg-black/30">
                        <div className="p-4 bg-[#0C0D0F] border-b border-white/5">
                            <h4 className="font-syncopate font-bold text-xs tracking-widest text-white uppercase">
                                PAST SERVICE HISTORY ({(dossierData.timeline || dossierData.history || []).length})
                            </h4>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs min-w-[750px]">
                                <thead className="bg-black/50 text-[#8E939B] text-[10px] uppercase tracking-widest border-b border-white/5">
                                    <tr>
                                        <th className="p-3.5 pl-5">Date &amp; Time</th>
                                        <th className="p-3.5">Vehicle</th>
                                        <th className="p-3.5">Service Package</th>
                                        <th className="p-3.5">Payment Mode</th>
                                        <th className="p-3.5">Status</th>
                                        <th className="p-3.5">Technician</th>
                                        <th className="p-3.5 text-right pr-5">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 font-grotesk">
                                    {(dossierData.timeline || dossierData.history || []).map((b: any, idx: number) => {
                                        const isCredit = isCreditVisit(b);
                                        return (
                                            <tr 
                                                key={b.id || b.booking_id || idx} 
                                                className={`transition-colors ${
                                                    isCredit 
                                                        ? 'border-l-4 border-l-rose-500 bg-rose-500/[0.04] hover:bg-rose-500/[0.08]' 
                                                        : 'border-l-4 border-l-transparent hover:bg-white/5'
                                                }`}
                                            >
                                                <td className="p-3.5 pl-5 font-mono text-white/90">{b.date || 'N/A'}</td>
                                                <td className="p-3.5 font-mono font-bold text-[#01FFFF]">{b.plate_number || dossierData.plate}</td>
                                                <td className="p-3.5 font-bold text-emerald-400">{b.service_package_name || 'Walk-In Wash'}</td>
                                                <td className="p-3.5">{renderPaymentBadge(b)}</td>
                                                <td className="p-3.5">
                                                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${b.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
                                                        {b.status || 'COMPLETED'}
                                                    </span>
                                                </td>
                                                <td className="p-3.5 text-[#8E939B]">{b.technician_name || 'Unassigned'}</td>
                                                <td className="p-3.5 text-right pr-5 font-syncopate font-bold text-white">₹{b.price || b.price_paid || 0}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ) : null}

            {/* ── DAILY SUMMARY KPIS ──────────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                {/* Total Vehicles Washed Today */}
                <div className="bg-[#141518]/90 border border-[#01FFFF]/30 p-6 rounded-3xl flex items-center justify-between shadow-[0_0_20px_rgba(1,255,255,0.08)]">
                    <div>
                        <p className="text-[#01FFFF] text-[10px] font-bold uppercase tracking-[0.2em] mb-1 flex items-center gap-1.5">
                            <Car className="w-4 h-4 text-[#01FFFF]" />
                            Total Vehicles Washed Today
                        </p>
                        <h2 className="text-3xl sm:text-4xl font-syncopate font-black text-white tracking-tight mt-1">
                            {isLoading ? <Skeleton className="h-9 w-20" /> : totalWashedToday}
                        </h2>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-[#01FFFF]/10 border border-[#01FFFF]/30 flex items-center justify-center">
                        <CheckCircle className="w-6 h-6 text-[#01FFFF]" />
                    </div>
                </div>

                {/* Total Wash Revenue */}
                <div className="bg-[#141518]/90 border border-emerald-500/30 p-6 rounded-3xl flex items-center justify-between shadow-[0_0_20px_rgba(16,185,129,0.08)]">
                    <div>
                        <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-1 flex items-center gap-1.5">
                            <BadgeDollarSign className="w-4 h-4 text-emerald-400" />
                            Daily Wash Revenue
                        </p>
                        <h2 className="text-3xl sm:text-4xl font-syncopate font-black text-white tracking-tight mt-1">
                            {isLoading ? <Skeleton className="h-9 w-28" /> : `₹${totalRevenueToday.toLocaleString()}`}
                        </h2>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                        <Sparkles className="w-6 h-6 text-emerald-400" />
                    </div>
                </div>

                {/* Date Switcher */}
                <div className="bg-[#141518]/90 border border-white/10 p-6 rounded-3xl flex flex-col justify-between">
                    <p className="text-[#8E939B] text-[10px] font-bold uppercase tracking-[0.2em] mb-2 flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-purple-400" />
                        Selected Ledger Date
                    </p>
                    <div className="flex items-center gap-3">
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="w-full bg-[#0a0a0d] border border-white/10 text-white font-mono font-bold text-xs py-2.5 px-3 rounded-xl focus:outline-none focus:border-purple-400 transition-all cursor-pointer"
                        />
                        <button
                            onClick={() => fetchHistory(selectedDate)}
                            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-[#8E939B] hover:text-white border border-white/10 transition-colors"
                            title="Refresh Date History"
                        >
                            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>
            </div>

            {/* ── DETAILED WASHED VEHICLES DIRECTORY TABLE ─────────────────────── */}
            <div className="bg-[#141518]/80 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                <div className="p-5 sm:p-6 border-b border-white/5 bg-[#0C0D0F] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <h4 className="font-syncopate font-bold text-sm tracking-widest text-[#01FFFF] uppercase">
                            COMPLETED WASH DIRECTORY ({filteredVehicles.length} of {washedVehicles.length})
                        </h4>
                        <p className="text-[10px] text-[#8E939B] uppercase tracking-wider font-bold mt-0.5">
                            Real-time wash &amp; settlement records for {selectedDate}
                        </p>
                    </div>

                    {/* Quick Payment Mode Filters */}
                    <div className="flex flex-wrap items-center gap-1.5 p-1 bg-black/50 border border-white/10 rounded-2xl">
                        <button
                            onClick={() => setPaymentFilter('ALL')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold tracking-wider uppercase transition-all flex items-center gap-1.5 ${
                                paymentFilter === 'ALL'
                                    ? 'bg-white/20 text-white border border-white/30 shadow-sm'
                                    : 'text-[#8E939B] hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <span>All Visits</span>
                            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono bg-white/10 text-white">
                                {filterCounts.all}
                            </span>
                        </button>

                        <button
                            onClick={() => setPaymentFilter('CASH')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold tracking-wider uppercase transition-all flex items-center gap-1.5 ${
                                paymentFilter === 'CASH'
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                                    : 'text-emerald-400/80 hover:text-emerald-300 hover:bg-emerald-500/10'
                            }`}
                        >
                            <span>💵 Cash Only</span>
                            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono bg-emerald-500/20 text-emerald-300">
                                {filterCounts.cash}
                            </span>
                        </button>

                        <button
                            onClick={() => setPaymentFilter('UPI')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold tracking-wider uppercase transition-all flex items-center gap-1.5 ${
                                paymentFilter === 'UPI'
                                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                                    : 'text-cyan-400/80 hover:text-cyan-300 hover:bg-cyan-500/10'
                            }`}
                        >
                            <span>📱 UPI Only</span>
                            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono bg-cyan-500/20 text-cyan-300">
                                {filterCounts.upi}
                            </span>
                        </button>

                        <button
                            onClick={() => setPaymentFilter('CREDIT')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold tracking-wider uppercase transition-all flex items-center gap-1.5 ${
                                paymentFilter === 'CREDIT'
                                    ? 'bg-rose-500/25 text-rose-200 border border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.35)]'
                                    : filterCounts.credit > 0
                                        ? 'text-rose-300 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30'
                                        : 'text-rose-400/70 hover:text-rose-300 hover:bg-rose-500/10'
                            }`}
                        >
                            <span>⚠️ Credit / Khata Only</span>
                            <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono ${filterCounts.credit > 0 ? 'bg-rose-500/30 text-rose-200 font-black animate-pulse' : 'bg-rose-500/10 text-rose-300'}`}>
                                {filterCounts.credit}
                            </span>
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto scrollbar-none">
                    <table className="w-full text-left text-xs min-w-[850px]">
                        <thead className="bg-black/50 text-[#8E939B] font-grotesk text-[10px] uppercase tracking-widest border-b border-white/5">
                            <tr>
                                <th className="p-4 pl-6">Plate Number</th>
                                <th className="p-4">Vehicle Model</th>
                                <th className="p-4">Customer Name &amp; Phone</th>
                                <th className="p-4">Service Completed</th>
                                <th className="p-4">Payment Mode</th>
                                <th className="p-4">Technician</th>
                                <th className="p-4 text-right pr-6">Amount / Receipt</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {isLoading ? (
                                [1, 2, 3, 4].map((i) => (
                                    <tr key={i}>
                                        <td className="p-4 pl-6"><Skeleton className="h-5 w-28" /></td>
                                        <td className="p-4"><Skeleton className="h-5 w-32" /></td>
                                        <td className="p-4"><Skeleton className="h-5 w-36" /></td>
                                        <td className="p-4"><Skeleton className="h-5 w-32" /></td>
                                        <td className="p-4"><Skeleton className="h-5 w-28" /></td>
                                        <td className="p-4"><Skeleton className="h-5 w-24" /></td>
                                        <td className="p-4 text-right pr-6"><Skeleton className="h-5 w-16 ml-auto" /></td>
                                    </tr>
                                ))
                            ) : filteredVehicles.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-12 text-center text-[#8E939B]">
                                        <AlertCircle className="w-8 h-8 text-[#8E939B] mx-auto mb-2 opacity-50" />
                                        <p className="font-bold uppercase tracking-wider text-xs">
                                            {washedVehicles.length > 0 
                                                ? `No visits found for filter "${paymentFilter}".` 
                                                : `No washed vehicles recorded for ${selectedDate}.`}
                                        </p>
                                        {washedVehicles.length > 0 ? (
                                            <button 
                                                onClick={() => setPaymentFilter('ALL')}
                                                className="text-[10px] text-[#01FFFF] hover:underline mt-2 font-bold uppercase tracking-wider inline-block"
                                            >
                                                Reset to All Visits
                                            </button>
                                        ) : (
                                            <p className="text-[10px] text-[#8E939B] mt-1">Check another date or complete a wash in the Live Queue.</p>
                                        )}
                                    </td>
                                </tr>
                            ) : (
                                filteredVehicles.map((item) => {
                                    const isCredit = isCreditVisit(item);
                                    return (
                                        <tr 
                                            key={item.id || item.booking_id} 
                                            className={`transition-colors ${
                                                isCredit 
                                                    ? 'border-l-4 border-l-rose-500 bg-rose-500/[0.04] hover:bg-rose-500/[0.08]' 
                                                    : 'border-l-4 border-l-transparent hover:bg-white/5'
                                            }`}
                                        >
                                            {/* Plate Number */}
                                            <td className="p-4 pl-6">
                                                <div className="font-syncopate font-black text-sm text-[#01FFFF] tracking-widest">
                                                    {item.plate_number || 'KL-07-CC-XXXX'}
                                                </div>
                                                <span className="text-[9px] text-[#8E939B] font-mono block mt-0.5">{item.date}</span>
                                            </td>

                                            {/* Vehicle Model */}
                                            <td className="p-4">
                                                <div className="flex items-center gap-2 text-white font-bold text-xs">
                                                    <Car className="w-3.5 h-3.5 text-white/70 flex-shrink-0" />
                                                    <span className="truncate max-w-[160px]">{item.vehicle_model || 'Standard Vehicle'}</span>
                                                </div>
                                            </td>

                                            {/* Customer Name / Phone */}
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <User className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                                                    <div>
                                                        <p className="font-bold text-white text-xs">{item.customer_name || 'Walk-In Customer'}</p>
                                                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                                            {item.customer_phone && (
                                                                <span className="text-[10px] font-mono text-[#8E939B] flex items-center gap-1">
                                                                    <Phone className="w-2.5 h-2.5 text-purple-400" />
                                                                    {item.customer_phone}
                                                                </span>
                                                            )}
                                                            {Number(item.customer_outstanding_balance || 0) > 0 && (
                                                                <span className="text-[9px] font-mono font-bold text-rose-300 bg-rose-500/15 border border-rose-500/30 px-1.5 py-0.2 rounded inline-flex items-center gap-1" title="Customer has outstanding Khata balance">
                                                                    <span>⚠️ Due: ₹{Number(item.customer_outstanding_balance).toLocaleString('en-IN')}</span>
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Service Completed */}
                                            <td className="p-4">
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                                    <Sparkles className="w-3 h-3 text-emerald-400" />
                                                    {item.service_package_name || 'Wash Service'}
                                                </span>
                                            </td>

                                            {/* Payment Mode */}
                                            <td className="p-4">
                                                {renderPaymentBadge(item)}
                                            </td>

                                            {/* Technician */}
                                            <td className="p-4">
                                                <span className="text-xs font-semibold text-[#8E939B]">
                                                    {item.technician_name || 'Unassigned'}
                                                </span>
                                            </td>

                                            {/* Amount & Receipt Download */}
                                            <td className="p-4 text-right pr-6">
                                                <div className="flex items-center justify-end gap-3">
                                                    <span className="font-syncopate font-bold text-white text-xs">
                                                        ₹{item.price}
                                                    </span>
                                                    {(item.booking_id || item.id) && (
                                                        <button
                                                            onClick={() => viewReceipt(item.booking_id || item.id)}
                                                            title="View Invoice / Receipt"
                                                            className="p-1.5 rounded-lg bg-white/5 hover:bg-[#01FFFF]/20 text-[#8E939B] hover:text-[#01FFFF] border border-white/10 transition-colors active:scale-95 touch-manipulation flex items-center gap-1 text-[10px] font-bold"
                                                        >
                                                            <FileText className="w-3.5 h-3.5" />
                                                            <span className="hidden sm:inline">Receipt</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
