import React from 'react';
import { motion } from 'framer-motion';
import { Wallet, Info } from 'lucide-react';
import { Transaction } from './types';

interface LedgerTabProps {
    transactions: Transaction[];
}

export function LedgerTab({ transactions }: LedgerTabProps) {

    const outstanding = transactions.filter(t => t.status === 'UNPAID').reduce((sum, t) => sum + t.amount, 0);

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="animate-none"
        >
            <span className="text-gray-500 text-[10px] font-bold tracking-[0.3em] uppercase">Financials</span>
            <h1 className="text-4xl font-bold tracking-tighter mt-2 mb-10">Ledger & Dues</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Outstanding Summary Widget */}
                <div className="md:col-span-1 bg-[#E52323] text-white p-6 md:p-8 rounded-[2.5rem] relative overflow-hidden shadow-[0_0_40px_rgba(229,35,35,0.3)]">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-black/10 rounded-full blur-2xl transform translate-x-1/2 -translate-y-1/2"></div>
                    <Wallet className="w-8 h-8 opacity-80 mb-6" />
                    <p className="text-xs font-bold uppercase tracking-widest mb-1 opacity-90">Total Outstanding</p>
                    <h2 className="text-4xl md:text-5xl font-black mb-4">₹{outstanding.toLocaleString()}</h2>
                    <button className="bg-black text-white px-6 py-3 rounded-full font-bold text-xs uppercase tracking-widest hover:scale-105 transition w-full">
                        Settle Dues
                    </button>
                </div>

                {/* Info Card */}
                <div className="md:col-span-2 bg-white/5 border border-white/10 backdrop-blur-2xl p-6 md:p-8 rounded-[2.5rem] flex flex-col justify-center">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-black/50 border border-white/10 rounded-2xl text-[#E52323]">
                            <Info className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold mb-2">Automated Khata Sync</h3>
                            <p className="text-gray-400 text-sm leading-relaxed">
                                Your personal ledger is synced directly with our primary Khata terminal. 
                                Unpaid deep details or monthly packages appear here until your balance is cleared.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Transactions List */}
            <div className="bg-white/5 border border-white/10 rounded-[2.5rem] overflow-hidden backdrop-blur-2xl">
                <div className="p-6 md:p-8 border-b border-white/10">
                    <h3 className="text-lg font-bold">Recent Credit Transactions</h3>
                </div>
                <div className="divide-y divide-white/5">
                    {transactions.map(txn => (
                        <div key={txn.id} className="p-6 md:px-8 flex flex-col md:flex-row justify-between items-start md:items-center hover:bg-black/20 transition cursor-default">
                            <div className="mb-4 md:mb-0">
                                <h4 className="font-bold text-[15px]">{txn.service}</h4>
                                <p className="text-gray-500 text-xs font-mono mt-1">{txn.id} • {txn.date}</p>
                            </div>
                            <div className="flex items-center gap-6">
                                <span className={`text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-sm ${
                                    txn.status === 'UNPAID' ? 'bg-[#E52323]/20 text-[#E52323] border border-[#E52323]/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                }`}>
                                    {txn.status}
                                </span>
                                <span className="font-black text-xl w-24 text-right">₹{txn.amount.toLocaleString()}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </motion.div>
    );
}
