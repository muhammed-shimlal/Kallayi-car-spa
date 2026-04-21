'use client';

import React, { useRef } from 'react';
import { Download, TrendingUp, Clock, PlusCircle, UserPlus, AlertCircle, FileText, Pencil, Trash2, Check, Tag, Calendar, Image as ImageIcon, X } from 'lucide-react';
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Line } from 'recharts';
import { useDashboard } from '../context/DashboardContext';
import { Skeleton } from '@/components/ui/Skeleton';

export default function FinanceTab() {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { uiState, financeState } = useDashboard();
    const { 
        isLoading, financeSubTab, setFinanceSubTab, setIsManualKhataOpen,
        setIsKhataCustomerModalOpen, setIsKhataLedgerModalOpen, setIsKhataModalOpen
    } = uiState;
    
    const { 
        chartData, expenses, expenseCategories, isSubmittingExpense, expenseForm,
        receiptFile, receiptPreview, editingExpense, khataCustomers, khataLedger, selectedKhataCustomer,
        editingKhataCustomer, khataCustomerForm, khataPaymentAmount, eodData, manualKhataForm,
        customerCredits, invoiceList, totalOutstandingCredit, setExpenseForm, setReceiptFile, setReceiptPreview, 
        setKhataCustomerForm, setKhataPaymentAmount, setManualKhataForm, handleFileChange, clearFile, 
        handleExpenseSubmit, startEditingExpense, cancelEditingExpense, deleteExpense, downloadTaxReport, 
        downloadInvoice, settleCredit, openKhataCustomerModal, saveKhataCustomer, deleteKhataCustomer, 
        loadKhataLedger, handleKhataSettle, submitManualKhataCharge
    } = financeState;

    return (
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

        {/* TABLE 1: MANUAL KHATA */}
        <h4 className="font-syncopate font-bold text-sm tracking-widest text-[#01FFFF] mb-4 mt-8">DIGITAL KHATA ACCOUNTS (MANUAL CREDIT)</h4>
        <div className="bg-[#141518]/60 border border-white/5 rounded-3xl overflow-hidden mb-8">
            <table className="w-full text-left text-sm">
                <thead className="bg-black/40 text-[#8E939B] font-grotesk text-[10px] uppercase tracking-widest">
                    <tr><th className="p-4 pl-6">Customer Name</th><th className="p-4">Phone Number</th><th className="p-4">Outstanding Balance</th><th className="p-4 text-right pr-6">Action</th></tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {khataCustomers.length === 0 ? (
                        <tr><td colSpan={4} className="p-8 text-center text-[#8E939B]">All Khata accounts are settled! No outstanding credit.</td></tr>
                    ) : (
                        khataCustomers.map((khata: any) => (
                            <tr key={khata.id} className="hover:bg-white/5 transition-colors">
                                <td className="p-4 pl-6 font-bold text-white">{khata.name}</td>
                                <td className="p-4 text-[#8E939B]">{khata.phone_number || 'N/A'}</td>
                                <td className="p-4 font-syncopate font-bold text-yellow-400 flex items-center gap-2">
                                    ₹{khata.outstanding_balance}
                                    {khata.outstanding_balance >= khata.credit_limit && <AlertCircle className="w-4 h-4 text-[#FF2A6D]" />}
                                </td>
                                <td className="p-4 text-right pr-6">
                                    <div className="flex flex-wrap justify-end items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => loadKhataLedger(khata)}
                                            className="text-[#8E939B] hover:text-[#01FFFF] transition-colors p-2 rounded-lg bg-white/5 hover:bg-white/10"
                                            title="View history"
                                        >
                                            <FileText className="w-4 h-4" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => openKhataCustomerModal(khata)}
                                            className="text-[#8E939B] hover:text-[#01FFFF] transition-colors p-2 rounded-lg bg-white/5 hover:bg-white/10"
                                            title="Edit customer"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => deleteKhataCustomer(khata.id)}
                                            className="text-[#8E939B] hover:text-[#FF2A6D] transition-colors p-2 rounded-lg bg-white/5 hover:bg-[#FF2A6D]/10"
                                            title="Delete customer"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setSelectedKhataCustomer(khata); setIsKhataModalOpen(true); }}
                                            className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-sm uppercase tracking-widest font-bold flex gap-1 items-center hover:bg-emerald-500 hover:text-black transition"
                                        >
                                            <Check className="w-3 h-3" /> Settle
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )))}
                </tbody>
            </table>
        </div>

        {/* TABLE 2: UNPAID BOOKING INVOICES */}
        <h4 className="font-syncopate font-bold text-sm tracking-widest text-purple-400 mb-4 mt-8">UNPAID BOOKING INVOICES (CAR WASHES)</h4>
        <div className="bg-[#141518]/60 border border-white/5 rounded-3xl overflow-hidden">
            <table className="w-full text-left text-sm">
                <thead className="bg-black/40 text-[#8E939B] font-grotesk text-[10px] uppercase tracking-widest">
                    <tr><th className="p-4 pl-6">Customer</th><th className="p-4">Vehicle</th><th className="p-4">Amount Owed</th><th className="p-4 text-right pr-6">Action</th></tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {customerCredits.length === 0 ? (
                        <tr><td colSpan={4} className="p-8 text-center text-[#8E939B]">All booking invoices are settled!</td></tr>
                    ) : (
                        customerCredits.map((credit) => (
                            <tr key={credit.id} className="hover:bg-white/5">
                                <td className="p-4 pl-6 font-bold text-white">{credit.customer}</td>
                                <td className="p-4 text-[#8E939B]">{credit.vehicle}</td>
                                <td className="p-4 font-syncopate font-bold text-purple-400 flex items-center gap-2">
                                    ₹{credit.amount} {credit.status === 'Overdue' && <AlertCircle className="w-4 h-4 text-[#FF2A6D]" />}
                                </td>
                                <td className="p-4 text-right pr-6">
                                    <button onClick={() => settleCredit(credit.id)} className="text-[9px] bg-purple-500/20 text-purple-400 border border-purple-500/30 px-3 py-1.5 rounded-sm uppercase tracking-widest font-bold flex gap-1 ml-auto items-center hover:bg-purple-500 hover:text-black transition">
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
                                                    {expenseCategories.map(cat => (
                                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                                    ))}
                                                </select>
                                            </div>
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
                                            Total: ₹{expenses.reduce((sum, exp) => sum + Number(exp.amount), 0).toLocaleString()}
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
                                                {expenses.length === 0 ? (
                                                    <tr><td colSpan={6} className="p-8 text-center text-[#8E939B]">No expenses recorded yet.</td></tr>
                                                ) : (
                                                    expenses.map((exp: any) => (
                                                        <tr key={exp.id} className="hover:bg-white/5">
                                                            <td className="p-4 pl-6 font-mono text-xs text-[#8E939B]">{new Date(exp.date).toLocaleDateString()}</td>
                                                            <td className="p-4">
                                                                <span className="bg-white/5 border border-white/10 px-2 py-1 rounded text-xs font-bold text-white">
                                                                    {exp.category_name || exp.category || 'General'}
                                                                </span>
                                                            </td>
                                                            <td className="p-4 text-gray-300 max-w-[200px] truncate" title={exp.description}>{exp.description}</td>
                                                            <td className="p-4 text-right font-bold text-[#FF2A6D]">₹{exp.amount}</td>
                                                            <td className="p-4 text-center">
                                                                {exp.receipt_image ? (
                                                                    <a href={exp.receipt_image} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] bg-[#01FFFF]/10 text-[#01FFFF] border border-[#01FFFF]/30 hover:bg-[#01FFFF] hover:text-black transition px-2 py-1 rounded-sm uppercase tracking-widest font-bold">
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
                                                                        className="text-[#8E939B] hover:text-[#01FFFF] transition-colors p-1"
                                                                        title="Edit expense"
                                                                    >
                                                                        <Pencil className="w-4 h-4" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => deleteExpense(exp.id)}
                                                                        className="text-[#8E939B] hover:text-[#FF2A6D] transition-colors p-1"
                                                                        title="Delete expense"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
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
                    </div>
    );
}
