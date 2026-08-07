'use client';

import React from 'react';
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Line } from 'recharts';
import { useDashboard } from '../context/DashboardContext';
import { Skeleton } from '@/components/ui/Skeleton';
import { Car, CheckCircle2, User, Clock } from 'lucide-react';
import { ResponsiveDataContainer } from '../ResponsiveDataContainer';

export default function OverviewTab() {
    const [isMounted, setIsMounted] = React.useState(false);
    React.useEffect(() => { 
        setIsMounted(true); 
    }, []);

    const { uiState, financeState, queueState } = useDashboard();
    const { chartData = [] } = financeState || {};
    const { recentBookings = [], todayWashedVehicles = [], todayWashedCount = 0 } = queueState || {};
    const { isLoading = false } = uiState || {};

    const completedVehiclesList = Array.isArray(todayWashedVehicles) ? todayWashedVehicles : [];
    const count = todayWashedCount || completedVehiclesList.length;

    const washedVehiclesColumns = [
        {
            header: 'Vehicle Number',
            accessor: (item: any) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#01FFFF]">
                        <Car className="w-4 h-4" />
                    </div>
                    <span className="font-mono font-bold tracking-wider text-white">
                        {item.vehicle_plate || item.vehicle_info || item.plate_number || 'Walk-In Vehicle'}
                    </span>
                </div>
            ),
            mobilePrimary: true
        },
        {
            header: 'Service Package',
            accessor: (item: any) => (
                <span className="font-bold text-xs uppercase tracking-widest text-emerald-400">
                    {item.service_package_name || item.service_package_details?.name || item.service_name || 'Standard Wash'}
                </span>
            ),
            mobileSecondary: true
        },
        {
            header: 'Status',
            accessor: (item: any) => (
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md">
                    COMPLETED
                </span>
            ),
            mobileBadge: true
        },
        {
            header: 'Technician',
            accessor: (item: any) => (
                <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-[#8E939B]" />
                    <span className="text-white text-xs">{item.technician_name || item.technician?.username || 'Unassigned'}</span>
                </div>
            )
        },
        {
            header: 'Time Completed',
            accessor: (item: any) => {
                const rawTime = item.end_time || item.created_at || item.start_time;
                const timeFormatted = rawTime ? new Date(rawTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'Today';
                return (
                    <div className="flex items-center gap-1.5 text-xs font-mono text-[#8E939B]">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{timeFormatted}</span>
                    </div>
                );
            }
        },
        {
            header: 'Price',
            accessor: (item: any) => {
                const price = item.invoice_amount || item.price || (item.service_package_details?.price ? `${item.service_package_details.price}` : null);
                return price ? <span className="font-syncopate font-bold text-sm text-white">₹{price}</span> : <span className="text-neutral-500">-</span>;
            }
        }
    ];

    return (
        <div className="animate-[fadeIn_0.5s_ease-out] space-y-6 sm:space-y-8">
            {/* TOP ROW: Revenue Trend Chart + Live Queue */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
                <div className="lg:col-span-2 bg-[#0a0a0d] border border-white/10 p-4 sm:p-6 rounded-3xl h-[360px] sm:h-96 flex flex-col justify-between shadow-[4px_4px_12px_#020203,-4px_-4px_12px_#14151a]">
                    <div className="flex justify-between items-center mb-2 sm:mb-4">
                        <div>
                            <h3 className="font-syncopate font-bold tracking-widest text-xs text-[#8E939B]">REVENUE TREND (LAST 7 DAYS)</h3>
                            <p className="text-[10px] text-[#8E939B] uppercase tracking-wider">Daily gross income performance</p>
                        </div>
                    </div>
                    
                    <div className="w-full h-[260px] sm:h-[300px] min-h-[260px] relative">
                        {isLoading || !isMounted ? (
                            <Skeleton className="w-full h-full" />
                        ) : (
                            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                    <XAxis dataKey="name" stroke="#8E939B" fontSize={10} tickLine={false} axisLine={false} dy={10} />
                                    <YAxis stroke="#8E939B" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value}`} dx={-10} />
                                    <Tooltip contentStyle={{ backgroundColor: '#050505', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} itemStyle={{ color: '#01FFFF' }} />
                                    <Line type="monotone" dataKey="value" stroke="#01FFFF" strokeWidth={3} dot={{ fill: '#050505', stroke: '#01FFFF', strokeWidth: 2, r: 4 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* LIVE QUEUE SUMMARY */}
                <div className="bg-[#0a0a0d] border border-white/10 p-4 sm:p-6 rounded-3xl flex flex-col shadow-[4px_4px_12px_#020203,-4px_-4px_12px_#14151a]">
                    <div className="flex justify-between items-center mb-4 sm:mb-6 border-b border-white/5 pb-3 sm:pb-4">
                        <h3 className="font-syncopate font-bold tracking-widest text-sm text-white flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#01FFFF] animate-ping" />
                            LIVE QUEUE
                        </h3>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#01FFFF] bg-[#01FFFF]/10 px-2.5 py-1 rounded-full border border-[#01FFFF]/20">
                            {recentBookings.length} Active
                        </span>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-3 sm:space-y-4 pr-1 hide-scrollbar max-h-72">
                        {isLoading ? (
                            <>
                                <Skeleton className="w-full h-[76px]" />
                                <Skeleton className="w-full h-[76px]" />
                            </>
                        ) : recentBookings.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-center">
                                <Car className="w-8 h-8 text-[#8E939B]/40 mb-2" />
                                <p className="text-[#8E939B] text-xs font-bold">No active bookings in queue.</p>
                            </div>
                        ) : (
                            recentBookings.map((booking: any) => (
                                <div key={booking.id} className="bg-[#141518] border border-white/5 p-3.5 sm:p-4 rounded-2xl">
                                    <div className="flex justify-between items-start mb-1.5">
                                        <div>
                                            <p className="font-bold text-sm text-white font-mono tracking-wider">{booking.vehicle_info || booking.plate_number || 'Unknown Vehicle'}</p>
                                            <p className="text-[10px] text-[#8E939B] uppercase tracking-widest mt-0.5">{booking.service_package_details?.name || booking.service_name || 'Standard Wash'}</p>
                                        </div>
                                        <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-md ${booking.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-[#FF2A6D]/20 text-[#FF2A6D] border border-[#FF2A6D]/30'}`}>
                                            {booking.status}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* PROMINENT SECTION: TODAY'S WASHED VEHICLES */}
            <div className="bg-[#0a0a0d] border border-emerald-500/30 p-4 sm:p-8 rounded-3xl shadow-[4px_4px_12px_#020203,-4px_-4px_12px_#14151a]">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-white/5 pb-6">
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                                <CheckCircle2 className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-syncopate font-bold tracking-widest text-base sm:text-xl text-white flex items-center gap-2">
                                    TODAY&apos;S WASHED VEHICLES
                                </h3>
                                <p className="text-[10px] text-[#8E939B] uppercase tracking-[0.2em] mt-0.5">Real-time completion log for current date</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-auto">
                        <div className="bg-emerald-500/10 border border-emerald-500/30 px-4 py-2 rounded-2xl flex items-center gap-3 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Total Washed Today</span>
                            <span className="font-syncopate font-black text-xl text-white">{count}</span>
                        </div>
                    </div>
                </div>

                {isLoading ? (
                    <div className="space-y-3">
                        <Skeleton className="w-full h-16 rounded-2xl" />
                        <Skeleton className="w-full h-16 rounded-2xl" />
                    </div>
                ) : (
                    <ResponsiveDataContainer
                        data={completedVehiclesList}
                        columns={washedVehiclesColumns}
                        keyExtractor={(item, idx) => item.id || idx}
                        emptyMessage="No vehicles have been washed yet today."
                    />
                )}
            </div>
        </div>
    );
}
