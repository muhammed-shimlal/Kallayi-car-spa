"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { EyeOff, Eye, Lock, ShieldCheck, Loader2, ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { isValidPhoneNumber } from "react-phone-number-input";
import { CinematicPhoneInput } from "@/components/ui/phone-input";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import api from '@/lib/api';

const loginSchema = z.object({
  phone: z.string()
    .min(1, "Phone number is required")
    .refine((val) => val && isValidPhoneNumber(val), {
      message: "Invalid phone number formatting",
    }),
  password: z.string().min(1, "Access password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      phone: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setError("");
    setIsLoading(true);

    try {
      // 1. Authenticate with Django Backend API
      const authRes = await api.post("/api-token-auth/", {
        username: data.phone,
        password: data.password,
      });

      const token = authRes.data.token;

      // Save token to localStorage and cookie for authentication state
      localStorage.setItem("auth_token", token);
      document.cookie = `auth_token=${token}; path=/;`;

      // 2. Fetch User Profile to determine role
      const meRes = await api.get("/core/users/me/", {
        headers: {
          Authorization: `Token ${token}`,
        },
      });

      const role = meRes.data.role;

      // 3. Route user based on role
      if (role === "ADMIN" || role === "MANAGER") {
        router.push("/admin/dashboard");
      } else if (role === "WASHER" || role === "DRIVER" || role === "TECHNICIAN") {
        router.push("/staff/dashboard");
      } else {
        router.push("/customer/dashboard");
      }
    } catch (err: any) {
      if (err.response?.status === 400 || err.response?.status === 401) {
        setError("Invalid phone number or access password");
      } else {
        setError(err.message || "An authentication error occurred.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070709] text-white flex flex-col lg:flex-row overflow-hidden relative font-sans">
      
      {/* LEFT COLUMN: NEUMORPHIC AUTHORIZATION FORM (50% Desktop Width) */}
      <div className="w-full lg:w-1/2 min-h-screen flex flex-col justify-between p-6 sm:p-12 lg:p-16 relative z-10">
        
        {/* Top Header & Navigation */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-mono text-neutral-400 hover:text-white transition-colors uppercase tracking-widest group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>KALLAYI CAR SPA</span>
          </Link>

          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-neutral-500 bg-white/5 border border-white/10 px-3 py-1 rounded-full">
            ENCRYPTED SESSION // v2.5
          </div>
        </div>

        {/* Form Container Wrapper */}
        <div className="max-w-md w-full mx-auto my-auto py-10">
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-8"
          >
            {/* Header Text */}
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 text-xs font-mono tracking-[0.3em] text-neutral-500 uppercase">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>SECURE PORTAL</span>
              </div>
              <h1 className="font-display text-3xl sm:text-4xl font-light tracking-tight text-white uppercase">
                AUTHENTICATE
              </h1>
              <p className="text-sm text-neutral-400 font-light leading-relaxed">
                Enter your registered phone identity and access key to access your private dashboard.
              </p>
            </div>

            {/* NEUMORPHIC FORM CARD */}
            <div className="bg-[#0b0c0f] shadow-[-14px_-14px_30px_rgba(255,255,255,0.02),14px_14px_35px_rgba(0,0,0,0.95)] border border-white/5 rounded-3xl p-8 sm:p-10 space-y-6">
              
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                
                {/* Phone Field */}
                <div className="space-y-2">
                  <label className="block font-mono text-[11px] uppercase tracking-widest text-neutral-400 font-medium">
                    Registered Phone ID
                  </label>
                  <Controller
                    name="phone"
                    control={control}
                    render={({ field }) => (
                      <div className="bg-[#08080a] shadow-[inset_3px_3px_6px_rgba(0,0,0,0.95),inset_-2px_-2px_5px_rgba(255,255,255,0.03)] border border-white/5 rounded-2xl p-1.5 focus-within:border-white/30 focus-within:shadow-[inset_3px_3px_6px_rgba(0,0,0,0.95),0_0_14px_rgba(255,255,255,0.12)] transition-all">
                        <CinematicPhoneInput
                          value={field.value}
                          onChange={field.onChange}
                          error={errors.phone?.message}
                          disabled={isLoading}
                        />
                      </div>
                    )}
                  />
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <label className="block font-mono text-[11px] uppercase tracking-widest text-neutral-400 font-medium">
                    Access Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-500">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      {...register("password")}
                      disabled={isLoading}
                      placeholder="ENTER ACCESS KEY..."
                      className={`w-full bg-[#08080a] shadow-[inset_3px_3px_6px_rgba(0,0,0,0.95),inset_-2px_-2px_5px_rgba(255,255,255,0.03)] border ${
                        errors.password ? 'border-red-500/80' : 'border-white/5 focus:border-white/30'
                      } py-3.5 pl-11 pr-11 rounded-2xl text-white font-mono text-sm focus:outline-none focus:shadow-[inset_3px_3px_6px_rgba(0,0,0,0.95),0_0_14px_rgba(255,255,255,0.12)] transition-all placeholder:text-neutral-600`}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-neutral-500 hover:text-white transition-colors"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-[10px] font-mono text-red-400 tracking-wider uppercase mt-1.5 ml-1">
                      {errors.password.message}
                    </p>
                  )}
                </div>

                {/* Animated Error Alert */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className="bg-red-950/30 border border-red-500/30 p-3.5 rounded-xl font-mono text-xs text-red-400 flex items-center gap-2"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                      <span>{error}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Tactile Neumorphic Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full relative overflow-hidden bg-gradient-to-r from-red-600 to-red-700 shadow-[-6px_-6px_14px_rgba(255,255,255,0.03),6px_6px_18px_rgba(0,0,0,0.9)] hover:shadow-[-2px_-2px_8px_rgba(255,255,255,0.05),2px_2px_14px_rgba(229,35,35,0.4)] active:shadow-[inset_3px_3px_6px_rgba(0,0,0,0.9)] text-white font-mono font-bold text-xs uppercase tracking-[0.2em] py-4 rounded-2xl transition-all duration-200 transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-60 disabled:pointer-events-none group"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>AUTHENTICATING SECURE CHANNEL...</span>
                    </>
                  ) : (
                    <>
                      <span>INITIALIZE SESSION</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>

              </form>

              {/* Registration Link */}
              <div className="pt-2 text-center border-t border-white/5">
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-1.5 font-mono text-xs text-neutral-400 hover:text-white transition-colors tracking-wider uppercase group"
                >
                  <span>REQUEST NEW PORTAL REGISTRATION</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>

            </div>
          </motion.div>

        </div>

        {/* Footer Protocol Notice */}
        <div className="text-center font-mono text-[10px] text-neutral-600 uppercase tracking-widest">
          KALLAYI CAR SPA // 256-BIT ENCRYPTED AUTHORIZATION PROTOCOL
        </div>

      </div>

      {/* RIGHT COLUMN: CINEMATIC CAR SPA BAY VISUAL (50% Desktop Width, Hidden on Mobile) */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden bg-black border-l border-white/10">
        
        {/* Background Image with Dark Vignette Gradient */}
        <div
          className="absolute inset-0 bg-cover bg-center filter grayscale brightness-75 contrast-125 transition-transform duration-1000 scale-105 hover:scale-100"
          style={{
            backgroundImage: `url('https://i.pinimg.com/736x/7b/97/f1/7b97f1a701559036275799affa544dc6.jpg')`
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-t from-[#070709] via-black/40 to-black/70" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,#000000_90%)]" />

        {/* Overlay Content */}
        <div className="relative z-10 h-full p-16 flex flex-col justify-between">
          
          {/* Top Specification Badge */}
          <div className="flex justify-end">
            <div className="bg-black/70 backdrop-blur-md border border-white/10 px-4 py-1.5 rounded-full font-mono text-xs tracking-widest text-neutral-300 uppercase flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>FLAGSHIP DETAILING BAY // MANJERI</span>
            </div>
          </div>

          {/* Bottom Editorial Copy */}
          <div className="space-y-6 max-w-lg">
            <div className="space-y-2">
              <span className="font-mono text-xs text-neutral-400 tracking-[0.3em] uppercase block">
                PRECISION AUTOMOTIVE PRESERVATION
              </span>
              <h2 className="font-display text-4xl font-light tracking-tight text-white uppercase leading-tight">
                Pinnacle Detailing & Chassis Protection
              </h2>
            </div>

            <p className="text-sm text-neutral-300 font-light leading-relaxed">
              Access your personalized detailing records, live bay telemetry, and priority service reservations through our encrypted client portal.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full font-mono text-[10px] text-neutral-300 uppercase tracking-wider">
                CERAMIC COATING
              </span>
              <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full font-mono text-[10px] text-neutral-300 uppercase tracking-wider">
                3M™ UNDERCOATING
              </span>
              <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full font-mono text-[10px] text-neutral-300 uppercase tracking-wider">
                360° INTERIOR
              </span>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
