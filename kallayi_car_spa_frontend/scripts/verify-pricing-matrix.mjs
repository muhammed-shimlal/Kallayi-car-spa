import assert from 'node:assert';
import { getVehicleBodyType, normalizeVehicleType, getVehicleTypeLabel } from '../src/lib/vehicleCatalog.ts';

const BASE_URL = 'http://127.0.0.1:3000/api';

async function runVerification() {
  console.log('===============================================================');
  console.log(' CANONICAL VEHICLE MATRIX & PRICING VERIFICATION SUITE');
  console.log('===============================================================\n');

  // --------------------------------------------------------------------------
  // TEST 1: Vehicle Auto-Categorization & Normalization Utility
  // --------------------------------------------------------------------------
  console.log('--- TEST 1: Vehicle Auto-Categorization & Normalization ---');

  const modelChecks = [
    { query: 'Maruti Suzuki Swift', expected: 'HATCHBACK' },
    { query: 'Honda City', expected: 'SEDAN' },
    { query: 'Hyundai Venue', expected: 'COMPACT_SUV' },
    { query: 'Hyundai Creta', expected: 'SUV' },
    { query: 'Mahindra Scorpio', expected: 'SUV' },
    { query: 'Toyota Innova Crysta', expected: 'MUV' },
    { query: 'Renault Lodgy', expected: 'MUV' },
    { query: 'Kia Carens', expected: 'MUV' },
    { query: 'BMW 7 Series', expected: 'LUXURY' },
    { query: 'Maruti Omni', expected: 'VAN' },
    { query: 'Maruti Eeco', expected: 'VAN' },
    // Two-Wheelers
    { query: 'Royal Enfield Classic 350', expected: 'BIKE' },
    { query: 'Honda Activa', expected: 'BIKE' },
    { query: 'Hero Splendor', expected: 'BIKE' },
    { query: 'Bajaj Pulsar', expected: 'BIKE' },
    { query: 'TVS Jupiter', expected: 'BIKE' },
    { query: 'Suzuki Access', expected: 'BIKE' },
    { query: 'Bullet', expected: 'BIKE' },
    // Auto-rickshaws
    { query: 'Bajaj RE', expected: 'AUTO' },
    { query: 'RE Compact', expected: 'AUTO' },
    { query: 'Piaggio Ape', expected: 'AUTO' },
    { query: 'Mahindra Alfa', expected: 'AUTO' },
    { query: 'Mahindra Treo', expected: 'AUTO' },
    { query: 'Auto-rickshaw', expected: 'AUTO' },
    { query: '3-Wheeler', expected: 'AUTO' },
    { query: 'Rickshaw', expected: 'AUTO' },
    { query: 'Bajaj', expected: 'AUTO' },
    { query: 'Ape', expected: 'AUTO' },
    { query: 'Alfa', expected: 'AUTO' },
    { query: 'Piaggio', expected: 'AUTO' },
  ];

  for (const item of modelChecks) {
    const resolved = getVehicleBodyType(item.query);
    console.log(`  Model "${item.query}" -> Resolved: "${resolved}" (Expected: "${item.expected}")`);
    assert.strictEqual(resolved, item.expected, `Mismatch for model query: ${item.query}`);
  }

  const normalizations = [
    { input: 'AUTO', expected: 'AUTO' },
    { input: 'AUTORICKSHAW', expected: 'AUTO' },
    { input: 'Auto-rickshaw', expected: 'AUTO' },
    { input: '3-Wheeler', expected: 'AUTO' },
    { input: 'THREE_WHEELER', expected: 'AUTO' },
    { input: 'BIKE', expected: 'BIKE' },
    { input: 'TWO_WHEELER', expected: 'BIKE' },
    { input: 'Two-Wheeler', expected: 'BIKE' },
    { input: 'FULL_SUV', expected: 'SUV' },
    { input: 'full_suv', expected: 'SUV' },
    { input: 'SUV', expected: 'SUV' },
    { input: 'MUV', expected: 'MUV' },
    { input: 'VAN', expected: 'VAN' },
    { input: 'HATCHBACK', expected: 'HATCHBACK' },
    { input: 'sedan', expected: 'SEDAN' },
    { input: 'COMPACT_SUV', expected: 'COMPACT_SUV' },
    { input: 'unknown_type', expected: 'HATCHBACK' },
  ];

  for (const item of normalizations) {
    const norm = normalizeVehicleType(item.input);
    console.log(`  Normalize "${item.input}" -> "${norm}" (Expected: "${item.expected}")`);
    assert.strictEqual(norm, item.expected, `Normalization mismatch for: ${item.input}`);
  }

  const labelMeta = getVehicleTypeLabel('AUTO');
  assert.strictEqual(labelMeta.icon, '🛺');
  console.log('  [PASS] Vehicle Catalog & Normalization tests passed perfectly!\n');

  // --------------------------------------------------------------------------
  // TEST 2: Role-Based Access Control & Admin Login
  // --------------------------------------------------------------------------
  console.log('--- TEST 2: Admin Endpoint RBAC & Auth Security ---');

  const unauthRes = await fetch(`${BASE_URL}/admin/services`, { method: 'GET' });
  assert.strictEqual(unauthRes.status, 401, 'Unauthenticated request must return 401');

  const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone: '9876543210',
      password: 'Kallayi@2026',
    }),
  });
  assert.strictEqual(adminLoginRes.status, 200, 'Admin login failed');
  const loginData = await adminLoginRes.json();
  assert.strictEqual(loginData.user.role, 'ADMIN', 'Must be ADMIN role');
  const adminToken = loginData.token;
  console.log('  Admin session token successfully acquired for testing.');
  console.log('  [PASS] RBAC & security assertions passed!\n');

  // --------------------------------------------------------------------------
  // TEST 3: Admin Multi-Tier Service Creation With All Canonical Categories
  // --------------------------------------------------------------------------
  console.log('--- TEST 3: Admin Transactional Multi-Tier Service Creation ---');

  const testPayload = {
    name: 'Full Canonical Matrix Test Wash ' + Date.now(),
    description: 'Dynamic pricing wash with all 9 canonical body types',
    base_price: 500, // Generic flat fallback
    is_active: true,
    tiers: [
      { vehicle_type: 'HATCHBACK', price: 380, estimated_duration: 35 },
      { vehicle_type: 'SEDAN', price: 480, estimated_duration: 45 },
      { vehicle_type: 'COMPACT_SUV', price: 580, estimated_duration: 50 },
      { vehicle_type: 'SUV', price: 720, estimated_duration: 65 },
      { vehicle_type: 'MUV', price: 680, estimated_duration: 60 },
      { vehicle_type: 'LUXURY', price: 1050, estimated_duration: 85 },
      { vehicle_type: 'BIKE', price: 220, estimated_duration: 25 },
      { vehicle_type: 'AUTO', price: 350, estimated_duration: 30 }, // User specific AUTO tier!
      { vehicle_type: 'VAN', price: 620, estimated_duration: 55 },
    ],
  };

  const createRes = await fetch(`${BASE_URL}/admin/services`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify(testPayload),
  });

  const createdBody = await createRes.json();
  assert.strictEqual(createRes.status, 201, `Failed to create service: ${createRes.status}`);
  assert.strictEqual(createdBody.success, true);
  const createdService = createdBody.data;
  const testServiceId = createdService.id;
  console.log(`  Created test service ID: ${testServiceId}, Name: "${createdService.name}"`);
  console.log(`  Tiers created count: ${createdService.tiers?.length || 0}`);
  assert.ok(createdService.tiers && createdService.tiers.length >= 9, 'All canonical tiers must be persisted');
  console.log('  [PASS] Multi-tier service creation succeeded!\n');

  // --------------------------------------------------------------------------
  // TEST 4: Elimination of Base Price Fallback & Strict Dynamic Resolution
  // --------------------------------------------------------------------------
  console.log('--- TEST 4: Strict Dynamic Tier Price Resolution (0% Base Price Fallback) ---');

  const tierTestCases = [
    { type: 'AUTO', expectedPrice: 350 }, // User Bug Check: must be 350, NOT 500!
    { type: 'Auto-rickshaw', expectedPrice: 350 }, // Normalized alias
    { type: 'AUTORICKSHAW', expectedPrice: 350 }, // Normalized alias
    { type: '3-Wheeler', expectedPrice: 350 }, // Normalized alias
    { type: 'BIKE', expectedPrice: 220 },
    { type: 'TWO_WHEELER', expectedPrice: 220 }, // Normalized alias
    { type: 'Two-Wheeler', expectedPrice: 220 }, // Normalized alias
    { type: 'HATCHBACK', expectedPrice: 380 },
    { type: 'SEDAN', expectedPrice: 480 },
    { type: 'COMPACT_SUV', expectedPrice: 580 },
    { type: 'SUV', expectedPrice: 720 },
    { type: 'FULL_SUV', expectedPrice: 720 }, // Normalized alias
    { type: 'MUV', expectedPrice: 680 },
    { type: 'VAN', expectedPrice: 620 },
    { type: 'LUXURY', expectedPrice: 1050 },
  ];

  for (const tc of tierTestCases) {
    const res = await fetch(`${BASE_URL}/services?vehicle_type=${encodeURIComponent(tc.type)}`, {
      headers: { 'Cache-Control': 'no-cache' },
    });
    assert.strictEqual(res.status, 200, `Failed GET /api/services for vehicle_type=${tc.type}`);
    const body = await res.json();
    const servicesList = body.data || body;
    const match = servicesList.find((s) => s.id === testServiceId);

    assert.ok(match, `Created service ID ${testServiceId} not found in catalog query for ${tc.type}`);
    console.log(`  Query vehicle_type="${tc.type}" -> Resolved Price: ₹${match.price} (Expected: ₹${tc.expectedPrice}, Base Price: ₹${match.base_price})`);
    
    // Strict assertion: Resolved price MUST equal configured tier price
    assert.strictEqual(Number(match.price), tc.expectedPrice, `Price mismatch for vehicle_type ${tc.type}`);
    assert.strictEqual(Number(match.final_price), tc.expectedPrice, `Final price mismatch for vehicle_type ${tc.type}`);
    assert.strictEqual(Number(match.resolved_price), tc.expectedPrice, `Resolved price mismatch for vehicle_type ${tc.type}`);
    
    // Explicit verification that it did NOT fall back to base_price (500)
    if (tc.expectedPrice !== 500) {
      assert.notStrictEqual(Number(match.price), 500, `Silent fallback bug detected! ₹500 base price returned for ${tc.type}`);
    }
  }

  // Also query individual service by ID with vehicle_type=AUTO
  const singleAutoRes = await fetch(`${BASE_URL}/services/${testServiceId}?vehicle_type=AUTO`);
  assert.strictEqual(singleAutoRes.status, 200, 'Single service query must succeed');
  const singleAutoBody = await singleAutoRes.json();
  assert.strictEqual(Number(singleAutoBody.price), 350, 'Single service AUTO price must strictly be ₹350');
  assert.strictEqual(singleAutoBody.tier_configured, true);
  console.log(`  GET /api/services/${testServiceId}?vehicle_type=AUTO -> Price: ₹${singleAutoBody.price}`);
  console.log('  [PASS] Zero base price fallback verified across all canonical categories!\n');

  // --------------------------------------------------------------------------
  // TEST 5: Missing Tier Protection (Explicit Error & Inapplicability)
  // --------------------------------------------------------------------------
  console.log('--- TEST 5: Protection Against Unconfigured Tiers (No Arbitrary Fallbacks) ---');

  // Create a restricted service configured ONLY for HATCHBACK
  const restrictedPayload = {
    name: 'Hatchback Only Special Wash ' + Date.now(),
    description: 'Service with only HATCHBACK configured',
    base_price: 300,
    is_active: true,
    tiers: [
      { vehicle_type: 'HATCHBACK', price: 280, estimated_duration: 30 },
    ],
  };

  const restrictedCreateRes = await fetch(`${BASE_URL}/admin/services`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify(restrictedPayload),
  });
  const restrictedCreated = await restrictedCreateRes.json();
  const restrictedId = restrictedCreated.data.id;

  // 1. Querying customer catalog for AUTO must exclude this service because AUTO tier is not configured
  const autoCatalogRes = await fetch(`${BASE_URL}/services?vehicle_type=AUTO`);
  const autoCatalogBody = await autoCatalogRes.json();
  const autoServices = autoCatalogBody.data || autoCatalogBody;
  const restrictedFound = autoServices.find((s) => s.id === restrictedId);
  assert.strictEqual(restrictedFound, undefined, 'Service without AUTO tier must NOT be shown to AUTO customer');
  console.log('  Verified: Services with unconfigured vehicle tiers are safely excluded from customer catalog.');

  // 2. Querying specific service endpoint for unconfigured tier returns 400 error instead of substituting base_price
  const unconfiguredRes = await fetch(`${BASE_URL}/services/${restrictedId}?vehicle_type=AUTO`);
  assert.strictEqual(unconfiguredRes.status, 400, 'Querying unconfigured tier must return 400');
  const unconfiguredBody = await unconfiguredRes.json();
  assert.strictEqual(unconfiguredBody.tier_configured, false);
  console.log(`  GET /api/services/${restrictedId}?vehicle_type=AUTO -> Rejected with 400: "${unconfiguredBody.error}"`);
  console.log('  [PASS] Protection against silent fallbacks on missing tiers verified!\n');

  // Clean up restricted test service
  await fetch(`${BASE_URL}/admin/services?id=${restrictedId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  // --------------------------------------------------------------------------
  // TEST 6: Auto-Rickshaw Booking Flow Price Enforcement (POST /api/bookings)
  // --------------------------------------------------------------------------
  console.log('--- TEST 6: Auto-Rickshaw Booking Flow Price Enforcement ---');

  // 1. Create/register an Auto-Rickshaw customer vehicle
  const autoVehPayload = {
    make: 'Bajaj',
    model: 'RE Compact',
    plate_number: 'KL-11-AUTO-' + Math.floor(1000 + Math.random() * 9000),
    vehicle_type: 'AUTO',
  };

  const vehRes = await fetch(`${BASE_URL}/customer-vehicles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify(autoVehPayload),
  });
  const vehData = await vehRes.json();
  const autoVehicle = vehData.vehicle || vehData.data;
  assert.ok(autoVehicle?.id, 'Auto vehicle registration failed');
  console.log(`  Registered Auto vehicle ID: ${autoVehicle.id}, Plate: ${autoVehicle.plate_number}, Type: ${autoVehicle.vehicle_type}`);

  // 2. Create booking for this Auto vehicle using testServiceId (Base: 500, AUTO tier: 350)
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const bookingPayload = {
    vehicle_id: autoVehicle.id,
    service_package_id: testServiceId,
    time_slot: tomorrow,
    // Note: No final_price sent - system must strictly resolve ₹350 from AUTO tier!
  };

  const bookRes = await fetch(`${BASE_URL}/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify(bookingPayload),
  });

  const bookData = await bookRes.json();
  assert.ok([200, 201].includes(bookRes.status), `Booking creation failed: ${JSON.stringify(bookData)}`);
  const booking = bookData.booking || bookData.data;
  assert.ok(booking?.id, 'Booking missing ID');
  console.log(`  Created Booking ID: ${booking.id}`);
  console.log(`  Booking Final Price: ₹${booking.final_price} (Expected: ₹350)`);
  console.log(`  Booking Base Price: ₹${booking.base_price} (Expected: ₹350)`);
  console.log(`  Booking Discount: ₹${booking.discount_amount} (Expected: ₹0)`);

  // Crucial assertions:
  assert.strictEqual(Number(booking.final_price), 350, 'Booking final price must strictly be ₹350 for AUTO!');
  assert.strictEqual(Number(booking.base_price), 350, 'Booking base price must strictly be ₹350 for AUTO!');
  assert.strictEqual(Number(booking.discount_amount), 0, 'No discount should be generated between base and tier price!');
  console.log('  [PASS] Auto-rickshaw booking strictly yielded ₹350 tier price with 0% fallback to ₹500 base price!\n');

  // --------------------------------------------------------------------------
  // TEST 7: Cleanup Test Service
  // --------------------------------------------------------------------------
  console.log('--- TEST 7: Cleanup Test Service (DELETE) ---');
  const deleteRes = await fetch(`${BASE_URL}/admin/services?id=${testServiceId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.strictEqual(deleteRes.status, 200, 'Delete must succeed');

  const finalCheckRes = await fetch(`${BASE_URL}/services`);
  const finalCheckData = await finalCheckRes.json();
  const finalList = finalCheckData.data || finalCheckData;
  const stillExists = finalList.find((s) => s.id === testServiceId);
  assert.strictEqual(stillExists, undefined, 'Deleted service must not exist in catalog');
  console.log('  Cleaned up test service cleanly.');
  console.log('  [PASS] Cleanup completed successfully!\n');

  console.log('===============================================================');
  console.log(' ALL 7 PRICING MATRIX & CANONICAL VERIFICATIONS PASSED (100%)!');
  console.log('===============================================================');
}

runVerification().catch((err) => {
  console.error('\n❌ VERIFICATION TEST FAILED:', err);
  process.exit(1);
});
