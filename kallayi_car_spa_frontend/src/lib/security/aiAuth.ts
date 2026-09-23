/**
 * KALLAYI CAR SPA & AUTO CARE - AI & MCP SECURITY AUTHENTICATION
 * 
 * Provides timing-attack-safe Bearer token validation for external AI agents
 * (Google Gemini AI, Model Context Protocol servers, and automated webhooks).
 * 
 * Enforces strict secret comparison using Node.js crypto.timingSafeEqual.
 */

import { NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * Constant-time string comparison to prevent timing side-channel attacks.
 */
function timingSafeEqualStr(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');

  // If buffer lengths differ, perform dummy comparison to preserve constant time
  if (bufA.length !== bufB.length) {
    const dummy = Buffer.alloc(bufB.length);
    crypto.timingSafeEqual(dummy, bufB);
    return false;
  }

  return crypto.timingSafeEqual(bufA, bufB);
}

export type AiAuthResult = 
  | { authorized: true }
  | { authorized: false; status: number; error: string };

/**
 * Validates the Authorization Bearer token from an incoming HTTP request.
 */
export function validateAiAuth(request: Request): AiAuthResult {
  const configuredSecret = process.env.AI_SECRET_KEY;

  if (!configuredSecret || configuredSecret.trim() === '') {
    console.error('[AI Auth Error]: AI_SECRET_KEY is not configured in environment variables.');
    return {
      authorized: false,
      status: 500,
      error: 'AI integration secret key is not configured on the server.',
    };
  }

  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');

  if (!authHeader) {
    // Also check x-api-key header as secondary fallback
    const xApiKey = request.headers.get('x-api-key');
    if (xApiKey && timingSafeEqualStr(xApiKey, configuredSecret)) {
      return { authorized: true };
    }

    return {
      authorized: false,
      status: 401,
      error: 'Missing Authorization header. Expected Bearer token format.',
    };
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return {
      authorized: false,
      status: 401,
      error: 'Invalid Authorization format. Expected: Bearer <AI_SECRET_KEY>',
    };
  }

  const providedToken = parts[1].trim();

  if (!timingSafeEqualStr(providedToken, configuredSecret)) {
    return {
      authorized: false,
      status: 401,
      error: 'Unauthorized: Invalid AI Secret Bearer token.',
    };
  }

  return { authorized: true };
}

/**
 * Guard utility for Next.js Route Handlers.
 * Returns null if authorized, or a 401/500 NextResponse if rejected.
 * 
 * @example
 * const authError = verifyAiAuth(request);
 * if (authError) return authError;
 */
export function verifyAiAuth(request: Request): NextResponse | null {
  const result = validateAiAuth(request);
  if (result.authorized) {
    return null;
  }

  return NextResponse.json(
    {
      success: false,
      error: result.error,
    },
    { status: result.status }
  );
}

/**
 * Validates the Authorization Bearer header from an incoming HTTP request.
 * Named export matching specification requirements.
 */
export const validateAiAuthHeader = validateAiAuth;

