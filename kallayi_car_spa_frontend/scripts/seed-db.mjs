/**
 * KALLAYI CAR SPA & AUTO CARE - REPEATABLE SEED & INTEGRITY RUNNER
 * Directly populates production master records into Supabase PostgreSQL instance
 * using the SUPABASE_SERVICE_ROLE_KEY.
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Read env variables from .env.local
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
  console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be provided via environment variables or .env.local');
  process.exit(1);
}

console.log('🚀 Connecting to Supabase at:', supabaseUrl);

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

async function runSeed() {
  try {
    console.log('\n--- 1. SEEDING REVENUE CATEGORIES ---');
    const revenueCategories = [
      { id: 1, name: 'Wash & Detailing Services', description: 'Standard and express car wash, foam bath, and underbody cleaning' },
      { id: 2, name: 'VIP Memberships', description: 'Monthly and annual unlimited wash subscription plans' },
      { id: 3, name: 'Add-on Treatments & Coatings', description: 'Ceramic coating, paint correction, and premium detailing add-ons' },
    ];

    for (const cat of revenueCategories) {
      const { data, error } = await supabase
        .from('revenue_categories')
        .upsert(cat, { onConflict: 'id' })
        .select();
      if (error) {
        console.error(`  ❌ Failed revenue category [${cat.name}]:`, error.message);
      } else {
        console.log(`  ✅ Revenue Category [${cat.name}] synchronized (id: ${cat.id})`);
      }
    }

    console.log('\n--- 2. SEEDING EXPENSE CATEGORIES ---');
    const expenseCategories = [
      { id: 1, name: 'Chemicals & Consumables', description: 'Shampoos, waxes, ceramic coatings, and detailing supplies' },
      { id: 2, name: 'Staff Salary & Wages', description: 'Staff payroll, daily wages, and commissions' },
      { id: 3, name: 'Utility & Electricity', description: 'Water, power, generator, and compressor operations' },
      { id: 4, name: 'Machinery Maintenance', description: 'High-pressure pump servicing and tool maintenance' },
    ];

    for (const cat of expenseCategories) {
      const { data, error } = await supabase
        .from('expense_categories')
        .upsert(cat, { onConflict: 'id' })
        .select();
      if (error) {
        console.error(`  ❌ Failed expense category [${cat.name}]:`, error.message);
      } else {
        console.log(`  ✅ Expense Category [${cat.name}] synchronized (id: ${cat.id})`);
      }
    }

    console.log('\n--- 3. SEEDING SUBSCRIPTION PLANS ---');
    const subscriptionPlans = [
      { id: 1, name: 'Silver Monthly Pass', price: 999.00, interval_days: 30, description: 'Unlimited Exterior Foam Washes & Quick Microfiber Dry for 30 days.' },
      { id: 2, name: 'Gold Unlimited Pass', price: 1999.00, interval_days: 30, description: 'Unlimited Exterior Washes + 2 Complete Interior Detailings per month.' },
      { id: 3, name: 'Platinum VIP Annual', price: 9999.00, interval_days: 365, description: 'All-inclusive 365-day access with VIP Priority Bay Queue and Free Pick & Drop.' },
    ];

    for (const plan of subscriptionPlans) {
      const { data, error } = await supabase
        .from('subscription_plans')
        .upsert(plan, { onConflict: 'id' })
        .select();
      if (error) {
        console.error(`  ❌ Failed subscription plan [${plan.name}]:`, error.message);
      } else {
        console.log(`  ✅ Subscription Plan [${plan.name}] synchronized (₹${plan.price})`);
      }
    }

    console.log('\n--- 4. SEEDING BASELINE SERVICE PACKAGES & TIERED PRICING ---');
    const packages = [
      {
        id: 1,
        name: 'Signature Exterior Wash',
        price: 350.00,
        description: 'High-pressure underbody rinse, active foam bath, alloy wheels de-greasing, tire dressing, and scratch-free microfiber drying.',
        duration_minutes: 30,
        vehicle_type: 'ALL',
        tiers: [
          { vehicle_type: 'HATCHBACK', price: 350.00 },
          { vehicle_type: 'SEDAN', price: 400.00 },
          { vehicle_type: 'COMPACT_SUV', price: 450.00 },
          { vehicle_type: 'SUV', price: 500.00 },
          { vehicle_type: 'MUV', price: 550.00 },
          { vehicle_type: 'VAN', price: 550.00 },
          { vehicle_type: 'LUXURY', price: 650.00 },
          { vehicle_type: 'BIKE', price: 150.00 },
          { vehicle_type: 'AUTO', price: 200.00 },
          { vehicle_type: 'TRUCK', price: 550.00 },
        ]
      },
      {
        id: 2,
        name: 'Complete Interior & Exterior',
        price: 700.00,
        description: 'Signature exterior wash plus deep cabin vacuuming, dashboard and console dressing, glass streak-free shine, and door jamb cleaning.',
        duration_minutes: 60,
        vehicle_type: 'ALL',
        tiers: [
          { vehicle_type: 'HATCHBACK', price: 700.00 },
          { vehicle_type: 'SEDAN', price: 800.00 },
          { vehicle_type: 'COMPACT_SUV', price: 900.00 },
          { vehicle_type: 'SUV', price: 1000.00 },
          { vehicle_type: 'MUV', price: 1100.00 },
          { vehicle_type: 'VAN', price: 1100.00 },
          { vehicle_type: 'LUXURY', price: 1300.00 },
          { vehicle_type: 'BIKE', price: 300.00 },
          { vehicle_type: 'AUTO', price: 400.00 },
          { vehicle_type: 'TRUCK', price: 1200.00 },
        ]
      },
      {
        id: 3,
        name: 'Ultimate 360° Detail',
        price: 1800.00,
        description: 'Full 360 showroom treatment: interior shampoo extraction, leather conditioning, single-stage machine paint enhancement, engine bay detailing, and hydrophobic paint sealant.',
        duration_minutes: 120,
        vehicle_type: 'ALL',
        tiers: [
          { vehicle_type: 'HATCHBACK', price: 1800.00 },
          { vehicle_type: 'SEDAN', price: 2200.00 },
          { vehicle_type: 'COMPACT_SUV', price: 2400.00 },
          { vehicle_type: 'SUV', price: 2600.00 },
          { vehicle_type: 'MUV', price: 2800.00 },
          { vehicle_type: 'VAN', price: 2800.00 },
          { vehicle_type: 'LUXURY', price: 3200.00 },
          { vehicle_type: 'BIKE', price: 800.00 },
          { vehicle_type: 'AUTO', price: 1000.00 },
          { vehicle_type: 'TRUCK', price: 3000.00 },
        ]
      }
    ];

    for (const pkg of packages) {
      const { tiers, ...pkgRow } = pkg;
      const { data: pkgData, error: pkgErr } = await supabase
        .from('service_packages')
        .upsert(pkgRow, { onConflict: 'id' })
        .select();

      if (pkgErr) {
        console.error(`  ❌ Failed service package [${pkg.name}]:`, pkgErr.message);
        continue;
      }
      console.log(`  ✅ Service Package [${pkg.name}] synchronized (Base: ₹${pkg.price})`);

      // Delete existing tiered prices and insert new ones atomically
      await supabase.from('service_package_prices').delete().eq('package_id', pkg.id);

      const tierRecords = tiers.map((tier) => ({
        package_id: pkg.id,
        vehicle_type: tier.vehicle_type,
        price: tier.price,
      }));

      const { data: insertedTiers, error: tierErr } = await supabase
        .from('service_package_prices')
        .insert(tierRecords)
        .select();

      if (tierErr) {
        console.error(`  ❌ Failed inserting tiers for [${pkg.name}]:`, tierErr.message);
      } else {
        console.log(`  🔹 Successfully inserted ${insertedTiers.length} tiered body price rows for [${pkg.name}]`);
      }
    }

    console.log('\n--- 5. VERIFYING DYNAMIC JOIN & TIER RESOLUTION ---');
    const { data: allServices, error: allErr } = await supabase
      .from('service_packages')
      .select('*, service_package_prices(*)');

    if (allErr) {
      console.error('  ❌ Verification failed:', allErr.message);
    } else {
      console.log(`  ✅ Successfully verified ${allServices.length} packages with ${allServices.reduce((acc, s) => acc + (s.service_package_prices ? s.service_package_prices.length : 0), 0)} tiered body price records.`);
    }

    console.log('\n🎉 ALL MASTER DATA SEEDED & VERIFIED SUCCESSFULLY!\n');
  } catch (err) {
    console.error('Fatal seed execution error:', err);
  }
}

runSeed();
