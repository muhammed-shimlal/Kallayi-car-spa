import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Car, ChevronRight } from 'lucide-react';
import api from '@/lib/api';
import { Vehicle } from './types';


interface GarageTabProps {
    myVehicles: Vehicle[];
}

export function GarageTab({ myVehicles }: GarageTabProps) {
    const [isAdding, setIsAdding] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [newVehicle, setNewVehicle] = useState({ make: '', model: '', plate: '' });

    const handleAddVehicle = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            // Ensure this endpoint matches your Django backend vehicle creation route
            await api.post('/fleet/service-vehicles/', {
                make: newVehicle.make,
                model: newVehicle.model,
                plate_number: newVehicle.plate
            });

            setIsAdding(false);
            setNewVehicle({ make: '', model: '', plate: '' });
            // Optionally trigger a page refresh or call a passed-down refresh function
            window.location.reload(); 
        } catch (error) {
            console.error("Failed to add vehicle", error);
            alert("Failed to add vehicle. Please check the plate number and try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <AnimatePresence>
                {isAdding && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                    >
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-carbon/90 border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-[0_0_50px_rgba(0,0,0,0.8)]"
                        >
                            <h2 className="text-2xl font-bold text-white mb-6 uppercase tracking-widest font-syncopate">Register Vehicle</h2>
                            <form onSubmit={handleAddVehicle} className="space-y-4">
                                <div>
                                    <label className="text-xs uppercase tracking-widest text-gray-400 font-bold ml-1">Make (e.g. BMW)</label>
                                    <input required value={newVehicle.make} onChange={e => setNewVehicle({...newVehicle, make: e.target.value})} className="w-full mt-1 bg-white/5 border border-white/10 py-3 px-4 rounded-xl text-white focus:outline-none focus:border-[#E52323] transition-colors" />
                                </div>
                                <div>
                                    <label className="text-xs uppercase tracking-widest text-gray-400 font-bold ml-1">Model (e.g. M3)</label>
                                    <input required value={newVehicle.model} onChange={e => setNewVehicle({...newVehicle, model: e.target.value})} className="w-full mt-1 bg-white/5 border border-white/10 py-3 px-4 rounded-xl text-white focus:outline-none focus:border-[#E52323] transition-colors" />
                                </div>
                                <div>
                                    <label className="text-xs uppercase tracking-widest text-gray-400 font-bold ml-1">Plate Number</label>
                                    <input required value={newVehicle.plate} onChange={e => setNewVehicle({...newVehicle, plate: e.target.value})} className="w-full mt-1 bg-white/5 border border-white/10 py-3 px-4 rounded-xl text-white focus:outline-none focus:border-[#E52323] transition-colors uppercase" placeholder="KL-10-XX-1234" />
                                </div>

                                <div className="flex gap-4 mt-8">
                                    <button type="button" onClick={() => setIsAdding(false)} className="flex-1 py-3 border border-white/20 rounded-xl text-white font-bold tracking-widest text-xs uppercase hover:bg-white/10 transition">Cancel</button>
                                    <button type="submit" disabled={isLoading} className="flex-1 py-3 bg-[#E52323] text-white font-bold tracking-widest text-xs uppercase rounded-xl hover:bg-red-700 transition disabled:opacity-50">
                                        {isLoading ? 'Saving...' : 'Confirm'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

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
                    <button onClick={() => setIsAdding(true)} className="bg-white/10 border border-white/20 text-white px-6 py-3 rounded-full font-bold text-xs uppercase tracking-widest hover:bg-white hover:text-black transition flex items-center gap-2">
                        <Plus className="w-4 h-4" /> Add Vehicle
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {myVehicles.map((v, index) => (
                        <div key={v.id || v.plate || index} className="bg-white/5 border border-white/10 p-6 rounded-3xl flex items-center justify-between hover:border-[#E52323]/50 transition cursor-pointer group backdrop-blur-md">
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
        </>
    );
}
