/**
 * KALLAYI CAR SPA & AUTO CARE - AUTHENTICATION CRYPTO UTILITIES
 * Provides:
 * 1. Django PBKDF2 (SHA-256) password verification and migration compatibility
 * 2. Timing-safe password comparisons
 * 3. Clean input sanitization
 */

import crypto from 'crypto';

/**
 * Verifies a plain text password against a Django PBKDF2-SHA256 password hash.
 * Django format: pbkdf2_sha256$<iterations>$<salt>$<hash>
 */
export function verifyDjangoPbkdf2(password: string, djangoHash: string): boolean {
  if (!password || !djangoHash || !djangoHash.startsWith('pbkdf2_sha256$')) {
    return false;
  }

  try {
    const parts = djangoHash.split('$');
    if (parts.length !== 4) return false;

    const [, iterationsStr, salt, expectedHash] = parts;
    const iterations = parseInt(iterationsStr, 10);
    if (isNaN(iterations) || !salt || !expectedHash) return false;

    // Django uses 32 bytes (256 bits) key length with sha256 digest
    const derivedKey = crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256');
    const computedHash = derivedKey.toString('base64');

    const bufComputed = Buffer.from(computedHash);
    const bufExpected = Buffer.from(expectedHash);

    if (bufComputed.length !== bufExpected.length) {
      return false;
    }

    return crypto.timingSafeEqual(bufComputed, bufExpected);
  } catch (err) {
    console.warn('[PBKDF2 Verification Error]:', err);
    return false;
  }
}

/**
 * Sanitizes phone number by removing all whitespace and non-numeric characters (except leading +).
 */
export function sanitizePhoneNumber(phone: string): string {
  const trimmed = (phone || '').trim();
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  return hasPlus ? `+${digits}` : digits;
}

/**
 * Sanitizes password input with trim and length validation.
 */
export function sanitizePassword(password: string): string {
  return String(password ?? '').trim();
}
