'use client';

import React, { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { 
    Download, TrendingUp, TrendingDown, Clock, PlusCircle, UserPlus, AlertCircle, 
    FileText, Pencil, Trash2, Check, Tag, Calendar, Image as ImageIcon, X, 
    BadgeDollarSign, Camera, Eye, Landmark, ArrowUpRight, ArrowDownRight, 
    RefreshCw, Upload, Search, Building2, WalletCards
} from 'lucide-react';
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Line } from 'recharts';
import dynamic from 'next/dynamic';
import { useDashboard } from '../context/DashboardContext';
import { Skeleton } from '@/components/ui/Skeleton';

import BankDepositTab from './BankDepositTab';

const CameraCaptureModal = dynamic(() => import('@/components/ui/CameraCaptureModal').then(m => m.CameraCaptureModal), { ssr: false });

export default function FinanceTab() {
    const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
    const [manualKhataProofFile, setManualKhataProofFile] = useState<File | null>(null);
    const [manualKhataProofPreview, setManualKhataProofPreview] = useState<string | null>(null);
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);
    const [lightboxTitle, setLightboxTitle] = useState<string>('Proof Photo');

    const { uiState, financeState } = useDashboard();
    const { 
        isLoading, financeSubTab, setFinanceSubTab, setIsManualKhataOpen,
        setIsKhataCustomerModalOpen, setIsKhataLedgerModalOpen, setIsKhataModalOpen,
        isManualKhataOpen, isKhataModalOpen, isKhataCustomerModalOpen, isKhataLedgerModalOpen,
        isBankDepositModalOpen, setIsBankDepositModalOpen, isBankWithdrawModalOpen, setIsBankWithdrawModalOpen,
        isEODModalOpen, setIsEODModalOpen
    } = uiState;
    
    const { 
        chartData, expenses, expenseCategories, isSubmittingExpense, expenseForm,
        receiptFile, receiptPreview, editingExpense, khataCustomers, khataLedger, khataRecentLedgers, selectedKhataCustomer,
        editingKhataCustomer, khataCustomerForm, khataPaymentAmount, eodData, manualKhataForm,
        customerCredits, invoiceList, totalOutstandingCredit, fileInputRef, setExpenseForm, setReceiptFile, setReceiptPreview, 
        setKhataCustomerForm, setKhataPaymentAmount, setManualKhataForm, handleFileChange, clearFile, 
        handleExpenseSubmit, startEditingExpense, cancelEditingExpense, deleteExpense, downloadTaxReport, 
        downloadInvoice, settleCredit, openKhataCustomerModal, saveKhataCustomer, deleteKhataCustomer, 
        loadKhataLedger, handleKhataSettle, submitManualKhataCharge, setSelectedKhataCustomer, setEditingKhataCustomer,
        bankSummary, bankTransactions, refetchBank, isBankLoading
    } = financeState;

    return (
        <div className="animate-[fadeIn_0.5s_ease-out]">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h3 className="font-syncopate font-bold tracking-widest text-lg sm:text-xl text-white">FINANCIAL LEDGER</h3>
                    <p className="text-xs text-neutral-400 font-mono tracking-wider">Revenue, Khata, Expenses & Invoicing</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                    <button 
                        onClick={() => setIsEODModalOpen?.(true)} 
                        className="w-full sm:w-auto min-h-[48px] flex items-center justify-center gap-2 bg-gradient-to-r from-purple-950/80 to-[#141518] hover:from-purple-900 hover:to-[#1a1b22] text-purple-200 border border-purple-500/40 hover:border-purple-400 px-5 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest transition shadow-[0_0_20px_rgba(168,85,247,0.15)] active:scale-95 touch-manipulation whitespace-nowrap"
                    >
                        <span>🌙 Close Day Register (EOD Audit)</span>
                    </button>
                    <button onClick={downloadTaxReport} className="w-full sm:w-auto min-h-[48px] flex items-center justify-center gap-2 bg-[#0a0a0d] text-white border border-white/15 px-6 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest hover:border-[#01FFFF] transition shadow-[4px_4px_10px_#020203,-4px_-4px_10px_#14151a] active:scale-95 touch-manipulation">
                        <Download className="w-4 h-4 text-[#01FFFF]" /> Export Tax Report
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 scrollbar-none">
                <button onClick={() => setFinanceSubTab('overview')} className={`min-h-[44px] px-4 py-2.5 font-bold text-xs uppercase tracking-widest rounded-xl transition-all whitespace-nowrap active:scale-95 touch-manipulation ${financeSubTab === 'overview' ? 'bg-[#01FFFF]/10 text-[#01FFFF] border border-[#01FFFF]/30' : 'bg-[#0a0a0d] text-[#8E939B] border border-white/5 hover:text-white'}`}>Trend Analysis</button>
                <button onClick={() => setFinanceSubTab('khata')} className={`min-h-[44px] px-4 py-2.5 font-bold text-xs uppercase tracking-widest rounded-xl transition-all whitespace-nowrap active:scale-95 touch-manipulation ${financeSubTab === 'khata' ? 'bg-[#01FFFF]/10 text-[#01FFFF] border border-[#01FFFF]/30' : 'bg-[#0a0a0d] text-[#8E939B] border border-white/5 hover:text-white'}`}>Khata (Credit)</button>
                <button onClick={() => setFinanceSubTab('expenses')} className={`min-h-[44px] px-4 py-2.5 font-bold text-xs uppercase tracking-widest rounded-xl transition-all whitespace-nowrap active:scale-95 touch-manipulation ${financeSubTab === 'expenses' ? 'bg-[#FF2A6D]/10 text-[#FF2A6D] border border-[#FF2A6D]/30' : 'bg-[#0a0a0d] text-[#8E939B] border border-white/5 hover:text-white'}`}>Expense Manager</button>
                <button onClick={() => setFinanceSubTab('bank')} className={`min-h-[44px] px-4 py-2.5 font-bold text-xs uppercase tracking-widest rounded-xl transition-all whitespace-nowrap active:scale-95 touch-manipulation ${financeSubTab === 'bank' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-[#0a0a0d] text-[#8E939B] border border-white/5 hover:text-white'}`}>Bank &amp; Cash</button>
                <button onClick={() => setFinanceSubTab('invoices')} className={`min-h-[44px] px-4 py-2.5 font-bold text-xs uppercase tracking-widest rounded-xl transition-all whitespace-nowrap active:scale-95 touch-manipulation ${financeSubTab === 'invoices' ? 'bg-[#01FFFF]/10 text-[#01FFFF] border border-[#01FFFF]/30' : 'bg-[#0a0a0d] text-[#8E939B] border border-white/5 hover:text-white'}`}>PDF Invoices</button>
            </div>

                        {financeSubTab === 'overview' && (
                            <div className="animate-[fadeIn_0.3s_ease-out] space-y-6">
                                {/* Summary Stats Row */}
                                {isLoading ? (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <Skeleton className="h-[92px] w-full" />
                                        <Skeleton className="h-[92px] w-full" />
                                        <Skeleton className="h-[92px] w-full" />
                                        <Skeleton className="h-[92px] w-full" />
                                    </div>
                                ) : (
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
                                )}

                                {/* The Line Chart */}
                                {isLoading ? (
                                    <Skeleton className="h-[384px] w-full" />
                                ) : (
                                    <div className="bg-[#141518]/60 border border-[#01FFFF]/20 p-6 rounded-3xl shadow-[0_0_30px_rgba(1,255,255,0.04)]">
                                        <div className="flex items-center gap-3 mb-6">
                                            <TrendingUp className="w-4 h-4 text-[#01FFFF]" />
                                            <h4 className="font-syncopate font-bold text-sm tracking-widest text-[#01FFFF]">REVENUE TREND</h4>
                                            <span className="ml-auto text-[10px] text-[#8E939B] uppercase tracking-widest">Last {chartData.length} days</span>
                                        </div>
                                        <div className="w-full h-72 min-h-[288px] relative">
                                            <ResponsiveContainer width="100%" height={280}>
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
                                )}
                            </div>
                        )}

                        {financeSubTab === 'khata' && (
    <div className="animate-[fadeIn_0.3s_ease-out]">
        
        {/* The Top Header */}
        <div className="bg-purple-900/10 border border-purple-500/30 p-6 rounded-3xl mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
                <p className="text-purple-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-1 flex items-center gap-2"><Clock className="w-4 h-4" /> Total Outstanding Debt</p>
                <h2 className="text-3xl font-syncopate font-bold text-white tracking-tighter">₹{totalOutstandingCredit.toLocaleString()}</h2>
            </div>
            <div className="flex flex-wrap items-center gap-3">
                <button
                    onClick={() => setIsManualKhataOpen(true)}
                    className="bg-purple-500/20 text-purple-400 border border-purple-500/30 px-4 py-2.5 rounded-lg font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-purple-500 hover:text-black transition-all shadow-[0_0_15px_rgba(168,85,247,0.15)]"
                >
                    <PlusCircle className="w-4 h-4" /> Add Khata Charge
                </button>
                <button
                    onClick={() => openKhataCustomerModal(null)}
                    className="bg-transparent text-white border border-white/10 px-4 py-2.5 rounded-lg font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-white/10 hover:text-[#A855F7] transition-all"
                >
                    <UserPlus className="w-4 h-4" /> Register Customer
                </button>
            </div>
        </div>

        {/* UNIFIED DIGITAL KHATA TABLE */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 mt-8">
            <div>
                <h4 className="font-syncopate font-bold text-sm tracking-widest text-[#01FFFF]">DIGITAL KHATA &amp; CREDIT ACCOUNTS</h4>
                <p className="text-xs text-neutral-400 font-mono">Consolidated credit ledgers, vehicle proof records &amp; quick settlements</p>
            </div>
            {khataCustomers && khataCustomers.length > 0 && (
                <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-300 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl">
                        {khataCustomers.length} Active Accounts
                    </span>
                    <span className="text-[11px] font-mono uppercase tracking-wider text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-3 py-1.5 rounded-xl font-bold">
                        ₹{(totalOutstandingCredit || 0).toLocaleString('en-IN')} Total Due
                    </span>
                </div>
            )}
        </div>

        <div className="bg-[#141518]/60 border border-white/5 rounded-3xl overflow-x-auto hide-scrollbar mb-8 shadow-2xl">
            <table className="w-full text-left text-sm min-w-[750px]">
                <thead className="bg-black/40 text-[#8E939B] font-grotesk text-[10px] uppercase tracking-widest border-b border-white/5">
                    <tr>
                        <th className="p-4 pl-6">Customer</th>
                        <th className="p-4">Vehicles Involved</th>
                        <th className="p-4">Total Due</th>
                        <th className="p-4">Proof Photo</th>
                        <th className="p-4 text-right pr-6">Quick Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {khataCustomers.length === 0 ? (
                        <tr><td colSpan={5} className="p-10 text-center text-[#8E939B] font-mono">All Khata accounts are settled! No outstanding credit.</td></tr>
                    ) : (
                        khataCustomers.map((khata: any) => {
                            // Find latest proof photo if not directly attached
                            const proofImg = khata.latest_proof_photo || 
                                (khataRecentLedgers?.find((l: any) => l.customer_id === khata.id && l.number_plate_image)?.number_plate_image) || null;
                            const imgUrl = proofImg ? (proofImg.startsWith('http') ? proofImg : `http://127.0.0.1:8001${proofImg.startsWith('/') ? '' : '/'}${proofImg}`) : null;

                            // Extract plates
                            const plates: string[] = Array.isArray(khata.vehicle_plates) && khata.vehicle_plates.length > 0 
                                ? khata.vehicle_plates 
                                : Array.from(new Set(
                                    (khataRecentLedgers || [])
                                        .filter((l: any) => l.customer_id === khata.id)
                                        .map((l: any) => l.booking?.vehicle?.plate_number || l.plate_number)
                                        .filter(Boolean)
                                  ));

                            const vehicleCount = khata.vehicle_count ?? (plates.length > 0 ? plates.length : 1);
                            const isExceeded = Number(khata.outstanding_balance || 0) >= Number(khata.credit_limit || 5000);

                            return (
                                <tr key={khata.id} className="hover:bg-white/[0.03] transition-colors group">
                                    {/* 1. Customer: Name & Phone */}
                                    <td className="p-4 pl-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-sm font-bold text-[#01FFFF] flex-shrink-0">
                                                {khata.name ? khata.name.charAt(0).toUpperCase() : 'C'}
                                            </div>
                                            <div>
                                                <p className="font-bold text-white group-hover:text-[#01FFFF] transition-colors">{khata.name}</p>
                                                <p className="text-xs text-[#8E939B] font-mono mt-0.5">{khata.phone_number || 'No Phone'}</p>
                                            </div>
                                        </div>
                                    </td>

                                    {/* 2. Vehicles Involved: Count & Plate Badges */}
                                    <td className="p-4">
                                        <div className="flex flex-col gap-1.5">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-xs font-bold text-neutral-300">
                                                    {vehicleCount} Vehicle{vehicleCount > 1 ? 's' : ''}
                                                </span>
                                            </div>
                                            {plates.length > 0 ? (
                                                <div className="flex flex-wrap gap-1">
                                                    {plates.slice(0, 3).map((p: string, pIdx: number) => (
                                                        <span key={pIdx} className="px-2 py-0.5 rounded-md bg-[#01FFFF]/10 border border-[#01FFFF]/25 font-mono text-[10px] text-[#01FFFF] font-bold">
                                                            {p}
                                                        </span>
                                                    ))}
                                                    {plates.length > 3 && (
                                                        <span className="px-1.5 py-0.5 rounded bg-white/5 text-[9px] text-neutral-400 font-mono">
                                                            +{plates.length - 3} more
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-[11px] text-neutral-500 font-mono">Walk-in</span>
                                            )}
                                        </div>
                                    </td>

                                    {/* 3. Total Due: Outstanding Balance */}
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            <span className={`font-syncopate font-bold text-base ${isExceeded ? 'text-[#FF2A6D]' : 'text-yellow-400'}`}>
                                                ₹{Number(khata.outstanding_balance || 0).toLocaleString('en-IN')}
                                            </span>
                                            {isExceeded && (
                                                <span title="Credit limit exceeded" className="flex items-center">
                                                    <AlertCircle className="w-4 h-4 text-[#FF2A6D] animate-pulse" />
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[10px] text-neutral-500 font-mono mt-0.5">
                                            Limit: ₹{Number(khata.credit_limit || 5000).toLocaleString('en-IN')}
                                        </p>
                                    </td>

                                    {/* 4. Proof Photo Thumbnail */}
                                    <td className="p-4">
                                        {imgUrl ? (
                                            <button
                                                type="button"
                                                onClick={() => setLightboxImage(imgUrl)}
                                                className="w-12 h-12 rounded-xl overflow-hidden border border-[#01FFFF]/40 hover:border-[#01FFFF] hover:scale-105 transition-all block relative shadow-md group/img"
                                                title="Click to view full-resolution proof photo"
                                            >
                                                <img 
                                                    src={imgUrl} 
                                                    alt="Proof" 
                                                    className="w-full h-full object-cover" 
                                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                />
                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-[#01FFFF]">
                                                    <Eye className="w-4 h-4" />
                                                </div>
                                            </button>
                                        ) : (
                                            <span className="text-[10px] text-zinc-600 font-mono uppercase bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
                                                No Proof
                                            </span>
                                        )}
                                    </td>

                                    {/* 5. Quick Actions */}
                                    <td className="p-4 text-right pr-6">
                                        <div className="flex flex-wrap justify-end items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => { setSelectedKhataCustomer(khata); setIsKhataModalOpen(true); }}
                                                className="min-h-[36px] px-3.5 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 hover:bg-emerald-500 hover:text-black transition-all active:scale-95 touch-manipulation"
                                                title="Record settlement or payment"
                                            >
                                                <Check className="w-3.5 h-3.5" /> Settle
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => loadKhataLedger(khata)}
                                                className="min-h-[36px] px-3 py-1.5 rounded-xl bg-[#01FFFF]/10 text-[#01FFFF] border border-[#01FFFF]/30 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 hover:bg-[#01FFFF] hover:text-black transition-all active:scale-95 touch-manipulation"
                                                title="View detailed transaction history"
                                            >
                                                <FileText className="w-3.5 h-3.5" /> History
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => openKhataCustomerModal(khata)}
                                                className="text-[#8E939B] hover:text-white p-2 rounded-xl bg-white/5 hover:bg-white/10 min-h-[36px] min-w-[36px] flex items-center justify-center transition active:scale-95"
                                                title="Edit customer"
                                            >
                                                <Pencil className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => deleteKhataCustomer(khata.id)}
                                                className="text-[#8E939B] hover:text-[#FF2A6D] p-2 rounded-xl bg-white/5 hover:bg-[#FF2A6D]/10 min-h-[36px] min-w-[36px] flex items-center justify-center transition active:scale-95"
                                                title="Delete customer"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
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
)}

{financeSubTab === 'expenses' && (() => {
                            const safeExpensesList = Array.isArray(expenses)
                                ? expenses
                                : ((expenses as any)?.results || (expenses as any)?.data || []);

                            const sortedExpenses = [...safeExpensesList].sort((a: any, b: any) => {
                                const timeA = new Date(a.date).getTime();
                                const timeB = new Date(b.date).getTime();
                                if (timeB !== timeA) return timeB - timeA;
                                return Number(b.id || 0) - Number(a.id || 0);
                            });

                            return (
                            <div className="grid grid-cols-1 xl:grid-cols-5 gap-8 animate-[fadeIn_0.3s_ease-out]">
                                {/* LEFT COLUMN: Record Expense */}
                                <div className="xl:col-span-2 bg-[#141518]/60 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-2xl h-fit">
                                    <h4 className="font-syncopate font-bold text-sm tracking-widest text-[#FF2A6D] mb-6 flex items-center gap-2">
                                        <PlusCircle className="w-4 h-4" /> {editingExpense ? 'UPDATE EXPENSE' : 'RECORD EXPENSE'}
                                    </h4>
                                    <form onSubmit={handleExpenseSubmit} className="space-y-4">
                                        <div>
                                            <label className="text-[10px] text-[#8E939B] uppercase tracking-widest mb-1 block">Category</label>
                                            <div className="relative">
                                                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8E939B]" />
                                                <select
                                                    value={expenseForm.category}
                                                    onChange={e => setExpenseForm({...expenseForm, category: e.target.value})}
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white text-sm outline-none focus:border-[#FF2A6D] transition-all appearance-none"
                                                >
                                                    <option value="">Select Category...</option>
                                                    {expenseCategories.map((cat: any) => (
                                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                                    ))}
                                                    {!expenseCategories.some((c: any) => String(c.id).toUpperCase() === 'OTHER' || c.name?.toLowerCase().includes('other')) && (
                                                        <option value="OTHER">➕ Other (Custom Category)</option>
                                                    )}
                                                </select>
                                            </div>
                                            {Boolean(
                                                expenseForm.category === 'OTHER' || 
                                                expenseForm.category === 'Other' || 
                                                expenseCategories.find((c: any) => String(c.id) === String(expenseForm.category) && (c.name?.toLowerCase().includes('other') || String(c.id).toUpperCase() === 'OTHER'))
                                            ) && (
                                                <div className="mt-3 animate-[fadeIn_0.2s_ease-out]">
                                                    <label className="text-[10px] text-[#FF2A6D] uppercase tracking-widest mb-1 block font-bold">
                                                        Enter Custom Category Name
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={expenseForm.custom_category || ''}
                                                        onChange={e => setExpenseForm({ ...expenseForm, custom_category: e.target.value })}
                                                        placeholder="e.g. Generator Fuel, Water Motor Pump, Polish Compound"
                                                        className="w-full bg-black/40 border border-[#FF2A6D]/40 focus:border-[#FF2A6D] rounded-xl py-3 px-4 text-white text-sm outline-none transition-all placeholder:text-neutral-500 shadow-[0_0_10px_rgba(255,42,109,0.15)]"
                                                        required
                                                    />
                                                </div>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[10px] text-[#8E939B] uppercase tracking-widest mb-1 block">Amount (₹)</label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8E939B] font-bold">₹</span>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        value={expenseForm.amount}
                                                        onChange={e => setExpenseForm({...expenseForm, amount: e.target.value})}
                                                        placeholder="0.00"
                                                        className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white text-sm outline-none focus:border-[#FF2A6D] transition-all"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-[#8E939B] uppercase tracking-widest mb-1 block">Date</label>
                                                <div className="relative">
                                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8E939B]" />
                                                    <input
                                                        type="date"
                                                        value={expenseForm.date}
                                                        onChange={e => setExpenseForm({...expenseForm, date: e.target.value})}
                                                        className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white text-sm outline-none focus:border-[#FF2A6D] transition-all"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-[#8E939B] uppercase tracking-widest mb-1 block">Description</label>
                                            <textarea
                                                value={expenseForm.description}
                                                onChange={e => setExpenseForm({...expenseForm, description: e.target.value})}
                                                placeholder="What was this expense for?"
                                                rows={3}
                                                className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white text-sm outline-none focus:border-[#FF2A6D] transition-all resize-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-[#8E939B] uppercase tracking-widest mb-1 block">Receipt Image (Optional)</label>
                                            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-white/10 border-dashed rounded-xl hover:border-[#FF2A6D]/50 transition-colors relative">
                                                {receiptPreview ? (
                                                    <div className="relative w-full aspect-video rounded-lg overflow-hidden flex items-center justify-center bg-black/50">
                                                        <img src={receiptPreview} alt="Receipt preview" className="max-h-full object-contain" />
                                                        <button 
                                                            type="button" 
                                                            onClick={clearFile}
                                                            className="absolute top-2 right-2 bg-black/70 hover:bg-[#FF2A6D] text-white p-1.5 rounded-full backdrop-blur-sm transition-colors"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-1 text-center">
                                                        <ImageIcon className="mx-auto h-8 w-8 text-[#8E939B]" />
                                                        <div className="flex text-sm text-gray-400 justify-center">
                                                            <label htmlFor="file-upload" className="relative cursor-pointer rounded-md font-bold text-[#FF2A6D] hover:text-[#01FFFF] focus-within:outline-none transition-colors">
                                                                <span>Upload a file</span>
                                                                <input id="file-upload" name="file-upload" type="file" ref={fileInputRef} className="sr-only" onChange={handleFileChange} accept="image/*" />
                                                            </label>
                                                        </div>
                                                        <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex gap-3">
                                            <button
                                                type="submit"
                                                disabled={isSubmittingExpense}
                                                className="flex-1 bg-[#FF2A6D] text-white font-syncopate font-bold text-xs tracking-widest py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-white hover:text-black transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(255,42,109,0.3)]"
                                            >
                                                {isSubmittingExpense ? (editingExpense ? 'Updating...' : 'Recording...') : (editingExpense ? 'UPDATE EXPENSE' : 'RECORD EXPENSE')}
                                            </button>
                                            {editingExpense && (
                                                <button
                                                    type="button"
                                                    onClick={cancelEditingExpense}
                                                    className="px-4 py-4 bg-transparent border border-white/20 text-[#8E939B] font-syncopate font-bold text-xs tracking-widest rounded-xl hover:bg-white/10 hover:text-white transition-all"
                                                >
                                                    CANCEL EDIT
                                                </button>
                                            )}
                                        </div>
                                    </form>
                                </div>
                                
                                {/* RIGHT COLUMN: Recent Expenses Table */}
                                <div className="xl:col-span-3 bg-[#141518]/60 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden flex flex-col h-[600px]">
                                    <div className="p-6 border-b border-white/5 flex justify-between items-center">
                                        <h4 className="font-syncopate font-bold text-sm tracking-widest text-[#8E939B]">RECENT EXPENSES</h4>
                                        <span className="text-[10px] bg-white/10 text-white px-3 py-1 rounded-full uppercase tracking-widest font-bold">
                                            Total: ₹{sortedExpenses.reduce((sum: number, exp: any) => sum + Number(exp.amount || 0), 0).toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="flex-1 overflow-auto">
                                        <table className="w-full text-left text-sm relative">
                                            <thead className="bg-black/40 text-[#8E939B] font-grotesk text-[10px] uppercase tracking-widest sticky top-0 z-10 backdrop-blur-md">
                                                <tr>
                                                    <th className="p-4 pl-6">Date</th>
                                                    <th className="p-4">Category</th>
                                                    <th className="p-4">Description</th>
                                                    <th className="p-4 text-right">Amount</th>
                                                    <th className="p-4 text-center">Receipt</th>
                                                    <th className="p-4 text-center pr-6">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {sortedExpenses.length === 0 ? (
                                                    <tr><td colSpan={6} className="p-8 text-center text-[#8E939B]">No expenses recorded yet.</td></tr>
                                                ) : (
                                                    sortedExpenses.map((exp: any) => (
                                                        <tr key={exp.id} className="hover:bg-white/5 transition-colors">
                                                            <td className="p-4 pl-6 font-mono text-xs text-[#8E939B]">
                                                                {new Date(exp.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                            </td>
                                                            <td className="p-4">
                                                                <span className="bg-white/5 border border-white/10 px-2 py-1 rounded text-xs font-bold text-white">
                                                                    {exp.category_name || (typeof exp.category === 'object' && exp.category !== null ? exp.category.name : exp.category) || 'General'}
                                                                </span>
                                                            </td>
                                                            <td className="p-4 text-gray-300 max-w-[200px] truncate" title={exp.description}>
                                                                {exp.description || <span className="italic opacity-40">No description</span>}
                                                            </td>
                                                            <td className="p-4 text-right font-bold text-[#FF2A6D]">₹{parseFloat(exp.amount || '0').toLocaleString('en-IN')}</td>
                                                            <td className="p-4 text-center">
                                                                {(exp.receipt_image || exp.receipt) ? (
                                                                    <a 
                                                                        href={exp.receipt_image || exp.receipt} 
                                                                        target="_blank" 
                                                                        rel="noopener noreferrer" 
                                                                        className="inline-flex items-center gap-1.5 text-[10px] bg-[#01FFFF]/10 text-[#01FFFF] border border-[#01FFFF]/30 hover:bg-[#01FFFF] hover:text-black transition px-2.5 py-1 rounded-md uppercase tracking-widest font-bold shadow-sm"
                                                                    >
                                                                        <img src={exp.receipt_image || exp.receipt} alt="Receipt" className="w-4 h-4 object-cover rounded border border-[#01FFFF]/40" />
                                                                        <ImageIcon className="w-3 h-3" /> View
                                                                    </a>
                                                                ) : (
                                                                    <span className="text-[#8E939B] text-xs">—</span>
                                                                )}
                                                            </td>
                                                            <td className="p-4 text-center pr-6">
                                                                <div className="flex items-center justify-center gap-2">
                                                                    <button
                                                                        onClick={() => startEditingExpense(exp)}
                                                                        className="p-1.5 rounded-lg bg-white/5 hover:bg-[#01FFFF]/20 text-[#8E939B] hover:text-[#01FFFF] transition-all flex items-center gap-1 text-xs font-bold"
                                                                        title="Edit expense"
                                                                    >
                                                                        <Pencil className="w-3.5 h-3.5" />
                                                                        <span className="hidden sm:inline">Edit</span>
                                                                    </button>
                                                                    <button
                                                                        onClick={() => deleteExpense(exp.id)}
                                                                        className="p-1.5 rounded-lg bg-white/5 hover:bg-[#FF2A6D]/20 text-[#8E939B] hover:text-[#FF2A6D] transition-all flex items-center gap-1 text-xs font-bold"
                                                                        title="Delete expense"
                                                                    >
                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                        <span className="hidden sm:inline">Delete</span>
                                                                    </button>
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
                        )})()}

                        {/* BANK MANAGEMENT SUBTAB */}
                        {financeSubTab === 'bank' && (
                            <div className="animate-[fadeIn_0.3s_ease-out]">
                                <BankDepositTab />
                            </div>
                        )}

                        {financeSubTab === 'invoices' && (
                            <div className="bg-[#141518]/60 border border-white/5 rounded-3xl overflow-hidden animate-[fadeIn_0.3s_ease-out]">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-black/40 text-[#8E939B] font-grotesk text-[10px] uppercase tracking-widest">
                                        <tr><th className="p-4 pl-6">Booking ID</th><th className="p-4">Customer</th><th className="p-4">Phone No</th><th className="p-4">Amount</th><th className="p-4 text-right pr-6">Generate</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {invoiceList.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="p-8 text-center text-[#8E939B]">
                                                    No completed bookings found to generate invoices for.
                                                </td>
                                            </tr>
                                        ) : (
                                            invoiceList.map((booking: any) => (
                                                <tr key={booking.id} className="hover:bg-white/5 transition-colors group">
                                                    <td className="p-4 pl-6 font-mono text-xs">
                                                        #INV-{booking.id.toString().padStart(4, '0')}
                                                    </td>
                                                    <td className="p-4 font-bold">
                                                        {booking.vehicle_info || (booking.vehicle ? booking.vehicle.plate_number : 'Walk-In Customer')}
                                                    </td>
                                                    <td className="p-4 text-[#8E939B] text-xs">
                                                        {booking.customer?.phone_number || booking.customer_phone || 'N/A'}
                                                    </td>
                                                    <td className="p-4 text-[#01FFFF] font-bold">
                                                        ₹{booking.final_price || (booking.service_package_details?.price) || (booking.service_package?.price) || '0'}
                                                    </td>
                                                    <td className="p-4 text-right pr-6">
                                                        <button onClick={() => downloadInvoice(booking.id)} className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 hover:bg-emerald-500 hover:text-black transition px-3 py-1.5 rounded-sm uppercase tracking-widest font-bold flex gap-1 ml-auto items-center">
                                                            <FileText className="w-3 h-3" /> Get PDF
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
            {/* MANUAL KHATA CHARGE MODAL */}
            {isManualKhataOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center animate-[fadeIn_0.2s_ease-out] px-4">
                    <div className="bg-[#141518] border border-white/10 p-8 rounded-[2.5rem] w-full max-w-md shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-syncopate font-bold tracking-widest text-purple-400">ADD KHATA CHARGE</h3>
                            <button onClick={() => setIsManualKhataOpen(false)} className="text-[#8E939B] hover:text-white transition-colors">
                                <PlusCircle className="w-6 h-6 rotate-45" />
                            </button>
                        </div>
                        
                        <div className="space-y-4 mb-8">
                            <div>
                                <label className="font-grotesk text-[10px] uppercase tracking-[0.2em] text-[#8E939B] font-bold ml-2">Phone Number</label>
                                <input
                                    type="tel" value={manualKhataForm.phone}
                                    onChange={(e) => setManualKhataForm({ ...manualKhataForm, phone: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 py-4 px-6 rounded-xl text-white font-mono focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all mt-2"
                                    placeholder="+91 9876543210"
                                />
                            </div>
                            <div>
                                <label className="font-grotesk text-[10px] uppercase tracking-[0.2em] text-[#8E939B] font-bold ml-2">Customer Name</label>
                                <input
                                    type="text" 
                                    list="khata-customers-list"
                                    value={manualKhataForm.name}
                                    onChange={(e) => {
                                        const typedName = e.target.value;
                                        // Use the existing khataCustomers array for the lookup
                                        const matchedCustomer = khataCustomers.find((c: any) => c.name.toLowerCase() === typedName.toLowerCase());
                                        
                                        setManualKhataForm({ 
                                            ...manualKhataForm, 
                                            name: typedName,
                                            ...(matchedCustomer && matchedCustomer.phone_number ? { phone: matchedCustomer.phone_number } : {})
                                        });
                                    }}
                                    className="w-full bg-white/5 border border-white/10 py-4 px-6 rounded-xl text-white focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all mt-2"
                                    placeholder="e.g. Rahul Kumar"
                                />
                                <datalist id="khata-customers-list">
                                    {khataCustomers.map((c: any) => (
                                        <option key={c.id} value={c.name} />
                                    ))}
                                </datalist>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="font-grotesk text-[10px] uppercase tracking-[0.2em] text-[#8E939B] font-bold ml-2">Amount (₹)</label>
                                    <input
                                        type="number" value={manualKhataForm.amount}
                                        onChange={(e) => setManualKhataForm({ ...manualKhataForm, amount: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 py-4 px-6 rounded-xl text-white font-mono focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all mt-2"
                                        placeholder="500"
                                    />
                                </div>
                                <div>
                                    <label className="font-grotesk text-[10px] uppercase tracking-[0.2em] text-[#8E939B] font-bold ml-2">Description</label>
                                    <input
                                        type="text" value={manualKhataForm.description}
                                        onChange={(e) => setManualKhataForm({ ...manualKhataForm, description: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 py-4 px-6 rounded-xl text-white focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all mt-2"
                                        placeholder="Credit"
                                    />
                                </div>
                            </div>

                            {/* CAMERA PROOF TRIGGER */}
                            <div className="pt-3 border-t border-purple-500/20">
                                <label className="font-grotesk text-[10px] uppercase tracking-[0.2em] text-[#8E939B] font-bold block mb-2">
                                    Number Plate Proof Photo
                                </label>
                                <div className="flex items-center gap-3">
                                    {manualKhataProofPreview && (
                                        <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-[#01FFFF] group flex-shrink-0">
                                            <img src={manualKhataProofPreview} alt="Proof Preview" className="w-full h-full object-cover" />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setManualKhataProofFile(null);
                                                    setManualKhataProofPreview(null);
                                                }}
                                                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-red-400 hover:text-red-300 transition-opacity"
                                                title="Remove photo"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => setIsCameraModalOpen(true)}
                                        className="flex-1 py-3 px-3 rounded-xl bg-purple-950/40 border border-purple-500/30 text-purple-300 hover:text-white hover:bg-purple-900/40 transition-all text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-95"
                                    >
                                        <Camera className="w-4 h-4" />
                                        {manualKhataProofPreview ? 'Re-take' : 'Camera'}
                                    </button>
                                    <label className="flex-1 py-3 px-3 rounded-xl bg-white/5 border border-white/10 text-neutral-300 hover:text-white hover:bg-white/10 transition-all text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer active:scale-95">
                                        <ImageIcon className="w-4 h-4 text-[#01FFFF]" />
                                        Upload
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="sr-only"
                                            onChange={(e) => {
                                                if (e.target.files && e.target.files[0]) {
                                                    const file = e.target.files[0];
                                                    setManualKhataProofFile(file);
                                                    setManualKhataProofPreview(URL.createObjectURL(file));
                                                }
                                            }}
                                        />
                                    </label>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => {
                                submitManualKhataCharge(manualKhataProofFile);
                                setManualKhataProofFile(null);
                                setManualKhataProofPreview(null);
                            }}
                            className="w-full bg-purple-500 text-white font-syncopate font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:bg-purple-400 transition-all flex items-center justify-center gap-2"
                        >
                            <PlusCircle className="w-5 h-5" /> CONFIRM CHARGE
                        </button>
                    </div>
                </div>
            )}

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

            {/* KHATA CUSTOMER MODAL */}
            {isKhataCustomerModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center animate-[fadeIn_0.2s_ease-out] px-4">
                    <div className="bg-[#141518]/95 border border-white/10 p-8 rounded-[2.5rem] w-full max-w-lg shadow-[0_0_60px_rgba(0,0,0,0.6)] backdrop-blur-xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-syncopate font-bold tracking-widest text-[#A855F7]">{editingKhataCustomer ? 'EDIT KHATA CUSTOMER' : 'REGISTER KHATA CUSTOMER'}</h3>
                            <button onClick={() => { setIsKhataCustomerModalOpen(false); setEditingKhataCustomer(null); }} className="text-[#8E939B] hover:text-white transition-colors"><PlusCircle className="w-6 h-6 rotate-45" /></button>
                        </div>
                        <div className="space-y-4 mb-8">
                            <div>
                                <label className="font-grotesk text-[10px] uppercase tracking-[0.2em] text-[#8E939B] font-bold ml-2">Customer Name</label>
                                <input
                                    type="text"
                                    value={khataCustomerForm.name}
                                    onChange={(e) => setKhataCustomerForm({ ...khataCustomerForm, name: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 py-4 px-6 rounded-xl text-white focus:outline-none focus:border-[#A855F7] focus:ring-1 focus:ring-[#A855F7] transition-all mt-2"
                                    placeholder="e.g. Anjali Sharma"
                                />
                            </div>
                            <div>
                                <label className="font-grotesk text-[10px] uppercase tracking-[0.2em] text-[#8E939B] font-bold ml-2">Phone Number</label>
                                <input
                                    type="tel"
                                    value={khataCustomerForm.phone_number}
                                    onChange={(e) => setKhataCustomerForm({ ...khataCustomerForm, phone_number: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 py-4 px-6 rounded-xl text-white focus:outline-none focus:border-[#A855F7] focus:ring-1 focus:ring-[#A855F7] transition-all mt-2"
                                    placeholder="e.g. 9876543210"
                                />
                            </div>
                            <div>
                                <label className="font-grotesk text-[10px] uppercase tracking-[0.2em] text-[#8E939B] font-bold ml-2">Credit Limit (₹)</label>
                                <input
                                    type="number"
                                    value={khataCustomerForm.credit_limit}
                                    onChange={(e) => setKhataCustomerForm({ ...khataCustomerForm, credit_limit: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 py-4 px-6 rounded-xl text-white focus:outline-none focus:border-[#A855F7] focus:ring-1 focus:ring-[#A855F7] transition-all mt-2"
                                    placeholder="e.g. 5000"
                                />
                            </div>
                        </div>
                        <button
                            onClick={saveKhataCustomer}
                            className="w-full bg-[#A855F7] text-white font-syncopate font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(168,85,247,0.35)] hover:bg-[#C084FC] transition-all flex items-center justify-center gap-2"
                        >
                            <UserPlus className="w-5 h-5" /> SAVE CUSTOMER
                        </button>
                    </div>
                </div>
            )}

            {/* KHATA LEDGER HISTORY MODAL */}
            {isKhataLedgerModalOpen && (
                <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center animate-[fadeIn_0.2s_ease-out] p-4">
                    <div className="bg-[#101115] border border-white/15 p-6 sm:p-8 rounded-[2rem] w-full max-w-4xl shadow-[0_0_80px_rgba(0,0,0,0.8)] backdrop-blur-2xl flex flex-col max-h-[85vh]">
                        {/* Header Banner */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-5 mb-5 border-b border-white/10 flex-shrink-0">
                            <div className="space-y-1.5">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-[10px] font-mono tracking-widest text-[#01FFFF] bg-[#01FFFF]/10 border border-[#01FFFF]/30 px-2.5 py-0.5 rounded-full uppercase font-bold">
                                        Customer Credit Ledger
                                    </span>
                                    {selectedKhataCustomer?.id && (
                                        <span className="text-[10px] font-mono text-neutral-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-md">
                                            ID: #{String(selectedKhataCustomer.id).slice(0, 8)}
                                        </span>
                                    )}
                                </div>
                                <h3 className="font-syncopate font-bold text-xl sm:text-2xl text-white tracking-wide">
                                    {selectedKhataCustomer?.name || 'Customer Ledger'}
                                </h3>
                                <div className="text-xs text-neutral-400 font-mono flex flex-wrap items-center gap-2 sm:gap-3">
                                    <span className="text-neutral-300">
                                        📞 {selectedKhataCustomer?.phone_number ? (selectedKhataCustomer.phone_number.startsWith('+') ? selectedKhataCustomer.phone_number : `+91 ${selectedKhataCustomer.phone_number.replace(/^91/, '')}`) : 'No phone recorded'}
                                    </span>
                                    <span className="text-neutral-600">•</span>
                                    <span>
                                        Limit: ₹{Number(selectedKhataCustomer?.credit_limit || 5000).toLocaleString('en-IN')}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 self-stretch sm:self-center justify-between sm:justify-end">
                                <div className="bg-black/50 border border-yellow-500/30 px-4 py-2 rounded-2xl text-right">
                                    <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-400 block">Total Due</span>
                                    <span className="font-syncopate font-bold text-base sm:text-lg text-yellow-400">
                                        ₹{Number(selectedKhataCustomer?.outstanding_balance ?? selectedKhataCustomer?.balance ?? 0).toLocaleString('en-IN')}
                                    </span>
                                </div>
                                <button 
                                    onClick={() => setIsKhataLedgerModalOpen(false)} 
                                    className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
                                    title="Close Ledger"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Transaction Timeline Table */}
                        <div className="flex-1 overflow-auto rounded-2xl border border-white/10 bg-black/40">
                            <table className="w-full text-left text-sm">
                                <thead className="sticky top-0 bg-[#0b0c0f]/95 text-[#8E939B] font-grotesk text-[10px] uppercase tracking-widest border-b border-white/10 z-10">
                                    <tr>
                                        <th className="p-3.5 pl-5">Date</th>
                                        <th className="p-3.5">Service / Description</th>
                                        <th className="p-3.5">Vehicle Plate</th>
                                        <th className="p-3.5">Proof</th>
                                        <th className="p-3.5">Type & Method</th>
                                        <th className="p-3.5 text-right pr-5">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 font-sans">
                                    {(() => {
                                        const safeKhataLedger = Array.isArray(khataLedger) ? khataLedger : (Array.isArray((khataLedger as any)?.results) ? (khataLedger as any).results : (Array.isArray((khataLedger as any)?.data) ? (khataLedger as any).data : (Array.isArray((khataLedger as any)?.history) ? (khataLedger as any).history : [])));
                                        
                                        if (safeKhataLedger.length === 0) {
                                            return (
                                                <tr>
                                                    <td colSpan={6} className="p-12 text-center">
                                                        <div className="flex flex-col items-center justify-center gap-2">
                                                            <Clock className="w-8 h-8 text-neutral-600" />
                                                            <p className="text-neutral-400 font-mono text-xs">No ledger history available for this customer.</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        }

                                        return safeKhataLedger.map((entry: any) => {
                                            const isSettlement = entry.transaction_type === 'SETTLEMENT';
                                            const rawImg = entry.number_plate_image;
                                            const imgUrl = rawImg ? (rawImg.startsWith('http') ? rawImg : `http://127.0.0.1:8001${rawImg.startsWith('/') ? '' : '/'}${rawImg}`) : null;
                                            const plate = entry.booking?.vehicle?.plate_number || entry.plate_number || entry.vehicle_plate || null;
                                            const serviceName = entry.booking?.service_package?.name || entry.description || 'Car Spa Service';
                                            const dateText = entry.created_at ? new Date(entry.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : (entry.date || 'N/A');

                                            return (
                                                <tr key={entry.id} className="hover:bg-white/5 transition-colors">
                                                    <td className="p-3.5 pl-5 font-mono text-xs text-[#8E939B] whitespace-nowrap">
                                                        {dateText}
                                                    </td>
                                                    <td className="p-3.5 text-gray-200 max-w-[220px]">
                                                        <p className="font-semibold text-xs text-white truncate" title={serviceName}>
                                                            {serviceName}
                                                        </p>
                                                        {entry.description && entry.description !== serviceName && (
                                                            <p className="text-[11px] text-neutral-400 truncate" title={entry.description}>
                                                                {entry.description}
                                                            </p>
                                                        )}
                                                    </td>
                                                    <td className="p-3.5">
                                                        {plate ? (
                                                            <span className="font-mono text-xs font-bold text-[#01FFFF] bg-[#01FFFF]/10 border border-[#01FFFF]/30 px-2 py-0.5 rounded-md inline-block whitespace-nowrap">
                                                                {plate}
                                                            </span>
                                                        ) : (
                                                            <span className="font-mono text-xs text-neutral-500">N/A</span>
                                                        )}
                                                    </td>
                                                    <td className="p-3.5">
                                                        {imgUrl ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => setLightboxImage(imgUrl)}
                                                                className="w-10 h-10 rounded-lg overflow-hidden border border-[#01FFFF]/40 hover:border-[#01FFFF] hover:scale-110 transition-all block relative shadow-md group"
                                                                title="View number plate photo proof"
                                                            >
                                                                <img 
                                                                    src={imgUrl} 
                                                                    alt="Proof" 
                                                                    className="w-full h-full object-cover" 
                                                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                                />
                                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[#01FFFF]">
                                                                    <Eye className="w-4 h-4" />
                                                                </div>
                                                            </button>
                                                        ) : (
                                                            <span className="text-[10px] text-neutral-500 font-mono uppercase bg-white/5 px-2 py-0.5 rounded border border-white/5">
                                                                None
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="p-3.5 whitespace-nowrap">
                                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                            isSettlement 
                                                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                                                                : 'bg-[#FF2A6D]/15 text-[#FF2A6D] border border-[#FF2A6D]/30'
                                                        }`}>
                                                            {isSettlement ? `Settlement (${entry.payment_method || 'Cash'})` : 'Credit Charge'}
                                                        </span>
                                                    </td>
                                                    <td className={`p-3.5 text-right font-mono font-bold text-sm pr-5 whitespace-nowrap ${
                                                        isSettlement ? 'text-emerald-400' : 'text-[#FF2A6D]'
                                                    }`}>
                                                        {isSettlement ? `-₹${Number(entry.amount || 0).toLocaleString('en-IN')}` : `+₹${Number(entry.amount || 0).toLocaleString('en-IN')}`}
                                                    </td>
                                                </tr>
                                            );
                                        });
                                    })()}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* CAMERA POPUP MODAL FOR MANUAL KHATA */}
            <CameraCaptureModal
                isOpen={isCameraModalOpen}
                onClose={() => setIsCameraModalOpen(false)}
                onCapture={(file, previewUrl) => {
                    setManualKhataProofFile(file);
                    setManualKhataProofPreview(previewUrl);
                }}
                title="Capture Back Number Plate Proof"
            />

            {/* LIGHTBOX MODAL FOR FULL-RESOLUTION PROOF PHOTO */}
            {lightboxImage && (
                <div
                    className="fixed inset-0 z-50 bg-black/90 backdrop-blur-2xl flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]"
                    onClick={() => setLightboxImage(null)}
                >
                    <div className="relative max-w-4xl w-full max-h-[90vh] bg-[#0d0e12] border border-white/10 rounded-3xl overflow-hidden p-4 shadow-[0_0_80px_rgba(1,255,255,0.2)] flex flex-col items-center">
                        <div className="w-full flex justify-between items-center pb-3 mb-3 border-b border-white/10">
                            <h4 className="font-syncopate font-bold text-xs text-[#01FFFF] tracking-widest uppercase">
                                {lightboxTitle || 'Proof Photo'}
                            </h4>
                            <button
                                onClick={() => setLightboxImage(null)}
                                className="p-2 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="w-full flex-1 flex items-center justify-center overflow-hidden">
                            <img
                                src={lightboxImage}
                                alt="Full Resolution Proof"
                                className="max-w-full max-h-[75vh] object-contain rounded-xl border border-white/10 shadow-2xl"
                            />
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
