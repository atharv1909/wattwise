// WattWise client data layer — API client, zustand store, formatters.
"use client";

import { create } from "zustand";
import type {
  Alert,
  Appliance,
  Archetype,
  BillResult,
  Device,
  Household,
  Room,
  SimulationResult,
  SlabGauge,
  Tariff,
  WhatIfResult,
  WhatIfScenario,
  CopilotResponse,
  SplitGroup,
} from "@/lib/wattwise/types";

export const API = "/api/v1";

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`GET ${path}: ${res.status}`);
  return res.json() as Promise<T>;
}

export async function apiSend<T>(method: "POST" | "PATCH" | "DELETE", path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${method} ${path}: ${res.status}`);
  return res.json() as Promise<T>;
}

// ---------- formatters (spec §7.3) ----------

export const inr = (n: number, decimals = 0) =>
  `₹${n.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;

export const kwh = (n: number, decimals = 1) => `${n.toFixed(decimals)} kWh`;

export const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return `${d.getDate().toString().padStart(2, "0")} ${d.toLocaleString("en-IN", { month: "short" })} ${d.getFullYear()}`;
};

// ---------- store ----------

export interface HouseholdBundle {
  household: Household;
  rooms: Room[];
  appliances: Appliance[];
}

export interface ReadingsPayload {
  source: string;
  datasetLabel: string;
  observations: number;
  readings: { reading_date: string; daily_units: number; is_weekend: boolean }[];
  forecast: {
    daysElapsed: number;
    daysTotal: number;
    totalUnitsSoFar: number;
    projectedUnitsMonthEnd: number;
    projectedBill: number;
    avgDailyUnits: number;
    slabGauge: SlabGauge;
  };
}

export interface DevicePayload {
  devices: Device[];
  coveragePercent: number;
}

export interface AlertsPayload {
  alerts: Alert[];
  unread: number;
}

export interface TelemetryFrame {
  deviceId: number;
  householdId: number;
  v: number;
  i: number;
  p: number;
  e_wh: number;
  ts: string;
}

export type ViewKey =
  | "home3d"
  | "dashboard"
  | "auditor"
  | "whatif"
  | "reality"
  | "iot"
  | "splitter"
  | "alerts"
  | "copilot"
  | "admin";

interface WattWiseState {
  view: ViewKey;
  setView: (v: ViewKey) => void;
  selectedApplianceId: number | null;
  selectAppliance: (id: number | null) => void;

  households: Household[];
  activeHouseholdId: number;
  bundle: HouseholdBundle | null;
  tariff: Tariff | null;
  props: { room: string; artifact3d: string; pos: [number, number, number]; rotY?: number; scale?: number }[];
  readings: ReadingsPayload | null;
  devices: DevicePayload | null;
  alerts: AlertsPayload | null;
  sim: SimulationResult | null;
  env: { ambientTempC: number; acSetpointC: number; day: number };
  telemetry: TelemetryFrame | null;
  socketStatus: "connecting" | "live" | "offline";

  loadAll: (householdId?: number) => Promise<void>;
  setActiveHousehold: (id: number) => Promise<void>;
  toggleAppliance: (id: number) => Promise<void>;
  setFanSpeed: (id: number, speed: number) => Promise<void>;
  setEnv: (patch: Partial<WattWiseState["env"]>) => Promise<void>;
  refreshSim: () => Promise<void>;
  markAlertRead: (id: number) => Promise<void>;
  markAllRead: () => Promise<void>;
  runWhatIf: (scenario: WhatIfScenario) => Promise<WhatIfResult>;
  askCopilot: (message: string, lang: string) => Promise<CopilotResponse>;
  setTelemetry: (frame: TelemetryFrame) => void;
  setSocketStatus: (s: WattWiseState["socketStatus"]) => void;
}

export const useWattWise = create<WattWiseState>((set, get) => ({
  view: "home3d",
  setView: (v) => set({ view: v }),
  selectedApplianceId: null,
  selectAppliance: (id) => set({ selectedApplianceId: id }),

  households: [],
  activeHouseholdId: 1,
  bundle: null,
  tariff: null,
  props: [],
  readings: null,
  devices: null,
  alerts: null,
  sim: null,
  env: { ambientTempC: 35, acSetpointC: 24, day: 20 },
  telemetry: null,
  socketStatus: "connecting",

  loadAll: async (householdId) => {
    const id = householdId ?? get().activeHouseholdId;
    const [households, tariff, bundle, props, readings, devices, alerts, simResp] = await Promise.all([
      apiGet<{ households: Household[] }>("/households"),
      apiGet<Tariff>("/tariffs/msedcl"),
      apiGet<HouseholdBundle>(`/households/${id}`),
      apiGet<{ props: WattWiseState["props"] }>(`/props?householdId=${id}`),
      apiGet<ReadingsPayload>(`/readings?source=demo&householdId=${id}`),
      apiGet<DevicePayload>(`/devices/${id}`),
      apiGet<AlertsPayload>(`/alerts/${id}`),
      apiGet<SimulationResult & { env: WattWiseState["env"] }>(`/simulation/run/${id}`),
    ]);
    set({
      households: households.households,
      activeHouseholdId: id,
      tariff,
      bundle,
      props: props.props,
      readings,
      devices,
      alerts,
      sim: simResp,
      env: simResp.env,
    });
  },

  setActiveHousehold: async (id) => {
    await get().loadAll(id);
  },

  toggleAppliance: async (id) => {
    // optimistic update (spec §7.2)
    const bundle = get().bundle;
    if (!bundle) return;
    const appliances = bundle.appliances.map((a) => (a.id === id ? { ...a, is_on: !(a.is_on ?? true) } : a));
    set({ bundle: { ...bundle, appliances } });
    await apiSend("PATCH", `/households/${bundle.household.id}/appliances/${id}`, {
      is_on: appliances.find((a) => a.id === id)?.is_on,
    });
    await get().refreshSim();
  },

  setFanSpeed: async (id, speed) => {
    const bundle = get().bundle;
    if (!bundle) return;
    const appliances = bundle.appliances.map((a) => (a.id === id ? { ...a, fan_speed: speed } : a));
    set({ bundle: { ...bundle, appliances } });
    await apiSend("PATCH", `/households/${bundle.household.id}/appliances/${id}`, { fan_speed: speed });
    await get().refreshSim();
  },

  setEnv: async (patch) => {
    const env = { ...get().env, ...patch };
    set({ env });
    await apiSend("PATCH", "/environment", patch);
    await get().refreshSim();
  },

  refreshSim: async () => {
    const id = get().activeHouseholdId;
    const env = get().env;
    const sim = await apiGet<SimulationResult & { env: WattWiseState["env"] }>(
      `/simulation/run/${id}?ambientTempC=${env.ambientTempC}&acSetpointC=${env.acSetpointC}`
    );
    set({ sim });
  },

  markAlertRead: async (id) => {
    const alerts = get().alerts;
    if (!alerts) return;
    set({
      alerts: {
        alerts: alerts.alerts.map((a) => (a.id === id ? { ...a, is_read: true } : a)),
        unread: Math.max(0, alerts.unread - (alerts.alerts.find((a) => a.id === id)?.is_read ? 0 : 1)),
      },
    });
    await apiSend("PATCH", `/alerts/${id}/read`, { is_read: true });
  },

  markAllRead: async () => {
    const alerts = get().alerts;
    if (!alerts) return;
    set({ alerts: { alerts: alerts.alerts.map((a) => ({ ...a, is_read: true })), unread: 0 } });
    await Promise.all(alerts.alerts.filter((a) => !a.is_read).map((a) => apiSend("PATCH", `/alerts/${a.id}/read`, { is_read: true })));
  },

  runWhatIf: async (scenario) => {
    const id = get().activeHouseholdId;
    const env = get().env;
    return apiSend<WhatIfResult>("POST", "/whatif/scenario", {
      householdId: id,
      scenario,
      options: { acSetpointC: env.acSetpointC },
    });
  },

  askCopilot: async (message, lang) => {
    const id = get().activeHouseholdId;
    return apiSend<CopilotResponse>("POST", "/copilot/chat", { message, lang, householdId: id });
  },

  setTelemetry: (frame) => set({ telemetry: frame }),
  setSocketStatus: (s) => set({ socketStatus: s }),
}));

// archetype display helpers for the 3D carousel
export const ARCHETYPE_CARDS: { key: Archetype; label: string; tagline: string; sqft: string; accent: string }[] = [
  { key: "1BHK", label: "1BHK Compact", tagline: "620 sq.ft starter home", sqft: "620", accent: "#34d399" },
  { key: "2BHK", label: "2BHK Standard", tagline: "910 sq.ft family flat", sqft: "910", accent: "#fbbf24" },
  { key: "3BHK", label: "3BHK Residence", tagline: "1,240 sq.ft with study", sqft: "1240", accent: "#f97316" },
  { key: "PG_Flat", label: "Student PG", tagline: "shared flat, fair splits", sqft: "780", accent: "#a78bfa" },
];

export type { BillResult, SplitGroup };
