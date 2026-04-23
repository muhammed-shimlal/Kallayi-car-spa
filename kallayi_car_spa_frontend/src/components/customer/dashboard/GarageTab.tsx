import React from 'react';
import { motion } from 'framer-motion';
import { Plus, Car, ChevronRight } from 'lucide-react';
import { Vehicle } from './types';

interface GarageTabProps {
    myVehicles: Vehicle[];
}

export function GarageTab({ myVehicles }: GarageTabProps) {
    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
        >
            <div className="flex justify-between items-end mb-10">
                <div>
                    <span className="text-gray-500 text-[10px] font-bold tracking-[0.3em] uppercase">Fleet Data</span>
                    <h1 className="text-4xl font-bold tracking-tighter mt-2">My Garage</h1>
                </div>
                <button className="bg-white/10 border border-white/20 text-white px-6 py-3 rounded-full font-bold text-xs uppercase tracking-widest hover:bg-white hover:text-black transition flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Add Vehicle
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {myVehicles.map(v => (
                    <div key={v.id} className="bg-white/5 border border-white/10 p-6 rounded-3xl flex items-center justify-between hover:border-[#E52323]/50 transition cursor-pointer group backdrop-blur-md">
                        <div className="flex items-center gap-6">
                            <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center border border-white/10 group-hover:shadow-[0_0_20px_rgba(229,35,35,0.2)] transition">
                                <Car className="text-gray-400 group-hover:text-[#E52323]" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold">{v.make} {v.model}</h3>
                                <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">{v.plate}</p>
                            </div>
                        </div>
                        <ChevronRight className="text-gray-600 group-hover:text-white transition" />
                    </div>
                ))}
            </div>
        </motion.div>
    );
}
