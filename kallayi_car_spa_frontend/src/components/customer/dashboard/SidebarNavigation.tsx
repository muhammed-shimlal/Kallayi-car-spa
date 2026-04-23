import React from 'react';
import { Activity, Car, Crown, Star, LogOut, Wallet } from 'lucide-react';

interface SidebarNavigationProps {
    activeTab: string;
    setActiveTab: (val: string) => void;
    handleLogout: () => void;
}

export function SidebarNavigation({ activeTab, setActiveTab, handleLogout }: SidebarNavigationProps) {
    const navItems = [
        { id: 'overview', icon: Activity, label: 'Command Center' },
        { id: 'garage', icon: Car, label: 'My Garage' },
        { id: 'ledger', icon: Wallet, label: 'Ledger & Dues' },
        { id: 'vip', icon: Crown, label: 'VIP Syndicate' },
        { id: 'history', icon: Star, label: 'Wash History' }
    ];

    return (
        <nav className="md:w-72 bg-white/5 backdrop-blur-2xl border-r border-white/10 p-6 flex flex-col justify-between hidden md:flex">
            <div>
                <h2 className="text-2xl font-bold tracking-[0.2em] mb-12">KALLAYI<span className="text-[#E52323]">.</span></h2>
                <ul className="space-y-2">
                    {navItems.map((item) => (
                        <li key={item.id}>
                            <button 
                                onClick={() => setActiveTab(item.id)}
                                className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl transition-all font-bold tracking-wider text-xs uppercase ${
                                    activeTab === item.id ? 'bg-[#E52323] text-white shadow-[0_0_15px_rgba(229,35,35,0.4)]' : 'text-gray-400 hover:bg-white/10 hover:text-white'
                                }`}
                            >
                                <item.icon className="w-5 h-5" /> {item.label}
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
            <button onClick={handleLogout} className="flex items-center gap-3 text-gray-500 hover:text-[#E52323] transition-colors font-bold text-xs uppercase tracking-widest mt-8">
                <LogOut className="w-4 h-4" /> Disconnect
            </button>
        </nav>
    );
}
