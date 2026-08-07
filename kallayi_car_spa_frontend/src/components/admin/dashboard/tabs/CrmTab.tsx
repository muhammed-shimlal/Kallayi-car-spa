'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    BookOpen, Car, Calendar, Search, RefreshCw, 
    User, Phone, Sparkles, CheckCircle, AlertCircle, 
    BadgeDollarSign, Download, ArrowLeft, Filter, FileText
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Skeleton } from '@/components/ui/Skeleton';
import { getApiBaseUrl } from '@/lib/api';

const getApiBase = () => getApiBaseUrl();

export interface WashedVehicle {
    id: number;
    booking_id?: number;
    date: string;
    is_today: boolean;
    plate_number: string;
    vehicle_model: string;
    customer_name: string;
    customer_phone: string;
    service_package_name: string;
    technician_name: string;
    price: number;
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

    // Fetch Completed Washes History from Django Backend
    const fetchHistory = useCallback(async (dateStr: string, silent = false) => {
        const token = localStorage.getItem('auth_token');
        if (!token) return;
        if (!silent) setIsLoading(true);

        try {
            const res = await fetch(`${getApiBase()}/bookings/global-history/?date=${dateStr}`, {
                headers: { 'Authorization': `Token ${token}` }
            });
            if (!res.ok) throw new Error('API fetch failed');

            const data = await res.json();
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
        const token = localStorage.getItem('auth_token');
        if (!token) return;

        setIsSearching(true);
        try {
            const res = await fetch(`${getApiBase()}/vehicles/lookup/?plate=${encodeURIComponent(searchQuery.trim())}`, {
                headers: { 'Authorization': `Token ${token}` }
            });
            if (!res.ok) throw new Error('Vehicle record not found');
            const data = await res.json();
            setDossierData(data);
        } catch {
            toast.error(`No dossier history found for plate "${searchQuery}".`);
        } finally {
            setIsSearching(false);
        }
    };

    const viewReceipt = (bookingId?: number) => {
        if (!bookingId) return;
        window.open(`/invoice-preview?id=${bookingId}`, '_blank');
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
                            placeholder="Search Plate Number (e.g. KL-07-CC-1001)..."
                            className="w-full bg-[#141518] border border-white/10 py-2.5 pl-10 pr-4 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-[#01FFFF] transition-all uppercase"
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
                            <span className="text-[10px] text-[#01FFFF] uppercase tracking-widest font-bold">Vehicle Dossier</span>
                            <h2 className="text-2xl sm:text-3xl font-syncopate font-black tracking-widest text-white mt-1">
                                {dossierData.plate || searchQuery.toUpperCase()}
                            </h2>
                        </div>
                        <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-right">
                            <span className="text-[10px] text-[#8E939B] uppercase font-bold block">Registered Owner</span>
                            <span className="text-sm font-bold text-white">{dossierData.customer_name || 'Walk-In Customer'}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-black/40 border border-white/5 p-4 rounded-2xl">
                            <p className="text-[10px] text-[#8E939B] uppercase tracking-wider font-bold">Vehicle Model</p>
                            <p className="text-base font-bold text-white mt-1">{dossierData.model || dossierData.make_model || 'Standard Vehicle'}</p>
                        </div>
                        <div className="bg-black/40 border border-white/5 p-4 rounded-2xl">
                            <p className="text-[10px] text-[#8E939B] uppercase tracking-wider font-bold">Owner Phone</p>
                            <p className="text-base font-mono font-bold text-emerald-400 mt-1">{dossierData.phone || 'N/A'}</p>
                        </div>
                        <div className="bg-black/40 border border-white/5 p-4 rounded-2xl">
                            <p className="text-[10px] text-[#8E939B] uppercase tracking-wider font-bold">Total Services</p>
                            <p className="text-base font-mono font-bold text-[#01FFFF] mt-1">{dossierData.total_visits || 1} Visits</p>
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
                <div className="p-5 sm:p-6 border-b border-white/5 bg-[#0C0D0F] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                        <h4 className="font-syncopate font-bold text-sm tracking-widest text-[#01FFFF] uppercase">
                            COMPLETED WASH DIRECTORY ({washedVehicles.length})
                        </h4>
                        <p className="text-[10px] text-[#8E939B] uppercase tracking-wider font-bold mt-0.5">
                            Real-time Django database records for {selectedDate}
                        </p>
                    </div>
                    <span className="text-[10px] bg-[#01FFFF]/10 text-[#01FFFF] border border-[#01FFFF]/20 px-3 py-1 rounded-full font-mono font-bold uppercase">
                        Live Database Feed
                    </span>
                </div>

                <div className="overflow-x-auto scrollbar-none">
                    <table className="w-full text-left text-xs min-w-[700px]">
                        <thead className="bg-black/50 text-[#8E939B] font-grotesk text-[10px] uppercase tracking-widest border-b border-white/5">
                            <tr>
                                <th className="p-4 pl-6">Plate Number</th>
                                <th className="p-4">Vehicle Model</th>
                                <th className="p-4">Customer Name &amp; Phone</th>
                                <th className="p-4">Service Completed</th>
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
                                        <td className="p-4"><Skeleton className="h-5 w-24" /></td>
                                        <td className="p-4 text-right pr-6"><Skeleton className="h-5 w-16 ml-auto" /></td>
                                    </tr>
                                ))
                            ) : washedVehicles.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-12 text-center text-[#8E939B]">
                                        <AlertCircle className="w-8 h-8 text-[#8E939B] mx-auto mb-2 opacity-50" />
                                        <p className="font-bold uppercase tracking-wider text-xs">No washed vehicles recorded for {selectedDate}.</p>
                                        <p className="text-[10px] text-[#8E939B] mt-1">Check another date or complete a wash in the Live Queue.</p>
                                    </td>
                                </tr>
                            ) : (
                                washedVehicles.map((item) => (
                                    <tr key={item.id || item.booking_id} className="hover:bg-white/5 transition-colors">
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
                                                    {item.customer_phone && (
                                                        <p className="text-[10px] font-mono text-[#8E939B] flex items-center gap-1 mt-0.5">
                                                            <Phone className="w-2.5 h-2.5 text-purple-400" />
                                                            {item.customer_phone}
                                                        </p>
                                                    )}
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
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
