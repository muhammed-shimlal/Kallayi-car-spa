'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import Cookies from 'js-cookie';

import api from '@/lib/api';

import { SidebarNavigation } from '@/components/customer/dashboard/SidebarNavigation';
import { OverviewTab } from '@/components/customer/dashboard/OverviewTab';
import { GarageTab } from '@/components/customer/dashboard/GarageTab';
import { LedgerTab } from '@/components/customer/dashboard/LedgerTab';
import { HistoryTab } from '@/components/customer/dashboard/HistoryTab';
import { BookingWizard } from '@/components/customer/dashboard/BookingWizard';
import { MobileNavigation } from '@/components/customer/dashboard/MobileNavigation';

import { Vehicle, ActiveWash } from '@/components/customer/dashboard/types';

export default function CustomerDashboard() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('overview');
    const [isBooking, setIsBooking] = useState(false);

    // Real API Data States
    const [myVehicles, setMyVehicles] = useState<Vehicle[]>([]);
    const [activeWash, setActiveWash] = useState<ActiveWash | null>(null);
    const [washHistory, setWashHistory] = useState<any[]>([]);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [customerName, setCustomerName] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);

    // --- Auth Guard: redirect immediately if no token present ---
    useEffect(() => {
        const token = Cookies.get('auth_token');
        if (!token) {
            router.replace('/login');
        }
    }, [router]);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setIsLoading(true);

                // Fetch User Profile for dynamic greeting
                try {
                    const userRes = await api.get('/core/users/me/');
                    const user = userRes.data;
                    const name = user.first_name || user.username || '';
                    if (name) {
                        setCustomerName(name.charAt(0).toUpperCase() + name.slice(1));
                    }
                } catch (uErr) {
                    console.warn("User profile request skipped or unavailable", uErr);
                }

                // Fetch the logged-in customer's bookings
                const bookingsRes = await api.get('/bookings/');
                const bookings = bookingsRes.data;

                // 1. Fetch Customer Vehicles natively
                // Fetch Vehicles directly from our dedicated collision-free endpoint
                try {
                    const vehiclesRes = await api.get('/customer-vehicles/');
                    const formattedVehicles = vehiclesRes.data.map((v: any) => ({
                        id: v.id,
                        make: v.make,
                        model: v.model,
                        plate: v.plate_number
                    }));
                    setMyVehicles(formattedVehicles);
                } catch (vErr) {
                    console.error("Failed to fetch garage vehicles", vErr);
                }

                // 2. Derive active wash directly from bookings list
                const active = bookings.find((b: any) => !['COMPLETED', 'CANCELLED'].includes(b.status));
                if (active) {
                    let progress = 10;
                    if (active.status === 'IN_PROGRESS') progress = 50;
                    if (active.status === 'READY') progress = 90;

                    setActiveWash({
                        status: active.status,
                        progress,
                        package: active.service_package_name || 'Standard Wash',
                        vehicle: active.vehicle_plate || 'Unknown',
                    });
                } else {
                    setActiveWash(null);
                }

                // 3. Set Wash History
                setWashHistory(bookings.filter((b: any) => b.status === 'COMPLETED'));

                // 4. Fetch Invoices for Ledger (Fallback to empty if endpoint doesn't exist yet)
                try {
                    const invoiceRes = await api.get('/finance/invoices/');
                    const formattedTxns = invoiceRes.data.map((inv: any) => ({
                        id: `INV-${inv.id}`,
                        date: new Date(inv.created_at).toISOString().split('T')[0],
                        service: inv.subscription ? 'Subscription' : 'Service Wash',
                        amount: parseFloat(inv.amount),
                        status: inv.is_paid ? 'PAID' : 'UNPAID'
                    }));
                    setTransactions(formattedTxns);
                } catch (invoiceErr) {
                    console.warn("Invoice endpoint not ready or failed. Defaulting to empty ledger.");
                    setTransactions([]);
                }
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
                <div className="w-16 h-16 border-4 border-spa-sky/30 border-t-spa-sky rounded-full animate-spin"></div>
            </div>
        );
    }

    const handleMobileTabChange = (tab: string) => {
        if (tab === 'booking') {
            setIsBooking(true);
        } else {
            setActiveTab(tab);
        }
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white flex flex-col md:flex-row font-sans selection:bg-spa-sky selection:text-slate-950">
            
            {/* Modular Sidebar */}
            <div className="hidden md:flex">
                <SidebarNavigation 
                    activeTab={activeTab} 
                    setActiveTab={setActiveTab} 
                    handleLogout={handleLogout} 
                />
            </div>

            {/* Modular Main Content Area with Animated Mounting */}
            <main className="flex-1 p-6 md:p-12 max-lg:pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-8 overflow-y-auto relative">
                <AnimatePresence mode="wait">
                    {activeTab === 'overview' && (
                        <OverviewTab key="overview" setIsBooking={setIsBooking} handleLogout={handleLogout} customerName={customerName} />
                    )}
                    
                    {activeTab === 'garage' && (
                        <GarageTab key="garage" myVehicles={myVehicles} />
                    )}

                    {activeTab === 'ledger' && (
                        <LedgerTab key="ledger" transactions={transactions} />
                    )}

                    {activeTab === 'history' && (
                        <HistoryTab key="history" history={washHistory} />
                    )}
                </AnimatePresence>
            </main>

            {/* Mobile Navigation */}
            <div className="block md:hidden">
                <MobileNavigation 
                    activeTab={activeTab} 
                    setActiveTab={handleMobileTabChange} 
                />
            </div>

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