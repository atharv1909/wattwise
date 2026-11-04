// WattWise in-memory store — mirrors the spec's fallback mode: the API behaves
// identically whether or not MySQL is present. This demo runs fully in memory,
// seeded with demonstration households, golden bills, appliances and devices.
import { MSEDCL_TARIFF, auditBill, calculateBill, runSimulation, runWhatIf, realityCheck, slabGauge } from "./engine";
import {
  buildAppliances,
  buildRooms,
  indexRooms,
  SEED_ALERTS,
  SEED_DEVICES,
  SEED_HOUSEHOLDS,
  SEED_SPLIT_GROUPS,
  synthReadings,
  DATA_SOURCES,
  FLOORPLANS,
  COMMON_PROPS,
} from "./seed";
import type {
  Alert,
  Appliance,
  BillResult,
  Device,
  Household,
  Room,
  SplitGroup,
  User,
} from "./types";

export interface Store {
  users: User[];
  households: (Household & { billingDays?: number })[];
  rooms: Room[];
  appliances: Appliance[];
  devices: Device[];
  alerts: Alert[];
  splitGroups: SplitGroup[];
  billHistory: { id: number; household_id: number; units: number; amount: number; amountRecomputed: number; difference: number; isMismatch: boolean; month: string }[];
  env: { ambientTempC: number; acSetpointC: number; day: number };
  nextId: { appliance: number; device: number; alert: number; split: number; member: number };
}

function nowIso(): string {
  return new Date().toISOString();
}

function buildStore(): Store {
  const rooms = buildRooms();
  indexRooms(rooms);
  const appliances = buildAppliances();
  const devices: Device[] = SEED_DEVICES.map((d) => ({ ...d, last_seen: nowIso() }));
  const alerts: Alert[] = SEED_ALERTS.map((a) => ({ ...a, created_at: nowIso() }));
  const store: Store = {
    users: [
      { id: 1, name: "Aditya Sharma", email: "demo@wattwise.in", role: "user" },
      { id: 2, name: "Evaluator Admin", email: "admin@wattwise.in", role: "admin" },
    ],
    households: SEED_HOUSEHOLDS.map((h) => ({ ...h })) as Household[],
    rooms,
    appliances,
    devices,
    alerts,
    splitGroups: SEED_SPLIT_GROUPS.map((g) => ({ ...g, members: g.members.map((m) => ({ ...m })) })),
    billHistory: [
      { id: 1, household_id: 1, units: 210, amount: 3550, amountRecomputed: calculateBill(210).totalBill, difference: Math.round(3550 - calculateBill(210).totalBill), isMismatch: true, month: "2026-07" },
      { id: 2, household_id: 1, units: 240, amount: 2679, amountRecomputed: 2679, difference: 0, isMismatch: false, month: "2026-08" },
      { id: 3, household_id: 1, units: 342, amount: 4206, amountRecomputed: 4206, difference: 0, isMismatch: false, month: "2026-09" },
    ],
    env: { ambientTempC: 35, acSetpointC: 24, day: 20 },
    nextId: { appliance: 100, device: 100, alert: 100, split: 10, member: 10 },
  };
  return store;
}

// survive dev-server module reloads across requests
const g = globalThis as unknown as { __wattwise_store?: Store };
export function getStore(): Store {
  if (!g.__wattwise_store) g.__wattwise_store = buildStore();
  return g.__wattwise_store;
}

export function resetStore(): Store {
  g.__wattwise_store = buildStore();
  return g.__wattwise_store;
}

// ---------- derived helpers ----------

export function appliancesOf(store: Store, householdId: number): (Appliance & { roomName: string })[] {
  const roomName = new Map(store.rooms.filter((r) => r.household_id === householdId).map((r) => [r.id, r.name]));
  return store.appliances
    .filter((a) => a.household_id === householdId)
    .map((a) => ({ ...a, roomName: roomName.get(a.room_id) ?? "Unknown" }));
}

export function householdDetail(store: Store, householdId: number) {
  const household = store.households.find((h) => h.id === householdId);
  if (!household) return null;
  const rooms = store.rooms.filter((r) => r.household_id === householdId);
  const appliances = store.appliances.filter((a) => a.household_id === householdId);
  return { household, rooms, appliances };
}

export function simulateHousehold(store: Store, householdId: number, envOverride?: Partial<Store["env"]>, days = 30) {
  const env = { ...store.env, ...envOverride };
  const apps = appliancesOf(store, householdId);
  const result = runSimulation(apps, { ambientTempC: env.ambientTempC, acSetpointC: env.acSetpointC, days });
  return { result, env };
}

export function computeSplit(store: Store, groupId: number) {
  const group = store.splitGroups.find((g) => g.id === groupId);
  if (!group) return null;
  const apps = appliancesOf(store, group.household_id);
  const members = group.members.map((m) => ({ ...m }));
  if (group.method === "equal") {
    const each = group.total_bill_amount / Math.max(members.length, 1);
    for (const m of members) {
      m.share_percentage = Math.round((100 / members.length) * 100) / 100;
      m.calculated_amount = Math.round(each * 100) / 100;
    }
  } else if (group.method === "by_room") {
    // weight: rooms with AC get 3x weight, with high-wattage appliances 2x, else 1x
    const roomName = new Map(store.rooms.filter((r) => r.household_id === group.household_id).map((r) => [r.name, r.id]));
    const weights = members.map((m) => {
      const roomId = roomName.get(m.room_name);
      const roomApps = apps.filter((a) => a.room_id === roomId);
      const hasAC = roomApps.some((a) => a.model_kind === "thermostatic");
      const watts = roomApps.reduce((s, a) => s + a.rated_w * (a.daily_hours_guess / 24), 0);
      return hasAC ? Math.max(3, watts / 60) : Math.max(1, watts / 60);
    });
    const total = weights.reduce((s, w) => s + w, 0);
    members.forEach((m, i) => {
      m.share_percentage = Math.round((weights[i] / total) * 10000) / 100;
      m.calculated_amount = Math.round(((weights[i] / total) * group.total_bill_amount) * 100) / 100;
      m.measured_units = Math.round(((weights[i] / total) * group.total_units) * 10) / 10;
    });
  } else {
    // measured: proportional to simulated per-room kWh
    const roomName = new Map(store.rooms.filter((r) => r.household_id === group.household_id).map((r) => [r.name, r.id]));
    const sim = runSimulation(apps, store.env);
    const roomKwh = new Map(sim.rooms.map((r) => [r.room, r.kwh]));
    const units = members.map((m) => roomKwh.get(m.room_name) ?? 1);
    const total = units.reduce((s, u) => s + u, 0);
    members.forEach((m, i) => {
      m.share_percentage = Math.round((units[i] / total) * 10000) / 100;
      m.calculated_amount = Math.round(((units[i] / total) * group.total_bill_amount) * 100) / 100;
      m.measured_units = Math.round(((units[i] / total) * group.total_units) * 10) / 10;
    });
  }
  return { success: true, total_bill_amount: group.total_bill_amount, total_units: group.total_units, method: group.method, members };
}

// ---------- copilot (deterministic, multilingual) ----------

export function copilotReply(message: string, lang: string, householdId: number) {
  const store = getStore();
  const m = message.toLowerCase();
  const has = (...keys: string[]) => keys.some((k) => m.includes(k));
  const sim = simulateHousehold(store, householdId);
  const apps = appliancesOf(store, householdId);
  let intentType = "general";
  let scenario: Record<string, unknown> = {};
  let metrics: Record<string, number> | undefined;
  let replyEn: string;

  if (has("5 star", "five star", "५ स्टार", "पाच स्टार", "5-star")) {
    intentType = "whatif";
    scenario = { upgradeAcTo5Star: true };
    const r = runWhatIf(apps, { upgradeAcTo5Star: true }, store.env);
    metrics = { monthlyUnitsSaved: r.savings.monthlyUnitsSaved, monthlyRupeesSaved: r.savings.monthlyRupeesSaved, annualRupeesSaved: r.savings.annualRupeesSaved, newBillAmount: r.simulated.monthlyBill };
    replyEn = `Upgrading to a BEE 5-Star Inverter AC will save approximately ₹${r.savings.monthlyRupeesSaved.toLocaleString("en-IN")} per month (${r.savings.monthlyUnitsSaved} kWh reduced). Your projected monthly bill will drop from ₹${r.baseline.monthlyBill.toLocaleString("en-IN")} to ₹${r.simulated.monthlyBill.toLocaleString("en-IN")}.`;
  } else if (has("bldc", "fan upgrade", "पंखा बदल", "बीएलडीसी")) {
    intentType = "whatif";
    scenario = { upgradeFansToBldc: true };
    const r = runWhatIf(apps, { upgradeFansToBldc: true }, store.env);
    metrics = { monthlyUnitsSaved: r.savings.monthlyUnitsSaved, monthlyRupeesSaved: r.savings.monthlyRupeesSaved, annualRupeesSaved: r.savings.annualRupeesSaved, newBillAmount: r.simulated.monthlyBill };
    replyEn = `Converting your ceiling fans to BLDC motors saves about ₹${r.savings.monthlyRupeesSaved.toLocaleString("en-IN")}/month (${r.savings.monthlyUnitsSaved} kWh). New projected bill: ₹${r.simulated.monthlyBill.toLocaleString("en-IN")}.`;
  } else if (has("solar", "rooftop", "सोलर", "छत")) {
    intentType = "whatif";
    scenario = { solarKw: 3 };
    const r = runWhatIf(apps, { solarKw: 3 }, store.env);
    metrics = { monthlyUnitsSaved: r.savings.monthlyUnitsSaved, monthlyRupeesSaved: r.savings.monthlyRupeesSaved, annualRupeesSaved: r.savings.annualRupeesSaved, newBillAmount: r.simulated.monthlyBill };
    replyEn = `A 3kW rooftop solar PV system generates about 360 units/month under net-metering, saving roughly ₹${r.savings.monthlyRupeesSaved.toLocaleString("en-IN")}/month (₹${r.savings.annualRupeesSaved.toLocaleString("en-IN")}/year).`;
  } else if (has("setpoint", "thermostat", "temperature", "ac temp", "तापमान", "सेटपॉइंट")) {
    intentType = "whatif";
    scenario = { acSetpointShift: 2 };
    const r = runWhatIf(apps, { acSetpointShift: 2 }, store.env);
    metrics = { monthlyUnitsSaved: r.savings.monthlyUnitsSaved, monthlyRupeesSaved: r.savings.monthlyRupeesSaved, newBillAmount: r.simulated.monthlyBill };
    replyEn = `Raising the AC setpoint by 2°C cuts compressor energy roughly 12% — about ₹${r.savings.monthlyRupeesSaved.toLocaleString("en-IN")}/month (${r.savings.monthlyUnitsSaved} kWh) at your current usage.`;
  } else if (has("slab", "breach", "cross", "स्लैब", "शुल्क वाढ")) {
    intentType = "slab";
    const g = slabGauge(sim.result.totalUnits * (store.env.day / 30));
    metrics = { totalUnits: sim.result.totalUnits, projectedBill: sim.result.projectedBill };
    replyEn = `At day ${store.env.day} of your cycle you're in ${g.currentSlab} at ₹${g.currentRate}/kWh. ${g.nextSlab ? `Crossing into ${g.nextSlab} jumps the marginal rate to ₹${g.nextRate}/kWh (×${g.penaltyMultiplier}). ${g.unitsRemainingInSlab} units remain in the current slab.` : "You are in the top slab."}`;
  } else if (has("bill", "amount", "kitna", "बिल", "किती")) {
    intentType = "bill_forecast";
    metrics = { totalUnits: sim.result.totalUnits, projectedBill: sim.result.projectedBill };
    replyEn = `Your simulated month-end consumption is ${sim.result.totalUnits} kWh, projecting a full statutory bill of ₹${sim.result.projectedBill.toLocaleString("en-IN")} (MERC Case No. 226 of 2022 arithmetic, 16% electricity duty included).`;
  } else {
    intentType = "general";
    metrics = { totalUnits: sim.result.totalUnits, projectedBill: sim.result.projectedBill };
    replyEn = `I can forecast bills, audit paper bills against MERC rules and compute savings. Right now your household is projected at ${sim.result.totalUnits} kWh / ₹${sim.result.projectedBill.toLocaleString("en-IN")} this month. Try asking: "What will I save if I buy a 5 star AC?"`;
  }

  const replies: Record<string, string> = {
    en: replyEn,
    hi: replyEn, // English answer + verified metrics card (numbers identical across languages)
    mr: replyEn,
  };
  if (lang === "hi") {
    replies.hi = "उत्तर (सत्यापित गणना): " + replyEn;
  } else if (lang === "mr") {
    replies.mr = "उत्तर (पडताळलेली गणना): " + replyEn;
  }
  return { reply: replies[lang] ?? replyEn, intent: { type: intentType, scenario }, metrics };
}

// ---------- admin stats ----------

export function adminStats(store: Store) {
  const totalAppliances = store.appliances.length;
  const totalBills = store.billHistory.length;
  const mismatched = store.billHistory.filter((b) => b.isMismatch).length;
  const archetypeDistribution: Record<string, number> = {};
  for (const h of store.households) archetypeDistribution[h.archetype] = (archetypeDistribution[h.archetype] ?? 0) + 1;
  const applianceCategories: Record<string, number> = {};
  for (const a of store.appliances) applianceCategories[a.category] = (applianceCategories[a.category] ?? 0) + 1;
  return {
    summary: {
      totalHouseholds: store.households.length,
      totalAppliances,
      totalBillsAudited: totalBills,
      mismatchedBills: mismatched,
      auditMismatchRatePercent: totalBills > 0 ? Math.round((mismatched / totalBills) * 1000) / 10 : 0,
      activeTariff: "MSEDCL Residential LT-I (FY 2024-25)",
    },
    archetypeDistribution,
    applianceCategories,
    goldenFixtures: [
      { case: "0 units → ₹148", pass: calculateBill(0).totalBill === 148 },
      { case: "100 units → ₹849", pass: calculateBill(100).totalBill === 849 },
      { case: "240 units → ₹2,679", pass: calculateBill(240).totalBill === 2679 },
      { case: "342 units → ₹4,206", pass: calculateBill(342).totalBill === 4206 },
    ],
    views: [
      { name: "v_monthly_usage", status: "ready", engine: "InMemory", note: "Exposed for Power BI / Tableau desktop connect" },
      { name: "v_appliance_share", status: "ready", engine: "InMemory", note: "Per-appliance kWh + rupee share" },
    ],
  };
}

export { MSEDCL_TARIFF, auditBill, calculateBill, runSimulation, runWhatIf, realityCheck, slabGauge, synthReadings, DATA_SOURCES, FLOORPLANS, COMMON_PROPS };
