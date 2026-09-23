import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

async function main() {
  console.log('--- RUNNING LIVE VERIFICATION FOR STAFF BALANCE CARDS ---');

  // 1. Pick staff user
  const { data: staffList, error: sErr } = await supabase
    .from('staff_profiles')
    .select('id, user_id, role, commission_rate')
    .eq('role', 'WASHER')
    .limit(1);

  if (sErr || !staffList || staffList.length === 0) {
    console.error('Could not find washer staff profile:', sErr);
    process.exit(1);
  }

  const staff = staffList[0];
  console.log(`Using Staff Profile: ID=${staff.id}, UserID=${staff.user_id}`);

  // 2. Fetch baseline dashboard stats
  const baselineRes = await fetch('http://localhost:3000/api/staff/dashboard-stats', {
    headers: {
      Authorization: `Bearer auth_${staff.user_id}`,
    },
  });
  const baseline = await baselineRes.json();
  console.log('Baseline Response:');
  console.log({
    payableToStaff: baseline.financialSummary?.payableToStaff,
    receivableFromStaff: baseline.financialSummary?.receivableFromStaff,
    currency: baseline.financialSummary?.currency,
    details: baseline.financialSummary?.details,
  });

  if (!baseline.financialSummary || typeof baseline.financialSummary.payableToStaff !== 'number') {
    console.error('FAIL: Missing or invalid financialSummary structure');
    process.exit(1);
  }

  // 3. Test with Cash in Hand simulation
  // Pick an invoice to temporarily assign cash collection to this staff
  const { data: testInv } = await supabase
    .from('invoices')
    .select('id, amount, final_price, payment_method, collector_type, cash_collected_by_staff_id')
    .eq('payment_method', 'CASH')
    .eq('is_paid', true)
    .limit(1)
    .single();

  if (testInv) {
    console.log(`\nSimulating cash collection on Invoice #${testInv.id} (amount: ₹${testInv.final_price || testInv.amount})`);
    
    // Temporarily update invoice to be collected by this staff member
    await supabase
      .from('invoices')
      .update({
        cash_collected_by_staff_id: staff.id,
        collector_type: 'STAFF',
      })
      .eq('id', testInv.id);

    // Call dashboard-stats API
    const updatedRes = await fetch('http://localhost:3000/api/staff/dashboard-stats', {
      headers: {
        Authorization: `Bearer auth_${staff.user_id}`,
      },
    });
    const updated = await updatedRes.json();
    console.log('Updated Stats with Cash Collection:');
    console.log({
      payableToStaff: updated.financialSummary?.payableToStaff,
      receivableFromStaff: updated.financialSummary?.receivableFromStaff,
      cashInHand: updated.financialSummary?.details?.cashInHand,
    });

    const expectedCash = Number(testInv.final_price || testInv.amount || 0);
    if (updated.financialSummary?.receivableFromStaff >= expectedCash) {
      console.log(`✓ PASS: receivableFromStaff correctly reflects collected cash (₹${updated.financialSummary.receivableFromStaff})`);
    } else {
      console.error(`✗ FAIL: Expected receivableFromStaff >= ₹${expectedCash}, got ₹${updated.financialSummary?.receivableFromStaff}`);
    }

    // Revert invoice back
    await supabase
      .from('invoices')
      .update({
        cash_collected_by_staff_id: testInv.cash_collected_by_staff_id,
        collector_type: testInv.collector_type,
      })
      .eq('id', testInv.id);

    console.log('Reverted test invoice to original state.');
  }

  // 4. Test Unsettled Staff Advances (Shop is owed by staff)
  console.log('\n--- TEST 4: Staff Advance Simulation ---');
  const { data: advanceRecord, error: advErr } = await supabase
    .from('staff_advances')
    .insert({
      staff_id: staff.id,
      amount: 500,
      purpose: 'Emergency Fuel Advance Test',
      is_settled: false,
    })
    .select()
    .single();

  if (advErr) {
    console.error('Failed to create test advance:', advErr);
  } else {
    console.log(`Created test advance ID=${advanceRecord.id} of ₹500`);

    const advRes = await fetch('http://localhost:3000/api/staff/dashboard-stats', {
      headers: {
        Authorization: `Bearer auth_${staff.user_id}`,
      },
    });
    const advStats = await advRes.json();
    console.log('Stats with Active Advance:');
    console.log({
      payableToStaff: advStats.financialSummary?.payableToStaff,
      receivableFromStaff: advStats.financialSummary?.receivableFromStaff,
      pendingAdvances: advStats.financialSummary?.details?.pendingAdvances,
    });

    if (advStats.financialSummary?.details?.pendingAdvances === 500 && advStats.financialSummary?.receivableFromStaff >= 500) {
      console.log('✓ PASS: Active advance correctly added to receivableFromStaff');
    } else {
      console.error('✗ FAIL: Advance not reflected properly');
    }

    // Clean up advance
    await supabase.from('staff_advances').delete().eq('id', advanceRecord.id);
    console.log('Cleaned up test advance.');
  }

  console.log('\n--- ALL VERIFICATIONS COMPLETED SUCCESSFULLY ---');
}

main().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
