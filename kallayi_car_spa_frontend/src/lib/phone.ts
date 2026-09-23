/**
 * KALLAYI CAR SPA & AUTO CARE - UNIFIED PHONE NORMALIZATION UTILITY
 * 
 * Single source of truth for Indian mobile phone number handling across
 * frontend inputs, backend API routes, and database queries/storage.
 * 
 * Canonical Database Storage: Standard E.164 (+91XXXXXXXXXX)
 * Input Validation: Strictly 10 digits matching /^[6-9]\d{9}$/
 */

/**
 * Extracts strictly the core 10-digit Indian mobile number from any input.
 * Strips whitespace, hyphens, brackets, leading zeros, and +91/91 country codes.
 * Returns null if the resulting number is not a valid 10-digit Indian mobile.
 * 
 * @example
 * extractTenDigitPhone('+91 98471-23456') // '9847123456'
 * extractTenDigitPhone('09847123456')      // '9847123456'
 * extractTenDigitPhone('919847123456')     // '9847123456'
 * extractTenDigitPhone('12345')            // null
 */
export function extractTenDigitPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const str = String(raw).trim();
  if (!str) return null;

  // 1. Strip all non-digit characters
  let digits = str.replace(/\D/g, '');

  // 2. Handle leading zeros (e.g., 09847123456 -> 9847123456)
  if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  // 3. Handle country code prefixes
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  } else if (digits.length > 10 && digits.startsWith('91')) {
    digits = digits.slice(2);
  } else if (digits.length > 10) {
    digits = digits.slice(-10);
  }

  // 4. Validate strictly 10 digits starting with 6, 7, 8, or 9
  if (/^[6-9]\d{9}$/.test(digits)) {
    return digits;
  }

  return null;
}

/**
 * Validates whether an input represents a valid 10-digit Indian mobile number.
 */
export function isValidIndianMobile(raw: string | null | undefined): boolean {
  return extractTenDigitPhone(raw) !== null;
}

/**
 * Normalizes any phone number into canonical E.164 format (+91XXXXXXXXXX).
 * This is the mandatory format for writing into public.customers, public.staff_profiles,
 * and auth.users.
 * 
 * @example
 * normalizePhone('9847123456')     // '+919847123456'
 * normalizePhone('+91 9847123456') // '+919847123456'
 * normalizePhone('09847123456')    // '+919847123456'
 */
export function normalizePhone(raw: string | null | undefined): string {
  if (!raw) return '';
  const tenDigit = extractTenDigitPhone(raw);
  if (tenDigit) {
    return `+91${tenDigit}`;
  }

  // Fallback cleanup if not strictly matching Indian standard but contains digits
  const str = String(raw).trim();
  const digits = str.replace(/\D/g, '');
  if (digits.length === 10) {
    return `+91${digits}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+${digits}`;
  }
  if (str.startsWith('+')) {
    return `+${digits}`;
  }
  return digits ? `+91${digits}` : '';
}

/**
 * Returns raw 10-digit phone string (XXXXXXXXXX) for local display or input state.
 */
export function toTenDigitPhone(raw: string | null | undefined): string {
  if (!raw) return '';
  const ten = extractTenDigitPhone(raw);
  if (ten) return ten;
  const digits = String(raw).replace(/\D/g, '');
  return digits.length > 10 ? digits.slice(-10) : digits;
}

/**
 * Generates an array of all standard database representation variants for queries.
 * Enables backward-compatible lookups matching both legacy and normalized records:
 * ['+91XXXXXXXXXX', '91XXXXXXXXXX', 'XXXXXXXXXX', '0XXXXXXXXXX']
 */
export function getPhoneVariants(raw: string | null | undefined): {
  digits: string;
  e164: string;
  tenDigit: string;
  twelveDigit: string;
  variants: string[];
} {
  if (!raw) {
    return { digits: '', e164: '', tenDigit: '', twelveDigit: '', variants: [] };
  }

  const ten = extractTenDigitPhone(raw);
  const rawDigits = String(raw).replace(/\D/g, '');

  if (ten) {
    const e164 = `+91${ten}`;
    const twelve = `91${ten}`;
    const zeroLeading = `0${ten}`;
    const uniqueVariants = Array.from(new Set([e164, twelve, ten, zeroLeading]));
    return {
      digits: rawDigits,
      e164,
      tenDigit: ten,
      twelveDigit: twelve,
      variants: uniqueVariants,
    };
  }

  // If not matching strict pattern, construct best-effort variants from raw digits
  const baseDigits = rawDigits.length > 10 ? rawDigits.slice(-10) : rawDigits;
  const variants = Array.from(new Set([
    String(raw).trim(),
    rawDigits,
    `+91${baseDigits}`,
    `91${baseDigits}`,
    baseDigits,
  ])).filter(Boolean);

  return {
    digits: rawDigits,
    e164: baseDigits ? `+91${baseDigits}` : '',
    tenDigit: baseDigits,
    twelveDigit: baseDigits ? `91${baseDigits}` : '',
    variants,
  };
}

/**
 * Real-time input cleaner for React input onChange handlers.
 * Restricts input to numeric digits, automatically strips pasted country codes
 * (+91, 91, or leading 0), and caps length at exactly 10 digits.
 * 
 * @example
 * cleanPhoneInput('+91 98471 23456') // '9847123456'
 * cleanPhoneInput('09847123456')      // '9847123456'
 * cleanPhoneInput('9847123456extra')  // '9847123456'
 */
export function cleanPhoneInput(val: string): string {
  if (!val) return '';
  let digits = val.replace(/\D/g, '');

  // If user pasted a full number with country code (91) or leading trunk zero (0)
  if (digits.length >= 11 && digits.startsWith('91')) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  // Cap at the first 10 digits so additional typed digits are ignored and leading digits preserved
  return digits.slice(0, 10);
}

/**
 * Formats a phone number for user-friendly display: '+91 98471 23456'
 */
export function formatPhoneDisplay(raw: string | null | undefined): string {
  if (!raw) return '';
  const ten = extractTenDigitPhone(raw) || toTenDigitPhone(raw);
  if (ten.length === 10) {
    return `+91 ${ten.slice(0, 5)} ${ten.slice(5)}`;
  }
  return String(raw);
}
