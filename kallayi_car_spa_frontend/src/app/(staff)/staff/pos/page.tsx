"use client";

import React, { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  Loader2, LogOut, Search, User, Phone, Sparkles, AlertCircle, X, Check, 
  ArrowLeft, ArrowRight, CheckCircle2, CreditCard, ShieldCheck, Tag, Layers, RefreshCw, IndianRupee,
  LayoutDashboard
} from "lucide-react";
import { isValidIndianMobile } from "@/lib/phone";
import { CinematicPhoneInput } from "@/components/ui/phone-input";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import api, { createExpressWalkinBooking, ExpressWalkinPayload } from "@/lib/api";
import { UnifiedSearchResult } from "@/types/admin";

import { SmartVehicleSelector } from "@/components/ui/smart-vehicle-selector";
import { DjangoVehicleType } from "@/lib/vehicleCatalog";
import { resolvePackagePriceForVehicle } from "@/lib/logic/booking";

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
  // Track pre-existing selected vehicle and customer IDs for seamless binding
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // Operational Counter Attributes
  const [showAdvanceDiscount, setShowAdvanceDiscount] = useState<boolean>(false);
  const [agreedPriceInput, setAgreedPriceInput] = useState<string>("");
  const [discountReason, setDiscountReason] = useState<string>("");

  // Post-Intake Confirmation Modal State
  const [completedReceipt, setCompletedReceipt] = useState<any | null>(null);

  // Authenticated Staff User Session State
  const [staffUser, setStaffUser] = useState<any>(null);

  useEffect(() => {
    const loadStaffProfile = async () => {
      try {
        const cached = localStorage.getItem("user");
        if (cached) {
          try {
            setStaffUser(JSON.parse(cached));
          } catch {
            // ignore
          }
        }
        const res = await api.get("/auth/me").catch(() => null);
        if (res?.data?.user) {
          setStaffUser(res.data.user);
          localStorage.setItem("user", JSON.stringify(res.data.user));
        }
      } catch (err) {
        console.warn("[POS] Could not load staff profile:", err);
      }
    };
    loadStaffProfile();
  }, []);

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
  const selectedType = watch("vehicle_type");
  const selectedColor = watch("color");
  const selectedMake = watch("make");
  const selectedModel = watch("model");
  const activeVehicleType = (selectedType === "Other" ? customType : selectedType || "HATCHBACK").toUpperCase();

  const getPackageActivePrice = (pkg: any, targetVehicleType: string) => {
    if (!pkg) return 0;
    return resolvePackagePriceForVehicle(
      pkg.base_price || pkg.price,
      pkg.tiered_prices || pkg.service_package_prices,
      targetVehicleType
    );
  };

  // Selected Package Object & Catalog Pricing
  const selectedPackage = packages.find((p) => p.id === selectedPackageId);
  const baseCatalogPrice = getPackageActivePrice(selectedPackage, activeVehicleType);

  const finalAgreedPrice = agreedPriceInput ? parseFloat(agreedPriceInput) : baseCatalogPrice;
  const calculatedDiscountAmt = Math.max(0, baseCatalogPrice - (isNaN(finalAgreedPrice) ? baseCatalogPrice : finalAgreedPrice));
  const calculatedDiscountPct = baseCatalogPrice > 0 ? ((calculatedDiscountAmt / baseCatalogPrice) * 100).toFixed(1) : "0.0";

  const handleCategoryChange = (newCat: CategoryKey) => {
    setCategory(newCat);
    setValue("make", "", { shouldValidate: true });
    setValue("model", "", { shouldValidate: true });
    setValue("vehicle_type", VEHICLE_DATA[newCat].types[0], { shouldValidate: true });
    setCustomMake("");
    setCustomModel("");
    setCustomType("");
  };

  const applyVehicleToForm = (data: any) => {
    if (!data) return;

    const rawVehId = data.vehicle_id || data.id;
    if (rawVehId && !isNaN(Number(rawVehId))) {
      setSelectedVehicleId(Number(rawVehId));
    } else {
      setSelectedVehicleId(null);
    }

    const rawCustId = data.customer_id || data.customerId;
    if (rawCustId && rawCustId !== "undefined" && rawCustId !== "null" && String(rawCustId).trim().length > 5) {
      setSelectedCustomerId(String(rawCustId).trim());
    } else {
      setSelectedCustomerId(null);
    }

    const phoneVal = data.phone_number || data.phone || data.owner_phone;
    if (phoneVal) {
      const rawPhone = String(phoneVal).trim();
      const isGuestOrInvalid = rawPhone.startsWith("guest_") || rawPhone.includes("guest");
      if (!isGuestOrInvalid && rawPhone) {
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
    const realMake = data.brand || data.make;
    if (realMake && makesObj[realMake]) {
      setValue("make", realMake, { shouldValidate: true });
      const modelsObj = makesObj[realMake] || {};
      if (data.model && modelsObj[data.model]) {
        setValue("model", data.model, { shouldValidate: true });
        const autoType = modelsObj[data.model];
        if (autoType && autoType !== "Other") {
          setValue("vehicle_type", autoType, { shouldValidate: true });
        }
      } else if (data.model) {
        setValue("model", "Other", { shouldValidate: true });
        setCustomModel(data.model);
      }
    } else if (realMake) {
      setValue("make", "Other", { shouldValidate: true });
      setCustomMake(realMake);
      if (data.model) {
        setValue("model", "Other", { shouldValidate: true });
        setCustomModel(data.model);
      }
    }

    if (data.vehicle_type) {
      if (VEHICLE_DATA[targetCategory].types.includes(data.vehicle_type)) {
        setValue("vehicle_type", data.vehicle_type, { shouldValidate: true });
      } else {
        setValue("vehicle_type", "Other", { shouldValidate: true });
        setCustomType(data.vehicle_type);
      }
    }

    if (data.color) {
      if (VEHICLE_COLORS.includes(data.color as any)) {
        setValue("color", data.color, { shouldValidate: true });
      } else {
        setValue("color", "Other", { shouldValidate: true });
        setCustomColor(data.color);
      }
    }

    if (data.customer_name && data.customer_name !== "Guest Customer" && data.customer_name !== "Walk-In Customer") {
      setValue("customer_name", data.customer_name, { shouldValidate: true });
    }
  };

  // UNIFIED LIVE SEARCH EFFECT (300ms debounce)
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
        const res = await api.get(`/search/universal?q=${encodeURIComponent(q)}`);
        const list = Array.isArray(res.data?.results) ? res.data.results : (Array.isArray(res.data) ? res.data : []);
        setSearchResults(list);
        setShowSearchDropdown(list.length > 0);
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
    toast.success("Customer & vehicle details loaded");
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
        const res = await api.get(`/search/universal?plate=${encodeURIComponent(plateNumber)}`);
        if (res.data) {
          applyVehicleToForm(res.data);
          toast.success(`Found Vehicle: ${res.data.make || ''} ${res.data.model || ''}`);
        }
      } catch (err) {
        console.error(err);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [plateNumber]);

  // Reactive Package Fetching driven by active vehicle body type
  useEffect(() => {
    const fetchPackages = async () => {
      setIsLoadingPackages(true);
      try {
        const res = await api.get("/services", {
          params: activeVehicleType ? { vehicle_type: activeVehicleType } : {}
        });
        const list = Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : (res.data?.results || []));
        setPackages(list);
      } catch (err) {
        console.error(err);
        setPackages([]);
      } finally {
        setIsLoadingPackages(false);
      }
    };
    fetchPackages();
  }, [activeVehicleType]);

  // Filter packages based on active vehicle body type selection
  const filteredPackages = packages.filter((pkg) => {
    if (!pkg.vehicle_type || pkg.vehicle_type === "ALL") return true;
    return pkg.vehicle_type.toUpperCase() === activeVehicleType || activeVehicleType.includes(pkg.vehicle_type.toUpperCase());
  });

  const handleNextVehicle = () => {
    reset();
    setSelectedVehicleId(null);
    setSelectedCustomerId(null);
    setCustomMake("");
    setCustomModel("");
    setCustomType("");
    setCustomColor("");
    setShowAdvanceDiscount(false);
    setAgreedPriceInput("");
    setDiscountReason("");
    setCompletedReceipt(null);
  };

  const onSubmit = async (data: POSFormValues) => {
    try {
      const realMake = data.make === "Other" ? (customMake || "Custom Make") : (data.make || "Standard");
      const realModel = (data.make === "Other" || data.model === "Other") ? (customModel || "Custom Model") : (data.model || "Vehicle");
      const rawSelectedType = data.vehicle_type === "Other" ? customType : data.vehicle_type;
      const realType =
        rawSelectedType && rawSelectedType.trim()
          ? rawSelectedType.trim()
          : (category || (selectedPackage?.vehicle_type && selectedPackage.vehicle_type !== "ALL" ? selectedPackage.vehicle_type : "Hatchback"));
      const realColor = data.color === "Other" ? (customColor || "Other") : (data.color || "White");

      const cleanPhone = (data.phone || (data as any).phoneNumber || (data as any).phone_number || "").trim();
      const cleanPlate = ((data as any).licensePlate || data.plate_number || (data as any).vehicle_number || "")
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9\s\-]/g, '');

      const finalPriceNumber = showAdvanceDiscount && !isNaN(finalAgreedPrice) && finalAgreedPrice > 0 ? Number(finalAgreedPrice) : Number(baseCatalogPrice);
      const discountAmt = showAdvanceDiscount ? Number(calculatedDiscountAmt) : 0;
      const discountPct = showAdvanceDiscount ? parseFloat(calculatedDiscountPct) : 0;
      const discountRsn = showAdvanceDiscount && discountReason.trim() ? discountReason.trim() : "";

      const currentStaffId = staffUser?.id || staffUser?.user_id || undefined;
      const currentBranchId = staffUser?.branch_id || staffUser?.branchId || 1;

      const payload: ExpressWalkinPayload = {
        plate_number: cleanPlate,
        customer_phone: cleanPhone,
        customer_name: data.customer_name?.trim() || "Walk-In Customer",
        package_id: Number(data.package_id || selectedPackage?.id),
        make: realMake,
        model: realModel,
        vehicle_type: realType,
        color: realColor,
        bay_assignment: "Bay 1",
        notes: (data as any).notes || "",
        discount_reason: discountRsn,
        discount_amount: discountAmt,
        discount_percentage: discountPct,
        base_price: Number(baseCatalogPrice || 0),
        final_price: Number(finalPriceNumber),
        advance_amount: 0,
        customer_id: selectedCustomerId && selectedCustomerId !== "undefined" ? selectedCustomerId : null,
        vehicle_id: selectedVehicleId && !isNaN(Number(selectedVehicleId)) ? Number(selectedVehicleId) : null,
        staff_id: currentStaffId,
        technician_id: currentStaffId,
        branch_id: currentBranchId,
        payment_method: "CASH",
        is_paid: false,
        time_slot: new Date().toISOString(),
      };

      const bookingData = await createExpressWalkinBooking(payload);

      const resolvedBookingId = bookingData?.booking_id || bookingData?.booking?.id || bookingData?.data?.id || "NEW";

      toast.success(`Vehicle ${cleanPlate} Added to Queue!`);
      try {
        window.dispatchEvent(new CustomEvent('queue:updated'));
      } catch {
        // Continue
      }

      setCompletedReceipt({
        booking_id: resolvedBookingId,
        plate_number: cleanPlate,
        customer_name: data.customer_name?.trim() || "Walk-In Customer",
        phone: cleanPhone,
        vehicle_make_model: `${realMake} ${realModel}`,
        vehicle_type: realType,
        service_name: selectedPackage?.name || "Walk-In Wash",
        base_price: Number(baseCatalogPrice || 0),
        final_price: Number(finalPriceNumber),
        discount_amount: discountAmt,
        discount_percentage: discountPct,
        discount_reason: discountRsn,
        bay_assignment: "Bay 1",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      });
    } catch (error: any) {
      const errResponse = error.response?.data;
      const detailsMsg = errResponse?.details
        ? Object.entries(errResponse.details)
            .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
            .join(' | ')
        : null;

      const displayMessage =
        errResponse?.error ||
        detailsMsg ||
        errResponse?.message ||
        error.message ||
        "Error processing walk-in.";

      console.error('Validation error:', JSON.stringify(errResponse || error, null, 2));
      toast.error(displayMessage);
    }
  };


  return (
    <div className="bg-[#050505] min-h-screen font-jakarta text-white relative">
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#141518] to-[#050505]" />
      <div className="absolute inset-0 z-0 opacity-10 bg-[url('https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?q=80&w=2669&auto=format&fit=crop')] bg-cover bg-center mix-blend-luminosity" />

      <main className="relative z-10 max-w-4xl mx-auto pt-10 pb-20 px-6 sm:px-12 min-h-screen flex flex-col">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={() => router.push('/staff/dashboard')}
              className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all border border-white/5 hover:border-white/20"
              title="Return to Staff Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-syncopate text-2xl sm:text-3xl font-bold tracking-widest text-white uppercase flex items-center gap-2">
                Staff <span className="text-[#01FFFF]">POS</span>
                <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  LIVE
                </span>
              </h1>
              <p className="text-[11px] sm:text-xs tracking-[0.25em] font-bold text-zinc-500 uppercase mt-0.5">
                Express Vehicle Intake & Counter Settlement
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => router.push('/staff/dashboard')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-colors text-xs font-bold uppercase tracking-wider border border-white/10"
            >
              Dashboard
            </button>
            <button
              type="button"
              onClick={() => router.push('/staff/queue')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#01FFFF]/10 hover:bg-[#01FFFF]/20 text-[#01FFFF] transition-colors text-xs font-bold uppercase tracking-wider border border-[#01FFFF]/30"
            >
              Queue Board
            </button>
          </div>
        </header>

        {/* POS Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 flex-1 flex flex-col justify-between">
          <div className="space-y-8">
            {/* UNIFIED MULTI-FIELD LIVE SEARCH BAR */}
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

            {/* Vehicle Details Card with Smart Vehicle Master Catalog */}
            <div className="bg-[#141518]/60 backdrop-blur-2xl border border-white/5 rounded-[2rem] p-6 sm:p-8 shadow-2xl">
              <SmartVehicleSelector
                initialMake={selectedMake}
                initialModel={selectedModel}
                initialBodyType={(selectedType as DjangoVehicleType) || "HATCHBACK"}
                onVehicleChange={(vData) => {
                  setValue("make", vData.make, { shouldValidate: true });
                  setValue("model", vData.model, { shouldValidate: true });

                  // Check for Body-Type change and invalidate cart/selected package
                  const currentType = watch("vehicle_type");
                  if (currentType && currentType !== vData.vehicle_type) {
                    if (selectedPackageId) {
                      setValue("package_id", undefined as any, { shouldValidate: true });
                      toast.error(`Vehicle body type changed to ${vData.vehicle_type}. Selected service package cleared!`);
                    }
                  }
                  setValue("vehicle_type", vData.vehicle_type, { shouldValidate: true });
                }}
              />

              {/* Color Dropdown */}
              <div className="mt-4 pt-4 border-t border-white/10">
                <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block mb-1">
                  Vehicle Exterior Color
                </label>
                <select
                  {...register("color")}
                  className="w-full sm:w-1/2 bg-[#141518] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#01FFFF] transition-all cursor-pointer [color-scheme:dark]"
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
                    className="mt-2 w-full sm:w-1/2 bg-black/40 border border-[#01FFFF]/40 rounded-xl px-3.5 py-2 text-xs text-[#01FFFF] outline-none focus:border-[#01FFFF] transition-all placeholder:text-zinc-600"
                  />
                )}
              </div>
            </div>

            {/* Service Selection */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <label className="text-xs uppercase tracking-[0.2em] font-bold text-zinc-500 block">
                  Select Service Package ({selectedType || category})
                </label>
                <span className="text-[10px] font-mono text-[#01FFFF] font-bold uppercase tracking-widest bg-[#01FFFF]/10 px-3 py-1 rounded-full border border-[#01FFFF]/20">
                  Body-Type Filter Active
                </span>
              </div>

              {isLoadingPackages ? (
                <div className="flex justify-center h-48 items-center bg-[#141518]/40 border border-white/5 rounded-3xl">
                  <Loader2 className="w-8 h-8 animate-spin text-[#01FFFF]" />
                </div>
              ) : filteredPackages.length === 0 ? (
                <div className="p-8 text-center bg-[#141518]/40 border border-white/5 rounded-3xl text-zinc-400 text-xs">
                  No packages explicitly linked to {selectedType || category}. Showing all available catalog packages.
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4 text-left">
                    {packages.map((pkg) => {
                      const isSelected = selectedPackageId === pkg.id;
                      const activePrice = getPackageActivePrice(pkg, activeVehicleType);
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
                          <div className="flex items-center justify-between mb-2">
                            <h3 className={`font-syncopate font-bold text-sm tracking-wide ${isSelected ? "text-white" : "text-zinc-300"}`}>
                              {pkg.name}
                            </h3>
                            <span className="text-[9px] font-mono text-[#01FFFF] bg-[#01FFFF]/10 px-2 py-0.5 rounded border border-[#01FFFF]/20 font-bold uppercase">
                              {activeVehicleType}
                            </span>
                          </div>
                          <p className={`font-mono font-bold text-lg ${isSelected ? "text-[#01FFFF]" : "text-zinc-500"}`}>
                            ₹{activePrice}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {filteredPackages.map((pkg) => {
                    const isSelected = selectedPackageId === pkg.id;
                    const activePrice = getPackageActivePrice(pkg, activeVehicleType);
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
                        <div className="flex items-center justify-between mb-2">
                          <h3 className={`font-syncopate font-bold text-sm tracking-wide ${isSelected ? "text-white" : "text-zinc-300"}`}>
                            {pkg.name}
                          </h3>
                          <span className="text-[9px] font-mono text-[#01FFFF] bg-[#01FFFF]/10 px-2 py-0.5 rounded border border-[#01FFFF]/20 font-bold uppercase">
                            {activeVehicleType}
                          </span>
                        </div>
                        <p className={`font-mono font-bold text-lg ${isSelected ? "text-[#01FFFF]" : "text-zinc-500"}`}>
                          ₹{activePrice}
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

            {/* Advance Discount / Negotiated Deal (Optional Accordion) */}
            {selectedPackage && (
              <div className="bg-[#141518]/60 backdrop-blur-2xl border border-white/10 hover:border-white/20 rounded-2xl sm:rounded-[2rem] p-5 sm:p-6 shadow-xl space-y-4 transition-all">
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
                      Advance Discount / Negotiated Deal (മുൻകൂട്ടിയുള്ള ഇളവ് - Optional)
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
                          {["Regular Customer", "Fleet Bargain", "Counter Bargain", "Dirtiness Concession", "Festival Offer"].map((chip) => (
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
                        <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">Final Expected Total:</span>
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

          {/* Primary Submit CTA Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#E52323] text-white font-syncopate font-bold text-lg sm:text-xl py-6 rounded-[2rem] hover:bg-red-700 hover:scale-[1.01] shadow-[0_0_30px_rgba(229,35,35,0.4)] hover:shadow-[0_0_50px_rgba(229,35,35,0.6)] transition-all active:scale-[0.99] flex flex-col items-center justify-center gap-1.5 disabled:opacity-70 disabled:hover:scale-100 uppercase tracking-[0.15em] mt-8 border border-[#E52323]/50 cursor-pointer"
          >
            {isSubmitting ? (
              <Loader2 className="w-7 h-7 animate-spin" />
            ) : (
              <>
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-white" />
                  Confirm & Add to Queue
                </span>
                <span className="text-xs font-normal normal-case tracking-normal text-white/80 font-sans">
                  കൺഫോം ചെയ്ത് ക്യൂവിലേക്ക് ചേർക്കുക
                </span>
              </>
            )}
          </button>
        </form>

        {/* INSTANT INTAKE CONFIRMATION MODAL */}
        {completedReceipt && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <div className="bg-[#0d0e12] border border-[#01FFFF]/40 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-[0_0_80px_rgba(1,255,255,0.2)] space-y-6 relative animate-in fade-in zoom-in duration-200">
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-syncopate font-bold text-base text-white uppercase tracking-wider">
                      Vehicle Added to Queue
                    </h3>
                    <p className="text-[11px] font-mono text-[#01FFFF] font-bold">
                      Booking Token #{completedReceipt.booking_id}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleNextVehicle}
                  className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* License Plate Banner */}
              <div className="p-4 rounded-2xl bg-black/80 border-2 border-white/15 text-center shadow-inner">
                <div className="text-[10px] uppercase font-bold tracking-[0.3em] text-zinc-500 mb-1">
                  License Plate
                </div>
                <div className="font-syncopate font-bold text-3xl sm:text-4xl text-white tracking-widest">
                  {completedReceipt.plate_number}
                </div>
                <div className="text-xs font-bold text-[#01FFFF] mt-1">
                  {completedReceipt.vehicle_make_model} • {completedReceipt.vehicle_type}
                </div>
              </div>

              {/* Customer & Bay Info */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="text-[10px] text-zinc-400 uppercase font-bold block mb-0.5">Customer</span>
                  <p className="font-bold text-white truncate">{completedReceipt.customer_name}</p>
                  <p className="text-zinc-500 font-mono text-[11px]">{completedReceipt.phone || "Walk-In"}</p>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="text-[10px] text-zinc-400 uppercase font-bold block mb-0.5">Assigned Bay</span>
                  <p className="font-bold text-[#01FFFF]">{completedReceipt.bay_assignment || "Auto Queue"}</p>
                  <p className="text-zinc-500 font-mono text-[11px]">Intake: {completedReceipt.timestamp}</p>
                </div>
              </div>

              {/* Service Details & Payment Notice */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Service Package:</span>
                  <span className="font-bold text-white">{completedReceipt.service_name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Catalog Estimate:</span>
                  <span className="font-mono text-zinc-300 font-bold">₹{completedReceipt.base_price.toFixed(2)}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#01FFFF]/5 border border-[#01FFFF]/20 text-[11px] text-cyan-300 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-[#01FFFF] flex-shrink-0" />
                  <span>Payment collection and counter bargain discounts will be settled at checkout.</span>
                </div>
              </div>

              {/* Streamlined Staff Navigation Actions */}
              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => router.push('/staff/queue')}
                    className="flex items-center justify-center gap-2.5 py-4 px-4 rounded-2xl bg-[#01FFFF] hover:bg-[#01FFFF]/90 text-black font-syncopate font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_25px_rgba(1,255,255,0.35)] hover:shadow-[0_0_35px_rgba(1,255,255,0.5)] active:scale-98 cursor-pointer"
                  >
                    <Layers className="w-4 h-4" />
                    <span>Go to Live Queue</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleNextVehicle}
                    className="flex items-center justify-center gap-2.5 py-4 px-4 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-syncopate font-bold text-xs uppercase tracking-wider transition-all border border-white/15 hover:border-white/30 active:scale-98 cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4 text-[#01FFFF]" />
                    <span>Add Another Vehicle</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => router.push("/staff/dashboard")}
                  className="w-full flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-zinc-300 hover:text-white font-bold text-xs tracking-wide transition-all border border-white/10 hover:border-white/20 cursor-pointer"
                >
                  <LayoutDashboard className="w-4 h-4 text-[#01FFFF]" />
                  <span>View in Staff Dashboard</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-0.5 text-zinc-500" />
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
