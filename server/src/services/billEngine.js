/**
 * WattWise Deterministic Bill Engine
 * Official Reference: Maharashtra Electricity Regulatory Commission (MERC)
 * Order Case No. 226 of 2022 / LT-I Residential Tariff Schedule FY 2024-25
 * 
 * PURE FUNCTION: Used across projection, checker, simulation & what-if lab.
 * Zero arithmetic hallucination.
 */

// Default MSEDCL LT-I Residential Single Phase parameters (FY 2024-25)
const DEFAULT_MSEDCL_TARIFF = {
  fixedChargeMonthly: 128.00,
  wheelingChargePerUnit: 1.28,
  facPerUnit: 0.35,
  dutyPercent: 16.0,
  slabs: [
    { order: 1, from: 0, to: 100, rate: 4.41 },
    { order: 2, from: 101, to: 300, rate: 9.64 },
    { order: 3, from: 301, to: 500, rate: 13.61 },
    { order: 4, from: 501, to: null, rate: 15.72 }
  ]
};

/**
 * Calculate an electricity bill from units consumed
 * @param {number} units - Total units (kWh) consumed in the period
 * @param {Object} [customTariff] - Optional custom tariff object
 * @param {number} [billingDays=30] - Number of days in the billing cycle
 * @returns {Object} Comprehensive bill breakdown
 */
function calculateBill(units, customTariff = null, billingDays = 30) {
  const unitsNum = Math.max(0, Number(units) || 0);
  const tariff = customTariff || DEFAULT_MSEDCL_TARIFF;
  const days = Math.max(1, Number(billingDays) || 30);

  // 1. Energy Charges by Slabs
  let remainingUnits = unitsNum;
  let totalEnergyCharges = 0;
  const slabBreakdown = [];

  for (const slab of tariff.slabs) {
    if (remainingUnits <= 0) {
      slabBreakdown.push({
        slabOrder: slab.order,
        range: slab.to ? `${slab.from}-${slab.to}` : `Above ${slab.from - 1}`,
        unitsInSlab: 0,
        rate: slab.rate,
        amount: 0
      });
      continue;
    }

    let unitsInThisSlab = 0;
    if (slab.to !== null) {
      // Slab capacity: 0-100 is 100, 101-300 is 200, 301-500 is 200
      const slabCapacity = (slab.to - slab.from) + (slab.from === 0 ? 0 : 1);
      unitsInThisSlab = Math.min(remainingUnits, slabCapacity);
    } else {
      // Open-ended top tier
      unitsInThisSlab = remainingUnits;
    }

    const slabAmount = Number((unitsInThisSlab * slab.rate).toFixed(2));
    totalEnergyCharges += slabAmount;
    remainingUnits -= unitsInThisSlab;

    slabBreakdown.push({
      slabOrder: slab.order,
      range: slab.to ? `${slab.from}-${slab.to}` : `Above ${slab.from - 1}`,
      unitsInSlab: Number(unitsInThisSlab.toFixed(2)),
      rate: slab.rate,
      amount: slabAmount
    });
  }

  totalEnergyCharges = Number(totalEnergyCharges.toFixed(2));

  // 2. Fixed Charges (Prorated for non-standard billing cycle length)
  const monthlyFixedCharge = tariff.fixedChargeMonthly || 128.00;
  const proratedFixedCharge = Number(((monthlyFixedCharge / 30) * days).toFixed(2));

  // 3. Wheeling Charges (₹1.28 / kWh)
  const wheelingRate = tariff.wheelingChargePerUnit !== undefined ? tariff.wheelingChargePerUnit : 1.28;
  const totalWheelingCharges = Number((unitsNum * wheelingRate).toFixed(2));

  // 4. Fuel Adjustment Charge (FAC)
  const facRate = tariff.facPerUnit !== undefined ? tariff.facPerUnit : 0.35;
  const totalFacCharges = Number((unitsNum * facRate).toFixed(2));

  // 5. Electricity Duty (Maharashtra 16% on subtotal)
  const taxableSubtotal = Number((totalEnergyCharges + proratedFixedCharge + totalWheelingCharges + totalFacCharges).toFixed(2));
  const dutyPercent = tariff.dutyPercent !== undefined ? tariff.dutyPercent : 16.0;
  const totalDuty = Number((taxableSubtotal * (dutyPercent / 100.0)).toFixed(2));

  // 6. Net Total Amount (Rounded to nearest Rupee as per MSEDCL practice)
  const grandTotal = Math.round(taxableSubtotal + totalDuty);

  return {
    units: Number(unitsNum.toFixed(2)),
    billingDays: days,
    slabBreakdown,
    energyCharges: totalEnergyCharges,
    fixedCharges: proratedFixedCharge,
    wheelingCharges: totalWheelingCharges,
    facCharges: totalFacCharges,
    taxableSubtotal,
    dutyPercent,
    dutyAmount: totalDuty,
    totalBill: grandTotal,
    effectiveRatePerUnit: unitsNum > 0 ? Number((grandTotal / unitsNum).toFixed(2)) : 0
  };
}

/**
 * Audit an existing paper bill against official tariff calculation
 * @param {number} unitsBilled - Units stated on the discom bill
 * @param {number} amountBilled - Amount charged on the discom bill
 * @param {Object} [customTariff] - Tariff definition
 * @param {number} [tolerance=5.0] - Allowed variance in rupees
 * @returns {Object} Audit outcome with mismatch flag and detailed diagnostic explanation
 */
function auditBill(unitsBilled, amountBilled, customTariff = null, tolerance = 5.0) {
  const units = Number(unitsBilled) || 0;
  const actualAmount = Number(amountBilled) || 0;
  const recomputed = calculateBill(units, customTariff);

  const difference = Number((actualAmount - recomputed.totalBill).toFixed(2));
  const isMismatch = Math.abs(difference) > tolerance;

  let mismatchReason = null;
  if (isMismatch) {
    if (difference > 0) {
      mismatchReason = `Overcharged by ₹${difference.toFixed(2)}. Discom may have applied higher commercial tariff tier, erroneous arrears, or incorrect fixed charge.`;
    } else {
      mismatchReason = `Undercharged by ₹${Math.abs(difference).toFixed(2)}. Possible prompt payment discount (1%), solar credit rebate, or subsidy applied.`;
    }
  }

  return {
    unitsBilled: units,
    amountBilled: actualAmount,
    amountRecomputed: recomputed.totalBill,
    difference,
    isMismatch,
    mismatchReason,
    recomputedBreakdown: recomputed
  };
}

/**
 * Returns current slab status and distance to next slab boundary
 * @param {number} currentUnits - Month-to-date units
 * @returns {Object} Slab status, remaining units to next tier, and next tier rate penalty
 */
function getSlabGauge(currentUnits) {
  const units = Math.max(0, Number(currentUnits) || 0);

  if (units < 100) {
    return {
      currentSlab: 'Slab 1 (0-100)',
      currentRate: 4.41,
      nextSlab: 'Slab 2 (101-300)',
      nextRate: 9.64,
      unitsRemainingInSlab: Number((100 - units).toFixed(2)),
      penaltyMultiplier: 2.18, // 9.64 / 4.41 = 2.18x jump!
      percentageThroughSlab: Number(((units / 100) * 100).toFixed(1))
    };
  } else if (units < 300) {
    return {
      currentSlab: 'Slab 2 (101-300)',
      currentRate: 9.64,
      nextSlab: 'Slab 3 (301-500)',
      nextRate: 13.61,
      unitsRemainingInSlab: Number((300 - units).toFixed(2)),
      penaltyMultiplier: 1.41,
      percentageThroughSlab: Number((((units - 100) / 200) * 100).toFixed(1))
    };
  } else if (units < 500) {
    return {
      currentSlab: 'Slab 3 (301-500)',
      currentRate: 13.61,
      nextSlab: 'Slab 4 (Above 500)',
      nextRate: 15.72,
      unitsRemainingInSlab: Number((500 - units).toFixed(2)),
      penaltyMultiplier: 1.15,
      percentageThroughSlab: Number((((units - 300) / 200) * 100).toFixed(1))
    };
  } else {
    return {
      currentSlab: 'Slab 4 (Highest Tier)',
      currentRate: 15.72,
      nextSlab: null,
      nextRate: null,
      unitsRemainingInSlab: 0,
      penaltyMultiplier: 1.0,
      percentageThroughSlab: 100.0
    };
  }
}

module.exports = {
  calculateBill,
  auditBill,
  getSlabGauge,
  DEFAULT_MSEDCL_TARIFF
};
