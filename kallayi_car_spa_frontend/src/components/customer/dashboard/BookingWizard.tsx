import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Car, MapPin, Calendar, Clock, Award, CreditCard, ChevronRight } from 'lucide-react';
import api from '@/lib/api';
import { Vehicle } from './types';

interface BookingWizardProps {
    setIsBooking: (val: boolean) => void;
    myVehicles: Vehicle[];
}

export function BookingWizard({ setIsBooking, myVehicles }: BookingWizardProps) {
    const [bookingStep, setBookingStep] = useState(1);

    const [selectedDate, setSelectedDate] = useState<string>('');
    const [availableSlots, setAvailableSlots] = useState<string[]>([]);
    const [isLoadingSlots, setIsLoadingSlots] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<string>('');

    // Step 1 States
    const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
    const [selectedPackage, setSelectedPackage] = useState<any>(null);
    const [servicePackages, setServicePackages] = useState<any[]>([]);

    const today = new Date().toISOString().split('T')[0];

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
                setAvailableSlots(res.data.slots || []);
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
        if (bookingStep < 3) {
            setBookingStep(s => s + 1);
        } else {
            if (!selectedVehicle || !selectedPackage || !selectedDate || !selectedSlot) {
                alert("Please complete Target Parameters and Temporal Coordinates.");
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
                    vehicle: selectedVehicle.id,
                    service_package: selectedPackage.id,
                    time_slot: timeSlotDate.toISOString(),
                });
                
                alert("Booking successfully queued!");
                setIsBooking(false);
                window.location.reload(); 
            } catch (err: any) {
                console.error("Booking submission error:", err);
                alert("Failed to confirm booking: " + JSON.stringify(err.response?.data || err.message));
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
                    <h2 className="text-lg font-bold tracking-[0.2em] uppercase">Sys // Initialize Protocol</h2>
                    <button onClick={() => setIsBooking(false)} className="bg-white/10 p-2 rounded-full hover:bg-[#E52323] hover:text-white transition">
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
                                <h3 className="text-2xl font-bold mb-6">1. Target Parameters</h3>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 block">Select Vehicle</label>
                                <div className="grid grid-cols-2 gap-4 mb-8">
                                    {myVehicles.map((v, index) => (
                                        <div 
                                            key={v.id || v.plate || index} 
                                            onClick={() => setSelectedVehicle(v)}
                                            className={`border p-4 rounded-2xl cursor-pointer transition text-center ${
                                                (selectedVehicle?.id === v.id || selectedVehicle?.plate === v.plate)
                                                ? 'border-[#E52323] bg-[#E52323]/20 shadow-[0_0_15px_rgba(229,35,35,0.4)]'
                                                : 'border-white/20 bg-white/5 hover:border-[#E52323]'
                                            }`}
                                        >
                                            <Car className="mx-auto mb-2 text-gray-400" />
                                            <p className="font-bold text-sm">{v.model}</p>
                                        </div>
                                    ))}
                                </div>

                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 block">Select Package</label>
                                <div className="space-y-3">
                                    {servicePackages.map(pkg => (
                                        <div 
                                            key={pkg.id} 
                                            onClick={() => setSelectedPackage(pkg)}
                                            className={`border p-4 rounded-2xl cursor-pointer transition flex justify-between items-center ${
                                                selectedPackage?.id === pkg.id 
                                                ? 'border-[#E52323] bg-[#E52323]/20 shadow-[0_0_15px_rgba(229,35,35,0.4)]'
                                                : 'border-white/20 bg-white/5 hover:border-[#E52323]'
                                            }`}
                                        >
                                            <div>
                                                <span className="font-bold block">{pkg.name}</span>
                                                <span className="text-xs text-[#E52323] font-bold">₹{parseFloat(pkg.price)}</span>
                                            </div>
                                            <div className={`w-5 h-5 rounded-full border ${selectedPackage?.id === pkg.id ? 'border-[#E52323] bg-[#E52323]' : 'border-gray-500'}`}></div>
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
                                <h3 className="text-2xl font-bold mb-6">2. Temporal Coordinates</h3>
                                <div className="space-y-6">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2"><MapPin className="w-4 h-4" /> Drop-off Location</label>
                                        <input type="text" value="Kallayi Main Spa, Calicut" readOnly className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white outline-none" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2"><Calendar className="w-4 h-4" /> Date</label>
                                        <input 
                                            type="date" 
                                            min={today}
                                            value={selectedDate}
                                            onChange={(e) => {
                                                setSelectedDate(e.target.value);
                                                setSelectedSlot(''); // Reset selected time
                                            }}
                                            className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white outline-none [color-scheme:dark]" 
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2"><Clock className="w-4 h-4" /> Available Slots</label>
                                        {isLoadingSlots ? (
                                            <div className="text-center py-8 text-gray-400 font-bold uppercase tracking-widest text-xs animate-pulse">
                                                Scanning available bays...
                                            </div>
                                        ) : !selectedDate ? (
                                            <div className="text-center py-8 text-gray-500 font-bold uppercase tracking-widest text-xs">
                                                Select a date to view bays.
                                            </div>
                                        ) : availableSlots.length === 0 ? (
                                            <div className="text-center py-8 text-[#E52323] font-bold uppercase tracking-widest text-xs">
                                                Fully booked for this date.
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-3 gap-4">
                                                {availableSlots.map(time => {
                                                    const passed = isSlotPassed(time);
                                                    return (
                                                        <div 
                                                            key={time}
                                                            onClick={() => { if (!passed) setSelectedSlot(time); }}
                                                            className={`border p-4 rounded-xl transition text-center font-bold text-sm ${
                                                                passed 
                                                                ? 'opacity-30 cursor-not-allowed border-white/10 bg-white/5 text-gray-500'
                                                                : selectedSlot === time 
                                                                ? 'cursor-pointer border-[#E52323] bg-[#E52323]/20 text-white shadow-[0_0_15px_rgba(229,35,35,0.4)]' 
                                                                : 'cursor-pointer border-white/20 bg-white/5 hover:border-white/50 text-gray-300'
                                                            }`}
                                                        >
                                                            {time}
                                                        </div>
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
                                <h3 className="text-2xl font-bold mb-6">3. Review & Confirm Booking</h3>
                                
                                <div className="bg-[#1a1a1a] border border-white/10 p-6 rounded-3xl space-y-4">
                                    <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4 border-b border-white/5 pb-2">Booking Summary</h4>
                                    
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
                                        <span className="font-bold text-[#E52323]">{selectedSlot || 'None'}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-base pt-2">
                                        <span className="font-bold tracking-widest uppercase">Total Due On Site</span>
                                        <span className="font-bold text-xl">₹{selectedPackage ? parseFloat(selectedPackage.price) : 0}</span>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                        
                    </AnimatePresence>
                </div>

                {/* Footer / Actions */}
                <div className="p-6 border-t border-white/10 bg-white/5 flex gap-4">
                    {bookingStep > 1 && (
                        <button onClick={prevStep} className="px-6 py-4 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-white/10 transition border border-white/20">
                            Back
                        </button>
                    )}
                    <button 
                        onClick={nextStep} 
                        className="flex-1 bg-[#E52323] text-white py-4 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-red-700 transition flex justify-center items-center gap-2 shadow-[0_0_20px_rgba(229,35,35,0.4)]"
                    >
                        {bookingStep === 3 ? 'Confirm Booking (Pay on Arrival)' : 'Proceed'} <ChevronRight className="w-4 h-4" />
                    </button>
                </div>

            </div>
        </div>
    );
}
