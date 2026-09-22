'use client';

import React, { useId } from 'react';
import { Check, X } from 'lucide-react';
import { cleanPhoneInput, toTenDigitPhone, isValidIndianMobile } from '@/lib/phone';

export interface CinematicPhoneInputProps {
  value?: string | null;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  disabled?: boolean;
  placeholder?: string;
  id?: string;
  name?: string;
  autoFocus?: boolean;
  className?: string;
  required?: boolean;
}

/**
 * Unified Indian Mobile Phone Input Component
 * 
 * Standard UI Pattern across Kallayi Car Spa:
 * - Fixed, non-editable country code badge: `+91`
 * - Strict 10-digit numeric constraint (`maxLength={10}`, `type="tel"`)
 * - Auto-strips non-digits, leading zeros, and +91/91 on paste
 * - Real-time visual validation indicators (emerald for valid, red for error)
 */
export function CinematicPhoneInput({
  value,
  onChange,
  onBlur,
  error,
  disabled = false,
  placeholder = '98765 43210',
  id,
  name,
  autoFocus = false,
  className = '',
  required = false,
}: CinematicPhoneInputProps) {
  const generatedId = useId();
  const inputId = id || generatedId;

  // Extract core 10 digits from any passed value (e.g. if passed +919847123456, display 9847123456)
  const displayDigits = toTenDigitPhone(value || '');
  const isValid = isValidIndianMobile(displayDigits);
  const isFilled = displayDigits.length > 0;
  const isComplete = displayDigits.length === 10;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const cleaned = cleanPhoneInput(rawVal);
    onChange(cleaned);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange('');
  };

  return (
    <div className={`w-full flex flex-col group ${className}`}>
      <div
        className={`relative flex items-center bg-[#07080a] border rounded-2xl transition-all duration-200 ${
          error
            ? 'border-red-500/80 shadow-[0_0_15px_rgba(239,68,68,0.25)]'
            : isValid
            ? 'border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.2)] focus-within:border-emerald-400'
            : 'border-white/10 hover:border-white/20 focus-within:border-[#01FFFF]/80 focus-within:shadow-[0_0_20px_rgba(1,255,255,0.18)]'
        } ${disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
      >
        {/* Fixed Non-Editable Country Code Badge */}
        <div
          className="flex items-center gap-1.5 px-3.5 py-3 select-none flex-shrink-0 bg-white/[0.03] border-r border-white/10 rounded-l-2xl text-neutral-300"
          aria-hidden="true"
        >
          <span className="text-base leading-none" role="img" aria-label="India Flag">
            🇮🇳
          </span>
          <span className="font-mono text-sm font-semibold tracking-wider text-white">
            +91
          </span>
        </div>

        {/* 10-Digit Numeric Phone Input */}
        <input
          id={inputId}
          name={name}
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={10}
          value={displayDigits}
          onChange={handleChange}
          onBlur={onBlur}
          disabled={disabled}
          placeholder={placeholder}
          autoFocus={autoFocus}
          required={required}
          autoComplete="tel-national"
          className="w-full bg-transparent text-white font-mono text-base tracking-widest px-3.5 py-3 outline-none placeholder:text-neutral-600 placeholder:font-sans placeholder:tracking-normal"
        />

        {/* Action / Validation Indicator Icons */}
        <div className="flex items-center gap-2 pr-3.5 flex-shrink-0">
          {/* Clear button when typed */}
          {isFilled && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="text-neutral-500 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
              title="Clear phone number"
              tabIndex={-1}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Valid 10-Digit Indian Mobile Indicator */}
          {isComplete && (
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                isValid
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
              }`}
              title={isValid ? 'Valid 10-digit Indian Mobile' : 'Must start with 6, 7, 8, or 9'}
            >
              <Check className="w-3 h-3" />
            </div>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <p className="text-[10px] text-red-400 font-mono tracking-wider uppercase ml-1 mt-1.5 flex items-center gap-1">
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

// Named alias for explicit imports
export const StandardPhoneInput = CinematicPhoneInput;
export default CinematicPhoneInput;
