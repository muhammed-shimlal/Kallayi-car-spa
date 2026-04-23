import React from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

export function HistoryTab() {
    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
        >
            <span className="text-gray-500 text-[10px] font-bold tracking-[0.3em] uppercase">Archive</span>
            <h1 className="text-4xl font-bold tracking-tighter mt-2 mb-10">Service Logs</h1>
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl">
                <div className="flex justify-between items-center border-b border-white/10 pb-6 mb-6">
                    <div>
                        <h3 className="font-bold text-lg">Deep Detail - Porsche 911</h3>
                        <p className="text-gray-400 text-sm mt-1">Completed on Oct 12, 2026</p>
                    </div>
                    {/* ⭐ Review Prompt */}
                    <div className="text-right">
                        <p className="text-xs text-[#E52323] font-bold uppercase tracking-widest mb-2">Leave a Verdict</p>
                        <div className="flex gap-1 text-gray-600 cursor-pointer hover:text-yellow-500 transition">
                            <Star className="w-5 h-5" /><Star className="w-5 h-5" /><Star className="w-5 h-5" /><Star className="w-5 h-5" /><Star className="w-5 h-5" />
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
