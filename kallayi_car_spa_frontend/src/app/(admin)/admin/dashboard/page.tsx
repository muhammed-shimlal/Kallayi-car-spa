'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
    LayoutDashboard, Users, Car, Wallet, LogOut,
    TrendingUp, Activity, Receipt, ChevronRight, Download,
    CreditCard, FileText, FlaskConical, CheckCircle, PlusCircle,
    Clock, AlertCircle, Check, BadgeDollarSign, UserCog, Lock,
    AlertTriangle, IndianRupee, Landmark, BookOpen, BarChart2, Trophy,
    Search, MapPin, Star, Calendar
} from 'lucide-react';
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend
} from 'recharts';

export default function AdminDashboard() {
    const router = useRouter();

    // --- Navigation State ---
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [financeSubTab, setFinanceSubTab] = useState('overview');
    const [adminName, setAdminName] = useState('Loading...');

    // --- Data States ---
    const [kpiData, setKpiData] = useState({ net_profit_today: 0, revenue_today: 0, general_expenses_today: 0, labor_cost_today: 0 });
    const generateDemoChartData = () => {
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            days.push({ name: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), value: Math.floor(Math.random() * 8000) + 2000 });
        }
        return days;
    };
    const [chartData, setChartData] = useState<any[]>(generateDemoChartData());
    const [recentBookings, setRecentBookings] = useState<any[]>([]);
    const [expenses, setExpenses] = useState<any[]>([]);
    const [payrollData, setPayrollData] = useState<any[]>([]);
    const [khataCustomers, setKhataCustomers] = useState<any[]>([]);
    const [khataLedger, setKhataLedger] = useState<any[]>([]);
    const [selectedKhataCustomer, setSelectedKhataCustomer] = useState<any | null>(null);
    const [isKhataModalOpen, setIsKhataModalOpen] = useState(false);
    const [khataPaymentAmount, setKhataPaymentAmount] = useState<string>('');
    const [eodData, setEodData] = useState<any>(null);

    const [customerCredits, setCustomerCredits] = useState<any[]>([]);
    const [analyticsData, setAnalyticsData] = useState<any>({
        busiest_hours: [],
        packages: [],
        top_staff: [],
    });

    // --- CRM State ---
    const [searchQuery, setSearchQuery] = useState('');
    const [vehicleData, setVehicleData] = useState<any | null>(null);
    const [crmLoading, setCrmLoading] = useState(false);
    const [crmError, setCrmError] = useState('');
    const [globalHistory, setGlobalHistory] = useState<any | null>(null);
    const [globalHistoryDate, setGlobalHistoryDate] = useState<string>(new Date().toISOString().split('T')[0]);

    // --- Data Fetching ---
    const fetchDashboardData = async () => {
        const token = localStorage.getItem('auth_token');
        if (!token) return router.push('/login');

        const HEADERS = { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' };
        const API_BASE = 'http://127.0.0.1:8001/api';

        try {
            const [userRes, kpiRes, chartRes, bookRes, expRes, creditRes, payrollRes, khataRes, eodRes, analyticsRes] = await Promise.all([
                fetch(`${API_BASE}/core/users/me/`, { headers: HEADERS }),
                fetch(`${API_BASE}/finance/dashboard/kpi_summary/`, { headers: HEADERS }),
                fetch(`${API_BASE}/finance/dashboard/revenue_chart/`, { headers: HEADERS }),
                fetch(`${API_BASE}/bookings/`, { headers: HEADERS }),
                fetch(`${API_BASE}/finance/expenses/`, { headers: HEADERS }),
                fetch(`${API_BASE}/finance/dashboard/outstanding_credit/`, { headers: HEADERS }),
                fetch(`${API_BASE}/staff/daily-settlement/`, { headers: HEADERS }),
                fetch(`${API_BASE}/finance/khata/`, { headers: HEADERS }),
                fetch(`${API_BASE}/finance/eod-report/`, { headers: HEADERS }),
                fetch(`${API_BASE}/finance/analytics/`, { headers: HEADERS }).catch(() => null),
                fetch(`${API_BASE}/bookings/global-history/`, { headers: HEADERS }).catch(() => null)
            ]);

            if (userRes?.ok) { const user = await userRes.json(); setAdminName(user.first_name || user.username); }
            if (kpiRes?.ok) setKpiData(await kpiRes.json());
            if (chartRes?.ok) {
                const chartApiData = await chartRes.json();
                if (Array.isArray(chartApiData) && chartApiData.length > 0) {
                    setChartData(chartApiData.map((d: any) => ({ name: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), value: d.value })));
                }
                // else keep the demo data already in state
            }
            if (bookRes?.ok) { const b = await bookRes.json(); setRecentBookings(b.slice(0, 10)); }
            if (expRes?.ok) { const e = await expRes.json(); setExpenses(e.results || e); }
            if (creditRes?.ok) { const creditData = await creditRes.json(); setCustomerCredits(creditData); }
            if (payrollRes?.ok) { const pd = await payrollRes.json(); setPayrollData(pd); }
            if (khataRes?.ok) { const khataData = await khataRes.json(); setCustomerCredits(khataData); setKhataCustomers(khataData); }
            if (eodRes?.ok) { const eodD = await eodRes.json(); setEodData(eodD); }
            if (analyticsRes?.ok) { setAnalyticsData(await analyticsRes.json()); }
            
            const [globalHistRes] = arguments[0] ? [] : [arguments.length > 0 ? arguments[10] : null];
            // Accessing the 11th resolved promise dynamically
            try {
               const ghRes = await fetch(`${API_BASE}/bookings/global-history/?date=${globalHistoryDate}`, { headers: HEADERS });
               if(ghRes.ok) setGlobalHistory(await ghRes.json());
            } catch (e) {}
            
        } catch (error) { console.error("Fetch Error:", error); } finally { setIsLoading(false); }
    };

    // Effect for re-fetching Global History when date changes
    useEffect(() => {
        const fetchGlobalHistoryOnly = async () => {
            if (activeTab !== 'crm' || vehicleData) return;
            const token = localStorage.getItem('auth_token');
            if (!token) return;
            try {
                const res = await fetch(`http://127.0.0.1:8001/api/bookings/global-history/?date=${globalHistoryDate}`, { headers: { 'Authorization': `Token ${token}` } });
                if (res.ok) setGlobalHistory(await res.json());
            } catch (e) {}
        };
        fetchGlobalHistoryOnly();
    }, [globalHistoryDate, activeTab, vehicleData]);

    const handleCrmSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        
        setCrmLoading(true);
        setCrmError('');
        const token = localStorage.getItem('auth_token');
        
        try {
            const res = await fetch(`http://127.0.0.1:8001/api/bookings/vehicle-history/?q=${encodeURIComponent(searchQuery)}`, {
                headers: { 'Authorization': `Token ${token}` }
            });
            
            if (res.ok) {
                const data = await res.json();
                setVehicleData(data);
                setActiveTab('crm');
            } else {
                const err = await res.json();
                setCrmError(err.error || 'Vehicle not found');
                setVehicleData(null);
            }
        } catch (error) {
            setCrmError('Connection error while fetching timeline.');
            setVehicleData(null);
        } finally {
            setCrmLoading(false);
        }
    };

    useEffect(() => { fetchDashboardData(); }, [router]);

    // --- Actions ---
    const handleLogout = () => { localStorage.removeItem('auth_token'); router.push('/login'); };

    const downloadTaxReport = async () => {
        try {
            const res = await fetch('http://127.0.0.1:8001/api/finance/reports/tax_summary/', { headers: { 'Authorization': `Token ${localStorage.getItem('auth_token')}` } });
            if (!res.ok) throw new Error("Failed");
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `tax_summary.csv`; a.click();
        } catch (e) { toast.error("Failed to export."); }
    };

    const downloadInvoicePDF = async (id: number) => {
        try {
            const res = await fetch(`http://127.0.0.1:8001/api/finance/invoices/${id}/download_pdf/`, { headers: { 'Authorization': `Token ${localStorage.getItem('auth_token')}` } });
            if (!res.ok) throw new Error("Failed");
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `Invoice_Kallayi_${id}.pdf`; a.click();
        } catch (e) { toast.error("Invoice generation failed."); }
    };

    const downloadInvoice = async (bookingId: number) => {
        try {
            const res = await fetch(`http://127.0.0.1:8001/api/finance/invoice/${bookingId}/pdf/`, {
                headers: { 'Authorization': `Token ${localStorage.getItem('auth_token')}` }
            });
            if (!res.ok) throw new Error('Failed to generate PDF');
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Kallayi_Invoice_${bookingId}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            toast.success('Invoice Downloaded');
        } catch (e) {
            toast.error('Failed to download invoice.');
        }
    };

    const approveExpense = async (id: number) => {
        try {
            await fetch(`http://127.0.0.1:8001/api/finance/expenses/${id}/`, {
                method: 'PATCH',
                headers: { 'Authorization': `Token ${localStorage.getItem('auth_token')}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_approved: true })
            });
            fetchDashboardData();
        } catch (e) { toast.error("Failed to approve"); }
    };

    const settleCredit = async (id: number) => {
        const token = localStorage.getItem('auth_token');
        try {
            const res = await fetch(`http://127.0.0.1:8001/api/invoices/${id}/mark_paid/`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Token ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (res.ok) {
                setCustomerCredits(prev => prev.filter(credit => credit.id !== id));
                fetchDashboardData();
                toast.success("Account marked as settled! Revenue updated.");
            } else {
                toast.error("Failed to settle account.");
            }
        } catch (e) {
            toast.error("Network error while settling account.");
        }
    };

    const loadKhataLedger = async (customer: any) => {
        setSelectedKhataCustomer(customer);
        try {
            const res = await fetch(`http://127.0.0.1:8001/api/finance/khata/${customer.id}/`, { headers: { 'Authorization': `Token ${localStorage.getItem('auth_token')}` } });
            if (res.ok) {
                setKhataLedger(await res.json());
            }
        } catch (e) { console.error("Failed to load Khata ledger"); }
    };

    const handleKhataSettle = async () => {
        if (!selectedKhataCustomer || !khataPaymentAmount) return;
        try {
            const res = await fetch(`http://127.0.0.1:8001/api/finance/khata/settle/`, {
                method: 'POST',
                headers: { 'Authorization': `Token ${localStorage.getItem('auth_token')}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ customer_id: selectedKhataCustomer.id, amount: khataPaymentAmount, description: "Admin Dashboard Settlement" })
            });
            if (res.ok) {
                toast.success("Payment received successfully!");
                setIsKhataModalOpen(false);
                setKhataPaymentAmount('');
                fetchDashboardData();
                loadKhataLedger(selectedKhataCustomer);
            } else {
                toast.error("Failed to process payment");
            }
        } catch (e) { toast.error("Network error"); }
    };

    const handleCloseRegister = async () => {
        try {
            const res = await fetch(`http://127.0.0.1:8001/api/finance/close-register/`, {
                method: 'POST',
                headers: { 'Authorization': `Token ${localStorage.getItem('auth_token')}`, 'Content-Type': 'application/json' }
            });
            if (res.ok) {
                toast.success('Register successfully closed and financial data locked.');
                fetchDashboardData();
            } else {
                const data = await res.json();
                toast.error(data.error || "Failed to close register.");
            }
        } catch (e) { toast.error("Network error closing register."); }
    };

    const settleWorkerPay = async (id: number) => {
        try {
            const token = localStorage.getItem('auth_token');
            const res = await fetch(`http://127.0.0.1:8001/api/staff/settle-pay/${id}/`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Token ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            if (res.ok) {
                setPayrollData(prev => prev.map(worker => worker.id === id ? { ...worker, status: 'Paid' } : worker));
                toast.success('Worker paid successfully.');
            } else {
                toast.error("Failed to settle worker pay");
            }
        } catch (e) {
            toast.error("Network error settling worker pay");
        }
    };

    const totalOutstandingCredit = customerCredits.reduce((sum, item) => sum + item.amount, 0);
    const totalDailyPayout = payrollData.reduce((sum, worker) => sum + worker.final_payout, 0);

    if (isLoading) return (
        <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center">
            <Activity className="w-10 h-10 text-[#01FFFF] animate-spin" />
        </div>
    );

    return (
        <div className="min-h-screen bg-[#050505] text-white flex font-jakarta selection:bg-[#FF2A6D]">

            {/* SIDEBAR NAVIGATION */}
            <aside className="w-72 bg-[#141518]/60 backdrop-blur-2xl border-r border-white/5 flex flex-col hidden lg:flex">
                <div className="p-8 border-b border-white/5">
                    <h2 className="text-xl font-syncopate font-bold tracking-widest">KALLAYI<span className="text-[#FF2A6D]">.</span></h2>
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#8E939B] mt-2">Admin Portal</p>
                </div>
                <nav className="flex-1 p-6 space-y-2">
                    <button onClick={() => setActiveTab('overview')} className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'overview' ? 'bg-white/5 text-[#01FFFF] border border-[#01FFFF]/20' : 'text-[#8E939B] hover:text-white'}`}>
                        <LayoutDashboard className="w-4 h-4" /> Overview
                    </button>
                    <button onClick={() => setActiveTab('finance')} className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'finance' ? 'bg-white/5 text-[#01FFFF] border border-[#01FFFF]/20' : 'text-[#8E939B] hover:text-white'}`}>
                        <Wallet className="w-4 h-4" /> Finance Dept
                    </button>
                    <button onClick={() => setActiveTab('staff')} className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'staff' ? 'bg-white/5 text-[#01FFFF] border border-[#01FFFF]/20' : 'text-[#8E939B] hover:text-white'}`}>
                        <Users className="w-4 h-4" /> Staff Ops
                    </button>
                    <button onClick={() => setActiveTab('analytics')} className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'analytics' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30' : 'text-[#8E939B] hover:text-white'}`}>
                        <BarChart2 className="w-4 h-4" /> Analytics & Insights
                    </button>
                    <button onClick={() => setActiveTab('crm')} className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'crm' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'text-[#8E939B] hover:text-white'}`}>
                        <Search className="w-4 h-4" /> CRM & History
                    </button>
                    <button onClick={() => setActiveTab('eod')} className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'eod' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30' : 'text-[#8E939B] hover:text-white'}`}>
                        <FileText className="w-4 h-4" /> EOD Closing
                    </button>
                    <button onClick={() => router.push('/admin/queue')} className="w-full flex items-center gap-4 px-4 py-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all text-[#8E939B] hover:text-[#01FFFF] hover:bg-[#01FFFF]/5 hover:border hover:border-[#01FFFF]/20">
                        <Activity className="w-4 h-4" /> Live Queue
                    </button>


                    <div className="pt-4 mt-4 border-t border-white/10">
                        <button onClick={() => router.push('/staff/pos')} className="w-full flex items-center justify-center gap-2 px-4 py-4 rounded-xl bg-[#E52323] text-white font-bold text-xs uppercase tracking-widest hover:bg-red-700 transition-all shadow-[0_0_20px_rgba(229,35,35,0.4)]">
                            Launch Express POS <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </nav>
                <div className="p-6 border-t border-white/5">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center font-syncopate font-bold">
                            {adminName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <p className="font-bold text-sm">{adminName}</p>
                            <p className="text-[10px] text-[#8E939B] uppercase tracking-widest">System Admin</p>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="w-full flex justify-center items-center gap-2 px-4 py-3 rounded-xl border border-white/10 text-gray-400 hover:text-[#FF2A6D] hover:border-[#FF2A6D]/50 transition-colors text-xs font-bold uppercase tracking-widest">
                        <LogOut className="w-4 h-4" /> Disconnect
                    </button>
                </div>
            </aside>

            {/* MAIN CONTENT AREA */}
            <main className="flex-1 p-8 lg:p-12 overflow-y-auto relative">
                
                {/* GLOBAL CRM SEARCH BAR */}
                <div className="mb-8">
                    <form onSubmit={handleCrmSearch} className="relative max-w-2xl">
                        <input 
                            type="text" 
                            placeholder="Search License Plate (e.g. KL-11-AB-1234) for CRM Dossier..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[#141518]/80 backdrop-blur-xl border border-white/10 focus:border-[#01FFFF] rounded-2xl py-4 pl-14 pr-6 text-white font-syncopate tracking-widest text-xs outline-none transition-all shadow-[0_0_20px_rgba(0,0,0,0.5)] focus:shadow-[0_0_30px_rgba(1,255,255,0.15)]"
                        />
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8E939B]" />
                        <button type="submit" disabled={crmLoading} className="absolute right-3 top-1/2 -translate-y-1/2 bg-[#01FFFF]/10 text-[#01FFFF] hover:bg-[#01FFFF] hover:text-black border border-[#01FFFF]/30 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all">
                            {crmLoading ? 'Scanning...' : 'Search'}
                        </button>
                        {vehicleData && (
                            <button 
                                type="button" 
                                onClick={() => { setVehicleData(null); setSearchQuery(''); }}
                                className="absolute -right-24 top-1/2 -translate-y-1/2 text-[#8E939B] hover:text-[#FF2A6D] text-[10px] uppercase font-bold tracking-widest flex items-center gap-1 transition-colors"
                            >
                                ✕ Clear
                            </button>
                        )}
                    </form>
                    {crmError && <p className="text-[#FF2A6D] text-xs mt-3 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {crmError}</p>}
                </div>

                {/* REAL-TIME KPI DASHBOARD (Always Visible) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-[#141518]/60 backdrop-blur-xl border border-[#01FFFF]/30 p-6 rounded-3xl relative overflow-hidden group shadow-[0_0_30px_rgba(1,255,255,0.05)]">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#01FFFF]/10 rounded-full blur-[50px] group-hover:bg-[#01FFFF]/20 transition-all"></div>
                        <p className="text-[#01FFFF] text-[10px] font-bold uppercase tracking-[0.2em] mb-2 flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Net Profit Today</p>
                        <h2 className="text-4xl font-syncopate font-bold text-white tracking-tighter">₹{kpiData.net_profit_today.toLocaleString()}</h2>
                    </div>
                    <div className="bg-[#141518]/60 border border-white/5 p-6 rounded-3xl"><p className="text-[#8E939B] text-[10px] font-bold uppercase tracking-[0.2em] mb-2">Total Revenue</p><h2 className="text-3xl font-syncopate font-bold">₹{kpiData.revenue_today.toLocaleString()}</h2></div>
                    <div className="bg-[#141518]/60 border border-white/5 p-6 rounded-3xl"><p className="text-[#8E939B] text-[10px] font-bold uppercase tracking-[0.2em] mb-2">Labor Cost</p><h2 className="text-3xl font-syncopate font-bold">₹{kpiData.labor_cost_today.toLocaleString()}</h2></div>
                    <div className="bg-[#141518]/60 border border-white/5 p-6 rounded-3xl"><p className="text-[#8E939B] text-[10px] font-bold uppercase tracking-[0.2em] mb-2">General Expenses</p><h2 className="text-3xl font-syncopate font-bold text-[#FF2A6D]">₹{kpiData.general_expenses_today.toLocaleString()}</h2></div>
                </div>

                {/* ---------------------------------------------------- */}
                {/* VIEW A: OVERVIEW TAB */}
                {/* ---------------------------------------------------- */}
                {activeTab === 'overview' && (
                    <div className="animate-[fadeIn_0.5s_ease-out] grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 bg-[#141518]/60 backdrop-blur-xl border border-white/5 p-6 rounded-3xl h-96">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                    <XAxis dataKey="name" stroke="#8E939B" fontSize={10} tickLine={false} axisLine={false} dy={10} />
                                    <YAxis stroke="#8E939B" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value}`} dx={-10} />
                                    <Tooltip contentStyle={{ backgroundColor: '#050505', border: '1px solid rgba(255,255,255,0.1)' }} itemStyle={{ color: '#01FFFF' }} />
                                    <Line type="monotone" dataKey="value" stroke="#01FFFF" strokeWidth={3} dot={{ fill: '#050505', stroke: '#01FFFF', strokeWidth: 2, r: 4 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="bg-[#141518]/60 backdrop-blur-xl border border-white/5 p-6 rounded-3xl flex flex-col">
                            <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
                                <h3 className="font-syncopate font-bold tracking-widest text-sm">LIVE QUEUE</h3>
                            </div>
                            <div className="flex-1 overflow-y-auto space-y-4 pr-2 hide-scrollbar">
                                {recentBookings.length === 0 ? <p className="text-[#8E939B] text-center text-xs mt-10">No active bookings.</p> :
                                    recentBookings.map((booking: any) => (
                                        <div key={booking.id} className="bg-white/5 border border-white/5 p-4 rounded-2xl">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <p className="font-bold text-sm text-white">{booking.vehicle_info || 'Unknown Vehicle'}</p>
                                                    <p className="text-[10px] text-[#8E939B] uppercase tracking-widest mt-1">{booking.service_package_details?.name || 'Standard Wash'}</p>
                                                </div>
                                                <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-sm ${booking.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#FF2A6D]/20 text-[#FF2A6D]'}`}>
                                                    {booking.status}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                }
                            </div>
                        </div>
                    </div>
                )}

                {/* ---------------------------------------------------- */}
                {/* VIEW B: FINANCE COMMAND CENTER */}
                {/* ---------------------------------------------------- */}
                {activeTab === 'finance' && (
                    <div className="animate-[fadeIn_0.5s_ease-out]">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-syncopate font-bold tracking-widest text-xl">FINANCIAL LEDGER</h3>
                            <button onClick={downloadTaxReport} className="flex items-center gap-2 bg-white/10 text-white border border-white/20 px-6 py-3 rounded-full font-bold text-xs uppercase tracking-widest hover:bg-white hover:text-black transition">
                                <Download className="w-4 h-4" /> Export Tax Report
                            </button>
                        </div>

                        <div className="flex flex-wrap gap-4 border-b border-white/10 pb-4 mb-8">
                            <button onClick={() => setFinanceSubTab('overview')} className={`px-4 py-2 font-bold text-xs uppercase tracking-widest rounded-lg transition-all ${financeSubTab === 'overview' ? 'bg-[#01FFFF]/10 text-[#01FFFF]' : 'text-[#8E939B] hover:text-white'}`}>Trend Analysis</button>
                            <button onClick={() => setFinanceSubTab('khata')} className={`px-4 py-2 font-bold text-xs uppercase tracking-widest rounded-lg transition-all ${financeSubTab === 'khata' ? 'bg-[#01FFFF]/10 text-[#01FFFF]' : 'text-[#8E939B] hover:text-white'}`}>Khata (Credit)</button>
                            <button onClick={() => setFinanceSubTab('expenses')} className={`px-4 py-2 font-bold text-xs uppercase tracking-widest rounded-lg transition-all ${financeSubTab === 'expenses' ? 'bg-[#FF2A6D]/10 text-[#FF2A6D]' : 'text-[#8E939B] hover:text-white'}`}>Expense Manager</button>
                            <button onClick={() => setFinanceSubTab('invoices')} className={`px-4 py-2 font-bold text-xs uppercase tracking-widest rounded-lg transition-all ${financeSubTab === 'invoices' ? 'bg-emerald-500/10 text-emerald-400' : 'text-[#8E939B] hover:text-white'}`}>PDF Invoices</button>
                        </div>

                        {financeSubTab === 'overview' && (
                            <div className="animate-[fadeIn_0.3s_ease-out] space-y-6">
                                {/* Summary Stats Row */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="bg-[#141518]/60 border border-white/5 p-5 rounded-2xl">
                                        <p className="text-[10px] text-[#8E939B] uppercase tracking-[0.2em] mb-1">7-Day Revenue</p>
                                        <h3 className="text-2xl font-syncopate font-bold text-[#01FFFF]">
                                            ₹{chartData.reduce((s: number, d: any) => s + (d.value || 0), 0).toLocaleString()}
                                        </h3>
                                    </div>
                                    <div className="bg-[#141518]/60 border border-white/5 p-5 rounded-2xl">
                                        <p className="text-[10px] text-[#8E939B] uppercase tracking-[0.2em] mb-1">Peak Day</p>
                                        <h3 className="text-2xl font-syncopate font-bold text-emerald-400">
                                            {chartData.reduce((max: any, d: any) => d.value > (max?.value || 0) ? d : max, chartData[0])?.name || '—'}
                                        </h3>
                                    </div>
                                    <div className="bg-[#141518]/60 border border-white/5 p-5 rounded-2xl">
                                        <p className="text-[10px] text-[#8E939B] uppercase tracking-[0.2em] mb-1">Avg / Day</p>
                                        <h3 className="text-2xl font-syncopate font-bold text-white">
                                            ₹{chartData.length > 0 ? Math.round(chartData.reduce((s: number, d: any) => s + (d.value || 0), 0) / chartData.length).toLocaleString() : 0}
                                        </h3>
                                    </div>
                                    <div className="bg-[#141518]/60 border border-white/5 p-5 rounded-2xl">
                                        <p className="text-[10px] text-[#8E939B] uppercase tracking-[0.2em] mb-1">Data Points</p>
                                        <h3 className="text-2xl font-syncopate font-bold text-purple-400">{chartData.length} days</h3>
                                    </div>
                                </div>

                                {/* The Line Chart */}
                                <div className="bg-[#141518]/60 border border-[#01FFFF]/20 p-6 rounded-3xl shadow-[0_0_30px_rgba(1,255,255,0.04)]">
                                    <div className="flex items-center gap-3 mb-6">
                                        <TrendingUp className="w-4 h-4 text-[#01FFFF]" />
                                        <h4 className="font-syncopate font-bold text-sm tracking-widest text-[#01FFFF]">REVENUE TREND</h4>
                                        <span className="ml-auto text-[10px] text-[#8E939B] uppercase tracking-widest">Last {chartData.length} days</span>
                                    </div>
                                    <div className="h-72">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={chartData}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                                <XAxis dataKey="name" stroke="#8E939B" fontSize={10} tickLine={false} axisLine={false} dy={10} />
                                                <YAxis stroke="#8E939B" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} dx={-10} />
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: '#0C0D0F', border: '1px solid rgba(1,255,255,0.2)', borderRadius: '12px' }}
                                                    itemStyle={{ color: '#01FFFF' }}
                                                    labelStyle={{ color: '#8E939B', fontSize: 11 }}
                                                    formatter={(v: any) => [`₹${v.toLocaleString()}`, 'Revenue']}
                                                />
                                                <Line type="monotone" dataKey="value" stroke="#01FFFF" strokeWidth={2.5}
                                                    dot={{ fill: '#050505', stroke: '#01FFFF', strokeWidth: 2, r: 4 }}
                                                    activeDot={{ r: 6, fill: '#01FFFF' }}
                                                />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                        )}

                        {financeSubTab === 'khata' && (
                            <div className="animate-[fadeIn_0.3s_ease-out]">
                                <div className="bg-purple-900/10 border border-purple-500/30 p-6 rounded-3xl mb-6 flex justify-between items-center">
                                    <div>
                                        <p className="text-purple-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-1 flex items-center gap-2"><Clock className="w-4 h-4" /> Outstanding Balance</p>
                                        <h2 className="text-3xl font-syncopate font-bold text-white tracking-tighter">₹{totalOutstandingCredit.toLocaleString()}</h2>
                                    </div>
                                    <div className="text-right hidden sm:block">
                                        <p className="text-[#8E939B] text-xs">Unpaid accounts are tracked here.</p>
                                        <p className="text-[#8E939B] text-xs">Settle them when cash is received.</p>
                                    </div>
                                </div>

                                <div className="bg-[#141518]/60 border border-white/5 rounded-3xl overflow-hidden">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-black/40 text-[#8E939B] font-grotesk text-[10px] uppercase tracking-widest">
                                            <tr><th className="p-4 pl-6">Customer</th><th className="p-4">Vehicle/Account</th><th className="p-4">Date of Service</th><th className="p-4">Amount Owed</th><th className="p-4 text-right pr-6">Action</th></tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {customerCredits.length === 0 ? (
                                                <tr><td colSpan={5} className="p-8 text-center text-[#8E939B]">All accounts are settled! No outstanding credit.</td></tr>
                                            ) : (
                                                customerCredits.map((credit) => (
                                                    <tr key={credit.id} className="hover:bg-white/5">
                                                        <td className="p-4 pl-6 font-bold text-white">{credit.customer}</td>
                                                        <td className="p-4 text-[#8E939B]">{credit.vehicle}</td>
                                                        <td className="p-4 font-mono text-xs">{credit.date}</td>
                                                        <td className="p-4 font-syncopate font-bold text-yellow-400 flex items-center gap-2">
                                                            ₹{credit.amount}
                                                            {credit.status === 'Overdue' && <AlertCircle className="w-4 h-4 text-[#FF2A6D]" />}
                                                        </td>
                                                        <td className="p-4 text-right pr-6">
                                                            <button onClick={() => settleCredit(credit.id)} className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-sm uppercase tracking-widest font-bold flex gap-1 ml-auto items-center hover:bg-emerald-500 hover:text-black transition">
                                                                <Check className="w-3 h-3" /> Mark Paid
                                                            </button>
                                                        </td>
                                                    </tr>
                                                )))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {financeSubTab === 'expenses' && (
                            <div className="bg-[#141518]/60 border border-white/5 rounded-3xl overflow-hidden animate-[fadeIn_0.3s_ease-out]">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-black/40 text-[#8E939B] font-grotesk text-[10px] uppercase tracking-widest">
                                        <tr><th className="p-4 pl-6">Date</th><th className="p-4">Description</th><th className="p-4">Amount</th><th className="p-4 text-right pr-6">Action</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {expenses.map((exp: any) => (
                                            <tr key={exp.id} className="hover:bg-white/5">
                                                <td className="p-4 pl-6 font-mono text-xs">{new Date(exp.date).toLocaleDateString()}</td>
                                                <td className="p-4">{exp.description}</td>
                                                <td className="p-4 font-bold text-[#FF2A6D]">₹{exp.amount}</td>
                                                <td className="p-4 text-right pr-6">
                                                    {exp.is_approved ? <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-sm uppercase tracking-widest font-bold">Approved</span> : <button onClick={() => approveExpense(exp.id)} className="text-[9px] bg-[#FF2A6D] text-white px-3 py-1.5 rounded-sm uppercase tracking-widest font-bold flex gap-1 ml-auto items-center"><CheckCircle className="w-3 h-3" /> Approve</button>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {financeSubTab === 'invoices' && (
                            <div className="bg-[#141518]/60 border border-white/5 rounded-3xl overflow-hidden animate-[fadeIn_0.3s_ease-out]">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-black/40 text-[#8E939B] font-grotesk text-[10px] uppercase tracking-widest">
                                        <tr><th className="p-4 pl-6">Booking ID</th><th className="p-4">Customer</th><th className="p-4">Amount</th><th className="p-4 text-right pr-6">Generate</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {recentBookings.filter((b: any) => b.status === 'COMPLETED').map((booking: any) => (
                                            <tr key={booking.id} className="hover:bg-white/5">
                                                <td className="p-4 pl-6 font-mono text-xs">#INV-{booking.id.toString().padStart(4, '0')}</td>
                                                <td className="p-4 font-bold">{booking.vehicle_info}</td>
                                                <td className="p-4 text-[#01FFFF] font-bold">₹{booking.final_price || booking.service_package_details?.price}</td>
                                                <td className="p-4 text-right pr-6">
                                                    <button onClick={() => downloadInvoicePDF(booking.id)} className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 hover:bg-emerald-500 hover:text-black transition px-3 py-1.5 rounded-sm uppercase tracking-widest font-bold flex gap-1 ml-auto items-center"><FileText className="w-3 h-3" /> Get PDF</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* ---------------------------------------------------- */}
                {/* VIEW C: STAFF OPS & DYNAMIC PAYROLL TAB */}
                {/* ---------------------------------------------------- */}
                {activeTab === 'staff' && (
                    <div className="animate-[fadeIn_0.5s_ease-out]">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-syncopate font-bold tracking-widest text-xl">STAFF OPERATIONS</h3>
                            <button className="flex items-center gap-2 bg-white/10 text-white border border-white/20 px-6 py-3 rounded-full font-bold text-xs uppercase tracking-widest hover:bg-white hover:text-black transition">
                                <PlusCircle className="w-4 h-4" /> Add Expense/Advance
                            </button>
                        </div>

                        <div className="bg-emerald-900/10 border border-emerald-500/30 p-6 rounded-3xl mb-8 flex justify-between items-center">
                            <div>
                                <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-1 flex items-center gap-2"><Wallet className="w-4 h-4" /> Total Daily Payout</p>
                                <h2 className="text-4xl font-syncopate font-bold text-white tracking-tighter">₹{totalDailyPayout.toLocaleString()}</h2>
                            </div>
                            <div className="text-right hidden sm:block">
                                <p className="text-[#8E939B] text-xs">Calculated via Time-Stamped Rate Locking.</p>
                                <p className="text-[#8E939B] text-xs">[Base] + [Commission] - [Advances] = Payout</p>
                            </div>
                        </div>

                        <div className="bg-[#141518]/60 border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
                            <div className="p-6 border-b border-white/5 flex gap-2 items-center">
                                <UserCog className="w-5 h-5 text-[#8E939B]" />
                                <h4 className="font-bold text-sm uppercase tracking-widest text-[#8E939B]">Staff Payroll Ledger (Today)</h4>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-black/40 text-[#8E939B] font-grotesk text-[10px] uppercase tracking-widest">
                                        <tr>
                                            <th className="p-4 pl-6">Worker Info</th>
                                            <th className="p-4 text-center">Jobs Done</th>
                                            <th className="p-4 text-right">Base Salary</th>
                                            <th className="p-4 text-right text-[#01FFFF]">+ Commissions</th>
                                            <th className="p-4 text-right text-[#FF2A6D]">- Advances</th>
                                            <th className="p-4 text-right text-white">Final Payout</th>
                                            <th className="p-4 text-right pr-6">Settle</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {payrollData.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="p-8 text-center text-[#8E939B]">No active staff records today.</td>
                                            </tr>
                                        ) : payrollData.map((worker) => (
                                            <tr key={worker.id} className="hover:bg-white/5 transition-colors group">
                                                <td className="p-4 pl-6">
                                                    <p className="font-bold text-white text-base">{worker.name}</p>
                                                    <p className="text-[10px] text-[#8E939B] uppercase tracking-widest mt-1">{worker.role}</p>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <span className="bg-white/10 text-white px-3 py-1 rounded-full text-xs font-bold font-mono">{worker.jobs_completed}</span>
                                                </td>
                                                <td className="p-4 text-right font-mono text-gray-400">₹{worker.base_salary}</td>
                                                <td className="p-4 text-right font-mono font-bold text-[#01FFFF]">₹{worker.commission_earned}</td>
                                                <td className="p-4 text-right font-mono font-bold text-[#FF2A6D]">₹{worker.advances}</td>
                                                <td className="p-4 text-right font-syncopate font-bold text-lg text-emerald-400 group-hover:scale-110 transition-transform origin-right">
                                                    ₹{worker.final_payout}
                                                </td>
                                                <td className="p-4 text-right pr-6">
                                                    {worker.status === 'Paid' ? (
                                                        <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-sm uppercase tracking-widest font-bold">
                                                            <CheckCircle className="w-3 h-3" /> Settled
                                                        </span>
                                                    ) : (
                                                        <button
                                                            onClick={() => settleWorkerPay(worker.id)}
                                                            className="inline-flex items-center gap-1 text-[10px] bg-[#01FFFF] text-black hover:bg-white transition-colors px-4 py-1.5 rounded-sm uppercase tracking-widest font-bold shadow-[0_0_15px_rgba(1,255,255,0.3)]"
                                                        >
                                                            <BadgeDollarSign className="w-3 h-3" /> Pay Cash
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* ---------------------------------------------------- */}
                {/* VIEW D: ANALYTICS & INSIGHTS TAB                       */}
                {/* ---------------------------------------------------- */}
                {activeTab === 'analytics' && (
                    <div className="animate-[fadeIn_0.5s_ease-out] space-y-8">
                        <div className="flex justify-between items-center mb-2">
                            <div>
                                <h3 className="font-syncopate font-bold tracking-widest text-xl flex items-center gap-3">
                                    <BarChart2 className="w-6 h-6 text-blue-400" /> ANALYTICS & INSIGHTS
                                </h3>
                                <p className="text-[10px] text-[#8E939B] uppercase tracking-[0.2em] mt-1">Aggregated from all completed bookings</p>
                            </div>
                        </div>

                        {/* Row 1: Busiest Hours + Package Revenue */}
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">

                            {/* Widget 1: Busiest Hours */}
                            <div className="bg-[#141518]/60 backdrop-blur-xl border border-[#01FFFF]/20 p-6 rounded-3xl shadow-[0_0_30px_rgba(1,255,255,0.04)]">
                                <div className="flex items-center gap-3 mb-1">
                                    <Clock className="w-4 h-4 text-[#01FFFF]" />
                                    <h4 className="font-syncopate font-bold text-sm tracking-widest text-[#01FFFF]">BUSIEST HOURS</h4>
                                </div>
                                <p className="text-[10px] text-[#8E939B] uppercase tracking-widest mb-6">Scheduling intelligence — peak demand windows</p>
                                <div className="h-56">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={analyticsData.busiest_hours} barCategoryGap="30%">
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                                            <XAxis dataKey="hour" stroke="#8E939B" fontSize={10} tickLine={false} axisLine={false} />
                                            <YAxis stroke="#8E939B" fontSize={10} tickLine={false} axisLine={false} width={28} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#0C0D0F', border: '1px solid rgba(1,255,255,0.2)', borderRadius: '12px' }}
                                                itemStyle={{ color: '#01FFFF' }}
                                                labelStyle={{ color: '#8E939B', fontSize: 11 }}
                                                formatter={(v: any) => [`${v} cars`, 'Volume']}
                                            />
                                            <Bar dataKey="count" fill="#01FFFF" radius={[6, 6, 0, 0]}>
                                                {analyticsData.busiest_hours.map((_: any, i: number) => (
                                                    <Cell key={i} fill={i === analyticsData.busiest_hours.reduce((maxI: number, row: any, idx: number, arr: any[]) => row.count > arr[maxI].count ? idx : maxI, 0) ? '#FF2A6D' : '#01FFFF'} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                                <p className="text-[10px] text-[#8E939B] mt-3 text-center">🔴 Peak hour highlighted in red</p>
                            </div>

                            {/* Widget 2: Package Revenue */}
                            <div className="bg-[#141518]/60 backdrop-blur-xl border border-[#FF2A6D]/20 p-6 rounded-3xl shadow-[0_0_30px_rgba(255,42,109,0.04)]">
                                <div className="flex items-center gap-3 mb-1">
                                    <TrendingUp className="w-4 h-4 text-[#FF2A6D]" />
                                    <h4 className="font-syncopate font-bold text-sm tracking-widest text-[#FF2A6D]">REVENUE BY PACKAGE</h4>
                                </div>
                                <p className="text-[10px] text-[#8E939B] uppercase tracking-widest mb-6">Marketing intelligence — highest-value services</p>
                                <div className="h-56">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={analyticsData.packages} layout="vertical" barCategoryGap="25%">
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                                            <XAxis type="number" stroke="#8E939B" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                                            <YAxis type="category" dataKey="name" stroke="#8E939B" fontSize={10} tickLine={false} axisLine={false} width={120} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#0C0D0F', border: '1px solid rgba(255,42,109,0.2)', borderRadius: '12px' }}
                                                labelStyle={{ color: '#8E939B', fontSize: 11 }}
                                                formatter={(v: any) => [`₹${v.toLocaleString()}`, 'Revenue']}
                                            />
                                            <Bar dataKey="total_revenue" radius={[0, 6, 6, 0]}>
                                                {analyticsData.packages.map((_: any, i: number) => (
                                                    <Cell key={i} fill={i % 2 === 0 ? '#FF2A6D' : '#01FFFF'} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        {/* Widget 3: Staff Leaderboard */}
                        <div className="bg-[#141518]/60 backdrop-blur-xl border border-white/5 p-8 rounded-3xl">
                            <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
                                <Trophy className="w-5 h-5 text-yellow-400" />
                                <h4 className="font-syncopate font-bold text-sm tracking-widest text-yellow-400">TOP PERFORMING STAFF</h4>
                                <span className="ml-auto text-[10px] text-[#8E939B] uppercase tracking-widest">By jobs completed today</span>
                            </div>
                            <div className="space-y-3">
                                {analyticsData.top_staff.length === 0 ? (
                                    <p className="text-[#8E939B] text-center text-xs py-8">No completed bookings yet today.</p>
                                ) : analyticsData.top_staff.map((staff: any, i: number) => {
                                    const rankColors = ['text-yellow-400', 'text-gray-300', 'text-amber-600'];
                                    const rankBg = ['bg-yellow-500/10 border-yellow-500/30', 'bg-gray-400/10 border-gray-400/20', 'bg-amber-700/10 border-amber-600/20'];
                                    const rankLabel = ['🥇', '🥈', '🥉'];
                                    const isTop = i < 3;
                                    const maxJobs = analyticsData.top_staff[0]?.jobs_completed || 1;
                                    const pct = Math.round((staff.jobs_completed / maxJobs) * 100);
                                    return (
                                        <div key={i} className={`flex items-center gap-5 p-4 rounded-2xl border ${isTop ? rankBg[i] : 'border-white/5 bg-white/2'}`}>
                                            <span className="text-xl w-8 text-center">{isTop ? rankLabel[i] : `#${i + 1}`}</span>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-center mb-2">
                                                    <p className={`font-bold text-sm ${isTop ? rankColors[i] : 'text-white'}`}>{staff.name}</p>
                                                    <span className="font-syncopate font-black text-sm text-white">{staff.jobs_completed} <span className="text-[10px] text-[#8E939B] font-normal">jobs</span></span>
                                                </div>
                                                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-700 ${i === 0 ? 'bg-yellow-400' : i === 1 ? 'bg-gray-300' : i === 2 ? 'bg-amber-600' : 'bg-white/30'}`}
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* ---------------------------------------------------- */}
                {/* VIEW F: CRM & HISTORY (Digital Garage)                 */}
                {/* ---------------------------------------------------- */}
                {activeTab === 'crm' && (
                  vehicleData ? (
                    <div className="animate-[fadeIn_0.5s_ease-out] space-y-8">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="font-syncopate font-bold tracking-widest text-2xl flex items-center gap-3">
                                    <BookOpen className="w-6 h-6 text-emerald-400" /> VEHICLE DOSSIER
                                </h3>
                                <p className="text-[10px] text-[#8E939B] uppercase tracking-[0.2em] mt-1">Digital Garage CRM</p>
                            </div>
                        </div>

                        {/* SECTION 1: PROFILE ROW & KPIS */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Profile Card */}
                            <div className="bg-[#141518]/60 backdrop-blur-xl border border-white/5 p-8 rounded-3xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-[50px] group-hover:bg-emerald-500/10 transition-all"></div>
                                <div className="flex justify-between items-start mb-6">
                                    <div className="bg-white/10 px-4 py-1 rounded-sm border border-white/20">
                                        <h2 className="text-2xl font-syncopate font-black tracking-[0.1em]">{vehicleData.vehicle_profile.plate_number}</h2>
                                    </div>
                                    {vehicleData.vehicle_profile.outstanding_balance > 0 ? (
                                        <span className="text-[10px] font-bold uppercase tracking-widest bg-[#FF2A6D]/20 text-[#FF2A6D] border border-[#FF2A6D]/30 px-3 py-1.5 rounded-full flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" /> Dept: ₹{vehicleData.vehicle_profile.outstanding_balance}
                                        </span>
                                    ) : (
                                        <span className="text-[10px] font-bold uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-full flex items-center gap-1">
                                            <CheckCircle className="w-3 h-3" /> Clear Account
                                        </span>
                                    )}
                                </div>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <Car className="w-5 h-5 text-[#8E939B]" />
                                        <div>
                                            <p className="text-[10px] text-[#8E939B] uppercase tracking-widest">Vehicle Model</p>
                                            <p className="font-bold text-sm text-white truncate max-w-[200px]">{vehicleData.vehicle_profile.model}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <UserCog className="w-5 h-5 text-[#8E939B]" />
                                        <div>
                                            <p className="text-[10px] text-[#8E939B] uppercase tracking-widest">Owner</p>
                                            <p className="font-bold text-sm text-white truncate max-w-[200px]">{vehicleData.vehicle_profile.owner_name}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* LTV & KPIs */}
                            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-[#141518]/60 backdrop-blur-xl border border-emerald-500/20 p-6 rounded-3xl shadow-[0_0_20px_rgba(52,211,153,0.05)] flex flex-col justify-center text-center">
                                    <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-2 flex items-center justify-center gap-2">
                                        <BadgeDollarSign className="w-4 h-4" /> Lifetime Spend
                                    </p>
                                    <h2 className="text-4xl font-syncopate font-bold tracking-tighter text-white">₹{vehicleData.kpis.total_lifetime_spend.toLocaleString()}</h2>
                                </div>
                                <div className="bg-[#141518]/60 backdrop-blur-xl border border-white/5 p-6 rounded-3xl flex flex-col justify-center text-center">
                                    <p className="text-[#8E939B] text-[10px] font-bold uppercase tracking-[0.2em] mb-2 flex items-center justify-center gap-2">
                                        <MapPin className="w-4 h-4" /> Total Visits
                                    </p>
                                    <h2 className="text-4xl font-syncopate font-bold tracking-tighter text-white">{vehicleData.kpis.total_visits} <span className="text-sm font-normal text-[#8E939B] tracking-normal">times</span></h2>
                                </div>
                                <div className="bg-[#141518]/60 backdrop-blur-xl border border-[#01FFFF]/20 p-6 rounded-3xl flex flex-col justify-center text-center shadow-[0_0_20px_rgba(1,255,255,0.05)]">
                                    <p className="text-[#01FFFF] text-[10px] font-bold uppercase tracking-[0.2em] mb-2 flex items-center justify-center gap-2">
                                        <Star className="w-4 h-4" /> Favorite Service
                                    </p>
                                    <h2 className="text-sm font-bold text-white uppercase tracking-widest leading-relaxed mt-2">{vehicleData.kpis.favorite_service}</h2>
                                </div>
                            </div>
                        </div>

                        {/* SECTION 2: SERVICE TIMELINE */}
                        <div className="bg-[#141518]/60 backdrop-blur-xl border border-white/5 p-8 rounded-3xl">
                            <h4 className="font-syncopate font-bold text-sm tracking-widest mb-8 border-b border-white/5 pb-4">SERVICE TIMELINE</h4>
                            
                            {vehicleData.timeline.length === 0 ? (
                                <p className="text-[#8E939B] text-center text-sm py-12 border border-dashed border-white/10 rounded-2xl">No completed services found for this vehicle.</p>
                            ) : (
                                <div className="relative pl-4 sm:pl-8 space-y-8 before:content-[''] before:absolute before:left-[11px] sm:before:left-[27px] before:top-2 before:bottom-2 before:w-px before:bg-gradient-to-b before:from-emerald-500/50 before:to-white/5">
                                    {vehicleData.timeline.map((event: any, idx: number) => (
                                        <div key={idx} className="relative group">
                                            {/* Timeline Node */}
                                            <div className="absolute -left-[30px] sm:-left-[46px] top-1.5 w-4 h-4 rounded-full border-4 border-[#050505] bg-emerald-400 group-hover:shadow-[0_0_15px_rgba(52,211,153,0.5)] transition-all"></div>
                                            
                                            <div className="bg-white/2 hover:bg-white/5 border border-white/5 group-hover:border-emerald-500/20 transition-all p-5 rounded-2xl">
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                    <div>
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <Calendar className="w-4 h-4 text-[#8E939B]" />
                                                            <span className="text-[#8E939B] font-mono text-xs">{event.date || 'Unknown Date'}</span>
                                                        </div>
                                                        <h5 className="font-syncopate font-bold text-sm tracking-widest text-[#01FFFF] uppercase">{event.service_package_name}</h5>
                                                    </div>
                                                    <div className="flex items-center gap-6">
                                                        <div className="text-left sm:text-right">
                                                            <p className="text-[10px] text-[#8E939B] uppercase tracking-widest mb-1">Technician</p>
                                                            <p className="text-xs font-bold">{event.technician_name}</p>
                                                        </div>
                                                        <div className="text-left sm:text-right border-l border-white/10 pl-6">
                                                            <p className="text-[10px] text-[#8E939B] uppercase tracking-widest mb-1">Price</p>
                                                            <p className="text-sm font-bold text-emerald-400 font-syncopate">₹{event.price_paid}</p>
                                                        </div>
                                                        {event.booking_id && (
                                                            <button
                                                                onClick={() => downloadInvoice(event.booking_id)}
                                                                title="Download PDF Receipt"
                                                                className="text-[#8E939B] hover:text-[#01FFFF] transition-colors ml-2"
                                                            >
                                                                <Download className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                  ) : (
                    <div className="animate-[fadeIn_0.5s_ease-out] space-y-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-white/5 pb-4">
                            <h3 className="font-syncopate font-bold tracking-widest text-xl">DAILY SHOP LEDGER</h3>
                            <div className="relative">
                                <label className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8E939B] pointer-events-none">
                                    <Calendar className="w-4 h-4" />
                                </label>
                                <input 
                                    type="date"
                                    value={globalHistoryDate}
                                    onChange={(e) => setGlobalHistoryDate(e.target.value)}
                                    className="bg-[#141518]/60 border border-white/10 text-white text-xs font-bold font-mono py-2 pl-9 pr-4 rounded-xl outline-none focus:border-[#01FFFF] transition-all cursor-pointer"
                                />
                            </div>
                        </div>

                        {globalHistory?.stats && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                                <div className="bg-[#141518]/60 border border-[#01FFFF]/20 p-5 rounded-2xl flex items-center justify-between shadow-[0_0_15px_rgba(1,255,255,0.05)]">
                                    <div>
                                        <p className="text-[#01FFFF] text-[10px] font-bold uppercase tracking-[0.2em] mb-1">Total Services</p>
                                        <h3 className="text-2xl font-syncopate font-bold text-white tracking-tighter">{globalHistory.stats.total_services}</h3>
                                    </div>
                                    <Car className="w-8 h-8 text-[#01FFFF]/30" />
                                </div>
                                <div className="bg-[#141518]/60 border border-emerald-500/20 p-5 rounded-2xl flex items-center justify-between shadow-[0_0_15px_rgba(52,211,153,0.05)]">
                                    <div>
                                        <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-1">Ledger Revenue</p>
                                        <h3 className="text-2xl font-syncopate font-bold text-white tracking-tighter">₹{globalHistory.stats.total_revenue.toLocaleString()}</h3>
                                    </div>
                                    <BadgeDollarSign className="w-8 h-8 text-emerald-400/30" />
                                </div>
                            </div>
                        )}

                        <div className="bg-[#141518]/60 border border-white/5 rounded-3xl p-6 shadow-2xl">
                            {!globalHistory?.feed || globalHistory.feed.length === 0 ? (
                                <p className="text-[#8E939B] text-center py-12 border border-dashed border-white/10 rounded-2xl">No completed services found for {globalHistoryDate}.</p>
                            ) : (
                                <div className="space-y-4">
                                    {globalHistory.feed.map((entry: any, i: number) => (
                                        <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white/2 hover:bg-white/5 border border-white/5 hover:border-white/10 rounded-2xl transition-colors gap-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                                                    <Car className="w-4 h-4 text-[#8E939B]" />
                                                </div>
                                                <div>
                                                    <p className="font-mono text-white font-bold tracking-wider">{entry.plate_number}</p>
                                                    <p className="text-[#01FFFF] text-[10px] uppercase font-bold tracking-widest mt-1">{entry.service_package_name}</p>
                                                </div>
                                            </div>
                                            <div className="flex flex-col sm:items-end gap-1">
                                                <div className="flex items-center gap-2">
                                                    {entry.is_today && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>}
                                                    <p className="text-[#8E939B] text-xs font-mono">{entry.date}</p>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <span className="text-[10px] text-[#8E939B] uppercase tracking-widest">By {entry.technician_name}</span>
                                                    <span className="font-syncopate font-bold text-[#FF2A6D] text-sm hidden sm:inline-block">₹{entry.price}</span>
                                                    {entry.booking_id && (
                                                        <button
                                                            onClick={() => downloadInvoice(entry.booking_id)}
                                                            title="Download PDF Receipt"
                                                            className="text-[#8E939B] hover:text-[#01FFFF] transition-colors"
                                                        >
                                                            <Download className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                  )
                )}

                {/* ---------------------------------------------------- */}
                {/* VIEW E: 🔒 END OF DAY SETTLEMENT TAB      */}
                {/* ---------------------------------------------------- */}
                {activeTab === 'eod' && (
                    <div className="animate-[fadeIn_0.5s_ease-out] max-w-5xl mx-auto space-y-8">
                        {!eodData ? (
                            <div className="flex flex-col items-center justify-center py-20">
                                <Activity className="w-10 h-10 text-[#01FFFF] animate-spin mb-4" />
                                <p className="text-[#8E939B] font-bold tracking-widest text-sm uppercase">Loading EOD Data...</p>
                            </div>
                        ) : (
                            <>
                                <div className="flex justify-between items-end mb-8 border-b border-white/10 pb-6">
                                    <div>
                                        <h3 className="font-syncopate font-bold tracking-widest text-2xl mb-2 flex items-center gap-3">
                                            <Lock className={`w-6 h-6 ${eodData.is_locked ? 'text-emerald-400' : 'text-purple-500'}`} /> 
                                            EOD SETTLEMENT AUDIT
                                        </h3>
                                <p className="text-xs text-[#8E939B] font-mono tracking-widest uppercase">
                                    {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                </p>
                            </div>
                            
                            {/* HERE IS THE CLOSE REGISTER BUTTON */}
                            {eodData.is_locked ? (
                                <div className="bg-emerald-500/10 border border-emerald-500/30 px-6 py-3 rounded-xl flex items-center gap-2 text-emerald-400 font-bold uppercase text-xs tracking-widest">
                                    <CheckCircle className="w-4 h-4" /> Register Locked
                                </div>
                            ) : (
                                <button onClick={handleCloseRegister} className="bg-[#E52323] hover:bg-red-700 text-white border border-red-500 px-8 py-4 rounded-xl flex items-center gap-2 font-bold uppercase text-xs tracking-widest shadow-[0_0_30px_rgba(229,35,35,0.4)] transition-all">
                                    <AlertTriangle className="w-4 h-4" /> Close Register & Lock Data
                                </button>
                            )}
                        </div>

                        {/* Top Level Health Metrics */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            <div className="bg-[#141518]/60 border border-white/5 p-8 rounded-3xl relative overflow-hidden group">
                                <p className="text-[#8E939B] text-[10px] font-bold uppercase tracking-[0.2em] mb-2">Query 1: Gross Revenue</p>
                                <h2 className="text-5xl font-syncopate font-bold text-white tracking-tighter">₹{eodData.gross_revenue?.toLocaleString()}</h2>
                                <p className="text-xs text-gray-500 mt-4">Total value of all services completed today.</p>
                            </div>
                            <div className="bg-emerald-900/10 border border-emerald-500/30 p-8 rounded-3xl relative overflow-hidden">
                                <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-2 flex items-center gap-2"><TrendingUp className="w-4 h-4"/> True Net Profit</p>
                                <h2 className="text-5xl font-syncopate font-bold text-emerald-400 tracking-tighter">₹{(eodData.gross_revenue - eodData.total_expenses)?.toLocaleString()}</h2>
                                <p className="text-xs text-emerald-400/60 mt-4">[Gross Revenue] - [Shop Expenses]</p>
                            </div>
                        </div>

                        {/* Audits */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            
                            {/* Left Column: Payment Split & Deductions */}
                            <div className="space-y-8">
                                <div className="bg-[#141518]/60 border border-white/5 rounded-3xl p-6">
                                    <h4 className="font-bold text-sm uppercase tracking-widest text-[#8E939B] mb-6 border-b border-white/5 pb-4">Query 2: The Payment Split</h4>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center bg-black/40 p-4 rounded-xl border border-white/5">
                                            <div className="flex items-center gap-3"><IndianRupee className="w-5 h-5 text-emerald-400"/><span className="font-bold">Physical Cash In</span></div>
                                            <span className="font-mono text-emerald-400 font-bold tracking-widest">₹{(eodData.cash_in_hand || 0).toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between items-center bg-black/40 p-4 rounded-xl border border-white/5">
                                            <div className="flex items-center gap-3"><Landmark className="w-5 h-5 text-blue-400"/><span className="font-bold">Digital / Unpaid</span></div>
                                            <span className="font-mono text-blue-400 font-bold tracking-widest">₹{((eodData.gross_revenue || 0) - (eodData.cash_in_hand || 0)).toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: The Cash Drawer Audit */}
                            <div className="bg-[#141518]/60 border border-[#01FFFF]/20 rounded-3xl p-8 relative shadow-[0_0_40px_rgba(1,255,255,0.05)]">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-[#01FFFF]/5 rounded-full blur-[50px] pointer-events-none"></div>
                                
                                <h4 className="font-syncopate font-bold text-lg uppercase tracking-widest text-[#01FFFF] mb-6 flex items-center gap-2">
                                    <IndianRupee className="w-5 h-5"/> Cash Drawer Audit
                                </h4>
                                <p className="text-xs text-[#8E939B] mb-8 leading-relaxed">
                                    Verifies the physical paper cash in your register. Subtracts cash removed today from total cash collected.
                                </p>

                                <div className="space-y-4 mb-8 text-sm">
                                    <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/5">
                                        <span className="text-gray-300">Total Cash Received</span>
                                        <span className="font-mono font-bold text-white">₹{(eodData.cash_in_hand || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center bg-[#E52323]/10 p-4 rounded-xl border border-[#E52323]/20">
                                        <span className="text-[#E52323]">Minus: Shop Cash Expenses</span>
                                        <span className="font-mono font-bold text-[#E52323]">- ₹{(eodData.total_expenses || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center bg-[#E52323]/10 p-4 rounded-xl border border-[#E52323]/20">
                                        <span className="text-[#E52323]">Minus: Staff Petty Cash</span>
                                        <span className="font-mono font-bold text-[#E52323]">- ₹{(eodData.labor_payouts || 0).toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="bg-black/50 border border-[#01FFFF]/30 p-6 rounded-2xl text-center">
                                    <p className="text-[#01FFFF] text-[10px] font-bold uppercase tracking-[0.2em] mb-2">Expected Paper Cash in Till</p>
                                    <h2 className="text-4xl font-syncopate font-bold text-white tracking-tighter">₹{(eodData.expected_cash_in_till || 0).toLocaleString()}</h2>
                                </div>
                            </div>

                        </div>
                            </>
                        )}
                    </div>
                )}
            </main>

            {/* KHATA PAYMENT MODAL */}
            {isKhataModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center animate-[fadeIn_0.2s_ease-out]">
                    <div className="bg-[#141518] border border-white/10 p-8 rounded-[2.5rem] w-full max-w-md shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-syncopate font-bold tracking-widest text-[#01FFFF]">RECEIVE PAYMENT</h3>
                            <button onClick={() => setIsKhataModalOpen(false)} className="text-[#8E939B] hover:text-white transition-colors"><PlusCircle className="w-6 h-6 rotate-45" /></button>
                        </div>
                        <p className="text-sm text-[#8E939B] mb-6">Record a partial or full settlement for <strong className="text-white">{selectedKhataCustomer?.name}</strong>.</p>

                        <div className="space-y-4 mb-8">
                            <div>
                                <label className="font-grotesk text-[10px] uppercase tracking-[0.2em] text-[#8E939B] font-bold ml-2">Payment Amount (₹)</label>
                                <input
                                    type="number"
                                    value={khataPaymentAmount}
                                    onChange={(e) => setKhataPaymentAmount(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 py-4 px-6 rounded-xl text-white font-mono focus:outline-none focus:border-[#01FFFF] focus:ring-1 focus:ring-[#01FFFF] transition-all mt-2"
                                    placeholder="e.g. 500"
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleKhataSettle}
                            className="w-full bg-[#01FFFF] text-black font-syncopate font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(1,255,255,0.4)] justify-center hover:bg-white transition-all flex items-center gap-2"
                        >
                            <BadgeDollarSign className="w-5 h-5" /> CONFIRM SETTLEMENT
                        </button>
                    </div>
                </div>
            )}

            <style dangerouslySetInnerHTML={{
                __html: `
                .hide-scrollbar::-webkit-scrollbar { display: none; }
                .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            `}} />
        </div>
    );
}