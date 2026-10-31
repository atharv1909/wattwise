const request = require('supertest');
const app = require('../src/app');

describe('⚡ WattWise REST API Endpoints', () => {
  test('GET /health returns status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.project).toBe('WattWise');
  });

  test('GET /api/v1/tariffs/msedcl returns official tariff order metadata', async () => {
    const res = await request(app).get('/api/v1/tariffs/msedcl');
    expect(res.status).toBe(200);
    expect(res.body.state).toBe('Maharashtra');
    expect(res.body.tariff.slabs.length).toBe(4);
    expect(res.body.tariff.dutyPercent).toBe(16.0);
  });

  test('POST /api/v1/bills/calculate returns detailed slab breakdown', async () => {
    const res = await request(app)
      .post('/api/v1/bills/calculate')
      .send({ units: 150 });
    expect(res.status).toBe(200);
    expect(res.body.units).toBe(150);
    expect(res.body.energyCharges).toBeGreaterThan(0);
    expect(res.body.totalBill).toBeGreaterThan(0);
  });

  test('POST /api/v1/bills/audit flags mismatched bill', async () => {
    const res = await request(app)
      .post('/api/v1/bills/audit')
      .send({ units: 100, amount: 2000 }); // True amount is ~849
    expect(res.status).toBe(200);
    expect(res.body.isMismatch).toBe(true);
    expect(res.body.difference).toBeGreaterThan(1000);
  });

  test('POST /api/v1/copilot/chat responds in Marathi when requested', async () => {
    const res = await request(app)
      .post('/api/v1/copilot/chat')
      .send({
        message: 'एसी ५ स्टार केला तर काय बचत होईल?',
        lang: 'mr'
      });
    expect(res.status).toBe(200);
    expect(res.body.reply).toBeDefined();
    expect(res.body.reply).toContain('बचत');
  });

  test('POST /api/v1/whatif/scenario simulates AC 5-star upgrade savings', async () => {
    const res = await request(app)
      .post('/api/v1/whatif/scenario')
      .send({
        householdId: 1,
        scenario: { upgradeAcTo5Star: true }
      });
    expect(res.status).toBe(200);
    expect(res.body.savings.monthlyRupeesSaved).toBeGreaterThan(0);
    expect(res.body.savings.annualRupeesSaved).toBeGreaterThan(0);
  });
});
