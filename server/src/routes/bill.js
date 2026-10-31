const express = require('express');
const router = express.Router();
const { calculateBill, auditBill } = require('../services/billEngine');
const { getStore } = require('../config/db');

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
router.post('/audit', (req, res) => {
  const { units, amount, billMonth, householdId } = req.body;
  if (units === undefined || amount === undefined) {
    return res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Both units and amount are required' } });
  }

  const auditResult = auditBill(units, amount);
  const store = getStore();

  // If householdId is provided, store the audited bill in history
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
router.get('/history/:householdId', (req, res) => {
  const store = getStore();
  const householdId = Number(req.params.householdId);
  const bills = store.bills.filter(b => b.household_id === householdId);
  res.json({ bills });
});

module.exports = router;
