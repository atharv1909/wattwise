/**
 * WattWise What-If Lab Service
 * Simulates appliance upgrades, usage habit shifts, and solar generation.
 * Calculates exact monthly and annual savings and slab drops.
 */

const { calculateBill } = require('./billEngine');
const { simulateHousehold } = require('./simEngine');

/**
 * Run a comparative what-if scenario
 * @param {Array} currentAppliances - List of existing household appliances
 * @param {Object} scenario - What-if scenario parameters
 * @param {Object} [options] - Ambient temperature, billing days, custom tariff
 * @returns {Object} Baseline vs Scenario comparison, monthly/annual savings, and slab shift
 */
function runWhatIfScenario(currentAppliances = [], scenario = {}, options = {}) {
  // 1. Run Baseline Simulation
  const baselineSim = simulateHousehold(currentAppliances, options);
  const baselineKwh = baselineSim.totalUnits;
  const baselineBill = baselineSim.projectedBill;

  // 2. Clone appliances and apply scenario modifications
  const modifiedAppliances = currentAppliances.map(app => ({ ...app }));

  let scenarioDescription = [];
  let solarGenerationMonthlyKwh = 0;

  // Modification A: Upgrade AC to 5-Star Inverter AC
  if (scenario.upgradeAcTo5Star) {
    modifiedAppliances.forEach(app => {
      const isAc = (app.category && app.category.toLowerCase().includes('ac')) ||
                   (app.custom_name && app.custom_name.toLowerCase().includes('ac')) ||
                   app.model_kind === 'thermostatic';
      if (isAc && (app.bee_star_rating || 3) < 5) {
        app.bee_star_rating = 5;
        app.rated_w = Math.round(app.rated_w * 0.70); // 30% reduction in power draw
        scenarioDescription.push(`Upgraded ${app.custom_name || 'AC'} to 5-Star Inverter model (ISEER 5.0)`);
      }
    });
  }

  // Modification B: Change AC Setpoint (e.g. from 22°C to 24°C or 26°C)
  const targetSetpoint = scenario.acSetpointC !== undefined ? Number(scenario.acSetpointC) : (options.acSetpointC || 24);
  const originalSetpoint = options.acSetpointC || 22;
  if (targetSetpoint !== originalSetpoint) {
    scenarioDescription.push(`Adjusted AC thermostat setpoint from ${originalSetpoint}°C to ${targetSetpoint}°C (+6% energy saving per °C)`);
  }

  // Modification C: Upgrade conventional ceiling fans to 5-Star BLDC (75W -> 28W)
  if (scenario.upgradeFansToBldc) {
    modifiedAppliances.forEach(app => {
      const isFan = (app.category && app.category.toLowerCase().includes('fan')) ||
                    (app.custom_name && app.custom_name.toLowerCase().includes('fan'));
      if (isFan && (app.rated_w || 75) > 35) {
        app.rated_w = 28; // Standard 5-star BLDC rating
        app.bee_star_rating = 5;
        scenarioDescription.push(`Replaced standard fan (${app.custom_name}) with 28W 5-Star BLDC`);
      }
    });
  }

  // Modification D: Shift or Reduce AC running hours
  if (scenario.reduceAcHoursBy && Number(scenario.reduceAcHoursBy) > 0) {
    const hoursToCut = Number(scenario.reduceAcHoursBy);
    modifiedAppliances.forEach(app => {
      const isAc = (app.category && app.category.toLowerCase().includes('ac')) ||
                   (app.custom_name && app.custom_name.toLowerCase().includes('ac')) ||
                   app.model_kind === 'thermostatic';
      if (isAc) {
        const curHours = app.daily_hours_guess || 6;
        app.daily_hours_guess = Math.max(0, curHours - hoursToCut);
        scenarioDescription.push(`Reduced ${app.custom_name || 'AC'} runtime by ${hoursToCut} hrs/day`);
      }
    });
  }

  // Modification E: Rooftop Solar Net Metering (kWp)
  // Maharashtra average: ~4.0 kWh generated per day per 1 kWp installed capacity
  if (scenario.solarKw && Number(scenario.solarKw) > 0) {
    const solarCapacityKw = Number(scenario.solarKw);
    const dailyGenKwh = solarCapacityKw * 4.0;
    solarGenerationMonthlyKwh = Number((dailyGenKwh * 30).toFixed(1));
    scenarioDescription.push(`Installed ${solarCapacityKw} kWp Rooftop Solar (generates ~${solarGenerationMonthlyKwh} units/month)`);
  }

  // 3. Run Scenario Simulation
  const scenarioOptions = {
    ...options,
    acSetpointC: targetSetpoint
  };
  const scenarioSim = simulateHousehold(modifiedAppliances, scenarioOptions);
  
  // Apply solar net-metering offset if present
  const netScenarioUnits = Math.max(0, Number((scenarioSim.totalUnits - solarGenerationMonthlyKwh).toFixed(2)));
  const scenarioBill = calculateBill(netScenarioUnits, options.customTariff, options.days || 30);

  // 4. Calculate Deltas and Annualized Savings
  const monthlyUnitsSaved = Number((baselineKwh - netScenarioUnits).toFixed(2));
  const monthlyRupeesSaved = Math.max(0, baselineBill - scenarioBill.totalBill);
  const annualRupeesSaved = monthlyRupeesSaved * 12;
  const percentSaved = baselineBill > 0 ? Number(((monthlyRupeesSaved / baselineBill) * 100).toFixed(1)) : 0;

  // Determine if this dropped the user into a lower tariff slab
  const baselineSlab = baselineSim.billBreakdown.slabBreakdown.filter(s => s.unitsInSlab > 0).pop();
  const scenarioSlab = scenarioBill.slabBreakdown.filter(s => s.unitsInSlab > 0).pop();
  const droppedSlab = (baselineSlab && scenarioSlab && baselineSlab.slabOrder > scenarioSlab.slabOrder);

  return {
    scenarioDescription: scenarioDescription.length > 0 ? scenarioDescription : ['Baseline comparison run'],
    baseline: {
      units: baselineKwh,
      billAmount: baselineBill,
      slab: baselineSlab ? baselineSlab.range : '0-100'
    },
    scenario: {
      grossUnits: scenarioSim.totalUnits,
      solarGenerationUnits: solarGenerationMonthlyKwh,
      netUnits: netScenarioUnits,
      billAmount: scenarioBill.totalBill,
      slab: scenarioSlab ? scenarioSlab.range : '0-100'
    },
    savings: {
      monthlyUnitsSaved,
      monthlyRupeesSaved,
      annualRupeesSaved,
      percentSaved,
      droppedSlab,
      slabDroppedMessage: droppedSlab
        ? `Great news! You dropped from ${baselineSlab.range} to ${scenarioSlab.range}, eliminating higher tier marginal charges.`
        : null
    },
    modifiedAppliances: scenarioSim.appliances
  };
}

module.exports = {
  runWhatIfScenario
};
