const express = require('express');
const router = express.Router();
const { getStore } = require('../config/db');

// GET /api/v1/admin/stats
router.get('/stats', (req, res) => {
  const store = getStore();

  const totalHouseholds = store.households.length;
  const totalAppliances = store.appliances.length;
  const totalBillsAudited = store.bills.length;
  const mismatchedBills = store.bills.filter(b => b.mismatch_flag).length;
  const auditMismatchRate = totalBillsAudited > 0 ? Number(((mismatchedBills / totalBillsAudited) * 100).toFixed(1)) : 0;

  // Breakdown by archetype
  const archetypeDistribution = {};
  store.households.forEach(h => {
    archetypeDistribution[h.archetype] = (archetypeDistribution[h.archetype] || 0) + 1;
  });

  // Top consuming appliance categories in catalog
  const applianceCategories = {};
  store.appliances.forEach(a => {
    applianceCategories[a.category] = (applianceCategories[a.category] || 0) + 1;
  });

  res.json({
    summary: {
      totalHouseholds,
      totalAppliances,
      totalBillsAudited,
      mismatchedBills,
      auditMismatchRatePercent: auditMismatchRate,
      activeTariff: 'MSEDCL Residential LT-I (FY 2024-25)'
    },
    archetypeDistribution,
    applianceCategories,
    bills: store.bills
  });
});

module.exports = router;
