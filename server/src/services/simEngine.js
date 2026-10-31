/**
 * WattWise Simulation Engine (simEngine)
 * Pure, deterministic physics-grounded models for household appliances.
 * Implements 4 distinct models: Constant, Scheduled, Cyclic, and Thermostatic.
 */

const { calculateBill } = require('./billEngine');

/**
 * 4 Appliance Physics Models:
 */
const APPLIANCE_MODELS = {
  /**
   * 1. Constant: Always on 24x7 (Routers, continuous standby)
   */
  constant: (appliance, days = 30) => {
    const powerW = appliance.standby_w || appliance.rated_w || 10;
    const dailyKwh = (powerW * 24) / 1000;
    return {
      dailyKwh,
      totalKwh: Number((dailyKwh * days).toFixed(2)),
      description: 'Continuous 24/7 baseload'
    };
  },

  /**
   * 2. Scheduled: Fixed hours with user schedule
   */
  scheduled: (appliance, days = 30) => {
    const ratedW = appliance.rated_w || 75;
    const standbyW = appliance.standby_w || 0;
    const hoursOn = Math.min(24, Math.max(0, appliance.daily_hours_guess !== undefined ? appliance.daily_hours_guess : 6));
    const hoursOff = 24 - hoursOn;

    const dailyActiveKwh = (ratedW * hoursOn) / 1000;
    const dailyStandbyKwh = (standbyW * hoursOff) / 1000;
    const dailyKwh = dailyActiveKwh + dailyStandbyKwh;

    return {
      dailyKwh,
      totalKwh: Number((dailyKwh * days).toFixed(2)),
      description: `${hoursOn} hrs active schedule`
    };
  },

  /**
   * 3. Cyclic: Compressor duty cycle (Refrigerators)
   * Duty cycle varies with BEE star rating (5-star ~35% duty cycle, 3-star ~42%, 1-star ~52%)
   */
  cyclic: (appliance, days = 30, ambientTempC = 32) => {
    const compressorW = appliance.rated_w || 140;
    const star = appliance.bee_star_rating || 3;

    // Base duty cycle calibrated against BEE Indian refrigerator standards
    let baseDutyCycle = 0.42; // 3-star default
    if (star === 5) baseDutyCycle = 0.33;
    else if (star === 4) baseDutyCycle = 0.37;
    else if (star === 2) baseDutyCycle = 0.48;
    else if (star === 1) baseDutyCycle = 0.55;

    // Ambient temperature correction (+1.5% duty cycle per °C above 30°C)
    const tempDelta = Math.max(0, ambientTempC - 30);
    const effectiveDutyCycle = Math.min(0.85, baseDutyCycle + (tempDelta * 0.015));

    const dailyKwh = (compressorW * (effectiveDutyCycle * 24)) / 1000;

    return {
      dailyKwh,
      totalKwh: Number((dailyKwh * days).toFixed(2)),
      dutyCyclePercent: Number((effectiveDutyCycle * 100).toFixed(1)),
      description: `Compressor cycling (${(effectiveDutyCycle * 100).toFixed(0)}% duty cycle)`
    };
  },

  /**
   * 4. Thermostatic: Air Conditioners & Heat Pumps
   * Power draw is a function of indoor setpoint vs outdoor ambient temperature and ISEER
   */
  thermostatic: (appliance, days = 30, ambientTempC = 35, setpointC = 24) => {
    const ratedW = appliance.rated_w || 1500;
    const hours = Math.min(24, Math.max(0, appliance.daily_hours_guess !== undefined ? appliance.daily_hours_guess : 6));
    const star = appliance.bee_star_rating || 3;

    // BEE ISEER Ratings: 5-star ~5.0 ISEER, 3-star ~3.8 ISEER, 1-star ~3.1 ISEER
    let iseer = 3.8;
    if (star === 5) iseer = 5.0;
    else if (star === 4) iseer = 4.3;
    else if (star === 2) iseer = 3.4;
    else if (star === 1) iseer = 3.0;

    // Thermodynamic delta: cooling load increases roughly 6% per degree below ambient
    // Standard rule: Raising AC from 20°C to 24°C saves ~24% compressor work
    const deltaT = Math.max(2, ambientTempC - setpointC);
    const compressorDutyRatio = Math.min(1.0, Math.max(0.35, (deltaT / 12.0) * (4.0 / iseer)));

    const effectiveRunW = ratedW * compressorDutyRatio;
    const dailyKwh = (effectiveRunW * hours) / 1000;

    return {
      dailyKwh,
      totalKwh: Number((dailyKwh * days).toFixed(2)),
      compressorDutyPercent: Number((compressorDutyRatio * 100).toFixed(1)),
      iseer,
      description: `Thermostatic load: ${setpointC}°C target in ${ambientTempC}°C ambient`
    };
  }
};

/**
 * Run a full household 30-day simulation across all installed appliances
 * @param {Array} appliances - List of appliance objects
 * @param {Object} [options] - Ambient temperature, setpoint, billing days, custom tariff
 * @returns {Object} Simulation summary, breakdown, daily timeline, and bill
 */
function simulateHousehold(appliances = [], options = {}) {
  const days = options.days || 30;
  const ambientTempC = options.ambientTempC || 34; // Typical Maharashtra summer/monsoon temp
  const acSetpointC = options.acSetpointC || 24;

  let totalSimKwh = 0;
  const applianceResults = [];
  const roomAggregation = {};

  for (const app of appliances) {
    const modelKind = app.model_kind || (app.catalog && app.catalog.model_kind) || 'scheduled';
    const modelFn = APPLIANCE_MODELS[modelKind] || APPLIANCE_MODELS.scheduled;

    let res;
    if (modelKind === 'thermostatic') {
      res = modelFn(app, days, ambientTempC, acSetpointC);
    } else if (modelKind === 'cyclic') {
      res = modelFn(app, days, ambientTempC);
    } else {
      res = modelFn(app, days);
    }

    totalSimKwh += res.totalKwh;

    const roomName = app.room_name || app.roomName || 'General';
    if (!roomAggregation[roomName]) {
      roomAggregation[roomName] = { kwh: 0, appliancesCount: 0 };
    }
    roomAggregation[roomName].kwh += res.totalKwh;
    roomAggregation[roomName].appliancesCount += 1;

    applianceResults.push({
      id: app.id,
      name: app.custom_name || app.name || 'Appliance',
      category: app.category || 'General',
      modelKind,
      beeStarRating: app.bee_star_rating || 3,
      dailyKwh: Number(res.dailyKwh.toFixed(2)),
      totalKwh: res.totalKwh,
      dailyHours: app.daily_hours_guess || 4,
      details: res.description,
      roomName
    });
  }

  totalSimKwh = Number(totalSimKwh.toFixed(2));

  // Compute bill from pure billEngine
  const computedBill = calculateBill(totalSimKwh, options.customTariff, days);

  // Compute percentage share and estimated cost for each appliance
  const enrichedAppliances = applianceResults.map(a => {
    const share = totalSimKwh > 0 ? Number(((a.totalKwh / totalSimKwh) * 100).toFixed(1)) : 0;
    const estCost = Math.round((share / 100) * computedBill.totalBill);
    return {
      ...a,
      percentageShare: share,
      estimatedCostInr: estCost
    };
  });

  // Sort by highest energy consumer first
  enrichedAppliances.sort((a, b) => b.totalKwh - a.totalKwh);

  // Generate 30-day daily simulated series (with natural weekend variation ±5%)
  const dailySeries = [];
  const baseDailyKwh = totalSimKwh / days;
  for (let d = 1; d <= days; d++) {
    const isWeekend = (d % 7 === 0 || d % 7 === 6);
    const dayFactor = isWeekend ? 1.08 : 0.97; // +8% higher usage on weekends
    const dayKwh = Number((baseDailyKwh * dayFactor).toFixed(2));
    dailySeries.push({
      day: d,
      kwh: dayKwh,
      isWeekend
    });
  }

  return {
    totalUnits: totalSimKwh,
    projectedBill: computedBill.totalBill,
    billingDays: days,
    billBreakdown: computedBill,
    appliances: enrichedAppliances,
    rooms: Object.entries(roomAggregation).map(([room, data]) => ({
      room,
      kwh: Number(data.kwh.toFixed(2)),
      appliancesCount: data.appliancesCount,
      percentageShare: totalSimKwh > 0 ? Number(((data.kwh / totalSimKwh) * 100).toFixed(1)) : 0
    })),
    dailySeries
  };
}

module.exports = {
  APPLIANCE_MODELS,
  simulateHousehold
};
