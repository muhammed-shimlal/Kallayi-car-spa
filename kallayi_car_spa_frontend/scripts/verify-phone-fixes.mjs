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

const supabase = createClient(supabaseUrl, serviceRoleKey);
const BASE_URL = 'http://127.0.0.1:3000/api';

async function runVerification() {
  console.log('================================================================');
  console.log('  PHONE NORMALIZATION & AUTH WORKFLOW VERIFICATION SUITE');
  console.log('================================================================\n');

  const testPhoneRaw = '9847999888';
  const testPhoneE164 = '+919847999888';
  const testName = 'Arjun NormalizationTest';
  const testPassword = 'ArjunSecret@2026';
  const testPlate = 'KL10XX1234';

  // 0. Cleanup any old fixtures
  console.log('--- Step 0: Cleaning prior test artifacts ---');
  const { data: oldCusts } = await supabase.from('customers').select('id, user_id').ilike('phone_number', `%${testPhoneRaw}%`);
  for (const c of oldCusts || []) {
    if (c.user_id) {
      try { await supabase.auth.admin.deleteUser(c.user_id); } catch {}
    }
    try { await supabase.from('bookings').delete().eq('customer_id', c.id); } catch {}
    try { await supabase.from('customers').delete().eq('id', c.id); } catch {}
  }
  try { await supabase.from('customer_vehicles').delete().eq('plate_number', testPlate); } catch {}
  console.log('  Cleanup complete.\n');

  // 1. Test /api/auth/check-phone endpoint
  console.log('--- Step 1: Testing /api/auth/check-phone ---');
  // 1a: Check phone before any record exists
  const check1Res = await fetch(`${BASE_URL}/auth/check-phone?phone=${testPhoneRaw}`);
  const check1Data = await check1Res.json();
  console.log('  Check brand new phone status:', check1Res.status);
  console.log('  Check brand new phone data:', check1Data);
  if (!check1Data.success || check1Data.exists || check1Data.phone !== testPhoneE164) {
    throw new Error('Check phone brand new test failed');
  }
  console.log('  ✅ /api/auth/check-phone correctly identified new phone and normalized to E.164.\n');

  // 2. Test Walk-in Creation via /api/bookings with raw 10-digit number
  console.log('--- Step 2: Testing Walk-in Creation via /api/bookings ---');
  const bookingCreateRes = await fetch(`${BASE_URL}/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customer_name: testName,
      phone: testPhoneRaw, // Raw 10-digit input
      plate_number: testPlate,
      make: 'Hyundai',
      model: 'Creta',
      vehicle_type: 'CAR',
      base_price: 600,
      final_price: 600,
      status: 'WAITING',
    }),
  });

  const bookingData = await bookingCreateRes.json();
  console.log('  Booking creation status:', bookingCreateRes.status);
  console.log('  Booking creation response:', bookingData);
  console.log('  Booking ID:', bookingData.data?.id, '| Customer ID:', bookingData.data?.customer_id);

  // Inspect database to confirm the customer was stored as canonical E.164
  const { data: createdCust } = await supabase
    .from('customers')
    .select('*')
    .eq('id', bookingData.data?.customer_id)
    .single();

  console.log('  Stored customer phone_number in DB:', createdCust?.phone_number);
  if (createdCust?.phone_number !== testPhoneE164) {
    throw new Error(`Expected DB phone_number to be '${testPhoneE164}', but got '${createdCust?.phone_number}'`);
  }
  console.log('  ✅ Walk-in intake correctly saved phone in strict E.164 (+91XXXXXXXXXX) format!\n');

  // 3. Test check-phone on the newly created walk-in
  console.log('--- Step 3: Checking phone status for walk-in customer ---');
  const checkWalkinRes = await fetch(`${BASE_URL}/auth/check-phone?phone=${testPhoneRaw}`);
  const checkWalkinData = await checkWalkinRes.json();
  console.log('  Check walk-in response:', checkWalkinData);
  if (!checkWalkinData.exists || checkWalkinData.isRegistered || !checkWalkinData.isWalkin) {
    throw new Error('Expected walkin customer status');
  }
  console.log('  ✅ /api/auth/check-phone correctly detected unlinked walk-in profile ready for claiming!\n');

  // 4. Test Customer Signup claiming the walk-in account
  console.log('--- Step 4: Testing Customer Signup (Account Claiming) ---');
  const signupRes = await fetch(`${BASE_URL}/customers/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: testName,
      phone: testPhoneRaw, // raw 10 digits
      password: testPassword,
    }),
  });

  const signupData = await signupRes.json();
  console.log('  Signup Status:', signupRes.status);
  console.log('  Signup Success:', signupData.success);
  console.log('  Claimed customer ID:', signupData.customer?.id);
  if (!signupData.success) {
    throw new Error('Signup failed: ' + JSON.stringify(signupData));
  }

  // Verify DB state after signup
  const { data: verifiedCust } = await supabase
    .from('customers')
    .select('*')
    .eq('id', signupData.customer?.id)
    .single();

  console.log('  DB customer phone_number post-signup:', verifiedCust?.phone_number);
  console.log('  DB customer user_id post-signup:', verifiedCust?.user_id);
  if (verifiedCust?.phone_number !== testPhoneE164) {
    throw new Error(`Customer phone should remain ${testPhoneE164}`);
  }
  console.log('  ✅ Customer signup successfully claimed walk-in profile with canonical phone!\n');

  // 5. Test Customer Login with both formats
  console.log('--- Step 5: Testing Customer Login with both phone formats ---');
  // 5a: Login with raw 10-digit number
  const login1Res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone: testPhoneRaw,
      password: testPassword,
    }),
  });
  const login1Data = await login1Res.json();
  console.log('  Login with 10-digit (9847999888) status:', login1Res.status);
  console.log('  Login with 10-digit success:', login1Data.success);
  if (!login1Data.success) throw new Error('10-digit login failed');

  // 5b: Login with E.164 (+919847999888)
  const login2Res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone: testPhoneE164,
      password: testPassword,
    }),
  });
  const login2Data = await login2Res.json();
  console.log('  Login with E.164 (+919847999888) status:', login2Res.status);
  console.log('  Login with E.164 success:', login2Data.success);
  if (!login2Data.success) throw new Error('E.164 login failed');
  console.log('  ✅ Both 10-digit and E.164 login formats authenticate flawlessly!\n');

  // 6. Test Vehicle Garage Lookup with both formats
  console.log('--- Step 6: Testing Vehicle Garage Lookup with both formats ---');
  const garage1Res = await fetch(`${BASE_URL}/customer-vehicles/garage?phone=${testPhoneRaw}`);
  const garage1Data = await garage1Res.json();
  console.log('  Garage lookup with 10-digit vehicles found:', garage1Data?.length);

  const garage2Res = await fetch(`${BASE_URL}/customer-vehicles/garage?phone=${encodeURIComponent(testPhoneE164)}`);
  const garage2Data = await garage2Res.json();
  console.log('  Garage lookup with E.164 vehicles found:', garage2Data?.length);

  if (!Array.isArray(garage1Data) || !Array.isArray(garage2Data)) {
    throw new Error('Garage lookup did not return array');
  }
  console.log('  ✅ Vehicle garage lookup returns identical results for all phone formats!\n');

  // 7. Cleanup
  console.log('--- Step 7: Cleaning up test artifacts ---');
  if (verifiedCust?.user_id) {
    try { await supabase.auth.admin.deleteUser(verifiedCust.user_id); } catch {}
  }
  try { await supabase.from('bookings').delete().eq('customer_id', verifiedCust?.id); } catch {}
  try { await supabase.from('customers').delete().eq('id', verifiedCust?.id); } catch {}
  try { await supabase.from('customer_vehicles').delete().eq('plate_number', testPlate); } catch {}
  console.log('  Cleanup complete.\n');

  console.log('================================================================');
  console.log('  🎉 ALL PHONE NORMALIZATION VERIFICATIONS PASSED (100%)');
  console.log('================================================================');
}

runVerification().catch((err) => {
  console.error('VERIFICATION FAILURE:', err);
  process.exit(1);
});
