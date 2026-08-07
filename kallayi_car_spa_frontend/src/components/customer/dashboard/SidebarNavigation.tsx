import React from 'react';
import { Activity, Car, Star, LogOut, Wallet } from 'lucide-react';

interface SidebarNavigationProps {
    activeTab: string;
    setActiveTab: (val: string) => void;
    handleLogout: () => void;
}

export function SidebarNavigation({ activeTab, setActiveTab, handleLogout }: SidebarNavigationProps) {
    const navItems = [
        { id: 'overview', icon: Activity, label: 'Dashboard' },
        { id: 'garage', icon: Car, label: 'My Garage' },
        { id: 'ledger', icon: Wallet, label: 'Ledger & Dues' },
        { id: 'history', icon: Star, label: 'Wash History' }
    ];

    return (
        <nav className="md:w-72 bg-white/5 backdrop-blur-2xl border-r border-white/10 p-6 flex flex-col justify-between hidden md:flex">
            <div>
                <div className="flex items-center gap-3 mb-12">
                    <img 
                        src="/images/logo/carspa%20logo.png" 
                        alt="Kallayi Car Spa Logo" 
                        className="h-10 w-auto rounded-xl object-contain border border-white/10 bg-white/90 p-1 shadow-md"
                    />
                    <h2 className="text-2xl font-bold tracking-[0.2em]">KALLAYI<span className="text-spa-sky">.</span></h2>
                </div>
                <ul className="space-y-2">
                    {navItems.map((item) => (
                        <li key={item.id}>
                            <button 
                                onClick={() => setActiveTab(item.id)}
                                className={`w-full min-h-[44px] flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all font-extrabold tracking-wider text-xs uppercase ${
                                    activeTab === item.id 
                                    ? 'bg-spa-sky text-slate-950 shadow-[0_0_15px_rgba(135,189,216,0.4)]' 
                                    : 'text-gray-400 hover:bg-white/10 hover:text-white'
                                }`}
                            >
                                <item.icon className="w-5 h-5" /> {item.label}
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
            <button onClick={handleLogout} className="flex items-center gap-3 text-gray-500 hover:text-spa-sky transition-colors font-bold text-xs uppercase tracking-widest mt-8 min-h-[44px] px-2">
                <LogOut className="w-4 h-4" /> Log Out
            </button>
        </nav>
    );
}
