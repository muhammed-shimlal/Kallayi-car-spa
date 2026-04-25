"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { EyeOff, Eye, Lock, ShieldCheck, Loader2, User } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { isValidPhoneNumber } from "react-phone-number-input";
import { CinematicPhoneInput } from "@/components/ui/phone-input";
import Link from "next/link";
import api from '@/lib/api';

const signupSchema = z.object({
  name: z.string().min(2, "Full Name is required"),
  phone: z.string()
    .min(1, "Phone number is required")
    .refine((val) => val && isValidPhoneNumber(val), {
      message: "Invalid phone number",
    }),
  password: z.string().min(1, "Password is required"),
});

type SignupFormValues = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      phone: "",
      password: "",
    },
  });

  const onSubmit = async (data: SignupFormValues) => {
    setError("");
    setIsLoading(true);

    try {
      // 1. Authenticate with Django Backend API
      const authRes = await api.post("/customers/register/", {
        name: data.name,
        phone: data.phone,
        password: data.password,
      });

      const token = authRes.data?.token;

      if (!token) throw new Error("No token received from the server.");

      // Force save to Local Storage (This is what the Dashboard looks for!)
      localStorage.setItem("auth_token", token);

      // Keep the cookie if you want, but localStorage is mandatory.
      document.cookie = `auth_token=${token}; path=/;`;

      // 2. Routing to Customer Dashboard
      router.push("/customer/dashboard");
      
    } catch (err: any) {
      setError(err.message || "An authentication error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-obsidian min-h-screen relative flex items-center justify-center p-4 overflow-hidden z-0">
      {/* Cinematic Dark Background with Supercar */}
      <div className="absolute inset-0 z-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?q=80&w=2669&auto=format&fit=crop')] bg-cover bg-center mix-blend-luminosity" />
      <div className="absolute inset-0 z-0 bg-gradient-to-t from-obsidian via-obsidian/80 to-transparent" />

      {/* The Glassmorphism HUD Card */}
      <div className="max-w-lg w-full bg-carbon/60 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-10 shadow-[0_0_50px_rgba(0,0,0,0.5)] relative z-10 transition-all duration-500 hover:shadow-[0_0_80px_rgba(255,42,109,0.15)] flex flex-col">
        {/* Header Section */}
        <div className="text-center mb-10 w-full flex flex-col items-center">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center relative group">
              <div className="absolute inset-0 bg-cyan/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <ShieldCheck className="w-8 h-8 text-cyan relative z-10" />
            </div>
          </div>
          <h2 className="font-grotesk text-xs text-cyan uppercase tracking-[0.3em] font-semibold mb-3">NEW USER PROTOCOL</h2>
          <h1 className="font-syncopate text-3xl md:text-4xl text-white font-bold tracking-tight">REGISTRATION</h1>
        </div>

        {/* Signup Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          
          {/* Full Name Input */}
          <div className="space-y-2 relative group w-full">
            <label className="font-grotesk text-[10px] md:text-xs uppercase tracking-[0.2em] text-tungsten font-bold ml-2">Full Name</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-tungsten group-focus-within:text-cyan transition-colors" />
              </div>
              <input
                type="text"
                {...register("name")}
                disabled={isLoading}
                className={`w-full bg-white/5 border ${errors.name ? 'border-[#E52323]' : 'border-white/10'} py-4 pl-12 pr-4 rounded-xl text-white font-mono focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan transition-all placeholder:text-tungsten/40`}
                placeholder="Enter full name..."
              />
            </div>
            {errors.name && (
              <p className="text-[10px] text-[#E52323] font-bold tracking-widest uppercase ml-1 mt-2">
                {errors.name.message}
              </p>
            )}
          </div>

          {/* Phone Input */}
          <div className="space-y-2 relative group w-full">
            <label className="font-grotesk text-[10px] md:text-xs uppercase tracking-[0.2em] text-tungsten font-bold ml-2">Secure Phone ID</label>
            <Controller
              name="phone"
              control={control}
              render={({ field }) => (
                <div className="relative">
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

          {/* Password Input */}
          <div className="space-y-2 relative group w-full">
            <label className="font-grotesk text-[10px] md:text-xs uppercase tracking-[0.2em] text-tungsten font-bold ml-2">Secure Access Code</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-tungsten group-focus-within:text-cyan transition-colors" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                {...register("password")}
                disabled={isLoading}
                className={`w-full bg-white/5 border ${errors.password ? 'border-[#E52323]' : 'border-white/10'} py-4 pl-12 pr-12 rounded-xl text-white font-mono focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan transition-all placeholder:text-tungsten/40`}
                placeholder="Create access code..."
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-tungsten hover:text-white transition-colors"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-[10px] text-[#E52323] font-bold tracking-widest uppercase ml-1 mt-2">
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Error Message */}
          <div className={`text-[#E52323] font-mono text-xs text-center min-h-[16px] transition-opacity duration-300 font-semibold tracking-wide ${error ? 'opacity-100' : 'opacity-0'}`}>
            {error && `> ERR: ${error}`}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#E52323] text-white font-syncopate font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(229,35,35,0.4)] hover:shadow-[0_0_30px_rgba(229,35,35,0.6)] hover:bg-red-700 hover:scale-[1.02] transition-all active:scale-95 flex justify-center items-center gap-2 mt-2 disabled:opacity-70 disabled:hover:scale-100 disabled:hover:shadow-none"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                AUTHORIZING...
              </>
            ) : (
              <>
                CREATE ACCOUNT <ShieldCheck className="w-5 h-5" />
              </>
            )}
          </button>

          {/* Link back to Login */}
          <div className="text-center mt-6">
            <Link href="/login" className="font-grotesk text-[11px] text-tungsten hover:text-cyan transition-colors tracking-widest uppercase">
              Already registered? Authorize Here
            </Link>
          </div>
        </form>
        
        {/* Footer */}
        <div className="mt-10 text-center border-t border-white/5 pt-6">
            <p className="font-mono text-[10px] text-tungsten/50 uppercase tracking-widest">
                Kallayi Car Spa // Encrypted Protocol v2.5
            </p>
        </div>
      </div>
    </div>
  );
}
