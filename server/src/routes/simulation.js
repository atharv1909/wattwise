const express = require('express');
const router = express.Router();
const { simulateHousehold } = require('../services/simEngine');
const { getStore } = require('../config/db');

// POST /api/v1/simulation/run
router.post('/run', (req, res) => {
  const store = getStore();
  const { householdId, ambientTempC, acSetpointC, days } = req.body;
  const hId = Number(householdId) || 1;

  const appliances = store.appliances.filter(a => a.household_id === hId);
  const rooms = store.rooms.filter(r => r.household_id === hId);

  // Map room names to appliances
  const enrichedAppliances = appliances.map(app => {
    const r = rooms.find(room => room.id === app.room_id);
    return {
      ...app,
      room_name: r ? r.name : 'Living & Dining Room'
    };
  });

  const simResult = simulateHousehold(enrichedAppliances, {
    ambientTempC: Number(ambientTempC) || 34,
    acSetpointC: Number(acSetpointC) || 24,
    days: Number(days) || 30
  });

  res.json(simResult);
});

module.exports = router;
