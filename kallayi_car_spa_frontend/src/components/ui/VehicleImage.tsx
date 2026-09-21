"use client";

import React, { useState } from "react";
import { Car, Bike, Truck } from "lucide-react";
import { VehicleType } from "@/types/database";
import { getVehicleImageUrl } from "@/lib/vehicleImages";

interface VehicleImageProps {
  make?: string;
  model?: string;
  vehicleType?: VehicleType | string;
  className?: string;
  containerClassName?: string;
  iconClassName?: string;
  alt?: string;
}

export function VehicleImage({
  make,
  model,
  vehicleType = "CAR",
  className = "w-full h-full object-cover transition-transform duration-300 group-hover:scale-105",
  containerClassName = "w-14 h-14 rounded-2xl overflow-hidden bg-black/60 border border-white/10 flex items-center justify-center shrink-0",
  iconClassName,
  alt,
}: VehicleImageProps) {
  const [hasError, setHasError] = useState(false);
  const imageUrl = getVehicleImageUrl(make, model, vehicleType as VehicleType);

  const renderFallbackIcon = () => {
    const type = String(vehicleType || "").toUpperCase();
    const defaultIconCls = iconClassName || "w-6 h-6 text-spa-sky";

    if (type === "BIKE") {
      return <Bike className={defaultIconCls} />;
    }
    if (type === "VAN" || type === "TRUCK" || type === "MUV") {
      return <Truck className={defaultIconCls} />;
    }
    return <Car className={defaultIconCls} />;
  };

  if (hasError || !imageUrl) {
    return (
      <div className={containerClassName}>
        {renderFallbackIcon()}
      </div>
    );
  }

  const altText = alt || `${make || ""} ${model || "Vehicle"}`.trim() || "Vehicle";

  return (
    <div className={containerClassName}>
      <img
        src={imageUrl}
        alt={altText}
        className={className}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setHasError(true)}
      />
    </div>
  );
}
