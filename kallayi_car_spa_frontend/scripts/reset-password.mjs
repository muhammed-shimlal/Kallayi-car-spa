/**
 * KALLAYI CAR SPA & AUTO CARE - FAST USER PASSWORD RESET CLI
 * Usage:
 *   node scripts/reset-password.mjs <phone_or_email> <new_password>
 * Example:
 *   node scripts/reset-password.mjs 9207320065 MyNewPass@2026
 *   node scripts/reset-password.mjs admin@kallayi.com Kallayi@2026
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
let serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
      supabaseUrl = trimmed.split('=')[1].trim().replace(/['"]/g, '');
    }
    if (trimmed.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
      serviceRoleKey = trimmed.split('=')[1].trim().replace(/['"]/g, '');
    }
  }
}

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Error: Missing SUPABASE credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const args = process.argv.slice(2);
const target = args[0];
const newPassword = args[1];

if (!target || !newPassword) {
  console.log('Usage: node scripts/reset-password.mjs <phone_or_email> <new_password>');
  process.exit(1);
}

function getPhoneVariants(phone) {
  const digits = phone.replace(/\D/g, '');
  const tenDigit = digits.length >= 10 ? digits.slice(-10) : digits;
  const twelveDigit = `91${tenDigit}`;
  const e164 = `+91${tenDigit}`;
  const variants = Array.from(new Set([digits, tenDigit, twelveDigit, e164, `0${tenDigit}`]));
  return { digits, tenDigit, twelveDigit, e164, variants };
}

async function run() {
  console.log(`🔍 Searching for account matching: "${target}"...`);
  let targetUserId = null;
  let targetEmail = null;

  if (target.includes('@')) {
    targetEmail = target.toLowerCase().trim();
    try {
      const { data } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: targetEmail,
      });
      if (data?.user) {
        targetUserId = data.user.id;
      }
    } catch {}
  } else {
    const { variants, twelveDigit, tenDigit, digits, e164 } = getPhoneVariants(target);

    // 1. Check customers table
    const { data: custList } = await supabase
      .from('customers')
      .select('id, user_id, phone_number, name')
      .in('phone_number', variants);

    const regCust = (custList || []).find(
      (c) => c.user_id && c.user_id !== '00000000-0000-0000-0000-000000000000'
    );

    if (regCust) {
      targetUserId = regCust.user_id;
      console.log(`✅ Found registered customer profile: "${regCust.name}" (ID: ${regCust.id})`);
    } else {
      // Check if walk-in exists
      const walkin = (custList || [])[0];
      if (walkin) {
        console.log(`ℹ️ Found unregistered walk-in profile: "${walkin.name}" (ID: ${walkin.id}).`);
      }
    }

    // 2. Check staff_profiles
    if (!targetUserId) {
      const { data: staffList } = await supabase
        .from('staff_profiles')
        .select('user_id, role')
        .in('phone_number', variants);

      if (staffList && staffList.length > 0 && staffList[0].user_id) {
        targetUserId = staffList[0].user_id;
        console.log(`✅ Found staff profile with role: ${staffList[0].role}`);
      }
    }

    // 3. Check candidate virtual emails
    if (!targetUserId) {
      const candidateEmails = [
        `${twelveDigit}@kallayi.internal`,
        `${tenDigit}@kallayi.internal`,
        `${digits}@kallayi.internal`,
      ];
      for (const vEmail of candidateEmails) {
        if (targetUserId) break;
        try {
          const { data } = await supabase.auth.admin.generateLink({
            type: 'magiclink',
            email: vEmail,
          });
          if (data?.user) {
            targetUserId = data.user.id;
            targetEmail = data.user.email;
          }
        } catch {}
      }
    }
  }

  if (!targetUserId) {
    console.error(`❌ No registered user found for: ${target}`);
    process.exit(1);
  }

  console.log(`🚀 Resetting password for User ID: ${targetUserId}...`);

  const { data: updated, error: updateErr } = await supabase.auth.admin.updateUserById(
    targetUserId,
    {
      password: newPassword,
      user_metadata: {
        password_reset_at: new Date().toISOString(),
        django_password: null,
      },
    }
  );

  if (updateErr) {
    console.error(`❌ Failed to update password:`, updateErr.message);
    process.exit(1);
  }

  console.log(`🎉 Password successfully reset for ${updated?.user?.email || target}!`);
  console.log(`🔑 You can now log in immediately with:`);
  console.log(`   Identifier: ${target}`);
  console.log(`   Password:   ${newPassword}`);
}

run();
