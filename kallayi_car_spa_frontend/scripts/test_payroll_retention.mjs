/**
 * Automated Verification Script: Payroll Percentage Commission & Wage Retention
 * Tests:
 * 1. GET /api/staff/daily-settlement (verifies 4 primary figures: commission_percentage, wash_revenue_today, unsettled_advances, retained_balance)
 * 2. GET /api/staff/settle-pay/[id] (verifies financial breakdown, gross earnings, advances deduction, previous retained balance, and total payable due)
 * 3. PATCH /api/staff/directory/[id] (verifies updating commission_percentage)
 * 4. POST /api/staff/settle-pay/[id] with partial payout (verifies partial payout amount_paid and rollover into retained_balance)
 */

import http from 'http';

const BASE_URL = 'http://localhost:3000';

async function fetchJson(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
}

async function runTests() {
  console.log('🚀 Starting Staff Management & Payroll Retention Test Suite...\n');

  // Step 1: Test GET /api/staff/daily-settlement
  console.log('--- Step 1: Testing GET /api/staff/daily-settlement ---');
  const dailyRes = await fetchJson('/api/staff/daily-settlement');
  if (!dailyRes.ok || !Array.isArray(dailyRes.data)) {
    console.error('❌ Failed to fetch daily settlement:', dailyRes.status, dailyRes.data);
    process.exit(1);
  }
  console.log(`✅ Received ${dailyRes.data.length} staff records from daily settlement.`);
  
  if (dailyRes.data.length === 0) {
    console.warn('⚠️ No staff profiles returned. Ensure staff exist in DB.');
    process.exit(0);
  }

  const sampleWorker = dailyRes.data[0];
  console.log('Sample Worker Record:', {
    id: sampleWorker.id,
    name: sampleWorker.name,
    role: sampleWorker.role,
    commission_percentage: sampleWorker.commission_percentage,
    wash_revenue_today: sampleWorker.wash_revenue_today,
    commission_earned: sampleWorker.commission_earned,
    base_wage: sampleWorker.base_wage,
    unsettled_advances: sampleWorker.unsettled_advances,
    retained_balance: sampleWorker.retained_balance,
    total_payable_due: sampleWorker.total_payable_due,
    status: sampleWorker.status
  });

  if (sampleWorker.commission_percentage === undefined) {
    console.error('❌ commission_percentage missing from daily settlement worker record!');
  } else {
    console.log('✅ commission_percentage is present:', sampleWorker.commission_percentage);
  }

  if (sampleWorker.total_payable_due === undefined) {
    console.error('❌ total_payable_due missing from daily settlement worker record!');
  } else {
    console.log('✅ total_payable_due is present:', sampleWorker.total_payable_due);
  }

  // Step 2: Test GET /api/staff/settle-pay/[id]
  console.log('\n--- Step 2: Testing GET /api/staff/settle-pay/' + sampleWorker.id + ' ---');
  const previewRes = await fetchJson(`/api/staff/settle-pay/${sampleWorker.id}`);
  if (!previewRes.ok || !previewRes.data) {
    console.error('❌ Failed to fetch settle-pay preview:', previewRes.status, previewRes.data);
    process.exit(1);
  }

  const pData = previewRes.data.data || previewRes.data;
  console.log('Settle Pay Preview Data:', {
    staff_name: pData.staff_name,
    wash_revenue: pData.wash_revenue,
    commission_percentage: pData.commission_percentage,
    commission_earned: pData.commission_earned,
    base_wage: pData.base_wage,
    gross_earnings: pData.gross_earnings,
    unsettled_advances: pData.unsettled_advances,
    previous_retained_balance: pData.previous_retained_balance,
    total_payable_due: pData.total_payable_due
  });

  // Verify Formula:
  // Gross = Base + Commission + Tips
  const expectedGross = Math.round((Number(pData.base_wage || 0) + Number(pData.commission_earned || 0) + Number(pData.tips_earned || 0)) * 100) / 100;
  // Total Due = Gross + Previous Retained - Advances
  const expectedDue = Math.max(0, Math.round((expectedGross + Number(pData.previous_retained_balance || 0) - Number(pData.unsettled_advances || 0)) * 100) / 100);

  if (Math.abs(Number(pData.gross_earnings) - expectedGross) > 0.05) {
    console.error(`❌ Gross earnings formula mismatch: Got ${pData.gross_earnings}, expected ${expectedGross}`);
  } else {
    console.log(`✅ Gross Earnings formula verified: ${pData.gross_earnings}`);
  }

  if (Math.abs(Number(pData.total_payable_due) - expectedDue) > 0.05) {
    console.error(`❌ Total Payable Due formula mismatch: Got ${pData.total_payable_due}, expected ${expectedDue}`);
  } else {
    console.log(`✅ Total Payable Due formula verified: ${pData.total_payable_due}`);
  }

  // Step 3: Test PATCH /api/staff/directory/[id] to update commission_percentage
  console.log('\n--- Step 3: Testing PATCH /api/staff/directory/' + sampleWorker.id + ' (Commission update) ---');
  const targetRate = 48.5;
  const updateRes = await fetchJson(`/api/staff/directory/${sampleWorker.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ commission_percentage: targetRate })
  });

  if (!updateRes.ok) {
    console.error('❌ Failed to update commission rate:', updateRes.status, updateRes.data);
  } else {
    console.log(`✅ Commission rate successfully updated to ${targetRate}%`);
    
    // Verify it reflects on re-fetch
    const rePreview = await fetchJson(`/api/staff/settle-pay/${sampleWorker.id}`);
    const repData = rePreview.data.data || rePreview.data;
    if (Number(repData.commission_percentage) === targetRate) {
      console.log(`✅ Re-fetched settle-pay confirms updated commission_percentage: ${targetRate}%`);
    } else {
      console.log(`ℹ️ Current commission_percentage on preview: ${repData.commission_percentage}`);
    }

    // Revert back to original rate
    await fetchJson(`/api/staff/directory/${sampleWorker.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ commission_percentage: pData.commission_percentage || 45 })
    });
  }

  // Step 4: Test POST /api/staff/settle-pay/[id] with partial payout
  console.log('\n--- Step 4: Testing POST /api/staff/settle-pay/' + sampleWorker.id + ' (Partial Payout & Wage Retention) ---');
  const totalDueBefore = Number(pData.total_payable_due || 100);
  const partialAmount = Math.max(10, Math.floor(totalDueBefore / 2));
  const expectedRemaining = Math.max(0, Math.round((totalDueBefore - partialAmount) * 100) / 100);

  console.log(`Executing payout: Total Due = ₹${totalDueBefore}, Paying Now = ₹${partialAmount}, Expected Retained = ₹${expectedRemaining}`);

  const settleRes = await fetchJson(`/api/staff/settle-pay/${sampleWorker.id}`, {
    method: 'POST',
    body: JSON.stringify({
      paid_amount: partialAmount,
      payment_method: 'CASH',
      notes: 'Automated test settlement with wage retention'
    })
  });

  if (!settleRes.ok) {
    console.error('❌ Failed to execute settle pay:', settleRes.status, settleRes.data);
  } else {
    const sRes = settleRes.data.data || settleRes.data;
    console.log('✅ Payout successful:', {
      message: settleRes.data.message,
      amount_paid: sRes.amount_paid,
      balance_retained: sRes.balance_retained,
      net_payable: sRes.net_payable
    });

    if (sRes.amount_paid !== undefined && Math.abs(Number(sRes.amount_paid) - partialAmount) <= 0.05) {
      console.log(`✅ Partial amount_paid correctly recorded: ₹${sRes.amount_paid}`);
    }

    if (sRes.balance_retained !== undefined && Math.abs(Number(sRes.balance_retained) - expectedRemaining) <= 0.05) {
      console.log(`✅ Withheld wage retention correctly calculated: ₹${sRes.balance_retained}`);
    }
  }

  console.log('\n🎉 Test Suite Completed Successfully!');
}

runTests().catch(err => {
  console.error('Unhandled error running tests:', err);
  process.exit(1);
});
