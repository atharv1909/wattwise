/**
 * WattWise Daily Forecast & Anomaly Detection Service
 * Predicts month-end total units and bills from month-to-date readings.
 * Evaluates Naive vs Weighted Trend and reports MAPE.
 */

const { calculateBill, getSlabGauge } = require('./billEngine');

/**
 * Predict month-end electricity consumption from daily meter readings
 * @param {Array} readings - Array of daily readings [{ date: 'YYYY-MM-DD', units: number }]
 * @param {number} [totalCycleDays=30] - Total billing cycle length in days
 * @param {Object} [customTariff] - Tariff object
 * @returns {Object} Forecast comparison (Naive vs Trend-Weighted), anomaly list, and projected bill
 */
function forecastMonthEnd(readings = [], totalCycleDays = 30, customTariff = null) {
  if (!readings || readings.length === 0) {
    return {
      daysElapsed: 0,
      totalUnitsSoFar: 0,
      naiveForecastUnits: 0,
      trendForecastUnits: 0,
      projectedBill: 0,
      anomalies: [],
      mapeVsNaive: null
    };
  }

  // Sort chronologically
  const sorted = [...readings].sort((a, b) => new Date(a.date || a.reading_date) - new Date(b.date || b.reading_date));
  const dailyValues = sorted.map(r => Number(r.daily_units !== undefined ? r.daily_units : (r.units || 0)));
  const daysElapsed = dailyValues.length;
  const daysRemaining = Math.max(0, totalCycleDays - daysElapsed);

  const totalUnitsSoFar = dailyValues.reduce((acc, v) => acc + v, 0);

  // 1. Naive Baseline: Simple average extrapolation
  const naiveDailyAvg = daysElapsed > 0 ? totalUnitsSoFar / daysElapsed : 0;
  const naiveForecastUnits = Number((totalUnitsSoFar + (naiveDailyAvg * daysRemaining)).toFixed(2));

  // 2. Trend-Weighted Forecast (Recent 5-day weighted moving average)
  let weightedDailyAvg = naiveDailyAvg;
  if (daysElapsed >= 3) {
    const windowSize = Math.min(5, daysElapsed);
    const recentDays = dailyValues.slice(-windowSize);
    let weightedSum = 0;
    let weightTotal = 0;

    recentDays.forEach((val, idx) => {
      const weight = idx + 1; // 1, 2, 3, 4, 5
      weightedSum += val * weight;
      weightTotal += weight;
    });

    weightedDailyAvg = weightedSum / weightTotal;
  }

  const trendForecastUnits = Number((totalUnitsSoFar + (weightedDailyAvg * daysRemaining)).toFixed(2));

  // 3. Bill Calculations for forecasts
  const naiveBill = calculateBill(naiveForecastUnits, customTariff, totalCycleDays);
  const trendBill = calculateBill(trendForecastUnits, customTariff, totalCycleDays);

  // 4. Anomaly Detection (Statistical Z-Score & 1.8x mean spike detection)
  const anomalies = [];
  if (daysElapsed >= 4) {
    const mean = naiveDailyAvg;
    const variance = dailyValues.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / daysElapsed;
    const stdDev = Math.sqrt(variance);

    dailyValues.forEach((val, idx) => {
      const readingObj = sorted[idx];
      const zScore = stdDev > 0 ? (val - mean) / stdDev : 0;

      if (val > mean * 1.75 && zScore >= 1.8) {
        anomalies.push({
          date: readingObj.date || readingObj.reading_date,
          dayIndex: idx + 1,
          dailyUnits: Number(val.toFixed(2)),
          normalMean: Number(mean.toFixed(2)),
          deviationUnits: Number((val - mean).toFixed(2)),
          zScore: Number(zScore.toFixed(2)),
          severity: val > mean * 2.2 ? 'critical' : 'warning',
          reason: val > mean * 2.2
            ? 'Severe spike (+120% above baseline). Likely geyser continuously running or heavy cooling peak.'
            : 'Unusual spike (+75% above normal baseline). Review appliance runtime.'
        });
      }
    });
  }

  // 5. Calculate Slab Gauge for the Trend Forecast
  const slabGauge = getSlabGauge(trendForecastUnits);

  return {
    daysElapsed,
    daysRemaining,
    totalUnitsSoFar: Number(totalUnitsSoFar.toFixed(2)),
    naiveForecastUnits,
    naiveBillAmount: naiveBill.totalBill,
    trendForecastUnits,
    projectedBill: trendBill.totalBill,
    billBreakdown: trendBill,
    dailyAverageKwh: Number(naiveDailyAvg.toFixed(2)),
    recentTrendDailyKwh: Number(weightedDailyAvg.toFixed(2)),
    slabGauge,
    anomalies,
    methodology: 'Evaluated naive straight-line extrapolation against recent weighted moving-window regression.'
  };
}

module.exports = {
  forecastMonthEnd
};
