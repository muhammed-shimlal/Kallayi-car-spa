"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, CheckCircle, AlertCircle, X, Eye, Clock, ShieldCheck, Car, Calendar } from 'lucide-react';
import { Transaction } from './types';

interface LedgerTabProps {
    transactions: Transaction[];
    totalCredit?: number;
    totalSettled?: number;
    outstandingBalance?: number;
}

export function LedgerTab({ transactions, totalCredit, totalSettled, outstandingBalance }: LedgerTabProps) {
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);
    const [lightboxMetadata, setLightboxMetadata] = useState<{ plate?: string; service?: string; date?: string } | null>(null);
    const [filter, setFilter] = useState<'ALL' | 'CHARGE' | 'SETTLEMENT'>('ALL');

    const calculatedCredit = totalCredit ?? transactions
        .filter(t => t.transaction_type === 'CHARGE' || t.status === 'UNPAID')
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const calculatedSettled = totalSettled ?? transactions
        .filter(t => t.transaction_type === 'SETTLEMENT')
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const calculatedOutstanding = outstandingBalance ?? Math.max(0, calculatedCredit - calculatedSettled);

    const filteredTransactions = transactions.filter(t => {
        if (filter === 'CHARGE') return t.transaction_type === 'CHARGE' || t.status === 'UNPAID';
        if (filter === 'SETTLEMENT') return t.transaction_type === 'SETTLEMENT' || t.status === 'PAID';
        return true;
    });

    const openLightbox = (url: string, plate?: string, service?: string, date?: string) => {
        setLightboxImage(url);
        setLightboxMetadata({ plate, service, date });
    };

    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="space-y-6 max-w-4xl mx-auto"
        >
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-mono tracking-widest text-[#01FFFF] bg-[#01FFFF]/10 border border-[#01FFFF]/30 px-2.5 py-0.5 rounded-full uppercase font-bold">
                            Digital Khata
                        </span>
                        <span className="text-[10px] text-neutral-400 font-mono">
                            Verified Credit Ledger
                        </span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Credit &amp; Khata History</h1>
                    <p className="text-xs text-neutral-400 mt-1">
                        Transparent record of your car wash credit charges, vehicle proofs, and payments.
                    </p>
                </div>
            </div>

            {/* Total Amount Due Banner */}
            <div className={`p-5 sm:p-6 rounded-2xl border transition-all ${
                calculatedOutstanding > 0
                    ? 'bg-rose-950/20 border-rose-500/30 shadow-[0_0_30px_rgba(244,63,94,0.15)]'
                    : 'bg-emerald-950/20 border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.1)]'
            }`}>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className={`p-3.5 rounded-2xl ${
                            calculatedOutstanding > 0 ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'
                        }`}>
                            {calculatedOutstanding > 0 ? (
                                <AlertCircle className="w-6 h-6 animate-pulse" />
                            ) : (
                                <ShieldCheck className="w-6 h-6" />
                            )}
                        </div>
                        <div>
                            <span className="text-xs font-mono uppercase tracking-wider text-neutral-400 block">
                                Total Amount Due
                            </span>
                            <div className="flex items-baseline gap-2 mt-0.5">
                                <span className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${
                                    calculatedOutstanding > 0 ? 'text-rose-400' : 'text-emerald-400'
                                }`}>
                                    ₹{calculatedOutstanding.toLocaleString('en-IN')}
                                </span>
                                {calculatedOutstanding > 0 && (
                                    <span className="text-[11px] font-mono text-neutral-400">
                                        (Outstanding Credit)
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="text-left sm:text-right">
                        {calculatedOutstanding > 0 ? (
                            <span className="inline-flex items-center gap-1.5 text-xs text-rose-300 font-mono bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-xl">
                                Pay at reception desk or via UPI
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-300 font-mono bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl">
                                <CheckCircle className="w-3.5 h-3.5" /> All Dues Cleared
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Total Credit */}
                <div className="bg-[#121316] border border-neutral-800/80 p-5 rounded-2xl flex items-center gap-4 hover:border-neutral-700 transition">
                    <div className="p-3 bg-neutral-800/60 rounded-xl text-neutral-300">
                        <Wallet className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-xs text-neutral-400 font-medium">Total Credit Accrued</p>
                        <p className="text-xl font-bold text-white mt-0.5">
                            ₹{calculatedCredit.toLocaleString('en-IN')}
                        </p>
                    </div>
                </div>

                {/* Total Paid */}
                <div className="bg-[#121316] border border-neutral-800/80 p-5 rounded-2xl flex items-center gap-4 hover:border-neutral-700 transition">
                    <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
                        <CheckCircle className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-xs text-neutral-400 font-medium">Total Settled / Paid</p>
                        <p className="text-xl font-bold text-emerald-400 mt-0.5">
                            ₹{calculatedSettled.toLocaleString('en-IN')}
                        </p>
                    </div>
                </div>

                {/* Balance Due */}
                <div className="bg-[#121316] border border-neutral-800/80 p-5 rounded-2xl flex items-center gap-4 hover:border-neutral-700 transition">
                    <div className={`p-3 rounded-xl ${calculatedOutstanding > 0 ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                        <AlertCircle className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-xs text-neutral-400 font-medium">Current Balance</p>
                        <p className={`text-xl font-bold mt-0.5 ${calculatedOutstanding > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                            ₹{calculatedOutstanding.toLocaleString('en-IN')}
                        </p>
                    </div>
                </div>
            </div>

            {/* Filter Pills & Transaction List */}
            <div className="bg-[#121316] border border-neutral-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="px-6 py-4 border-b border-neutral-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                        <h2 className="text-sm font-bold text-white tracking-wide uppercase font-mono">
                            Digital Khata Entries
                        </h2>
                        <span className="text-xs text-neutral-500 font-mono">
                            {filteredTransactions.length} of {transactions.length} record(s)
                        </span>
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/5">
                        <button
                            type="button"
                            onClick={() => setFilter('ALL')}
                            className={`px-3 py-1 rounded-lg text-xs font-mono transition ${
                                filter === 'ALL' ? 'bg-white/10 text-white font-bold' : 'text-neutral-400 hover:text-white'
                            }`}
                        >
                            All
                        </button>
                        <button
                            type="button"
                            onClick={() => setFilter('CHARGE')}
                            className={`px-3 py-1 rounded-lg text-xs font-mono transition ${
                                filter === 'CHARGE' ? 'bg-rose-500/20 text-rose-300 font-bold' : 'text-neutral-400 hover:text-white'
                            }`}
                        >
                            Credit Charges
                        </button>
                        <button
                            type="button"
                            onClick={() => setFilter('SETTLEMENT')}
                            className={`px-3 py-1 rounded-lg text-xs font-mono transition ${
                                filter === 'SETTLEMENT' ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-neutral-400 hover:text-white'
                            }`}
                        >
                            Settlements
                        </button>
                    </div>
                </div>

                {/* Ledger Items */}
                <div className="divide-y divide-neutral-800/60">
                    {filteredTransactions.length === 0 ? (
                        <div className="px-6 py-12 text-center">
                            <Clock className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
                            <p className="text-neutral-400 font-mono text-xs">
                                No credit or settlement entries found for this filter.
                            </p>
                        </div>
                    ) : (
                        filteredTransactions.map((txn) => {
                            const isSettlement = txn.transaction_type === 'SETTLEMENT' || txn.status === 'PAID';
                            const rawImg = txn.number_plate_image;
                            const imgUrl = rawImg ? (rawImg.startsWith('http') ? rawImg : `http://127.0.0.1:8001${rawImg.startsWith('/') ? '' : '/'}${rawImg}`) : null;
                            const plate = txn.plate_number || 'N/A';
                            const dateText = txn.date ? (txn.date.includes('T') ? txn.date.split('T')[0] : txn.date) : 'N/A';

                            return (
                                <div 
                                    key={txn.id} 
                                    className="px-6 py-4.5 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-neutral-800/25 transition-colors gap-4"
                                >
                                    <div className="flex items-start sm:items-center gap-4 min-w-0">
                                        {/* Proof Photo Thumbnail */}
                                        {imgUrl ? (
                                            <button
                                                type="button"
                                                onClick={() => openLightbox(imgUrl, plate, txn.service, dateText)}
                                                className="w-12 h-12 rounded-xl overflow-hidden border border-[#01FFFF]/40 hover:border-[#01FFFF] hover:scale-105 transition-all flex-shrink-0 relative group shadow-md"
                                                title="Click to view vehicle checkout photo proof"
                                            >
                                                <img 
                                                    src={imgUrl} 
                                                    alt="Proof" 
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                />
                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[#01FFFF]">
                                                    <Eye className="w-4 h-4" />
                                                </div>
                                            </button>
                                        ) : (
                                            <div className="w-12 h-12 rounded-xl border border-white/5 bg-neutral-900/60 flex flex-col items-center justify-center flex-shrink-0 text-neutral-600">
                                                <Car className="w-5 h-5 opacity-40" />
                                                <span className="text-[9px] font-mono mt-0.5">No Img</span>
                                            </div>
                                        )}

                                        {/* Details */}
                                        <div className="min-w-0 space-y-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="text-sm font-semibold text-white truncate">
                                                    {txn.service}
                                                </p>
                                                {plate && plate !== 'N/A' && (
                                                    <span className="font-mono text-[11px] font-bold text-[#01FFFF] bg-[#01FFFF]/10 border border-[#01FFFF]/30 px-2 py-0.5 rounded-md">
                                                        {plate}
                                                    </span>
                                                )}
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                    isSettlement 
                                                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                                                        : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                                                }`}>
                                                    {isSettlement ? 'Payment Received' : 'Khata Credit'}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-3 text-xs text-neutral-400 font-mono">
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                                                    {dateText}
                                                </span>
                                                {imgUrl && (
                                                    <span className="text-[11px] text-[#01FFFF]/80 font-mono">
                                                        • Photo Verified
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Amount */}
                                    <div className="text-left sm:text-right flex-shrink-0 pl-16 sm:pl-0">
                                        <span className={`text-base font-bold font-mono ${
                                            isSettlement ? 'text-emerald-400' : 'text-rose-400'
                                        }`}>
                                            {isSettlement ? `-₹${Number(txn.amount || 0).toLocaleString('en-IN')}` : `+₹${Number(txn.amount || 0).toLocaleString('en-IN')}`}
                                        </span>
                                        <span className="block text-[10px] text-neutral-500 font-mono">
                                            {isSettlement ? 'Cleared' : 'Payable'}
                                        </span>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Photo Proof Lightbox Modal */}
            <AnimatePresence>
                {lightboxImage && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
                        onClick={() => setLightboxImage(null)}
                    >
                        <div 
                            className="relative max-w-2xl w-full bg-[#101115] border border-white/15 rounded-3xl overflow-hidden p-5 shadow-[0_0_80px_rgba(0,0,0,0.8)] flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Modal Header */}
                            <div className="w-full flex justify-between items-center pb-3 mb-3 border-b border-white/10">
                                <div className="space-y-0.5">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-mono tracking-widest text-[#01FFFF] uppercase font-bold">
                                            Checkout Vehicle Proof
                                        </span>
                                        {lightboxMetadata?.plate && lightboxMetadata.plate !== 'N/A' && (
                                            <span className="font-mono text-xs font-bold text-[#01FFFF] bg-[#01FFFF]/10 border border-[#01FFFF]/30 px-2 py-0.5 rounded-md">
                                                {lightboxMetadata.plate}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-neutral-300 font-medium">
                                        {lightboxMetadata?.service} {lightboxMetadata?.date ? `• ${lightboxMetadata.date}` : ''}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setLightboxImage(null)}
                                    className="p-2 text-neutral-400 hover:text-white rounded-xl bg-white/5 hover:bg-white/10 transition"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Full Image */}
                            <div className="w-full flex-1 flex items-center justify-center overflow-hidden py-2">
                                <img
                                    src={lightboxImage}
                                    alt="Vehicle Checkout Proof"
                                    className="max-w-full max-h-[65vh] object-contain rounded-xl border border-white/10 shadow-2xl"
                                />
                            </div>

                            <p className="text-[11px] text-center text-neutral-500 font-mono mt-3">
                                Captured by Kallayi Car Spa staff during POS checkout for verification.
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
