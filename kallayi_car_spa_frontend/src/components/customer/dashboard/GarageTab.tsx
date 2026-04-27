import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Car, Edit2, Trash2 } from 'lucide-react';
import api from '@/lib/api';
import { Vehicle } from './types';

interface GarageTabProps {
    myVehicles: Vehicle[];
}

export function GarageTab({ myVehicles: initialVehicles }: GarageTabProps) {
    const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
    const [form, setForm] = useState({ make: '', model: '', plate: '' });

    const openAddModal = () => {
        setEditingVehicle(null);
        setForm({ make: '', model: '', plate: '' });
        setIsModalOpen(true);
    };

    const handleEditClick = (vehicle: Vehicle) => {
        setEditingVehicle(vehicle);
        setForm({ make: vehicle.make || '', model: vehicle.model || '', plate: vehicle.plate || '' });
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingVehicle(null);
        setForm({ make: '', model: '', plate: '' });
    };

    const handleDeleteVehicle = async (id: number) => {
        if (!window.confirm('Are you sure you want to remove this vehicle from your garage?')) return;
        try {
            await api.delete(`/customer-vehicles/${id}/`);
            setVehicles(prev => prev.filter(v => v.id !== id));
        } catch (error) {
            console.error('Failed to delete vehicle', error);
            alert('Failed to remove vehicle. Please try again.');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        const payload = { make: form.make, model: form.model, plate_number: form.plate };
        try {
            if (editingVehicle) {
                // PATCH to update existing
                const res = await api.patch(`/customer-vehicles/${editingVehicle.id}/`, payload);
                const updated = res.data;
                setVehicles(prev => prev.map(v =>
                    v.id === editingVehicle.id
                        ? { ...v, make: updated.make, model: updated.model, plate: updated.plate_number }
                        : v
                ));
            } else {
                // POST to create new
                const res = await api.post('/customer-vehicles/', payload);
                const created = res.data;
                setVehicles(prev => [...prev, {
                    id: created.id,
                    make: created.make,
                    model: created.model,
                    plate: created.plate_number,
                }]);
            }
            handleCloseModal();
        } catch (error: any) {
            console.error('Vehicle save failed', error);
            const errMsg = error.response?.data
                ? JSON.stringify(error.response.data)
                : 'Please check the details and try again.';
            alert(`Failed to save vehicle: ${errMsg}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            {/* Add / Edit Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-[#0d0d0d] border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-[0_0_60px_rgba(0,0,0,0.9)]"
                        >
                            <h2 className="text-xl font-bold text-white mb-1 uppercase tracking-widest">
                                {editingVehicle ? 'Update Vehicle' : 'Register Vehicle'}
                            </h2>
                            <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-6 font-bold">
                                {editingVehicle ? `Editing — ${editingVehicle.plate}` : 'Add a new car to your garage'}
                            </p>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="text-xs uppercase tracking-widest text-gray-400 font-bold ml-1">Make (e.g. BMW)</label>
                                    <input
                                        required
                                        value={form.make}
                                        onChange={e => setForm({ ...form, make: e.target.value })}
                                        className="w-full mt-1 bg-white/5 border border-white/10 py-3 px-4 rounded-xl text-white focus:outline-none focus:border-[#E52323] transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs uppercase tracking-widest text-gray-400 font-bold ml-1">Model (e.g. M3)</label>
                                    <input
                                        required
                                        value={form.model}
                                        onChange={e => setForm({ ...form, model: e.target.value })}
                                        className="w-full mt-1 bg-white/5 border border-white/10 py-3 px-4 rounded-xl text-white focus:outline-none focus:border-[#E52323] transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs uppercase tracking-widest text-gray-400 font-bold ml-1">Plate Number</label>
                                    <input
                                        required
                                        value={form.plate}
                                        onChange={e => setForm({ ...form, plate: e.target.value })}
                                        className="w-full mt-1 bg-white/5 border border-white/10 py-3 px-4 rounded-xl text-white focus:outline-none focus:border-[#E52323] transition-colors uppercase"
                                        placeholder="KL-10-XX-1234"
                                    />
                                </div>

                                <div className="flex gap-4 mt-8">
                                    <button
                                        type="button"
                                        onClick={handleCloseModal}
                                        className="flex-1 py-3 border border-white/20 rounded-xl text-white font-bold tracking-widest text-xs uppercase hover:bg-white/10 transition"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="flex-1 py-3 bg-[#E52323] text-white font-bold tracking-widest text-xs uppercase rounded-xl hover:bg-red-700 transition disabled:opacity-50"
                                    >
                                        {isLoading ? 'Saving...' : editingVehicle ? 'Update' : 'Confirm'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Garage View */}
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
                    <button
                        onClick={openAddModal}
                        className="bg-white/10 border border-white/20 text-white px-6 py-3 rounded-full font-bold text-xs uppercase tracking-widest hover:bg-white hover:text-black transition flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" /> Add Vehicle
                    </button>
                </div>

                {vehicles.length === 0 ? (
                    <div className="bg-white/5 border border-white/10 p-10 rounded-3xl flex flex-col items-center text-center">
                        <Car className="w-12 h-12 text-white/10 mb-4" />
                        <h3 className="text-xl font-bold text-gray-500">No Vehicles Registered</h3>
                        <p className="text-[10px] text-gray-600 uppercase tracking-widest mt-2 font-bold">Click "Add Vehicle" to register your first car.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {vehicles.map((v, index) => (
                            <div
                                key={v.id || v.plate || index}
                                className="bg-white/5 border border-white/10 p-6 rounded-3xl hover:border-white/20 transition group backdrop-blur-md"
                            >
                                <div className="flex items-center justify-between">
                                    {/* Left: Icon + Info */}
                                    <div className="flex items-center gap-5">
                                        <div className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center border border-white/10 group-hover:shadow-[0_0_20px_rgba(229,35,35,0.15)] transition shrink-0">
                                            <Car className="text-gray-400 group-hover:text-[#E52323] transition" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-white">{v.make} {v.model}</h3>
                                            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-0.5">{v.plate}</p>
                                        </div>
                                    </div>

                                    {/* Right: Action Buttons */}
                                    <div className="flex items-center gap-2 ml-4">
                                        <button
                                            onClick={() => handleEditClick(v)}
                                            title="Edit vehicle"
                                            className="p-2 rounded-xl border border-white/10 bg-white/5 text-gray-500 hover:text-[#01FFFF] hover:border-[#01FFFF]/30 hover:bg-[#01FFFF]/10 transition"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteVehicle(v.id!)}
                                            title="Remove vehicle"
                                            className="p-2 rounded-xl border border-white/10 bg-white/5 text-gray-500 hover:text-[#E52323] hover:border-[#E52323]/30 hover:bg-[#E52323]/10 transition"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </motion.div>
        </>
    );
}
