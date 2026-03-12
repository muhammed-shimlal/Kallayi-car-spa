'use client';

import React, { useState } from 'react';
import { 
    Car, Calendar, CreditCard, Award, Star, Crown, Activity, 
    Plus, ChevronRight, X, MapPin, Clock, LogOut 
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function CustomerDashboard() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('overview');
    const [isBooking, setIsBooking] = useState(false);
    const [bookingStep, setBookingStep] = useState(1);

    // Mock Data (To be replaced with your Django API calls)
    const loyaltyPoints = 1250;
    const myVehicles = [
        { id: 1, make: 'Porsche', model: '911 Carrera', plate: 'KL 15 AB 9911' },
        { id: 2, make: 'Mercedes', model: 'AMG GT', plate: 'KL 11 CC 1010' }
    ];
    const activeWash = { status: 'WASHING', progress: 65, package: 'Deep Detail', vehicle: 'Porsche 911 Carrera' };

    const handleLogout = () => {
        localStorage.removeItem('auth_token');
        router.push('/login');
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white flex flex-col md:flex-row font-sans selection:bg-[#E52323]">
            
            {/* --- SIDEBAR NAVIGATION (Glassmorphism) --- */}
            <nav className="md:w-72 bg-white/5 backdrop-blur-2xl border-r border-white/10 p-6 flex flex-col justify-between hidden md:flex">
                <div>
                    <h2 className="text-2xl font-bold tracking-[0.2em] mb-12">KALLAYI<span className="text-[#E52323]">.</span></h2>
                    <ul className="space-y-2">
                        {[
                            { id: 'overview', icon: Activity, label: 'Command Center' },
                            { id: 'garage', icon: Car, label: 'My Garage' },
                            { id: 'vip', icon: Crown, label: 'VIP Syndicate' },
                            { id: 'history', icon: Star, label: 'Wash History' }
                        ].map((item) => (
                            <li key={item.id}>
                                <button 
                                    onClick={() => setActiveTab(item.id)}
                                    className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl transition-all font-bold tracking-wider text-xs uppercase ${
                                        activeTab === item.id ? 'bg-[#E52323] text-white' : 'text-gray-400 hover:bg-white/10 hover:text-white'
                                    }`}
                                >
                                    <item.icon className="w-5 h-5" /> {item.label}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
                <button onClick={handleLogout} className="flex items-center gap-3 text-gray-500 hover:text-[#E52323] transition-colors font-bold text-xs uppercase tracking-widest">
                    <LogOut className="w-4 h-4" /> Disconnect
                </button>
            </nav>

            {/* --- MAIN CONTENT AREA --- */}
            <main className="flex-1 p-6 md:p-12 overflow-y-auto relative">
                
                {/* 1. OVERVIEW TAB */}
                {activeTab === 'overview' && (
                    <div className="animate-[fadeIn_0.5s_ease-out]">
                        <div className="flex justify-between items-end mb-10">
                            <div>
                                <span className="text-[#E52323] text-[10px] font-bold tracking-[0.3em] uppercase">Sys. Online</span>
                                <h1 className="text-4xl font-bold tracking-tighter mt-2">Welcome Back.</h1>
                            </div>
                            <button onClick={() => setIsBooking(true)} className="bg-white text-black px-6 py-3 rounded-full font-bold text-xs uppercase tracking-widest hover:scale-105 transition flex items-center gap-2">
                                <Plus className="w-4 h-4" /> Book Wash
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            {/* 🎯 Loyalty Points Widget */}
                            <div className="bg-gradient-to-br from-gray-900 to-black border border-white/10 p-8 rounded-3xl relative overflow-hidden shadow-2xl">
                                <Award className="absolute -right-6 -bottom-6 w-32 h-32 text-white/5" />
                                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2">Synergy Points</p>
                                <h2 className="text-5xl font-black text-white">{loyaltyPoints}</h2>
                                <p className="text-[#E52323] text-xs font-bold mt-4">Redeem for ₹125 Off</p>
                            </div>

                            {/* 📍 Real-Time Tracking Widget */}
                            <div className="md:col-span-2 border border-[#E52323]/30 bg-[#E52323]/5 p-8 rounded-3xl relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-[1px] bg-[#E52323] opacity-50 shadow-[0_0_10px_#E52323]"></div>
                                <div className="flex justify-between items-center mb-6">
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
                                    <span className="text-white">Washing (Est. 15m left)</span>
                                    <span>Ready</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. GARAGE TAB (Vehicle Mgmt) */}
                {activeTab === 'garage' && (
                    <div className="animate-[fadeIn_0.5s_ease-out]">
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
                                <div key={v.id} className="bg-white/5 border border-white/10 p-6 rounded-3xl flex items-center justify-between hover:border-[#E52323]/50 transition cursor-pointer group">
                                    <div className="flex items-center gap-6">
                                        <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center border border-white/10 group-hover:shadow-[0_0_20px_rgba(229,35,35,0.2)] transition">
                                            <Car className="text-gray-400 group-hover:text-[#E52323]" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold">{v.make} {v.model}</h3>
                                            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">{v.plate}</p>
                                        </div>
                                    </div>
                                    <ChevronRight className="text-gray-600" />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 3. VIP SUBSCRIPTIONS */}
                {activeTab === 'vip' && (
                    <div className="animate-[fadeIn_0.5s_ease-out]">
                        <span className="text-yellow-500 text-[10px] font-bold tracking-[0.3em] uppercase">Memberships</span>
                        <h1 className="text-4xl font-bold tracking-tighter mt-2 mb-10">VIP Syndicate</h1>
                        <div className="bg-gradient-to-br from-yellow-900/40 to-black border border-yellow-500/30 p-10 rounded-[2.5rem] relative overflow-hidden">
                            <Crown className="absolute right-10 top-10 w-24 h-24 text-yellow-500/10" />
                            <h2 className="text-3xl font-bold text-white mb-2">Unlimited Wash Club</h2>
                            <h3 className="text-5xl font-black text-yellow-500 mb-6">₹1,499<span className="text-lg text-gray-400 font-normal"> / mo</span></h3>
                            <ul className="space-y-4 mb-8 text-gray-300 font-medium">
                                <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></span> 4x Premium Washes per month</li>
                                <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></span> Priority Queueing (Skip the line)</li>
                                <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></span> Double Loyalty Points on extras</li>
                            </ul>
                            <button className="bg-yellow-500 text-black px-8 py-4 rounded-full font-bold text-xs uppercase tracking-widest hover:bg-yellow-400 transition">
                                Authorize Upgrade
                            </button>
                        </div>
                    </div>
                )}

                {/* 4. HISTORY & REVIEWS */}
                {activeTab === 'history' && (
                    <div className="animate-[fadeIn_0.5s_ease-out]">
                        <span className="text-gray-500 text-[10px] font-bold tracking-[0.3em] uppercase">Archive</span>
                        <h1 className="text-4xl font-bold tracking-tighter mt-2 mb-10">Service Logs</h1>
                        <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
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
                    </div>
                )}
            </main>

            {/* ========================================================= */}
            {/* 📅 SMART BOOKING WIZARD & 💳 PAYMENT OVERLAY              */}
            {/* ========================================================= */}
            {isBooking && (
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
                        <div className="flex-1 overflow-y-auto p-6 sm:p-10">
                            
                            {/* Step 1: Vehicle & Service */}
                            {bookingStep === 1 && (
                                <div className="animate-[fadeIn_0.3s_ease-out]">
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
                                </div>
                            )}

                            {/* Step 2: Date & Time */}
                            {bookingStep === 2 && (
                                <div className="animate-[fadeIn_0.3s_ease-out]">
                                    <h3 className="text-2xl font-bold mb-6">2. Temporal Coordinates</h3>
                                    <div className="space-y-6">
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 block flex items-center gap-2"><MapPin className="w-4 h-4" /> Drop-off Location</label>
                                            <input type="text" value="Kallayi Main Spa, Calicut" readOnly className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white outline-none" />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 block flex items-center gap-2"><Calendar className="w-4 h-4" /> Date</label>
                                            <input type="date" className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white outline-none [color-scheme:dark]" />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 block flex items-center gap-2"><Clock className="w-4 h-4" /> Available Slots</label>
                                            <div className="grid grid-cols-3 gap-3">
                                                {['09:00 AM', '11:00 AM', '02:00 PM'].map(time => (
                                                    <div key={time} className="border border-white/20 bg-white/5 py-3 rounded-xl text-center text-sm font-bold cursor-pointer hover:border-[#E52323] transition">{time}</div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Checkout (Stripe & Loyalty) */}
                            {bookingStep === 3 && (
                                <div className="animate-[fadeIn_0.3s_ease-out]">
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
                                </div>
                            )}
                        </div>

                        {/* Footer / Actions */}
                        <div className="p-6 border-t border-white/10 bg-white/5 flex gap-4">
                            {bookingStep > 1 && (
                                <button onClick={() => setBookingStep(s => s - 1)} className="px-6 py-4 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-white/10 transition border border-white/20">
                                    Back
                                </button>
                            )}
                            <button 
                                onClick={() => {
                                    if (bookingStep < 3) setBookingStep(s => s + 1);
                                    else { alert("Booking Authorized via Stripe!"); setIsBooking(false); setBookingStep(1); }
                                }} 
                                className="flex-1 bg-[#E52323] text-white py-4 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-red-700 transition flex justify-center items-center gap-2 shadow-[0_0_20px_rgba(229,35,35,0.4)]"
                            >
                                {bookingStep === 3 ? 'Authorize Payment (₹1200)' : 'Proceed'} <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>

                    </div>
                </div>
            )}
            
            {/* Tailwind Keyframes injected locally */}
            <style dangerouslySetInnerHTML={{__html: `
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(1); cursor: pointer; }
            `}} />
        </div>
    );
}