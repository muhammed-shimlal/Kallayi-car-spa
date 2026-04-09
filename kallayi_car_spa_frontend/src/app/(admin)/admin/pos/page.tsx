"use client";

import React, { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, ArrowLeft } from "lucide-react";
import { isValidPhoneNumber } from "react-phone-number-input";
import { CinematicPhoneInput } from "@/components/ui/phone-input";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

const posSchema = z.object({
  plate_number: z.string().min(1, "License plate is required"),
  phone: z.string().min(1, { message: "Phone number is required" }).refine((val) => val && isValidPhoneNumber(val), {
    message: "Invalid phone number",
  }),
  package_id: z.number().refine((val) => val !== undefined, {
    message: "Please select a service package",
  }),
  technician_id: z.number().optional(),
});

type POSFormValues = z.infer<typeof posSchema>;

export default function AdminExpressPOSPage() {
  const router = useRouter();
  const [packages, setPackages] = useState<any[]>([]);
  const [isLoadingPackages, setIsLoadingPackages] = useState(true);
  const [staffMembers, setStaffMembers] = useState<any[]>([]);

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
      technician_id: undefined,
    },
  });

  const selectedPackageId = watch("package_id");
  const selectedTechId = watch("technician_id");
  const plateNumber = watch("plate_number");

  // AUTO-FILL WATCHER
  useEffect(() => {
    if (!plateNumber || plateNumber.length < 4) return;

    const timer = setTimeout(async () => {
      try {
        const token = localStorage.getItem("auth_token");
        const res = await fetch(`http://127.0.0.1:8001/api/vehicles/lookup/?plate=${encodeURIComponent(plateNumber)}`, {
          headers: token ? { Authorization: `Token ${token}` } : {},
        });

        if (res.ok) {
          const data = await res.json();
          if (data.phone) {
            setValue("phone", data.phone, { shouldValidate: true });
            toast.success(`Found: ${data.customer_name}'s Vehicle`);
          }
        }
      } catch (err) {
        console.error(err);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [plateNumber, setValue]);

  useEffect(() => {
    const fetchPackagesAndStaff = async () => {
      try {
        const token = localStorage.getItem("auth_token");
        
        const pkgRes = await fetch("http://127.0.0.1:8001/api/service-packages/", {
          headers: token ? { Authorization: `Token ${token}` } : {},
        });
        if (pkgRes.ok) {
          const data = await pkgRes.json();
          setPackages(data.results || data);
        } else {
          setPackages([
            { id: 1, name: "Foam Wash", price: "500.00" },
            { id: 2, name: "Deep Detail", price: "1200.00" },
            { id: 3, name: "Interior Polish", price: "800.00" },
          ]);
        }

        const staffRes = await fetch("http://127.0.0.1:8001/api/staff/directory/", {
          headers: token ? { Authorization: `Token ${token}` } : {},
        });
        if (staffRes.ok) {
          const staffData = await staffRes.json();
          const list = Array.isArray(staffData) ? staffData : (staffData.results || []);
          const workers = list.filter((s: any) => s.role === 'WASHER' || s.role === 'TECHNICIAN');
          setStaffMembers(workers);
        }
      } catch (err) {
        setPackages([
          { id: 1, name: "Foam Wash", price: "500.00" },
          { id: 2, name: "Deep Detail", price: "1200.00" },
          { id: 3, name: "Interior Polish", price: "800.00" },
        ]);
      } finally {
        setIsLoadingPackages(false);
      }
    };
    fetchPackagesAndStaff();
  }, []);

  const onSubmit = async (data: POSFormValues) => {
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch("http://127.0.0.1:8001/api/bookings/express-walkin/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        throw new Error("Failed to process walk-in");
      }

      toast.success("Vehicle Added to Queue!");
      reset();
    } catch (error) {
      alert("Error processing walk-in. Ensure you have proper permissions (Washer/Tech/Manager).");
      console.error(error);
    }
  };


  return (
    <div className="bg-[#050505] min-h-screen font-jakarta text-white relative">
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#141518] to-[#050505]" />
      <div className="absolute inset-0 z-0 opacity-10 bg-[url('https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?q=80&w=2669&auto=format&fit=crop')] bg-cover bg-center mix-blend-luminosity" />

      <main className="relative z-10 max-w-4xl mx-auto pt-10 pb-20 px-6 sm:px-12 h-screen flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between mb-12">
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
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-10 flex-1 flex flex-col justify-between">
          <div className="space-y-10">
            {/* Input Groups Container */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Plate Number */}
              <div className="bg-[#141518]/60 backdrop-blur-2xl border border-white/5 rounded-[2rem] p-8 shadow-2xl flex flex-col justify-center">
                <label className="text-xs uppercase tracking-[0.2em] font-bold text-[#01FFFF] mb-4 text-center block">
                  License Plate
                </label>
                <input
                  {...register("plate_number")}
                  className={`w-full bg-transparent border-b-2 text-center text-5xl sm:text-6xl font-syncopate font-bold uppercase transition-all pb-4 outline-none placeholder:text-zinc-800 ${
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
              <div className="bg-[#141518]/60 backdrop-blur-2xl border border-white/5 rounded-[2rem] p-8 shadow-2xl flex flex-col justify-center">
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

            {/* Assign Washer (Optional) */}
            {staffMembers.length > 0 && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <label className="text-xs uppercase tracking-[0.2em] font-bold text-zinc-500 block">
                    Assign Washer (Optional)
                  </label>
                  {selectedTechId && (
                    <button
                      type="button"
                      onClick={() => setValue("technician_id", undefined, { shouldValidate: true })}
                      className="text-[#E52323] hover:text-[#ff4d84] text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center gap-1"
                    >
                      Clear Selection
                    </button>
                  )}
                </div>
                <div className="flex overflow-x-auto gap-4 pb-4 snap-x no-scrollbar" style={{ scrollbarWidth: 'none' }}>
                  {staffMembers.map((staff) => {
                    const isSelected = selectedTechId === staff.id;
                    return (
                      <button
                        type="button"
                        key={staff.id}
                        onClick={() => setValue("technician_id", staff.id, { shouldValidate: true })}
                        className={`flex-none snap-start p-4 rounded-2xl min-w-[140px] text-center transition-all duration-300 ${
                          isSelected
                            ? "bg-[#01FFFF]/10 border-2 border-[#01FFFF] shadow-[0_0_20px_rgba(1,255,255,0.15)] scale-105"
                            : "bg-[#141518]/60 border border-white/5 hover:border-white/20 hover:bg-[#141518]"
                        }`}
                      >
                        <h3 className={`font-syncopate font-bold text-xs tracking-wide mb-1 truncate ${isSelected ? "text-white" : "text-zinc-300"}`}>
                          {staff.first_name}
                        </h3>
                        <p className={`text-[10px] uppercase font-bold tracking-widest ${isSelected ? "text-[#01FFFF]" : "text-zinc-500"}`}>
                          {staff.role}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
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
