'use client';

import React, { useState } from 'react';
import { 
    Landmark, ArrowUpRight, ArrowDownRight, RefreshCw, Upload, 
    X, Eye, AlertCircle, Search, WalletCards, CheckCircle2, Clock, Camera
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Skeleton } from '@/components/ui/Skeleton';
import { useDashboard } from '@/components/admin/dashboard/context/DashboardContext';

const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export default function BankDepositTab() {
    const { financeState } = useDashboard();
    const { 
        bankSummary, 
        bankTransactions, 
        refetchBank, 
        isBankLoading 
    } = financeState;

    // 1. Transaction Type Toggle: 'DEPOSIT' | 'WITHDRAWAL'
    const [transactionType, setTransactionType] = useState<'DEPOSIT' | 'WITHDRAWAL'>('DEPOSIT');

    // 2. Deposit Form State (Simplified for Daily Card Savings Collection)
    const [depositForm, setDepositForm] = useState({
        amount: '',
        purpose: '',
        transaction_date: getTodayDate(),
    });
    const [depositSlipFile, setDepositSlipFile] = useState<File | null>(null);
    const [depositSlipPreview, setDepositSlipPreview] = useState<string | null>(null);
    const [isSubmittingDeposit, setIsSubmittingDeposit] = useState(false);

    // 3. Withdrawal Form State
    const [withdrawForm, setWithdrawForm] = useState({
        amount: '',
        bank_name: 'Primary Current A/c (Federal Bank)',
        purpose_category: 'Shop Expenses / Petty Cash',
        custom_purpose: '',
        reference_number: '',
        transaction_date: new Date().toISOString().slice(0, 16),
    });
    const [withdrawSlipFile, setWithdrawSlipFile] = useState<File | null>(null);
    const [withdrawSlipPreview, setWithdrawSlipPreview] = useState<string | null>(null);
    const [isSubmittingWithdraw, setIsSubmittingWithdraw] = useState(false);

    // 4. Ledger Filtering & Search
    const [bankFilter, setBankFilter] = useState<'ALL' | 'DEPOSIT' | 'WITHDRAWAL'>('ALL');
    const [bankSearch, setBankSearch] = useState('');

    // 5. Lightbox Modal
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);
    const [lightboxTitle, setLightboxTitle] = useState<string>('Bank Slip / Counterfoil Receipt');

    const safeBankTransactions = Array.isArray(bankTransactions) ? bankTransactions : [];
    const filteredBankTransactions = safeBankTransactions.filter((item: any) => {
        if (bankFilter !== 'ALL' && item.transaction_type !== bankFilter) return false;
        if (bankSearch.trim()) {
            const query = bankSearch.toLowerCase().trim();
            const matchPurpose = String(item.purpose || '').toLowerCase().includes(query);
            const matchBank = String(item.bank_name || '').toLowerCase().includes(query);
            const matchRef = String(item.reference_number || '').toLowerCase().includes(query);
            if (!matchPurpose && !matchBank && !matchRef) return false;
        }
        return true;
    });

    // Handle Deposit Submission
    const handleDepositSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const amt = parseFloat(depositForm.amount);
        if (isNaN(amt) || amt <= 0) {
            toast.error('Please enter a valid deposit amount greater than zero.');
            return;
        }

        if (!depositForm.transaction_date) {
            toast.error('Please select a valid deposit date.');
            return;
        }

        setIsSubmittingDeposit(true);
        try {
            const depositDateIso = depositForm.transaction_date
                ? new Date(depositForm.transaction_date + 'T12:00:00.000Z').toISOString()
                : new Date().toISOString();

            let res: Response;
            if (depositSlipFile) {
                const formData = new FormData();
                formData.append('amount', String(amt));
                formData.append('transaction_type', 'DEPOSIT');
                formData.append('bank_name', 'Daily Savings Account');
                formData.append('purpose', depositForm.purpose.trim() || 'Daily Card Savings Collection');
                formData.append('transaction_date', depositDateIso);
                formData.append('receipt_image', depositSlipFile);

                res = await fetch('/api/finance/bank/deposit', {
                    method: 'POST',
                    body: formData,
                });
            } else {
                res = await fetch('/api/finance/bank/deposit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        amount: Number(amt),
                        transaction_date: depositDateIso,
                        bank_name: 'Daily Savings Account',
                        purpose: depositForm.purpose.trim() || 'Daily Card Savings Collection',
                        reference_number: null,
                        receipt_image: null,
                    }),
                });
            }

            const data = await res.json();
            if (res.ok && data.success) {
                toast.success(data.message || `Deposit of ₹${amt.toLocaleString('en-IN')} saved to Daily Savings!`);
                setDepositForm({
                    amount: '',
                    purpose: '',
                    transaction_date: getTodayDate(),
                });
                setDepositSlipFile(null);
                setDepositSlipPreview(null);
                if (refetchBank) await refetchBank();
            } else {
                toast.error(data.error || 'Failed to record deposit');
            }
        } catch {
            toast.error('Network error recording deposit');
        } finally {
            setIsSubmittingDeposit(false);
        }
    };

    // Handle Withdrawal Submission
    const handleWithdrawSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const amt = parseFloat(withdrawForm.amount);
        if (isNaN(amt) || amt <= 0) {
            toast.error('Please enter a valid withdrawal amount greater than zero.');
            return;
        }

        const purpose = withdrawForm.purpose_category === 'Other'
            ? (withdrawForm.custom_purpose.trim() || 'Other Cash Withdrawal')
            : withdrawForm.purpose_category;

        setIsSubmittingWithdraw(true);
        try {
            const formData = new FormData();
            formData.append('amount', String(amt));
            formData.append('transaction_type', 'WITHDRAWAL');
            formData.append('bank_name', withdrawForm.bank_name || 'Primary Current A/c (Federal Bank)');
            formData.append('purpose', purpose);
            if (withdrawForm.reference_number) formData.append('reference_number', withdrawForm.reference_number.trim());
            if (withdrawForm.transaction_date) formData.append('transaction_date', new Date(withdrawForm.transaction_date).toISOString());
            if (withdrawSlipFile) formData.append('receipt_image', withdrawSlipFile);

            const res = await fetch('/api/finance/bank/withdraw', {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();
            if (res.ok && data.success) {
                toast.success(data.message || `Withdrawal of ₹${amt.toLocaleString('en-IN')} recorded successfully!`);
                setWithdrawForm({
                    amount: '',
                    bank_name: 'Primary Current A/c (Federal Bank)',
                    purpose_category: 'Shop Expenses / Petty Cash',
                    custom_purpose: '',
                    reference_number: '',
                    transaction_date: new Date().toISOString().slice(0, 16),
                });
                setWithdrawSlipFile(null);
                setWithdrawSlipPreview(null);
                if (refetchBank) refetchBank();
            } else {
                toast.error(data.error || 'Failed to record withdrawal');
            }
        } catch {
            toast.error('Network error recording withdrawal');
        } finally {
            setIsSubmittingWithdraw(false);
        }
    };

    const currentBalance = Number(bankSummary?.current_balance || 0);
    const totalDeposited = Number(bankSummary?.total_deposited || 0);
    const totalWithdrawn = Number(bankSummary?.total_withdrawn || 0);

    const isOverdraftWarning = transactionType === 'WITHDRAWAL' && parseFloat(withdrawForm.amount || '0') > currentBalance;

    return (
        <div className="animate-[fadeIn_0.5s_ease-out] space-y-8">
            {/* TAB HEADER */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-6">
                <div>
                    <h3 className="font-syncopate font-bold tracking-widest text-xl sm:text-2xl text-white flex items-center gap-3">
                        <Landmark className="w-6 h-6 text-purple-400" /> BANK DEPOSITS & CASH WITHDRAWALS
                    </h3>
                    <p className="text-[10px] sm:text-xs text-[#8E939B] uppercase tracking-[0.2em] mt-1">
                        Daily reserved asset savings, withdrawals & real-time net bank balance
                    </p>
                </div>

                <button
                    onClick={() => refetchBank && refetchBank()}
                    className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold uppercase tracking-widest px-4 py-2.5 rounded-xl transition-all text-neutral-300 hover:text-white active:scale-95 touch-manipulation"
                    title="Refresh Bank Ledger"
                >
                    <RefreshCw className={`w-4 h-4 ${isBankLoading ? 'animate-spin' : ''}`} /> Refresh Data
                </button>
            </div>

            {/* 3. LIVE NET BALANCE SUMMARY BAR (3 CLEAR METRIC BOXES) */}
            {isBankLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Skeleton className="h-32 rounded-3xl" />
                    <Skeleton className="h-32 rounded-3xl" />
                    <Skeleton className="h-32 rounded-3xl" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Box 1: Total Deposited */}
                    <div className="bg-[#121316] border border-neutral-800/80 p-6 rounded-3xl relative overflow-hidden group hover:border-emerald-500/40 transition shadow-[0_0_30px_rgba(16,185,129,0.06)]">
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <span className="text-[10px] font-mono tracking-widest uppercase font-bold text-neutral-400 block">
                                    Total Deposited
                                </span>
                                <span className="text-[11px] font-sans text-neutral-400">
                                    ആകെ നിക്ഷേപിച്ചത്
                                </span>
                            </div>
                            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20">
                                <ArrowUpRight className="w-5 h-5" />
                            </div>
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-syncopate font-bold text-white tracking-tight mt-1">
                            ₹{totalDeposited.toLocaleString('en-IN')}
                        </h2>
                        <p className="text-[10px] font-mono text-neutral-500 mt-2">
                            Total cash banked into reserves to date
                        </p>
                    </div>

                    {/* Box 2: Total Withdrawn */}
                    <div className="bg-[#121316] border border-neutral-800/80 p-6 rounded-3xl relative overflow-hidden group hover:border-rose-500/40 transition shadow-[0_0_30px_rgba(244,63,94,0.06)]">
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <span className="text-[10px] font-mono tracking-widest uppercase font-bold text-neutral-400 block">
                                    Total Withdrawn
                                </span>
                                <span className="text-[11px] font-sans text-neutral-400">
                                    ആകെ പിൻവലിച്ചത്
                                </span>
                            </div>
                            <div className="p-2.5 bg-rose-500/10 text-rose-400 rounded-2xl border border-rose-500/20">
                                <ArrowDownRight className="w-5 h-5" />
                            </div>
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-syncopate font-bold text-rose-400 tracking-tight mt-1">
                            ₹{totalWithdrawn.toLocaleString('en-IN')}
                        </h2>
                        <p className="text-[10px] font-mono text-neutral-500 mt-2">
                            Total cash outflows for shop & expenses
                        </p>
                    </div>

                    {/* Box 3: Current Bank Balance (Hero Highlighted Card) */}
                    <div className={`p-6 rounded-3xl border transition-all relative overflow-hidden group ${
                        currentBalance >= 0
                            ? 'bg-emerald-950/20 border-emerald-500/40 shadow-[0_0_40px_rgba(16,185,129,0.15)]'
                            : 'bg-rose-950/20 border-rose-500/40 shadow-[0_0_40px_rgba(244,63,94,0.15)]'
                    }`}>
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <span className="text-[10px] font-mono tracking-widest uppercase font-bold text-neutral-300 block">
                                    Current Bank Balance
                                </span>
                                <span className="text-[11px] font-sans text-neutral-400">
                                    ഇപ്പോഴത്തെ ബാങ്ക് ബാലൻസ്
                                </span>
                            </div>
                            <div className={`p-2.5 rounded-2xl ${
                                currentBalance >= 0 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            }`}>
                                <Landmark className="w-5 h-5" />
                            </div>
                        </div>
                        <h2 className={`text-2xl sm:text-3xl font-syncopate font-bold tracking-tight mt-1 ${
                            currentBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                            ₹{currentBalance.toLocaleString('en-IN')}
                        </h2>
                        <p className="text-[10px] font-mono text-neutral-400 mt-2 flex items-center gap-1.5">
                            {currentBalance >= 0 ? '🟢 Available Operating Funds' : '🔴 Overdrawn Reserve (Negative)'}
                        </p>
                    </div>
                </div>
            )}

            {/* 1 & 2. DIRECT IN-PAGE TRANSACTION FORM WITH SEGMENTED CONTROL */}
            <div className="bg-[#0a0a0d] border border-white/10 p-6 sm:p-8 rounded-3xl shadow-[4px_4px_12px_#020203,-4px_-4px_12px_#14151a]">
                {/* 1. TRANSACTION TYPE SELECTOR (SEGMENTED CONTROL TOGGLE) */}
                <div className="flex flex-col items-center mb-6">
                    <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-400 mb-2">
                        Select Transaction Operation / ഇടപാട് തിരഞ്ഞെടുക്കുക
                    </span>
                    <div className="grid grid-cols-2 gap-2 bg-black/60 p-1.5 rounded-2xl border border-white/10 w-full max-w-lg">
                        <button
                            type="button"
                            onClick={() => setTransactionType('DEPOSIT')}
                            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold font-mono transition-all ${
                                transactionType === 'DEPOSIT'
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                                    : 'text-neutral-400 hover:text-white hover:bg-white/5 border border-transparent'
                            }`}
                        >
                            <span className="text-base">🟢</span>
                            <span>Deposit Cash</span>
                            <span className="text-[11px] opacity-80 hidden sm:inline">(ബാങ്കിൽ ഇട്ടത്)</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setTransactionType('WITHDRAWAL')}
                            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold font-mono transition-all ${
                                transactionType === 'WITHDRAWAL'
                                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.2)]'
                                    : 'text-neutral-400 hover:text-white hover:bg-white/5 border border-transparent'
                            }`}
                        >
                            <span className="text-base">🔴</span>
                            <span>Withdraw Cash</span>
                            <span className="text-[11px] opacity-80 hidden sm:inline">(ബാങ്കിൽ നിന്ന് എടുത്തത്)</span>
                        </button>
                    </div>
                </div>

                {/* OVERDRAFT WARNING BANNER (When Withdrawal Amount > Balance) */}
                {isOverdraftWarning && (
                    <div className="p-4 bg-rose-950/40 border border-rose-500/50 rounded-2xl flex items-start gap-3 mb-6 animate-[fadeIn_0.2s_ease-out]">
                        <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                        <div className="text-xs text-rose-200">
                            <p className="font-bold text-sm">⚠️ Amount exceeds current bank balance / അമിത പിൻവലിക്കൽ മുന്നറിയിപ്പ്</p>
                            <p className="text-[12px] text-rose-300 mt-1 font-mono">
                                Withdrawal of ₹{Number(withdrawForm.amount || 0).toLocaleString('en-IN')} exceeds current recorded bank balance (₹{currentBalance.toLocaleString('en-IN')}). Proceeding will result in an overdrawn negative balance.
                            </p>
                        </div>
                    </div>
                )}

                {/* 2. DYNAMIC FORM FIELDS */}
                {transactionType === 'DEPOSIT' ? (
                    /* DEPOSIT FORM - Simplified for Shop Daily Savings Collection */
                    <form onSubmit={handleDepositSubmit} className="space-y-6">
                        {/* Daily Savings Account Banner */}
                        <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                                    <WalletCards className="w-5 h-5" />
                                </div>
                                <div>
                                    <span className="text-xs sm:text-sm font-bold text-white block">
                                        Daily Card Savings Collection (പ്രതിദിന സേവിങ്സ് കളക്ഷൻ)
                                    </span>
                                    <span className="text-[11px] text-neutral-400">
                                        Amount collected daily by agent and marked manually on physical passbook / card
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-black/50 rounded-xl border border-white/5 text-[11px] font-mono">
                                <span className="text-neutral-400">Target Account:</span>
                                <strong className="text-emerald-400 font-semibold">Daily Savings Account</strong>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {/* 1. Deposit Amount (₹) - MANDATORY */}
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                                        Deposit Amount (₹) *
                                    </label>
                                    {depositForm.amount && (
                                        <button
                                            type="button"
                                            onClick={() => setDepositForm(prev => ({ ...prev, amount: '' }))}
                                            className="text-[10px] font-mono text-neutral-400 hover:text-rose-400 transition"
                                        >
                                            Clear
                                        </button>
                                    )}
                                </div>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400 font-bold text-base font-mono">₹</span>
                                    <input
                                        type="number"
                                        min="1"
                                        step="any"
                                        required
                                        placeholder="e.g. 100, 200"
                                        value={depositForm.amount}
                                        onChange={(e) => setDepositForm({ ...depositForm, amount: e.target.value })}
                                        className="w-full bg-[#141518] border border-emerald-500/30 focus:border-emerald-400 rounded-2xl py-3.5 pl-10 pr-4 text-sm font-mono font-bold text-white outline-none transition-all placeholder:text-[#8E939B]/50"
                                    />
                                </div>
                                {/* Fast 1-click entry chips: +₹100, +₹200, +₹500, +₹1,000 */}
                                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                                    <span className="text-[10px] text-neutral-400 font-mono mr-1">Quick:</span>
                                    {[100, 200, 500, 1000].map((quickAmt) => {
                                        const isSelected = depositForm.amount === String(quickAmt);
                                        return (
                                            <button
                                                key={quickAmt}
                                                type="button"
                                                onClick={() => setDepositForm(prev => ({ ...prev, amount: String(quickAmt) }))}
                                                className={`px-3 py-1 rounded-xl text-xs font-mono font-bold transition-all active:scale-95 ${
                                                    isSelected
                                                        ? 'bg-emerald-500 text-black shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                                                        : 'bg-white/5 hover:bg-emerald-500/20 text-neutral-300 hover:text-emerald-300 border border-white/5 hover:border-emerald-500/30'
                                                }`}
                                            >
                                                +₹{quickAmt.toLocaleString('en-IN')}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* 2. Deposit Date - MANDATORY */}
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-emerald-400 mb-2">
                                    Deposit Date *
                                </label>
                                <div className="relative">
                                    <input
                                        type="date"
                                        required
                                        value={depositForm.transaction_date}
                                        onChange={(e) => setDepositForm({ ...depositForm, transaction_date: e.target.value })}
                                        className="w-full bg-[#141518] border border-white/10 focus:border-emerald-400 rounded-2xl py-3.5 px-4 text-xs font-mono text-white outline-none transition-all cursor-pointer"
                                    />
                                </div>
                                <span className="text-[10px] text-neutral-400 mt-2 block font-mono">
                                    Defaults to today&apos;s collection date (ഇന്നത്തെ തീയതി)
                                </span>
                            </div>

                            {/* 3. Notes / Remarks - OPTIONAL */}
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2">
                                    Notes / Remarks (Optional)
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Collected by agent, Evening collection"
                                    value={depositForm.purpose}
                                    onChange={(e) => setDepositForm({ ...depositForm, purpose: e.target.value })}
                                    className="w-full bg-[#141518] border border-white/10 focus:border-emerald-400 rounded-2xl py-3.5 px-4 text-xs text-white outline-none transition-all placeholder:text-[#8E939B]/50"
                                />
                                <span className="text-[10px] text-neutral-400 mt-2 block font-mono">
                                    Collection timing, agent remarks or shift notes
                                </span>
                            </div>

                            {/* 4. Card / Passbook Photo Upload - OPTIONAL */}
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2">
                                    Card / Passbook Photo (Optional)
                                </label>
                                {depositSlipPreview ? (
                                    <div className="flex items-center gap-3 bg-black/50 border border-emerald-500/30 rounded-2xl p-2.5">
                                        <img src={depositSlipPreview} alt="Passbook" className="w-10 h-10 object-cover rounded-xl border border-white/10" />
                                        <div className="flex-1 min-w-0">
                                            <span className="text-[11px] text-emerald-400 font-mono block truncate">{depositSlipFile?.name || 'Card photo attached'}</span>
                                            <span className="text-[9px] text-neutral-400">Marked passbook/card image</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => { setDepositSlipFile(null); setDepositSlipPreview(null); }}
                                            className="p-1.5 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white"
                                            title="Remove photo"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <label className="flex items-center justify-center gap-2 py-3 px-4 border border-dashed border-white/15 hover:border-emerald-500/50 rounded-2xl cursor-pointer bg-[#141518] hover:bg-emerald-500/5 transition text-neutral-400 hover:text-emerald-300">
                                        <Camera className="w-4 h-4 text-neutral-400" />
                                        <span className="text-xs">Take / Attach Passbook Photo</span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            capture="environment"
                                            className="hidden"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    setDepositSlipFile(file);
                                                    setDepositSlipPreview(URL.createObjectURL(file));
                                                }
                                            }}
                                        />
                                    </label>
                                )}
                                <span className="text-[10px] text-neutral-400 mt-2 block font-mono">
                                    Optional snapshot of card marked by collection agent (ഫോട്ടോ)
                                </span>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className="flex justify-end pt-2">
                            <button
                                type="submit"
                                disabled={isSubmittingDeposit}
                                className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs uppercase tracking-widest px-8 py-4 rounded-2xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isSubmittingDeposit ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        <span>Saving Deposit...</span>
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="w-4 h-4" />
                                        <span>Save Deposit (ഡെപ്പോസിറ്റ് ചെയ്യുക)</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                ) : (
                    /* WITHDRAWAL FORM */
                    <form onSubmit={handleWithdrawSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            {/* Withdrawal Amount Input */}
                            <div className="md:col-span-1">
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-rose-400 mb-2">
                                    Withdrawal Amount (₹) *
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-rose-400 font-bold text-base font-mono">₹</span>
                                    <input
                                        type="number"
                                        min="1"
                                        step="any"
                                        required
                                        placeholder="0.00"
                                        value={withdrawForm.amount}
                                        onChange={(e) => setWithdrawForm({ ...withdrawForm, amount: e.target.value })}
                                        className="w-full bg-[#141518] border border-rose-500/30 focus:border-rose-400 rounded-2xl py-3.5 pl-10 pr-4 text-sm font-mono font-bold text-white outline-none transition-all placeholder:text-[#8E939B]/50"
                                    />
                                </div>
                            </div>

                            {/* Bank Account Dropdown */}
                            <div className="md:col-span-1">
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2">
                                    Withdraw From Account *
                                </label>
                                <select
                                    value={withdrawForm.bank_name}
                                    onChange={(e) => setWithdrawForm({ ...withdrawForm, bank_name: e.target.value })}
                                    className="w-full bg-[#141518] border border-white/10 focus:border-rose-400 rounded-2xl py-3.5 px-4 text-xs font-mono text-white outline-none transition-all"
                                >
                                    <option value="Daily Savings Account">Daily Savings Account (പ്രതിദിന സേവിങ്സ്)</option>
                                    <option value="Primary Current A/c (Federal Bank)">Primary Current A/c (Federal Bank)</option>
                                    <option value="SBI Current A/c">SBI Current A/c</option>
                                    <option value="HDFC Bank A/c">HDFC Bank A/c</option>
                                    <option value="Canara Bank A/c">Canara Bank A/c</option>
                                    <option value="ATM Cash Withdrawal">ATM Cash Withdrawal</option>
                                </select>
                            </div>

                            {/* Purpose Category Dropdown */}
                            <div className="md:col-span-1">
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2">
                                    Purpose / Reason *
                                </label>
                                <select
                                    value={withdrawForm.purpose_category}
                                    onChange={(e) => setWithdrawForm({ ...withdrawForm, purpose_category: e.target.value })}
                                    className="w-full bg-[#141518] border border-white/10 focus:border-rose-400 rounded-2xl py-3.5 px-4 text-xs font-mono text-white outline-none transition-all"
                                >
                                    <option value="Shop Expenses / Petty Cash">Shop Expenses / Petty Cash (ചില്ലറ ചിലവുകൾ)</option>
                                    <option value="Chemical Purchase">Chemical Purchase (കെമിക്കൽ സ്റ്റോക്ക്)</option>
                                    <option value="Staff Salary/Advance">Staff Salary/Advance (ശമ്പളം / അഡ്വാൻസ്)</option>
                                    <option value="Owner Withdrawal">Owner Withdrawal (ഉടമ പിൻവലിക്കൽ)</option>
                                    <option value="Machine Repair">Machine Repair (മെഷീൻ റിപ്പയർ)</option>
                                    <option value="Other">Other (മറ്റുള്ളവ)</option>
                                </select>
                            </div>

                            {/* If "Other" chosen, custom purpose input */}
                            {withdrawForm.purpose_category === 'Other' && (
                                <div className="md:col-span-3">
                                    <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2">
                                        Specify Purpose / കാരണം വ്യക്തമാക്കുക *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Specify purpose of withdrawal..."
                                        value={withdrawForm.custom_purpose}
                                        onChange={(e) => setWithdrawForm({ ...withdrawForm, custom_purpose: e.target.value })}
                                        className="w-full bg-[#141518] border border-rose-500/30 focus:border-rose-400 rounded-2xl py-3 px-4 text-xs text-white outline-none transition-all placeholder:text-[#8E939B]/50"
                                    />
                                </div>
                            )}

                            {/* Date & Time */}
                            <div className="md:col-span-1">
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2">
                                    Date &amp; Time *
                                </label>
                                <input
                                    type="datetime-local"
                                    required
                                    value={withdrawForm.transaction_date}
                                    onChange={(e) => setWithdrawForm({ ...withdrawForm, transaction_date: e.target.value })}
                                    className="w-full bg-[#141518] border border-white/10 focus:border-rose-400 rounded-2xl py-3.5 px-4 text-xs font-mono text-white outline-none transition-all"
                                />
                            </div>

                            {/* Cheque / ATM Ref */}
                            <div className="md:col-span-1">
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2">
                                    Cheque / ATM Slip / Ref Number
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. CHQ-88219 or ATM Ref"
                                    value={withdrawForm.reference_number}
                                    onChange={(e) => setWithdrawForm({ ...withdrawForm, reference_number: e.target.value })}
                                    className="w-full bg-[#141518] border border-white/10 focus:border-rose-400 rounded-2xl py-3.5 px-4 text-xs font-mono text-white outline-none transition-all placeholder:text-[#8E939B]/50"
                                />
                            </div>

                            {/* Slip Upload (Optional) */}
                            <div className="md:col-span-1">
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2">
                                    Upload Receipt / Slip (Optional)
                                </label>
                                {withdrawSlipPreview ? (
                                    <div className="flex items-center gap-3 bg-black/50 border border-rose-500/30 rounded-2xl p-2">
                                        <img src={withdrawSlipPreview} alt="Slip" className="w-10 h-10 object-cover rounded-xl border border-white/10" />
                                        <span className="text-[11px] text-rose-400 font-mono flex-1 truncate">{withdrawSlipFile?.name}</span>
                                        <button
                                            type="button"
                                            onClick={() => { setWithdrawSlipFile(null); setWithdrawSlipPreview(null); }}
                                            className="p-1 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <label className="flex items-center justify-center gap-2 py-3 px-4 border border-dashed border-white/15 hover:border-rose-500/50 rounded-2xl cursor-pointer bg-[#141518] hover:bg-rose-500/5 transition text-neutral-400 hover:text-rose-300">
                                        <Upload className="w-4 h-4 text-neutral-500" />
                                        <span className="text-xs">Attach Receipt / Slip</span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    setWithdrawSlipFile(file);
                                                    setWithdrawSlipPreview(URL.createObjectURL(file));
                                                }
                                            }}
                                        />
                                    </label>
                                )}
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className="flex justify-end pt-2">
                            <button
                                type="submit"
                                disabled={isSubmittingWithdraw}
                                className="w-full sm:w-auto bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs uppercase tracking-widest px-8 py-4 rounded-2xl transition-all shadow-[0_0_20px_rgba(244,63,94,0.3)] active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isSubmittingWithdraw ? (
                                    <>Processing...</>
                                ) : (
                                    <>
                                        <CheckCircle2 className="w-4 h-4" /> Record Withdrawal
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>

            {/* 4. UNIFIED BANK LEDGER TABLE (BELOW THE FORM) */}
            <div className="bg-[#0a0a0d] border border-white/10 p-6 sm:p-8 rounded-3xl shadow-[4px_4px_12px_#020203,-4px_-4px_12px_#14151a] space-y-5">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-4">
                    <div>
                        <h4 className="font-syncopate font-bold text-sm tracking-widest text-white uppercase flex items-center gap-2">
                            <Clock className="w-4 h-4 text-purple-400" /> UNIFIED BANK TRANSACTION LEDGER
                        </h4>
                        <p className="text-[10px] text-[#8E939B] uppercase tracking-wider mt-0.5">
                            Combined history of cash deposits and cash withdrawals
                        </p>
                    </div>

                    {/* Filter Tabs & Search Bar */}
                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                        <div className="flex items-center gap-1 bg-black/60 p-1 rounded-xl border border-white/5">
                            <button
                                onClick={() => setBankFilter('ALL')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition ${
                                    bankFilter === 'ALL' ? 'bg-white/10 text-white' : 'text-neutral-400 hover:text-white'
                                }`}
                            >
                                All ({safeBankTransactions.length})
                            </button>
                            <button
                                onClick={() => setBankFilter('DEPOSIT')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition ${
                                    bankFilter === 'DEPOSIT' ? 'bg-emerald-500/20 text-emerald-300' : 'text-neutral-400 hover:text-white'
                                }`}
                            >
                                Deposits
                            </button>
                            <button
                                onClick={() => setBankFilter('WITHDRAWAL')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition ${
                                    bankFilter === 'WITHDRAWAL' ? 'bg-rose-500/20 text-rose-300' : 'text-neutral-400 hover:text-white'
                                }`}
                            >
                                Withdrawals
                            </button>
                        </div>

                        {/* Search Input */}
                        <div className="relative flex-1 sm:w-56">
                            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                            <input
                                type="text"
                                placeholder="Search purpose, ref #..."
                                value={bankSearch}
                                onChange={(e) => setBankSearch(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:border-purple-400 focus:outline-none font-mono"
                            />
                        </div>
                    </div>
                </div>

                {isBankLoading ? (
                    <div className="space-y-3">
                        <Skeleton className="w-full h-12 rounded-xl" />
                        <Skeleton className="w-full h-12 rounded-xl" />
                        <Skeleton className="w-full h-12 rounded-xl" />
                    </div>
                ) : filteredBankTransactions.length === 0 ? (
                    <div className="text-center py-12 text-[#8E939B] text-xs">
                        <WalletCards className="w-10 h-10 text-white/10 mx-auto mb-3" />
                        <p className="font-bold">No transactions match your filter.</p>
                        <p className="text-[10px] mt-1 text-white/40">Record your first cash deposit or withdrawal using the form above.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-2xl border border-white/5 bg-black/30">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-[#141518] text-[#8E939B] text-[10px] uppercase tracking-widest border-b border-white/5">
                                <tr>
                                    <th className="p-4 pl-6">Date &amp; Time</th>
                                    <th className="p-4">Type</th>
                                    <th className="p-4">Bank Account</th>
                                    <th className="p-4">Amount</th>
                                    <th className="p-4">Purpose / Category</th>
                                    <th className="p-4">Reference #</th>
                                    <th className="p-4">Slip / Proof</th>
                                    <th className="p-4 text-right pr-6">Recorded By</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 font-sans">
                                {filteredBankTransactions.map((item: any) => {
                                    const isDeposit = item.transaction_type === 'DEPOSIT';
                                    const rawSlip = item.receipt_image;
                                    const slipUrl = rawSlip ? (rawSlip.startsWith('http') || rawSlip.startsWith('data:') ? rawSlip : `${rawSlip.startsWith('/') ? '' : '/'}${rawSlip}`) : null;
                                    const dateFormatted = item.transaction_date 
                                        ? new Date(item.transaction_date).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                                        : (item.date || 'N/A');

                                    return (
                                        <tr key={item.id} className="hover:bg-white/5 transition-colors">
                                            <td className="p-4 pl-6 font-mono text-xs text-[#8E939B] whitespace-nowrap">
                                                {dateFormatted}
                                            </td>
                                            <td className="p-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                    isDeposit 
                                                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                                                        : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                                                }`}>
                                                    {isDeposit ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                                    {item.transaction_type}
                                                </span>
                                            </td>
                                            <td className="p-4 font-medium text-white text-xs whitespace-nowrap">
                                                <span className="bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
                                                    {item.bank_name || 'Primary Bank Account'}
                                                </span>
                                            </td>
                                            <td className={`p-4 font-mono font-bold text-sm whitespace-nowrap ${
                                                isDeposit ? 'text-emerald-400' : 'text-rose-400'
                                            }`}>
                                                {isDeposit ? `+₹${Number(item.amount || 0).toLocaleString('en-IN')}` : `-₹${Number(item.amount || 0).toLocaleString('en-IN')}`}
                                            </td>
                                            <td className="p-4 text-gray-200 text-xs max-w-[240px] truncate" title={item.purpose}>
                                                {item.purpose || '—'}
                                            </td>
                                            <td className="p-4 font-mono text-xs text-neutral-400 whitespace-nowrap">
                                                {item.reference_number ? (
                                                    <span className="bg-white/5 px-2 py-0.5 rounded border border-white/10">
                                                        {item.reference_number}
                                                    </span>
                                                ) : (
                                                    <span className="text-neutral-600">—</span>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                {slipUrl ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => { setLightboxImage(slipUrl); setLightboxTitle('Bank Slip / Counterfoil Receipt'); }}
                                                        className="w-10 h-10 rounded-lg overflow-hidden border border-[#01FFFF]/40 hover:border-[#01FFFF] hover:scale-110 transition-all block relative shadow-md group"
                                                        title="View counterfoil / slip receipt"
                                                    >
                                                        <img
                                                            src={slipUrl}
                                                            alt="Slip"
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                        />
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[#01FFFF]">
                                                            <Eye className="w-4 h-4" />
                                                        </div>
                                                    </button>
                                                ) : (
                                                    <span className="text-[10px] text-neutral-600 font-mono uppercase">
                                                        No Slip
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4 text-right pr-6 font-mono text-xs text-neutral-400 whitespace-nowrap">
                                                {item.recorded_by_name || 'Admin Manager'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* LIGHTBOX MODAL FOR FULL-RESOLUTION SLIP RECEIPT */}
            {lightboxImage && (
                <div
                    className="fixed inset-0 z-50 bg-black/90 backdrop-blur-2xl flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]"
                    onClick={() => setLightboxImage(null)}
                >
                    <div className="relative max-w-4xl w-full max-h-[90vh] bg-[#0d0e12] border border-white/10 rounded-3xl overflow-hidden p-4 shadow-[0_0_80px_rgba(1,255,255,0.2)] flex flex-col items-center">
                        <div className="w-full flex justify-between items-center pb-3 mb-3 border-b border-white/10">
                            <h4 className="font-syncopate font-bold text-xs text-[#01FFFF] tracking-widest uppercase">
                                {lightboxTitle}
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
