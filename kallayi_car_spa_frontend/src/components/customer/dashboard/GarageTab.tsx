import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Car, Edit2, Trash2, X, Sparkles, ShieldCheck, Tag } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Vehicle } from './types';
import { SmartVehicleSelector } from '@/components/ui/smart-vehicle-selector';
import { VehicleImage } from '@/components/ui/VehicleImage';
import { VehicleType } from '@/types/database';

interface GarageTabProps {
    myVehicles: Vehicle[];
}

export function GarageTab({ myVehicles: initialVehicles }: GarageTabProps) {
    const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
    const [form, setForm] = useState<{
        make: string;
        model: string;
        plate: string;
        vehicle_type: VehicleType;
    }>({
        make: '',
        model: '',
        plate: '',
        vehicle_type: 'HATCHBACK',
    });

    useEffect(() => {
        setVehicles(initialVehicles);
    }, [initialVehicles]);

    const openAddModal = () => {
        setEditingVehicle(null);
        setForm({ make: '', model: '', plate: '', vehicle_type: 'HATCHBACK' });
        setIsModalOpen(true);
    };

    const handleEditClick = (vehicle: Vehicle) => {
        setEditingVehicle(vehicle);
        setForm({
            make: vehicle.make || '',
            model: vehicle.model || '',
            plate: vehicle.plate || '',
            vehicle_type: (vehicle.vehicle_type as VehicleType) || 'HATCHBACK',
        });
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingVehicle(null);
        setForm({ make: '', model: '', plate: '', vehicle_type: 'HATCHBACK' });
    };

    const handleDeleteVehicle = async (id: number) => {
        if (!window.confirm('Are you sure you want to remove this vehicle from your garage?')) return;
        try {
            await api.delete(`/customer-vehicles/${id}`);
            setVehicles(prev => prev.filter(v => v.id !== id));
            toast.success('Vehicle successfully removed from garage.');
        } catch (error) {
            console.error('Failed to delete vehicle', error);
            toast.error('Failed to remove vehicle. Please try again.');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const cleanPlate = form.plate.trim().toUpperCase();
        if (!cleanPlate) {
            toast.error('Please enter a valid license plate number.');
            return;
        }
        if (!form.make || !form.model) {
            toast.error('Please select or enter the vehicle brand and model.');
            return;
        }

        setIsLoading(true);
        const payload = {
            make: form.make,
            model: form.model,
            plate_number: cleanPlate,
            plate: cleanPlate,
            vehicle_type: form.vehicle_type || 'HATCHBACK',
        };

        try {
            if (editingVehicle) {
                // PATCH to update existing
                const res = await api.patch(`/customer-vehicles/${editingVehicle.id}`, payload);
                const updated = res.data;
                setVehicles(prev => prev.map(v =>
                    v.id === editingVehicle.id
                        ? {
                            ...v,
                            make: updated.make || form.make,
                            model: updated.model || form.model,
                            plate: updated.plate || updated.plate_number || cleanPlate,
                            vehicle_type: updated.vehicle_type || form.vehicle_type,
                        }
                        : v
                ));
                toast.success('Vehicle updated successfully!');
            } else {
                // POST to create new
                const res = await api.post('/customer-vehicles', payload);
                const created = res.data?.vehicle || res.data?.data || res.data;
                setVehicles(prev => [...prev, {
                    id: created.id,
                    make: created.make || form.make,
                    model: created.model || form.model,
                    plate: created.plate_number || created.plate || cleanPlate,
                    vehicle_type: created.vehicle_type || form.vehicle_type,
                }]);
                toast.success('Vehicle registered successfully!');
            }
            handleCloseModal();
        } catch (error: any) {
            console.error('Vehicle save failed', error);
            const errMsg = error.response?.data
                ? (typeof error.response.data === 'string' ? error.response.data : error.response.data.error || JSON.stringify(error.response.data))
                : error.message || 'Please check the details and try again.';
            toast.error(`Failed to save vehicle: ${errMsg}`);
        } finally {
            setIsLoading(false);
        }
    };

    const getVehicleIcon = (type?: string) => {
        switch ((type || '').toUpperCase()) {
            case 'BIKE': return '🏍️';
            case 'SUV':
            case 'COMPACT_SUV': return '🚙';
            case 'SEDAN': return '🚘';
            case 'VAN':
            case 'MUV': return '🚐';
            case 'LUXURY': return '✨';
            case 'AUTO': return '🛺';
            case 'TRUCK': return '🚚';
            default: return '🚗';
        }
    };

    return (
        <>
            {/* Add / Edit Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-[#0d0d0d] border border-white/10 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-[0_0_60px_rgba(0,0,0,0.9)] max-h-[90vh] overflow-y-auto"
                        >
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h2 className="text-xl font-bold text-white mb-1 uppercase tracking-widest font-syncopate">
                                        {editingVehicle ? 'Update Vehicle' : 'Register Vehicle'}
                                    </h2>
                                    <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">
                                        {editingVehicle ? `Editing — ${editingVehicle.plate}` : 'Add a vehicle to your digital garage'}
                                    </p>
                                </div>
                                <button
                                    onClick={handleCloseModal}
                                    className="p-2 rounded-xl text-zinc-500 hover:text-white hover:bg-white/5 transition"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-5">
                                {/* Smart Vehicle Selector (Brand, Model, Auto Body-Type) */}
                                <div>
                                    <SmartVehicleSelector
                                        initialMake={form.make}
                                        initialModel={form.model}
                                        initialBodyType={form.vehicle_type}
                                        onVehicleChange={(data) => {
                                            setForm(prev => {
                                                if (prev.make === data.make && prev.model === data.model && prev.vehicle_type === data.vehicle_type) {
                                                    return prev;
                                                }
                                                return {
                                                    ...prev,
                                                    make: data.make,
                                                    model: data.model,
                                                    vehicle_type: data.vehicle_type,
                                                };
                                            });
                                        }}
                                    />
                                </div>

                                {/* Plate Number Input */}
                                <div>
                                    <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold block mb-1">
                                        License Plate Number
                                    </label>
                                    <input
                                        required
                                        value={form.plate}
                                        onChange={e => setForm(prev => ({ ...prev, plate: e.target.value.toUpperCase() }))}
                                        className="w-full bg-[#141518] border border-white/10 py-3 px-4 rounded-xl text-white font-mono font-bold focus:outline-none focus:border-[#01FFFF] transition-colors uppercase placeholder:text-zinc-600"
                                        placeholder="KL-10-AW-1234"
                                    />
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={handleCloseModal}
                                        className="flex-1 py-3 border border-white/15 rounded-xl text-zinc-300 font-bold tracking-widest text-xs uppercase hover:bg-white/5 transition"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="flex-1 py-3 bg-[#01FFFF] text-slate-950 font-extrabold tracking-widest text-xs uppercase rounded-xl hover:bg-[#60ffff] transition disabled:opacity-50 shadow-[0_0_20px_rgba(1,255,255,0.3)] cursor-pointer"
                                    >
                                        {isLoading ? 'Saving...' : editingVehicle ? 'Update Vehicle' : 'Save to Garage'}
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
                        <span className="text-[#01FFFF] text-[10px] font-bold tracking-[0.3em] uppercase">My Vehicles</span>
                        <h1 className="text-4xl font-bold tracking-tighter mt-2 text-white font-syncopate">My Garage</h1>
                    </div>
                    <button
                        onClick={openAddModal}
                        className="bg-[#01FFFF] text-slate-950 px-6 py-3 min-h-[44px] rounded-full font-extrabold text-xs uppercase tracking-widest hover:bg-[#60ffff] transition flex items-center gap-2 shadow-[0_0_20px_rgba(1,255,255,0.3)] active:scale-95 cursor-pointer"
                    >
                        <Plus className="w-4 h-4 text-slate-950" /> Add Vehicle
                    </button>
                </div>

                {vehicles.length === 0 ? (
                    <div className="bg-white/5 border border-white/10 p-12 rounded-3xl flex flex-col items-center text-center">
                        <Car className="w-14 h-14 text-white/20 mb-4" />
                        <h3 className="text-xl font-bold text-gray-400">No Vehicles Registered</h3>
                        <p className="text-xs text-gray-500 uppercase tracking-widest mt-2 font-bold max-w-sm">
                            Click "Add Vehicle" above to register your car, bike, or SUV for rapid 1-click booking.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {vehicles.map((v, index) => (
                            <div
                                key={v.id || v.plate || index}
                                className="bg-white/5 border border-white/10 p-6 rounded-3xl hover:border-[#01FFFF]/40 transition group backdrop-blur-md relative overflow-hidden"
                            >
                                <div className="flex items-center justify-between">
                                    {/* Left: Dynamic Thumbnail + Info */}
                                    <div className="flex items-center gap-5">
                                        <VehicleImage
                                            make={v.make}
                                            model={v.model}
                                            vehicleType={v.vehicle_type}
                                            containerClassName="w-16 h-16 rounded-2xl overflow-hidden bg-[#141518] border border-white/10 group-hover:border-[#01FFFF]/40 group-hover:shadow-[0_0_20px_rgba(1,255,255,0.2)] transition shrink-0 flex items-center justify-center"
                                        />
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-lg font-bold text-white">{v.make} {v.model}</h3>
                                                {v.vehicle_type && (
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#01FFFF]/10 text-[#01FFFF] border border-[#01FFFF]/20 uppercase tracking-wider">
                                                        {v.vehicle_type.replace('_', ' ')}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-gray-400 text-xs font-mono font-bold uppercase tracking-widest mt-1">
                                                {v.plate}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Right: Action Buttons */}
                                    <div className="flex items-center gap-2 ml-4">
                                        <button
                                            onClick={() => handleEditClick(v)}
                                            title="Edit vehicle"
                                            className="p-2.5 rounded-xl border border-white/10 bg-white/5 text-gray-400 hover:text-[#01FFFF] hover:border-[#01FFFF]/30 hover:bg-[#01FFFF]/10 transition cursor-pointer"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteVehicle(v.id!)}
                                            title="Remove vehicle"
                                            className="p-2.5 rounded-xl border border-white/10 bg-white/5 text-gray-400 hover:text-red-400 hover:border-red-400/30 hover:bg-red-400/10 transition cursor-pointer"
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
