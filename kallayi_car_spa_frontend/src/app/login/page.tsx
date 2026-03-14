"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { EyeOff, Eye, Car, Lock, ShieldCheck, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // 1. Authenticate with Django Backend API
      const authRes = await fetch("http://127.0.0.1:8001/api/api-token-auth/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!authRes.ok) {
        throw new Error("Invalid username or password");
      }

      const authData = await authRes.json();
      const token = authData.token;

      // 1. Force save to Local Storage (This is what the Admin page looks for!)
      localStorage.setItem('auth_token', token); 

      // 2. You can also keep the cookie if you want, but localStorage is mandatory.
      document.cookie = `auth_token=${token}; path=/;`;

      // 2. Fetch User Profile
      const meRes = await fetch("http://127.0.0.1:8001/api/core/users/me/", {
        headers: {
          Authorization: `Token ${token}`,
        },
      });

      if (!meRes.ok) {
        throw new Error("Failed to fetch user profile data");
      }

      const meData = await meRes.json();
      const role = meData.role;

      // 3. Routing Based on Role
      if (role === "ADMIN" || role === "MANAGER") {
        router.push("/admin/dashboard");
      } else if (role === "WASHER" || role === "DRIVER" || role === "TECHNICIAN") {
        router.push("/staff/queue");
      } else {
        router.push("/customer/dashboard");
      }
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
          <h2 className="font-grotesk text-xs text-cyan uppercase tracking-[0.3em] font-semibold mb-3">SECURE PORTAL</h2>
          <h1 className="font-syncopate text-3xl md:text-4xl text-white font-bold tracking-tight">AUTHORIZATION</h1>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-6">
          {/* Username Input */}
          <div className="space-y-2 relative group w-full">
            <label className="font-grotesk text-[10px] md:text-xs uppercase tracking-[0.2em] text-tungsten font-bold ml-2">Username</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Car className="h-5 w-5 text-tungsten group-focus-within:text-magenta transition-colors" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-white/5 border border-white/10 py-4 pl-12 pr-4 rounded-xl text-white font-mono focus:outline-none focus:border-magenta focus:ring-1 focus:ring-magenta transition-all placeholder:text-tungsten/40"
                placeholder="Enter identification..."
                required
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-2 relative group w-full">
            <label className="font-grotesk text-[10px] md:text-xs uppercase tracking-[0.2em] text-tungsten font-bold ml-2">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-tungsten group-focus-within:text-cyan transition-colors" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 py-4 pl-12 pr-12 rounded-xl text-white font-mono focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan transition-all placeholder:text-tungsten/40"
                placeholder="Enter access code..."
                required
                disabled={isLoading}
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
          </div>

          {/* Error Message */}
          <div className={`text-magenta font-mono text-xs text-center min-h-[16px] transition-opacity duration-300 font-semibold tracking-wide ${error ? 'opacity-100' : 'opacity-0'}`}>
            {error && `> ERR: ${error}`}
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-magenta text-white font-syncopate font-bold py-4 rounded-xl hover:shadow-[0_0_30px_rgba(255,42,109,0.4)] hover:scale-[1.02] transition-all active:scale-95 flex justify-center items-center gap-2 mt-2 disabled:opacity-70 disabled:hover:scale-100 disabled:hover:shadow-none"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                AUTHENTICATING...
              </>
            ) : (
              <>
                INITIALIZE <ShieldCheck className="w-5 h-5" />
              </>
            )}
          </button>
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
