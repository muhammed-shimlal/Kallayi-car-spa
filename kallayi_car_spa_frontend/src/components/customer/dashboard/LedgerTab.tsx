"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, CheckCircle, AlertCircle, X } from 'lucide-react';
import { Transaction } from './types';

interface LedgerTabProps {
    transactions: Transaction[];
    totalCredit?: number;
    totalSettled?: number;
    outstandingBalance?: number;
}

export function LedgerTab({ transactions, totalCredit, totalSettled, outstandingBalance }: LedgerTabProps) {
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);

    const calculatedCredit = totalCredit ?? transactions
        .filter(t => t.transaction_type === 'CHARGE' || t.status === 'UNPAID')
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const calculatedSettled = totalSettled ?? transactions
        .filter(t => t.transaction_type === 'SETTLEMENT')
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const calculatedOutstanding = outstandingBalance ?? Math.max(0, calculatedCredit - calculatedSettled);

    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="space-y-6 max-w-4xl mx-auto"
        >
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-white">Ledger &amp; Dues</h1>
                <p className="text-xs text-neutral-400 mt-1">Summary of your credit account and payment history.</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                
                {/* Total Credit */}
                <div className="bg-[#121316] border border-neutral-800 p-5 rounded-2xl flex items-center gap-4">
                    <div className="p-3 bg-neutral-800/60 rounded-xl text-neutral-300">
                        <Wallet className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-xs text-neutral-400 font-medium">Total Credit</p>
                        <p className="text-xl font-bold text-white mt-0.5">
                            ₹{calculatedCredit.toLocaleString('en-IN')}
                        </p>
                    </div>
                </div>

                {/* Total Paid */}
                <div className="bg-[#121316] border border-neutral-800 p-5 rounded-2xl flex items-center gap-4">
                    <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
                        <CheckCircle className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-xs text-neutral-400 font-medium">Total Paid</p>
                        <p className="text-xl font-bold text-emerald-400 mt-0.5">
                            ₹{calculatedSettled.toLocaleString('en-IN')}
                        </p>
                    </div>
                </div>

                {/* Balance Due */}
                <div className="bg-[#121316] border border-neutral-800 p-5 rounded-2xl flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${calculatedOutstanding > 0 ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                        <AlertCircle className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-xs text-neutral-400 font-medium">Balance Due</p>
                        <p className={`text-xl font-bold mt-0.5 ${calculatedOutstanding > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                            ₹{calculatedOutstanding.toLocaleString('en-IN')}
                        </p>
                    </div>
                </div>

            </div>

            {/* Simplified Transaction List */}
            <div className="bg-[#121316] border border-neutral-800 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-neutral-800 flex justify-between items-center">
                    <h2 className="text-sm font-bold text-white">Recent Transactions</h2>
                    <span className="text-xs text-neutral-500">{transactions.length} entries</span>
                </div>

                <div className="divide-y divide-neutral-800/60">
                    {transactions.length === 0 ? (
                        <div className="px-6 py-10 text-center text-xs text-neutral-500">
                            No transactions recorded yet.
                        </div>
                    ) : (
                        transactions.map((txn) => {
                            const isSettlement = txn.transaction_type === 'SETTLEMENT' || txn.status === 'PAID';
                            const imgUrl = txn.number_plate_image ? (txn.number_plate_image.startsWith('http') ? txn.number_plate_image : `http://127.0.0.1:8001${txn.number_plate_image.startsWith('/') ? '' : '/'}${txn.number_plate_image}`) : null;
                            if (imgUrl) {
                                console.log("Customer Ledger Image URL:", imgUrl);
                            }

                            return (
                                <div key={txn.id} className="px-6 py-4 flex items-center justify-between hover:bg-neutral-800/30 transition-colors gap-4">
                                    <div className="flex items-center gap-3.5 min-w-0">
                                        {imgUrl ? (
                                            <button
                                                type="button"
                                                onClick={() => setLightboxImage(imgUrl)}
                                                className="w-9 h-9 rounded-lg overflow-hidden border border-neutral-700 hover:border-neutral-400 transition flex-shrink-0"
                                                title="View photo proof"
                                            >
                                                <img 
                                                    src={imgUrl} 
                                                    alt="Proof" 
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                />
                                            </button>
                                        ) : null}

                                        <div className="min-w-0">
                                            <p className="text-xs font-semibold text-white truncate">{txn.service}</p>
                                            <p className="text-[11px] text-neutral-500 font-mono mt-0.5">{txn.date}</p>
                                        </div>
                                    </div>

                                    <div className="text-right flex-shrink-0">
                                        <span className={`text-sm font-bold ${isSettlement ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            {isSettlement ? `-₹${Number(txn.amount || 0).toLocaleString('en-IN')}` : `+₹${Number(txn.amount || 0).toLocaleString('en-IN')}`}
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
                        className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
                        onClick={() => setLightboxImage(null)}
                    >
                        <div 
                            className="relative max-w-lg w-full bg-[#121316] border border-neutral-800 rounded-2xl overflow-hidden p-4 flex flex-col items-center"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="w-full flex justify-between items-center pb-3 mb-3 border-b border-neutral-800">
                                <span className="text-xs font-semibold text-neutral-300">Photo Proof</span>
                                <button
                                    onClick={() => setLightboxImage(null)}
                                    className="p-1 text-neutral-400 hover:text-white transition"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <img
                                src={lightboxImage}
                                alt="Proof"
                                className="max-w-full max-h-[60vh] object-contain rounded-lg border border-neutral-800"
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
