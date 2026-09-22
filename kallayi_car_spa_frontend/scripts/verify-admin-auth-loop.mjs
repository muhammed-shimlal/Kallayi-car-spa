import assert from 'node:assert';

const BASE_URL = 'http://127.0.0.1:3000/api';

async function runTests() {
  console.log('--- 1. Testing Admin Login POST /api/auth/login ---');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone: '9876543210',
      password: 'Kallayi@2026',
    }),
  });

  assert.strictEqual(loginRes.status, 200, `Expected 200, got ${loginRes.status}`);
  const loginData = await loginRes.json();
  console.log('Login successful! User:', loginData.user.name, 'Role:', loginData.user.role, 'Redirect:', loginData.redirect);
  assert.strictEqual(loginData.success, true);
  assert.strictEqual(loginData.user.role, 'ADMIN');
  assert.strictEqual(loginData.redirect, '/admin/dashboard');
  assert.ok(loginData.token, 'Token must exist');

  const token = loginData.token;

  console.log('\n--- 2. Testing GET /api/core/users/me with Bearer token ---');
  const meBearerRes = await fetch(`${BASE_URL}/core/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.strictEqual(meBearerRes.status, 200, `Expected 200, got ${meBearerRes.status}`);
  const meBearerData = await meBearerRes.json();
  console.log('GET /core/users/me result:', meBearerData.email, meBearerData.role, 'is_superuser:', meBearerData.is_superuser);
  assert.strictEqual(meBearerData.role, 'ADMIN');
  assert.strictEqual(meBearerData.is_superuser, true);

  console.log('\n--- 3. Testing GET /api/core/users/me/ (trailing slash) with Bearer token ---');
  const meSlashRes = await fetch(`${BASE_URL}/core/users/me/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.strictEqual(meSlashRes.status, 200, `Expected 200, got ${meSlashRes.status}`);
  const meSlashData = await meSlashRes.json();
  assert.strictEqual(meSlashData.role, 'ADMIN');
  console.log('Trailing slash request succeeded identically!');

  console.log('\n--- 4. Testing GET /api/core/users/me with Token header ---');
  const meTokenRes = await fetch(`${BASE_URL}/core/users/me`, {
    headers: { Authorization: `Token ${token}` },
  });
  assert.strictEqual(meTokenRes.status, 200, `Expected 200, got ${meTokenRes.status}`);
  const meTokenData = await meTokenRes.json();
  assert.strictEqual(meTokenData.role, 'ADMIN');
  console.log('Token header request succeeded!');

  console.log('\n--- 5. Testing GET /api/core/users/me with Cookie auth_token ---');
  const meCookieRes = await fetch(`${BASE_URL}/core/users/me`, {
    headers: { Cookie: `auth_token=${token}` },
  });
  assert.strictEqual(meCookieRes.status, 200, `Expected 200, got ${meCookieRes.status}`);
  const meCookieData = await meCookieRes.json();
  assert.strictEqual(meCookieData.role, 'ADMIN');
  console.log('Cookie auth request succeeded!');

  console.log('\n--- 6. Testing Unauthenticated GET /api/core/users/me (expecting 401) ---');
  const unauthRes = await fetch(`${BASE_URL}/core/users/me`);
  assert.strictEqual(unauthRes.status, 401, `Expected 401, got ${unauthRes.status}`);
  const unauthData = await unauthRes.json();
  console.log('Unauthenticated request correctly rejected with 401:', unauthData.error);

  console.log('\n--- 7. Testing Invalid Token GET /api/core/users/me (expecting 401) ---');
  const invalidRes = await fetch(`${BASE_URL}/core/users/me`, {
    headers: { Authorization: 'Bearer invalid_garbage_token_12345' },
  });
  assert.strictEqual(invalidRes.status, 401, `Expected 401, got ${invalidRes.status}`);
  console.log('Invalid token correctly rejected with 401!');

  console.log('\n=============================================');
  console.log(' ALL AUTHENTICATION TESTS PASSED SUCCESSFULLY! ');
  console.log('=============================================');
}

runTests().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
