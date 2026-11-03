const express = require('express');
const router = express.Router();
const { calculateBill, auditBill } = require('../services/billEngine');
const { getStore, isUsingMysql, getPool } = require('../config/db');

// POST /api/v1/bills/calculate
router.post('/calculate', (req, res) => {
  const { units, billingDays, tariff } = req.body;
  if (units === undefined || units === null) {
    return res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'units parameter is required' } });
  }

  const breakdown = calculateBill(units, tariff, billingDays);
  res.json(breakdown);
});

// POST /api/v1/bills/audit
router.post('/audit', async (req, res) => {
  const { units, amount, billMonth, householdId } = req.body;
  if (units === undefined || amount === undefined) {
    return res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Both units and amount are required' } });
  }

  const auditResult = auditBill(units, amount);

  // If householdId provided and MySQL connected, persist directly to DB
  if (householdId && isUsingMysql()) {
    try {
      const pool = getPool();
      const bMonth = billMonth || new Date().toISOString().slice(0, 7);
      await pool.query(
        `INSERT INTO bills (household_id, bill_month, period_start, period_end, units_billed, amount_billed, amount_recomputed, mismatch_flag, mismatch_reason, breakdown)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          Number(householdId),
          bMonth,
          `${bMonth}-01`,
          `${bMonth}-28`,
          Number(units),
          Number(amount),
          auditResult.amountRecomputed,
          auditResult.isMismatch ? 1 : 0,
          auditResult.mismatchReason || 'None',
          JSON.stringify(auditResult.breakdown || {})
        ]
      );
    } catch (e) {
      console.warn('[Bills] MySQL audit insert failed:', e.message);
    }
  }

  const store = getStore();
  if (householdId) {
    const newBill = {
      id: store.bills.length + 1,
      household_id: Number(householdId),
      bill_month: billMonth || '2024-09',
      units_billed: Number(units),
      amount_billed: Number(amount),
      amount_recomputed: auditResult.amountRecomputed,
      mismatch_flag: auditResult.isMismatch,
      mismatch_reason: auditResult.mismatchReason
    };
    store.bills.push(newBill);
  }

  res.json(auditResult);
});

// GET /api/v1/bills/history/:householdId
router.get('/history/:householdId', async (req, res) => {
  const householdId = Number(req.params.householdId);

  if (isUsingMysql()) {
    try {
      const pool = getPool();
      const [rows] = await pool.query(
        'SELECT * FROM bills WHERE household_id = ? ORDER BY bill_month DESC',
        [householdId]
      );
      if (rows && rows.length > 0) {
        return res.json({ bills: rows });
      }
    } catch (e) {
      console.warn('[Bills] MySQL history fetch failed:', e.message);
    }
  }

  const store = getStore();
  const bills = store.bills.filter(b => b.household_id === householdId);
  res.json({ bills });
});

module.exports = router;
