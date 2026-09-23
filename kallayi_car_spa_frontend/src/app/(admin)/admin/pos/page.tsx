"use client";

import React, { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, ArrowLeft, Search, User, Phone, Sparkles, AlertCircle, X, Check, Tag } from "lucide-react";
import { isValidIndianMobile } from "@/lib/phone";
import { CinematicPhoneInput } from "@/components/ui/phone-input";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ServicePackage, UnifiedSearchResult } from '@/types/admin';
import api from '@/lib/api';

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
  phone: z.string().min(1, { message: "Phone number is required" }).refine((val) => isValidIndianMobile(val), {
    message: "Valid 10-digit mobile number required",
  }),
  customer_name: z.string().optional(),
  package_id: z.number().refine((val) => val !== undefined, {
    message: "Please select a service package",
  }),
  make: z.string().optional(),
  model: z.string().optional(),
  vehicle_type: z.string().optional(),
  color: z.string().optional(),
  technician_id: z.number().optional(), 
});

type POSFormValues = z.infer<typeof posSchema>;

export default function AdminExpressPOSPage() {
  const router = useRouter();
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [isLoadingPackages, setIsLoadingPackages] = useState(true);

  const [category, setCategory] = useState<CategoryKey>("Car");
  const [customMake, setCustomMake] = useState<string>("");
  const [customModel, setCustomModel] = useState<string>("");
  const [customType, setCustomType] = useState<string>("");
  const [customColor, setCustomColor] = useState<string>("");
  const [agreedPriceInput, setAgreedPriceInput] = useState<string>("");
  const [discountReason, setDiscountReason] = useState<string>("");
  const [showAdvanceDiscount, setShowAdvanceDiscount] = useState<boolean>(false);

  const [customerGarage, setCustomerGarage] = useState<any[]>([]);
  const [matchedVehicles, setMatchedVehicles] = useState<any[]>([]);

  // Track pre-existing selected vehicle and customer IDs for seamless binding
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // UNIFIED LIVE SEARCH STATE
  const [universalSearchQuery, setUniversalSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UnifiedSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

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
  const phone = watch("phone");
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

  const activeVehicleType = (selectedType === "Other" ? (customType || category) : (selectedType || category || "HATCHBACK")).toUpperCase();

  const selectedPackage = packages.find((p) => p.id === selectedPackageId);
  const baseCatalogPrice = selectedPackage ? parseFloat(String((selectedPackage as any).price || (selectedPackage as any).final_price || (selectedPackage as any).base_price || 0)) : 0;
  const finalAgreedPrice = agreedPriceInput !== "" ? parseFloat(agreedPriceInput) : baseCatalogPrice;
  const calculatedDiscountAmt = Math.max(0, baseCatalogPrice - (isNaN(finalAgreedPrice) ? baseCatalogPrice : finalAgreedPrice));
  const calculatedDiscountPct = baseCatalogPrice > 0 ? ((calculatedDiscountAmt / baseCatalogPrice) * 100).toFixed(1) : "0.0";

  useEffect(() => {
    if (selectedPackage) {
      setAgreedPriceInput(baseCatalogPrice > 0 ? baseCatalogPrice.toString() : "");
    }
  }, [selectedPackageId, baseCatalogPrice]);

  const applyVehicleToForm = (data: any) => {
    if (!data) return;

    if (data.id) {
      setSelectedVehicleId(Number(data.id));
    }
    if (data.customer_id || data.customerId) {
      setSelectedCustomerId(String(data.customer_id || data.customerId));
    }

    const phoneVal = data.owner_phone || data.phone;
    if (phoneVal) {
      const rawPhone = String(phoneVal).trim();
      const isGuestOrInvalid = rawPhone.startsWith("guest_") || rawPhone.includes("guest") || (!rawPhone.startsWith("+") && !/^[0-9]{7,15}$/.test(rawPhone.replace(/[\s-]/g, '')));
      if (isGuestOrInvalid) {
        setValue("phone", "", { shouldValidate: true });
      } else {
        setValue("phone", rawPhone, { shouldValidate: true });
      }
    }
    if (data.plate_number) {
      setValue("plate_number", data.plate_number, { shouldValidate: true });
    }

    const fetchedType = (data.vehicle_type || "").toUpperCase();
    let targetCategory: CategoryKey = "Car";
    if (["BIKE", "SCOOTER", "COMMUTER", "CRUISER", "SPORTS BIKE", "SUPERBIKE", "ADVENTURE"].some(t => fetchedType.includes(t))) {
      targetCategory = "Bike";
    } else if (["AUTO", "RICKSHAW", "THREE", "PASSENGER AUTO", "GOODS CARRIER", "E-RICKSHAW"].some(t => fetchedType.includes(t))) {
      targetCategory = "Auto Rickshaw";
    } else if (["VAN", "HEAVY", "TRAVELLER", "PICKUP", "MINIVAN", "TRUCK", "BUS", "TEMPO", "ACE"].some(t => fetchedType.includes(t))) {
      targetCategory = "Van / Heavy";
    }
    setCategory(targetCategory);

    const makesObj = VEHICLE_DATA[targetCategory].makes;
    if (data.make && makesObj[data.make]) {
      setValue("make", data.make);
      const modelsObj = makesObj[data.make] || {};
      if (data.model && modelsObj[data.model]) {
        setValue("model", data.model);
        const autoType = modelsObj[data.model];
        if (autoType && autoType !== "Other") {
          setValue("vehicle_type", autoType);
        }
      } else if (data.model) {
        setValue("model", "Other");
        setCustomModel(data.model);
      }
    } else if (data.make) {
      setValue("make", "Other");
      setCustomMake(data.make);
      if (data.model) {
        setCustomModel(data.model);
      }
    }

    if (data.vehicle_type) {
      if (VEHICLE_DATA[targetCategory].types.includes(data.vehicle_type)) {
        setValue("vehicle_type", data.vehicle_type);
      } else {
        setValue("vehicle_type", "Other");
        setCustomType(data.vehicle_type);
      }
    }

    if (data.color) {
      if (VEHICLE_COLORS.includes(data.color as any)) {
        setValue("color", data.color);
      } else {
        setValue("color", "Other");
        setCustomColor(data.color);
      }
    }

    if (data.customer_name && data.customer_name !== "Guest Customer") {
      setValue("customer_name", data.customer_name);
    }

    toast.success(`Vehicle Autofilled: ${data.plate_number || ''} (${data.make || ''} ${data.model || ''})`);
  };

  // STEP 0: UNIFIED MULTI-FIELD LIVE SEARCH (Name, Plate, Phone with 300ms debounce)
  useEffect(() => {
    const q = universalSearchQuery.trim();
    if (q.length < 2) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem("auth_token") : null;
        const res = await fetch(`/api/customer-vehicles/lookup?q=${encodeURIComponent(q)}`, {
          headers: token ? { Authorization: `Token ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data.results) ? data.results : [];
          setSearchResults(list);
          setShowSearchDropdown(list.length > 0);
        } else {
          setSearchResults([]);
          setShowSearchDropdown(false);
        }
      } catch (err) {
        console.error("Unified search error:", err);
        setSearchResults([]);
        setShowSearchDropdown(false);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [universalSearchQuery]);

  const handleSelectSearchResult = (item: UnifiedSearchResult) => {
    if (item.plate_number) {
      setValue("plate_number", item.plate_number, { shouldValidate: true });
    }
    if (item.vehicle_id) {
      setSelectedVehicleId(Number(item.vehicle_id));
    }
    if (item.customer_id) {
      setSelectedCustomerId(String(item.customer_id));
    }
    if (item.phone_number) {
      const rawPhone = String(item.phone_number).trim();
      const isGuest = rawPhone.startsWith("guest_") || rawPhone.includes("guest");
      if (!isGuest && rawPhone) {
        setValue("phone", rawPhone, { shouldValidate: true });
      }
    }
    if (item.customer_name && item.customer_name !== "Guest Customer" && item.customer_name !== "Walk-In Customer") {
      setValue("customer_name", item.customer_name);
    }
    applyVehicleToForm(item);

    if (item.outstanding_balance && Number(item.outstanding_balance) > 0) {
      toast(
        () => (
          <div className="flex items-center gap-2">
            <span className="text-amber-400 font-bold">⚠️ Khata Credit Due:</span>
            <span>{item.customer_name} has ₹{Number(item.outstanding_balance).toLocaleString()} outstanding.</span>
          </div>
        ),
        { duration: 5000, icon: '💳' }
      );
    }

    setShowSearchDropdown(false);
    setUniversalSearchQuery("");
  };

  // STEP 1: License Plate Entry & Phone Lookup (Debounced 1500ms, min 4 chars)
  useEffect(() => {
    const cleanPlate = (plateNumber || "").replace(/[\s-]/g, "").trim();
    if (cleanPlate.length < 4) return;

    const timer = setTimeout(async () => {
      try {
        const token = localStorage.getItem("auth_token");
        const res = await fetch(`/api/customer-vehicles/lookup?plate=${encodeURIComponent(plateNumber.trim())}`, {
          headers: token ? { Authorization: `Token ${token}` } : {},
        });

        if (res.ok) {
          const data = await res.json();
          // Auto-fill associated owner phone number
          const phoneVal = data.owner_phone || data.phone;
          if (phoneVal) {
            const rawPhone = String(phoneVal).trim();
            const isGuestOrInvalid = rawPhone.startsWith("guest_") || rawPhone.includes("guest") || (!rawPhone.startsWith("+") && !/^[0-9]{7,15}$/.test(rawPhone.replace(/[\s-]/g, '')));
            if (!isGuestOrInvalid) {
              setValue("phone", rawPhone, { shouldValidate: true });
            }
          }
          applyVehicleToForm(data);
        }
      } catch (err) {
        console.error("Step 1 Plate search error:", err);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [plateNumber]);

  // STEP 2: Phone Number Entry & Garage Lookup (Debounced 1500ms, min 10 digits)
  useEffect(() => {
    const cleanDigits = (phone || "").replace(/\D/g, "");
    const pureNumber = cleanDigits.startsWith("91") && cleanDigits.length > 10 ? cleanDigits.slice(2) : cleanDigits;

    // Reset customer garage state immediately on phone number change
    setCustomerGarage([]);

    if (pureNumber.length < 10) {
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const token = localStorage.getItem("auth_token");
        const res = await fetch(`/api/customer-vehicles/garage?phone=${encodeURIComponent(phone.trim())}`, {
          headers: token ? { Authorization: `Token ${token}` } : {},
        });

        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : (data.results || []);
          setCustomerGarage(list);
        } else {
          setCustomerGarage([]);
        }
      } catch (err) {
        console.error("Step 2 Phone garage search error:", err);
        setCustomerGarage([]);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [phone]);

  // STEP 3: Garage Matching & Final Auto-fill
  useEffect(() => {
    if (!customerGarage || customerGarage.length === 0) return;

    const currentCleanPlate = (plateNumber || "").replace(/[\s-]/g, "").toUpperCase().trim();
    if (!currentCleanPlate) return;

    const exactMatchedVehicle = customerGarage.find((v: any) => {
      if (!v.plate_number) return false;
      const vCleanPlate = v.plate_number.replace(/[\s-]/g, "").toUpperCase().trim();
      return vCleanPlate === currentCleanPlate;
    });

    if (exactMatchedVehicle) {
      applyVehicleToForm(exactMatchedVehicle);
    }
  }, [customerGarage, plateNumber]);

  // STEP 4: Reactive Dynamic Package Fetching Driven by Active Vehicle Type
  useEffect(() => {
    const fetchPackages = async () => {
      setIsLoadingPackages(true);
      try {
        const res = await fetch(`/api/services?vehicle_type=${encodeURIComponent(activeVehicleType)}`);
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : (data.results || []));
          setPackages(list);
        } else {
          setPackages([]);
        }
      } catch (err) {
        console.error("Failed to load services for POS:", err);
        setPackages([]);
      } finally {
        setIsLoadingPackages(false);
      }
    };
    fetchPackages();
  }, [activeVehicleType]);

  const onSubmit = async (data: POSFormValues) => {
    try {
      const realMake = data.make === "Other" ? (customMake || "Custom Make") : (data.make || "Standard");
      const realModel = (data.make === "Other" || data.model === "Other") ? (customModel || "Custom Model") : (data.model || "Vehicle");
      const realType = data.vehicle_type === "Other" ? (customType || category) : (data.vehicle_type || category);
      const realColor = data.color === "Other" ? (customColor || "Other") : (data.color || "White");

      const cleanPhone = (data.phone || "").trim();
      const cleanPlate = (data.plate_number || "").toUpperCase().trim();
      const finalPriceNumber = showAdvanceDiscount && !isNaN(finalAgreedPrice) && finalAgreedPrice > 0 ? finalAgreedPrice : baseCatalogPrice;
      const discountAmt = showAdvanceDiscount ? calculatedDiscountAmt : 0;
      const discountPct = showAdvanceDiscount ? parseFloat(calculatedDiscountPct) : 0;
      const discountRsn = showAdvanceDiscount && discountReason.trim() ? discountReason.trim() : undefined;

      const payload = {
        name: data.customer_name?.trim() || 'Guest Customer',
        customer_name: data.customer_name?.trim() || 'Guest Customer',
        customer_id: selectedCustomerId || undefined,
        vehicle_id: selectedVehicleId || undefined,
        phone: cleanPhone,
        plate_number: cleanPlate,
        service_package_id: data.package_id,
        make: realMake,
        model: realModel,
        vehicle_type: realType,
        color: realColor,
        status: 'WAITING',
        base_price: baseCatalogPrice,
        final_price: finalPriceNumber,
        discount_amount: discountAmt,
        discount_percentage: discountPct,
        discount_reason: discountRsn,
      };

      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        throw new Error(resData.error || 'Failed to process walk-in intake');
      }

      toast.success(`Vehicle ${cleanPlate} Added to Live Queue!`);
      try {
        window.dispatchEvent(new CustomEvent('queue:updated'));
      } catch {
        // Continue
      }
      reset();
      setSelectedVehicleId(null);
      setSelectedCustomerId(null);
      setCustomMake("");
      setCustomModel("");
      setCustomType("");
      setCustomColor("");
      setAgreedPriceInput("");
      setDiscountReason("");
    } catch (error: any) {
      toast.error(error.message || "Error processing walk-in intake.");
      console.error(error);
    }
  };


  return (
    <div className="bg-[#050505] min-h-[100dvh] font-jakarta text-white relative">
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#141518] to-[#050505]" />
      <div className="absolute inset-0 z-0 opacity-10 bg-[url('https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?q=80&w=2669&auto=format&fit=crop')] bg-cover bg-center mix-blend-luminosity" />

      <main className="relative z-10 max-w-4xl mx-auto pt-10 pb-20 px-6 sm:px-12 min-h-[100dvh] flex flex-col">
        {/* Header */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="font-syncopate text-3xl font-bold tracking-widest text-white uppercase">
              Command <span className="text-[#01FFFF]">Center</span>
            </h1>
            <p className="text-sm tracking-[0.3em] font-bold text-zinc-500 uppercase mt-2">
              Express Vehicle Intake
            </p>
          </div>
          <button
            onClick={() => router.push('/admin/dashboard')}
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" /> Exit to Dashboard
          </button>
        </header>

        {/* POS Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 flex-1 flex flex-col justify-between">
          <div className="space-y-8">
            {/* UNIFIED MULTI-FIELD SEARCH BAR */}
            <div className="relative z-30">
              <div className="bg-[#141518]/90 backdrop-blur-2xl border border-white/10 rounded-2xl p-3 sm:p-4 shadow-2xl focus-within:border-[#01FFFF] focus-within:shadow-[0_0_25px_rgba(1,255,255,0.15)] transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-black/60 border border-white/10 flex items-center justify-center text-[#01FFFF] flex-shrink-0">
                    {isSearching ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Search className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#8E939B] block mb-0.5">
                      Universal Live Search (Name, Plate, or Phone)
                    </label>
                    <input
                      type="text"
                      value={universalSearchQuery}
                      onChange={(e) => setUniversalSearchQuery(e.target.value)}
                      onFocus={() => {
                        if (searchResults.length > 0) setShowSearchDropdown(true);
                      }}
                      placeholder="Search plate (e.g. KL 10), customer name, or phone..."
                      className="w-full bg-transparent text-sm sm:text-base font-medium text-white placeholder:text-zinc-600 outline-none"
                    />
                  </div>
                  {universalSearchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setUniversalSearchQuery("");
                        setSearchResults([]);
                        setShowSearchDropdown(false);
                      }}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* SEARCH RESULTS DROPDOWN POPOVER */}
              {showSearchDropdown && searchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-2 bg-[#0d0e12]/95 backdrop-blur-3xl border border-[#01FFFF]/30 rounded-2xl p-2 shadow-[0_10px_40px_rgba(0,0,0,0.8)] max-h-[380px] overflow-y-auto space-y-1.5 z-50">
                  <div className="px-3 py-1.5 flex items-center justify-between border-b border-white/5 text-[10px] uppercase font-bold tracking-widest text-[#8E939B]">
                    <span>Found {searchResults.length} Match{searchResults.length > 1 ? 'es' : ''}</span>
                    <span className="text-[#01FFFF]">Click to Auto-Fill</span>
                  </div>
                  {searchResults.map((item, idx) => (
                    <button
                      key={`${item.plate_number}_${item.customer_id || idx}`}
                      type="button"
                      onClick={() => handleSelectSearchResult(item)}
                      className="w-full text-left p-3 rounded-xl bg-white/[0.03] hover:bg-[#01FFFF]/10 border border-white/5 hover:border-[#01FFFF]/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2 group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="px-2.5 py-1 rounded-lg bg-black/60 border border-[#01FFFF]/30 font-mono font-bold text-xs text-[#01FFFF] tracking-wider group-hover:border-[#01FFFF]">
                          {item.plate_number || 'NO PLATE'}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white group-hover:text-[#01FFFF] transition-colors">
                            {item.make} {item.model}
                            {item.color ? ` • ${item.color}` : ''}
                            <span className="ml-2 text-[10px] font-mono text-zinc-400 uppercase">({item.vehicle_type || 'CAR'})</span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-[#8E939B] mt-0.5">
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3 text-[#01FFFF]" />
                              <strong className="text-zinc-300">{item.customer_name}</strong>
                            </span>
                            {item.phone_number && (
                              <span className="flex items-center gap-1 font-mono">
                                <Phone className="w-3 h-3 text-emerald-400" />
                                {item.phone_number}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        {(item.outstanding_balance || 0) > 0 && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-mono font-bold flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            ₹{(item.outstanding_balance || 0).toLocaleString()} Due
                          </span>
                        )}
                        {(item.loyalty_points || 0) > 0 && (
                          <span className="px-2 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/30 text-purple-400 text-[10px] font-mono font-bold flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            {item.loyalty_points} pts
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

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

              {/* Phone Number & Customer Name */}
              <div className="bg-[#141518]/60 backdrop-blur-2xl border border-white/5 rounded-[2rem] p-6 sm:p-8 shadow-2xl flex flex-col justify-center gap-4">
                <div>
                  <label className="text-xs uppercase tracking-[0.2em] font-bold text-[#01FFFF] mb-3 text-center block">
                    Customer Master Key (Phone)
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

                <div>
                  <label className="text-[10px] uppercase tracking-[0.15em] font-bold text-[#8E939B] mb-1.5 block">
                    Customer Name (Walk-In / Optional)
                  </label>
                  <input
                    {...register("customer_name")}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-semibold text-white placeholder:text-zinc-600 focus:border-[#01FFFF] focus:outline-none transition-all"
                    placeholder="e.g. Rahul Sharma"
                    autoComplete="off"
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

              {/* Selectable Garage Chips for Customer's Registered Vehicles */}
              {customerGarage.length > 0 && (
                <div className="mb-5 bg-black/60 border border-[#01FFFF]/30 p-4 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-[#01FFFF] font-bold">
                      Customer's Garage ({customerGarage.length} Registered Vehicle{customerGarage.length > 1 ? 's' : ''}):
                    </span>
                    <span className="text-zinc-400">Click a vehicle chip to autofill for today's wash</span>
                  </div>
                  <div className="flex flex-wrap gap-2.5 pt-1">
                    {customerGarage.map((v: any, idx: number) => (
                      <button
                        key={v.id || v.plate_number || idx}
                        type="button"
                        onClick={() => applyVehicleToForm(v)}
                        className="px-3.5 py-2 bg-[#141518] hover:bg-[#01FFFF]/20 border border-white/10 hover:border-[#01FFFF] rounded-xl text-xs font-mono flex items-center gap-2.5 transition active:scale-95 text-white"
                      >
                        <span className="font-bold text-[#01FFFF]">{v.plate_number || 'No Plate'}</span>
                        <span className="text-zinc-300">({v.make || ''} {v.model || ''} - {v.color || 'White'})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

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
              ) : packages.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 bg-[#141518]/40 border border-white/5 rounded-3xl text-center">
                  <p className="text-zinc-400 text-xs font-semibold">No service packages found in database for {activeVehicleType}.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {packages.map((pkg) => {
                    const isSelected = selectedPackageId === pkg.id;
                    const displayPrice = parseFloat(String((pkg as any).price || (pkg as any).final_price || (pkg as any).base_price || 0));
                    return (
                      <button
                        type="button"
                        key={pkg.id}
                        onClick={() => setValue("package_id", pkg.id, { shouldValidate: true })}
                        className={`p-4 sm:p-6 rounded-3xl text-left transition-all duration-300 min-h-[52px] touch-manipulation cursor-pointer ${
                          isSelected
                            ? "bg-[#01FFFF]/10 border-2 border-[#01FFFF] shadow-[0_0_30px_rgba(1,255,255,0.15)] scale-[1.02] sm:scale-105"
                            : "bg-[#141518]/60 border border-white/5 hover:border-white/20 hover:bg-[#141518]"
                        }`}
                      >
                        <h3 className={`font-syncopate font-bold text-sm tracking-wide mb-2 ${isSelected ? "text-white" : "text-zinc-300"}`}>
                          {pkg.name}
                        </h3>
                        <p className={`font-mono font-bold text-lg ${isSelected ? "text-[#01FFFF]" : "text-zinc-500"}`}>
                          ₹{displayPrice.toLocaleString()}
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

            {/* Single-Field Negotiated Price & Discount Derivation (Optional Accordion) */}
            {selectedPackage && (
              <div className="bg-[#141518]/60 backdrop-blur-2xl border border-white/10 hover:border-white/20 rounded-2xl sm:rounded-[2rem] p-5 sm:p-6 shadow-xl space-y-5 transition-all">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={showAdvanceDiscount}
                      onChange={(e) => setShowAdvanceDiscount(e.target.checked)}
                      className="w-4 h-4 rounded accent-[#01FFFF] cursor-pointer"
                    />
                    <span className="text-xs uppercase tracking-[0.15em] font-bold text-zinc-300 flex items-center gap-2">
                      <Tag className="w-4 h-4 text-[#01FFFF]" />
                      Advance Discount / Negotiated Deal (Optional)
                    </span>
                  </label>
                  <span className="text-[11px] font-mono text-zinc-400">
                    {showAdvanceDiscount ? (
                      <span className="text-[#01FFFF] font-bold">Negotiation Active</span>
                    ) : (
                      <span>Catalog Base: <strong className="text-white">₹{baseCatalogPrice}</strong></span>
                    )}
                  </span>
                </div>

                {showAdvanceDiscount && (
                  <div className="pt-4 border-t border-white/10 grid grid-cols-1 md:grid-cols-2 gap-6 items-start animate-in fade-in duration-200">
                    <div className="space-y-4">
                      <div>
                        <label className="text-[11px] text-zinc-300 font-bold uppercase tracking-wider block mb-2">
                          Agreed Final Payable (₹)
                        </label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 font-syncopate font-bold text-xl text-[#01FFFF]">₹</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max={baseCatalogPrice}
                            value={agreedPriceInput}
                            onChange={(e) => setAgreedPriceInput(e.target.value)}
                            placeholder={baseCatalogPrice.toString()}
                            className="w-full bg-black/60 border-2 border-[#01FFFF]/40 focus:border-[#01FFFF] rounded-2xl pl-10 pr-4 py-3.5 text-2xl font-syncopate font-bold text-white outline-none transition-all"
                          />
                        </div>
                        <p className="text-[10px] text-zinc-400 mt-2 flex items-center justify-between">
                          <span>Catalog Base: <strong className="text-white">₹{baseCatalogPrice}</strong></span>
                          {calculatedDiscountAmt > 0 && (
                            <span className="text-emerald-400 font-bold">Saving ₹{calculatedDiscountAmt.toFixed(2)}</span>
                          )}
                        </p>
                      </div>

                      {/* Discount Reason Field with Quick Pills */}
                      <div>
                        <label className="text-[10px] uppercase tracking-wider font-bold text-zinc-400 block mb-1.5 flex items-center justify-between">
                          <span>Discount Reason {calculatedDiscountAmt > 0 ? <strong className="text-amber-400">(Required)</strong> : '(Optional)'}</span>
                          {discountReason && <span className="text-[10px] text-[#01FFFF] font-mono">"{discountReason}"</span>}
                        </label>
                        <input
                          type="text"
                          value={discountReason}
                          onChange={(e) => setDiscountReason(e.target.value)}
                          placeholder="e.g. Regular customer discount, counter bargain..."
                          className="w-full bg-black/40 border border-white/10 focus:border-[#01FFFF] rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-zinc-600 outline-none transition-all"
                        />
                        {/* Quick Chips */}
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {["Regular Customer", "Fleet Bargain", "Counter Bargain", "Dirtiness Concession", "Festival / Special Offer"].map((chip) => (
                            <button
                              type="button"
                              key={chip}
                              onClick={() => setDiscountReason(chip)}
                              className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                                discountReason === chip
                                  ? "bg-[#01FFFF]/20 border-[#01FFFF] text-[#01FFFF]"
                                  : "bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10"
                              }`}
                            >
                              + {chip}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Real-time Derived Discount Preview Card */}
                    <div className="bg-black/50 border border-white/10 rounded-2xl p-5 space-y-3.5 h-full flex flex-col justify-between">
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-zinc-400 font-bold uppercase tracking-wider">Catalog Subtotal:</span>
                          <span className="font-mono font-bold text-white">₹{baseCatalogPrice.toFixed(2)}</span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <span className="text-zinc-400 font-bold uppercase tracking-wider">Discount Granted:</span>
                          <span className={`font-mono font-bold ${calculatedDiscountAmt > 0 ? "text-[#22c55e]" : "text-zinc-500"}`}>
                            {calculatedDiscountAmt > 0 ? `-₹${calculatedDiscountAmt.toFixed(2)} (${calculatedDiscountPct}% OFF)` : "No Discount"}
                          </span>
                        </div>

                        {discountReason && (
                          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-white/5">
                            <span className="text-zinc-400 font-bold uppercase tracking-wider">Reason:</span>
                            <span className="text-[#01FFFF] font-mono truncate max-w-[180px]">{discountReason}</span>
                          </div>
                        )}
                      </div>

                      <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">Final Agreed Total:</span>
                        <span className="font-syncopate font-bold text-xl text-[#01FFFF]">
                          ₹{(isNaN(finalAgreedPrice) ? baseCatalogPrice : finalAgreedPrice).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Massive Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#E52323] text-white font-syncopate font-bold text-lg sm:text-2xl py-5 sm:py-8 rounded-2xl sm:rounded-[2rem] hover:bg-red-700 hover:scale-[1.02] shadow-[0_0_30px_rgba(229,35,35,0.4)] hover:shadow-[0_0_50px_rgba(229,35,35,0.6)] transition-all active:scale-[0.98] flex justify-center items-center gap-4 disabled:opacity-70 disabled:hover:scale-100 uppercase tracking-[0.2em] mt-8 sm:mt-10 border border-[#E52323]/50 min-h-[56px] touch-manipulation"
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
