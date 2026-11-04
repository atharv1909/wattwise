// WattWise shared domain types (frontend ↔ engine contract)

export type ModelKind = "constant" | "scheduled" | "cyclic" | "thermostatic";
export type Archetype = "1BHK" | "2BHK" | "3BHK" | "PG_Flat";
export type UserRole = "user" | "admin";
export type Severity = "danger" | "warning" | "primary" | "success";
export type DeviceKind = "smart_plug" | "esp32_meter" | "ct_clamp";

export interface TariffSlab {
  order: number;
  from: number;
  to: number | null;
  rate: number;
}

export interface Tariff {
  state: string;
  discom: string;
  category: string;
  phase: string;
  regulatoryOrder: string;
  sourceUrl: string;
  tariff: {
    fixedChargeMonthly: number;
    wheelingChargePerUnit: number;
    facPerUnit: number;
    dutyPercent: number;
    slabs: TariffSlab[];
  };
}

export interface SlabBreakdownRow {
  slabOrder: number;
  range: string;
  unitsInSlab: number;
  rate: number;
  amount: number;
}

export interface BillResult {
  units: number;
  billingDays: number;
  slabBreakdown: SlabBreakdownRow[];
  energyCharges: number;
  fixedCharges: number;
  wheelingCharges: number;
  facCharges: number;
  taxableSubtotal: number;
  dutyPercent: number;
  dutyAmount: number;
  totalBill: number;
  effectiveRatePerUnit: number;
}

export interface SlabGauge {
  currentSlab: string;
  currentRate: number;
  nextSlab: string | null;
  nextRate: number | null;
  unitsRemainingInSlab: number;
  penaltyMultiplier: number;
  percentageThroughSlab: number;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}

export interface Room {
  id: number;
  household_id: number;
  name: string;
  room_type: string;
  /** floorplan rect (meters, house-local coordinates) */
  x: number;
  z: number;
  w: number;
  d: number;
}

export interface Appliance {
  id: number;
  household_id: number;
  room_id: number;
  custom_name: string;
  rated_w: number;
  standby_w: number;
  bee_star_rating: number;
  daily_hours_guess: number;
  model_kind: ModelKind;
  category: string;
  pos_x: number;
  pos_y: number;
  pos_z: number;
  rot_y?: number;
  is_on?: boolean;
  fan_speed?: number;
  /** which SimReady GLB artifact represents this appliance */
  artifact3d?: string;
}

export interface Household {
  id: number;
  user_id: number;
  name: string;
  state: string;
  discom: string;
  connection_type: string;
  category: string;
  tariff_id: number;
  sanctioned_load_kw: number;
  billing_day: number;
  archetype: Archetype;
  consumer_number?: string;
  last_bill_units?: number;
  last_bill_amount?: number;
}

export interface ApplianceSim {
  id: number;
  name: string;
  category: string;
  modelKind: ModelKind;
  beeStarRating: number;
  dailyKwh: number;
  totalKwh: number;
  percentageShare: number;
  estimatedCostInr: number;
  details: string;
  roomName: string;
}

export interface RoomSim {
  room: string;
  kwh: number;
  appliancesCount: number;
  percentageShare: number;
}

export interface SimulationResult {
  totalUnits: number;
  projectedBill: number;
  billingDays: number;
  appliances: ApplianceSim[];
  rooms: RoomSim[];
  dailySeries: { day: number; kwh: number; isWeekend: boolean }[];
  billBreakdown: BillResult;
  liveWatts: number;
}

export interface WhatIfScenario {
  upgradeAcTo5Star?: boolean;
  upgradeFansToBldc?: boolean;
  reduceAcHoursBy?: number;
  solarKw?: number;
  acSetpointShift?: number;
}

export interface WhatIfResult {
  baseline: { totalUnits: number; monthlyBill: number };
  simulated: { totalUnits: number; monthlyBill: number };
  savings: {
    monthlyUnitsSaved: number;
    monthlyRupeesSaved: number;
    annualRupeesSaved: number;
    percentageReduction: number;
    solarGeneratedUnits: number;
  };
  breakdown: { name: string; unitsSaved: number; rupeesSaved: number }[];
}

export interface Reading {
  reading_date: string;
  daily_units: number;
  is_weekend?: boolean;
}

export interface ReadingsResponse {
  source: string;
  datasetLabel: string;
  observations: number;
  readings: Reading[];
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

export interface Device {
  id: number;
  household_id: number;
  name: string;
  kind: DeviceKind;
  appliance_id: number | null;
  linked_appliance_name: string | null;
  last_seen: string;
  is_active: boolean;
  token?: string;
}

export interface Alert {
  id: number;
  household_id: number;
  alert_type: string;
  severity: Severity;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface SplitMember {
  id: number;
  name: string;
  room_name: string;
  share_percentage: number;
  calculated_amount: number;
  measured_units: number;
  status: "paid" | "pending";
}

export interface SplitGroup {
  id: number;
  household_id: number;
  name: string;
  total_bill_amount: number;
  total_units: number;
  billing_month: string;
  method: "equal" | "by_room" | "measured";
  members: SplitMember[];
}

export interface CopilotMetrics {
  monthlyUnitsSaved?: number;
  monthlyRupeesSaved?: number;
  annualRupeesSaved?: number;
  newBillAmount?: number;
  projectedBill?: number;
  totalUnits?: number;
}

export interface CopilotResponse {
  reply: string;
  intent: { type: string; scenario?: WhatIfScenario };
  metrics?: CopilotMetrics;
}

// ---- 3D artifact registry (SimReady assets) ----

export interface ArtifactSpec {
  file: string;
  heightM: number; // real-world height the model is normalized to
  credit: string;
}

export const ARTIFACTS: Record<string, ArtifactSpec> = {
  refrigerator: { file: "refrigerator.glb", heightM: 1.78, credit: "NVIDIA SimReady (CC-BY-4.0)" },
  tv: { file: "tv.glb", heightM: 0.85, credit: "NVIDIA SimReady (CC-BY-4.0)" },
  ceiling_fan: { file: "ceiling_fan.glb", heightM: 0.42, credit: "NVIDIA SimReady (CC-BY-4.0)" },
  ceiling_light: { file: "ceiling_light.glb", heightM: 0.09, credit: "NVIDIA SimReady (CC-BY-4.0)" },
  kitchen_light: { file: "kitchen_light.glb", heightM: 0.06, credit: "NVIDIA SimReady (CC-BY-4.0)" },
  bedside_lamp: { file: "bedside_lamp.glb", heightM: 0.48, credit: "NVIDIA SimReady (CC-BY-4.0)" },
  sofa: { file: "sofa.glb", heightM: 0.82, credit: "NVIDIA SimReady (CC-BY-4.0)" },
  toilet: { file: "toilet.glb", heightM: 0.78, credit: "NVIDIA SimReady (CC-BY-4.0)" },
  sink: { file: "sink.glb", heightM: 0.42, credit: "NVIDIA SimReady (CC-BY-4.0)" },
  mirror: { file: "mirror.glb", heightM: 0.75, credit: "NVIDIA SimReady (CC-BY-4.0)" },
  socket: { file: "socket.glb", heightM: 0.12, credit: "NVIDIA SimReady (CC-BY-4.0)" },
  alarm_clock: { file: "alarm_clock.glb", heightM: 0.12, credit: "NVIDIA SimReady (CC-BY-4.0)" },
  pc_tower: { file: "pc_tower.glb", heightM: 0.45, credit: "NVIDIA SimReady (CC-BY-4.0)" },
  pc_monitor: { file: "pc_monitor.glb", heightM: 0.5, credit: "NVIDIA SimReady (CC-BY-4.0)" },
  keyboard: { file: "keyboard.glb", heightM: 0.03, credit: "NVIDIA SimReady (CC-BY-4.0)" },
  toaster: { file: "toaster.glb", heightM: 0.2, credit: "NVIDIA SimReady (CC-BY-4.0)" },
  extractor: { file: "extractor.glb", heightM: 0.15, credit: "NVIDIA SimReady (CC-BY-4.0)" },
  blinds: { file: "blinds.glb", heightM: 1.4, credit: "NVIDIA SimReady (CC-BY-4.0)" },
  pan: { file: "pan.glb", heightM: 0.1, credit: "NVIDIA SimReady (CC-BY-4.0)" },
  mug: { file: "mug.glb", heightM: 0.1, credit: "NVIDIA SimReady (CC-BY-4.0)" },
  vase: { file: "vase.glb", heightM: 0.28, credit: "NVIDIA SimReady (CC-BY-4.0)" },
  water_cooler: { file: "water_cooler.glb", heightM: 1.05, credit: "NVIDIA SimReady (CC-BY-4.0)" },
  washer: { file: "washer.glb", heightM: 0.99, credit: "LG Electronics SimReady (CC-BY-4.0)" },
  air_purifier: { file: "air_purifier.glb", heightM: 0.78, credit: "LG Electronics SimReady (CC-BY-4.0)" },
  microwave: { file: "microwave.glb", heightM: 0.31, credit: "LG Electronics SimReady (CC-BY-4.0)" },
  gas_range: { file: "gas_range.glb", heightM: 1.12, credit: "LG Electronics SimReady (CC-BY-4.0)" },
  laptop: { file: "laptop.glb", heightM: 0.26, credit: "LG Electronics SimReady (CC-BY-4.0)" },
};

/** procedural artifacts built from geometry (no SimReady equivalent exists) */
export const PROCEDURAL_ARTIFACTS = {
  split_ac: "split_ac",
  router: "router",
  geyser: "geyser",
} as const;

export type ProceduralArtifact = (typeof PROCEDURAL_ARTIFACTS)[keyof typeof PROCEDURAL_ARTIFACTS];
