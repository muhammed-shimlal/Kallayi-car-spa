/**
 * KALLAYI CAR SPA & AUTO CARE - CUSTOMER NAMES BACKFILL SCRIPT
 * Populates missing, placeholder, or phone-digit customer names in `public.customers`
 * using the authentic `raw_user_meta_data` from `auth.users`.
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const envPath = path.resolve('.env.local');
const env = fs.readFileSync(envPath, 'utf8');
const url = env.split('\n').find(l => l.startsWith('NEXT_PUBLIC_SUPABASE_URL='))?.split('=')[1]?.trim()?.replace(/['"]/g, '');
const key = env.split('\n').find(l => l.startsWith('SUPABASE_SERVICE_ROLE_KEY='))?.split('=')[1]?.trim()?.replace(/['"]/g, '');

if (!url || !key) {
  console.error('FATAL: Could not read NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, key);

async function backfillCustomerNames() {
  console.log('===============================================================');
  console.log('  STARTING CUSTOMER NAMES BACKFILL FROM AUTH.USERS METADATA');
  console.log('===============================================================\n');

  const { data: allCustomers, error: custErr } = await supabase
    .from('customers')
    .select('*');

  if (custErr) {
    console.error('Failed to fetch customers:', custErr);
    process.exit(1);
  }

  console.log(`Found ${allCustomers.length} total customer records in public.customers.`);

  let updatedCount = 0;
  let alreadyCleanCount = 0;
  let unlinkedCount = 0;

  for (const customer of allCustomers) {
    let realName = null;
    let authUser = null;

    // 1. Try resolving via user_id
    if (customer.user_id && customer.user_id.length > 10 && customer.user_id !== 'd0000000-0000-0000-0000-000000000001') {
      try {
        const { data: userData } = await supabase.auth.admin.getUserById(customer.user_id);
        authUser = userData?.user;
      } catch (e) {
        console.warn(`Could not get user for ID ${customer.user_id}:`, e.message);
      }
    }

    if (authUser?.user_metadata) {
      const meta = authUser.user_metadata;
      realName = (meta.full_name || meta.name || meta.first_name || '').trim();
    }

    const currentName = String(customer.name || '').trim();
    const isPlaceholderOrPhone =
      !currentName ||
      currentName === 'Guest Customer' ||
      currentName === 'Valued Customer' ||
      /^[0-9+ \-]+$/.test(currentName);

    if (realName && !/^[0-9+ \-]+$/.test(realName)) {
      if (isPlaceholderOrPhone || currentName !== realName) {
        console.log(`Updating Customer [${customer.id}]: "${currentName}" -> "${realName}" (Phone: ${customer.phone_number})`);
        const { error: updateErr } = await supabase
          .from('customers')
          .update({
            name: realName,
            updated_at: new Date().toISOString(),
          })
          .eq('id', customer.id);

        if (updateErr) {
          console.error(`  ❌ Update failed for ${customer.id}:`, updateErr.message);
        } else {
          updatedCount++;
        }
      } else {
        alreadyCleanCount++;
      }
    } else {
      if (!customer.user_id) {
        unlinkedCount++;
      } else {
        alreadyCleanCount++;
      }
    }
  }

  console.log('\n===============================================================');
  console.log(`✅ BACKFILL COMPLETED:`);
  console.log(`   - Customers Updated: ${updatedCount}`);
  console.log(`   - Customers Already Valid: ${alreadyCleanCount}`);
  console.log(`   - Unlinked Walk-in Records: ${unlinkedCount}`);
  console.log('===============================================================');
}

backfillCustomerNames().catch(err => {
  console.error('Backfill error:', err);
  process.exit(1);
});
