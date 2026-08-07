"use client";

import React, { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, LogOut } from "lucide-react";
import { isValidPhoneNumber } from "react-phone-number-input";
import { CinematicPhoneInput } from "@/components/ui/phone-input";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import api from "@/lib/api";

export type CategoryKey = "Car" | "Bike" | "Auto Rickshaw" | "Van / Heavy";

export const VEHICLE_DATA: Record<CategoryKey, {
  makes: Record<string, Record<string, string>>;
  types: string[];
}> = {
  Car: {
    makes: {
      "Maruti Suzuki": { "Swift": "Hatchback", "Baleno": "Hatchback", "Dzire": "Sedan", "Brezza": "Compact SUV", "Ertiga": "MUV/Van", "Alto": "Hatchback", "WagonR": "Hatchback", "Fronx": "Compact SUV", "Grand Vitara": "SUV", "Jimny": "Off-road/Jeep", "Celerio": "Hatchback", "Other": "Other" },
      "Hyundai": { "i20": "Hatchback", "Creta": "Compact SUV", "Venue": "Compact SUV", "Grand i10": "Hatchback", "Verna": "Sedan", "Exter": "Compact SUV", "Aura": "Sedan", "Tucson": "SUV", "Other": "Other" },
      "Tata": { "Nexon": "Compact SUV", "Punch": "Compact SUV", "Harrier": "SUV", "Safari": "SUV", "Tiago": "Hatchback", "Altroz": "Hatchback", "Other": "Other" },
      "Mahindra": { "Thar": "Off-road/Jeep", "Thar Roxx": "Off-road/Jeep", "XUV700": "SUV", "Scorpio-N": "SUV", "Scorpio Classic": "SUV", "Bolero": "SUV", "XUV300": "Compact SUV", "Armada": "Off-road/Jeep", "Other": "Other" },
      "Toyota": { "Innova Crysta": "MUV/Van", "Innova Hycross": "MUV/Van", "Fortuner": "SUV", "Glanza": "Hatchback", "Hilux": "Off-road/Jeep", "Other": "Other" },
      "Honda": { "City": "Sedan", "Amaze": "Sedan", "Elevate": "Compact SUV", "Other": "Other" },
      "Volkswagen": { "Polo": "Hatchback", "Virtus": "Sedan", "Taigun": "Compact SUV", "Other": "Other" },
      "Kia": { "Seltos": "Compact SUV", "Sonet": "Compact SUV", "Carens": "MUV/Van", "Other": "Other" },
      "Jeep": { "Compass": "SUV", "Wrangler": "Off-road/Jeep", "Meridian": "SUV", "Other": "Other" },
      "Other": {}
    },
    types: ["Hatchback", "Sedan", "Compact SUV", "SUV", "MUV/Van", "Off-road/Jeep", "Luxury", "Other"]
  },
  Bike: {
    makes: {
      "Royal Enfield": { "Classic 350": "Cruiser", "Bullet 350": "Cruiser", "Meteor 350": "Cruiser", "Himalayan": "Adventure", "Hunter 350": "Cruiser", "Interceptor 650": "Cruiser", "Other": "Other" },
      "Honda": { "Activa": "Scooter", "Dio": "Scooter", "Shine": "Commuter", "Highness CB350": "Cruiser", "Unicorn": "Commuter", "Other": "Other" },
      "Yamaha": { "MT-15": "Sports Bike", "R15": "Sports Bike", "Ray ZR": "Scooter", "Fascino": "Scooter", "FZ": "Commuter", "Other": "Other" },
      "TVS": { "Jupiter": "Scooter", "Ntorq": "Scooter", "Apache RTR": "Sports Bike", "Ronin": "Cruiser", "Other": "Other" },
      "Hero": { "Splendor": "Commuter", "Passion": "Commuter", "Xpulse": "Adventure", "Other": "Other" },
      "Bajaj": { "Pulsar": "Sports Bike", "Dominar": "Sports Bike", "Avenger": "Cruiser", "Other": "Other" },
      "KTM": { "Duke 200": "Sports Bike", "Duke 390": "Sports Bike", "RC 200": "Sports Bike", "RC 390": "Sports Bike", "Other": "Other" },
      "Other": {}
    },
    types: ["Scooter", "Commuter", "Sports Bike", "Cruiser", "Adventure", "Superbike", "Other"]
  },
  "Auto Rickshaw": {
    makes: {
      "Bajaj": { "RE": "Passenger Auto", "Maxima": "Passenger Auto", "Compact": "Passenger Auto", "Other": "Other" },
      "TVS": { "King": "Passenger Auto", "Other": "Other" },
      "Piaggio": { "Ape": "Goods Carrier", "Other": "Other" },
      "Mahindra": { "Alfa": "Passenger Auto", "Treo": "E-Rickshaw", "e-Alfa": "E-Rickshaw", "Other": "Other" },
      "Other": {}
    },
    types: ["Passenger Auto", "Goods Carrier", "E-Rickshaw", "Other"]
  },
  "Van / Heavy": {
    makes: {
      "Force": { "Traveller": "Passenger Traveller", "Cruiser": "Passenger Traveller", "Urbania": "Passenger Traveller", "Gurkha": "Off-road/Jeep", "Other": "Other" },
      "Mahindra": { "Supro": "Minivan", "Bolero Camper": "Pickup Truck", "Jeeto": "Mini Truck", "Bolero Pik-up": "Pickup Truck", "Other": "Other" },
      "Tata": { "Magic": "Minivan", "Winger": "Passenger Traveller", "Ace (Chotta Hathi)": "Mini Truck", "Intra": "Mini Truck", "Yodha": "Pickup Truck", "Other": "Other" },
      "Maruti Suzuki": { "Eeco": "Minivan", "Omni": "Minivan", "Super Carry": "Mini Truck", "Other": "Other" },
      "Ashok Leyland": { "Dost": "Mini Truck", "Bada Dost": "Pickup Truck", "Other": "Other" },
      "Other": {}
    },
    types: ["Minivan", "Passenger Traveller", "Pickup Truck", "Mini Truck", "Bus/Tempo", "Other"]
  }
};

export const VEHICLE_COLORS = ["White", "Black", "Silver", "Grey", "Red", "Blue", "Brown", "Other"] as const;

const posSchema = z.object({
  plate_number: z.string().min(1, "License plate is required"),
  phone: z.string().min(1, { message: "Phone number is required" }).refine((val) => val && isValidPhoneNumber(val), {
    message: "Invalid phone number",
  }),
  package_id: z.number().refine((val) => val !== undefined, {
    message: "Please select a service package",
  }),
  make: z.string().optional(),
  model: z.string().optional(),
  vehicle_type: z.string().optional(),
  color: z.string().optional(),
});

type POSFormValues = z.infer<typeof posSchema>;

export default function ExpressPOSPage() {
  const router = useRouter();
  const [packages, setPackages] = useState<any[]>([]);
  const [isLoadingPackages, setIsLoadingPackages] = useState(true);

  const [category, setCategory] = useState<CategoryKey>("Car");
  const [customMake, setCustomMake] = useState<string>("");
  const [customModel, setCustomModel] = useState<string>("");
  const [customType, setCustomType] = useState<string>("");
  const [customColor, setCustomColor] = useState<string>("");

  const {
    control,
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<POSFormValues>({
    resolver: zodResolver(posSchema),
    defaultValues: {
      plate_number: "",
      phone: "",
      package_id: undefined,
      make: "",
      model: "",
      vehicle_type: "Hatchback",
      color: "White",
    },
  });

  const selectedPackageId = watch("package_id");
  const plateNumber = watch("plate_number");
  const selectedMake = watch("make");
  const selectedModel = watch("model");
  const selectedType = watch("vehicle_type");
  const selectedColor = watch("color");

  const handleCategoryChange = (newCat: CategoryKey) => {
    setCategory(newCat);
    setValue("make", "", { shouldValidate: true });
    setValue("model", "", { shouldValidate: true });
    setValue("vehicle_type", VEHICLE_DATA[newCat].types[0], { shouldValidate: true });
    setCustomMake("");
    setCustomModel("");
    setCustomType("");
  };

  const handleMakeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setValue("make", val, { shouldValidate: true });
    setValue("model", "", { shouldValidate: true });
    if (val !== "Other") {
      setCustomMake("");
    }
  };

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setValue("model", val, { shouldValidate: true });
    if (val !== "Other") {
      setCustomModel("");
    }

    // Auto-detect and set corresponding vehicle type
    if (selectedMake && VEHICLE_DATA[category]?.makes[selectedMake]) {
      const autoType = VEHICLE_DATA[category].makes[selectedMake][val];
      if (autoType && autoType !== "Other") {
        setValue("vehicle_type", autoType, { shouldValidate: true });
      }
    }
  };

  // --- AUTO-FILL WATCHER ---
  useEffect(() => {
    if (!plateNumber || plateNumber.length < 4) return;

    const timer = setTimeout(async () => {
      try {
        const res = await api.get(`/customer-vehicles/lookup/?plate=${encodeURIComponent(plateNumber)}`);
        if (res.data) {
          if (res.data.phone) setValue("phone", res.data.phone, { shouldValidate: true });

          const fetchedType = (res.data.vehicle_type || "").toUpperCase();
          let targetCategory: CategoryKey = "Car";
          if (["BIKE", "SCOOTER", "COMMUTER", "CRUISER", "SPORTS BIKE", "SUPERBIKE"].some(t => fetchedType.includes(t))) {
            targetCategory = "Bike";
          } else if (["AUTO", "RICKSHAW", "THREE", "PASSENGER AUTO", "GOODS CARRIER", "E-RICKSHAW"].some(t => fetchedType.includes(t))) {
            targetCategory = "Auto Rickshaw";
          } else if (["VAN", "HEAVY", "TRAVELLER", "PICKUP", "MINIVAN", "TRUCK", "BUS", "TEMPO", "ACE"].some(t => fetchedType.includes(t))) {
            targetCategory = "Van / Heavy";
          }
          setCategory(targetCategory);

          const makesObj = VEHICLE_DATA[targetCategory].makes;
          if (res.data.make && makesObj[res.data.make]) {
            setValue("make", res.data.make);
            const modelsObj = makesObj[res.data.make] || {};
            if (res.data.model && modelsObj[res.data.model]) {
              setValue("model", res.data.model);
              const autoType = modelsObj[res.data.model];
              if (autoType && autoType !== "Other") {
                setValue("vehicle_type", autoType);
              }
            } else if (res.data.model) {
              setValue("model", "Other");
              setCustomModel(res.data.model);
            }
          } else if (res.data.make) {
            setValue("make", "Other");
            setCustomMake(res.data.make);
            if (res.data.model) {
              setCustomModel(res.data.model);
            }
          }

          if (res.data.vehicle_type) {
            if (VEHICLE_DATA[targetCategory].types.includes(res.data.vehicle_type)) {
              setValue("vehicle_type", res.data.vehicle_type);
            } else {
              setValue("vehicle_type", "Other");
              setCustomType(res.data.vehicle_type);
            }
          }

          if (res.data.color) {
            if (VEHICLE_COLORS.includes(res.data.color as any)) {
              setValue("color", res.data.color);
            } else {
              setValue("color", "Other");
              setCustomColor(res.data.color);
            }
          }

          toast.success(`Found Vehicle: ${res.data.make || ''} ${res.data.model || ''}`);
        }
      } catch (err) {
        console.error(err);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [plateNumber, setValue]);

  useEffect(() => {
    const fetchPackages = async () => {
      try {
        const res = await api.get("/service-packages/");
        setPackages(res.data.results || res.data || []);
      } catch (err) {
        console.error(err);
        setPackages([]);
      } finally {
        setIsLoadingPackages(false);
      }
    };
    fetchPackages();
  }, []);

  const onSubmit = async (data: POSFormValues) => {
    try {
      const realMake = data.make === "Other" ? (customMake || "Custom Make") : (data.make || "Standard");
      const realModel = (data.make === "Other" || data.model === "Other") ? (customModel || "Custom Model") : (data.model || "Vehicle");
      const realType = data.vehicle_type === "Other" ? (customType || category) : (data.vehicle_type || category);
      const realColor = data.color === "Other" ? (customColor || "Other") : (data.color || "White");

      const payload = {
        ...data,
        category,
        make: realMake,
        model: realModel,
        vehicle_type: realType,
        color: realColor
      };

      await api.post("/bookings/express-walkin/", payload);
      toast.success("Vehicle Added to Queue!");
      reset();
      setCustomMake("");
      setCustomModel("");
      setCustomType("");
      setCustomColor("");
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Error processing walk-in.");
      console.error(error);
    }
  };


  return (
    <div className="bg-[#050505] min-h-screen font-jakarta text-white relative">
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#141518] to-[#050505]" />
      <div className="absolute inset-0 z-0 opacity-10 bg-[url('https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?q=80&w=2669&auto=format&fit=crop')] bg-cover bg-center mix-blend-luminosity" />

      <main className="relative z-10 max-w-4xl mx-auto pt-10 pb-20 px-6 sm:px-12 min-h-screen flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="font-syncopate text-2xl sm:text-3xl font-bold tracking-widest text-white uppercase">
              Staff <span className="text-[#01FFFF]">POS</span>
            </h1>
            <p className="text-xs sm:text-sm tracking-[0.3em] font-bold text-zinc-500 uppercase mt-2">
              Express Vehicle Intake
            </p>
          </div>
          <button
            onClick={() => router.push('/staff/queue')}
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-xs font-bold uppercase tracking-wider"
          >
            Queue Board
          </button>
        </header>

        {/* POS Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 flex-1 flex flex-col justify-between">
          <div className="space-y-8">
            {/* Input Groups Container */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Plate Number */}
              <div className="bg-[#141518]/60 backdrop-blur-2xl border border-white/5 rounded-[2rem] p-6 sm:p-8 shadow-2xl flex flex-col justify-center">
                <label className="text-xs uppercase tracking-[0.2em] font-bold text-[#01FFFF] mb-4 text-center block">
                  License Plate
                </label>
                <input
                  {...register("plate_number")}
                  className={`w-full bg-transparent border-b-2 text-center text-2xl sm:text-4xl md:text-6xl font-syncopate font-bold uppercase transition-all pb-3 sm:pb-4 outline-none placeholder:text-zinc-800 ${
                    errors.plate_number ? "border-[#E52323] text-[#E52323]" : "border-white/10 text-white focus:border-[#01FFFF]"
                  }`}
                  placeholder="KL-11-AA"
                  autoComplete="off"
                />
                {errors.plate_number && (
                  <p className="text-[#E52323] text-[10px] font-bold tracking-widest uppercase mt-4 text-center">
                    {errors.plate_number.message}
                  </p>
                )}
              </div>

              {/* Phone Number */}
              <div className="bg-[#141518]/60 backdrop-blur-2xl border border-white/5 rounded-[2rem] p-6 sm:p-8 shadow-2xl flex flex-col justify-center">
                <label className="text-xs uppercase tracking-[0.2em] font-bold text-[#01FFFF] mb-4 text-center block">
                  Customer Master Key
                </label>
                <div className="w-full">
                  <Controller
                    name="phone"
                    control={control}
                    render={({ field }) => (
                      <CinematicPhoneInput
                        value={field.value}
                        onChange={field.onChange}
                        error={errors.phone?.message}
                      />
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Vehicle Details Card */}
            <div className="bg-[#141518]/60 backdrop-blur-2xl border border-white/5 rounded-[2rem] p-6 sm:p-8 shadow-2xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                <label className="text-xs uppercase tracking-[0.2em] font-bold text-[#01FFFF] block">
                  Smart Vehicle Intake
                </label>
                
                {/* Vehicle Category Selector Toggle */}
                <div className="flex flex-wrap bg-black/60 p-1 rounded-xl border border-white/10 gap-1">
                  {(["Car", "Bike", "Auto Rickshaw", "Van / Heavy"] as CategoryKey[]).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => handleCategoryChange(cat)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                        category === cat ? "bg-[#01FFFF] text-black shadow-lg" : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      {cat === "Car" && "🚗 "}
                      {cat === "Bike" && "🏍️ "}
                      {cat === "Auto Rickshaw" && "🛺 "}
                      {cat === "Van / Heavy" && "🚐 "}
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {/* Make Dropdown / Custom Input */}
                <div>
                  <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block mb-1">
                    {category} Make
                  </label>
                  <select
                    value={selectedMake || ""}
                    onChange={handleMakeChange}
                    className="w-full bg-[#141518] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#01FFFF] transition-all cursor-pointer [color-scheme:dark]"
                  >
                    <option value="" disabled className="text-zinc-500">Select Brand...</option>
                    {Object.keys(VEHICLE_DATA[category].makes).map((makeKey) => (
                      <option key={makeKey} value={makeKey} className="bg-[#141518] text-white">
                        {makeKey}
                      </option>
                    ))}
                  </select>
                  {selectedMake === "Other" && (
                    <input
                      type="text"
                      value={customMake}
                      onChange={(e) => setCustomMake(e.target.value)}
                      placeholder="Enter Custom Make"
                      className="mt-2 w-full bg-black/40 border border-[#01FFFF]/40 rounded-xl px-3.5 py-2 text-xs text-[#01FFFF] outline-none focus:border-[#01FFFF] transition-all placeholder:text-zinc-600"
                    />
                  )}
                </div>

                {/* Model Dropdown / Custom Input */}
                <div>
                  <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block mb-1">
                    {category} Model
                  </label>
                  {selectedMake === "Other" ? (
                    <input
                      type="text"
                      value={customModel}
                      onChange={(e) => setCustomModel(e.target.value)}
                      placeholder="Enter Custom Model"
                      className="w-full bg-black/40 border border-[#01FFFF]/40 rounded-xl px-3.5 py-2.5 text-xs text-[#01FFFF] outline-none focus:border-[#01FFFF] transition-all placeholder:text-zinc-600"
                    />
                  ) : (
                    <>
                      <select
                        value={selectedModel || ""}
                        onChange={handleModelChange}
                        disabled={!selectedMake}
                        className="w-full bg-[#141518] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#01FFFF] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed [color-scheme:dark]"
                      >
                        <option value="" disabled className="text-zinc-500">
                          {selectedMake ? "Select Model..." : "Select Brand First"}
                        </option>
                        {selectedMake && Object.keys(VEHICLE_DATA[category].makes[selectedMake] || {}).map((m) => (
                          <option key={m} value={m} className="bg-[#141518] text-white">
                            {m}
                          </option>
                        ))}
                      </select>
                      {selectedModel === "Other" && (
                        <input
                          type="text"
                          value={customModel}
                          onChange={(e) => setCustomModel(e.target.value)}
                          placeholder="Enter Custom Model"
                          className="mt-2 w-full bg-black/40 border border-[#01FFFF]/40 rounded-xl px-3.5 py-2 text-xs text-[#01FFFF] outline-none focus:border-[#01FFFF] transition-all placeholder:text-zinc-600"
                        />
                      )}
                    </>
                  )}
                </div>

                {/* Type Dropdown */}
                <div>
                  <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block mb-1">
                    Body / Type
                  </label>
                  <select
                    {...register("vehicle_type")}
                    className="w-full bg-[#141518] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#01FFFF] transition-all cursor-pointer [color-scheme:dark]"
                  >
                    {VEHICLE_DATA[category].types.map((vType) => (
                      <option key={vType} value={vType} className="bg-[#141518] text-white">
                        {vType}
                      </option>
                    ))}
                  </select>
                  {selectedType === "Other" && (
                    <input
                      type="text"
                      value={customType}
                      onChange={(e) => setCustomType(e.target.value)}
                      placeholder="Enter Custom Type"
                      className="mt-2 w-full bg-black/40 border border-[#01FFFF]/40 rounded-xl px-3.5 py-2 text-xs text-[#01FFFF] outline-none focus:border-[#01FFFF] transition-all placeholder:text-zinc-600"
                    />
                  )}
                </div>

                {/* Color Dropdown */}
                <div>
                  <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block mb-1">
                    Color
                  </label>
                  <select
                    {...register("color")}
                    className="w-full bg-[#141518] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#01FFFF] transition-all cursor-pointer [color-scheme:dark]"
                  >
                    {VEHICLE_COLORS.map((c) => (
                      <option key={c} value={c} className="bg-[#141518] text-white">
                        {c}
                      </option>
                    ))}
                  </select>
                  {selectedColor === "Other" && (
                    <input
                      type="text"
                      value={customColor}
                      onChange={(e) => setCustomColor(e.target.value)}
                      placeholder="Enter Custom Color"
                      className="mt-2 w-full bg-black/40 border border-[#01FFFF]/40 rounded-xl px-3.5 py-2 text-xs text-[#01FFFF] outline-none focus:border-[#01FFFF] transition-all placeholder:text-zinc-600"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Service Selection */}
            <div>
              <label className="text-xs uppercase tracking-[0.2em] font-bold text-zinc-500 mb-6 block">
                Select Service Package
              </label>
              {isLoadingPackages ? (
                <div className="flex justify-center h-48 items-center bg-[#141518]/40 border border-white/5 rounded-3xl">
                  <Loader2 className="w-8 h-8 animate-spin text-[#01FFFF]" />
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {packages.map((pkg) => {
                    const isSelected = selectedPackageId === pkg.id;
                    return (
                      <button
                        type="button"
                        key={pkg.id}
                        onClick={() => setValue("package_id", pkg.id, { shouldValidate: true })}
                        className={`p-6 rounded-3xl text-left transition-all duration-300 ${
                          isSelected
                            ? "bg-[#01FFFF]/10 border-2 border-[#01FFFF] shadow-[0_0_30px_rgba(1,255,255,0.15)] scale-105"
                            : "bg-[#141518]/60 border border-white/5 hover:border-white/20 hover:bg-[#141518]"
                        }`}
                      >
                        <h3 className={`font-syncopate font-bold text-sm tracking-wide mb-2 ${isSelected ? "text-white" : "text-zinc-300"}`}>
                          {pkg.name}
                        </h3>
                        <p className={`font-mono font-bold text-lg ${isSelected ? "text-[#01FFFF]" : "text-zinc-500"}`}>
                          ₹{pkg.price}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
              {errors.package_id && (
                <p className="text-[#E52323] text-xs font-bold tracking-widest uppercase mt-4">
                  {errors.package_id.message}
                </p>
              )}
            </div>
          </div>

          {/* Massive Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#E52323] text-white font-syncopate font-bold text-2xl py-8 rounded-[2rem] hover:bg-red-700 hover:scale-[1.02] shadow-[0_0_30px_rgba(229,35,35,0.4)] hover:shadow-[0_0_50px_rgba(229,35,35,0.6)] transition-all active:scale-[0.98] flex justify-center items-center gap-4 disabled:opacity-70 disabled:hover:scale-100 uppercase tracking-[0.2em] mt-10 border border-[#E52323]/50"
          >
            {isSubmitting ? (
              <Loader2 className="w-8 h-8 animate-spin" />
            ) : (
              "Add to Queue"
            )}
          </button>
        </form>
      </main>
    </div>
  );
}
