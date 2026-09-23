"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  CATALOG_BRANDS, 
  getModelsForBrand, 
  resolveVehicleBodyType, 
  BODY_TYPE_OPTIONS 
} from "@/lib/vehicleCatalog";
import { VehicleType } from "@/types/database";
import { ChevronDown, Check, Sparkles, SlidersHorizontal } from "lucide-react";

export interface SmartVehicleSelectorProps {
  onVehicleChange: (vehicleData: {
    make: string;
    model: string;
    vehicle_type: VehicleType;
    isManual: boolean;
  }) => void;
  onBodyTypeChange?: (newBodyType: VehicleType, oldBodyType: VehicleType) => void;
  initialMake?: string;
  initialModel?: string;
  initialBodyType?: VehicleType;
  className?: string;
  disabled?: boolean;
}

export function SmartVehicleSelector({
  onVehicleChange,
  onBodyTypeChange,
  initialMake = "",
  initialModel = "",
  initialBodyType = "HATCHBACK",
  className = "",
  disabled = false,
}: SmartVehicleSelectorProps) {
  // Determine if initial values match catalog or are manual
  const initialBrandInCatalog = initialMake ? CATALOG_BRANDS.includes(initialMake) : false;
  const [isManual, setIsManual] = useState<boolean>(Boolean(initialMake && !initialBrandInCatalog));
  const [selectedBrand, setSelectedBrand] = useState<string>(initialMake || "");
  const [selectedModel, setSelectedModel] = useState<string>(initialModel || "");
  const [manualMake, setManualMake] = useState<string>(initialMake || "");
  const [manualModel, setManualModel] = useState<string>(initialModel || "");
  const [resolvedType, setResolvedType] = useState<VehicleType>(initialBodyType || "HATCHBACK");
  const [showTypeOverride, setShowTypeOverride] = useState<boolean>(false);

  // Stable refs for callbacks
  const onVehicleChangeRef = useRef(onVehicleChange);
  onVehicleChangeRef.current = onVehicleChange;

  const onBodyTypeChangeRef = useRef(onBodyTypeChange);
  onBodyTypeChangeRef.current = onBodyTypeChange;

  // Build key helper for deduplication
  const computeKey = (manual: boolean, make: string, model: string, type: VehicleType) => {
    return `${manual ? "MANUAL" : "CATALOG"}|${make.trim()}|${model.trim()}|${type}`;
  };

  const prevEmittedRef = useRef<string>(
    computeKey(
      Boolean(initialMake && !initialBrandInCatalog),
      initialMake || "",
      initialModel || "",
      initialBodyType || "HATCHBACK"
    )
  );

  const isInitialMount = useRef<boolean>(true);

  // Sync state if props change externally (e.g. user selected another record in parent)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const isBrandCatalog = initialMake ? CATALOG_BRANDS.includes(initialMake) : false;
    const nextIsManual = Boolean(initialMake && !isBrandCatalog);
    const nextKey = computeKey(nextIsManual, initialMake || "", initialModel || "", initialBodyType || "HATCHBACK");

    // If parent passed what we already emitted, do nothing
    if (prevEmittedRef.current === nextKey) return;

    setSelectedBrand(initialMake || "");
    setSelectedModel(initialModel || "");
    setManualMake(initialMake || "");
    setManualModel(initialModel || "");
    setResolvedType(initialBodyType || "HATCHBACK");
    setIsManual(nextIsManual);
    prevEmittedRef.current = nextKey;
  }, [initialMake, initialModel, initialBodyType]);

  const availableModels = getModelsForBrand(selectedBrand);
  const uniqueModels = availableModels.filter(
    (item, index, self) => index === self.findIndex((t) => t.model === item.model)
  );

  // Single source of emission effect
  useEffect(() => {
    const currentMake = isManual ? manualMake.trim() : selectedBrand.trim();
    const currentModel = isManual ? manualModel.trim() : selectedModel.trim();
    const currentKey = computeKey(isManual, currentMake, currentModel, resolvedType);

    if (prevEmittedRef.current === currentKey) return;
    prevEmittedRef.current = currentKey;

    if (isManual) {
      onVehicleChangeRef.current({
        make: manualMake.trim(),
        model: manualModel.trim(),
        vehicle_type: resolvedType,
        isManual: true,
      });
    } else if (selectedBrand && selectedModel) {
      onVehicleChangeRef.current({
        make: selectedBrand,
        model: selectedModel,
        vehicle_type: resolvedType,
        isManual: false,
      });
    } else if (!selectedBrand && !selectedModel && !isManual) {
      onVehicleChangeRef.current({
        make: "",
        model: "",
        vehicle_type: resolvedType,
        isManual: false,
      });
    }
  }, [selectedBrand, selectedModel, isManual, manualMake, manualModel, resolvedType]);

  const handleBrandSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const brand = e.target.value;
    setSelectedBrand(brand);
    setSelectedModel("");
    setShowTypeOverride(false);
  };

  const handleModelSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const model = e.target.value;
    setSelectedModel(model);
    setShowTypeOverride(false);

    if (selectedBrand && model) {
      const autoType = resolveVehicleBodyType(selectedBrand, model);
      if (autoType !== resolvedType) {
        if (onBodyTypeChangeRef.current) {
          onBodyTypeChangeRef.current(autoType, resolvedType);
        }
        setResolvedType(autoType);
      }
    }
  };

  const handleTypeSelect = (type: VehicleType) => {
    if (type !== resolvedType) {
      if (onBodyTypeChangeRef.current) {
        onBodyTypeChangeRef.current(type, resolvedType);
      }
      setResolvedType(type);
    }
    setShowTypeOverride(false);
  };

  const getVehicleIcon = (type: VehicleType) => {
    switch (type) {
      case "BIKE": return "🏍️";
      case "SUV": return "🏔️";
      case "COMPACT_SUV": return "🚙";
      case "SEDAN": return "🚘";
      case "MUV": return "🚐";
      case "VAN": return "🚐";
      case "LUXURY": return "✨";
      case "AUTO": return "🛺";
      case "TRUCK": return "🚚";
      default: return "🚗";
    }
  };

  return (
    <div className={`space-y-4 transform-gpu will-change-[transform,opacity] ${className}`}>
      {!isManual ? (
        /* Single-Column Catalog Mode */
        <div className="space-y-3">
          {/* Brand Selector */}
          <div>
            <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block mb-1">
              Brand / Manufacturer
            </label>
            <div className="relative">
              <select
                value={selectedBrand}
                onChange={handleBrandSelect}
                disabled={disabled}
                className="w-full bg-[#141518] border border-white/10 rounded-xl px-3.5 py-3 pr-10 text-xs font-bold text-white outline-none focus:border-[#01FFFF] transition-colors cursor-pointer appearance-none [color-scheme:dark] touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="" disabled className="text-zinc-500">
                  Select Brand (e.g., Maruti Suzuki, Hyundai, Tata)
                </option>
                {CATALOG_BRANDS.map((b) => (
                  <option key={b} value={b} className="bg-[#141518] text-white">
                    {b}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-zinc-400">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Model Selector */}
          <div>
            <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block mb-1">
              Model
            </label>
            <div className="relative">
              <select
                value={selectedModel}
                onChange={handleModelSelect}
                disabled={disabled || !selectedBrand}
                className="w-full bg-[#141518] border border-white/10 rounded-xl px-3.5 py-3 pr-10 text-xs font-bold text-white outline-none focus:border-[#01FFFF] transition-colors cursor-pointer appearance-none [color-scheme:dark] touch-manipulation disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <option value="" disabled className="text-zinc-500">
                  {selectedBrand ? "Select Model..." : "Select Brand First"}
                </option>
                {uniqueModels.map((m, index) => (
                  <option key={`${m.model}-${index}`} value={m.model} className="bg-[#141518] text-white">
                    {m.model} ({m.category})
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-zinc-400">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Manual Fallback Mode */
        <div className="space-y-3">
          <div>
            <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block mb-1">
              Make / Brand Name
            </label>
            <input
              type="text"
              value={manualMake}
              onChange={(e) => setManualMake(e.target.value)}
              disabled={disabled}
              placeholder="e.g., Maruti Suzuki, Hyundai"
              className="w-full bg-[#141518] border border-[#01FFFF]/40 rounded-xl px-3.5 py-3 text-xs font-bold text-white outline-none focus:border-[#01FFFF] transition-colors placeholder:text-zinc-600 disabled:opacity-50 touch-manipulation"
            />
          </div>
          <div>
            <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block mb-1">
              Model Name
            </label>
            <input
              type="text"
              value={manualModel}
              onChange={(e) => setManualModel(e.target.value)}
              disabled={disabled}
              placeholder="e.g., Swift, Creta, Thar"
              className="w-full bg-[#141518] border border-[#01FFFF]/40 rounded-xl px-3.5 py-3 text-xs font-bold text-white outline-none focus:border-[#01FFFF] transition-colors placeholder:text-zinc-600 disabled:opacity-50 touch-manipulation"
            />
          </div>
        </div>
      )}

      {/* Sleek Compact Body-Type Badge & Override Controller */}
      {(selectedModel || isManual) && (
        <div className="pt-1">
          <div className="flex items-center justify-between bg-[#141518] border border-white/10 rounded-xl px-3.5 py-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-white">
              <span className="text-base">{getVehicleIcon(resolvedType)}</span>
              <span className="text-[#01FFFF] uppercase tracking-wider">{resolvedType.replace(/_/g, ' ')}</span>
              {!isManual && (
                <span className="text-[10px] text-zinc-400 font-normal font-mono flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#01FFFF]/80 inline" /> Auto-detected
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowTypeOverride(!showTypeOverride)}
              className="text-[11px] font-bold text-[#01FFFF] hover:underline flex items-center gap-1 transition-colors cursor-pointer touch-manipulation"
            >
              <span>{showTypeOverride ? "Close" : "Change Body Type"}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showTypeOverride ? "rotate-180" : ""}`} />
            </button>
          </div>

          {/* Expandable Body-Type Override Dropdown */}
          {showTypeOverride && (
            <div className="mt-2 bg-[#141518] border border-white/10 rounded-xl p-2.5 space-y-1.5 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between px-2 py-1 text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                <span>Select Accurate Body Type</span>
                <SlidersHorizontal className="w-3 h-3 text-[#01FFFF]" />
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {BODY_TYPE_OPTIONS.map((opt) => (
                  <button
                    type="button"
                    key={opt.value}
                    onClick={() => handleTypeSelect(opt.value)}
                    className={`px-3 py-2 rounded-lg text-[11px] font-bold text-left flex items-center justify-between transition-colors cursor-pointer touch-manipulation ${
                      resolvedType === opt.value
                        ? "bg-[#01FFFF] text-black"
                        : "text-zinc-300 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <span>{opt.icon}</span>
                      <span>{opt.label}</span>
                    </span>
                    {resolvedType === opt.value && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Direct Manual Entry Fallback Link */}
      <div className="text-center pt-0.5">
        <button
          type="button"
          onClick={() => {
            const nextMode = !isManual;
            setIsManual(nextMode);
            if (nextMode) {
              setManualMake(selectedBrand);
              setManualModel(selectedModel);
            } else if (manualMake && CATALOG_BRANDS.includes(manualMake)) {
              setSelectedBrand(manualMake);
              setSelectedModel(manualModel);
            }
          }}
          className="text-[11px] font-semibold text-zinc-400 hover:text-[#01FFFF] transition-colors underline cursor-pointer touch-manipulation"
        >
          {isManual ? "← Back to Master Catalog Search" : "Vehicle or model not listed? Enter manually"}
        </button>
      </div>
    </div>
  );
}
