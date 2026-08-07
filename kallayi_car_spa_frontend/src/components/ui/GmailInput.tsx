"use client";

import React, { useState, useMemo } from "react";
import { Mail, CheckCircle2, AlertCircle } from "lucide-react";

interface GmailInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    required?: boolean;
    label?: string;
    id?: string;
}

export function GmailInput({
    value,
    onChange,
    placeholder = "yourname@gmail.com",
    disabled = false,
    required = true,
    label = "Gmail Address *",
    id = "gmail-input"
}: GmailInputProps) {
    const [touched, setTouched] = useState(false);

    const trimmed = value.trim().toLowerCase();
    const isGmailDomain = useMemo(() => {
        if (!trimmed.includes("@")) return false;
        const parts = trimmed.split("@");
        return parts.length === 2 && parts[1] === "gmail.com" && parts[0].length >= 1;
    }, [trimmed]);

    const isNonGmailDomain = useMemo(() => {
        if (!trimmed.includes("@")) return false;
        const parts = trimmed.split("@");
        return parts.length >= 2 && parts[1].length > 0 && parts[1] !== "gmail.com";
    }, [trimmed]);

    const showError = touched && isNonGmailDomain;
    const showSuccess = isGmailDomain;

    return (
        <div className="space-y-2">
            {label && (
                <div className="flex items-center justify-between">
                    <label htmlFor={id} className="block text-xs uppercase tracking-widest text-neutral-300 font-medium">
                        {label}
                    </label>
                    {showSuccess && (
                        <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider flex items-center gap-1 font-bold">
                            ✓ @gmail.com verified
                        </span>
                    )}
                </div>
            )}

            <div className="relative">
                <div className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors ${showSuccess ? 'text-emerald-400' : showError ? 'text-red-400' : 'text-neutral-500'}`}>
                    <Mail className="w-4 h-4" />
                </div>

                <input
                    id={id}
                    type="email"
                    required={required}
                    disabled={disabled}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onBlur={() => setTouched(true)}
                    placeholder={placeholder}
                    className={`
                        w-full bg-[#08080a] py-3.5 pl-11 pr-11 rounded-2xl text-white text-sm focus:outline-none transition-all duration-300
                        shadow-[inset_3px_3px_6px_rgba(0,0,0,0.95),inset_-2px_-2px_5px_rgba(255,255,255,0.03)]
                        ${showError
                            ? 'border border-red-500/80 shadow-[inset_3px_3px_6px_rgba(0,0,0,0.95),0_0_15px_rgba(239,68,68,0.25)] animate-shake'
                            : showSuccess
                                ? 'border border-emerald-500/80 shadow-[inset_3px_3px_6px_rgba(0,0,0,0.95),0_0_15px_rgba(16,185,129,0.25)]'
                                : 'border border-white/5 focus:border-white/30 focus:shadow-[inset_3px_3px_6px_rgba(0,0,0,0.95),0_0_14px_rgba(255,255,255,0.12)]'
                        }
                    `}
                />

                {/* Animated Glowing Icon inside Box */}
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                    {showSuccess && (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 animate-in zoom-in-50 duration-200 shadow-emerald-500/50 drop-shadow-md" />
                    )}
                    {showError && (
                        <AlertCircle className="w-5 h-5 text-red-400 animate-in zoom-in-50 duration-200" />
                    )}
                </div>
            </div>

            {/* Error Message Slide Down */}
            {showError && (
                <p className="text-[11px] text-red-400 tracking-wider flex items-center gap-1.5 mt-1.5 animate-in fade-in slide-in-from-top-1 duration-200 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
                    Please use a valid Gmail address (@gmail.com). Temp mails are not allowed.
                </p>
            )}
        </div>
    );
}
