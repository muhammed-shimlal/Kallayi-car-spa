'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import Cookies from 'js-cookie';
import {
    User, Phone, Lock, Eye, EyeOff, ShieldCheck, CheckCircle2,
    AlertCircle, Car, ChevronDown, Sparkles, ArrowRight, Loader2, KeyRound
} from 'lucide-react';
import api from '@/lib/api';
import { GmailInput } from '@/components/ui/GmailInput';
import { SmartVehicleSelector } from '@/components/ui/smart-vehicle-selector';
import { CinematicPhoneInput } from '@/components/ui/phone-input';
import { isValidIndianMobile } from '@/lib/phone';
import { VehicleType } from '@/types/database';

// Password Strength Calculation Helper
function getPasswordStrength(password: string) {
    if (!password) return { score: 0, label: '', color: 'bg-neutral-800' };

    let score = 0;
    if (password.length >= 6) score += 1;
    if (password.length >= 8 && /[0-9]/.test(password)) score += 1;
    if (password.length >= 10 && /[A-Z]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    switch (score) {
        case 1:
            return { score: 1, label: 'WEAK PROTOCOL', color: 'bg-[#E52323] shadow-[0_0_10px_rgba(229,35,35,0.6)]' };
        case 2:
            return { score: 2, label: 'FAIR SECURITY', color: 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.6)]' };
        case 3:
            return { score: 3, label: 'HIGH ENCRYPTION', color: 'bg-[#01FFFF] shadow-[0_0_10px_rgba(1,255,255,0.6)]' };
        case 4:
            return { score: 4, label: 'ULTIMATE FORTRESS', color: 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.7)]' };
        default:
            return { score: 0, label: '', color: 'bg-neutral-800' };
    }
}

export default function SignupPage() {
    const router = useRouter();

    // Form State
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Optional Vehicle Section
    const [addVehicle, setAddVehicle] = useState(false);
    const [vehicleMake, setVehicleMake] = useState('');
    const [vehicleModel, setVehicleModel] = useState('');
    const [vehiclePlate, setVehiclePlate] = useState('');
    const [vehicleType, setVehicleType] = useState<VehicleType>('HATCHBACK');

    const handleVehicleChange = useCallback((vData: {
        make: string;
        model: string;
        vehicle_type: VehicleType;
        isManual: boolean;
    }) => {
        setVehicleMake(prev => (prev === vData.make ? prev : vData.make));
        setVehicleModel(prev => (prev === vData.model ? prev : vData.model));
        setVehicleType(prev => (prev === vData.vehicle_type ? prev : vData.vehicle_type));
    }, []);

    // Status & Feedback State
    const [touched, setTouched] = useState<{ [key: string]: boolean }>({});
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Auto-fill phone & password from pendingSignup if user was redirected from Login
    React.useEffect(() => {
        try {
            const pending = sessionStorage.getItem('pendingSignup');
            if (pending) {
                const parsed = JSON.parse(pending);
                if (parsed.phone) setPhone(parsed.phone);
                if (parsed.password) setPassword(parsed.password);
                // IMMEDIATELY remove pendingSignup from sessionStorage for security
                sessionStorage.removeItem('pendingSignup');
            }
        } catch (e) {
            console.error('Error reading pending signup credentials:', e);
        }
    }, []);

    const handleBlur = (field: string) => {
        setTouched((prev) => ({ ...prev, [field]: true }));
    };

    // Real-time Validation Checks
    const isNameValid = useMemo(() => name.trim().length >= 2, [name]);
    const isPhoneValid = useMemo(() => isValidIndianMobile(phone), [phone]);
    // Email is completely optional for quick walk-in customer signup
    const isEmailValid = useMemo(() => {
        const trimmed = email.trim();
        if (!trimmed) return true; // Optional!
        return trimmed.includes('@') && trimmed.includes('.');
    }, [email]);
    const isPasswordValid = useMemo(() => password.length >= 6, [password]);
    const isConfirmPasswordValid = useMemo(() => confirmPassword.length >= 6 && confirmPassword === password, [confirmPassword, password]);
    const isVehicleValid = useMemo(() => {
        if (!addVehicle) return true;
        return vehicleMake.trim().length >= 1 && vehicleModel.trim().length >= 1 && vehiclePlate.trim().length >= 3;
    }, [addVehicle, vehicleMake, vehicleModel, vehiclePlate]);

    const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);

    const isFormValid = isNameValid && isPhoneValid && isEmailValid && isPasswordValid && isConfirmPasswordValid && isVehicleValid;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!isFormValid) {
            setTouched({
                name: true,
                phone: true,
                email: true,
                password: true,
                confirmPassword: true,
                vehicleMake: true,
                vehicleModel: true,
                vehiclePlate: true
            });
            if (!isEmailValid) {
                setError('Please provide a valid email address (or leave it blank).');
            } else {
                setError('Please complete all required fields (Name, Phone number, and Password).');
            }
            return;
        }

        setIsLoading(true);

        try {
            // Standardized JSON Payload Construction
            const payload: any = {
                name: name.trim(),
                phone: phone.trim(),
                email: email.trim().toLowerCase(),
                password: password
            };

            if (addVehicle) {
                payload.vehicle = {
                    make: vehicleMake.trim(),
                    model: vehicleModel.trim(),
                    plate_number: vehiclePlate.trim().toUpperCase(),
                    vehicle_type: vehicleType || 'HATCHBACK'
                };
            }

            const res = await api.post('/customers/register/', payload);
            const token = res.data?.token;

            if (!token) {
                throw new Error('Server returned invalid authentication payload.');
            }

            // Save authentication token and user profile to persistent storage
            localStorage.setItem('auth_token', token);
            localStorage.setItem('access_token', token);
            localStorage.setItem('token', token);
            Cookies.set('auth_token', token, { expires: 30, path: '/' });
            Cookies.set('access_token', token, { expires: 30, path: '/' });

            const returnedUser = res.data?.user;
            if (returnedUser) {
                localStorage.setItem('user', JSON.stringify(returnedUser));
                if (returnedUser.role) {
                    Cookies.set('user_role', returnedUser.role, { expires: 30, path: '/' });
                }
            }

            // Strict role-based redirect
            const userRole = (returnedUser?.role || '').toUpperCase();
            const isAdmin = userRole === 'ADMIN' || userRole === 'MANAGER' || returnedUser?.is_superuser;
            const isStaff = !isAdmin && (
                userRole === 'STAFF' || 
                returnedUser?.is_staff || 
                ['WASHER', 'DRIVER', 'TECHNICIAN'].includes(userRole)
            );

            if (isAdmin) {
                router.replace('/admin/dashboard');
            } else if (isStaff) {
                router.replace('/staff/queue');
            } else {
                router.replace(res.data?.redirect || '/customer/dashboard');
            }
        } catch (err: any) {
            console.error('Registration failed:', err);
            const errorData = err.response?.data;
            const apiError = errorData?.message || errorData?.error || errorData?.detail || err.message || 'Registration failed. Please check your credentials.';
            setError(apiError);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden font-sans selection:bg-[#E52323]/30 selection:text-white">
            
            {/* Cinematic Background Image Overlay & Mobile-Safe Ambient Lighting */}
            <div className="absolute inset-0 z-0 opacity-15 bg-[url('https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?q=80&w=2669&auto=format&fit=crop')] bg-cover bg-center mix-blend-luminosity" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/80 to-transparent pointer-events-none" />
            <div className="absolute top-1/4 -left-20 w-80 h-80 bg-[#01FFFF]/10 rounded-full blur-3xl sm:blur-[100px] transform-gpu pointer-events-none" />
            <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-[#E52323]/15 rounded-full blur-3xl sm:blur-[100px] transform-gpu pointer-events-none" />

            <div className="w-full max-w-lg relative z-10 my-8">
                
                {/* Header Branding */}
                <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-8"
                >
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#0a0a0d] shadow-[6px_6px_16px_#020203,-6px_-6px_16px_#14151a] border border-white/10 mb-4 group transition-transform duration-300 hover:scale-105">
                        <ShieldCheck className="w-8 h-8 text-[#01FFFF] drop-shadow-[0_0_12px_rgba(1,255,255,0.6)]" />
                    </div>
                    <h2 className="text-[11px] font-mono text-[#01FFFF] uppercase tracking-[0.3em] font-semibold mb-2">
                        JOIN KALLAYI CAR SPA
                    </h2>
                    <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white font-syncopate uppercase mb-2">
                        CREATE AN ACCOUNT
                    </h1>
                    <p className="text-sm text-neutral-400 font-light">
                        Sign up to book your wash and track your history.
                    </p>
                </motion.div>

                {/* Tactile Obsidian Card */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="bg-[#0a0a0d] rounded-3xl p-6 sm:p-10 shadow-2xl border border-white/10 relative overflow-hidden"
                >
                    <form onSubmit={handleSubmit} className="space-y-5">
                        
                        {/* 1. Full Name Input */}
                        <div className="space-y-1.5 group">
                            <label className="text-xs uppercase tracking-wider text-neutral-300 font-medium flex items-center justify-between">
                                <span>Full Name *</span>
                                {touched.name && (
                                    <span className="text-[10px]">
                                        {isNameValid ? (
                                            <span className="text-[#01FFFF] flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Valid</span>
                                        ) : (
                                            <span className="text-[#E52323] flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Min 2 characters</span>
                                        )}
                                    </span>
                                )}
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-500 group-focus-within:text-[#01FFFF] transition-colors">
                                    <User className="w-5 h-5" />
                                </div>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    onBlur={() => handleBlur('name')}
                                    disabled={isLoading}
                                    placeholder="Enter full name..."
                                    className={`w-full bg-[#050507] text-white placeholder-neutral-600 py-3.5 pl-11 pr-10 rounded-2xl text-sm font-medium transition-all duration-200 outline-none border touch-manipulation ${
                                        touched.name
                                            ? isNameValid
                                                ? 'border-[#01FFFF]/60 shadow-[0_0_15px_rgba(1,255,255,0.2)]'
                                                : 'border-[#E52323]/60 shadow-[0_0_15px_rgba(229,35,35,0.2)]'
                                            : 'border-white/10 focus:border-[#01FFFF]'
                                    }`}
                                />
                            </div>
                        </div>

                        {/* 2. Mobile Number Input */}
                        <div className="space-y-1.5 group">
                            <label className="text-xs uppercase tracking-wider text-neutral-300 font-medium flex items-center justify-between">
                                <span>Mobile Number *</span>
                                {touched.phone && (
                                    <span className="text-[10px]">
                                        {isPhoneValid ? (
                                            <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Valid Indian Mobile</span>
                                        ) : (
                                            <span className="text-[#E52323] flex items-center gap-1"><AlertCircle className="w-3 h-3" /> 10-digit number required</span>
                                        )}
                                    </span>
                                )}
                            </label>
                            <CinematicPhoneInput
                                value={phone}
                                onChange={setPhone}
                                onBlur={() => handleBlur('phone')}
                                disabled={isLoading}
                                placeholder="98765 43210"
                                error={touched.phone && !isPhoneValid ? 'Please enter a valid 10-digit Indian mobile number' : undefined}
                            />
                        </div>

                        {/* 3. Email Address Input (Optional) */}
                        <GmailInput
                            value={email}
                            onChange={setEmail}
                            disabled={isLoading}
                            required={false}
                            label="Email Address (Optional)"
                            placeholder="yourname@gmail.com (optional)"
                        />

                        {/* 4. Password Input */}
                        <div className="space-y-1.5 group">
                            <label className="text-xs uppercase tracking-wider text-neutral-300 font-medium flex items-center justify-between">
                                <span>Create Password *</span>
                                {touched.password && (
                                    <span className="text-[10px]">
                                        {isPasswordValid ? (
                                            <span className="text-[#01FFFF] flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Valid</span>
                                        ) : (
                                            <span className="text-[#E52323] flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Min 6 chars</span>
                                        )}
                                    </span>
                                )}
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-500 group-focus-within:text-[#01FFFF] transition-colors">
                                    <Lock className="w-5 h-5" />
                                </div>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    onBlur={() => handleBlur('password')}
                                    disabled={isLoading}
                                    placeholder="••••••••••••"
                                    className={`w-full bg-[#050507] text-white placeholder-neutral-600 py-3.5 pl-11 pr-12 rounded-2xl text-sm font-medium tracking-wider transition-all duration-200 outline-none border touch-manipulation ${
                                        touched.password
                                            ? isPasswordValid
                                                ? 'border-[#01FFFF]/60 shadow-[0_0_15px_rgba(1,255,255,0.2)]'
                                                : 'border-[#E52323]/60 shadow-[0_0_15px_rgba(229,35,35,0.2)]'
                                            : 'border-white/10 focus:border-[#01FFFF]'
                                    }`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-neutral-500 hover:text-[#01FFFF] transition-colors touch-manipulation cursor-pointer"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>

                            {/* Password Strength Meter */}
                            {password && (
                                <div className="pt-2 space-y-1">
                                    <div className="flex justify-between items-center text-[10px]">
                                        <span className="text-neutral-400 uppercase tracking-widest">Password Strength</span>
                                        <span className="font-bold text-white tracking-wider">{passwordStrength.label}</span>
                                    </div>
                                    <div className="grid grid-cols-4 gap-1.5 h-1.5 bg-[#050507] p-0.5 rounded-full">
                                        {[1, 2, 3, 4].map((step) => (
                                            <div
                                                key={step}
                                                className={`h-full rounded-full transition-colors duration-200 ${
                                                    step <= passwordStrength.score ? passwordStrength.color : 'bg-neutral-800'
                                                }`}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 4. Confirm Password Input */}
                        <div className="space-y-1.5 group">
                            <label className="text-xs uppercase tracking-wider text-neutral-300 font-medium flex items-center justify-between">
                                <span>Confirm Password *</span>
                                {touched.confirmPassword && (
                                    <span className="text-[10px]">
                                        {isConfirmPasswordValid ? (
                                            <span className="text-[#01FFFF] flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Matched</span>
                                        ) : (
                                            <span className="text-[#E52323] flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Passwords do not match</span>
                                        )}
                                    </span>
                                )}
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-500 group-focus-within:text-[#01FFFF] transition-colors">
                                    <KeyRound className="w-5 h-5" />
                                </div>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    onBlur={() => handleBlur('confirmPassword')}
                                    disabled={isLoading}
                                    placeholder="••••••••••••"
                                    className={`w-full bg-[#050507] text-white placeholder-neutral-600 py-3.5 pl-11 pr-10 rounded-2xl text-sm font-medium tracking-wider transition-all duration-200 outline-none border touch-manipulation ${
                                        touched.confirmPassword
                                            ? isConfirmPasswordValid
                                                ? 'border-[#01FFFF]/60 shadow-[0_0_15px_rgba(1,255,255,0.2)]'
                                                : 'border-[#E52323]/60 shadow-[0_0_15px_rgba(229,35,35,0.2)]'
                                            : 'border-white/10 focus:border-[#01FFFF]'
                                    }`}
                                />
                            </div>
                        </div>

                        {/* 5. Optional Vehicle Section Toggle */}
                        <div className="pt-2 border-t border-white/10">
                            <button
                                type="button"
                                onClick={() => setAddVehicle(!addVehicle)}
                                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-[#050507] border border-white/5 hover:border-[#01FFFF]/30 transition-colors touch-manipulation cursor-pointer"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-[#0a0a0d] flex items-center justify-center text-[#01FFFF] border border-white/5">
                                        <Car className="w-4 h-4" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-xs font-semibold text-white">Add Your Vehicle (Optional)</p>
                                        <p className="text-[10px] text-neutral-400">Save vehicle details for express booking</p>
                                    </div>
                                </div>
                                <ChevronDown className={`w-5 h-5 text-neutral-400 transition-transform duration-200 ${addVehicle ? 'rotate-180 text-[#01FFFF]' : ''}`} />
                            </button>

                            {/* Lightweight Expandable Vehicle Section */}
                            {addVehicle && (
                                <div className="mt-3 p-4 rounded-2xl bg-[#0f1015] border border-white/10 space-y-4 animate-in fade-in zoom-in-95 duration-200">
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block mb-1">
                                            License Plate / Registration Number
                                        </label>
                                        <input
                                            type="text"
                                            value={vehiclePlate}
                                            onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())}
                                            onBlur={() => handleBlur('vehiclePlate')}
                                            placeholder="e.g. KL 10 AW 9999"
                                            className="w-full bg-[#141518] border border-white/10 rounded-xl px-3.5 py-3 text-xs uppercase tracking-wider font-mono font-bold text-white outline-none focus:border-[#01FFFF] transition-colors touch-manipulation"
                                        />
                                    </div>

                                    <SmartVehicleSelector
                                        initialMake={vehicleMake}
                                        initialModel={vehicleModel}
                                        initialBodyType={vehicleType}
                                        onVehicleChange={handleVehicleChange}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Error Alert Display */}
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-3.5 rounded-xl bg-[#E52323]/10 border border-[#E52323]/40 text-[#E52323] text-xs flex flex-col gap-2"
                            >
                                <div className="flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    <span>{error}</span>
                                </div>
                                {(error.toLowerCase().includes('already') || error.toLowerCase().includes('log in')) && (
                                    <Link
                                        href="/login"
                                        className="mt-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#01FFFF]/20 border border-[#01FFFF]/40 text-[#01FFFF] font-bold text-[11px] hover:bg-[#01FFFF]/30 transition-colors w-fit"
                                    >
                                        Go to Login Page <ArrowRight className="w-3.5 h-3.5" />
                                    </Link>
                                )}
                            </motion.div>
                        )}

                        {/* Primary Crimson Red Neon Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full relative group overflow-hidden rounded-2xl p-[1px] focus:outline-none transition-all duration-300 active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none mt-2"
                        >
                            <div className="relative bg-gradient-to-r from-[#E52323] via-[#ff2a55] to-[#E52323] rounded-2xl py-4 px-6 flex items-center justify-center gap-2 text-white shadow-[0_0_25px_rgba(229,35,35,0.5)] group-hover:shadow-[0_0_40px_rgba(229,35,35,0.8)] transition-all duration-300">
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 text-white animate-spin" />
                                        <span className="font-syncopate font-bold text-xs text-white uppercase tracking-widest">CREATING ACCOUNT...</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="font-syncopate font-bold text-xs text-white uppercase tracking-widest">
                                            CREATE ACCOUNT
                                        </span>
                                        <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </div>
                        </button>

                    </form>

                    {/* Bottom Navigation Link */}
                    <div className="mt-6 text-center">
                        <Link
                            href="/login"
                            className="text-xs text-neutral-400 hover:text-[#01FFFF] transition-colors tracking-wider uppercase inline-flex items-center gap-1.5"
                        >
                            <span>Already have an account?</span>
                            <span className="text-[#01FFFF] font-semibold underline underline-offset-4">Log In</span>
                        </Link>
                    </div>
                </motion.div>

                {/* Footer Security Badge */}
                <div className="mt-8 text-center">
                    <p className="text-[10px] text-neutral-500 tracking-[0.2em] uppercase flex items-center justify-center gap-2">
                        <ShieldCheck className="w-3.5 h-3.5 text-neutral-500" />
                        <span>Kallayi Car Spa // Manjeri</span>
                    </p>
                </div>
            </div>
        </div>
    );
}
