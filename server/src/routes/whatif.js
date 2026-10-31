const express = require('express');
const router = express.Router();
const { runWhatIfScenario } = require('../services/whatif');
const { performRealityCheck } = require('../services/calibration');
const { getStore } = require('../config/db');

// POST /api/v1/whatif/scenario
router.post('/scenario', (req, res) => {
  const store = getStore();
  const { householdId, scenario, options } = req.body;
  const hId = Number(householdId) || 1;

  const appliances = store.appliances.filter(a => a.household_id === hId);
  const result = runWhatIfScenario(appliances, scenario || {}, options || {});

  res.json(result);
});

// POST /api/v1/whatif/reality-check
router.post('/reality-check', (req, res) => {
  const { actualBill, guessedUsage, simulatedUsage, measuredUsage } = req.body;

  const result = performRealityCheck(
    actualBill || { units: 342, amount: 4402 },
    guessedUsage || { totalUnits: 250 },
    simulatedUsage || { totalUnits: 325 },
    measuredUsage || { totalUnits: 338, coveragePercent: 82 }
  );

  res.json(result);
});

module.exports = router;
