import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Car, MapPin, Calendar, Clock, Award, CreditCard, ChevronRight, Plus } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Vehicle } from './types';

export interface SlotInfo {
    time: string;
    is_available: boolean;
}

interface BookingWizardProps {
    setIsBooking: (val: boolean) => void;
    myVehicles: Vehicle[];
}

export function BookingWizard({ setIsBooking, myVehicles }: BookingWizardProps) {
    const [bookingStep, setBookingStep] = useState(1);
    const [vehiclesList, setVehiclesList] = useState<Vehicle[]>(myVehicles);

    const today = new Date().toISOString().split('T')[0];

    const [selectedDate, setSelectedDate] = useState<string>(today);
    const [availableSlots, setAvailableSlots] = useState<SlotInfo[]>([]);
    const [isLoadingSlots, setIsLoadingSlots] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<string>('');

    // Step 1 States
    const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
    const [selectedPackage, setSelectedPackage] = useState<any>(null);
    const [servicePackages, setServicePackages] = useState<any[]>([]);

    // Add Vehicle Modal States
    const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false);
    const [newVehicleForm, setNewVehicleForm] = useState({ make: '', model: '', plate: '' });
    const [isSavingVehicle, setIsSavingVehicle] = useState(false);

    useEffect(() => {
        setVehiclesList(myVehicles);
    }, [myVehicles]);

    // Auto-select single vehicle if only one exists in garage
    useEffect(() => {
        if (vehiclesList.length === 1 && !selectedVehicle) {
            setSelectedVehicle(vehiclesList[0]);
        }
    }, [vehiclesList, selectedVehicle]);

    const handleAddVehicleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newVehicleForm.make || !newVehicleForm.model || !newVehicleForm.plate) {
            toast.error("Please fill in Make, Model, and Plate Number.");
            return;
        }
        setIsSavingVehicle(true);
        try {
            const payload = {
                make: newVehicleForm.make,
                model: newVehicleForm.model,
                plate_number: newVehicleForm.plate,
            };
            const res = await api.post('/customer-vehicles/', payload);
            const created = res.data;
            const newVehicle: Vehicle = {
                id: created.id,
                make: created.make,
                model: created.model,
                plate: created.plate_number,
            };
            setVehiclesList(prev => [...prev, newVehicle]);
            setSelectedVehicle(newVehicle);
            setNewVehicleForm({ make: '', model: '', plate: '' });
            setIsAddVehicleOpen(false);
            toast.success("Vehicle successfully added to your garage!");
        } catch (err: any) {
            console.error("Vehicle registration error:", err);
            const errMsg = err.response?.data ? (typeof err.response.data === 'string' ? err.response.data : JSON.stringify(err.response.data)) : err.message;
            toast.error("Failed to register vehicle: " + errMsg);
        } finally {
            setIsSavingVehicle(false);
        }
    };

    const isSlotPassed = (timeStr: string) => {
        if (!selectedDate || selectedDate !== today) return false;
        
        const currentHour = new Date().getHours();
        const parts = timeStr.trim().split(' ');
        if (parts.length < 2) return false;
        
        let [hourStr] = parts[0].split(':');
        let hour = parseInt(hourStr, 10);
        const meridiem = parts[1].toUpperCase();
        
        if (meridiem === 'PM' && hour !== 12) hour += 12;
        if (meridiem === 'AM' && hour === 12) hour = 0;
        
        return hour <= currentHour;
    };

    useEffect(() => {
        const fetchPackages = async () => {
            try {
                const res = await api.get('/service-packages/'); 
                setServicePackages(res.data);
            } catch (error) {
                console.error("Failed to fetch packages", error);
            }
        };
        fetchPackages();
    }, []);

    useEffect(() => {
        const fetchSlots = async () => {
            if (!selectedDate) {
                setAvailableSlots([]);
                return;
            }
            setIsLoadingSlots(true);
            try {
                const res = await api.get(`/bookings/available_slots/`, { params: { date: selectedDate } });
                const rawSlots = res.data.slots || [];
                const formattedSlots: SlotInfo[] = rawSlots.map((item: any) => {
                    if (typeof item === 'string') {
                        return { time: item, is_available: true };
                    }
                    return {
                        time: item.time,
                        is_available: Boolean(item.is_available)
                    };
                });
                setAvailableSlots(formattedSlots);
            } catch (err) {
                console.error("Failed to fetch slots", err);
                setAvailableSlots([]);
            } finally {
                setIsLoadingSlots(false);
            }
        };
        fetchSlots();
    }, [selectedDate]);

    const slideVariants = {
        enter: (direction: number) => ({ x: direction > 0 ? 50 : -50, opacity: 0 }),
        center: { x: 0, opacity: 1 },
        exit: (direction: number) => ({ x: direction < 0 ? 50 : -50, opacity: 0 })
    };
    
    // 1 is forward, -1 is backwards
    const [direction, setDirection] = useState(1);

    const nextStep = async () => {
        setDirection(1);
        
        // Strict Validation Checkpoints
        if (bookingStep === 1) {
            if (!selectedVehicle || !selectedVehicle.id) {
                toast.error("Please select a valid vehicle from your garage.");
                return;
            }
            if (!selectedPackage || !selectedPackage.id) {
                toast.error("Please select a Service Package.");
                return;
            }
            setBookingStep(2);
        } 
        else if (bookingStep === 2) {
            if (!selectedDate || !selectedSlot) {
                toast.error("Please select a Date and an available Time Slot.");
                return;
            }
            setBookingStep(3);
        } 
        else if (bookingStep === 3) {
            if (!selectedVehicle?.id || !selectedPackage?.id || !selectedDate || !selectedSlot) {
                toast.error("Some booking details are missing. Please re-select your vehicle and package.");
                return;
            }
            try {
                const [timeStr, period] = selectedSlot.split(' ');
                let [hours, minutes] = timeStr.split(':');
                let hInt = parseInt(hours, 10);
                if (period === 'PM' && hInt !== 12) hInt += 12;
                if (period === 'AM' && hInt === 12) hInt = 0;
                
                const [y, m, d] = selectedDate.split('-');
                const timeSlotDate = new Date(parseInt(y), parseInt(m)-1, parseInt(d), hInt, parseInt(minutes), 0);
                
                await api.post('/bookings/', {
                    vehicle: parseInt(selectedVehicle.id),
                    service_package: parseInt(selectedPackage.id),
                    time_slot: timeSlotDate.toISOString(),
                });
                
                toast.success("Booking successfully confirmed! We look forward to servicing your vehicle.");
                setTimeout(() => {
                    setIsBooking(false);
                    window.location.reload(); 
                }, 1200);
            } catch (err: any) {
                console.error("Booking submission error:", err);
                const errMsg = err.response?.data?.detail || err.response?.data?.error || (typeof err.response?.data === 'string' ? err.response.data : JSON.stringify(err.response?.data || err.message));
                toast.error("Failed to confirm booking: " + errMsg);
            }
        }
    };

    const prevStep = () => {
        setDirection(-1);
        if (bookingStep > 1) setBookingStep(s => s - 1);
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 sm:p-8 animate-[fadeIn_0.3s_ease-out]">
            <div className="w-full max-w-2xl bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] flex flex-col h-[90vh] sm:h-auto sm:max-h-[90vh] overflow-hidden shadow-[0_0_100px_rgba(229,35,35,0.1)]">
                
                {/* Header */}
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                    <h2 className="text-lg font-bold tracking-wider uppercase">Book Your Wash</h2>
                    <button onClick={() => setIsBooking(false)} className="bg-white/10 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-spa-sky hover:text-slate-950 transition" aria-label="Close wizard">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-x-hidden overflow-y-auto p-6 sm:p-10 relative">
                    <AnimatePresence mode="wait" custom={direction}>
                        
                        {/* Step 1: Vehicle & Service */}
                        {bookingStep === 1 && (
                            <motion.div
                                key="step1"
                                custom={direction}
                                variants={slideVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{ duration: 0.3, ease: "easeInOut" }}
                            >
                                <h3 className="text-2xl font-bold mb-6">1. Select Vehicle & Package</h3>
                                <div className="flex justify-between items-center mb-3">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block">Select Vehicle</label>
                                    <button 
                                        type="button" 
                                        onClick={() => setIsAddVehicleOpen(true)}
                                        className="text-xs font-extrabold text-slate-950 bg-spa-sky hover:bg-[#6FA8C8] px-3.5 py-2 min-h-[44px] rounded-xl flex items-center gap-1.5 transition active:scale-95 shadow-[0_0_15px_rgba(135,189,216,0.3)]"
                                    >
                                        <Plus className="w-4 h-4 text-slate-950" /> Add Vehicle
                                    </button>
                                </div>

                                {vehiclesList.length === 0 ? (
                                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center space-y-3 mb-8">
                                        <div className="w-12 h-12 rounded-full bg-spa-sky/20 border border-spa-sky/40 text-spa-sky flex items-center justify-center mx-auto">
                                            <Car className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-base text-white">No vehicles found in your garage</h4>
                                            <p className="text-xs text-gray-400 mt-1">Click "+ Add Vehicle" above to register your car and proceed.</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-4 mb-8">
                                        {vehiclesList.map((v, index) => (
                                            <div 
                                                key={v.id || v.plate || index} 
                                                onClick={() => setSelectedVehicle(v)}
                                                className={`border p-4 min-h-[44px] rounded-2xl cursor-pointer transition text-center flex flex-col items-center justify-center ${
                                                    (selectedVehicle?.id === v.id || selectedVehicle?.plate === v.plate)
                                                    ? 'border-spa-sky bg-spa-sky/20 shadow-[0_0_15px_rgba(135,189,216,0.3)] text-white'
                                                    : 'border-white/20 bg-white/5 hover:border-spa-sky'
                                                }`}
                                            >
                                                <Car className={`mx-auto mb-2 ${selectedVehicle?.id === v.id || selectedVehicle?.plate === v.plate ? 'text-spa-sky' : 'text-gray-400'}`} />
                                                <p className="font-bold text-sm">{v.model}</p>
                                                {v.plate && <span className="text-[10px] text-gray-400 uppercase tracking-widest mt-0.5">{v.plate}</span>}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 block">Select Package</label>
                                <div className="space-y-3">
                                    {servicePackages.map(pkg => (
                                        <div 
                                            key={pkg.id} 
                                            onClick={() => setSelectedPackage(pkg)}
                                            className={`border p-4 min-h-[44px] rounded-2xl cursor-pointer transition flex justify-between items-center ${
                                                selectedPackage?.id === pkg.id 
                                                ? 'border-spa-sky bg-spa-sky/20 shadow-[0_0_15px_rgba(135,189,216,0.3)]'
                                                : 'border-white/20 bg-white/5 hover:border-spa-sky'
                                            }`}
                                        >
                                            <div>
                                                <span className="font-bold block text-sm sm:text-base">{pkg.name}</span>
                                                <span className="text-xs text-spa-sky font-bold">₹{parseFloat(pkg.price)}</span>
                                            </div>
                                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${selectedPackage?.id === pkg.id ? 'border-spa-sky bg-spa-sky' : 'border-gray-500'}`}>
                                                {selectedPackage?.id === pkg.id && <div className="w-2 h-2 rounded-full bg-slate-950" />}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {/* Step 2: Date & Time */}
                        {bookingStep === 2 && (
                            <motion.div
                                key="step2"
                                custom={direction}
                                variants={slideVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{ duration: 0.3, ease: "easeInOut" }}
                            >
                                <h3 className="text-2xl font-bold mb-6">2. Choose Date & Time</h3>
                                <div className="space-y-6">
                                    <div>
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2"><Calendar className="w-4 h-4 text-spa-sky" /> Date</label>
                                        <input 
                                            type="date" 
                                            min={today}
                                            value={selectedDate}
                                            onChange={(e) => {
                                                setSelectedDate(e.target.value);
                                                setSelectedSlot(''); // Reset selected time
                                            }}
                                            className="w-full min-h-[44px] bg-white/5 border border-white/10 p-4 rounded-xl text-white outline-none [color-scheme:dark]" 
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2"><Clock className="w-4 h-4 text-spa-sky" /> Available Time Slots</label>
                                        {isLoadingSlots ? (
                                            <div className="text-center py-8 text-spa-sky font-bold uppercase tracking-widest text-xs animate-pulse">
                                                Loading available time slots...
                                            </div>
                                        ) : !selectedDate ? (
                                            <div className="text-center py-8 text-gray-400 font-bold uppercase tracking-widest text-xs">
                                                Select a date to view available time slots.
                                            </div>
                                        ) : availableSlots.length === 0 ? (
                                            <div className="text-center py-8 text-spa-sky font-bold uppercase tracking-widest text-xs">
                                                No time slots available for this date.
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-3 gap-4">
                                                {availableSlots.map(slot => {
                                                    const timeStr = typeof slot === 'string' ? slot : slot.time;
                                                    const isAvailable = typeof slot === 'string' ? !isSlotPassed(timeStr) : slot.is_available;
                                                    const isDisabled = !isAvailable;

                                                    return (
                                                        <button 
                                                            key={timeStr}
                                                            type="button"
                                                            disabled={isDisabled}
                                                            onClick={() => { if (!isDisabled) setSelectedSlot(timeStr); }}
                                                            className={`border p-3.5 min-h-[44px] rounded-xl transition text-center font-bold text-sm flex items-center justify-center ${
                                                                isDisabled 
                                                                ? 'opacity-50 cursor-not-allowed border-white/10 bg-white/5 text-gray-500'
                                                                : selectedSlot === timeStr 
                                                                ? 'cursor-pointer border-spa-sky bg-spa-sky text-slate-950 font-extrabold shadow-[0_0_15px_rgba(135,189,216,0.4)]' 
                                                                : 'cursor-pointer border-white/20 bg-white/5 hover:border-white/50 text-gray-300'
                                                            }`}
                                                        >
                                                            {timeStr}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* Step 3: Checkout */}
                        {bookingStep === 3 && (
                            <motion.div
                                key="step3"
                                custom={direction}
                                variants={slideVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{ duration: 0.3, ease: "easeInOut" }}
                            >
                                <h3 className="text-2xl font-bold mb-6">3. Review & Confirm</h3>
                                
                                <div className="bg-[#1a1a1a] border border-white/10 p-6 rounded-3xl space-y-4">
                                    <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4 border-b border-white/5 pb-2">Booking Summary</h4>
                                    
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-400">Vehicle</span>
                                        <span className="font-bold">{selectedVehicle?.plate || selectedVehicle?.model || 'None'}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-400">Package</span>
                                        <span className="font-bold">{selectedPackage?.name || 'None'}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-400">Date</span>
                                        <span className="font-bold">{selectedDate || 'None'}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm pb-4 border-b border-white/5">
                                        <span className="text-gray-400">Arrival Time</span>
                                        <span className="font-bold text-spa-sky">{selectedSlot || 'None'}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-base pt-2">
                                        <span className="font-bold tracking-widest uppercase">Total Due On Site</span>
                                        <span className="font-bold text-xl text-spa-mint">₹{selectedPackage ? parseFloat(selectedPackage.price) : 0}</span>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                        
                    </AnimatePresence>
                </div>

                {/* Sticky Action Bar */}
                <div className="sticky bottom-0 left-0 right-0 z-30 p-4 sm:p-6 bg-spa-ice/90 backdrop-blur-xl border-t border-white/10 flex gap-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
                    {bookingStep > 1 && (
                        <button 
                            onClick={prevStep} 
                            className="min-h-[44px] min-w-[44px] px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-white/10 active:scale-95 transition border border-white/20 text-white flex items-center justify-center"
                        >
                            Back
                        </button>
                    )}
                    <button 
                        onClick={nextStep} 
                        className={`flex-1 min-h-[44px] py-3 rounded-xl font-extrabold text-xs sm:text-sm uppercase tracking-widest transition-all active:scale-[0.98] flex justify-center items-center gap-2 ${
                            bookingStep === 3 
                            ? 'bg-spa-mint hover:bg-[#C2E0DA] text-slate-950 shadow-[0_0_20px_rgba(218,235,232,0.4)]' 
                            : 'bg-spa-sky hover:bg-[#6FA8C8] text-slate-950 shadow-[0_0_20px_rgba(135,189,216,0.4)]'
                        }`}
                    >
                        {bookingStep === 3 ? 'Confirm Booking (Pay on Arrival)' : 'Proceed'} <ChevronRight className="w-5 h-5 text-slate-950" />
                    </button>
                </div>

            </div>

            {/* Inline Add Vehicle Modal Overlay */}
            <AnimatePresence>
                {isAddVehicleOpen && (
                    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className="bg-[#0f0f0f] border border-white/10 p-6 sm:p-8 rounded-3xl w-full max-w-md shadow-2xl relative"
                        >
                            <div className="flex justify-between items-center mb-6 pb-3 border-b border-white/10">
                                <div>
                                    <h3 className="text-lg font-bold uppercase tracking-wider text-white">Register New Vehicle</h3>
                                    <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-0.5 font-semibold">Add car to your garage for instant selection</p>
                                </div>
                                <button 
                                    type="button" 
                                    onClick={() => setIsAddVehicleOpen(false)}
                                    className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition"
                                    aria-label="Close modal"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            
                            <form onSubmit={handleAddVehicleSubmit} className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 block">Make (e.g. BMW, Toyota)</label>
                                    <input 
                                        required
                                        type="text"
                                        placeholder="e.g. BMW"
                                        value={newVehicleForm.make}
                                        onChange={e => setNewVehicleForm({ ...newVehicleForm, make: e.target.value })}
                                        className="w-full min-h-[44px] bg-white/5 border border-white/10 px-4 py-3 rounded-xl text-white outline-none focus:border-spa-sky transition"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 block">Model (e.g. M3, Camry)</label>
                                    <input 
                                        required
                                        type="text"
                                        placeholder="e.g. M3 Series"
                                        value={newVehicleForm.model}
                                        onChange={e => setNewVehicleForm({ ...newVehicleForm, model: e.target.value })}
                                        className="w-full min-h-[44px] bg-white/5 border border-white/10 px-4 py-3 rounded-xl text-white outline-none focus:border-spa-sky transition"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 block">Plate Number</label>
                                    <input 
                                        required
                                        type="text"
                                        placeholder="e.g. KL-10-XX-1234"
                                        value={newVehicleForm.plate}
                                        onChange={e => setNewVehicleForm({ ...newVehicleForm, plate: e.target.value })}
                                        className="w-full min-h-[44px] bg-white/5 border border-white/10 px-4 py-3 rounded-xl text-white outline-none focus:border-spa-sky transition uppercase"
                                    />
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsAddVehicleOpen(false)}
                                        className="flex-1 min-h-[44px] py-3 border border-white/20 rounded-xl text-white font-bold text-xs uppercase tracking-widest hover:bg-white/10 transition"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSavingVehicle}
                                        className="flex-1 min-h-[44px] py-3 bg-spa-sky text-slate-950 font-extrabold text-xs uppercase tracking-widest rounded-xl hover:bg-[#6FA8C8] active:scale-95 transition disabled:opacity-50 shadow-[0_0_20px_rgba(135,189,216,0.4)]"
                                    >
                                        {isSavingVehicle ? 'Saving...' : 'Add & Select'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
