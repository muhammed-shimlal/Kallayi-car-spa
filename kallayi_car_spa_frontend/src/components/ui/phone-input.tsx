import React from "react";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";

interface CinematicPhoneInputProps {
  value: string;
  onChange: (value: string | undefined) => void;
  error?: string;
  disabled?: boolean;
}

export function CinematicPhoneInput({ value, onChange, error, disabled }: CinematicPhoneInputProps) {
  return (
    <div className="w-full flex flex-col group">
      <div
        className={`flex items-center bg-[#141518]/60 backdrop-blur-xl border rounded-xl p-1 transition-all
          [&_.PhoneInputCountry]:mr-3 [&_.PhoneInputCountry]:ml-2
          [&_.PhoneInputInput]:bg-transparent [&_.PhoneInputInput]:text-white [&_.PhoneInputInput]:font-mono [&_.PhoneInputInput]:text-lg [&_.PhoneInputInput]:outline-none [&_.PhoneInputInput]:border-none [&_.PhoneInputInput]:focus:ring-0
          [&_.PhoneInputCountrySelectArrow]:text-white [&_.PhoneInputCountrySelectArrow]:opacity-70
          ${
            error
              ? "border-[#E52323]"
              : "border-white/10 focus-within:border-[#01FFFF]"
          }
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        `}
      >
        <PhoneInput
          international
          defaultCountry="IN"
          value={value}
          onChange={onChange}
          disabled={disabled}
          className="w-full py-2"
        />
      </div>
      {error && (
        <p className="text-[10px] text-[#E52323] font-bold tracking-widest uppercase ml-1 mt-2">
          {error}
        </p>
      )}
    </div>
  );
}
