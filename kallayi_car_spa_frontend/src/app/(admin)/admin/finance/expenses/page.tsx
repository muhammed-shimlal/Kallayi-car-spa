'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
    Receipt, ChevronLeft, LayoutDashboard, PlusCircle,
    IndianRupee, Calendar, Tag, FileText, Upload,
    Loader2, TrendingDown, RefreshCw, Image as ImageIcon,
    X, Pencil, Trash2, CheckCircle2
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
    category: ExpenseCategory | number | null;
    category_name?: string;
    amount: string;
    description: string;
    date: string;
    receipt_image: string | null;
    receipt?: string | null;
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

    // Editing state
    const [editingExpense, setEditingExpense] = useState<GeneralExpense | null>(null);

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

    // ─── Edit Management ──────────────────────────────────────────────────────

    const startEditing = (exp: GeneralExpense) => {
        setEditingExpense(exp);
        const catId = typeof exp.category === 'object' && exp.category !== null ? String(exp.category.id) : String(exp.category ?? '');
        setForm({
            category: catId,
            amount: String(exp.amount),
            date: exp.date,
            description: exp.description || '',
        });
        setReceiptFile(null);
        setReceiptPreview(exp.receipt_image || exp.receipt || null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const cancelEditing = () => {
        setEditingExpense(null);
        setForm({ category: '', amount: '', date: new Date().toISOString().split('T')[0], description: '' });
        clearFile();
    };

    // ─── Delete Management ─────────────────────────────────────────────────────

    const handleDelete = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this expense?')) return;
        try {
            const res = await fetch(`${API_BASE}/finance/general-expenses/${id}/`, {
                method: 'DELETE',
                headers: { Authorization: `Token ${getToken()}` },
            });
            if (res.ok || res.status === 204) {
                toast.success('Expense deleted successfully!');
                setExpenses(prev => prev.filter(item => item.id !== id));
            } else {
                toast.error('Failed to delete expense.');
            }
        } catch {
            toast.error('Network error while deleting expense.');
        }
    };

    // ─── Submit (Create / Update) ─────────────────────────────────────────────

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

            const isEdit = !!editingExpense;
            const url = isEdit ? `${API_BASE}/finance/general-expenses/${editingExpense.id}/` : `${API_BASE}/finance/general-expenses/`;
            const method = isEdit ? 'PATCH' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { Authorization: `Token ${getToken()}` },
                body: fd,
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.detail ?? JSON.stringify(err) ?? 'Submission failed');
            }

            const savedExp: GeneralExpense = await res.json();

            if (isEdit) {
                toast.success('Expense updated successfully!');
                setExpenses(prev => prev.map(item => item.id === savedExp.id ? savedExp : item));
            } else {
                toast.success('Expense recorded successfully!');
                setExpenses(prev => [savedExp, ...prev]);
            }

            cancelEditing();
        } catch (err: any) {
            toast.error(err.message || 'Failed to record expense.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // ─── Derived Data ──────────────────────────────────────────────────────────

    const todayStr = new Date().toISOString().split('T')[0];
    const todayExpenses = expenses.filter(e => e.date === todayStr);
    const thisMonthExpenses = expenses.filter(e => e.date?.substring(0, 7) === todayStr.substring(0, 7));

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

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

                {/* ── Header Nav ─────────────────────────────────────────────── */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-6">
                    <div>
                        <div className="flex items-center gap-2 text-xs text-[#8E939B] mb-1 font-mono uppercase tracking-widest">
                            <span className="text-[#FF2A6D] font-bold">Admin</span>
                            <span>/</span>
                            <span>Finance</span>
                            <span>/</span>
                            <span className="text-white">Expenses</span>
                        </div>
                        <h1 className="font-syncopate font-bold text-2xl sm:text-3xl text-white tracking-wider flex items-center gap-3">
                            <Receipt className="w-7 h-7 text-[#FF2A6D]" /> EXPENSE TRACKING
                        </h1>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.push('/admin/dashboard')}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-bold uppercase tracking-widest text-white transition-all active:scale-95"
                        >
                            <LayoutDashboard className="w-4 h-4" /> Dashboard
                        </button>
                    </div>
                </div>

                {/* ── KPI Stat Cards ─────────────────────────────────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <StatCard
                        label="Today's Overhead"
                        value={`₹${totalToday.toLocaleString('en-IN')}`}
                        sub={`${todayExpenses.length} transaction${todayExpenses.length !== 1 ? 's' : ''} today`}
                        accent="text-[#01FFFF]"
                        glow="hover:shadow-[0_0_30px_rgba(1,255,255,0.1)]"
                    />
                    <StatCard
                        label="This Month"
                        value={`₹${totalThisMonth.toLocaleString('en-IN')}`}
                        sub={`${thisMonthExpenses.length} transactions this month`}
                        accent="text-[#FF2A6D]"
                        glow="hover:shadow-[0_0_30px_rgba(255,42,109,0.1)]"
                    />
                    <StatCard
                        label="All Time Total"
                        value={`₹${totalAmount.toLocaleString('en-IN')}`}
                        sub={`${expenses.length} total entries recorded`}
                        accent="text-emerald-400"
                        glow="hover:shadow-[0_0_30px_rgba(52,211,153,0.1)]"
                    />
                </div>

                {/* ── Main Content Grid ──────────────────────────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

                    {/* ── Form Column (Add / Edit) ────────────────────────────── */}
                    <div className="lg:col-span-1 bg-[#141518]/60 backdrop-blur-xl border border-white/5 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative">
                        <div className="flex items-center justify-between">
                            <h2 className="font-syncopate font-bold text-sm text-[#FF2A6D] tracking-widest flex items-center gap-2 uppercase">
                                {editingExpense ? <Pencil className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
                                {editingExpense ? 'EDIT EXPENSE' : 'RECORD EXPENSE'}
                            </h2>
                            {editingExpense && (
                                <button
                                    onClick={cancelEditing}
                                    className="text-xs text-[#8E939B] hover:text-white transition flex items-center gap-1 uppercase font-mono"
                                >
                                    <X className="w-3.5 h-3.5" /> Cancel
                                </button>
                            )}
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Category Dropdown */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] text-[#8E939B] uppercase tracking-[0.2em] font-bold block">Category *</label>
                                <div className="relative">
                                    <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8E939B]" />
                                    <select
                                        value={form.category}
                                        onChange={e => setForm({ ...form, category: e.target.value })}
                                        className="w-full bg-[#050505] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white text-sm outline-none focus:border-[#FF2A6D] transition-all appearance-none"
                                        required
                                    >
                                        <option value="">Select Category...</option>
                                        {categories.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Amount & Date */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] text-[#8E939B] uppercase tracking-[0.2em] font-bold block">Amount (₹) *</label>
                                    <div className="relative">
                                        <IndianRupee className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8E939B]" />
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0.01"
                                            value={form.amount}
                                            onChange={e => setForm({ ...form, amount: e.target.value })}
                                            placeholder="0.00"
                                            className="w-full bg-[#050505] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white text-sm outline-none focus:border-[#FF2A6D] transition-all font-mono"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] text-[#8E939B] uppercase tracking-[0.2em] font-bold block">Date *</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8E939B]" />
                                        <input
                                            type="date"
                                            value={form.date}
                                            onChange={e => setForm({ ...form, date: e.target.value })}
                                            className="w-full bg-[#050505] border border-white/10 rounded-xl py-3 pl-10 pr-3 text-white text-sm outline-none focus:border-[#FF2A6D] transition-all font-mono"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Description */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] text-[#8E939B] uppercase tracking-[0.2em] font-bold block">Description</label>
                                <div className="relative">
                                    <FileText className="absolute left-3.5 top-3 w-4 h-4 text-[#8E939B]" />
                                    <textarea
                                        rows={3}
                                        value={form.description}
                                        onChange={e => setForm({ ...form, description: e.target.value })}
                                        placeholder="What was this expense for? (Supplier, item, details...)"
                                        className="w-full bg-[#050505] border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white text-sm outline-none focus:border-[#FF2A6D] transition-all resize-none"
                                    />
                                </div>
                            </div>

                            {/* Receipt Image Upload */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] text-[#8E939B] uppercase tracking-[0.2em] font-bold block">Receipt Image (Optional)</label>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />

                                {receiptPreview ? (
                                    <div className="relative rounded-2xl overflow-hidden border border-white/10 group">
                                        <img src={receiptPreview} alt="Receipt preview" className="w-full h-40 object-cover" />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                className="px-3 py-1.5 bg-white/20 text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-white/30 transition"
                                            >
                                                Change
                                            </button>
                                            <button
                                                type="button"
                                                onClick={clearFile}
                                                className="p-1.5 bg-[#FF2A6D]/80 text-white rounded-lg hover:bg-[#FF2A6D] transition"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full border border-dashed border-white/20 hover:border-[#FF2A6D] rounded-2xl p-6 flex flex-col items-center justify-center gap-2 transition-all bg-[#050505]/50 group"
                                    >
                                        <Upload className="w-6 h-6 text-[#8E939B] group-hover:text-[#FF2A6D] transition-colors" />
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#8E939B] group-hover:text-white transition-colors">
                                            Click to upload receipt
                                        </span>
                                    </button>
                                )}
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-3.5 bg-gradient-to-r from-[#FF2A6D] to-[#01FFFF] text-slate-950 font-syncopate font-bold text-xs uppercase tracking-widest rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,42,109,0.3)] disabled:opacity-50"
                            >
                                {isSubmitting ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : editingExpense ? (
                                    <>
                                        <CheckCircle2 className="w-4 h-4" /> Update Expense
                                    </>
                                ) : (
                                    <>
                                        <PlusCircle className="w-4 h-4" /> Save Expense
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    {/* ── Table Column ────────────────────────────────────────── */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="flex items-center justify-between px-2">
                            <h2 className="font-syncopate font-bold text-sm text-white tracking-widest flex items-center gap-2 uppercase">
                                <Receipt className="w-4 h-4 text-[#01FFFF]" /> Expense Records
                            </h2>
                            <button
                                onClick={() => fetchExpenses()}
                                className="text-xs text-[#8E939B] hover:text-white transition flex items-center gap-1 font-mono uppercase"
                            >
                                <RefreshCw className="w-3.5 h-3.5" /> Refresh
                            </button>
                        </div>

                        <div className="bg-[#141518]/60 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
                            {isLoadingExpenses ? (
                                <div className="p-12 flex flex-col items-center justify-center gap-3">
                                    <Loader2 className="w-8 h-8 text-[#FF2A6D] animate-spin" />
                                    <p className="text-xs font-mono text-[#8E939B] uppercase tracking-widest">Loading expenses...</p>
                                </div>
                            ) : expenses.length === 0 ? (
                                <div className="p-12 text-center space-y-2">
                                    <Receipt className="w-10 h-10 text-white/10 mx-auto" />
                                    <p className="text-sm font-bold text-white/40">No Expenses Recorded</p>
                                    <p className="text-xs text-[#8E939B]">Use the form to record your first expense entry.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-white/5 bg-black/40">
                                                <th className="text-left px-6 py-4 text-[9px] font-bold uppercase tracking-[0.2em] text-[#8E939B]">Date</th>
                                                <th className="text-left px-6 py-4 text-[9px] font-bold uppercase tracking-[0.2em] text-[#8E939B]">Category</th>
                                                <th className="text-left px-6 py-4 text-[9px] font-bold uppercase tracking-[0.2em] text-[#8E939B] hidden md:table-cell">Description</th>
                                                <th className="text-right px-6 py-4 text-[9px] font-bold uppercase tracking-[0.2em] text-[#8E939B]">Amount</th>
                                                <th className="text-center px-6 py-4 text-[9px] font-bold uppercase tracking-[0.2em] text-[#8E939B]">Receipt</th>
                                                <th className="text-center px-6 py-4 text-[9px] font-bold uppercase tracking-[0.2em] text-[#8E939B]">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {expenses.map((exp, i) => {
                                                const catName = typeof exp.category === 'object' && exp.category !== null ? exp.category.name : (exp.category_name || 'General');
                                                const receiptUrl = exp.receipt_image || exp.receipt;

                                                return (
                                                    <tr
                                                        key={exp.id}
                                                        className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors group"
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
                                                                    {catName}
                                                                </span>
                                                            </div>
                                                        </td>

                                                        <td className="px-6 py-4 hidden md:table-cell">
                                                            <p className="text-[#8E939B] text-xs truncate max-w-[180px]">
                                                                {exp.description || <span className="italic opacity-40">No description</span>}
                                                            </p>
                                                        </td>

                                                        <td className="px-6 py-4 text-right">
                                                            <span className="font-syncopate font-bold text-sm text-[#FF2A6D]">
                                                                ₹{parseFloat(exp.amount).toLocaleString('en-IN')}
                                                            </span>
                                                        </td>

                                                        <td className="px-6 py-4 text-center">
                                                            {receiptUrl ? (
                                                                <a
                                                                    href={receiptUrl}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-[#01FFFF] hover:text-white border border-[#01FFFF]/30 hover:border-white/30 px-2.5 py-1 rounded-lg transition-all shadow-sm"
                                                                >
                                                                    <img src={receiptUrl} alt="Receipt" className="w-4 h-4 object-cover rounded border border-[#01FFFF]/40" />
                                                                    <ImageIcon className="w-3 h-3" /> View
                                                                </a>
                                                            ) : (
                                                                <span className="text-[#8E939B]/40 text-[10px] italic">None</span>
                                                            )}
                                                        </td>

                                                        <td className="px-6 py-4 text-center">
                                                            <div className="flex items-center justify-center gap-2">
                                                                <button
                                                                    onClick={() => startEditing(exp)}
                                                                    className="p-1.5 rounded-lg bg-white/5 hover:bg-[#01FFFF]/20 text-[#8E939B] hover:text-[#01FFFF] transition-all"
                                                                    title="Edit expense"
                                                                >
                                                                    <Pencil className="w-3.5 h-3.5" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDelete(exp.id)}
                                                                    className="p-1.5 rounded-lg bg-white/5 hover:bg-[#FF2A6D]/20 text-[#8E939B] hover:text-[#FF2A6D] transition-all"
                                                                    title="Delete expense"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
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
            ` }} />
        </div>
    );
}
