const express = require('express');
const router = express.Router();
const { DEFAULT_MSEDCL_TARIFF, getSlabGauge } = require('../services/billEngine');

// GET /api/v1/tariffs/msedcl
router.get('/msedcl', (req, res) => {
  res.json({
    state: 'Maharashtra',
    discom: 'Maharashtra State Electricity Distribution Co. Ltd. (MSEDCL)',
    category: 'Residential LT-I (Domestic)',
    phase: 'Single Phase',
    regulatoryOrder: 'MERC Case No. 226 of 2022 / Mid-Term Review Tariff Order FY 2024-25',
    sourceUrl: 'https://www.merc.gov.in/tariff-orders/msedcl-lt-tariffs',
    tariff: DEFAULT_MSEDCL_TARIFF
  });
});

// GET /api/v1/tariffs/gauge?units=145
router.get('/gauge', (req, res) => {
  const units = Number(req.query.units) || 120;
  const gauge = getSlabGauge(units);
  res.json(gauge);
});

module.exports = router;
