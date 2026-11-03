const express = require('express');
const router = express.Router();
const { getStore, isUsingMysql, getPool } = require('../config/db');

// GET /api/v1/alerts/:householdId
router.get('/:householdId', async (req, res) => {
  const householdId = Number(req.params.householdId);

  if (isUsingMysql()) {
    try {
      const pool = getPool();
      const [rows] = await pool.query(
        'SELECT * FROM alerts WHERE household_id = ? ORDER BY created_at DESC',
        [householdId]
      );
      if (rows && rows.length > 0) {
        return res.json({ alerts: rows });
      }
    } catch (e) {
      console.warn('[Alerts] MySQL alerts fetch error:', e.message);
    }
  }

  const store = getStore();
  const alerts = store.alerts.filter(a => a.household_id === householdId);
  res.json({ alerts });
});

// PATCH /api/v1/alerts/:alertId/read
router.patch('/:alertId/read', async (req, res) => {
  const alertId = Number(req.params.alertId);

  if (isUsingMysql()) {
    try {
      const pool = getPool();
      await pool.query('UPDATE alerts SET is_read = 1 WHERE id = ?', [alertId]);
    } catch (e) {
      console.warn('[Alerts] MySQL update read error:', e.message);
    }
  }

  const store = getStore();
  const alert = store.alerts.find(a => a.id === alertId);
  if (alert) {
    alert.is_read = true;
  }
  res.json({ success: true, message: 'Alert marked as read' });
});

module.exports = router;
