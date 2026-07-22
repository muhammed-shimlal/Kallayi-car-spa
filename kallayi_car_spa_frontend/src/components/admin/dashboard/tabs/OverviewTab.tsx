'use client';

import React from 'react';
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Line } from 'recharts';
import { useDashboard } from '../context/DashboardContext';
import { Skeleton } from '@/components/ui/Skeleton';
import { Car, CheckCircle2, User, Clock } from 'lucide-react';

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

    return (
        <div className="animate-[fadeIn_0.5s_ease-out] space-y-8">
            {/* TOP ROW: Revenue Trend Chart + Live Queue */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-[#141518]/60 backdrop-blur-xl border border-white/5 p-6 rounded-3xl h-96 flex flex-col justify-between">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h3 className="font-syncopate font-bold tracking-widest text-xs text-[#8E939B]">REVENUE TREND (LAST 7 DAYS)</h3>
                            <p className="text-[10px] text-[#8E939B] uppercase tracking-wider">Daily gross income performance</p>
                        </div>
                    </div>
                    
                    {/* Strict Height Container for Recharts ResponsiveContainer */}
                    <div className="h-[300px] w-full min-h-[300px]">
                        {isLoading || !isMounted ? (
                            <Skeleton className="w-full h-full" />
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
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
                <div className="bg-[#141518]/60 backdrop-blur-xl border border-white/5 p-6 rounded-3xl flex flex-col">
                    <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
                        <h3 className="font-syncopate font-bold tracking-widest text-sm text-white flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#01FFFF] animate-ping"></span>
                            LIVE QUEUE
                        </h3>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#01FFFF] bg-[#01FFFF]/10 px-2.5 py-1 rounded-full border border-[#01FFFF]/20">
                            {recentBookings.length} Active
                        </span>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-4 pr-2 hide-scrollbar max-h-72">
                        {isLoading ? (
                            <>
                                <Skeleton className="w-full h-[76px]" />
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
                                <div key={booking.id} className="bg-white/5 border border-white/5 hover:border-white/10 p-4 rounded-2xl transition-all">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <p className="font-bold text-sm text-white font-mono tracking-wider">{booking.vehicle_info || booking.plate_number || 'Unknown Vehicle'}</p>
                                            <p className="text-[10px] text-[#8E939B] uppercase tracking-widest mt-1">{booking.service_package_details?.name || booking.service_name || 'Standard Wash'}</p>
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
            <div className="bg-[#141518]/60 backdrop-blur-xl border border-emerald-500/20 p-6 sm:p-8 rounded-3xl shadow-[0_0_40px_rgba(16,185,129,0.04)]">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 border-b border-white/5 pb-6">
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                                <CheckCircle2 className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-syncopate font-bold tracking-widest text-lg sm:text-xl text-white flex items-center gap-2">
                                    TODAY&apos;S WASHED VEHICLES
                                </h3>
                                <p className="text-[10px] text-[#8E939B] uppercase tracking-[0.2em] mt-0.5">Real-time completion log for current date</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="bg-emerald-500/10 border border-emerald-500/30 px-4 py-2 rounded-2xl flex items-center gap-3 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Total Washed Today</span>
                            <span className="font-syncopate font-black text-xl text-white">{count}</span>
                        </div>
                    </div>
                </div>

                {isLoading ? (
                    <div className="space-y-4">
                        <Skeleton className="w-full h-16 rounded-2xl" />
                        <Skeleton className="w-full h-16 rounded-2xl" />
                        <Skeleton className="w-full h-16 rounded-2xl" />
                    </div>
                ) : completedVehiclesList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white/2 border border-dashed border-white/10 rounded-3xl">
                        <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4 text-[#8E939B]">
                            <Car className="w-8 h-8 opacity-60" />
                        </div>
                        <h4 className="font-syncopate font-bold text-sm tracking-widest text-white mb-2">No vehicles have been washed yet today.</h4>
                        <p className="text-xs text-[#8E939B] max-w-md leading-relaxed">
                            Completed vehicle washes for today will automatically appear here in real-time as staff process and check out vehicles.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto hide-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/10 text-[10px] font-syncopate uppercase tracking-widest text-[#8E939B]">
                                    <th className="py-4 px-4">Vehicle Number</th>
                                    <th className="py-4 px-4">Service Package</th>
                                    <th className="py-4 px-4">Technician</th>
                                    <th className="py-4 px-4">Time Completed</th>
                                    <th className="py-4 px-4 text-right">Status / Price</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-sm">
                                {completedVehiclesList.map((item: any, idx: number) => {
                                    const plateNumber = item.vehicle_plate || item.vehicle_info || item.plate_number || 'Walk-In Vehicle';
                                    const packageName = item.service_package_name || item.service_package_details?.name || item.service_name || 'Standard Wash';
                                    const techName = item.technician_name || item.technician?.username || 'Unassigned';
                                    const rawTime = item.end_time || item.created_at || item.start_time;
                                    const timeFormatted = rawTime ? new Date(rawTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'Today';
                                    const price = item.invoice_amount || item.price || (item.service_package_details?.price ? `₹${item.service_package_details.price}` : null);

                                    return (
                                        <tr key={item.id || idx} className="hover:bg-white/5 transition-colors group">
                                            <td className="py-4 px-4 font-mono font-bold tracking-wider text-white flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#01FFFF] group-hover:border-[#01FFFF]/40 transition-colors">
                                                    <Car className="w-4 h-4" />
                                                </div>
                                                <span>{plateNumber}</span>
                                            </td>
                                            <td className="py-4 px-4 font-bold text-xs uppercase tracking-widest text-emerald-400">
                                                {packageName}
                                            </td>
                                            <td className="py-4 px-4 text-xs font-semibold text-[#8E939B]">
                                                <div className="flex items-center gap-2">
                                                    <User className="w-3.5 h-3.5 text-[#8E939B]" />
                                                    <span className="text-white">{techName}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-4 text-xs font-mono text-[#8E939B]">
                                                <div className="flex items-center gap-1.5">
                                                    <Clock className="w-3.5 h-3.5 text-[#8E939B]" />
                                                    <span>{timeFormatted}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {price && <span className="font-syncopate font-bold text-sm text-white">₹{price}</span>}
                                                    <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md">
                                                        COMPLETED
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
