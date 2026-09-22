import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Car, Calendar, Clock, ChevronRight, Plus, Loader2, CheckCircle2, Sparkles } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Vehicle } from './types';
import { SmartVehicleSelector } from '@/components/ui/smart-vehicle-selector';
import { VehicleImage } from '@/components/ui/VehicleImage';
import { VehicleType } from '@/types/database';
import { resolvePackagePriceForVehicle } from '@/lib/logic/booking';
import { normalizeVehicleType } from '@/lib/vehicleCatalog';

export interface SlotInfo {
    time: string;
    is_available: boolean;
    is_booked?: boolean;
    is_past?: boolean;
    reason?: 'PAST' | 'BOOKED' | null;
}

interface BookingWizardProps {
    setIsBooking: (val: boolean) => void;
    myVehicles: Vehicle[];
    initialVehicle?: Vehicle | null;
    initialPackage?: any | null;
}

// 1-Hour Minimum Interval Operational Slots (09:00 AM - 07:00 PM)
const DEFAULT_1HOUR_SLOTS = [
    '09:00 AM',
    '10:00 AM',
    '11:00 AM',
    '12:00 PM',
    '01:00 PM',
    '02:00 PM',
    '03:00 PM',
    '04:00 PM',
    '05:00 PM',
    '06:00 PM',
    '07:00 PM',
];

export function BookingWizard({ setIsBooking, myVehicles, initialVehicle, initialPackage }: BookingWizardProps) {
    const [bookingStep, setBookingStep] = useState(1);
    const [vehiclesList, setVehiclesList] = useState<Vehicle[]>(myVehicles);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const getTodayDateStr = () => {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    };

    const today = getTodayDateStr();

    const [selectedDate, setSelectedDate] = useState<string>(today);
    const [availableSlots, setAvailableSlots] = useState<SlotInfo[]>([]);
    const [isLoadingSlots, setIsLoadingSlots] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<string>('');

    // Step 1 States
    const [selectedVehicle, setSelectedVehicle] = useState<any>(initialVehicle || null);
    const [selectedPackage, setSelectedPackage] = useState<any>(initialPackage || null);
    const [servicePackages, setServicePackages] = useState<any[]>([]);
    const [isLoadingPackages, setIsLoadingPackages] = useState(false);

    // Add Vehicle Modal States
    const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false);
    const [newVehicleForm, setNewVehicleForm] = useState<{
        make: string;
        model: string;
        plate: string;
        vehicle_type: VehicleType;
    }>({ 
        make: '', 
        model: '', 
        plate: '', 
        vehicle_type: 'HATCHBACK' 
    });
    const [isSavingVehicle, setIsSavingVehicle] = useState(false);

    useEffect(() => {
        setVehiclesList(myVehicles);
    }, [myVehicles]);

    useEffect(() => {
        if (initialVehicle) {
            setSelectedVehicle(initialVehicle);
        }
    }, [initialVehicle]);

    useEffect(() => {
        if (initialPackage) {
            setSelectedPackage(initialPackage);
        }
    }, [initialPackage]);

    // Auto-select single vehicle if only one exists in garage
    useEffect(() => {
        if (vehiclesList.length === 1 && !selectedVehicle && !initialVehicle) {
            setSelectedVehicle(vehiclesList[0]);
        }
    }, [vehiclesList, selectedVehicle, initialVehicle]);

    const handleAddVehicleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const cleanPlate = newVehicleForm.plate.trim().toUpperCase();
        if (!newVehicleForm.make || !newVehicleForm.model || !cleanPlate) {
            toast.error("Please fill in Make, Model, and Plate Number.");
            return;
        }
        setIsSavingVehicle(true);
        try {
            const payload = {
                make: newVehicleForm.make,
                model: newVehicleForm.model,
                plate_number: cleanPlate,
                plate: cleanPlate,
                vehicle_type: newVehicleForm.vehicle_type || 'HATCHBACK',
            };
            const res = await api.post('/customer-vehicles', payload);
            const created = res.data?.vehicle || res.data?.data || res.data;
            const newVehicle: Vehicle = {
                id: created.id,
                make: created.make,
                model: created.model,
                plate: created.plate_number || created.plate || cleanPlate,
                vehicle_type: created.vehicle_type || newVehicleForm.vehicle_type,
            };
            setVehiclesList(prev => [...prev, newVehicle]);
            setSelectedVehicle(newVehicle);
            setNewVehicleForm({ make: '', model: '', plate: '', vehicle_type: 'HATCHBACK' });
            setIsAddVehicleOpen(false);
            toast.success("Vehicle successfully added to your garage!");
        } catch (err: any) {
            console.error("Vehicle registration error:", err);
            const errMsg = err.response?.data
                ? (typeof err.response.data === 'string' ? err.response.data : err.response.data.error || JSON.stringify(err.response.data))
                : err.message;
            toast.error("Failed to register vehicle: " + errMsg);
        } finally {
            setIsSavingVehicle(false);
        }
    };

    /**
     * Strict Local Past Time Checker
     * Returns true if the slot on selectedDate has already passed compared to current local Date()
     */
    const isSlotInPast = useCallback((dateStr: string, timeStr: string): boolean => {
        if (!dateStr || !timeStr) return false;
        const now = new Date();
        const curYear = now.getFullYear();
        const curMonth = String(now.getMonth() + 1).padStart(2, '0');
        const curDay = String(now.getDate()).padStart(2, '0');
        const curDateStr = `${curYear}-${curMonth}-${curDay}`;

        if (dateStr < curDateStr) return true;
        if (dateStr > curDateStr) return false;

        // Same day: evaluate hour & minute
        const parts = timeStr.trim().split(' ');
        if (parts.length < 2) return false;

        const [hStr, mStr] = parts[0].split(':');
        let hour = parseInt(hStr, 10);
        const minute = parseInt(mStr || '0', 10);
        const meridiem = parts[1].toUpperCase();

        if (meridiem === 'PM' && hour !== 12) hour += 12;
        if (meridiem === 'AM' && hour === 12) hour = 0;

        const [y, m, d] = dateStr.split('-').map(Number);
        const slotDate = new Date(y, m - 1, d, hour, minute, 0);

        return slotDate.getTime() <= now.getTime();
    }, []);

    // 1. Dynamic Service Packages Fetching by Vehicle Body Type (Zero Hardcoded Fallbacks)
    useEffect(() => {
        const fetchPackages = async () => {
            setIsLoadingPackages(true);
            try {
                const rawVType = (selectedVehicle as any)?.vehicle_type || (selectedVehicle as any)?.type || '';
                const vType = rawVType ? normalizeVehicleType(rawVType) : '';
                const endpoint = vType ? `/services?vehicle_type=${encodeURIComponent(vType)}` : '/services';
                const res = await api.get(endpoint, { 
                    headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
                });
                const raw = res.data;

                const pkgs = Array.isArray(raw?.data)
                    ? raw.data
                    : (Array.isArray(raw)
                        ? raw
                        : (Array.isArray(raw?.results) ? raw.results : []));

                setServicePackages(pkgs);

                // Auto-sync and update selectedPackage price based on newly selected vehicle's vehicle_type without breaking selection
                setSelectedPackage((prevSelected: any) => {
                    if (!prevSelected) return null;
                    const matched = pkgs.find((p: any) => p.id === prevSelected.id);
                    if (matched) {
                        return {
                            ...matched,
                            price: matched.resolved_price ?? matched.price,
                            final_price: matched.resolved_price ?? matched.price,
                        };
                    }
                    const dynamicPrice = resolvePackagePriceForVehicle(
                        prevSelected.price || prevSelected.base_price,
                        prevSelected.tiered_prices || prevSelected.service_package_prices,
                        vType
                    );
                    return {
                        ...prevSelected,
                        price: dynamicPrice,
                        final_price: dynamicPrice,
                    };
                });
            } catch (error) {
                console.error("Failed to fetch packages from Supabase", error);
                setServicePackages([]);
                toast.error("Failed to load service packages from database.");
            } finally {
                setIsLoadingPackages(false);
            }
        };

        fetchPackages();
    }, [selectedVehicle]);

    // 2. Dynamic Available Slots Fetching & Strict Time Validation
    useEffect(() => {
        const fetchSlots = async () => {
            if (!selectedDate) {
                setAvailableSlots([]);
                return;
            }
            setIsLoadingSlots(true);
            try {
                const res = await api.get('/bookings/available_slots', { params: { date: selectedDate } });
                const rawSlots: any[] = res.data?.slots || [];

                let formattedSlots: SlotInfo[] = [];

                if (rawSlots.length > 0) {
                    formattedSlots = rawSlots.map((item: any) => {
                        const timeStr = typeof item === 'string' ? item : item.time;
                        const isPast = isSlotInPast(selectedDate, timeStr);
                        const isBooked = item.is_booked === true || item.reason === 'BOOKED';
                        const isAvailable = Boolean(item.is_available) && !isPast && !isBooked;

                        return {
                            time: timeStr,
                            is_available: isAvailable,
                            is_booked: isBooked,
                            is_past: isPast,
                            reason: isPast ? 'PAST' : (isBooked ? 'BOOKED' : null),
                        };
                    });
                } else {
                    // Fallback to client-side evaluation of default 1-hour slots
                    formattedSlots = DEFAULT_1HOUR_SLOTS.map((slotStr) => {
                        const isPast = isSlotInPast(selectedDate, slotStr);
                        return {
                            time: slotStr,
                            is_available: !isPast,
                            is_booked: false,
                            is_past: isPast,
                            reason: isPast ? 'PAST' : null,
                        };
                    });
                }

                setAvailableSlots(formattedSlots);

                // If currently selected slot is invalid for the new date, reset it
                if (selectedSlot) {
                    const currentSelected = formattedSlots.find(s => s.time === selectedSlot);
                    if (!currentSelected || !currentSelected.is_available) {
                        setSelectedSlot('');
                    }
                }
            } catch (err) {
                console.error("Failed to fetch available slots", err);
                const fallbackSlots = DEFAULT_1HOUR_SLOTS.map((slotStr) => {
                    const isPast = isSlotInPast(selectedDate, slotStr);
                    return {
                        time: slotStr,
                        is_available: !isPast,
                        is_booked: false,
                        is_past: isPast,
                        reason: isPast ? ('PAST' as const) : null,
                    };
                });
                setAvailableSlots(fallbackSlots);
            } finally {
                setIsLoadingSlots(false);
            }
        };

        fetchSlots();
    }, [selectedDate, isSlotInPast]);

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
            if (!selectedDate) {
                toast.error("Please choose a valid booking date.");
                return;
            }
            if (!selectedSlot) {
                toast.error("Please select an available Time Slot.");
                return;
            }
            
            // Double check chosen slot is actually available and not in past
            const isPastNow = isSlotInPast(selectedDate, selectedSlot);
            const slotObj = availableSlots.find(s => s.time === selectedSlot);
            if (isPastNow || (slotObj && !slotObj.is_available)) {
                toast.error(`The selected time slot (${selectedSlot}) is ${isPastNow || slotObj?.reason === 'PAST' ? 'already in the past' : 'already booked'}. Please pick an available slot.`);
                return;
            }
            setBookingStep(3);
        } 
        else if (bookingStep === 3) {
            if (!selectedVehicle?.id || !selectedPackage?.id || !selectedDate || !selectedSlot) {
                toast.error("Some booking details are missing. Please re-select your vehicle and package.");
                return;
            }

            if (isSlotInPast(selectedDate, selectedSlot)) {
                toast.error(`The selected time slot (${selectedSlot}) has already passed. Please select a future time slot.`);
                setBookingStep(2);
                return;
            }

            setIsSubmitting(true);
            try {
                const parts = selectedSlot.trim().split(' ');
                const [timeStr, period] = parts;
                const [hours, minutes] = timeStr.split(':');
                let hInt = parseInt(hours, 10);
                if (period?.toUpperCase() === 'PM' && hInt !== 12) hInt += 12;
                if (period?.toUpperCase() === 'AM' && hInt === 12) hInt = 0;
                
                const [y, m, d] = selectedDate.split('-').map(Number);
                const timeSlotDate = new Date(y, m - 1, d, hInt, parseInt(minutes || '0', 10), 0);
                
                // Enforce 1-hour minimum wash duration rule
                const durationMinutes = Math.max(Number(selectedPackage.duration_minutes) || 60, 60);
                const endTimeDate = new Date(timeSlotDate.getTime() + durationMinutes * 60 * 1000);

                const canonicalVType = normalizeVehicleType(selectedVehicle?.vehicle_type);
                const finalPrice = selectedPackage
                    ? resolvePackagePriceForVehicle(
                        selectedPackage.price,
                        selectedPackage.tiered_prices || selectedPackage.service_package_prices,
                        canonicalVType
                    )
                    : 0;
                const basePrice = finalPrice > 0 ? finalPrice : parseFloat(selectedPackage.base_price || selectedPackage.price || 0);

                await api.post('/bookings', {
                    vehicle: parseInt(selectedVehicle.id, 10),
                    vehicle_id: parseInt(selectedVehicle.id, 10),
                    service_package: parseInt(selectedPackage.id, 10),
                    service_package_id: parseInt(selectedPackage.id, 10),
                    package_id: parseInt(selectedPackage.id, 10),
                    final_price: finalPrice,
                    base_price: basePrice,
                    time_slot: timeSlotDate.toISOString(),
                    start_time: timeSlotDate.toISOString(),
                    end_time: endTimeDate.toISOString(),
                    duration_minutes: durationMinutes,
                });
                
                toast.success("Booking successfully confirmed! We look forward to servicing your vehicle.");
                setTimeout(() => {
                    setIsBooking(false);
                    window.location.reload(); 
                }, 1200);
            } catch (err: any) {
                setIsSubmitting(false);
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
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 sm:p-8 animate-[fadeIn_0.3s_ease-out]">
            <div className="w-full max-w-2xl bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] flex flex-col h-[90vh] sm:h-auto sm:max-h-[90vh] overflow-hidden shadow-[0_0_100px_rgba(229,35,35,0.1)]">
                
                {/* Header */}
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                    <div>
                        <h2 className="text-lg font-bold tracking-wider uppercase text-white font-syncopate">Book Your Wash</h2>
                        <span className="text-[11px] font-semibold text-spa-sky tracking-widest uppercase">Step {bookingStep} of 3</span>
                    </div>
                    <button onClick={() => setIsBooking(false)} className="bg-white/10 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-spa-sky hover:text-slate-950 transition text-gray-300 cursor-pointer" aria-label="Close wizard">
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
                                <h3 className="text-2xl font-bold mb-6 text-white font-syncopate">1. Select Vehicle & Package</h3>
                                <div className="flex justify-between items-center mb-3">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block">Select Vehicle</label>
                                    <button 
                                        type="button" 
                                        onClick={() => setIsAddVehicleOpen(true)}
                                        className="text-xs font-extrabold text-slate-950 bg-spa-sky hover:bg-[#6FA8C8] px-3.5 py-2 min-h-[44px] rounded-xl flex items-center gap-1.5 transition active:scale-95 shadow-[0_0_15px_rgba(135,189,216,0.3)] cursor-pointer"
                                    >
                                        <Plus className="w-4 h-4 text-slate-950" /> Add Vehicle
                                    </button>
                                </div>

                                {vehiclesList.length === 0 ? (
                                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center space-y-3 mb-8">
                                        <div className="w-12 h-12 rounded-full bg-spa-sky/20 border border-spa-sky/40 text-spa-sky flex items-center justify-center mx-auto text-xl">
                                            <span>🚗</span>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-base text-white">No vehicles found in your garage</h4>
                                            <p className="text-xs text-gray-400 mt-1">Click "+ Add Vehicle" above to register your car and proceed.</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-4 mb-8">
                                        {vehiclesList.map((v, index) => {
                                            const isSelected = (selectedVehicle?.id === v.id || selectedVehicle?.plate === v.plate);
                                            return (
                                                <div 
                                                    key={v.id || v.plate || index} 
                                                    onClick={() => setSelectedVehicle(v)}
                                                    className={`border p-4 min-h-[44px] rounded-2xl cursor-pointer transition text-center flex flex-col items-center justify-center group ${
                                                        isSelected
                                                        ? 'border-spa-sky bg-spa-sky/20 shadow-[0_0_15px_rgba(135,189,216,0.3)] text-white'
                                                        : 'border-white/20 bg-white/5 hover:border-spa-sky text-gray-300'
                                                    }`}
                                                >
                                                    <VehicleImage 
                                                        make={v.make} 
                                                        model={v.model} 
                                                        vehicleType={v.vehicle_type} 
                                                        containerClassName="w-14 h-14 mx-auto mb-2 rounded-xl overflow-hidden bg-black/40 border border-white/10 flex items-center justify-center shrink-0" 
                                                    />
                                                    <p className="font-bold text-sm text-white">{v.make} {v.model}</p>
                                                    {v.plate && <span className="text-[10px] text-gray-400 font-mono font-bold uppercase tracking-widest mt-0.5">{v.plate}</span>}
                                                    {v.vehicle_type && (
                                                        <span className="text-[9px] px-2 py-0.5 mt-1.5 rounded-full bg-white/10 text-spa-sky font-semibold tracking-wider uppercase">
                                                            {v.vehicle_type.replace('_', ' ')}
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                <div className="flex justify-between items-center mb-3">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block">
                                        Select Package {selectedVehicle?.vehicle_type ? `(${selectedVehicle.vehicle_type.replace('_', ' ')} Tier)` : ''}
                                    </label>
                                    {isLoadingPackages && (
                                        <span className="text-xs text-spa-sky flex items-center gap-1">
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Syncing prices...
                                        </span>
                                    )}
                                </div>

                                <div className="space-y-3">
                                    {isLoadingPackages ? (
                                        <div className="space-y-3">
                                            {[1, 2, 3].map((i) => (
                                                <div key={i} className="border border-white/10 bg-white/5 p-4 rounded-2xl animate-pulse h-20 flex items-center justify-between">
                                                    <div className="space-y-2">
                                                        <div className="h-4 w-32 bg-white/10 rounded" />
                                                        <div className="h-3 w-20 bg-white/10 rounded" />
                                                    </div>
                                                    <div className="w-5 h-5 rounded-full bg-white/10" />
                                                </div>
                                            ))}
                                        </div>
                                    ) : servicePackages.length === 0 ? (
                                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center text-gray-400 text-xs">
                                            No active service packages found in the database.
                                        </div>
                                    ) : (
                                        servicePackages.map(pkg => {
                                            const effectivePrice = pkg.resolved_price ?? resolvePackagePriceForVehicle(
                                                pkg.price,
                                                pkg.tiered_prices || pkg.service_package_prices,
                                                selectedVehicle?.vehicle_type
                                            );
                                            const isSelected = selectedPackage?.id === pkg.id;

                                            return (
                                                <div 
                                                    key={pkg.id} 
                                                    onClick={() => setSelectedPackage({
                                                        ...pkg,
                                                        price: effectivePrice,
                                                        final_price: effectivePrice,
                                                    })}
                                                    className={`border p-4 min-h-[44px] rounded-2xl cursor-pointer transition flex justify-between items-center ${
                                                        isSelected 
                                                        ? 'border-spa-sky bg-spa-sky/20 shadow-[0_0_15px_rgba(135,189,216,0.3)]'
                                                        : 'border-white/20 bg-white/5 hover:border-spa-sky'
                                                    }`}
                                                >
                                                    <div>
                                                        <span className="font-bold block text-sm sm:text-base text-white">{pkg.name}</span>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="text-xs text-spa-sky font-bold">₹{effectivePrice.toLocaleString()}</span>
                                                            {pkg.duration_minutes && (
                                                                <span className="text-[10px] text-gray-400 font-medium">({pkg.duration_minutes} min)</span>
                                                            )}
                                                        </div>
                                                        {pkg.description && (
                                                            <p className="text-[11px] text-gray-400 mt-1 line-clamp-1">{pkg.description}</p>
                                                        )}
                                                    </div>
                                                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${isSelected ? 'border-spa-sky bg-spa-sky' : 'border-gray-500'}`}>
                                                        {isSelected && <div className="w-2 h-2 rounded-full bg-slate-950" />}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
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
                                <h3 className="text-2xl font-bold mb-6 text-white font-syncopate">2. Choose Date & Time</h3>
                                <div className="space-y-6">
                                    <div>
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-spa-sky" /> Select Booking Date
                                        </label>
                                        <input 
                                            type="date" 
                                            min={today}
                                            value={selectedDate}
                                            onChange={(e) => {
                                                setSelectedDate(e.target.value);
                                                setSelectedSlot(''); // Reset selected time
                                            }}
                                            className="w-full min-h-[44px] bg-white/5 border border-white/10 p-4 rounded-xl text-white outline-none focus:border-spa-sky transition [color-scheme:dark]" 
                                        />
                                    </div>
                                    <div>
                                        <div className="flex justify-between items-center mb-3">
                                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                                <Clock className="w-4 h-4 text-spa-sky" /> Time Slots (1-Hour Intervals)
                                            </label>
                                            {isLoadingSlots && (
                                                <span className="text-xs text-spa-sky flex items-center gap-1 font-semibold">
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking slot status...
                                                </span>
                                            )}
                                        </div>

                                        {isLoadingSlots ? (
                                            <div className="grid grid-cols-3 gap-3">
                                                {[1, 2, 3, 4, 5, 6].map((i) => (
                                                    <div key={i} className="h-12 bg-white/5 border border-white/10 rounded-xl animate-pulse" />
                                                ))}
                                            </div>
                                        ) : availableSlots.length === 0 ? (
                                            <div className="text-center py-8 text-spa-sky font-bold uppercase tracking-widest text-xs bg-white/5 rounded-2xl border border-white/10">
                                                No time slots available for this date.
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                                {availableSlots.map(slot => {
                                                    const timeStr = slot.time;
                                                    const isAvailable = slot.is_available;
                                                    const isDisabled = !isAvailable;
                                                    const isSelected = selectedSlot === timeStr;
                                                    const isBooked = slot.is_booked || slot.reason === 'BOOKED';
                                                    const isPast = slot.is_past || slot.reason === 'PAST';

                                                    return (
                                                        <button 
                                                            key={timeStr}
                                                            type="button"
                                                            disabled={isDisabled}
                                                            onClick={() => { 
                                                                if (!isDisabled) setSelectedSlot(timeStr); 
                                                            }}
                                                            className={`border p-3 min-h-[48px] rounded-xl transition text-center font-bold text-sm flex flex-col items-center justify-center relative ${
                                                                isDisabled 
                                                                ? 'opacity-40 cursor-not-allowed border-white/5 bg-white/[0.02] text-gray-500 select-none'
                                                                : isSelected 
                                                                ? 'cursor-pointer border-spa-sky bg-spa-sky text-slate-950 font-extrabold shadow-[0_0_15px_rgba(135,189,216,0.4)]' 
                                                                : 'cursor-pointer border-white/20 bg-white/5 hover:border-spa-sky text-gray-200'
                                                            }`}
                                                        >
                                                            <span>{timeStr}</span>
                                                            {isDisabled && (
                                                                <span className="text-[9px] uppercase tracking-wider font-semibold mt-0.5 text-gray-500">
                                                                    {isPast ? 'Passed' : (isBooked ? 'Booked' : 'Unavailable')}
                                                                </span>
                                                            )}
                                                            {isSelected && !isDisabled && (
                                                                <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-950 flex items-center gap-1 mt-0.5">
                                                                    <CheckCircle2 className="w-2.5 h-2.5" /> Selected
                                                                </span>
                                                            )}
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
                                <h3 className="text-2xl font-bold mb-6 text-white font-syncopate">3. Review & Confirm</h3>
                                
                                <div className="bg-[#1a1a1a] border border-white/10 p-6 rounded-3xl space-y-4">
                                    <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4 border-b border-white/5 pb-2">Booking Summary</h4>
                                    
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-400">Vehicle</span>
                                        <div className="flex items-center gap-2.5">
                                            <VehicleImage 
                                                make={selectedVehicle?.make}
                                                model={selectedVehicle?.model}
                                                vehicleType={selectedVehicle?.vehicle_type}
                                                containerClassName="w-8 h-8 rounded-lg overflow-hidden bg-black/60 border border-white/10 flex items-center justify-center shrink-0"
                                                iconClassName="w-4 h-4 text-spa-sky"
                                            />
                                            <span className="font-bold text-white">
                                                {selectedVehicle?.make} {selectedVehicle?.model} ({selectedVehicle?.plate || 'No Plate'})
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-400">Body Type Tier</span>
                                        <span className="font-semibold text-spa-sky uppercase text-xs tracking-wider px-2.5 py-0.5 rounded-full bg-spa-sky/10 border border-spa-sky/30">
                                            {selectedVehicle?.vehicle_type ? selectedVehicle.vehicle_type.replace('_', ' ') : 'STANDARD'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-400">Service Package</span>
                                        <span className="font-bold text-white">{selectedPackage?.name || 'None'}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-400">Date</span>
                                        <span className="font-bold text-white">{selectedDate || 'None'}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm pb-4 border-b border-white/5">
                                        <span className="text-gray-400">Arrival Time</span>
                                        <span className="font-bold text-spa-sky">{selectedSlot || 'None'}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-base pt-2">
                                        <span className="font-bold tracking-widest uppercase text-white">Total Due On Site</span>
                                        <span className="font-bold text-xl text-spa-mint">
                                            ₹{selectedPackage ? (
                                                selectedPackage.resolved_price ??
                                                selectedPackage.final_price ??
                                                resolvePackagePriceForVehicle(
                                                    selectedPackage.price,
                                                    selectedPackage.tiered_prices || selectedPackage.service_package_prices,
                                                    selectedVehicle?.vehicle_type
                                                )
                                            ).toLocaleString() : 0}
                                        </span>
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
                            type="button" 
                            onClick={prevStep} 
                            disabled={isSubmitting}
                            className="min-h-[44px] min-w-[44px] px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-white/10 active:scale-95 transition border border-white/20 text-white flex items-center justify-center disabled:opacity-50 cursor-pointer"
                        >
                            Back
                        </button>
                    )}
                    <button 
                        type="button" 
                        onClick={nextStep} 
                        disabled={isSubmitting}
                        className={`flex-1 min-h-[44px] py-3 rounded-xl font-extrabold text-xs sm:text-sm uppercase tracking-widest transition-all active:scale-[0.98] flex justify-center items-center gap-2 disabled:opacity-50 cursor-pointer ${
                            bookingStep === 3 
                            ? 'bg-spa-mint hover:bg-[#C2E0DA] text-slate-950 shadow-[0_0_20px_rgba(218,235,232,0.4)]' 
                            : 'bg-spa-sky hover:bg-[#6FA8C8] text-slate-950 shadow-[0_0_20px_rgba(135,189,216,0.4)]'
                        }`}
                    >
                        {isSubmitting ? (
                            <span className="flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" /> Confirming...
                            </span>
                        ) : (
                            <>
                                {bookingStep === 3 ? 'Book & Pay at Shop' : 'Proceed'} <ChevronRight className="w-5 h-5 text-slate-950" />
                            </>
                        )}
                    </button>
                </div>

            </div>

            {/* Inline Add Vehicle Modal Overlay */}
            <AnimatePresence>
                {isAddVehicleOpen && (
                    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto overscroll-contain">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className="bg-[#0f0f0f] border border-white/10 p-5 sm:p-6 rounded-3xl w-full max-w-md shadow-2xl relative max-h-[90dvh] overflow-y-auto overscroll-contain flex flex-col my-auto"
                        >
                            <div className="flex justify-between items-center mb-4 pb-2.5 border-b border-white/10 shrink-0">
                                <div>
                                    <h3 className="text-base sm:text-lg font-bold uppercase tracking-wider text-white font-syncopate">Register New Vehicle</h3>
                                    <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-0.5 font-semibold">Add vehicle to your garage for instant selection</p>
                                </div>
                                <button 
                                    type="button" 
                                    onClick={() => setIsAddVehicleOpen(false)}
                                    className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition cursor-pointer"
                                    aria-label="Close modal"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            
                            <form onSubmit={handleAddVehicleSubmit} className="space-y-4 flex-1 overflow-y-auto pr-1">
                                <SmartVehicleSelector
                                    initialMake={newVehicleForm.make}
                                    initialModel={newVehicleForm.model}
                                    initialBodyType={newVehicleForm.vehicle_type}
                                    onVehicleChange={(vData) => {
                                        setNewVehicleForm(prev => {
                                            if (prev.make === vData.make && prev.model === vData.model && prev.vehicle_type === vData.vehicle_type) {
                                                return prev;
                                            }
                                            return {
                                                ...prev,
                                                make: vData.make,
                                                model: vData.model,
                                                vehicle_type: vData.vehicle_type
                                            };
                                        });
                                    }}
                                />

                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 block">License Plate Number</label>
                                    <input 
                                        required
                                        type="text"
                                        placeholder="e.g. KL 10 AV 1234"
                                        value={newVehicleForm.plate}
                                        onChange={e => setNewVehicleForm({ ...newVehicleForm, plate: e.target.value.toUpperCase() })}
                                        className="w-full min-h-[44px] bg-[#141518] border border-white/10 px-4 py-3 rounded-xl text-white outline-none focus:border-spa-sky transition uppercase font-mono font-bold tracking-wider"
                                    />
                                </div>

                                <div className="flex gap-3 pt-4 sticky bottom-0 bg-[#0f0f0f] pb-1">
                                    <button
                                        type="button"
                                        onClick={() => setIsAddVehicleOpen(false)}
                                        className="flex-1 min-h-[44px] py-3 border border-white/20 rounded-xl text-white font-bold text-xs uppercase tracking-widest hover:bg-white/10 transition cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSavingVehicle}
                                        className="flex-1 min-h-[44px] py-3 bg-spa-sky text-slate-950 font-extrabold text-xs uppercase tracking-widest rounded-xl hover:bg-[#6FA8C8] active:scale-95 transition disabled:opacity-50 shadow-[0_0_20px_rgba(135,189,216,0.4)] cursor-pointer"
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
