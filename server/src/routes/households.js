const express = require('express');
const router = express.Router();
const { getStore, isUsingMysql, getPool } = require('../config/db');

// GET /api/v1/households
router.get('/', async (req, res) => {
  if (isUsingMysql()) {
    try {
      const pool = getPool();
      const [rows] = await pool.query('SELECT * FROM households');
      if (rows && rows.length > 0) {
        return res.json({ households: rows });
      }
    } catch (e) {
      console.warn('[Households] MySQL fetch error, using store fallback:', e.message);
    }
  }
  const store = getStore();
  res.json({ households: store.households });
});

// POST /api/v1/households
router.post('/', async (req, res) => {
  const store = getStore();
  const {
    name,
    state = 'Maharashtra',
    discom = 'MSEDCL',
    connection_type = 'Single Phase',
    category = 'Residential (LT-I)',
    sanctioned_load_kw = 3.0,
    archetype = '2BHK',
    last_bill_units,
    last_bill_amount,
    consumer_number
  } = req.body;

  const newHousehold = {
    id: store.households.length + 1,
    user_id: 1,
    name: name || `Residence (${archetype}, ${state})`,
    state,
    discom,
    connection_type,
    category,
    tariff_id: 1,
    sanctioned_load_kw: Number(sanctioned_load_kw) || 3.0,
    billing_day: 1,
    archetype: archetype || '2BHK',
    consumer_number: consumer_number || '028540' + Math.floor(100000 + Math.random() * 900000)
  };

  if (isUsingMysql()) {
    try {
      const pool = getPool();
      const [result] = await pool.query(
        `INSERT INTO households (user_id, name, tariff_id, sanctioned_load_kw, billing_day, archetype)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [1, newHousehold.name, 1, newHousehold.sanctioned_load_kw, 1, newHousehold.archetype]
      );
      newHousehold.id = result.insertId;
    } catch (e) {
      console.warn('[Households] MySQL insert failed, saved in memory:', e.message);
    }
  }

  store.households.push(newHousehold);

  // If first bill info provided, audit and save to bills
  if (last_bill_units && last_bill_amount) {
    try {
      const { auditBill } = require('../services/billEngine');
      const auditRes = auditBill(Number(last_bill_units), Number(last_bill_amount));
      const bMonth = new Date().toISOString().slice(0, 7);
      
      if (isUsingMysql()) {
        try {
          const pool = getPool();
          await pool.query(
            `INSERT INTO bills (household_id, bill_month, period_start, period_end, units_billed, amount_billed, amount_recomputed, mismatch_flag, mismatch_reason, breakdown)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              newHousehold.id,
              bMonth,
              `${bMonth}-01`,
              `${bMonth}-28`,
              Number(last_bill_units),
              Number(last_bill_amount),
              auditRes.amountRecomputed,
              auditRes.isMismatch ? 1 : 0,
              auditRes.mismatchReason || 'None',
              JSON.stringify(auditRes.breakdown || {})
            ]
          );
        } catch (dbErr) {
          console.warn('[Households] Baseline bill insert to MySQL failed:', dbErr.message);
        }
      }

      const newBill = {
        id: store.bills.length + 1,
        household_id: newHousehold.id,
        bill_month: bMonth,
        units_billed: Number(last_bill_units),
        amount_billed: Number(last_bill_amount),
        amount_recomputed: auditRes.amountRecomputed,
        mismatch_flag: auditRes.isMismatch,
        mismatch_reason: auditRes.mismatchReason
      };
      store.bills.push(newBill);
      newHousehold.baselineBill = newBill;
      newHousehold.auditResult = auditRes;
    } catch (e) {
      console.warn('[Households] Could not audit baseline bill:', e.message);
    }
  }

  res.status(201).json({ success: true, household: newHousehold });
});

// GET /api/v1/households/:id
router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);

  if (isUsingMysql()) {
    try {
      const pool = getPool();
      const [hRows] = await pool.query('SELECT * FROM households WHERE id = ?', [id]);
      const household = hRows[0] || (await pool.query('SELECT * FROM households LIMIT 1'))[0][0];
      if (household) {
        const [rooms] = await pool.query('SELECT * FROM rooms WHERE household_id = ?', [household.id]);
        const [appliances] = await pool.query('SELECT * FROM appliances WHERE household_id = ?', [household.id]);
        return res.json({ household, rooms, appliances });
      }
    } catch (e) {
      console.warn('[Households] MySQL details fetch failed:', e.message);
    }
  }

  const store = getStore();
  const household = store.households.find(h => h.id === id) || store.households[0];
  const rooms = store.rooms.filter(r => r.household_id === household.id);
  const appliances = store.appliances.filter(a => a.household_id === household.id);

  res.json({ household, rooms, appliances });
});

module.exports = router;
