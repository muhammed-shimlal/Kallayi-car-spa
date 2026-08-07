'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDashboard } from '@/components/admin/dashboard/context/DashboardContext';
import { LayoutDashboard, Activity, CreditCard, Menu, Sparkles } from 'lucide-react';
import AdminMobileDrawer from '@/components/admin/AdminMobileDrawer';

export default function MobileNavigation() {
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const router = useRouter();
    const { uiState } = useDashboard();
    
    if (!uiState) return null;
    
    const { activeTab, financeSubTab, setActiveTab } = uiState;
    
    const handleTabClick = (tab: string, subTab?: string) => {
        setActiveTab(tab, subTab);
        setIsDrawerOpen(false);
    };

    const handleRouteClick = (route: string) => {
        router.push(route);
        setIsDrawerOpen(false);
    };

    return (
        <>
            {/* Top Minimalist Header for Mobile View (< lg) */}
            <div className="lg:hidden fixed top-0 w-full z-40 bg-[#0a0a0d]/90 backdrop-blur-xl border-b border-white/10 px-4 py-3 flex items-center justify-between shadow-[0_4px_25px_rgba(0,0,0,0.8)]">
                <div className="flex items-center gap-3">
                    <img 
                        src="/images/logo/carspa%20logo.png" 
                        alt="Kallayi Car Spa Logo" 
                        className="h-8 w-auto rounded-lg object-contain border border-white/10 bg-white/90 p-0.5 shadow-sm"
                    />
                    <h2 className="text-base font-syncopate font-bold tracking-widest text-white">
                        KALLAYI<span className="text-[#E52323]">.</span>
                    </h2>
                </div>

                <button
                    onClick={() => setIsDrawerOpen(true)}
                    className="w-11 h-11 rounded-xl bg-[#141518] shadow-[2px_2px_6px_#020203,-2px_-2px_6px_#14151a] border border-white/10 flex items-center justify-center text-white hover:text-[#01FFFF] transition-colors active:scale-95 touch-manipulation"
                    aria-label="Open Navigation Menu"
                >
                    <Menu className="w-5 h-5 text-[#01FFFF]" />
                </button>
            </div>

            {/* Spacer for Top Header */}
            <div className="lg:hidden h-[64px] w-full bg-transparent" />

            {/* HYBRID MOBILE NAVIGATION: Fixed Neumorphic Bottom Navigation Bar */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0a0a0d]/95 backdrop-blur-2xl border-t border-white/10 px-2 py-2 flex justify-around items-center shadow-[0_-4px_25px_rgba(0,0,0,0.9)]">
                {/* 1. Overview */}
                <BottomNavTab
                    icon={<LayoutDashboard className="w-5 h-5" />}
                    label="Overview"
                    isActive={activeTab === 'overview' && !isDrawerOpen}
                    onClick={() => handleTabClick('overview')}
                />

                {/* 2. Queue */}
                <BottomNavTab
                    icon={<Activity className="w-5 h-5" />}
                    label="Queue"
                    isActive={false}
                    onClick={() => handleRouteClick('/admin/queue')}
                />

                {/* 3. POS */}
                <BottomNavTab
                    icon={<CreditCard className="w-5 h-5" />}
                    label="POS"
                    isActive={false}
                    onClick={() => handleRouteClick('/admin/pos')}
                    accentColor="text-[#E52323]"
                />

                {/* 4. More (Menu / Hamburger Icon) */}
                <BottomNavTab
                    icon={<Menu className="w-5 h-5" />}
                    label="More"
                    isActive={isDrawerOpen}
                    onClick={() => setIsDrawerOpen(true)}
                />
            </div>

            {/* EXPANDABLE MOBILE NAVIGATION DRAWER */}
            <AdminMobileDrawer
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                activeTab={activeTab}
                financeSubTab={financeSubTab}
                onSelectTab={handleTabClick}
            />
        </>
    );
}

function BottomNavTab({
    icon,
    label,
    isActive,
    onClick,
    accentColor
}: {
    icon: React.ReactNode;
    label: string;
    isActive: boolean;
    onClick: () => void;
    accentColor?: string;
}) {
    return (
        <button
            onClick={onClick}
            className={`min-h-[48px] min-w-[64px] px-3 py-1.5 rounded-2xl flex flex-col items-center justify-center transition-all active:scale-95 touch-manipulation ${
                isActive
                    ? 'text-[#01FFFF] bg-[#01FFFF]/10 shadow-[0_0_12px_rgba(1,255,255,0.25)] font-bold border border-[#01FFFF]/30'
                    : 'text-neutral-400 active:text-white'
            }`}
        >
            <div className={accentColor || (isActive ? 'text-[#01FFFF]' : 'text-neutral-400')}>{icon}</div>
            <span className="text-[10px] font-mono tracking-wider mt-0.5">{label}</span>
        </button>
    );
}
