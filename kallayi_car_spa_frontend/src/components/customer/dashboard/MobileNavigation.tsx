import React from 'react';
import { Activity, Car, Plus, Calendar, Wallet } from 'lucide-react';
import { motion } from 'framer-motion';

interface MobileNavigationProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
}

export function MobileNavigation({ activeTab, setActiveTab }: MobileNavigationProps) {
    const navItems = [
        { id: 'overview', icon: Activity, label: 'Overview' },
        { id: 'garage', icon: Car, label: 'Garage' },
        // Use 'booking' or whatever state triggers the Booking Wizard. We'll pass an ID of 'booking' for now.
        { id: 'booking', icon: Plus, label: 'Book', isPrimary: true }, 
        { id: 'history', icon: Calendar, label: 'History' },
        { id: 'ledger', icon: Wallet, label: 'Ledger' },
    ];

    return (
        <div className="fixed bottom-0 left-0 w-full z-50 md:hidden bg-[#050505]/90 backdrop-blur-2xl border-t border-white/10 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] px-6 transition-all duration-300 rounded-t-[2rem]">
            <div className="flex justify-around items-center relative">
                {navItems.map((item) => {
                    const isActive = activeTab === item.id;
                    const Icon = item.icon;

                    // Primary Action Button (Floating in center)
                    if (item.isPrimary) {
                        return (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                className="relative -top-6 flex flex-col items-center justify-center w-14 h-14 bg-[#E52323] text-white rounded-full shadow-[0_0_20px_rgba(229,35,35,0.4)] transition-transform hover:scale-110 active:scale-95"
                                aria-label={item.label}
                            >
                                <Icon className="w-6 h-6" />
                            </button>
                        );
                    }

                    return (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className="relative flex flex-col items-center justify-center p-2 group transition-colors"
                            aria-label={item.label}
                        >
                            <Icon 
                                strokeWidth={isActive ? 2.5 : 2}
                                className={`w-6 h-6 transition-colors duration-300 ${
                                    isActive ? 'text-[#E52323]' : 'text-gray-500 group-hover:text-gray-300'
                                }`} 
                            />
                            {/* Glowing dot for active indicator */}
                            {isActive && (
                                <motion.div 
                                    layoutId="mobileNavDot"
                                    className="absolute -bottom-2 w-1.5 h-1.5 bg-[#E52323] rounded-full shadow-[0_0_8px_rgba(229,35,35,0.8)]"
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
