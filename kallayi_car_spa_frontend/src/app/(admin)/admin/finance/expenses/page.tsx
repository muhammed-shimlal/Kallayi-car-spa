'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
    Receipt, ChevronLeft, LayoutDashboard, PlusCircle,
    IndianRupee, Calendar, Tag, FileText, Upload,
    Loader2, TrendingDown, RefreshCw, Image as ImageIcon,
    X
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8001/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExpenseCategory {
    id: number;
    name: string;
    description: string;
}

interface GeneralExpense {
    id: number;
    category: ExpenseCategory | null;
    amount: string;
    description: string;
    date: string;
    receipt_image: string | null;
    recorded_by: string | null;
    created_at: string;
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, accent, glow }: { label: string; value: string; sub?: string; accent: string; glow: string }) {
    return (
        <div className={`relative bg-[#141518]/60 backdrop-blur-xl border border-white/5 p-6 rounded-3xl overflow-hidden group transition-all duration-300 hover:border-white/10 ${glow}`}>
            <div className={`absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity ${accent.replace('text-', 'bg-')}`} />
            <p className={`text-[10px] font-bold uppercase tracking-[0.25em] mb-2 flex items-center gap-2 ${accent}`}>
                <TrendingDown className="w-3.5 h-3.5" /> {label}
            </p>
            <h3 className="font-syncopate font-bold text-2xl text-white tracking-tight">{value}</h3>
            {sub && <p className="text-[10px] text-[#8E939B] mt-1 uppercase tracking-widest">{sub}</p>}
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ExpensesPage() {
    const router = useRouter();

    // Data states
    const [categories, setCategories] = useState<ExpenseCategory[]>([]);
    const [expenses, setExpenses] = useState<GeneralExpense[]>([]);
    const [isLoadingExpenses, setIsLoadingExpenses] = useState(true);

    // Form states
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [form, setForm] = useState({
        category: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        description: '',
    });
    const [receiptFile, setReceiptFile] = useState<File | null>(null);
    const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ─── Fetchers ─────────────────────────────────────────────────────────────

    const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

    const fetchCategories = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/finance/expense-categories/`, {
                headers: { Authorization: `Token ${getToken()}` },
            });
            if (res.ok) setCategories(await res.json());
            else {
                // Default fallback categories
                setCategories([
                    { id: 1, name: 'Chemicals', description: '' },
                    { id: 2, name: 'Rent', description: '' },
                    { id: 3, name: 'Utilities', description: '' },
                    { id: 4, name: 'Maintenance', description: '' },
                    { id: 5, name: 'General', description: '' }
                ]);
            }
        } catch { /* silent */ }
    }, []);

    const fetchExpenses = useCallback(async (silent = false) => {
        if (!silent) setIsLoadingExpenses(true);
        try {
            const res = await fetch(`${API_BASE}/finance/general-expenses/`, {
                headers: { Authorization: `Token ${getToken()}` },
            });
            if (res.ok) {
                const data = await res.json();
                setExpenses(Array.isArray(data) ? data : (data.results ?? []));
            }
        } catch { /* silent */ } finally {
            setIsLoadingExpenses(false);
        }
    }, []);

    useEffect(() => {
        const token = getToken();
        if (!token) { router.push('/login'); return; }
        fetchCategories();
        fetchExpenses();
    }, [fetchCategories, fetchExpenses, router]);

    // ─── File Handling ────────────────────────────────────────────────────────

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] ?? null;
        setReceiptFile(file);
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setReceiptPreview(reader.result as string);
            reader.readAsDataURL(file);
        } else {
            setReceiptPreview(null);
        }
    };

    const clearFile = () => {
        setReceiptFile(null);
        setReceiptPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // ─── Submit ───────────────────────────────────────────────────────────────

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.category || !form.amount || !form.date) {
            toast.error('Category, amount, and date are required.');
            return;
        }

        setIsSubmitting(true);
        try {
            const fd = new FormData();
            fd.append('category', form.category);
            fd.append('amount', form.amount);
            fd.append('date', form.date);
            fd.append('description', form.description);
            if (receiptFile) fd.append('receipt_image', receiptFile);

            const res = await fetch(`${API_BASE}/finance/general-expenses/`, {
                method: 'POST',
                headers: { Authorization: `Token ${getToken()}` },
                body: fd,
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.detail ?? JSON.stringify(err) ?? 'Submission failed');
            }

            toast.success('Expense recorded successfully!');
            setForm({ category: '', amount: '', date: new Date().toISOString().split('T')[0], description: '' });
            clearFile();
            fetchExpenses(true);
        } catch (err: any) {
            toast.error(err.message || 'Failed to record expense.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // ─── Derived Data ──────────────────────────────────────────────────────────

    const todayStr = new Date().toISOString().split('T')[0];
    const todayExpenses = expenses.filter(e => e.date === todayStr);
    const thisMonthExpenses = expenses.filter(e => e.date.substring(0, 7) === todayStr.substring(0, 7));

    const totalAmount = expenses.reduce((s, e) => s + parseFloat(e.amount || '0'), 0);
    const totalToday = todayExpenses.reduce((s, e) => s + parseFloat(e.amount || '0'), 0);
    const totalThisMonth = thisMonthExpenses.reduce((s, e) => s + parseFloat(e.amount || '0'), 0);

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="min-h-screen bg-[#050505] text-white font-jakarta">

            {/* ── Background Texture ─────────────────────────────────────── */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#FF2A6D]/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#01FFFF]/5 rounded-full blur-[120px]" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-10 py-10">

                {/* ── Header ─────────────────────────────────────────────── */}
                <header className="flex items-center justify-between mb-10">
                    <div className="flex items-center gap-6">
                        <button
                            onClick={() => router.push('/admin/dashboard')}
                            className="flex items-center gap-2 text-[#8E939B] hover:text-white transition-colors text-xs font-bold uppercase tracking-widest"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            <LayoutDashboard className="w-4 h-4" /> Dashboard
                        </button>
                        <div className="w-px h-6 bg-white/10" />
                        <div>
                            <h1 className="font-syncopate font-black text-2xl tracking-widest">
                                EXPENSES<span className="text-[#FF2A6D]">.</span>
                            </h1>
                            <p className="text-[10px] text-[#8E939B] uppercase tracking-[0.3em] mt-0.5">Finance Department</p>
                        </div>
                    </div>

                    <button
                        onClick={() => fetchExpenses()}
                        className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-full text-[#8E939B] hover:text-white transition-all text-xs font-bold uppercase tracking-widest"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoadingExpenses ? 'animate-spin' : ''}`} /> Refresh
                    </button>
                </header>

                {/* ── Stat Row ───────────────────────────────────────────── */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
                    <StatCard
                        label="Total Recorded"
                        value={`₹${totalAmount.toLocaleString('en-IN')}`}
                        sub={`${expenses.length} total entries`}
                        accent="text-[#FF2A6D]"
                        glow="hover:shadow-[0_0_30px_rgba(255,42,109,0.08)]"
                    />
                    <StatCard
                        label="Spent Today"
                        value={`₹${totalToday.toLocaleString('en-IN')}`}
                        sub="Current day"
                        accent="text-[#01FFFF]"
                        glow="hover:shadow-[0_0_30px_rgba(1,255,255,0.08)]"
                    />
                    <StatCard
                        label="Spent This Month"
                        value={`₹${totalThisMonth.toLocaleString('en-IN')}`}
                        sub="Current month"
                        accent="text-white"
                        glow="hover:shadow-[0_0_30px_rgba(255,255,255,0.08)]"
                    />
                </div>

                {/* ── Main Grid ──────────────────────────────────────────── */}
                <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">

                    {/* ── LEFT: Record Form ─────────────────────────────── */}
                    <div className="xl:col-span-2">
                        <div className="bg-[#141518]/60 backdrop-blur-2xl border border-white/5 rounded-[2rem] overflow-hidden sticky top-10">
                            {/* Card Header */}
                            <div className="px-8 py-6 border-b border-white/5 bg-gradient-to-r from-[#FF2A6D]/10 to-transparent flex items-center gap-4">
                                <div className="w-10 h-10 rounded-2xl bg-[#FF2A6D]/20 border border-[#FF2A6D]/30 flex items-center justify-center shadow-[0_0_15px_rgba(255,42,109,0.2)]">
                                    <PlusCircle className="w-5 h-5 text-[#FF2A6D]" />
                                </div>
                                <div>
                                    <h2 className="font-syncopate font-bold text-sm tracking-widest">RECORD EXPENSE</h2>
                                    <p className="text-[10px] text-[#8E939B] uppercase tracking-widest mt-0.5">New operational cost entry</p>
                                </div>
                            </div>

                            <form onSubmit={handleSubmit} className="p-8 space-y-6">

                                {/* Category */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8E939B] flex items-center gap-2">
                                        <Tag className="w-3 h-3" /> Category
                                    </label>
                                    <div className="relative">
                                        <select
                                            value={form.category}
                                            onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                                            required
                                            className="w-full bg-[#0C0D0F] border border-white/8 rounded-xl px-4 py-3.5 text-white text-sm focus:border-[#FF2A6D]/60 focus:outline-none focus:ring-1 focus:ring-[#FF2A6D]/20 transition-all appearance-none cursor-pointer"
                                        >
                                            <option value="" disabled className="text-[#8E939B]">Select a category…</option>
                                            {categories.map(cat => (
                                                <option key={cat.id} value={cat.id || cat.name} className="bg-[#141518]">{cat.name}</option>
                                            ))}
                                            {categories.length === 0 && (
                                                <option disabled className="text-[#8E939B]">No categories configured</option>
                                            )}
                                        </select>
                                        <ChevronLeft className="absolute right-4 top-1/2 -translate-y-1/2 -rotate-90 w-4 h-4 text-[#8E939B] pointer-events-none" />
                                    </div>
                                </div>

                                {/* Amount & Date */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8E939B] flex items-center gap-2">
                                            <IndianRupee className="w-3 h-3" /> Amount
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8E939B] font-mono font-bold text-sm">₹</span>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                placeholder="0.00"
                                                value={form.amount}
                                                onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                                                required
                                                className="w-full bg-[#0C0D0F] border border-white/8 rounded-xl pl-8 pr-4 py-3.5 text-white font-mono text-sm focus:border-[#FF2A6D]/60 focus:outline-none focus:ring-1 focus:ring-[#FF2A6D]/20 transition-all placeholder:text-[#8E939B]/40"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8E939B] flex items-center gap-2">
                                            <Calendar className="w-3 h-3" /> Date
                                        </label>
                                        <input
                                            type="date"
                                            value={form.date}
                                            onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                                            required
                                            className="w-full bg-[#0C0D0F] border border-white/8 rounded-xl px-4 py-3.5 text-white text-sm focus:border-[#FF2A6D]/60 focus:outline-none focus:ring-1 focus:ring-[#FF2A6D]/20 transition-all cursor-pointer [color-scheme:dark]"
                                        />
                                    </div>
                                </div>

                                {/* Description */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8E939B] flex items-center gap-2">
                                        <FileText className="w-3 h-3" /> Description
                                    </label>
                                    <textarea
                                        rows={3}
                                        placeholder="e.g. Monthly soap chemicals restock from supplier…"
                                        value={form.description}
                                        onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                                        className="w-full bg-[#0C0D0F] border border-white/8 rounded-xl px-4 py-3.5 text-white text-sm focus:border-[#FF2A6D]/60 focus:outline-none focus:ring-1 focus:ring-[#FF2A6D]/20 transition-all resize-none placeholder:text-[#8E939B]/40"
                                    />
                                </div>

                                {/* Receipt Upload */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8E939B] flex items-center gap-2">
                                        <Upload className="w-3 h-3" /> Receipt Image <span className="text-[#8E939B]/50 normal-case tracking-normal font-normal">(optional)</span>
                                    </label>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                        className="hidden"
                                    />
                                    {receiptPreview ? (
                                        <div className="relative rounded-xl overflow-hidden border border-white/10 group">
                                            <img src={receiptPreview} alt="Receipt preview" className="w-full h-40 object-cover" />
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="bg-white/20 hover:bg-white/30 text-white text-[10px] uppercase font-bold tracking-widest px-3 py-1.5 rounded-lg transition-all flex items-center gap-1"
                                                >
                                                    <ImageIcon className="w-3 h-3" /> Change
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={clearFile}
                                                    className="bg-[#FF2A6D]/30 hover:bg-[#FF2A6D]/50 text-[#FF2A6D] text-[10px] uppercase font-bold tracking-widest px-3 py-1.5 rounded-lg transition-all flex items-center gap-1"
                                                >
                                                    <X className="w-3 h-3" /> Remove
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="w-full h-28 border border-dashed border-white/15 hover:border-[#FF2A6D]/40 rounded-xl flex flex-col items-center justify-center gap-2 text-[#8E939B] hover:text-[#FF2A6D] transition-all group bg-[#0C0D0F] hover:bg-[#FF2A6D]/5"
                                        >
                                            <div className="w-10 h-10 rounded-full bg-white/5 group-hover:bg-[#FF2A6D]/15 flex items-center justify-center transition-all">
                                                <Upload className="w-4 h-4" />
                                            </div>
                                            <span className="text-[10px] font-bold uppercase tracking-widest">Click to upload receipt</span>
                                            <span className="text-[9px] text-[#8E939B]/50">PNG, JPG or WEBP</span>
                                        </button>
                                    )}
                                </div>

                                {/* Submit */}
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full bg-gradient-to-r from-[#FF2A6D] to-[#E52323] hover:from-[#ff4d84] hover:to-[#FF2A6D] text-white font-syncopate font-bold text-xs py-4 rounded-xl uppercase tracking-widest transition-all shadow-[0_0_25px_rgba(255,42,109,0.35)] hover:shadow-[0_0_40px_rgba(255,42,109,0.5)] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:shadow-[0_0_25px_rgba(255,42,109,0.35)] active:scale-[0.98] flex items-center justify-center gap-3"
                                >
                                    {isSubmitting ? (
                                        <><Loader2 className="w-4 h-4 animate-spin" /> Recording…</>
                                    ) : (
                                        <><PlusCircle className="w-4 h-4" /> Record Expense</>
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* ── RIGHT: Expense Table ──────────────────────────── */}
                    <div className="xl:col-span-3 space-y-6">

                        {/* Table Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h2 className="font-syncopate font-bold text-lg tracking-widest flex items-center gap-3">
                                    <Receipt className="w-5 h-5 text-[#FF2A6D]" />
                                    RECENT EXPENSES
                                </h2>
                                <p className="text-[10px] text-[#8E939B] uppercase tracking-[0.25em] mt-1">
                                    {expenses.length} records shown
                                </p>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="bg-[#141518]/60 backdrop-blur-2xl border border-white/5 rounded-[2rem] overflow-hidden">
                            {isLoadingExpenses ? (
                                <div className="flex flex-col items-center justify-center py-24 gap-4">
                                    <Loader2 className="w-10 h-10 text-[#FF2A6D] animate-spin" />
                                    <p className="text-[#8E939B] text-xs uppercase font-bold tracking-widest">Loading expenses…</p>
                                </div>
                            ) : expenses.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-24 gap-4 opacity-50">
                                    <Receipt className="w-12 h-12 text-[#8E939B]" />
                                    <p className="text-[#8E939B] text-xs uppercase font-bold tracking-widest">No expenses found</p>
                                    <p className="text-[#8E939B]/60 text-[10px]">Record one using the form on the left</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-white/5">
                                                <th className="text-left px-6 py-4 text-[9px] font-bold uppercase tracking-[0.2em] text-[#8E939B]">Date</th>
                                                <th className="text-left px-6 py-4 text-[9px] font-bold uppercase tracking-[0.2em] text-[#8E939B]">Category</th>
                                                <th className="text-left px-6 py-4 text-[9px] font-bold uppercase tracking-[0.2em] text-[#8E939B] hidden md:table-cell">Description</th>
                                                <th className="text-right px-6 py-4 text-[9px] font-bold uppercase tracking-[0.2em] text-[#8E939B]">Amount</th>
                                                <th className="text-center px-6 py-4 text-[9px] font-bold uppercase tracking-[0.2em] text-[#8E939B]">Receipt</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {expenses.map((exp, i) => (
                                                <tr
                                                    key={exp.id}
                                                    className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors group"
                                                    style={{ animationDelay: `${i * 40}ms` }}
                                                >
                                                    <td className="px-6 py-4">
                                                        <span className="font-mono text-xs text-[#8E939B]">
                                                            {new Date(exp.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                        </span>
                                                    </td>

                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-2 h-2 rounded-full bg-[#FF2A6D]/60 flex-shrink-0" />
                                                            <span className="text-white font-bold text-xs truncate max-w-[100px]">
                                                                {exp.category?.name ?? '—'}
                                                            </span>
                                                        </div>
                                                    </td>

                                                    <td className="px-6 py-4 hidden md:table-cell">
                                                        <p className="text-[#8E939B] text-xs truncate max-w-[200px]">
                                                            {exp.description || <span className="italic opacity-40">No description</span>}
                                                        </p>
                                                    </td>

                                                    <td className="px-6 py-4 text-right">
                                                        <span className="font-syncopate font-bold text-sm text-[#FF2A6D]">
                                                            ₹{parseFloat(exp.amount).toLocaleString('en-IN')}
                                                        </span>
                                                    </td>

                                                    <td className="px-6 py-4 text-center">
                                                        {exp.receipt_image ? (
                                                            <a
                                                                href={exp.receipt_image}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-[#01FFFF] hover:text-white border border-[#01FFFF]/30 hover:border-white/30 px-2.5 py-1 rounded-lg transition-all"
                                                            >
                                                                <ImageIcon className="w-3 h-3" /> View
                                                            </a>
                                                        ) : (
                                                            <span className="text-[#8E939B]/40 text-[10px] italic">None</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Summary Footer */}
                        {expenses.length > 0 && (
                            <div className="bg-[#141518]/40 border border-white/5 rounded-2xl px-6 py-4 flex items-center justify-between">
                                <p className="text-[10px] text-[#8E939B] uppercase tracking-widest font-bold">
                                    Showing {expenses.length} expense{expenses.length !== 1 ? 's' : ''}
                                </p>
                                <p className="text-sm font-syncopate font-bold text-[#FF2A6D]">
                                    Total: ₹{expenses.reduce((s, e) => s + parseFloat(e.amount || '0'), 0).toLocaleString('en-IN')}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                .font-syncopate { font-family: 'Syncopate', sans-serif; }
                .font-jakarta { font-family: 'Plus Jakarta Sans', sans-serif; }
            `}} />
        </div>
    );
}
