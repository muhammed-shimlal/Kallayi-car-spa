/**
 * KALLAYI CAR SPA & AUTO CARE - AI & MCP INTEGRATION VERIFICATION TEST
 * 
 * Tests:
 * 1. Security enforcement (Timing-safe Bearer token on all AI routes)
 * 2. GET /api/ai/khata-overdue (Overdue credit query for WhatsApp reminders)
 * 3. POST /api/ai/mark-reminded (Reminder dispatch audit updates)
 * 4. GET /api/ai/business-summary (AI Business Advisor analytics & KPIs)
 * 5. MCP Server stdio JSON-RPC protocol execution
 * 
 * Run with: node --env-file=.env.local scripts/test_ai_mcp_integration.mjs
 */

import { spawn } from 'child_process';

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:3000';
const AI_SECRET_KEY = process.env.AI_SECRET_KEY || 'kallayi_gemini_ai_secret_key_2026_secure';

async function runTests() {
  console.log('====================================================');
  console.log('🤖 TESTING GEMINI AI & MCP INTEGRATION SUITE');
  console.log('====================================================');
  console.log(`Endpoint: ${BASE_URL}`);
  console.log(`AI Secret: ${AI_SECRET_KEY.slice(0, 10)}... (Length: ${AI_SECRET_KEY.length})\n`);

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TEST SUITE 1: SECURITY & AUTHENTICATION ENFORCEMENT
  // ─────────────────────────────────────────────────────────────────────────
  console.log('🔒 [SUITE 1] Security & Bearer Token Authentication Checks');

  // 1.1 Khata overdue without token
  const noAuthRes = await fetch(`${BASE_URL}/api/ai/khata-overdue`);
  assert(noAuthRes.status === 401, 'Reject request without Authorization header (401)');

  // 1.2 Khata overdue with wrong token
  const badAuthRes = await fetch(`${BASE_URL}/api/ai/khata-overdue`, {
    headers: { 'Authorization': 'Bearer wrong_invalid_secret_key' }
  });
  assert(badAuthRes.status === 401, 'Reject request with invalid Bearer token (401)');

  // 1.3 Business summary without token
  const noAuthBiz = await fetch(`${BASE_URL}/api/ai/business-summary`);
  assert(noAuthBiz.status === 401, 'Reject /api/ai/business-summary without token (401)');

  // 1.4 Mark reminded without token
  const noAuthRemind = await fetch(`${BASE_URL}/api/ai/mark-reminded`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ khataId: 1 })
  });
  assert(noAuthRemind.status === 401, 'Reject /api/ai/mark-reminded without token (401)');

  // ─────────────────────────────────────────────────────────────────────────
  // TEST SUITE 2: GET /api/ai/khata-overdue
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n📋 [SUITE 2] GET /api/ai/khata-overdue (WhatsApp Reminder Query)');

  const overdueRes = await fetch(`${BASE_URL}/api/ai/khata-overdue?min_days_overdue=0&limit=10`, {
    headers: { 'Authorization': `Bearer ${AI_SECRET_KEY}` }
  });

  assert(overdueRes.status === 200, 'Authenticated request returns 200 OK');
  const overdueJson = await overdueRes.json();
  assert(overdueJson.success === true, 'Response contains success: true');
  assert(Array.isArray(overdueJson.records), 'Response contains records array');
  assert(typeof overdueJson.count === 'number', `Count field present (Count: ${overdueJson.count})`);

  if (overdueJson.records.length > 0) {
    const first = overdueJson.records[0];
    assert('khataId' in first, 'Record contains khataId');
    assert('customerName' in first, 'Record contains customerName');
    assert('customerPhone' in first, 'Record contains customerPhone');
    assert('amount' in first, 'Record contains amount');
    assert('daysOverdue' in first, 'Record contains daysOverdue');
    assert(first.daysOverdue >= 0, 'daysOverdue is non-negative');
    console.log('    Sample overdue record:', {
      khataId: first.khataId,
      customer: first.customerName,
      phone: first.customerPhone,
      amount: first.amount,
      daysOverdue: first.daysOverdue
    });
  } else {
    console.log('    ℹ️ No active overdue balances currently in database.');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TEST SUITE 3: POST /api/ai/mark-reminded
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n🔔 [SUITE 3] POST /api/ai/mark-reminded (Reminder Status Update)');

  // Missing arguments
  const emptyRemindRes = await fetch(`${BASE_URL}/api/ai/mark-reminded`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${AI_SECRET_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({})
  });
  assert(emptyRemindRes.status === 400, 'Empty body returns 400 Bad Request');

  // Update with khataId (if records exist, use first; else test with mock 999999)
  const testKhataId = overdueJson.records?.length > 0 ? overdueJson.records[0].khataId : 999999;
  const markRes = await fetch(`${BASE_URL}/api/ai/mark-reminded`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${AI_SECRET_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      khataId: testKhataId,
      channel: 'WHATSAPP',
      notes: 'Automated test WhatsApp reminder dispatch'
    })
  });

  const markJson = await markRes.json();
  if (testKhataId === 999999) {
    assert(markRes.status === 404, 'Non-existent khataId correctly returns 404');
  } else {
    assert(markRes.status === 200 && markJson.success === true, 'Successfully marked khata entry as reminded');
    assert(typeof markJson.reminderCount === 'number', `Reminder count incremented (New count: ${markJson.reminderCount})`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TEST SUITE 4: GET /api/ai/business-summary (AI Business Advisor)
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n📊 [SUITE 4] GET /api/ai/business-summary (Business Analytics)');

  const bizRes = await fetch(`${BASE_URL}/api/ai/business-summary?period=today`, {
    headers: { 'Authorization': `Bearer ${AI_SECRET_KEY}` }
  });

  assert(bizRes.status === 200, 'Authenticated request returns 200 OK');
  const bizJson = await bizRes.json();
  assert(bizJson.success === true, 'Response contains success: true');
  assert('kpiSummary' in bizJson, 'Contains kpiSummary');
  assert('revenueSplit' in bizJson, 'Contains revenueSplit');
  assert('creditHealth' in bizJson, 'Contains creditHealth');
  assert('vehicleBreakdown' in bizJson, 'Contains vehicleBreakdown');
  assert('topServicePackages' in bizJson, 'Contains topServicePackages');
  assert('hourlyDistribution' in bizJson, 'Contains hourlyDistribution');

  console.log('    Business Summary Highlights:');
  console.log('    - Vehicles Washed:', bizJson.kpiSummary?.totalVehiclesWashed);
  console.log('    - Total Revenue:', `₹${bizJson.revenueSplit?.total}`);
  console.log('    - Revenue Split:', `Cash: ₹${bizJson.revenueSplit?.cash}, UPI: ₹${bizJson.revenueSplit?.upiOnline}, Khata: ₹${bizJson.revenueSplit?.creditKhata}`);
  console.log('    - Active Credit Customers:', bizJson.creditHealth?.activeCreditCustomers);
  console.log('    - Total Outstanding Receivable:', `₹${bizJson.creditHealth?.totalOutstandingReceivable}`);
  console.log('    - Busiest Peak Hour:', bizJson.kpiSummary?.busiestHour);

  // ─────────────────────────────────────────────────────────────────────────
  // TEST SUITE 5: MCP SERVER JSON-RPC STDIO INTERACTION
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n🔌 [SUITE 5] MCP Server stdio Protocol & Tool Execution');

  const mcpPromise = new Promise((resolve) => {
    const child = spawn('node', ['--env-file=.env.local', 'scripts/mcp-server.mjs'], {
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdoutData = '';

    child.stdout.on('data', (chunk) => {
      stdoutData += chunk.toString();
    });

    // Send initialize
    child.stdin.write(JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {}
    }) + '\n');

    // Send tools/list
    child.stdin.write(JSON.stringify({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
      params: {}
    }) + '\n');

    // Send tools/call for get_business_performance_summary
    child.stdin.write(JSON.stringify({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'get_business_performance_summary',
        arguments: { period: 'today' }
      }
    }) + '\n');

    setTimeout(() => {
      child.kill();
      resolve(stdoutData);
    }, 2000);
  });

  const mcpOutput = await mcpPromise;
  const lines = mcpOutput.trim().split('\n').filter(Boolean);

  let initOk = false;
  let toolsListOk = false;
  let toolCallOk = false;

  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);
      if (parsed.id === 1 && parsed.result?.serverInfo?.name === 'kallayi-car-spa-mcp') {
        initOk = true;
      }
      if (parsed.id === 2 && Array.isArray(parsed.result?.tools)) {
        toolsListOk = parsed.result.tools.length >= 4;
      }
      if (parsed.id === 3 && Array.isArray(parsed.result?.content)) {
        toolCallOk = true;
      }
    } catch {}
  }

  assert(initOk, 'MCP Server handshake: initialize returned serverInfo');
  assert(toolsListOk, 'MCP Server tools/list: returned 4 registered tools with schemas');
  assert(toolCallOk, 'MCP Server tools/call: executed get_business_performance_summary');

  console.log('\n====================================================');
  console.log(`RESULTS: ${passed} passed, ${failed} failed.`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
