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
    const [totalCredit, setTotalCredit] = useState<number>(0);
    const [totalSettled, setTotalSettled] = useState<number>(0);
    const [outstandingBalance, setOutstandingBalance] = useState<number>(0);
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

                let userOutstandingBalance = 0;
                // Fetch User Profile for dynamic greeting & outstanding balance
                try {
                    const userRes = await api.get('/core/users/me/');
                    const user = userRes.data;
                    const name = user.first_name || user.username || '';
                    if (name) {
                        setCustomerName(name.charAt(0).toUpperCase() + name.slice(1));
                    }
                    if (user.outstanding_balance !== undefined) {
                        userOutstandingBalance = parseFloat(user.outstanding_balance) || 0;
                    }
                } catch (uErr) {
                    console.warn("User profile request skipped or unavailable", uErr);
                }

                // Try fetching detailed customer profile from /customers/me/
                try {
                    const custRes = await api.get('/customers/me/');
                    if (custRes.data && custRes.data.outstanding_balance !== undefined) {
                        userOutstandingBalance = parseFloat(custRes.data.outstanding_balance) || 0;
                    }
                } catch (cErr) { /* fallback silently */ }

                // Fetch the logged-in customer's bookings
                const bookingsRes = await api.get('/bookings/');
                const bookings = bookingsRes.data;

                // 1. Fetch Customer Vehicles natively
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

                // 3. Set Wash History with accurate payment status
                const completedBookings = bookings.filter((b: any) => b.status === 'COMPLETED').map((b: any) => {
                    const isKhata = b.payment_method === 'KHATA' || b.payment_method === 'CREDIT' || b.invoice_status === 'CREDIT';
                    return {
                        ...b,
                        payment_method: isKhata ? 'KHATA' : (b.payment_method || 'CASH'),
                        payment_status: isKhata ? 'UNPAID' : (b.invoice_status || 'PAID')
                    };
                });
                setWashHistory(completedBookings);

                // 4. Fetch Detailed Khata Ledger & Dues
                try {
                    let ledgerRes;
                    try {
                        ledgerRes = await api.get('/finance/khata/my-ledger/');
                    } catch {
                        ledgerRes = await api.get('/customers/me/ledger/');
                    }

                    const ledgerData = ledgerRes.data;

                    const credit = parseFloat(ledgerData.total_credit || 0);
                    const settled = parseFloat(ledgerData.total_settled || 0);
                    const outstanding = parseFloat(ledgerData.outstanding_balance || 0);

                    setTotalCredit(credit);
                    setTotalSettled(settled);
                    setOutstandingBalance(outstanding);

                    if (Array.isArray(ledgerData.transactions) && ledgerData.transactions.length > 0) {
                        const formattedTxns = ledgerData.transactions.map((entry: any) => {
                            const isSettlement = entry.transaction_type === 'SETTLEMENT' || entry.transaction_type === 'PAYMENT';
                            return {
                                id: entry.id || `KHATA-${entry.raw_id}`,
                                date: entry.date,
                                service: entry.description,
                                amount: parseFloat(entry.amount),
                                status: isSettlement ? 'PAID' : 'UNPAID',
                                transaction_type: entry.transaction_type,
                                number_plate_image: entry.number_plate_image || null,
                                plate_number: entry.plate_number || 'N/A'
                            };
                        });
                        setTransactions(formattedTxns);
                    } else {
                        setTransactions([]);
                    }
                } catch (khataErr) {
                    if (userOutstandingBalance > 0) {
                        setTransactions([{
                            id: `KHATA-DUE`,
                            date: new Date().toISOString().split('T')[0],
                            service: 'Outstanding Khata Credit Balance',
                            amount: userOutstandingBalance,
                            status: 'UNPAID',
                            transaction_type: 'CHARGE'
                        }]);
                        setOutstandingBalance(userOutstandingBalance);
                        setTotalCredit(userOutstandingBalance);
                        setTotalSettled(0);
                    } else {
                        setTransactions([]);
                    }
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
                        <LedgerTab 
                            key="ledger" 
                            transactions={transactions} 
                            totalCredit={totalCredit}
                            totalSettled={totalSettled}
                            outstandingBalance={outstandingBalance}
                        />
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