'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Landmark, Calendar, TrendingUp, PlusCircle, Clock, User, CheckCircle2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { Skeleton } from '@/components/ui/Skeleton';
import { getApiBaseUrl } from '@/lib/api';

const API_BASE = getApiBaseUrl();

interface BankDepositEntry {
    id: number;
    date: string;
    amount: number | string;
    notes?: string;
    recorded_by_name?: string;
    created_at?: string;
}

interface BankDepositData {
    total_all_time: number;
    total_this_month: number;
    total_this_week: number;
    history: BankDepositEntry[];
}

export default function BankDepositTab() {
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [depositData, setDepositData] = useState<BankDepositData>({
        total_all_time: 0,
        total_this_month: 0,
        total_this_week: 0,
        history: [],
    });

    const [form, setForm] = useState({
        amount: '',
        date: new Date().toISOString().split('T')[0],
        notes: '',
    });

    const fetchBankDeposits = useCallback(async () => {
        const token = localStorage.getItem('auth_token');
        if (!token) return;

        try {
            const res = await fetch(`${API_BASE}/finance/bank-deposits/`, {
                headers: {
                    'Authorization': `Token ${token}`,
                    'Content-Type': 'application/json',
                },
            });
            if (res.ok) {
                const data = await res.json();
                setDepositData(data);
            } else {
                toast.error('Failed to load bank deposit data.');
            }
        } catch (error) {
            toast.error('Network error loading bank deposits.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchBankDeposits();
    }, [fetchBankDeposits]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) < 0) {
            toast.error('Please enter a valid deposit amount.');
            return;
        }

        setIsSubmitting(true);
        const token = localStorage.getItem('auth_token');

        try {
            const res = await fetch(`${API_BASE}/finance/bank-deposits/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Token ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    amount: parseFloat(form.amount),
                    date: form.date,
                    notes: form.notes || 'Daily Reserved Savings Deposit',
                }),
            });

            const data = await res.json();
            if (res.ok) {
                toast.success(`Bank deposit of ₹${form.amount} recorded successfully!`);
                setForm({
                    amount: '',
                    date: new Date().toISOString().split('T')[0],
                    notes: '',
                });
                if (data.total_all_time !== undefined) {
                    setDepositData({
                        total_all_time: data.total_all_time,
                        total_this_month: data.total_this_month,
                        total_this_week: data.total_this_week,
                        history: data.history || [],
                    });
                } else {
                    fetchBankDeposits();
                }
            } else {
                toast.error(data.error || 'Failed to save deposit.');
            }
        } catch (error) {
            toast.error('Network error saving deposit.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="animate-[fadeIn_0.5s_ease-out] space-y-8">
            {/* TAB HEADER */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-6">
                <div>
                    <h3 className="font-syncopate font-bold tracking-widest text-xl sm:text-2xl text-white flex items-center gap-3">
                        <Landmark className="w-6 h-6 text-purple-400" /> BANK DEPOSITS & SAVINGS
                    </h3>
                    <p className="text-[10px] sm:text-xs text-[#8E939B] uppercase tracking-[0.2em] mt-1">
                        Daily reserved asset savings & accumulated bank balance ledger
                    </p>
                </div>

                <button
                    onClick={() => { setIsLoading(true); fetchBankDeposits(); }}
                    className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold uppercase tracking-widest px-4 py-2.5 rounded-xl transition-all text-neutral-300 hover:text-white"
                >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /> Refresh Data
                </button>
            </div>

            {/* TOP METRIC CARDS (REAL AGGREGATED DATA) */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Skeleton className="h-32 rounded-3xl" />
                    <Skeleton className="h-32 rounded-3xl" />
                    <Skeleton className="h-32 rounded-3xl" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Card 1: Total All Time */}
                    <div className="bg-[#141518]/70 backdrop-blur-xl border border-purple-500/30 p-6 rounded-3xl relative overflow-hidden group shadow-[0_0_30px_rgba(168,85,247,0.06)]">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-[40px] group-hover:bg-purple-500/20 transition-all" />
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                                <Landmark className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-purple-400 text-[10px] font-bold uppercase tracking-[0.2em]">Total Deposit</p>
                                <p className="text-[10px] text-[#8E939B] uppercase tracking-wider">All-time accumulated asset</p>
                            </div>
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-syncopate font-bold text-white tracking-tight mt-2">
                            ₹{(depositData.total_all_time || 0).toLocaleString()}
                        </h2>
                    </div>

                    {/* Card 2: This Month */}
                    <div className="bg-[#141518]/70 backdrop-blur-xl border border-cyan-500/30 p-6 rounded-3xl relative overflow-hidden group shadow-[0_0_30px_rgba(6,182,212,0.06)]">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-[40px] group-hover:bg-cyan-500/20 transition-all" />
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                                <Calendar className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-cyan-400 text-[10px] font-bold uppercase tracking-[0.2em]">This Month</p>
                                <p className="text-[10px] text-[#8E939B] uppercase tracking-wider">Current month deposits</p>
                            </div>
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-syncopate font-bold text-cyan-300 tracking-tight mt-2">
                            ₹{(depositData.total_this_month || 0).toLocaleString()}
                        </h2>
                    </div>

                    {/* Card 3: This Week */}
                    <div className="bg-[#141518]/70 backdrop-blur-xl border border-emerald-500/30 p-6 rounded-3xl relative overflow-hidden group shadow-[0_0_30px_rgba(16,185,129,0.06)]">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-[40px] group-hover:bg-emerald-500/20 transition-all" />
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                                <TrendingUp className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-[0.2em]">This Week</p>
                                <p className="text-[10px] text-[#8E939B] uppercase tracking-wider">Weekly reserve accumulation</p>
                            </div>
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-syncopate font-bold text-emerald-300 tracking-tight mt-2">
                            ₹{(depositData.total_this_week || 0).toLocaleString()}
                        </h2>
                    </div>
                </div>
            )}

            {/* ACTION AREA: RECORD NEW DEPOSIT FORM */}
            <div className="bg-[#0a0a0d] border border-purple-500/30 p-6 sm:p-8 rounded-3xl shadow-[4px_4px_12px_#020203,-4px_-4px_12px_#14151a]">
                <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
                    <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                        <PlusCircle className="w-5 h-5" />
                    </div>
                    <div>
                        <h4 className="font-syncopate font-bold text-sm tracking-widest text-white">RECORD NEW DEPOSIT</h4>
                        <p className="text-[10px] text-[#8E939B] uppercase tracking-wider">Save today or custom date savings to bank reserve</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                    {/* Amount Input */}
                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-purple-400 mb-2">
                            Deposit Amount (₹) *
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400 font-bold text-sm">₹</span>
                            <input
                                type="number"
                                min="0"
                                step="any"
                                required
                                placeholder="Enter amount (e.g. 100)"
                                value={form.amount}
                                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                                className="w-full bg-[#141518] border border-white/10 focus:border-purple-400 rounded-2xl py-3.5 pl-9 pr-4 text-sm font-mono font-bold text-white outline-none transition-all placeholder:text-[#8E939B]/50"
                            />
                        </div>
                    </div>

                    {/* Date Input */}
                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-cyan-400 mb-2">
                            Deposit Date *
                        </label>
                        <input
                            type="date"
                            required
                            value={form.date}
                            onChange={(e) => setForm({ ...form, date: e.target.value })}
                            className="w-full bg-[#141518] border border-white/10 focus:border-cyan-400 rounded-2xl py-3.5 px-4 text-sm font-mono text-white outline-none transition-all"
                        />
                    </div>

                    {/* Notes Input */}
                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-[#8E939B] mb-2">
                            Notes / Description (Optional)
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. Daily Reserve Savings"
                            value={form.notes}
                            onChange={(e) => setForm({ ...form, notes: e.target.value })}
                            className="w-full bg-[#141518] border border-white/10 focus:border-white/30 rounded-2xl py-3.5 px-4 text-sm text-white outline-none transition-all placeholder:text-[#8E939B]/50"
                        />
                    </div>

                    {/* Submit Button */}
                    <div className="md:col-span-3 flex justify-end pt-2">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full sm:w-auto bg-purple-500 hover:bg-purple-400 text-black font-bold text-xs uppercase tracking-widest px-8 py-4 rounded-2xl transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)] active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <>Processing...</>
                            ) : (
                                <>
                                    <CheckCircle2 className="w-4 h-4" /> Save Deposit
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>

            {/* DEPOSIT HISTORY TABLE */}
            <div className="bg-[#0a0a0d] border border-white/10 p-6 sm:p-8 rounded-3xl shadow-[4px_4px_12px_#020203,-4px_-4px_12px_#14151a]">
                <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-4">
                    <div>
                        <h4 className="font-syncopate font-bold text-sm tracking-widest text-white uppercase flex items-center gap-2">
                            <Clock className="w-4 h-4 text-purple-400" /> DEPOSIT HISTORY LOG
                        </h4>
                        <p className="text-[10px] text-[#8E939B] uppercase tracking-wider mt-0.5">
                            Chronological history of recorded savings deposits
                        </p>
                    </div>
                    <span className="text-xs font-mono font-bold text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
                        {depositData.history.length} Records
                    </span>
                </div>

                {isLoading ? (
                    <div className="space-y-3">
                        <Skeleton className="w-full h-12 rounded-xl" />
                        <Skeleton className="w-full h-12 rounded-xl" />
                        <Skeleton className="w-full h-12 rounded-xl" />
                    </div>
                ) : depositData.history.length === 0 ? (
                    <div className="text-center py-12 text-[#8E939B] text-xs">
                        <Landmark className="w-10 h-10 text-white/10 mx-auto mb-3" />
                        <p className="font-bold">No deposit records found in history.</p>
                        <p className="text-[10px] mt-1 text-white/40">Record your first daily deposit using the form above.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-[#141518] text-[#8E939B] text-[10px] uppercase tracking-widest border-b border-white/5">
                                <tr>
                                    <th className="p-4 pl-6">Date</th>
                                    <th className="p-4 font-bold text-purple-400">Amount</th>
                                    <th className="p-4">Notes / Description</th>
                                    <th className="p-4">Recorded By</th>
                                    <th className="p-4 text-right pr-6">Created At</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 font-grotesk">
                                {depositData.history.map((entry) => (
                                    <tr key={entry.id} className="hover:bg-white/5 transition-colors">
                                        <td className="p-4 pl-6 font-mono font-bold text-white">{entry.date}</td>
                                        <td className="p-4 font-syncopate font-bold text-emerald-400 text-sm">
                                            ₹{Number(entry.amount).toLocaleString()}
                                        </td>
                                        <td className="p-4 text-neutral-300">
                                            {entry.notes || 'Daily Reserved Savings Deposit'}
                                        </td>
                                        <td className="p-4 text-[#8E939B]">
                                            <div className="flex items-center gap-1.5">
                                                <User className="w-3.5 h-3.5 text-purple-400" />
                                                <span>{entry.recorded_by_name || 'System Admin'}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-right pr-6 font-mono text-[11px] text-[#8E939B]">
                                            {entry.created_at ? new Date(entry.created_at).toLocaleString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            }) : entry.date}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
