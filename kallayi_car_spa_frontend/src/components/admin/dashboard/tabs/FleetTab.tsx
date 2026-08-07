'use client';

import React, { useState, useEffect } from 'react';
import { Car, RefreshCw } from 'lucide-react';
import { getApiBaseUrl } from '@/lib/api';

// Configurable API Endpoint for Fleet Data (Easily Swappable)
export const FLEET_API_ENDPOINT = '/api/fleet/vehicles/';

export interface FleetVehicle {
    id?: number | string;
    make?: string;
    model?: string;
    vehicle_model?: string;
    plate_number?: string;
    odometer?: number | string;
    last_service_odometer?: number | string;
    assigned_tech?: string;
    assigned_technician?: string;
    technician_name?: string;
    driver?: string;
    status?: string;
    is_active?: boolean;
}

const DEFAULT_FLEET_VEHICLES: FleetVehicle[] = [
    {
        id: 1,
        vehicle_model: 'Ford Transit Mobile Spa 01',
        plate_number: 'KL-07-CC-1001',
        odometer: '42,500 km',
        assigned_tech: 'Rahul K.',
        status: 'READY',
        is_active: true,
    },
    {
        id: 2,
        vehicle_model: 'Tata Ace Service Van 02',
        plate_number: 'KL-07-CC-1002',
        odometer: '28,100 km',
        assigned_tech: 'Sujith M.',
        status: 'ON JOB',
        is_active: true,
    },
    {
        id: 3,
        vehicle_model: 'Mahindra Supro Mobile Unit 03',
        plate_number: 'KL-07-CC-1003',
        odometer: '15,800 km',
        assigned_tech: 'Anil P.',
        status: 'READY',
        is_active: true,
    },
];

export default function FleetTab() {
    const [vehicles, setVehicles] = useState<FleetVehicle[]>(DEFAULT_FLEET_VEHICLES);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

    const fetchFleetData = async (isManualRefresh = false) => {
        if (isManualRefresh) {
            setIsRefreshing(true);
        } else {
            setIsLoading(true);
        }

        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
            const apiBase = getApiBaseUrl();
            
            // Build full URL while supporting both relative paths (/api/fleet/vehicles/) and full URLs
            const fullUrl = FLEET_API_ENDPOINT.startsWith('http')
                ? FLEET_API_ENDPOINT
                : `${apiBase}${FLEET_API_ENDPOINT.replace(/^\/api/, '')}`;

            const response = await fetch(fullUrl, {
                method: 'GET',
                headers: {
                    ...(token ? { Authorization: `Token ${token}` } : {}),
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const data = await response.json();
                const fetchedList = Array.isArray(data) ? data : data.results || [];
                if (fetchedList.length > 0) {
                    setVehicles(fetchedList);
                }
            }
        } catch (error) {
            console.warn('Could not fetch fleet data from API, using current data.', error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchFleetData();
    }, []);

    // ── Dynamic Top Grid Stats Calculations ──────────────────────────
    const activeVehiclesCount = vehicles.filter(v => v.is_active !== false).length;
    
    const uniqueTechnicians = new Set(
        vehicles
            .map(v => v.assigned_tech || v.assigned_technician || v.technician_name || v.driver)
            .filter(Boolean)
    );
    const assignedTechCount = uniqueTechnicians.size;

    const fleetStatus = vehicles.length > 0 && activeVehiclesCount > 0 ? 'Operational' : 'Idle';

    // Helper functions for dynamic table row formatting
    const getVehicleTitle = (v: FleetVehicle) => {
        if (v.vehicle_model) return v.vehicle_model;
        if (v.make && v.model) return `${v.make} ${v.model}`;
        if (v.model) return v.model;
        if (v.make) return v.make;
        return 'Service Vehicle';
    };

    const getOdometerDisplay = (v: FleetVehicle) => {
        const val = v.odometer ?? v.last_service_odometer;
        if (val === undefined || val === null) return '0 km';
        if (typeof val === 'number') return `${val.toLocaleString()} km`;
        return String(val);
    };

    const getTechDisplay = (v: FleetVehicle) => {
        return v.assigned_tech || v.assigned_technician || v.technician_name || v.driver || 'Unassigned';
    };

    const getStatusDisplay = (v: FleetVehicle) => {
        if (v.status) return v.status;
        return v.is_active !== false ? 'READY' : 'OFFLINE';
    };

    return (
        <div className="space-y-8 animate-[fadeIn_0.3s_ease-out]">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="font-syncopate font-bold text-xl tracking-widest">
                        FLEET &amp; SERVICE VEHICLES<span className="text-amber-400">.</span>
                    </h2>
                    <p className="text-[10px] text-[#8E939B] uppercase tracking-[0.25em] font-bold mt-1">
                        Operational Support Vehicles &amp; Log Audit
                    </p>
                </div>
                <button
                    onClick={() => fetchFleetData(true)}
                    disabled={isRefreshing}
                    className="flex items-center gap-2 bg-[#141518]/80 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-xl text-[#8E939B] hover:text-white transition-all text-xs font-bold uppercase tracking-widest active:scale-95 touch-manipulation disabled:opacity-50"
                    title="Refresh Fleet Data"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">Refresh</span>
                </button>
            </div>

            {/* Dynamic Top Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#141518]/60 border border-amber-500/20 p-6 rounded-3xl">
                    <p className="text-amber-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                        <Car className="w-4 h-4" /> Active Fleet Vehicles
                    </p>
                    <h3 className="text-3xl font-syncopate font-bold text-white">
                        {isLoading ? '...' : `${activeVehiclesCount} Units`}
                    </h3>
                </div>

                <div className="bg-[#141518]/60 border border-white/5 p-6 rounded-3xl">
                    <p className="text-[#8E939B] text-[10px] font-bold uppercase tracking-[0.2em] mb-2">
                        Assigned Technicians
                    </p>
                    <h3 className="text-3xl font-syncopate font-bold text-white">
                        {isLoading ? '...' : `${assignedTechCount} Active`}
                    </h3>
                </div>

                <div className="bg-[#141518]/60 border border-emerald-500/20 p-6 rounded-3xl">
                    <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-2">
                        Fleet Status
                    </p>
                    <h3 className="text-3xl font-syncopate font-bold text-emerald-400">
                        {isLoading ? '...' : fleetStatus}
                    </h3>
                </div>
            </div>

            {/* Service Vehicle Directory Table */}
            <div className="bg-[#141518]/60 border border-white/5 rounded-3xl p-6">
                <h4 className="font-syncopate font-bold text-sm tracking-widest text-[#01FFFF] mb-4">
                    SERVICE VEHICLE DIRECTORY
                </h4>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-black/40 text-[#8E939B] font-grotesk text-[10px] uppercase tracking-widest">
                            <tr>
                                <th className="p-4 pl-6">Vehicle Model</th>
                                <th className="p-4">Plate Number</th>
                                <th className="p-4">Odometer</th>
                                <th className="p-4">Assigned Tech</th>
                                <th className="p-4 text-right pr-6">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-xs font-mono">
                            {vehicles.map((v, index) => (
                                <tr key={v.id || v.plate_number || index} className="hover:bg-white/5 transition-colors">
                                    <td className="p-4 pl-6 font-bold text-white">{getVehicleTitle(v)}</td>
                                    <td className="p-4 text-amber-400">{v.plate_number || 'N/A'}</td>
                                    <td className="p-4 text-gray-300">{getOdometerDisplay(v)}</td>
                                    <td className="p-4 text-white">{getTechDisplay(v)}</td>
                                    <td className="p-4 text-right pr-6 text-emerald-400 font-bold">
                                        {getStatusDisplay(v)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
