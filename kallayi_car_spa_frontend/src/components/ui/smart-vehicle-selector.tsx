"use client";

import React, { useState, useEffect } from "react";
import { 
  CATALOG_BRANDS, 
  getModelsForBrand, 
  resolveVehicleBodyType, 
  DjangoVehicleType, 
  BODY_TYPE_OPTIONS 
} from "@/lib/vehicleCatalog";
import { ChevronDown, Check } from "lucide-react";

export interface SmartVehicleSelectorProps {
  onVehicleChange: (vehicleData: {
    make: string;
    model: string;
    vehicle_type: DjangoVehicleType;
    isManual: boolean;
  }) => void;
  onBodyTypeChange?: (newBodyType: DjangoVehicleType, oldBodyType: DjangoVehicleType) => void;
  initialMake?: string;
  initialModel?: string;
  initialBodyType?: DjangoVehicleType;
  className?: string;
}

export function SmartVehicleSelector({
  onVehicleChange,
  onBodyTypeChange,
  initialMake = "",
  initialModel = "",
  initialBodyType = "HATCHBACK",
  className = "",
}: SmartVehicleSelectorProps) {
  const [isManual, setIsManual] = useState<boolean>(false);
  const [selectedBrand, setSelectedBrand] = useState<string>(initialMake);
  const [selectedModel, setSelectedModel] = useState<string>(initialModel);
  const [manualMake, setManualMake] = useState<string>(initialMake);
  const [manualModel, setManualModel] = useState<string>(initialModel);
  const [resolvedType, setResolvedType] = useState<DjangoVehicleType>(initialBodyType);
  const [showTypeOverride, setShowTypeOverride] = useState<boolean>(false);

  const availableModels = getModelsForBrand(selectedBrand);

  // Auto-resolve body type on catalog brand + model change
  useEffect(() => {
    if (!isManual) {
      if (selectedBrand && selectedModel) {
        const newType = resolveVehicleBodyType(selectedBrand, selectedModel);
        if (newType !== resolvedType) {
          if (onBodyTypeChange) onBodyTypeChange(newType, resolvedType);
          setResolvedType(newType);
        }
        onVehicleChange({
          make: selectedBrand,
          model: selectedModel,
          vehicle_type: newType,
          isManual: false,
        });
      }
    }
  }, [selectedBrand, selectedModel, isManual]);

  // Update on manual inputs change
  useEffect(() => {
    if (isManual) {
      onVehicleChange({
        make: manualMake || "Standard",
        model: manualModel || "Vehicle",
        vehicle_type: resolvedType,
        isManual: true,
      });
    }
  }, [isManual, manualMake, manualModel, resolvedType]);

  const handleBrandSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const brand = e.target.value;
    setSelectedBrand(brand);
    setSelectedModel("");
  };

  const handleModelSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const model = e.target.value;
    setSelectedModel(model);
  };

  const handleTypeSelect = (type: DjangoVehicleType) => {
    if (type !== resolvedType) {
      if (onBodyTypeChange) onBodyTypeChange(type, resolvedType);
      setResolvedType(type);
    }
    setShowTypeOverride(false);
  };

  const getVehicleIcon = (type: DjangoVehicleType) => {
    switch (type) {
      case "BIKE": return "🏍️";
      case "SUV": return "🚙";
      case "SEDAN": return "🚘";
      case "VAN": return "🚐";
      case "LUXURY": return "✨";
      case "AUTO": return "🛺";
      default: return "🚗";
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {!isManual ? (
        /* Single-Column Catalog Mode */
        <div className="space-y-3">
          {/* Brand Selector */}
          <div>
            <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block mb-1">
              Brand (Make)
            </label>
            <select
              value={selectedBrand}
              onChange={handleBrandSelect}
              className="w-full bg-[#141518] border border-white/10 rounded-xl px-3.5 py-3 text-xs font-bold text-white outline-none focus:border-[#01FFFF] transition-all cursor-pointer [color-scheme:dark]"
            >
              <option value="" disabled className="text-zinc-500">
                Select Brand (e.g., Maruti Suzuki, Hyundai)
              </option>
              {CATALOG_BRANDS.map((b) => (
                <option key={b} value={b} className="bg-[#141518] text-white">
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* Model Selector */}
          <div>
            <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block mb-1">
              Model
            </label>
            <select
              value={selectedModel}
              onChange={handleModelSelect}
              disabled={!selectedBrand}
              className="w-full bg-[#141518] border border-white/10 rounded-xl px-3.5 py-3 text-xs font-bold text-white outline-none focus:border-[#01FFFF] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed [color-scheme:dark]"
            >
              <option value="" disabled className="text-zinc-500">
                {selectedBrand ? "Select Model..." : "Select Brand First"}
              </option>
              {availableModels.map((m) => (
                <option key={m.model} value={m.model} className="bg-[#141518] text-white">
                  {m.model}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : (
        /* Single-Column Manual Fallback Mode */
        <div className="space-y-3">
          <div>
            <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block mb-1">
              Make / Brand Name
            </label>
            <input
              type="text"
              value={manualMake}
              onChange={(e) => setManualMake(e.target.value)}
              placeholder="e.g., Maruti Suzuki"
              className="w-full bg-[#141518] border border-[#01FFFF]/40 rounded-xl px-3.5 py-3 text-xs font-bold text-white outline-none focus:border-[#01FFFF] transition-all placeholder:text-zinc-600"
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
              placeholder="e.g., Swift"
              className="w-full bg-[#141518] border border-[#01FFFF]/40 rounded-xl px-3.5 py-3 text-xs font-bold text-white outline-none focus:border-[#01FFFF] transition-all placeholder:text-zinc-600"
            />
          </div>
        </div>
      )}

      {/* Sleek Compact Body-Type Badge */}
      {(selectedModel || isManual) && (
        <div className="pt-1">
          <div className="flex items-center justify-between bg-black/60 border border-white/10 rounded-xl px-3.5 py-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-white">
              <span>{getVehicleIcon(resolvedType)}</span>
              <span className="text-[#01FFFF] uppercase tracking-wider">{resolvedType}</span>
              {!isManual && (
                <span className="text-[10px] text-zinc-500 font-normal font-mono">(Auto-detected)</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowTypeOverride(!showTypeOverride)}
              className="text-[11px] font-bold text-[#01FFFF] hover:underline flex items-center gap-1 transition-all"
            >
              <span>Change</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showTypeOverride ? "rotate-180" : ""}`} />
            </button>
          </div>

          {/* Expandable Body-Type Override Dropdown */}
          {showTypeOverride && (
            <div className="mt-2 bg-[#141518] border border-white/10 rounded-xl p-2 space-y-1 shadow-xl">
              <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block px-2 py-1">
                Select Body-Type Override
              </label>
              <div className="grid grid-cols-2 gap-1">
                {BODY_TYPE_OPTIONS.map((opt) => (
                  <button
                    type="button"
                    key={opt.label}
                    onClick={() => handleTypeSelect(opt.value)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-left flex items-center justify-between transition-all ${
                      resolvedType === opt.value
                        ? "bg-[#01FFFF] text-black"
                        : "text-zinc-300 hover:bg-white/5"
                    }`}
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <span>{opt.icon}</span>
                      <span>{opt.label}</span>
                    </span>
                    {resolvedType === opt.value && <Check className="w-3 h-3" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Direct Manual Entry Fallback Link */}
      <div className="text-center pt-1">
        <button
          type="button"
          onClick={() => {
            const nextMode = !isManual;
            setIsManual(nextMode);
            if (nextMode) {
              setManualMake(selectedBrand);
              setManualModel(selectedModel);
            }
          }}
          className="text-[11px] font-semibold text-zinc-400 hover:text-[#01FFFF] transition-colors underline"
        >
          {isManual ? "Search Master Catalog" : "Model not found? Enter manually"}
        </button>
      </div>
    </div>
  );
}
