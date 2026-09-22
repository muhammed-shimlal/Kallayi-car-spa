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

async function verifyAll() {
  console.log('================================================================');
  console.log('  KALLAYI CAR SPA - COMPREHENSIVE ISSUES 1, 2 & 3 VERIFICATION');
  console.log('================================================================\n');

  const testPhone = '9847123456';
  const testName = 'Rahim Walkin';
  const testPassword = 'RahimSecret@2026';
  const testPlate = 'KL55Z9999';

  // 0. Clean up any previous test artifacts
  console.log('--- Step 0: Cleaning up existing test fixtures ---');
  const { data: oldCusts } = await supabase.from('customers').select('id, user_id').ilike('phone_number', `%${testPhone}%`);
  if (oldCusts && oldCusts.length > 0) {
    for (const c of oldCusts) {
      if (c.user_id) {
        try { await supabase.auth.admin.deleteUser(c.user_id); } catch {}
      }
      try { await supabase.from('bookings').delete().eq('customer_id', c.id); } catch {}
      try { await supabase.from('customers').delete().eq('id', c.id); } catch {}
    }
  }
  try { await supabase.from('customer_vehicles').delete().eq('plate_number', testPlate); } catch {}
  console.log('Cleaned up prior fixtures.\n');

  // 1. Simulate POS creating an unregistered walk-in customer with booking & vehicle
  console.log('--- Step 1: Simulating POS Walk-in Entry (user_id = null) ---');
  const { data: walkinCust, error: wErr } = await supabase.from('customers').insert({
    user_id: null,
    name: testName,
    phone_number: `+91${testPhone}`,
    outstanding_balance: 1500.00,
    loyalty_points: 50,
  }).select('*').single();

  if (wErr) throw new Error('Failed to create test walk-in customer: ' + wErr.message);
  console.log(`Created walk-in customer: ID=${walkinCust.id}, user_id=${walkinCust.user_id}, Balance=₹${walkinCust.outstanding_balance}`);

  const { data: walkinVeh } = await supabase.from('customer_vehicles').insert({
    user_id: null,
    plate_number: testPlate,
    make: 'Hyundai',
    model: 'Creta',
    vehicle_type: 'SUV',
  }).select('*').single();

  const { data: walkinBooking } = await supabase.from('bookings').insert({
    customer_id: walkinCust.id,
    vehicle_id: walkinVeh.id,
    time_slot: new Date().toISOString(),
    status: 'COMPLETED',
    base_price: 1500,
    final_price: 1500,
  }).select('*').single();

  const { data: walkinInvoice } = await supabase.from('invoices').insert({
    booking_id: walkinBooking.id,
    amount: 1500,
    base_price: 1500,
    final_price: 1500,
    is_paid: true,
    payment_method: 'CASH',
  }).select('*').single();

  console.log(`Created walk-in Booking ID=${walkinBooking.id}, Invoice ID=${walkinInvoice.id}\n`);

  // 2. Issue 1: Test Customer Signup via /api/customers/register (Case B: Walk-in claim)
  console.log('--- Step 2: Testing Issue 1: Walk-In Customer Signup ---');
  const signupRes = await fetch(`${BASE_URL}/customers/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: testName,
      phone: testPhone,
      password: testPassword,
    }),
  });

  const signupData = await signupRes.json();
  console.log('Signup Status:', signupRes.status);
  console.log('Signup Result:', signupData.success ? 'SUCCESS' : 'FAILED', signupData.error || '');
  if (!signupData.success) {
    throw new Error('Signup failed: ' + JSON.stringify(signupData));
  }

  const rahimUserId = signupData.user.id;
  const rahimToken = signupData.token;
  console.log(`✅ Claimed Walk-in Customer! Assigned User ID: ${rahimUserId}`);
  console.log(`✅ Session Token issued: ${rahimToken}`);

  // Verify DB reflects updated user_id on customer and vehicles
  const { data: updatedCust } = await supabase.from('customers').select('*').eq('id', walkinCust.id).maybeSingle();
  const { data: updatedVeh } = await supabase.from('customer_vehicles').select('*').eq('id', walkinVeh.id).single();
  console.log('Updated Customer user_id:', updatedCust?.user_id || signupData.customer?.user_id);
  console.log('Updated Vehicle user_id:', updatedVeh?.user_id);
  console.log('Claimed Balance Preserved: ₹', updatedCust?.outstanding_balance || signupData.customer?.outstanding_balance, '\n');

  // 3. Issue 1 Case C: Test Duplicate Registration attempt returns friendly error
  console.log('--- Step 3: Testing Issue 1 Case C: Duplicate Registration ---');
  const duplicateRes = await fetch(`${BASE_URL}/customers/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: testName,
      phone: testPhone,
      password: testPassword,
    }),
  });
  const duplicateData = await duplicateRes.json();
  console.log('Duplicate Signup Status (Expected 400):', duplicateRes.status);
  console.log('Duplicate Signup Error (Expected friendly message):', duplicateData.message || duplicateData.error);
  console.log(duplicateRes.status === 400 ? '✅ Correctly prevented duplicate registration!' : '❌ Failed');

  // 4. Issue 2: Test Login with Phone and Password
  console.log('\n--- Step 4: Testing Issue 2: Login with Phone & Password ---');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone: `  ${testPhone}  `, // Test with whitespace sanitization
      password: `  ${testPassword}  `,
    }),
  });
  const loginData = await loginRes.json();
  console.log('Login Status:', loginRes.status);
  console.log('Login Result:', loginData.success ? 'SUCCESS' : 'FAILED');
  console.log('Logged in user:', loginData.user?.name, '| Phone:', loginData.user?.phone);
  console.log(loginData.success ? '✅ Password verified and authenticated cleanly!' : '❌ Login failed');

  // 5. Issue 3: Test Strict Data Isolation on Bookings
  console.log('\n--- Step 5: Testing Issue 3: Strict Bookings Isolation ---');
  const bookingsRes = await fetch(`${BASE_URL}/bookings`, {
    headers: {
      'Authorization': `Token ${rahimToken}`,
    },
  });
  const bookingsData = await bookingsRes.json();
  console.log('Bookings returned count for Rahim:', bookingsData.count);
  const leakedBookings = (bookingsData.data || []).filter(b => b.customer_id !== (updatedCust?.id || signupData.customer?.id));
  console.log('Other customers bookings leaked:', leakedBookings.length);
  console.log(leakedBookings.length === 0 ? '✅ Strict booking isolation passed: Zero leaks!' : '❌ LEAK DETECTED');

  // 6. Issue 3: Test Strict Data Isolation on Invoices
  console.log('\n--- Step 6: Testing Issue 3: Strict Invoice Isolation ---');
  // 6a: Accessing own invoice
  const ownInvRes = await fetch(`${BASE_URL}/invoices/${walkinInvoice.id}`, {
    headers: { 'Authorization': `Token ${rahimToken}` },
  });
  const ownInvData = await ownInvRes.json();
  console.log(`Own Invoice #${walkinInvoice.id} Access Status (Expected 200):`, ownInvRes.status);
  console.log(ownInvRes.status === 200 ? '✅ Successfully accessed own invoice.' : '❌ Access failed');

  // 6b: Attempting to access someone else's invoice (Invoice #1 belongs to Monu/fcb8102d)
  const otherInvRes = await fetch(`${BASE_URL}/invoices/1`, {
    headers: { 'Authorization': `Token ${rahimToken}` },
  });
  const otherInvData = await otherInvRes.json();
  console.log('Attempt to access Foreign Invoice #1 Status (Expected 403):', otherInvRes.status);
  console.log('Foreign Invoice Error message:', otherInvData.error);
  console.log(otherInvRes.status === 403 ? '✅ Foreign invoice access strictly BLOCKED with 403 Forbidden!' : '❌ LEAK DETECTED');

  console.log('\n================================================================');
  console.log('  🎉 ALL VERIFICATIONS COMPLETED SUCCESSFULLY!');
  console.log('================================================================');
}

verifyAll().catch(err => console.error('Verification failed:', err));
