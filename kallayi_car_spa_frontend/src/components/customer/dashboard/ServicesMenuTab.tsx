'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Car,
  Clock,
  ShieldCheck,
  ChevronRight,
  Plus,
  Layers,
  ArrowRight,
  CheckCircle2,
  ChevronDown
} from 'lucide-react';
import api from '@/lib/api';
import { Vehicle } from './types';
import { VehicleType } from '@/types/database';
import { normalizeVehicleType, getVehicleTypeLabel, BODY_TYPE_OPTIONS } from '@/lib/vehicleCatalog';

interface ServicesMenuTabProps {
  myVehicles: Vehicle[];
  onBookService: (servicePkg: any, vehicle: Vehicle | null) => void;
  onOpenAddVehicle?: () => void;
}

export function ServicesMenuTab({
  myVehicles,
  onBookService,
  onOpenAddVehicle,
}: ServicesMenuTabProps) {
  // 1. Vehicle Selection State
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(
    myVehicles.length > 0 ? myVehicles[0] : null
  );

  // Fallback body type if customer has no saved vehicle selected
  const [previewBodyType, setPreviewBodyType] = useState<VehicleType>('HATCHBACK');
  const [isVehicleDropdownOpen, setIsVehicleDropdownOpen] = useState(false);

  // 2. Services Data State
  const [services, setServices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Sync default vehicle when myVehicles loads
  useEffect(() => {
    if (myVehicles.length > 0 && !selectedVehicle) {
      setSelectedVehicle(myVehicles[0]);
    }
  }, [myVehicles, selectedVehicle]);

  // Determine active effective vehicle body type
  const effectiveVehicleType: VehicleType = selectedVehicle
    ? normalizeVehicleType(selectedVehicle.vehicle_type)
    : previewBodyType;

  const vehicleMetadata = getVehicleTypeLabel(effectiveVehicleType);

  // 3. Fetch Dynamic Catalog for current body type
  useEffect(() => {
    let isMounted = true;
    const fetchDynamicMenu = async () => {
      setIsLoading(true);
      try {
        const res = await api.get('/services', {
          params: { vehicle_type: effectiveVehicleType },
        });
        const list = Array.isArray(res.data?.data)
          ? res.data.data
          : (Array.isArray(res.data) ? res.data : []);
        if (isMounted) {
          setServices(list);
        }
      } catch (err) {
        console.error('Failed to load dynamic service menu:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchDynamicMenu();
    return () => {
      isMounted = false;
    };
  }, [effectiveVehicleType]);

  const activeVehicleTitle = selectedVehicle
    ? `${selectedVehicle.make} ${selectedVehicle.model}`
    : `General ${vehicleMetadata.label}`;

  return (
    <div className="space-y-8">
      {/* ========================================================================= */}
      {/* 1. TOP DYNAMIC VEHICLE SELECTOR HERO CARD */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#0c0d12] via-[#090a0e] to-black border border-white/10 p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#01FFFF]/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#01FFFF]/10 border border-[#01FFFF]/20 text-[#01FFFF] text-[11px] font-mono uppercase tracking-widest font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>DYNAMIC TIER-PRICED CATALOG</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
              Service Menu & Treatments
            </h1>
            <p className="text-sm text-neutral-400 font-light max-w-xl">
              Pricing dynamically calculated for your vehicle&apos;s exact body type and specifications. No hidden surcharges.
            </p>
          </div>

          {/* Active Vehicle Switcher */}
          <div className="bg-[#121318] p-3 sm:p-4 rounded-3xl border border-white/10 shadow-lg min-w-[280px]">
            <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono mb-2 uppercase tracking-wider">
              <span>Active Vehicle Tier</span>
              {onOpenAddVehicle && (
                <button
                  type="button"
                  onClick={onOpenAddVehicle}
                  className="text-[#01FFFF] hover:underline flex items-center gap-1 font-bold cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Add Car
                </button>
              )}
            </div>

            {myVehicles.length > 0 ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsVehicleDropdownOpen(!isVehicleDropdownOpen)}
                  className="w-full bg-black/60 hover:bg-black/90 border border-white/10 rounded-2xl p-3 flex items-center justify-between text-left transition cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{vehicleMetadata.icon}</span>
                    <div>
                      <span className="text-sm font-bold text-white block group-hover:text-[#01FFFF] transition truncate max-w-[180px]">
                        {selectedVehicle?.make} {selectedVehicle?.model}
                      </span>
                      <span className="text-[11px] font-mono text-neutral-400 block">
                        {selectedVehicle?.plate} • {vehicleMetadata.label}
                      </span>
                    </div>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-neutral-400 transition-transform ${isVehicleDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Options */}
                <AnimatePresence>
                  {isVehicleDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.98 }}
                      className="absolute left-0 right-0 top-full mt-2 z-30 bg-[#16171d] border border-white/15 rounded-2xl shadow-2xl p-2 space-y-1"
                    >
                      {myVehicles.map((v) => {
                        const isSelected = selectedVehicle?.id === v.id;
                        const vMeta = getVehicleTypeLabel(v.vehicle_type);
                        return (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => {
                              setSelectedVehicle(v);
                              setIsVehicleDropdownOpen(false);
                            }}
                            className={`w-full p-2.5 rounded-xl text-left flex items-center justify-between transition cursor-pointer ${
                              isSelected
                                ? 'bg-[#01FFFF]/15 text-[#01FFFF] border border-[#01FFFF]/30 font-bold'
                                : 'hover:bg-white/5 text-neutral-300'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <span>{vMeta.icon}</span>
                              <div>
                                <span className="text-xs font-semibold block text-white">{v.make} {v.model}</span>
                                <span className="text-[10px] text-neutral-400 block font-mono">{v.plate} • {vMeta.label}</span>
                              </div>
                            </div>
                            {isSelected && <CheckCircle2 className="w-4 h-4 text-[#01FFFF]" />}
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              /* No saved vehicle: interactive body type preview switcher */
              <div className="flex flex-wrap gap-1.5 pt-1">
                {BODY_TYPE_OPTIONS.filter((bt) => bt.value !== 'TRUCK').map((bt) => {
                  const isSelected = previewBodyType === bt.value;
                  return (
                    <button
                      key={bt.value}
                      type="button"
                      onClick={() => setPreviewBodyType(bt.value)}
                      className={`text-[11px] px-2.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition cursor-pointer ${
                        isSelected
                          ? 'bg-[#01FFFF] text-black shadow-[0_0_12px_rgba(1,255,255,0.3)]'
                          : 'bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white border border-white/5'
                      }`}
                    >
                      <span>{bt.icon}</span>
                      <span>{bt.label.split('/')[0].trim()}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. DYNAMIC SERVICE CARDS GRID */}
      {/* ========================================================================= */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-[#01FFFF]" />
            <h2 className="text-lg font-bold font-syncopate text-white uppercase tracking-wider">
              {vehicleMetadata.label} Treatments
            </h2>
            <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-neutral-400">
              {services.length} Available
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-80 rounded-3xl bg-neutral-900/40 border border-white/5 animate-pulse" />
            ))}
          </div>
        ) : services.length === 0 ? (
          <div className="p-12 text-center bg-[#0c0d12] border border-white/10 rounded-3xl space-y-3">
            <Car className="w-12 h-12 text-neutral-600 mx-auto" />
            <h3 className="text-base font-bold text-white">No services registered for this vehicle tier</h3>
            <p className="text-xs text-neutral-400">Please check back soon or select a different vehicle body type.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((svc) => {
              const effectivePrice = svc.resolved_price ?? svc.price ?? svc.final_price ?? 0;
              const duration = svc.duration_minutes || svc.estimated_time_minutes || 45;

              return (
                <motion.div
                  key={svc.id}
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.2 }}
                  className="bg-[#0b0c10] border border-white/10 hover:border-[#01FFFF]/40 rounded-3xl p-6 flex flex-col justify-between shadow-xl transition-all group relative overflow-hidden"
                >
                  <div>
                    {/* Header: Service Name & Category */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#01FFFF] uppercase tracking-widest mb-1">
                          <span>{vehicleMetadata.icon}</span>
                          <span>{vehicleMetadata.label} TIER</span>
                        </div>
                        <h3 className="font-syncopate font-bold text-lg text-white group-hover:text-[#01FFFF] transition">
                          {svc.name}
                        </h3>
                      </div>
                      <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 text-neutral-400 group-hover:text-[#01FFFF] group-hover:border-[#01FFFF]/30 transition shrink-0">
                        <Sparkles className="w-4 h-4" />
                      </div>
                    </div>

                    <p className="text-xs text-neutral-400 leading-relaxed line-clamp-2 mb-6">
                      {svc.description || 'Full exterior pressure rinse, foam bath, wheel cleaning, and microfiber dry.'}
                    </p>

                    {/* Features Bullet Points */}
                    <div className="space-y-2 mb-6 border-t border-white/5 pt-4">
                      <div className="flex items-center gap-2 text-xs text-neutral-300">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#01FFFF] shrink-0" />
                        <span>High-pressure touchless pre-wash</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-neutral-300">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#01FFFF] shrink-0" />
                        <span>pH-neutral snow foam & gloss rinse</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-neutral-300">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#01FFFF] shrink-0" />
                        <span>Hand dried with plush microfiber towels</span>
                      </div>
                    </div>
                  </div>

                  {/* Pricing & CTA Footer */}
                  <div className="pt-4 border-t border-white/10 mt-auto">
                    <div className="flex items-baseline justify-between mb-4">
                      <div>
                        <span className="text-[10px] uppercase font-mono text-neutral-400 block tracking-wider">
                          Exact Price for {vehicleMetadata.label}
                        </span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                            ₹{Number(effectivePrice).toLocaleString()}
                          </span>
                          <span className="text-xs text-neutral-500 font-mono">incl. GST</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] uppercase font-mono text-neutral-500 block">Est. Time</span>
                        <span className="text-xs font-mono font-bold text-neutral-300 inline-flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[#01FFFF]" /> {duration}m
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onBookService(svc, selectedVehicle)}
                      className="w-full py-3 px-4 rounded-2xl bg-[#01FFFF] hover:bg-[#00e6e6] text-black font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(1,255,255,0.25)] hover:shadow-[0_0_25px_rgba(1,255,255,0.4)] cursor-pointer group/btn"
                    >
                      <span>Book for {activeVehicleTitle}</span>
                      <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
