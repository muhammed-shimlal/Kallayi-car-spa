import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Car, MapPin, Calendar, Clock, Award, CreditCard, ChevronRight } from 'lucide-react';
import { Vehicle } from './types';

interface BookingWizardProps {
    setIsBooking: (val: boolean) => void;
    myVehicles: Vehicle[];
}

export function BookingWizard({ setIsBooking, myVehicles }: BookingWizardProps) {
    const [bookingStep, setBookingStep] = useState(1);

    const slideVariants = {
        enter: (direction: number) => ({ x: direction > 0 ? 50 : -50, opacity: 0 }),
        center: { x: 0, opacity: 1 },
        exit: (direction: number) => ({ x: direction < 0 ? 50 : -50, opacity: 0 })
    };
    
    // 1 is forward, -1 is backwards
    const [direction, setDirection] = useState(1);

    const nextStep = () => {
        setDirection(1);
        if (bookingStep < 3) setBookingStep(s => s + 1);
        else {
            alert("Booking Authorized via Stripe!");
            setIsBooking(false);
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
                                    {myVehicles.map(v => (
                                        <div key={v.id} className="border border-white/20 bg-white/5 p-4 rounded-2xl cursor-pointer hover:border-[#E52323] transition text-center">
                                            <Car className="mx-auto mb-2 text-gray-400" />
                                            <p className="font-bold text-sm">{v.model}</p>
                                        </div>
                                    ))}
                                </div>

                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 block">Select Package</label>
                                <div className="space-y-3">
                                    {['Exterior Wash (₹500)', 'Deep Detail (₹1200)'].map(pkg => (
                                        <div key={pkg} className="border border-white/20 bg-white/5 p-4 rounded-2xl cursor-pointer hover:border-[#E52323] transition flex justify-between">
                                            <span className="font-bold">{pkg}</span>
                                            <div className="w-5 h-5 rounded-full border border-gray-500"></div>
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
                                        <input type="date" className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white outline-none [color-scheme:dark]" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2"><Clock className="w-4 h-4" /> Available Slots</label>
                                        <div className="grid grid-cols-3 gap-3">
                                            {['09:00 AM', '11:00 AM', '02:00 PM'].map(time => (
                                                <div key={time} className="border border-white/20 bg-white/5 py-3 rounded-xl text-center text-sm font-bold cursor-pointer hover:border-[#E52323] transition">{time}</div>
                                            ))}
                                        </div>
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
                                <h3 className="text-2xl font-bold mb-6">3. Finalize & Authorize</h3>
                                
                                {/* 🎯 Loyalty Toggle */}
                                <div className="bg-[#E52323]/10 border border-[#E52323]/30 p-5 rounded-2xl mb-8 flex justify-between items-center">
                                    <div>
                                        <h4 className="font-bold text-white text-sm flex items-center gap-2"><Award className="w-4 h-4 text-[#E52323]"/> Apply Synergy Points</h4>
                                        <p className="text-xs text-gray-400 mt-1">Use 500 points for ₹50 off</p>
                                    </div>
                                    <div className="w-12 h-6 bg-white/20 rounded-full relative cursor-pointer">
                                        <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 left-0.5"></div>
                                    </div>
                                </div>

                                {/* 💳 Stripe Mock */}
                                <div className="bg-white/5 border border-white/10 p-6 rounded-3xl space-y-4">
                                    <div className="flex justify-between items-center border-b border-white/10 pb-4 mb-4">
                                        <span className="font-bold text-sm tracking-widest uppercase">Secure Payment</span>
                                        <CreditCard className="text-gray-400" />
                                    </div>
                                    <input type="text" placeholder="Card Number" className="w-full bg-black border border-white/10 p-4 rounded-xl text-white font-mono text-sm outline-none focus:border-[#E52323]" />
                                    <div className="grid grid-cols-2 gap-4">
                                        <input type="text" placeholder="MM/YY" className="bg-black border border-white/10 p-4 rounded-xl text-white font-mono text-sm outline-none focus:border-[#E52323] text-center" />
                                        <input type="text" placeholder="CVC" className="bg-black border border-white/10 p-4 rounded-xl text-white font-mono text-sm outline-none focus:border-[#E52323] text-center" />
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
                        {bookingStep === 3 ? 'Authorize Payment (₹1200)' : 'Proceed'} <ChevronRight className="w-4 h-4" />
                    </button>
                </div>

            </div>
        </div>
    );
}
