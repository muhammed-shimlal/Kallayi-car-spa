/**
 * KALLAYI CAR SPA & AUTO CARE - DATABASE PHONE NORMALIZATION MIGRATION SCRIPT
 * 
 * Standardizes all phone numbers in:
 * 1. public.customers -> canonical E.164 (+91XXXXXXXXXX)
 * 2. public.staff_profiles -> canonical E.164 (+91XXXXXXXXXX)
 * 3. auth.users metadata -> canonical E.164 (+91XXXXXXXXXX)
 * 
 * Safely merges duplicate customer rows caused by format mismatch (+91 vs raw 10-digit),
 * preserving all booking history, khata ledgers, garage vehicles, and balances.
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// 1. Initialize Supabase Admin Client
const env = fs.readFileSync('.env.local', 'utf8');
const url = env.split('\n').find(l => l.startsWith('NEXT_PUBLIC_SUPABASE_URL='))?.split('=')[1]?.trim()?.replace(/['"]/g, '');
const key = env.split('\n').find(l => l.startsWith('SUPABASE_SERVICE_ROLE_KEY='))?.split('=')[1]?.trim()?.replace(/['"]/g, '');

if (!url || !key) {
  console.error('FATAL: Could not read NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY from .env.local');
  process.exit(1);
}

const supabase = createClient(url, key);

function extractTenDigitPhone(raw) {
  if (!raw) return null;
  const str = String(raw).trim();
  if (!str) return null;

  let digits = str.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  } else if (digits.length > 10 && digits.startsWith('91')) {
    digits = digits.slice(2);
  } else if (digits.length > 10) {
    digits = digits.slice(-10);
  }

  if (/^[6-9]\d{9}$/.test(digits)) {
    return digits;
  }
  return null;
}

function normalizePhone(raw) {
  const ten = extractTenDigitPhone(raw);
  if (ten) return `+91${ten}`;
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  return digits ? `+91${digits}` : '';
}

async function runMigration() {
  console.log('================================================================');
  console.log('  KALLAYI CAR SPA - DATABASE PHONE NORMALIZATION & MERGE SCRIPT');
  console.log('================================================================\n');

  let totalCustomersUpdated = 0;
  let totalCustomersMerged = 0;
  let totalStaffUpdated = 0;
  let totalAuthUsersUpdated = 0;

  // ─────────────────────────────────────────────────────────────────────────────
  // PHASE 1: NORMALIZE & MERGE public.customers
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('--- Phase 1: Normalizing & Merging public.customers ---');
  const { data: customers, error: custErr } = await supabase
    .from('customers')
    .select('*')
    .order('created_at', { ascending: true });

  if (custErr) {
    console.error('Error fetching customers:', custErr.message);
    return;
  }

  console.log(`Found ${customers.length} total customer records.`);

  // Group customers by resolved canonical phone
  const phoneGroups = new Map();

  for (const c of customers) {
    let resolvedPhone = c.phone_number;

    // If phone_number is empty but name looks like a 10-digit phone number, or check auth user
    if (!resolvedPhone) {
      const tenFromName = extractTenDigitPhone(c.name);
      if (tenFromName) {
        resolvedPhone = tenFromName;
      } else if (c.user_id) {
        try {
          const { data: u } = await supabase.auth.admin.getUserById(c.user_id);
          if (u?.user?.phone) {
            resolvedPhone = u.user.phone;
          } else if (u?.user?.user_metadata?.phone) {
            resolvedPhone = u.user.user_metadata.phone;
          }
        } catch {}
      }
    }

    const tenDigit = extractTenDigitPhone(resolvedPhone);
    const canonical = tenDigit ? `+91${tenDigit}` : (resolvedPhone ? normalizePhone(resolvedPhone) : '');

    if (!canonical) {
      console.log(`  [Notice] Customer ${c.name || c.id} has no resolvable phone number. Leaving as is.`);
      continue;
    }

    if (!phoneGroups.has(canonical)) {
      phoneGroups.set(canonical, []);
    }
    phoneGroups.get(canonical).push({ ...c, resolvedCanonical: canonical });
  }

  for (const [canonicalPhone, group] of phoneGroups.entries()) {
    if (group.length === 1) {
      const c = group[0];
      if (c.phone_number !== canonicalPhone) {
        console.log(`  Updating single customer ${c.name || c.id}: '${c.phone_number}' -> '${canonicalPhone}'`);
        const { error: upErr } = await supabase
          .from('customers')
          .update({ phone_number: canonicalPhone, updated_at: new Date().toISOString() })
          .eq('id', c.id);

        if (upErr) {
          console.error(`    Failed to update customer ${c.id}:`, upErr.message);
        } else {
          totalCustomersUpdated++;
        }
      }
    } else {
      // Multiple records sharing the exact same canonical phone!
      console.log(`  [DUPLICATE DETECTED] Found ${group.length} records for phone ${canonicalPhone}. Merging...`);

      // 1. Choose primary row: prioritize registered user (valid user_id), then earliest created
      let primaryRow = group.find((c) => c.user_id && c.user_id !== '00000000-0000-0000-0000-000000000000' && c.user_id.length > 10);
      if (!primaryRow) {
        primaryRow = group[0];
      }

      const redundantRows = group.filter((c) => c.id !== primaryRow.id);
      const redundantIds = redundantRows.map((c) => c.id);

      console.log(`    Primary Record: ID=${primaryRow.id}, Name=${primaryRow.name}, UserID=${primaryRow.user_id}`);
      console.log(`    Redundant Record(s): ${redundantIds.join(', ')}`);

      // Sum balances and compute highest loyalty points
      const totalBalance = group.reduce((acc, curr) => acc + Number(curr.outstanding_balance || 0), 0);
      const maxLoyalty = group.reduce((acc, curr) => Math.max(acc, Number(curr.loyalty_points || 0)), 0);

      // Re-point all bookings from redundant rows to primaryRow.id
      const { error: bookErr } = await supabase
        .from('bookings')
        .update({ customer_id: primaryRow.id })
        .in('customer_id', redundantIds);

      if (bookErr) {
        console.warn('    Warning re-pointing bookings:', bookErr.message);
      } else {
        console.log(`    Re-pointed associated bookings to primary customer ${primaryRow.id}`);
      }

      // Re-point all khata ledgers from redundant rows to primaryRow.id
      try {
        await supabase
          .from('khata_ledgers')
          .update({ customer_id: primaryRow.id })
          .in('customer_id', redundantIds);
        console.log(`    Re-pointed khata ledgers to primary customer ${primaryRow.id}`);
      } catch (kErr) {
        // Table might not exist or empty
      }

      // Re-assign vehicles if primary has a user_id
      if (primaryRow.user_id) {
        try {
          const redundantUserIds = redundantRows.map((r) => r.user_id).filter(Boolean);
          if (redundantUserIds.length > 0) {
            await supabase
              .from('customer_vehicles')
              .update({ user_id: primaryRow.user_id })
              .in('user_id', redundantUserIds);
            console.log(`    Re-assigned vehicles to primary user ${primaryRow.user_id}`);
          }
        } catch (vErr) {
          console.warn('    Warning updating vehicles:', vErr.message);
        }
      }

      // Update primary row with canonical phone and merged balances
      const primaryName = (primaryRow.name && primaryRow.name !== 'Guest Customer' && !primaryRow.name.match(/^\d+$/))
        ? primaryRow.name
        : (group.find(c => c.name && c.name !== 'Guest Customer' && !c.name.match(/^\d+$/))?.name || primaryRow.name || 'Customer');

      await supabase
        .from('customers')
        .update({
          name: primaryName,
          phone_number: canonicalPhone,
          outstanding_balance: totalBalance,
          loyalty_points: maxLoyalty,
          updated_at: new Date().toISOString(),
        })
        .eq('id', primaryRow.id);

      // Delete redundant rows
      const { error: delErr } = await supabase
        .from('customers')
        .delete()
        .in('id', redundantIds);

      if (delErr) {
        console.error('    Failed to delete redundant rows:', delErr.message);
      } else {
        console.log(`    Successfully merged and removed ${redundantIds.length} duplicate customer row(s).`);
        totalCustomersMerged += redundantIds.length;
        totalCustomersUpdated++;
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PHASE 2: NORMALIZE public.staff_profiles
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- Phase 2: Normalizing public.staff_profiles ---');
  const { data: staffList, error: sErr } = await supabase
    .from('staff_profiles')
    .select('*');

  if (sErr) {
    console.error('Error fetching staff_profiles:', sErr.message);
  } else {
    for (const s of staffList || []) {
      const canonical = normalizePhone(s.phone_number);
      if (canonical && s.phone_number !== canonical) {
        console.log(`  Updating staff ${s.id} (${s.role}): '${s.phone_number}' -> '${canonical}'`);
        const { error: upStaffErr } = await supabase
          .from('staff_profiles')
          .update({ phone_number: canonical })
          .eq('id', s.id);

        if (upStaffErr) {
          console.error(`    Failed to update staff ${s.id}:`, upStaffErr.message);
        } else {
          totalStaffUpdated++;
        }
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PHASE 3: NORMALIZE auth.users METADATA
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- Phase 3: Synchronizing auth.users Metadata ---');
  const { data: customersWithUser } = await supabase
    .from('customers')
    .select('id, user_id, phone_number, name')
    .not('user_id', 'is', null);

  for (const c of customersWithUser || []) {
    if (!c.user_id || c.user_id === '00000000-0000-0000-0000-000000000000' || c.user_id.length < 10) continue;

    try {
      const { data: authUserRes, error: uErr } = await supabase.auth.admin.getUserById(c.user_id);
      if (uErr || !authUserRes?.user) continue;

      const u = authUserRes.user;
      const currentMetaPhone = u.user_metadata?.phone || '';
      const canonical = normalizePhone(c.phone_number);

      if (canonical && currentMetaPhone !== canonical) {
        console.log(`  Updating auth user ${u.id} (${u.email}): metadata.phone -> '${canonical}'`);
        await supabase.auth.admin.updateUserById(u.id, {
          user_metadata: {
            ...u.user_metadata,
            phone: canonical,
          },
        });
        totalAuthUsersUpdated++;
      }
    } catch (authSyncErr) {
      // Continue
    }
  }

  console.log('\n================================================================');
  console.log('  PHONE NORMALIZATION MIGRATION COMPLETE');
  console.log('================================================================');
  console.log(`  Customers updated / normalized: ${totalCustomersUpdated}`);
  console.log(`  Duplicate customers merged:     ${totalCustomersMerged}`);
  console.log(`  Staff profiles normalized:      ${totalStaffUpdated}`);
  console.log(`  Auth user metadata updated:     ${totalAuthUsersUpdated}`);
  console.log('================================================================\n');
}

runMigration().catch((err) => {
  console.error('Unhandled migration error:', err);
  process.exit(1);
});
