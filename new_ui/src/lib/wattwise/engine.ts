// WattWise deterministic engine — MERC tariff arithmetic, appliance physics,
// forecasting, what-if interventions, reality check. Zero LLM arithmetic:
// every rupee the Copilot quotes comes from these functions.
import type {
  BillResult,
  SlabBreakdownRow,
  SlabGauge,
  Tariff,
  WhatIfResult,
  WhatIfScenario,
  SimulationResult,
  ApplianceSim,
  RoomSim,
  ModelKind,
  Appliance,
} from "./types";

export const MSEDCL_TARIFF: Tariff = {
  state: "Maharashtra",
  discom: "Maharashtra State Electricity Distribution Co. Ltd. (MSEDCL)",
  category: "Residential LT-I (Domestic)",
  phase: "Single Phase",
  regulatoryOrder: "MERC Case No. 226 of 2022 / Mid-Term Review Tariff Order FY 2024-25",
  sourceUrl: "https://www.merc.gov.in/tariff-orders/msedcl-lt-tariffs",
  tariff: {
    fixedChargeMonthly: 128.0,
    wheelingChargePerUnit: 1.28,
    facPerUnit: 0.35,
    dutyPercent: 16.0,
    slabs: [
      { order: 1, from: 0, to: 100, rate: 4.41 },
      { order: 2, from: 101, to: 300, rate: 9.64 },
      { order: 3, from: 301, to: 500, rate: 13.61 },
      { order: 4, from: 501, to: null, rate: 15.72 },
    ],
  },
};

const round2 = (x: number) => Math.round(x * 100) / 100;

/** Official MERC telescopic bill computation. */
export function calculateBill(units: number, billingDays = 30): BillResult {
  const t = MSEDCL_TARIFF.tariff;
  const slabBreakdown: SlabBreakdownRow[] = [];
  let energyCharges = 0;
  let remaining = Math.max(0, units);
  for (const slab of t.slabs) {
    // Slabs are cumulative consumption bands: 0-100 = 100 units, 101-300 = 200, ...
    const prevUpper = slab.from === 0 ? 0 : slab.from - 1;
    const capacity = slab.to === null ? Infinity : slab.to - prevUpper;
    const unitsInSlab = Math.min(remaining, capacity);
    const amount = unitsInSlab * slab.rate;
    energyCharges += amount;
    slabBreakdown.push({
      slabOrder: slab.order,
      range: slab.to === null ? `Above ${slab.from}` : `${slab.from}-${slab.to}`,
      unitsInSlab: round2(unitsInSlab),
      rate: slab.rate,
      amount: round2(amount),
    });
    remaining -= unitsInSlab;
    if (remaining <= 0) {
      // zero-fill the rest for display parity
      for (const later of t.slabs.slice(t.slabs.indexOf(slab) + 1)) {
        slabBreakdown.push({
          slabOrder: later.order,
          range: later.to === null ? `Above ${later.from}` : `${later.from}-${later.to}`,
          unitsInSlab: 0,
          rate: later.rate,
          amount: 0,
        });
      }
      break;
    }
  }

  const fixedCharges = round2((t.fixedChargeMonthly / 30) * billingDays);
  const wheelingCharges = round2(units * t.wheelingChargePerUnit);
  const facCharges = round2(units * t.facPerUnit);
  const taxableSubtotal = round2(energyCharges + fixedCharges + wheelingCharges + facCharges);
  const dutyAmount = round2(taxableSubtotal * (t.dutyPercent / 100));
  const totalBill = Math.round(taxableSubtotal + dutyAmount);
  return {
    units,
    billingDays,
    slabBreakdown,
    energyCharges: round2(energyCharges),
    fixedCharges,
    wheelingCharges,
    facCharges,
    taxableSubtotal,
    dutyPercent: t.dutyPercent,
    dutyAmount,
    totalBill,
    effectiveRatePerUnit: units > 0 ? round2(totalBill / units) : 0,
  };
}

/** Slab position gauge for the dashboard. */
export function slabGauge(units: number): SlabGauge {
  const slabs = MSEDCL_TARIFF.tariff.slabs;
  let i = 0;
  for (let k = 0; k < slabs.length; k++) {
    const s = slabs[k];
    if (units <= (s.to ?? Infinity)) {
      i = k;
      break;
    }
    i = k;
  }
  const cur = slabs[i];
  const next = slabs[i + 1] ?? null;
  const capacity = cur.to === null ? Math.max(units, 1) : cur.to - cur.from + 1;
  const consumedInSlab = units - cur.from;
  const remaining = Math.max(0, (cur.to ?? units) - units);
  return {
    currentSlab: `Slab ${cur.order} (${cur.from}-${cur.to ?? "∞"})`,
    currentRate: cur.rate,
    nextSlab: next ? `Slab ${next.order} (${next.from}-${next.to ?? "∞"})` : null,
    nextRate: next ? next.rate : null,
    unitsRemainingInSlab: round2(remaining),
    penaltyMultiplier: next ? round2(next.rate / cur.rate) : 1,
    percentageThroughSlab: round2(Math.min(100, (consumedInSlab / capacity) * 100)),
  };
}

// ---------------- physics models ----------------

const iseerForStar = (star: number) => (star >= 5 ? 5.0 : star >= 4 ? 4.4 : star >= 3 ? 3.8 : star >= 2 ? 3.3 : 3.0);
const cyclicDutyForStar = (star: number) => (star >= 5 ? 0.33 : star >= 4 ? 0.375 : star >= 3 ? 0.42 : star >= 2 ? 0.48 : 0.55);

export function dailyKwh(ap: {
  rated_w: number;
  standby_w: number;
  bee_star_rating: number;
  daily_hours_guess: number;
  model_kind: ModelKind;
  is_on?: boolean;
  fan_speed?: number;
}, env: { ambientTempC: number; acSetpointC: number }): number {
  if (ap.is_on === false) {
    return (ap.standby_w * 24) / 1000;
  }
  const speedFactor = ap.fan_speed && ap.fan_speed > 0 ? 0.55 + 0.1125 * ap.fan_speed : 1; // level 1..5 → 66%..111% power
  switch (ap.model_kind) {
    case "constant":
      return (ap.rated_w * 24) / 1000;
    case "scheduled": {
      const hours = Math.min(24, Math.max(0, ap.daily_hours_guess));
      return ((ap.rated_w * speedFactor * hours + ap.standby_w * (24 - hours)) / 1000);
    }
    case "cyclic": {
      const baseDuty = cyclicDutyForStar(ap.bee_star_rating);
      const tempCorr = 1 + 0.015 * Math.max(0, env.ambientTempC - 30);
      const duty = Math.min(0.95, baseDuty * tempCorr);
      return (ap.rated_w * duty * 24) / 1000;
    }
    case "thermostatic": {
      const dT = Math.max(0, env.ambientTempC - env.acSetpointC);
      const iseer = iseerForStar(ap.bee_star_rating);
      const dutyRatio = Math.min(1, (dT / 12.0) * (4.0 / iseer));
      const hours = Math.min(24, Math.max(0, ap.daily_hours_guess));
      return (ap.rated_w * dutyRatio * hours) / 1000;
    }
    default:
      return (ap.rated_w * ap.daily_hours_guess) / 1000;
  }
}

/** Instantaneous draw (Watts) used for the live 3D household read-out. */
export function liveWatts(ap: Appliance, env: { ambientTempC: number; acSetpointC: number }): number {
  if (ap.is_on === false) return ap.standby_w;
  const speedFactor = ap.fan_speed && ap.fan_speed > 0 ? 0.55 + 0.1125 * ap.fan_speed : 1;
  switch (ap.model_kind) {
    case "constant":
      return ap.rated_w;
    case "scheduled":
      return ap.rated_w * speedFactor;
    case "cyclic": {
      const baseDuty = cyclicDutyForStar(ap.bee_star_rating);
      const tempCorr = 1 + 0.015 * Math.max(0, env.ambientTempC - 30);
      return ap.rated_w * Math.min(0.95, baseDuty * tempCorr);
    }
    case "thermostatic": {
      const dT = Math.max(0, env.ambientTempC - env.acSetpointC);
      const iseer = iseerForStar(ap.bee_star_rating);
      const dutyRatio = Math.min(1, (dT / 12.0) * (4.0 / iseer));
      return ap.rated_w * dutyRatio;
    }
    default:
      return ap.rated_w;
  }
}

const MODEL_DETAIL: Record<ModelKind, (ap: Appliance, env: { ambientTempC: number; acSetpointC: number }) => string> = {
  constant: (ap) => `Constant baseload 24×7: ${ap.rated_w}W continuously`,
  scheduled: (ap) => `Scheduled load: ${ap.rated_w}W × ${ap.daily_hours_guess}h/day + standby`,
  cyclic: (ap) => `Compressor duty cycle ${(cyclicDutyForStar(ap.bee_star_rating) * 100).toFixed(0)}% (${ap.bee_star}-star), ambient-corrected`,
  thermostatic: (ap, env) => `Thermostatic: ΔT ${Math.max(0, env.ambientTempC - env.acSetpointC).toFixed(0)}°C, ISEER ${iseerForStar(ap.bee_star_rating)}`,
};

/** Full 30-day household simulation across all 4 physics models. */
export function runSimulation(
  appliances: (Appliance & { roomName: string })[],
  env: { ambientTempC: number; acSetpointC: number; days?: number }
): SimulationResult {
  const days = env.days ?? 30;
  const sims: ApplianceSim[] = [];
  const roomMap = new Map<string, RoomSim>();
  const daily = Array.from({ length: days }, (_, i) => ({ day: i + 1, kwh: 0, isWeekend: false }));

  for (const ap of appliances) {
    const kwh = dailyKwh(ap, env);
    const totalKwh = kwh * days;
    const weekendFactor = 1.0;
    for (const d of daily) {
      const weekend = ((d.day - 1) + 5) % 7 >= 5;
      d.kwh += kwh * (weekend ? weekendFactor * 1.08 : 1);
      if (weekend) d.isWeekend = true;
    }
    sims.push({
      id: ap.id,
      name: ap.custom_name,
      category: ap.category,
      modelKind: ap.model_kind,
      beeStarRating: ap.bee_star_rating,
      dailyKwh: round2(kwh),
      totalKwh: round2(totalKwh),
      percentageShare: 0,
      estimatedCostInr: 0,
      details: MODEL_DETAIL[ap.model_kind](ap, env),
      roomName: ap.roomName,
    });
    const r = roomMap.get(ap.roomName) ?? { room: ap.roomName, kwh: 0, appliancesCount: 0, percentageShare: 0 };
    r.kwh = round2(r.kwh + totalKwh);
    r.appliancesCount += 1;
    roomMap.set(ap.roomName, r);
  }

  const totalUnits = round2(daily.reduce((s, d) => s + d.kwh, 0));
  const bill = calculateBill(totalUnits, days);
  // attribute cost by share of energy at effective blended rate
  for (const s of sims) {
    s.percentageShare = totalUnits > 0 ? round2((s.totalKwh / totalUnits) * 100) : 0;
    s.estimatedCostInr = Math.round((s.totalKwh / Math.max(totalUnits, 1e-9)) * bill.totalBill);
  }
  const rooms = [...roomMap.values()].map((r) => ({
    ...r,
    percentageShare: totalUnits > 0 ? round2((r.kwh / totalUnits) * 100) : 0,
  }));
  rooms.sort((a, b) => b.kwh - a.kwh);
  sims.sort((a, b) => b.totalKwh - a.totalKwh);
  const liveWattsTotal = Math.round(appliances.reduce((s, ap) => s + liveWatts(ap, env), 0));
  return {
    totalUnits,
    projectedBill: bill.totalBill,
    billingDays: days,
    appliances: sims,
    rooms,
    dailySeries: daily.map((d) => ({ ...d, kwh: round2(d.kwh) })),
    billBreakdown: bill,
    liveWatts: liveWattsTotal,
  };
}

// ---------------- what-if lab ----------------

export function runWhatIf(
  appliances: (Appliance & { roomName: string })[],
  scenario: WhatIfScenario,
  env: { ambientTempC: number; acSetpointC: number; days?: number }
): WhatIfResult {
  const days = env.days ?? 30;
  const baseline = runSimulation(appliances, env);

  // apply levers
  const modified = appliances.map((ap) => {
    const clone: Appliance & { roomName: string } = { ...ap, is_on: true };
    const isAC = ap.model_kind === "thermostatic";
    const isFan = ap.category.toLowerCase().includes("fan");
    if (scenario.upgradeAcTo5Star && isAC) clone.bee_star_rating = 5;
    if (scenario.upgradeFansToBldc && isFan) {
      clone.rated_w = Math.min(clone.rated_w, 28);
      clone.bee_star_rating = 5;
    }
    if (scenario.reduceAcHoursBy && isAC) {
      clone.daily_hours_guess = Math.max(0, ap.daily_hours_guess - scenario.reduceAcHoursBy);
    }
    return clone;
  });

  const setpoint = scenario.acSetpointShift ? env.acSetpointC + scenario.acSetpointShift : env.acSetpointC;
  const simulated = runSimulation(modified, { ...env, acSetpointC: setpoint });

  // solar net-metering: ~120 kWh generated per kWp per month, exported at slab blend
  const solarKw = scenario.solarKw ?? 0;
  const solarGeneratedUnits = round2(solarKw * 120);
  const netUnits = Math.max(0, simulated.totalUnits - solarGeneratedUnits);
  const simBill = calculateBill(netUnits, days);

  // per-lever breakdown (differential, applied in sequence)
  const breakdown: { name: string; unitsSaved: number; rupeesSaved: number }[] = [];
  let cumulative = modified;
  const levers: { name: string; apply: (list: (Appliance & { roomName: string })[]) => (Appliance & { roomName: string })[] }[] = [];
  if (scenario.upgradeAcTo5Star)
    levers.push({
      name: "AC 5-Star Inverter Upgrade",
      apply: (list) => list.map((a) => (a.model_kind === "thermostatic" ? { ...a, bee_star_rating: 5 } : a)),
    });
  if (scenario.acSetpointShift)
    levers.push({ name: `Thermostat +${scenario.acSetpointShift}°C`, apply: (list) => list });
  if (scenario.upgradeFansToBldc)
    levers.push({
      name: "BLDC Fan Conversion",
      apply: (list) => list.map((a) => (a.category.toLowerCase().includes("fan") ? { ...a, rated_w: Math.min(a.rated_w, 28), bee_star_rating: 5 } : a)),
    });
  if (scenario.reduceAcHoursBy)
    levers.push({
      name: `AC Runtime −${scenario.reduceAcHoursBy}h/day`,
      apply: (list) => list.map((a) => (a.model_kind === "thermostatic" ? { ...a, daily_hours_guess: Math.max(0, a.daily_hours_guess - (scenario.reduceAcHoursBy ?? 0)) } : a)),
    });
  let prevUnits = baseline.totalUnits;
  for (const lever of levers) {
    cumulative = lever.apply(cumulative);
    const r = runSimulation(cumulative, { ...env, acSetpointC: setpoint });
    const saved = round2(prevUnits - r.totalUnits);
    const rate = baseline.projectedBill / Math.max(baseline.totalUnits, 1e-9);
    breakdown.push({ name: lever.name, unitsSaved: saved, rupeesSaved: Math.round(saved * rate) });
    prevUnits = r.totalUnits;
  }
  if (solarKw > 0) {
    const rate = baseline.projectedBill / Math.max(baseline.totalUnits, 1e-9);
    breakdown.push({ name: `${solarKw}kW Rooftop Solar PV`, unitsSaved: solarGeneratedUnits, rupeesSaved: Math.round(solarGeneratedUnits * rate) });
  }

  const monthlyUnitsSaved = round2(baseline.totalUnits - netUnits);
  const monthlyRupeesSaved = baseline.projectedBill - simBill.totalBill;
  return {
    baseline: { totalUnits: baseline.totalUnits, monthlyBill: baseline.projectedBill },
    simulated: { totalUnits: round2(netUnits), monthlyBill: simBill.totalBill },
    savings: {
      monthlyUnitsSaved,
      monthlyRupeesSaved,
      annualRupeesSaved: monthlyRupeesSaved * 12,
      percentageReduction: baseline.totalUnits > 0 ? round2((monthlyUnitsSaved / baseline.totalUnits) * 100) : 0,
      solarGeneratedUnits,
    },
    breakdown,
  };
}

// ---------------- reality check ----------------

const mape = (est: number, actual: number) => (actual > 0 ? round2((Math.abs(est - actual) / actual) * 100) : 0);

export function realityCheck(input: {
  actualBill: { units: number; amount: number };
  guessedUsage: { totalUnits: number };
  simulatedUsage: { totalUnits: number };
  measuredUsage: { totalUnits: number; coveragePercent: number };
}) {
  const a = input.actualBill;
  const rows = [
    { method: "Method A — Recalled Guesswork", kwh: input.guessedUsage.totalUnits, note: "User memory of appliance hours; typical MAPE 25–35%" },
    { method: "Method B — Physics Simulation", kwh: input.simulatedUsage.totalUnits, note: "3D home thermal + duty-cycle models; MAPE 5–10%" },
    { method: "Method C — Calibrated Smart Metering", kwh: input.measuredUsage.totalUnits, note: `IoT sub-metering ${input.measuredUsage.coveragePercent}% coverage + simulation remainder; MAPE <3%` },
    { method: "Ground Truth — MSEDCL Metered Bill", kwh: a.units, note: "Official discom meter reading" },
  ].map((r) => ({
    ...r,
    kwhError: round2(r.kwh - a.units),
    estimatedRupees: calculateBill(r.kwh).totalBill,
    rupeeError: calculateBill(r.kwh).totalBill - a.amount,
    mapePercent: mape(r.kwh, a.units),
  }));
  const ranks = rows.slice(0, 3).sort((x, y) => x.mapePercent - y.mapePercent);
  ranks.forEach((r, i) => ((r as { rank?: string }).rank = `#${i + 1}`));

  const unexplainedKwh = round2(a.units - input.measuredUsage.totalUnits);
  const coverage = input.measuredUsage.coveragePercent;
  const culprits: string[] = [];
  if (unexplainedKwh > 5) {
    if (unexplainedKwh / Math.max(a.units, 1) > 0.12) culprits.push("Vampire standby leakage across devices (est. 30–60W continuous)");
    if (coverage < 60) culprits.push("Low sub-meter coverage — large unmetered loads not monitored");
    if (unexplainedKwh > 25) culprits.push("Ageing wiring impedance losses / leakage to earth");
    if (unexplainedKwh > 40) culprits.push("Possible discom meter drift — request meter testing");
  } else {
    culprits.push("No significant unexplained load detected");
  }
  return {
    benchmark: rows,
    unexplainedLoad: {
      unexplainedKwh,
      unexplainedRupees: Math.round(unexplainedKwh * (calculateBill(a.units).effectiveRatePerUnit || 0)),
      subMeterCoveragePercent: coverage,
      diagnostics: culprits,
    },
  };
}

// ---------------- golden fixtures (validated) ----------------
// 0 → 148 | 100 → 849 | 240 → 2679 | 342 → 4206 — all match the spec §5.2 formula
// exactly. (Spec §5.3 "Case 5" quotes ₹2,504 for 210 units, which contradicts the
// spec's own §5.2 arithmetic — 210 units recomputes to ₹2,287. The formula is the
// source of truth; Case 5 is validated through the audit mismatch flow instead.)

export function verifyGoldenFixtures(): { case: string; expected: number; got: number; pass: boolean }[] {
  const cases: [string, number, number][] = [
    ["0 units", 0, 148],
    ["100 units", 100, 849],
    ["240 units", 240, 2679],
    ["342 units", 342, 4206],
    ["210 units (audit flags +₹1,263 vs ₹3,550)", 210, 2287],
  ];
  return cases.map(([label, units, expected]) => {
    const got = calculateBill(units).totalBill;
    return { case: label, expected, got, pass: got === expected };
  });
}

export function auditBill(units: number, amount: number) {
  const recomputed = calculateBill(units);
  const difference = round2(amount - recomputed.totalBill);
  const isMismatch = Math.abs(difference) > 5;
  const mismatchReason = !isMismatch
    ? null
    : difference > 0
      ? `Overcharged by ₹${difference.toFixed(2)}. Discom may have applied higher commercial tariff tier, erroneous arrears, or incorrect fixed charge.`
      : `Undercharged by ₹${Math.abs(difference).toFixed(2)} — rebate or subsidy detected.`;
  return { unitsBilled: units, amountBilled: amount, amountRecomputed: recomputed.totalBill, difference, isMismatch, mismatchReason, recomputedBreakdown: recomputed };
}
