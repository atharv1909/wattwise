const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { forecastMonthEnd } = require('../services/forecast');
const { getStore } = require('../config/db');

// Helper to load CSV readings by relative filename
function loadCsvReadings(filename) {
  const csvPath = path.join(__dirname, '..', '..', '..', 'data', filename);
  if (!fs.existsSync(csvPath)) return null;

  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.trim().split('\n').slice(1);
  return lines.map(line => {
    const [date, units] = line.split(',');
    return {
      reading_date: date.trim(),
      daily_units: parseFloat(units.trim())
    };
  }).filter(r => !isNaN(r.daily_units));
}

// GET /api/v1/readings?source=demo|real|sgcc_normal|sgcc_theft
router.get('/', (req, res) => {
  const source = req.query.source || 'demo';
  const store = getStore();

  let readingsData = store.readings;
  let datasetLabel = 'Seeded Household Profile (Nagpur 2BHK)';

  if (source === 'real') {
    const realData = loadCsvReadings('real_daily_readings.csv');
    if (realData && realData.length > 0) {
      readingsData = realData.slice(0, 30);
      datasetLabel = 'Real Measured Household Power Dataset (UCI Benchmark)';
    }
  } else if (source === 'sgcc_normal') {
    const normalData = loadCsvReadings('sgcc_normal_daily.csv');
    if (normalData && normalData.length > 0) {
      readingsData = normalData;
      datasetLabel = 'Kaggle SGCC Normal Consumer (23,741 Benchmark Sample)';
    }
  } else if (source === 'sgcc_theft') {
    const theftData = loadCsvReadings('sgcc_theft_daily.csv');
    if (theftData && theftData.length > 0) {
      readingsData = theftData;
      datasetLabel = 'Kaggle SGCC Flagged Theft/Anomaly Consumer (2,122 Benchmark Sample)';
    }
  }

  const forecast = forecastMonthEnd(readingsData, 30);
  res.json({
    source,
    datasetLabel,
    readings: readingsData,
    forecast
  });
});

// POST /api/v1/readings
router.post('/', (req, res) => {
  const { reading_date, daily_units } = req.body;
  if (!reading_date || daily_units === undefined) {
    return res.status(400).json({ error: { message: 'reading_date and daily_units are required' } });
  }

  const store = getStore();
  const newReading = {
    reading_date,
    daily_units: Number(daily_units)
  };

  store.readings.push(newReading);
  const updatedForecast = forecastMonthEnd(store.readings, 30);

  res.status(201).json({
    reading: newReading,
    forecast: updatedForecast
  });
});

module.exports = router;
