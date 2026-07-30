'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Cookies from 'js-cookie';
import {
    LayoutDashboard, Activity, CreditCard, Menu, X, Wallet, Users,
    Car, Search, FileText, Wrench, BarChart2, Settings, LogOut,
    Sparkles, ChevronRight, ShieldCheck, Receipt
} from 'lucide-react';

export const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 }
};

export const drawerVariants = {
    hidden: { x: '100%' },
    visible: { x: 0, transition: { type: 'spring' as const, damping: 26, stiffness: 220 } },
    exit: { x: '100%', transition: { ease: 'easeInOut' as const, duration: 0.25 } }
};

export interface AdminMobileDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    activeTab?: string;
    financeSubTab?: string;
    onSelectTab?: (tab: string, subTab?: string) => void;
}

export default function AdminMobileDrawer({
    isOpen,
    onClose,
    activeTab = 'overview',
    financeSubTab = 'overview',
    onSelectTab
}: AdminMobileDrawerProps) {
    const router = useRouter();

    const handleNavigate = (type: 'tab' | 'route', target: string, subTab?: string) => {
        if (type === 'tab' && onSelectTab) {
            onSelectTab(target, subTab);
        } else {
            router.push(target);
        }
        onClose();
    };

    const handleLogout = () => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('auth_token');
        }
        Cookies.remove('auth_token');
        router.push('/login');
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    variants={backdropVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl lg:hidden flex justify-end"
                    onClick={onClose}
                >
                    <motion.div
                        variants={drawerVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="bg-[#0a0a0d] w-full max-w-xs sm:max-w-sm h-full border-l border-white/10 flex flex-col justify-between p-6 shadow-[-10px_0_40px_rgba(0,0,0,0.9)]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Drawer Header */}
                        <div className="flex items-center justify-between border-b border-white/10 pb-4">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-[#141518] shadow-[inset_2px_2px_4px_#020203,inset_-2px_-2px_4px_#14151a] border border-white/5 flex items-center justify-center">
                                    <ShieldCheck className="w-5 h-5 text-[#01FFFF]" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-white font-syncopate uppercase tracking-widest">
                                        ADMIN NAVIGATION<span className="text-[#E52323]">.</span>
                                    </h3>
                                    <p className="text-[10px] text-neutral-400 font-mono">Mobile Operations Control</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-11 h-11 rounded-xl bg-[#141518] border border-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition-colors active:scale-95 touch-manipulation min-h-[44px] min-w-[44px]"
                                aria-label="Close Mobile Navigation Drawer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Scrollable Container with All 12 Explicit Admin Links */}
                        <div className="flex-1 overflow-y-auto py-4 space-y-2 pr-1 scrollbar-thin scrollbar-thumb-white/10">
                            
                            {/* 1. Overview */}
                            <DrawerLinkItem
                                icon={<LayoutDashboard className="w-5 h-5 text-[#01FFFF]" />}
                                label="Overview"
                                isActive={activeTab === 'overview'}
                                onClick={() => handleNavigate('tab', 'overview')}
                            />

                            {/* 2. Queue */}
                            <DrawerLinkItem
                                icon={<Activity className="w-5 h-5 text-emerald-400" />}
                                label="Queue"
                                isActive={false}
                                onClick={() => handleNavigate('route', '/admin/queue')}
                            />

                            {/* 3. POS */}
                            <DrawerLinkItem
                                icon={<CreditCard className="w-5 h-5 text-[#E52323]" />}
                                label="POS"
                                isActive={false}
                                onClick={() => handleNavigate('route', '/admin/pos')}
                            />

                            {/* 4. Financial Ledger */}
                            <DrawerLinkItem
                                icon={<Wallet className="w-5 h-5 text-[#d4af37]" />}
                                label="Financial Ledger"
                                isActive={activeTab === 'finance'}
                                onClick={() => handleNavigate('tab', 'finance')}
                            />

                            {/* 5. Staff Operation & Payroll */}
                            <DrawerLinkItem
                                icon={<Users className="w-5 h-5 text-purple-400" />}
                                label="Staff Operation & Payroll"
                                isActive={activeTab === 'staff'}
                                onClick={() => handleNavigate('tab', 'staff')}
                            />

                            {/* 6. Fleet & Service Vehicle */}
                            <DrawerLinkItem
                                icon={<Car className="w-5 h-5 text-amber-400" />}
                                label="Fleet & Service Vehicle"
                                isActive={activeTab === 'fleet'}
                                onClick={() => handleNavigate('tab', 'fleet')}
                            />

                            {/* 7. Customer & Vehicle CRM */}
                            <DrawerLinkItem
                                icon={<Search className="w-5 h-5 text-teal-400" />}
                                label="Customer & Vehicle CRM"
                                isActive={activeTab === 'crm'}
                                onClick={() => handleNavigate('tab', 'crm')}
                            />

                            {/* 8. PDF Invoice & Receipt */}
                            <DrawerLinkItem
                                icon={<Receipt className="w-5 h-5 text-blue-400" />}
                                label="PDF Invoice & Receipt"
                                isActive={activeTab === 'finance' && financeSubTab === 'invoices'}
                                onClick={() => handleNavigate('tab', 'finance', 'invoices')}
                            />

                            {/* 9. Analysis & Insights */}
                            <DrawerLinkItem
                                icon={<BarChart2 className="w-5 h-5 text-indigo-400" />}
                                label="Analysis & Insights"
                                isActive={activeTab === 'analytics'}
                                onClick={() => handleNavigate('tab', 'analytics')}
                            />

                            {/* 10. EOD Register Closing */}
                            <DrawerLinkItem
                                icon={<FileText className="w-5 h-5 text-rose-400" />}
                                label="EOD Register Closing"
                                isActive={activeTab === 'eod'}
                                onClick={() => handleNavigate('tab', 'eod')}
                            />

                            {/* 11. Service Package Menu */}
                            <DrawerLinkItem
                                icon={<Wrench className="w-5 h-5 text-amber-400" />}
                                label="Service Package Menu"
                                isActive={activeTab === 'services'}
                                onClick={() => handleNavigate('tab', 'services')}
                            />

                            {/* 12. System Settings */}
                            <DrawerLinkItem
                                icon={<Settings className="w-5 h-5 text-neutral-400" />}
                                label="System Settings"
                                isActive={activeTab === 'settings'}
                                onClick={() => handleNavigate('tab', 'settings')}
                            />

                        </div>

                        {/* Disconnect Session / Logout */}
                        <div className="pt-3 border-t border-white/10">
                            <button
                                onClick={handleLogout}
                                className="w-full min-h-[48px] py-3.5 px-4 rounded-2xl bg-[#141518] hover:bg-red-500/10 text-neutral-400 hover:text-red-400 border border-white/5 font-semibold text-xs uppercase tracking-widest flex items-center justify-center gap-2.5 transition-colors touch-manipulation active:scale-95"
                            >
                                <LogOut className="w-4 h-4 text-red-400" />
                                <span>Disconnect Session</span>
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

// Drawer Link Item Helper Component with 48px Min Touch Height
function DrawerLinkItem({
    icon,
    label,
    isActive,
    onClick
}: {
    icon: React.ReactNode;
    label: string;
    isActive: boolean;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className={`w-full min-h-[48px] px-3.5 py-3 rounded-2xl flex items-center justify-between border transition-all active:scale-95 touch-manipulation ${
                isActive
                    ? 'bg-[#01FFFF]/10 border-[#01FFFF]/40 text-white font-bold shadow-[0_0_15px_rgba(1,255,255,0.2)]'
                    : 'bg-[#141518] border-white/5 text-neutral-300 hover:text-white hover:border-white/10'
            }`}
        >
            <div className="flex items-center gap-3">
                <div className={isActive ? 'text-[#01FFFF]' : ''}>{icon}</div>
                <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
            </div>
            <ChevronRight className={`w-4 h-4 transition-transform ${isActive ? 'text-[#01FFFF] translate-x-1' : 'text-neutral-500'}`} />
        </button>
    );
}
