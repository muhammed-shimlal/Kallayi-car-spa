import React from 'react';
import { motion } from 'framer-motion';
import { Plus, Award, Activity, LogOut } from 'lucide-react';
import { ActiveWash } from './types';

interface OverviewTabProps {
    setIsBooking: (val: boolean) => void;
    activeWash: ActiveWash;
    handleLogout: () => void;
}

export function OverviewTab({ setIsBooking, activeWash, handleLogout }: OverviewTabProps) {
    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
        >
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-10">
                <div className="w-full md:w-auto flex justify-between items-start">
                    <div>
                        <span className="text-[#E52323] text-[10px] font-bold tracking-[0.3em] uppercase">Sys. Online</span>
                        <h1 className="text-4xl font-bold tracking-tighter mt-2">Welcome Back.</h1>
                    </div>
                    <button onClick={handleLogout} className="md:hidden flex items-center gap-2 text-gray-500 hover:text-[#E52323] transition-colors font-bold text-[10px] uppercase tracking-widest mt-2 bg-white/5 px-3 py-2 rounded-lg border border-white/10">
                        <LogOut className="w-4 h-4" /> Disconnect
                    </button>
                </div>
                <button onClick={() => setIsBooking(true)} className="w-full md:w-auto justify-center bg-white text-black px-6 py-3 rounded-full font-bold text-xs uppercase tracking-widest hover:scale-105 transition flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Book Wash
                </button>
            </div>

            <div className="flex flex-col gap-6 mb-8">
                {/* 📍 Real-Time Tracking Widget */}
                {activeWash ? (
                    <div className="w-full border border-[#E52323]/30 bg-[#E52323]/5 p-6 md:p-8 rounded-3xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-[1px] bg-[#E52323] opacity-50 shadow-[0_0_10px_#E52323]"></div>
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 mb-6">
                            <div>
                                <h3 className="text-xl font-bold">{activeWash.vehicle}</h3>
                                <p className="text-[#E52323] text-xs uppercase tracking-widest font-bold mt-1">{activeWash.package}</p>
                            </div>
                            <span className="bg-[#E52323] text-white px-4 py-1.5 rounded-sm text-[10px] uppercase tracking-widest font-bold animate-pulse">
                                {activeWash.status}
                            </span>
                        </div>
                        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mb-2">
                            <div className="h-full bg-[#E52323] shadow-[0_0_10px_#E52323]" style={{ width: `${activeWash.progress}%` }}></div>
                        </div>
                        <div className="flex justify-between text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                            <span>Dropped Off</span>
                            <span className="text-white">Washing</span>
                            <span>Ready</span>
                        </div>
                    </div>
                ) : (
                    <div className="w-full bg-white/5 border border-white/10 p-6 md:p-8 rounded-3xl flex flex-col items-center justify-center text-center shadow-inner">
                        <Activity className="w-12 h-12 text-white/10 mb-4" />
                        <h3 className="text-xl font-bold text-gray-500">No Active Operations</h3>
                        <p className="text-[10px] text-gray-600 uppercase tracking-widest mt-2 font-bold">Your fleet is currently secure.</p>
                    </div>
                )}
            </div>
        </motion.div>
    );
}
