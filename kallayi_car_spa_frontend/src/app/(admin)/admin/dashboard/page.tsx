'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
    LayoutDashboard, Users, Car, Wallet, LogOut, 
    TrendingUp, Activity, Receipt, ChevronRight, Download, 
    CreditCard, FileText, FlaskConical, CheckCircle, PlusCircle,
    Clock, AlertCircle, Check, BadgeDollarSign, UserCog
} from 'lucide-react';
import { 
    LineChart, Line, XAxis, YAxis, CartesianGrid, 
    Tooltip, ResponsiveContainer 
} from 'recharts';

export default function AdminDashboard() {
    const router = useRouter();
    
    // --- Navigation State ---
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('staff'); // Defaulting to staff to see the new feature
    const [financeSubTab, setFinanceSubTab] = useState('overview'); 
    const [adminName, setAdminName] = useState('Loading...');
    
    // --- Data States ---
    const [kpiData, setKpiData] = useState({ net_profit_today: 0, revenue_today: 0, general_expenses_today: 0, labor_cost_today: 0 });
    const [chartData, setChartData] = useState([]);
    const [recentBookings, setRecentBookings] = useState([]);
    const [expenses, setExpenses] = useState<any[]>([]);
    const [payrollData, setPayrollData] = useState<any[]>([]); // Using real API data
    const [khataCustomers, setKhataCustomers] = useState<any[]>([]);
    const [khataLedger, setKhataLedger] = useState<any[]>([]);
    const [selectedKhataCustomer, setSelectedKhataCustomer] = useState<any | null>(null);
    const [isKhataModalOpen, setIsKhataModalOpen] = useState(false);
    const [khataPaymentAmount, setKhataPaymentAmount] = useState<string>('');

    // Mocked Data for Inventory
    const inventoryData = [ { id: 1, name: 'Ceramic Foam Wash', stock: '12 Liters', cost: '₹4,500', status: 'Healthy' }, { id: 2, name: 'Leather Conditioner', stock: '2 Liters', cost: '₹1,200', status: 'Low Stock' } ];
    const [customerCredits, setCustomerCredits] = useState<any[]>([]);

    // --- Data Fetching ---
    const fetchDashboardData = async () => {
        const token = localStorage.getItem('auth_token');
        if (!token) return router.push('/login');
        
        const HEADERS = { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' };
        const API_BASE = 'http://127.0.0.1:8001/api';

        try {
            const [userRes, kpiRes, chartRes, bookRes, expRes, creditRes, payrollRes, khataRes] = await Promise.all([
                fetch(`${API_BASE}/core/users/me/`, { headers: HEADERS }),
                fetch(`${API_BASE}/finance/dashboard/kpi_summary/`, { headers: HEADERS }),
                fetch(`${API_BASE}/finance/dashboard/revenue_chart/`, { headers: HEADERS }),
                fetch(`${API_BASE}/bookings/`, { headers: HEADERS }),
                fetch(`${API_BASE}/finance/expenses/`, { headers: HEADERS }),
                fetch(`${API_BASE}/finance/dashboard/outstanding_credit/`, { headers: HEADERS }),
                fetch(`${API_BASE}/staff/daily-settlement/`, { headers: HEADERS }),
                fetch(`${API_BASE}/finance/khata/`, { headers: HEADERS })
            ]);

            if (userRes?.ok) { const user = await userRes.json(); setAdminName(user.first_name || user.username); }
            if (kpiRes?.ok) setKpiData(await kpiRes.json());
            if (chartRes?.ok) {
                const chartApiData = await chartRes.json();
                setChartData(chartApiData.map((d: any) => ({ name: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), value: d.value })));
            }
            if (bookRes?.ok) { const b = await bookRes.json(); setRecentBookings(b.slice(0, 10)); }
            if (expRes?.ok) { const e = await expRes.json(); setExpenses(e.results || e); }
            if (creditRes?.ok) { const creditData = await creditRes.json(); setCustomerCredits(creditData); }
            if (payrollRes?.ok) { const pd = await payrollRes.json(); setPayrollData(pd); }
            if (khataRes?.ok) { const khataData = await khataRes.json(); setKhataCustomers(khataData); }
            
        } catch (error) { console.error("Fetch Error:", error); } finally { setIsLoading(false); }
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
        } catch (e) { alert("Failed to export."); }
    };

    const downloadInvoicePDF = async (id: number) => {
        try {
            const res = await fetch(`http://127.0.0.1:8001/api/finance/invoices/${id}/download_pdf/`, { headers: { 'Authorization': `Token ${localStorage.getItem('auth_token')}` } });
            if (!res.ok) throw new Error("Failed");
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `Invoice_Kallayi_${id}.pdf`; a.click();
        } catch (e) { alert("Invoice generation failed."); }
    };

    const approveExpense = async (id: number) => {
        try {
            await fetch(`http://127.0.0.1:8001/api/finance/expenses/${id}/`, {
                method: 'PATCH',
                headers: { 'Authorization': `Token ${localStorage.getItem('auth_token')}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_approved: true })
            });
            fetchDashboardData(); 
        } catch(e) { alert("Failed to approve"); }
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
                alert("Account marked as settled! Revenue updated.");
            } else {
                alert("Failed to settle account.");
            }
        } catch(e) {
            alert("Network error while settling account.");
        }
    };
    
    const loadKhataLedger = async (customer: any) => {
        setSelectedKhataCustomer(customer);
        try {
            const res = await fetch(`http://127.0.0.1:8001/api/finance/khata/${customer.id}/`, { headers: { 'Authorization': `Token ${localStorage.getItem('auth_token')}` } });
            if (res.ok) {
                setKhataLedger(await res.json());
            }
        } catch(e) { console.error("Failed to load Khata ledger"); }
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
                alert("Payment received successfully!");
                setIsKhataModalOpen(false);
                setKhataPaymentAmount('');
                fetchDashboardData();
                loadKhataLedger(selectedKhataCustomer);
            } else {
                alert("Failed to process payment");
            }
        } catch(e) { alert("Network error"); }
    };

    // Settle End-of-Day Payout
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
                alert("Worker payment settled successfully!");
            } else {
                alert("Failed to settle worker pay");
            }
        } catch(e) {
            alert("Network error settling worker pay");
        }
    };

    const totalOutstandingCredit = customerCredits.reduce((sum, item) => sum + item.amount, 0);

    // Calculate Total End of Day Payouts
    const totalDailyPayout = payrollData.reduce((sum, worker) => sum + worker.final_payout, 0);

    if (isLoading) return (
        <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center">
            <Activity className="w-10 h-10 text-[#01FFFF] animate-spin" />
        </div>
    );

    return (
        <div className="min-h-screen bg-[#050505] text-white flex font-jakarta selection:bg-[#FF2A6D]">
            
            {/* SIDEBAR */}
            <aside className="w-72 bg-[#141518]/60 backdrop-blur-2xl border-r border-white/5 flex flex-col hidden lg:flex">
                <div className="p-8 border-b border-white/5">
                    <h2 className="text-xl font-syncopate font-bold tracking-widest">KALLAYI<span className="text-[#FF2A6D]">.</span></h2>
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#8E939B] mt-2">Admin Portal</p>
                </div>
                <nav className="flex-1 p-6 space-y-2">
                    <button onClick={() => setActiveTab('overview')} className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'overview' ? 'bg-white/5 text-[#01FFFF] border border-[#01FFFF]/20' : 'text-[#8E939B] hover:text-white'}`}><LayoutDashboard className="w-4 h-4" /> Overview</button>
                    <button onClick={() => setActiveTab('finance')} className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'finance' ? 'bg-white/5 text-[#01FFFF] border border-[#01FFFF]/20' : 'text-[#8E939B] hover:text-white'}`}><Wallet className="w-4 h-4" /> Finance Dept</button>
                    <button className="w-full flex items-center gap-4 px-4 py-4 rounded-xl text-[#8E939B] hover:text-white font-bold text-xs uppercase tracking-widest transition-all"><Car className="w-4 h-4" /> Fleet Mgmt</button>
                    <button onClick={() => setActiveTab('staff')} className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'staff' ? 'bg-white/5 text-[#01FFFF] border border-[#01FFFF]/20' : 'text-[#8E939B] hover:text-white'}`}><Users className="w-4 h-4" /> Staff Ops</button>
                    
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
                    <button onClick={handleLogout} className="w-full flex justify-center items-center gap-2 px-4 py-3 rounded-xl border border-white/10 text-gray-400 hover:text-[#FF2A6D] hover:border-[#FF2A6D]/50 transition-colors text-xs font-bold uppercase tracking-widest"><LogOut className="w-4 h-4" /> Disconnect</button>
                </div>
            </aside>

            {/* MAIN CONTENT */}
            <main className="flex-1 p-8 lg:p-12 overflow-y-auto relative">
                
                {/* 1. Real-Time KPI Dashboarding */}
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

                {/* OVERVIEW TAB */}
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
                                                <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-sm ${ booking.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#FF2A6D]/20 text-[#FF2A6D]' }`}>
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

                {/* FINANCE COMMAND CENTER */}
                {activeTab === 'finance' && (
                    <div className="animate-[fadeIn_0.5s_ease-out]">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-syncopate font-bold tracking-widest text-xl">FINANCIAL LEDGER</h3>
                            <button onClick={downloadTaxReport} className="flex items-center gap-2 bg-white/10 text-white border border-white/20 px-6 py-3 rounded-full font-bold text-xs uppercase tracking-widest hover:bg-white hover:text-black transition">
                                <Download className="w-4 h-4" /> Export Tax Report
                            </button>
                        </div>

                        <div className="flex flex-wrap gap-2 border-b border-white/10 pb-4 mb-8">
                            <button onClick={() => setFinanceSubTab('overview')} className={`px-4 py-2 font-bold text-xs uppercase tracking-widest rounded-lg transition-all ${financeSubTab === 'overview' ? 'bg-[#01FFFF]/10 text-[#01FFFF]' : 'text-[#8E939B] hover:text-white'}`}>1. Trend Analysis</button>
                            <button onClick={() => setFinanceSubTab('expenses')} className={`px-4 py-2 font-bold text-xs uppercase tracking-widest rounded-lg transition-all ${financeSubTab === 'expenses' ? 'bg-[#FF2A6D]/10 text-[#FF2A6D]' : 'text-[#8E939B] hover:text-white'}`}>2. Expense Manager</button>
                            <button onClick={() => setFinanceSubTab('credit')} className={`px-4 py-2 font-bold text-xs uppercase tracking-widest rounded-lg transition-all ${financeSubTab === 'credit' ? 'bg-purple-500/10 text-purple-400' : 'text-[#8E939B] hover:text-white'}`}>3. Customer Credit</button>
                            <button onClick={() => setFinanceSubTab('invoices')} className={`px-4 py-2 font-bold text-xs uppercase tracking-widest rounded-lg transition-all ${financeSubTab === 'invoices' ? 'bg-emerald-500/10 text-emerald-400' : 'text-[#8E939B] hover:text-white'}`}>4. PDF Invoices</button>
                            <button onClick={() => { setFinanceSubTab('khata'); setSelectedKhataCustomer(null); }} className={`px-4 py-2 font-bold text-xs uppercase tracking-widest rounded-lg transition-all ${financeSubTab === 'khata' ? 'bg-[#01FFFF]/10 text-[#01FFFF]' : 'text-[#8E939B] hover:text-white'}`}>5. Khata / Credit</button>
                        </div>

                        {financeSubTab === 'overview' && (
                            <div className="bg-[#141518]/60 border border-white/5 p-6 rounded-3xl h-96 animate-[fadeIn_0.3s_ease-out]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                        <XAxis dataKey="name" stroke="#8E939B" fontSize={10} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#8E939B" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value}`} />
                                        <Tooltip contentStyle={{ backgroundColor: '#050505', border: '1px solid rgba(255,255,255,0.1)' }} itemStyle={{ color: '#01FFFF' }} />
                                        <Line type="monotone" dataKey="value" stroke="#01FFFF" strokeWidth={3} dot={{ fill: '#050505', stroke: '#01FFFF', strokeWidth: 2, r: 4 }} />
                                    </LineChart>
                                </ResponsiveContainer>
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
                                                    {exp.is_approved ? <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-sm uppercase tracking-widest font-bold">Approved</span> : <button onClick={() => approveExpense(exp.id)} className="text-[9px] bg-[#FF2A6D] text-white px-3 py-1.5 rounded-sm uppercase tracking-widest font-bold flex gap-1 ml-auto items-center"><CheckCircle className="w-3 h-3"/> Approve</button>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {financeSubTab === 'credit' && (
                            <div className="animate-[fadeIn_0.3s_ease-out]">
                                <div className="bg-purple-900/10 border border-purple-500/30 p-6 rounded-3xl mb-6 flex justify-between items-center">
                                    <div>
                                        <p className="text-purple-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-1 flex items-center gap-2"><Clock className="w-4 h-4"/> Outstanding Balance</p>
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
                                                            <Check className="w-3 h-3"/> Mark Paid
                                                        </button>
                                                    </td>
                                                </tr>
                                            )))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {financeSubTab === 'invoices' && (
                            <div className="bg-[#141518]/60 border border-white/5 rounded-3xl overflow-hidden animate-[fadeIn_0.3s_ease-out]">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-black/40 text-[#8E939B] font-grotesk text-[10px] uppercase tracking-widest">
                                        <tr><th className="p-4 pl-6">Booking ID</th><th className="p-4">Customer</th><th className="p-4">Amount</th><th className="p-4 text-right pr-6">Generate</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {recentBookings.filter((b:any) => b.status === 'COMPLETED').map((booking: any) => (
                                            <tr key={booking.id} className="hover:bg-white/5">
                                                <td className="p-4 pl-6 font-mono text-xs">#INV-{booking.id.toString().padStart(4, '0')}</td>
                                                <td className="p-4 font-bold">{booking.vehicle_info}</td>
                                                <td className="p-4 text-[#01FFFF] font-bold">₹{booking.final_price || booking.service_package_details?.price}</td>
                                                <td className="p-4 text-right pr-6">
                                                    <button onClick={() => downloadInvoicePDF(booking.id)} className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 hover:bg-emerald-500 hover:text-black transition px-3 py-1.5 rounded-sm uppercase tracking-widest font-bold flex gap-1 ml-auto items-center"><FileText className="w-3 h-3"/> Get PDF</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {financeSubTab === 'khata' && !selectedKhataCustomer && (
                            <div className="animate-[fadeIn_0.3s_ease-out]">
                                <div className="bg-[#141518]/60 border border-white/5 rounded-3xl overflow-hidden">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-black/40 text-[#8E939B] font-grotesk text-[10px] uppercase tracking-widest">
                                            <tr><th className="p-4 pl-6">Customer</th><th className="p-4">Phone Number</th><th className="p-4">Outstanding Balance</th><th className="p-4 text-right pr-6">Action</th></tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {khataCustomers.length === 0 ? (
                                                <tr><td colSpan={4} className="p-8 text-center text-[#8E939B]">No active Khata balances.</td></tr>
                                            ) : (
                                                khataCustomers.map((c) => (
                                                <tr key={c.id} className="hover:bg-white/5 cursor-pointer" onClick={() => loadKhataLedger(c)}>
                                                    <td className="p-4 pl-6 font-bold text-white flex items-center gap-2">
                                                        {c.name}
                                                        {c.outstanding_balance >= c.credit_limit * 0.9 && <AlertCircle className="w-4 h-4 text-[#FF2A6D]" />}
                                                    </td>
                                                    <td className="p-4 text-[#8E939B] font-mono text-xs">{c.phone_number}</td>
                                                    <td className="p-4 font-syncopate font-bold text-[#01FFFF]">₹{c.outstanding_balance}</td>
                                                    <td className="p-4 text-right pr-6">
                                                        <button onClick={(e) => { e.stopPropagation(); loadKhataLedger(c); }} className="text-[9px] bg-white/10 text-white border border-white/20 px-3 py-1.5 rounded-sm uppercase tracking-widest font-bold flex gap-1 ml-auto items-center hover:bg-white hover:text-black transition">
                                                            View Ledger <ChevronRight className="w-3 h-3"/>
                                                        </button>
                                                    </td>
                                                </tr>
                                            )))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {financeSubTab === 'khata' && selectedKhataCustomer && (
                            <div className="animate-[fadeIn_0.3s_ease-out]">
                                <div className="flex justify-between items-center mb-6">
                                    <button onClick={() => setSelectedKhataCustomer(null)} className="text-[#8E939B] hover:text-white flex items-center gap-2 text-xs font-bold uppercase tracking-widest transition-colors"><ChevronRight className="w-4 h-4 rotate-180"/> Back to Khata List</button>
                                    <button onClick={() => { setKhataPaymentAmount(selectedKhataCustomer.outstanding_balance.toString()); setIsKhataModalOpen(true); }} className="flex items-center gap-2 bg-[#01FFFF] text-black px-6 py-3 rounded-full font-bold text-xs uppercase tracking-widest hover:bg-white transition shadow-[0_0_20px_rgba(1,255,255,0.3)]">
                                        <BadgeDollarSign className="w-4 h-4" /> Receive Payment
                                    </button>
                                </div>

                                <div className="bg-[#141518]/60 border border-white/5 rounded-3xl overflow-hidden">
                                    <div className="p-6 border-b border-white/5 flex justify-between items-center bg-black/40">
                                        <div>
                                            <h4 className="font-bold text-lg text-white">{selectedKhataCustomer.name}'s Ledger</h4>
                                            <p className="text-[#8E939B] text-xs font-mono">{selectedKhataCustomer.phone_number}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[#8E939B] text-[10px] font-bold uppercase tracking-[0.2em] mb-1">Current Balance</p>
                                            <h2 className="text-2xl font-syncopate font-bold text-[#01FFFF]">₹{selectedKhataCustomer.outstanding_balance}</h2>
                                        </div>
                                    </div>
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-black/20 text-[#8E939B] font-grotesk text-[10px] uppercase tracking-widest">
                                            <tr><th className="p-4 pl-6">Date</th><th className="p-4">Description</th><th className="p-4">Type</th><th className="p-4 text-right pr-6">Amount</th></tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {khataLedger.length === 0 ? (
                                                <tr><td colSpan={4} className="p-8 text-center text-[#8E939B]">No ledger entries found.</td></tr>
                                            ) : (
                                                khataLedger.map((entry) => (
                                                <tr key={entry.id} className="hover:bg-white/5">
                                                    <td className="p-4 pl-6 font-mono text-xs text-[#8E939B]">{entry.date}</td>
                                                    <td className="p-4 font-bold text-white">{entry.description}</td>
                                                    <td className="p-4">
                                                        <span className={`text-[9px] px-2 py-1 rounded-sm uppercase tracking-widest font-bold ${entry.transaction_type === 'CHARGE' ? 'bg-[#FF2A6D]/20 text-[#FF2A6D]' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                                            {entry.transaction_type}
                                                        </span>
                                                    </td>
                                                    <td className={`p-4 text-right pr-6 font-syncopate font-bold ${entry.transaction_type === 'CHARGE' ? 'text-[#FF2A6D]' : 'text-emerald-400'}`}>
                                                        {entry.transaction_type === 'CHARGE' ? '+' : '-'}₹{entry.amount}
                                                    </td>
                                                </tr>
                                            )))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ========================================= */}
                {/* 🛡️ STAFF OPS & DYNAMIC PAYROLL TAB        */}
                {/* ========================================= */}
                {activeTab === 'staff' && (
                    <div className="animate-[fadeIn_0.5s_ease-out]">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-syncopate font-bold tracking-widest text-xl">END-OF-DAY SETTLEMENT</h3>
                            <button className="flex items-center gap-2 bg-white/10 text-white border border-white/20 px-6 py-3 rounded-full font-bold text-xs uppercase tracking-widest hover:bg-white hover:text-black transition">
                                <PlusCircle className="w-4 h-4" /> Add Expense/Advance
                            </button>
                        </div>

                        {/* Top Widget: Total Cash Outflow */}
                        <div className="bg-emerald-900/10 border border-emerald-500/30 p-6 rounded-3xl mb-8 flex justify-between items-center">
                            <div>
                                <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-1 flex items-center gap-2"><Wallet className="w-4 h-4"/> Total Daily Payout</p>
                                <h2 className="text-4xl font-syncopate font-bold text-white tracking-tighter">₹{totalDailyPayout.toLocaleString()}</h2>
                            </div>
                            <div className="text-right hidden sm:block">
                                <p className="text-[#8E939B] text-xs">Calculated via Time-Stamped Rate Locking.</p>
                                <p className="text-[#8E939B] text-xs">[Base] + [Commission] - [Advances] = Payout</p>
                            </div>
                        </div>

                        {/* The Dynamic Payroll Ledger Table */}
                        <div className="bg-[#141518]/60 border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
                            <div className="p-6 border-b border-white/5 flex gap-2 items-center">
                                <UserCog className="w-5 h-5 text-[#8E939B]"/>
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
                                                            <CheckCircle className="w-3 h-3"/> Settled
                                                        </span>
                                                    ) : (
                                                        <button 
                                                            onClick={() => settleWorkerPay(worker.id)} 
                                                            className="inline-flex items-center gap-1 text-[10px] bg-[#01FFFF] text-black hover:bg-white transition-colors px-4 py-1.5 rounded-sm uppercase tracking-widest font-bold shadow-[0_0_15px_rgba(1,255,255,0.3)]"
                                                        >
                                                            <BadgeDollarSign className="w-3 h-3"/> Pay Cash
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

            <style dangerouslySetInnerHTML={{__html: `
                .hide-scrollbar::-webkit-scrollbar { display: none; }
                .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            `}} />
        </div>
    );
}