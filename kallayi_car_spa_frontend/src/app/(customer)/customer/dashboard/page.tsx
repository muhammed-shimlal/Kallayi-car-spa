'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';

import api from '@/lib/api';

import { SidebarNavigation } from '@/components/customer/dashboard/SidebarNavigation';
import { OverviewTab } from '@/components/customer/dashboard/OverviewTab';
import { GarageTab } from '@/components/customer/dashboard/GarageTab';
import { LedgerTab } from '@/components/customer/dashboard/LedgerTab';
import { VipTab } from '@/components/customer/dashboard/VipTab';
import { HistoryTab } from '@/components/customer/dashboard/HistoryTab';
import { BookingWizard } from '@/components/customer/dashboard/BookingWizard';

import { Vehicle, ActiveWash } from '@/components/customer/dashboard/types';

export default function CustomerDashboard() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('overview');
    const [isBooking, setIsBooking] = useState(false);

    // Real API Data States
    const [loyaltyPoints, setLoyaltyPoints] = useState<number>(0);
    const [myVehicles, setMyVehicles] = useState<Vehicle[]>([]);
    const [activeWash, setActiveWash] = useState<ActiveWash | null>(null);
    const [washHistory, setWashHistory] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setIsLoading(true);
                // Replace these with your exact backend endpoints
                // const [overviewRes, vehiclesRes, historyRes] = await Promise.all([
                //     api.get('/customers/dashboard/overview/'),
                //     api.get('/customers/vehicles/'),
                //     api.get('/customers/history/')
                // ]);
                
                // setLoyaltyPoints(overviewRes.data.loyalty_points);
                // setActiveWash(overviewRes.data.active_wash);
                // setMyVehicles(vehiclesRes.data);
                // setWashHistory(historyRes.data);
            } catch (error) {
                console.error("Failed to fetch customer data", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('auth_token');
        router.push('/login');
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#050505] flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-[#E52323]/30 border-t-[#E52323] rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#050505] text-white flex flex-col md:flex-row font-sans selection:bg-[#E52323]">
            
            {/* Modular Sidebar */}
            <SidebarNavigation 
                activeTab={activeTab} 
                setActiveTab={setActiveTab} 
                handleLogout={handleLogout} 
            />

            {/* Modular Main Content Area with Animated Mounting */}
            <main className="flex-1 p-6 md:p-12 overflow-y-auto relative">
                <AnimatePresence mode="wait">
                    {activeTab === 'overview' && (
                        <OverviewTab key="overview" setIsBooking={setIsBooking} loyaltyPoints={loyaltyPoints} activeWash={activeWash!} />
                    )}
                    
                    {activeTab === 'garage' && (
                        <GarageTab key="garage" myVehicles={myVehicles} />
                    )}

                    {activeTab === 'ledger' && (
                        <LedgerTab key="ledger" />
                    )}

                    {activeTab === 'vip' && (
                        <VipTab key="vip" />
                    )}

                    {activeTab === 'history' && (
                    <>
                        {/* Make sure your HistoryTab is updated to accept "washHistory" if needed! */}
                        <HistoryTab key="history" />
                    </>
                )}
                </AnimatePresence>
            </main>

            {/* Booking Wizard Setup */}
            {isBooking && (
                <BookingWizard setIsBooking={setIsBooking} myVehicles={myVehicles} />
            )}

            {/* Tailwind Keyframes injected locally for global effects */}
            <style dangerouslySetInnerHTML={{__html: `
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(1); cursor: pointer; }
            `}} />
        </div>
    );
}