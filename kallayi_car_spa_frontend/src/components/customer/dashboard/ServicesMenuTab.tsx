'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  ChevronDown,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import api from '@/lib/api';
import { Vehicle } from './types';
import { VehicleType } from '@/types/database';
import { normalizeVehicleType, getVehicleTypeLabel, BODY_TYPE_OPTIONS } from '@/lib/vehicleCatalog';

interface ServicesMenuTabProps {
  myVehicles?: Vehicle[];
  onBookService: (servicePkg: any, vehicle: Vehicle | null) => void;
  onOpenAddVehicle?: () => void;
}

export function ServicesMenuTab({
  myVehicles = [],
  onBookService,
  onOpenAddVehicle,
}: ServicesMenuTabProps) {
  // 1. Safe vehicle list memoization (protects against undefined/null & stabilizes reference)
  const safeVehicles: Vehicle[] = useMemo(() => {
    return Array.isArray(myVehicles)
      ? myVehicles.filter((v): v is Vehicle => Boolean(v && typeof v === 'object' && (v.id || v.plate)))
      : [];
  }, [myVehicles]);

  // Vehicle Selection State
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(() => {
    return safeVehicles.length > 0 ? safeVehicles[0] : null;
  });

  // Fallback body type if customer has no saved vehicle selected
  const [previewBodyType, setPreviewBodyType] = useState<VehicleType>('HATCHBACK');
  const [isVehicleDropdownOpen, setIsVehicleDropdownOpen] = useState(false);

  // 2. Services Data State & 4-State Async Machine
  const [services, setServices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadTrigger, setReloadTrigger] = useState<number>(0);

  // Sync default vehicle when safeVehicles loads without infinite loops
  useEffect(() => {
    if (safeVehicles.length > 0) {
      setSelectedVehicle((prev) => {
        if (prev && safeVehicles.some((v) => String(v.id) === String(prev.id))) {
          return prev;
        }
        return safeVehicles[0] || null;
      });
    }
  }, [safeVehicles]);

  // Determine active effective vehicle body type
  const effectiveVehicleType: VehicleType = selectedVehicle?.vehicle_type
    ? normalizeVehicleType(selectedVehicle.vehicle_type)
    : previewBodyType;

  const vehicleMetadata = getVehicleTypeLabel(effectiveVehicleType) || {
    label: 'Hatchback',
    icon: '🚗',
    category: 'Hatchback',
  };

  // 3. Fetch Dynamic Catalog with AbortController, Timeout & Error Boundary Guard
  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, 10000); // 10s client timeout

    const fetchDynamicMenu = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const res = await api.get('/services', {
          params: { vehicle_type: effectiveVehicleType },
          signal: abortController.signal,
          headers: { 'Cache-Control': 'no-cache' },
        });

        clearTimeout(timeoutId);

        const rawList = res.data?.data ?? res.data?.results ?? res.data ?? [];
        const list = Array.isArray(rawList)
          ? rawList.filter((item): item is any => Boolean(item && typeof item === 'object'))
          : [];

        if (isMounted) {
          setServices(list);
          setErrorMessage(null);
        }
      } catch (err: any) {
        if (!isMounted) return;
        console.error('[ServicesMenuTab] Failed to load dynamic service menu:', err);
        const isTimeout =
          err?.code === 'ECONNABORTED' ||
          err?.name === 'AbortError' ||
          err?.message?.includes('timed out') ||
          err?.message?.includes('aborted');

        const message = isTimeout
          ? 'Network request timed out while loading services. Please check your connection and tap retry.'
          : (err?.response?.data?.error || err?.message || 'Unable to load treatments at this time.');
        setErrorMessage(message);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchDynamicMenu();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      abortController.abort();
    };
  }, [effectiveVehicleType, reloadTrigger]);

  const activeVehicleTitle = selectedVehicle
    ? `${selectedVehicle?.make ?? ''} ${selectedVehicle?.model ?? ''}`.trim() || 'Vehicle'
    : `General ${vehicleMetadata.label}`;

  // Safe feature extraction
  const getFeaturesList = useCallback((svc: any): string[] => {
    if (Array.isArray(svc?.features) && svc.features.length > 0) {
      return svc.features
        .map((f: any) => (typeof f === 'string' ? f : f?.name || f?.title || String(f || '')))
        .filter(Boolean);
    }
    if (Array.isArray(svc?.chemical_recipe?.features) && svc.chemical_recipe.features.length > 0) {
      return svc.chemical_recipe.features
        .map((f: any) => (typeof f === 'string' ? f : String(f || '')))
        .filter(Boolean);
    }
    return [
      'High-pressure touchless pre-wash',
      'pH-neutral snow foam & gloss rinse',
      'Hand dried with plush microfiber towels',
    ];
  }, []);

  const servicesList = services ?? [];

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

            {safeVehicles.length > 0 ? (
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
                        {selectedVehicle?.make ?? ''} {selectedVehicle?.model ?? ''}
                      </span>
                      <span className="text-[11px] font-mono text-neutral-400 block">
                        {selectedVehicle?.plate || 'No Plate'} • {vehicleMetadata.label}
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
                      className="absolute left-0 right-0 top-full mt-2 z-30 bg-[#16171d] border border-white/15 rounded-2xl shadow-2xl p-2 space-y-1 max-h-60 overflow-y-auto"
                    >
                      {safeVehicles.map((v) => {
                        if (!v) return null;
                        const isSelected = selectedVehicle?.id === v.id;
                        const vMeta = getVehicleTypeLabel(v.vehicle_type);
                        return (
                          <button
                            key={v.id || v.plate}
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
                                <span className="text-xs font-semibold block text-white">{v.make ?? ''} {v.model ?? ''}</span>
                                <span className="text-[10px] text-neutral-400 block font-mono">{v.plate || 'No Plate'} • {vMeta.label}</span>
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
                {(BODY_TYPE_OPTIONS ?? []).filter((bt) => bt.value !== 'TRUCK').map((bt) => {
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
                      <span>{(bt.label || '').split('/')[0].trim()}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. DYNAMIC SERVICE CARDS GRID WITH 4-STATE HANDLING */}
      {/* ========================================================================= */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-[#01FFFF]" />
            <h2 className="text-lg font-bold font-syncopate text-white uppercase tracking-wider">
              {vehicleMetadata.label} Treatments
            </h2>
            {!isLoading && !errorMessage && (
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-neutral-400">
                {servicesList.length} Available
              </span>
            )}
          </div>

          {/* Quick Refresh Trigger */}
          {!isLoading && (
            <button
              type="button"
              onClick={() => setReloadTrigger((r) => r + 1)}
              className="text-neutral-400 hover:text-[#01FFFF] p-2 rounded-xl hover:bg-white/5 transition flex items-center gap-1.5 text-xs font-mono cursor-pointer"
              title="Refresh treatments"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          )}
        </div>

        {/* STATE 1: LOADING STATE (Skeleton Grid) */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-84 rounded-3xl bg-[#0b0c10]/80 border border-white/5 p-6 flex flex-col justify-between animate-pulse"
              >
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="h-3 w-20 bg-white/10 rounded-full" />
                      <div className="h-6 w-36 bg-white/10 rounded-xl" />
                    </div>
                    <div className="w-9 h-9 rounded-2xl bg-white/10" />
                  </div>
                  <div className="h-9 w-full bg-white/5 rounded-xl" />
                  <div className="space-y-2 pt-2">
                    <div className="h-3.5 w-4/5 bg-white/5 rounded" />
                    <div className="h-3.5 w-3/4 bg-white/5 rounded" />
                    <div className="h-3.5 w-2/3 bg-white/5 rounded" />
                  </div>
                </div>
                <div className="pt-4 border-t border-white/5 space-y-3">
                  <div className="flex justify-between items-end">
                    <div className="h-7 w-24 bg-white/10 rounded-xl" />
                    <div className="h-5 w-16 bg-white/5 rounded-lg" />
                  </div>
                  <div className="h-11 w-full bg-white/10 rounded-2xl" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* STATE 2: ERROR STATE (Recovery Card with Retry Button) */}
        {!isLoading && errorMessage && (
          <div className="p-8 sm:p-12 text-center bg-[#0c0d12]/90 border border-red-500/20 rounded-3xl space-y-4 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(239,68,68,0.2)]">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-1.5 max-w-md mx-auto">
              <h3 className="text-base sm:text-lg font-bold text-white tracking-wide">
                Unable to Load Treatments
              </h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                {errorMessage}
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setReloadTrigger((r) => r + 1)}
                className="px-6 py-3 rounded-2xl bg-[#01FFFF] hover:bg-[#00e6e6] text-black font-extrabold text-xs uppercase tracking-wider transition-all inline-flex items-center gap-2 shadow-[0_0_20px_rgba(1,255,255,0.3)] hover:shadow-[0_0_25px_rgba(1,255,255,0.4)] cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Retry Catalog</span>
              </button>
            </div>
          </div>
        )}

        {/* STATE 3: EMPTY STATE (Friendly Notification) */}
        {!isLoading && !errorMessage && servicesList.length === 0 && (
          <div className="p-12 text-center bg-[#0c0d12] border border-white/10 rounded-3xl space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 text-neutral-400 flex items-center justify-center mx-auto">
              <Car className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">No services registered for this vehicle tier</h3>
              <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                No active treatments configured for {vehicleMetadata.label}. Please select another vehicle or body type.
              </p>
            </div>
          </div>
        )}

        {/* STATE 4: SUCCESS STATE (Render Safe Dynamic Service Cards) */}
        {!isLoading && !errorMessage && servicesList.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {servicesList.map((svc, idx) => {
              if (!svc) return null;
              const svcId = svc.id ?? `service-${idx}`;
              const svcName = svc.name ?? 'Spa Treatment';
              const effectivePrice = Number(svc.resolved_price ?? svc.price ?? svc.final_price ?? svc.base_price ?? 0);
              const duration = Number(svc.duration_minutes || svc.estimated_time_minutes || svc.estimated_duration || 45);
              const description = svc.description || 'Full exterior pressure rinse, foam bath, wheel cleaning, and microfiber dry.';
              const features = getFeaturesList(svc);

              return (
                <motion.div
                  key={svcId}
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
                          {svcName}
                        </h3>
                      </div>
                      <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 text-neutral-400 group-hover:text-[#01FFFF] group-hover:border-[#01FFFF]/30 transition shrink-0">
                        <Sparkles className="w-4 h-4" />
                      </div>
                    </div>

                    <p className="text-xs text-neutral-400 leading-relaxed line-clamp-2 mb-6">
                      {description}
                    </p>

                    {/* Features Bullet Points (Defensively Rendered) */}
                    <div className="space-y-2 mb-6 border-t border-white/5 pt-4">
                      {features.map((featureText, fIdx) => (
                        <div key={fIdx} className="flex items-center gap-2 text-xs text-neutral-300">
                          <ShieldCheck className="w-3.5 h-3.5 text-[#01FFFF] shrink-0" />
                          <span className="line-clamp-1">{featureText}</span>
                        </div>
                      ))}
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
                            ₹{effectivePrice.toLocaleString()}
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
                      <span className="truncate max-w-[200px] sm:max-w-none">Book for {activeVehicleTitle}</span>
                      <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform shrink-0" />
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
