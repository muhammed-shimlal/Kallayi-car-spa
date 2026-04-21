'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDashboard } from '@/components/admin/dashboard/context/DashboardContext';
import {
    Menu, X, LayoutDashboard, Wallet, Users, BarChart2,
    Search, FileText, Wrench, Activity, ChevronRight
} from 'lucide-react';

export default function MobileNavigation() {
    const [isOpen, setIsOpen] = useState(false);
    const router = useRouter();
    const { uiState } = useDashboard();
    
    if (!uiState) return null;
    
    const { activeTab, setActiveTab } = uiState;

    const handleTabClick = (tab: string) => {
        setActiveTab(tab);
        setIsOpen(false);
    };

    const handleRouteClick = (route: string) => {
        router.push(route);
        setIsOpen(false);
    };

    return (
        <>
            {/* Slek, fixed top header for mobile */}
            <div className="lg:hidden fixed top-0 w-full z-40 bg-[#141518]/90 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex items-center justify-between shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
                <div className="flex items-center gap-2">
                    <h2 className="text-xl font-syncopate font-bold tracking-widest text-white">
                        KALLAYI<span className="text-[#FF2A6D]">.</span>
                    </h2>
                </div>
                <button
                    onClick={() => setIsOpen(true)}
                    className="text-white hover:text-[#01FFFF] transition-colors p-2"
                >
                    <Menu className="w-6 h-6" />
                </button>
            </div>

            {/* Blank placeholder to prevent content from hiding behind the fixed header */}
            <div className="lg:hidden h-[72px] w-full bg-transparent"></div>

            {/* Navigation Overlay */}
            <div
                className={`fixed inset-0 z-50 bg-[#050505]/95 backdrop-blur-2xl transition-all duration-300 ease-in-out lg:hidden flex flex-col ${
                    isOpen ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full pointer-events-none'
                }`}
            >
                {/* Header in Overlay */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                    <h2 className="text-xl font-syncopate font-bold tracking-widest text-[#01FFFF]">
                        NAVIGATION<span className="text-[#FF2A6D]">.</span>
                    </h2>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="text-white hover:text-[#FF2A6D] transition-colors p-2"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Nav Items */}
                <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-3">
                    <NavButton
                        icon={<LayoutDashboard className="w-5 h-5" />}
                        label="Overview"
                        isActive={activeTab === 'overview'}
                        onClick={() => handleTabClick('overview')}
                        activeColor="text-[#01FFFF] bg-[#01FFFF]/10 border-[#01FFFF]/30"
                    />
                    <NavButton
                        icon={<Wallet className="w-5 h-5" />}
                        label="Finance Dept"
                        isActive={activeTab === 'finance'}
                        onClick={() => handleTabClick('finance')}
                        activeColor="text-[#01FFFF] bg-[#01FFFF]/10 border-[#01FFFF]/30"
                    />
                    <NavButton
                        icon={<Users className="w-5 h-5" />}
                        label="Staff Ops"
                        isActive={activeTab === 'staff'}
                        onClick={() => handleTabClick('staff')}
                        activeColor="text-[#01FFFF] bg-[#01FFFF]/10 border-[#01FFFF]/30"
                    />
                    <NavButton
                        icon={<BarChart2 className="w-5 h-5" />}
                        label="Analytics & Insights"
                        isActive={activeTab === 'analytics'}
                        onClick={() => handleTabClick('analytics')}
                        activeColor="text-blue-400 bg-blue-500/10 border-blue-500/30"
                    />
                    <NavButton
                        icon={<Search className="w-5 h-5" />}
                        label="CRM & History"
                        isActive={activeTab === 'crm'}
                        onClick={() => handleTabClick('crm')}
                        activeColor="text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
                    />
                    <NavButton
                        icon={<FileText className="w-5 h-5" />}
                        label="EOD Closing"
                        isActive={activeTab === 'eod'}
                        onClick={() => handleTabClick('eod')}
                        activeColor="text-purple-400 bg-purple-500/10 border-purple-500/30"
                    />
                    <NavButton
                        icon={<Wrench className="w-5 h-5" />}
                        label="Service Menu"
                        isActive={activeTab === 'services'}
                        onClick={() => handleTabClick('services')}
                        activeColor="text-amber-400 bg-amber-500/10 border-amber-500/30"
                    />

                    <div className="pt-4 mt-2 border-t border-white/10 flex flex-col gap-3">
                        <button
                            onClick={() => handleRouteClick('/admin/queue')}
                            className="flex items-center gap-4 px-4 py-4 rounded-xl font-bold text-sm uppercase tracking-widest transition-all text-[#8E939B] hover:text-[#01FFFF] hover:bg-[#01FFFF]/5 hover:border hover:border-[#01FFFF]/20 border border-transparent"
                        >
                            <Activity className="w-5 h-5" /> Live Queue
                        </button>

                        <button
                            onClick={() => handleRouteClick('/admin/pos')}
                            className="flex items-center justify-center gap-2 px-4 py-4 rounded-xl bg-gradient-to-r from-[#E52323] right to-red-700 text-white font-bold text-sm uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(229,35,35,0.4)] active:scale-95"
                        >
                            Launch Express POS <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}

// NavButton Helper Component
function NavButton({
    icon,
    label,
    isActive,
    onClick,
    activeColor
}: {
    icon: React.ReactNode;
    label: string;
    isActive: boolean;
    onClick: () => void;
    activeColor: string;
}) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl font-bold text-sm uppercase tracking-widest transition-all border ${
                isActive
                    ? activeColor
                    : 'text-[#8E939B] border-transparent hover:text-white hover:bg-white/5'
            }`}
        >
            {icon} {label}
        </button>
    );
}
