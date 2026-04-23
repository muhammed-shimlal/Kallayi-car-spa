import React from 'react';
import { motion } from 'framer-motion';
import { Crown } from 'lucide-react';

export function VipTab() {
    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
        >
            <span className="text-yellow-500 text-[10px] font-bold tracking-[0.3em] uppercase">Memberships</span>
            <h1 className="text-4xl font-bold tracking-tighter mt-2 mb-10">VIP Syndicate</h1>
            <div className="bg-gradient-to-br from-yellow-900/40 to-black border border-yellow-500/30 p-10 rounded-[2.5rem] relative overflow-hidden shadow-[0_0_20px_rgba(234,179,8,0.1)]">
                <Crown className="absolute right-10 top-10 w-24 h-24 text-yellow-500/10" />
                <h2 className="text-3xl font-bold text-white mb-2">Unlimited Wash Club</h2>
                <h3 className="text-5xl font-black text-yellow-500 mb-6">₹1,499<span className="text-lg text-gray-400 font-normal"> / mo</span></h3>
                <ul className="space-y-4 mb-8 text-gray-300 font-medium">
                    <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></span> 4x Premium Washes per month</li>
                    <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></span> Priority Queueing (Skip the line)</li>
                    <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></span> Double Loyalty Points on extras</li>
                </ul>
                <button className="bg-yellow-500 text-black px-8 py-4 rounded-full font-bold text-xs uppercase tracking-widest hover:bg-yellow-400 transition hover:shadow-[0_0_20px_rgba(234,179,8,0.4)]">
                    Authorize Upgrade
                </button>
            </div>
        </motion.div>
    );
}
