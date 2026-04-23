'use client';

import React from 'react';
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Line } from 'recharts';
import { useDashboard } from '../context/DashboardContext';

import { Skeleton } from '@/components/ui/Skeleton';

export default function OverviewTab() {
    const [isMounted, setIsMounted] = React.useState(false);
    React.useEffect(() => { setIsMounted(true); }, []);

    const { uiState, financeState, queueState } = useDashboard();
    const { chartData } = financeState;
    const { recentBookings } = queueState;
    const { isLoading } = uiState;

    return (
        <div className="animate-[fadeIn_0.5s_ease-out] grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 bg-[#141518]/60 backdrop-blur-xl border border-white/5 p-6 rounded-3xl h-96">
                            {isLoading || !isMounted ? (
                                <Skeleton className="w-full h-full" />
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                        <XAxis dataKey="name" stroke="#8E939B" fontSize={10} tickLine={false} axisLine={false} dy={10} />
                                        <YAxis stroke="#8E939B" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value}`} dx={-10} />
                                        <Tooltip contentStyle={{ backgroundColor: '#050505', border: '1px solid rgba(255,255,255,0.1)' }} itemStyle={{ color: '#01FFFF' }} />
                                        <Line type="monotone" dataKey="value" stroke="#01FFFF" strokeWidth={3} dot={{ fill: '#050505', stroke: '#01FFFF', strokeWidth: 2, r: 4 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            )}
                        </div>

                        <div className="bg-[#141518]/60 backdrop-blur-xl border border-white/5 p-6 rounded-3xl flex flex-col">
                            <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
                                <h3 className="font-syncopate font-bold tracking-widest text-sm">LIVE QUEUE</h3>
                            </div>
                            <div className="flex-1 overflow-y-auto space-y-4 pr-2 hide-scrollbar">
                                {isLoading ? (
                                    <>
                                        <Skeleton className="w-full h-[76px]" />
                                        <Skeleton className="w-full h-[76px]" />
                                        <Skeleton className="w-full h-[76px]" />
                                    </>
                                ) : recentBookings.length === 0 ? <p className="text-[#8E939B] text-center text-xs mt-10">No active bookings.</p> :
                                    recentBookings.map((booking: any) => (
                                        <div key={booking.id} className="bg-white/5 border border-white/5 p-4 rounded-2xl">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <p className="font-bold text-sm text-white">{booking.vehicle_info || 'Unknown Vehicle'}</p>
                                                    <p className="text-[10px] text-[#8E939B] uppercase tracking-widest mt-1">{booking.service_package_details?.name || 'Standard Wash'}</p>
                                                </div>
                                                <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-sm ${booking.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#FF2A6D]/20 text-[#FF2A6D]'}`}>
                                                    {booking.status}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                }
                            </div>
                        </div>
                    </div>
    );
}
