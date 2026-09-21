/**
 * KALLAYI CAR SPA & AUTO CARE - TIME SLOT AVAILABILITY API
 * Next.js 16 Route Handler: GET /api/bookings/available_slots
 * Generates 1-hour interval operating slots (09:00 AM - 07:00 PM)
 * Validates against past local times & existing active/pending Supabase bookings.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseServer';

// Standard 1-Hour Interval Operating Hours (09:00 AM to 07:00 PM)
const DAILY_HOURLY_SLOTS = [
  '09:00 AM',
  '10:00 AM',
  '11:00 AM',
  '12:00 PM',
  '01:00 PM',
  '02:00 PM',
  '03:00 PM',
  '04:00 PM',
  '05:00 PM',
  '06:00 PM',
  '07:00 PM',
];

interface SlotStatus {
  time: string;
  is_available: boolean;
  is_booked?: boolean;
  is_past?: boolean;
  reason?: 'PAST' | 'BOOKED' | null;
}

/**
 * Parses a slot string like "05:00 PM" into 24-hour { hours, minutes }
 */
function parseSlotHourMinute(timeStr: string): { hour: number; minute: number } {
  const parts = timeStr.trim().split(' ');
  const [hStr, mStr] = parts[0].split(':');
  let hour = parseInt(hStr, 10);
  const minute = parseInt(mStr || '0', 10);
  const meridiem = (parts[1] || '').toUpperCase();

  if (meridiem === 'PM' && hour !== 12) hour += 12;
  if (meridiem === 'AM' && hour === 12) hour = 0;

  return { hour, minute };
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);

    // Get date parameter (default to current date in YYYY-MM-DD)
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const requestedDate = searchParams.get('date') || todayStr;

    // 1. Fetch all active/pending bookings for the specified date
    // Buffer window to safely encompass timezone variations
    const queryStart = `${requestedDate}T00:00:00.000Z`;
    const queryEnd = `${requestedDate}T23:59:59.999Z`;

    const { data: existingBookings, error: bookingsErr } = await supabase
      .from('bookings')
      .select('id, time_slot, end_time, status, service_package:service_packages(duration_minutes)')
      .gte('time_slot', `${requestedDate}T00:00:00-12:00`)
      .lte('time_slot', `${requestedDate}T23:59:59+12:00`)
      .neq('status', 'CANCELLED');

    if (bookingsErr) {
      console.warn('[Available Slots] Booking fetch warning:', bookingsErr.message);
    }

    const activeBookings = existingBookings || [];

    // 2. Parse target date components
    const [targetYear, targetMonth, targetDay] = requestedDate.split('-').map(Number);
    const isTargetToday = requestedDate === todayStr;

    // 3. Evaluate each 1-hour slot
    const slots: SlotStatus[] = DAILY_HOURLY_SLOTS.map((slotTime) => {
      const { hour: slotHour, minute: slotMinute } = parseSlotHourMinute(slotTime);

      // Construct Date for this slot
      const slotDate = new Date(targetYear, targetMonth - 1, targetDay, slotHour, slotMinute, 0);

      // Condition 1: Check if slot is in the past
      let isPast = false;
      if (requestedDate < todayStr) {
        isPast = true;
      } else if (isTargetToday) {
        // Compare with current moment
        isPast = slotDate.getTime() <= now.getTime();
      }

      if (isPast) {
        return {
          time: slotTime,
          is_available: false,
          is_past: true,
          is_booked: false,
          reason: 'PAST',
        };
      }

      // Condition 2: Check if slot is occupied by an active booking
      const isOccupied = activeBookings.some((b) => {
        if (!b.time_slot) return false;
        const bTime = new Date(b.time_slot);

        // Check if booking is on the same calendar day
        const bDateStr = bTime.toISOString().split('T')[0];
        const bLocalY = bTime.getFullYear();
        const bLocalM = bTime.getMonth() + 1;
        const bLocalD = bTime.getDate();
        const formattedBDate = `${bLocalY}-${String(bLocalM).padStart(2, '0')}-${String(bLocalD).padStart(2, '0')}`;

        const isSameDay = bDateStr === requestedDate || formattedBDate === requestedDate;
        if (!isSameDay) return false;

        // Check hour match (local or UTC)
        const bHourLocal = bTime.getHours();
        const bMinuteLocal = bTime.getMinutes();
        const bHourUTC = bTime.getUTCHours();

        // Exact slot hour match or overlapping within 60 min wash duration
        const bTimeMs = bTime.getTime();
        const slotTimeMs = slotDate.getTime();
        const slotEndMs = slotTimeMs + 60 * 60 * 1000; // 1-hour slot window

        // A slot is occupied if booking start falls in this hour slot
        const isExactHourMatch = bHourLocal === slotHour || bHourUTC === slotHour;
        const isTimeWindowOverlap = Math.abs(bTimeMs - slotTimeMs) < 45 * 60 * 1000; // Within 45 mins

        return isExactHourMatch || isTimeWindowOverlap;
      });

      if (isOccupied) {
        return {
          time: slotTime,
          is_available: false,
          is_past: false,
          is_booked: true,
          reason: 'BOOKED',
        };
      }

      return {
        time: slotTime,
        is_available: true,
        is_past: false,
        is_booked: false,
        reason: null,
      };
    });

    return NextResponse.json({
      success: true,
      date: requestedDate,
      interval: '1_HOUR',
      total_slots: slots.length,
      available_slots_count: slots.filter((s) => s.is_available).length,
      slots,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message, slots: [] }, { status: 500 });
  }
}
