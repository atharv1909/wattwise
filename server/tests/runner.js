/**
 * WattWise Standalone Test Runner
 * Runs all Golden Tests, Boundary Verifications, and API Endpoint Tests.
 */

const assert = require('assert');
const { calculateBill, auditBill, getSlabGauge } = require('../src/services/billEngine');
const app = require('../src/app');
const http = require('http');

let passed = 0;
let failed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     ${err.message}`);
    failed++;
  }
}

async function runAsyncTest(name, fn) {
  try {
    await fn();
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     ${err.message}`);
    failed++;
  }
}

async function main() {
  console.log('\n======================================================');
  console.log('⚡ WATTWISE DETERMINISTIC BILL ENGINE: GOLDEN TESTS');
  console.log('======================================================\n');

  runTest('0 units: Only fixed charge and statutory electricity duty applied', () => {
    const result = calculateBill(0);
    assert.strictEqual(result.energyCharges, 0);
    assert.strictEqual(result.fixedCharges, 128.00);
    assert.strictEqual(result.wheelingCharges, 0);
    assert.strictEqual(result.facCharges, 0);
    assert.strictEqual(result.taxableSubtotal, 128.00);
    assert.strictEqual(result.dutyAmount, 20.48);
    assert.strictEqual(result.totalBill, 148);
  });

  runTest('Exactly 100 units: Stays strictly within Slab 1 (₹4.41/unit)', () => {
    const result = calculateBill(100);
    assert.strictEqual(result.slabBreakdown[0].unitsInSlab, 100);
    assert.strictEqual(result.slabBreakdown[1].unitsInSlab, 0);
    assert.strictEqual(result.energyCharges, 441.00);
    assert.strictEqual(result.wheelingCharges, 128.00);
    assert.strictEqual(result.fixedCharges, 128.00);
    assert.strictEqual(result.facCharges, 35.00);
    assert.strictEqual(result.taxableSubtotal, 732.00);
    assert.strictEqual(result.dutyAmount, 117.12);
    assert.strictEqual(result.totalBill, 849);
  });

  runTest('101 units: Exactly 100 in Slab 1 and 1 unit in Slab 2 (₹9.64/unit)', () => {
    const result = calculateBill(101);
    assert.strictEqual(result.slabBreakdown[0].unitsInSlab, 100);
    assert.strictEqual(result.slabBreakdown[1].unitsInSlab, 1);
    assert.strictEqual(result.slabBreakdown[1].amount, 9.64);
    assert.strictEqual(result.energyCharges, 450.64);
  });

  runTest('Exactly 300 units: 100 units in Slab 1, 200 units in Slab 2', () => {
    const result = calculateBill(300);
    assert.strictEqual(result.slabBreakdown[0].unitsInSlab, 100);
    assert.strictEqual(result.slabBreakdown[1].unitsInSlab, 200);
    assert.strictEqual(result.slabBreakdown[2].unitsInSlab, 0);
    assert.strictEqual(result.energyCharges, 2369.00);
  });

  runTest('Golden Bill 1 (May Summer AC Load - 342 units): Reproduces MSEDCL bill to the rupee', () => {
    const result = calculateBill(342);
    assert.strictEqual(result.energyCharges, 2940.62);
    assert.strictEqual(result.wheelingCharges, 437.76);
    assert.strictEqual(result.fixedCharges, 128.00);
    assert.strictEqual(result.facCharges, 119.70);
    assert.strictEqual(result.totalBill, 4206);
  });

  runTest('Golden Bill 2 (June Monsoon - 240 units): Reproduces bill to the rupee', () => {
    const result = calculateBill(240);
    assert.strictEqual(result.energyCharges, 1790.60);
    assert.strictEqual(result.wheelingCharges, 307.20);
    assert.strictEqual(result.fixedCharges, 128.00);
    assert.strictEqual(result.facCharges, 84.00);
    assert.strictEqual(result.totalBill, 2679);
  });

  runTest('Bill Auditor: Identifies accurate discom bill as verified', () => {
    const audit = auditBill(342, 4206);
    assert.strictEqual(audit.isMismatch, false);
    assert.strictEqual(audit.difference, 0);
  });

  runTest('Bill Auditor: Flags Discom overcharge error in July 2024 test case', () => {
    const audit = auditBill(210, 3550);
    assert.strictEqual(audit.isMismatch, true);
    assert.ok(audit.difference > 1000);
    assert.ok(audit.mismatchReason.includes('Overcharged'));
  });

  runTest('Slab Gauge: Accurately identifies remaining capacity in Slab 1', () => {
    const gauge = getSlabGauge(75);
    assert.strictEqual(gauge.currentSlab, 'Slab 1 (0-100)');
    assert.strictEqual(gauge.unitsRemainingInSlab, 25);
    assert.strictEqual(gauge.penaltyMultiplier, 2.18);
  });

  runTest('Slab Gauge: Accurately identifies Slab 2 capacity', () => {
    const gauge = getSlabGauge(250);
    assert.strictEqual(gauge.currentSlab, 'Slab 2 (101-300)');
    assert.strictEqual(gauge.unitsRemainingInSlab, 50);
  });

  console.log('\n======================================================');
  console.log('⚡ WATTWISE REST API & HARDWARE ENDPOINT TESTS');
  console.log('======================================================\n');

  // Start test server
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(5099, resolve));

  const apiRequest = async (method, path, body = null) => {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: '127.0.0.1',
        port: 5099,
        path,
        method,
        headers: { 'Content-Type': 'application/json' }
      };
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data) });
          } catch (e) {
            resolve({ status: res.statusCode, body: data });
          }
        });
      });
      req.on('error', reject);
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  };

  await runAsyncTest('GET /health returns status ok', async () => {
    const res = await apiRequest('GET', '/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'ok');
    assert.strictEqual(res.body.project, 'WattWise');
  });

  await runAsyncTest('GET /api/v1/tariffs/msedcl returns official tariff order metadata', async () => {
    const res = await apiRequest('GET', '/api/v1/tariffs/msedcl');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.state, 'Maharashtra');
    assert.strictEqual(res.body.tariff.slabs.length, 4);
    assert.strictEqual(res.body.tariff.dutyPercent, 16.0);
  });

  await runAsyncTest('POST /api/v1/bills/calculate returns detailed slab breakdown', async () => {
    const res = await apiRequest('POST', '/api/v1/bills/calculate', { units: 150 });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.units, 150);
    assert.ok(res.body.energyCharges > 0);
    assert.ok(res.body.totalBill > 0);
  });

  await runAsyncTest('POST /api/v1/bills/audit flags mismatched bill', async () => {
    const res = await apiRequest('POST', '/api/v1/bills/audit', { units: 100, amount: 2000 });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.isMismatch, true);
    assert.ok(res.body.difference > 1000);
  });

  await runAsyncTest('POST /api/v1/copilot/chat responds in Marathi when requested', async () => {
    const res = await apiRequest('POST', '/api/v1/copilot/chat', {
      message: 'एसी ५ स्टार केला तर काय बचत होईल?',
      lang: 'mr'
    });
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.reply !== undefined);
  });

  await runAsyncTest('POST /api/v1/whatif/scenario simulates AC 5-star upgrade savings', async () => {
    const res = await apiRequest('POST', '/api/v1/whatif/scenario', {
      householdId: 1,
      scenario: { upgradeAcTo5Star: true }
    });
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.savings.monthlyRupeesSaved > 0);
    assert.ok(res.body.savings.annualRupeesSaved > 0);
  });

  await runAsyncTest('GET /api/v1/devices/1 returns registered smart plugs', async () => {
    const res = await apiRequest('GET', '/api/v1/devices/1');
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.devices));
    assert.ok(res.body.devices.length >= 1);
  });

  await runAsyncTest('POST /api/v1/devices registers new IoT energy sensor', async () => {
    const res = await apiRequest('POST', '/api/v1/devices', {
      household_id: 1,
      name: 'Balcony-Water-Pump-Plug',
      kind: 'smart_plug'
    });
    assert.strictEqual(res.status, 201);
    assert.ok(res.body.device.id);
    assert.ok(res.body.token);
  });

  await runAsyncTest('GET /api/v1/alerts/1 returns smart slab breach alerts', async () => {
    const res = await apiRequest('GET', '/api/v1/alerts/1');
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.alerts));
  });

  await runAsyncTest('GET /api/v1/split/groups/1 calculates fair roommate bill split', async () => {
    const res = await apiRequest('GET', '/api/v1/split/groups/1/calculate');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.members);
  });

  // Close test server
  await new Promise(resolve => server.close(resolve));

  console.log('\n======================================================');
  console.log(`TEST SUMMARY: ${passed} Passed, ${failed} Failed out of ${passed + failed} Tests`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
