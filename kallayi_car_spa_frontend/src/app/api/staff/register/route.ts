/**
 * KALLAYI CAR SPA & AUTO CARE - STAFF REGISTRATION API ALIAS ROUTE
 * Next.js 16 Route Handler: POST /api/staff/register
 * 
 * Provides dedicated RESTful endpoint for admin staff registration with
 * GoTrue auth user provisioning and staff profile creation.
 */

import { NextRequest } from 'next/server';
import { POST as handleStaffDirectoryPost } from '../directory/route';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  return handleStaffDirectoryPost(request);
}
