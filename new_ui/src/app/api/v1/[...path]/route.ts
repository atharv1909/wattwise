// WattWise REST API — implements the complete /api/v1 contract from the
// Frontend Developer Specification. Runs against the in-memory store (the
// spec's no-MySQL fallback), so every endpoint works with zero setup.
import { NextRequest, NextResponse } from "next/server";
import {
  adminStats,
  appliancesOf,
  auditBill,
  calculateBill,
  COMMON_PROPS,
  computeSplit,
  copilotReply,
  getStore,
  householdDetail,
  MSEDCL_TARIFF,
  simulateHousehold,
  slabGauge,
  synthReadings,
  DATA_SOURCES,
  runWhatIf,
  realityCheck,
} from "@/lib/wattwise/store";
import { FLOORPLANS, ARCH_SEED } from "@/lib/wattwise/seed";
import { fetchRealReadings, fetchRealBillHistory, fetchRealAdminStats } from "@/lib/wattwise/realData";

export const dynamic = "force-dynamic";

const ok = (data: unknown, status = 200) => NextResponse.json(data, { status });
const err = (code: string, message: string, status = 400, details: unknown[] = []) =>
  NextResponse.json({ error: { code, message, details } }, { status });

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const store = getStore();
  const q = req.nextUrl.searchParams;
  const route = path.join("/");

  try {
    switch (route) {
      case "":
      case "health":
        return NextResponse.json({ status: "ok", project: "WattWise", version: "1.0.0" });

      case "tariffs/msedcl":
        return ok(MSEDCL_TARIFF);

      case "tariffs/gauge": {
        const units = Number(q.get("units") ?? 0);
        if (Number.isNaN(units)) return err("INVALID_INPUT", "units parameter must be numeric");
        return ok(slabGauge(units));
      }

      case "households":
        return ok({ households: store.households });

      case "auth/me":
        return ok({ user: store.users[0] });

      case "floorplans": {
        const archetype = q.get("archetype");
        if (archetype && archetype in FLOORPLANS) return ok(FLOORPLANS[archetype as keyof typeof FLOORPLANS]);
        return ok(FLOORPLANS);
      }

      case "props": {
        const householdId = Number(q.get("householdId") ?? 1);
        const h = store.households.find((x) => x.id === householdId);
        if (!h) return err("NOT_FOUND", "household not found", 404);
        return ok({ props: COMMON_PROPS[h.archetype] ?? [] });
      }

      default: {
        const mHousehold = route.match(/^households\/(\d+)$/);
        if (mHousehold) {
          const detail = householdDetail(store, Number(mHousehold[1]));
          if (!detail) return err("NOT_FOUND", "household not found", 404);
          return ok(detail);
        }
        const mApps = route.match(/^households\/(\d+)\/appliances$/);
        if (mApps) {
          const apps = store.appliances.filter((a) => a.household_id === Number(mApps[1]));
          return ok({ appliances: apps });
        }
        const mHistory = route.match(/^bills\/history\/(\d+)$/);
        if (mHistory) {
          const realHistory = await fetchRealBillHistory(Number(mHistory[1]));
          if (realHistory && realHistory.length > 0) {
            return ok({ bills: realHistory });
          }
          return ok({ bills: store.billHistory.filter((b) => b.household_id === Number(mHistory[1])) });
        }
        if (route === "readings") {
          const source = q.get("source") ?? "demo";
          const householdId = Number(q.get("householdId") ?? 1);
          const realData = await fetchRealReadings(source, householdId);
          return ok(realData);
        }
        const mDevices = route.match(/^devices\/(\d+)$/);
        if (mDevices) {
          const devices = store.devices.filter((d) => d.household_id === Number(mDevices[1]));
          const covered = devices.reduce((s, d) => s + (d.is_active && d.appliance_id ? 1 : 0), 0);
          const total = store.appliances.filter((a) => a.household_id === Number(mDevices[1])).length;
          return ok({ devices, coveragePercent: total > 0 ? Math.round((covered / total) * 100) : 0 });
        }
        const mAlerts = route.match(/^alerts\/(\d+)$/);
        if (mAlerts) {
          const alerts = store.alerts.filter((a) => a.household_id === Number(mAlerts[1]));
          return ok({ alerts, unread: alerts.filter((a) => !a.is_read).length });
        }
        const mSplitCalc = route.match(/^split\/groups\/(\d+)\/calculate$/);
        if (mSplitCalc) {
          const result = computeSplit(store, Number(mSplitCalc[1]));
          if (!result) return err("NOT_FOUND", "split group not found", 404);
          return ok(result);
        }
        const mSplitH = route.match(/^split\/groups\/household\/(\d+)$/);
        if (mSplitH) {
          return ok({ groups: store.splitGroups.filter((g) => g.household_id === Number(mSplitH[1])) });
        }
        const mSplitAll = route.match(/^split\/groups\/(\d+)$/);
        if (mSplitAll) {
          const g = store.splitGroups.find((x) => x.id === Number(mSplitAll[1]));
          if (!g) return err("NOT_FOUND", "split group not found", 404);
          return ok({ groups: [g] });
        }
        if (route === "admin/stats") {
          const realStats = await fetchRealAdminStats();
          if (realStats) return ok(realStats);
          return ok(adminStats(store));
        }
        const mSim = route.match(/^simulation\/run\/(\d+)$/);
        if (mSim) {
          const { result, env } = simulateHousehold(store, Number(mSim[1]), {
            ambientTempC: Number(q.get("ambientTempC") ?? store.env.ambientTempC),
            acSetpointC: Number(q.get("acSetpointC") ?? store.env.acSetpointC),
          });
          return ok({ ...result, env });
        }
        return err("NOT_FOUND", `no route for /api/v1/${route}`, 404);
      }
    }
  } catch (e) {
    return err("INTERNAL", e instanceof Error ? e.message : "internal error", 500);
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const store = getStore();
  const route = path.join("/");
  const body = await req.json().catch(() => ({}));

  try {
    switch (route) {
      case "auth/register": {
        const { name, email, password } = body as { name?: string; email?: string; password?: string };
        if (!name || !email || !password) return err("INVALID_INPUT", "name, email and password are required");
        const user = { id: store.users.length + 1, name, email, role: "user" as const };
        store.users.push(user);
        return ok({ success: true, user, token: "demo-jwt-token" }, 201);
      }
      case "auth/login": {
        const { email } = body as { email?: string };
        const user = store.users.find((u) => u.email === email) ?? store.users[0];
        return ok({ success: true, user, token: "demo-jwt-token" });
      }
      case "bills/calculate": {
        const { units, billingDays } = body as { units?: number; billingDays?: number };
        if (units === undefined || units === null) return err("INVALID_INPUT", "units parameter is required");
        return ok(calculateBill(Number(units), Number(billingDays ?? 30)));
      }
      case "bills/audit": {
        const { units, amount, billMonth, householdId } = body as { units?: number; amount?: number; billMonth?: string; householdId?: number };
        if (units === undefined || amount === undefined) return err("INVALID_INPUT", "units and amount are required");
        const audit = auditBill(Number(units), Number(amount));
        if (householdId) {
          store.billHistory.push({
            id: store.billHistory.length + 1,
            household_id: Number(householdId),
            units: Number(units),
            amount: Number(amount),
            amountRecomputed: audit.amountRecomputed,
            difference: audit.difference,
            isMismatch: audit.isMismatch,
            month: billMonth ?? new Date().toISOString().slice(0, 7),
          });
        }
        return ok(audit);
      }
      case "simulation/run": {
        const { householdId = 1, ambientTempC, acSetpointC, days } = body as { householdId?: number; ambientTempC?: number; acSetpointC?: number; days?: number };
        const { result, env } = simulateHousehold(store, Number(householdId), { ambientTempC, acSetpointC }, days ?? 30);
        return ok({ ...result, env });
      }
      case "whatif/scenario": {
        const { householdId = 1, scenario = {}, options } = body as { householdId?: number; scenario?: Record<string, unknown>; options?: { acSetpointC?: number } };
        const apps = appliancesOf(store, Number(householdId));
        const env = { ...store.env, acSetpointC: options?.acSetpointC ?? store.env.acSetpointC };
        const result = runWhatIf(apps, scenario as Parameters<typeof runWhatIf>[1], env);
        return ok(result);
      }
      case "whatif/reality-check": {
        const result = realityCheck(body as Parameters<typeof realityCheck>[0]);
        return ok(result);
      }
      case "readings": {
        const { source = "demo", units, reading_date } = body as { source?: string; units?: number; reading_date?: string };
        const readings = synthReadings(source, store.env.day);
        readings.push({ date: reading_date ?? new Date().toISOString().slice(0, 10), units: Number(units ?? 0), weekend: false });
        return ok({ success: true, readings });
      }
      case "devices": {
        const { household_id = 1, name, kind = "smart_plug", appliance_id = null } = body as { household_id?: number; name?: string; kind?: string; appliance_id?: number | null };
        if (!name) return err("INVALID_INPUT", "name is required");
        const linked = store.appliances.find((a) => a.id === appliance_id);
        const token = `ww_live_${Math.random().toString(16).slice(2, 14)}`;
        const device = {
          id: store.nextId.device++,
          household_id: Number(household_id),
          name,
          kind: kind as "smart_plug" | "esp32_meter" | "ct_clamp",
          appliance_id: appliance_id ?? null,
          linked_appliance_name: linked?.custom_name ?? null,
          last_seen: new Date().toISOString(),
          is_active: true,
          token,
        };
        store.devices.push(device);
        return ok({ device, token }, 201);
      }
      case "alerts": {
        const { household_id = 1, alert_type = "info", severity = "primary", title, message } = body as Record<string, string | number>;
        if (!title || !message) return err("INVALID_INPUT", "title and message are required");
        const alert = {
          id: store.nextId.alert++,
          household_id: Number(household_id),
          alert_type: String(alert_type),
          severity: severity as "danger" | "warning" | "primary" | "success",
          title: String(title),
          message: String(message),
          is_read: false,
          created_at: new Date().toISOString(),
        };
        store.alerts.push(alert);
        return ok({ alert }, 201);
      }
      case "split/groups": {
        const { household_id = 1, name, total_bill_amount, total_units, billing_month, method = "equal", members = [] } = body as Record<string, unknown>;
        if (!name) return err("INVALID_INPUT", "group name is required");
        const group = {
          id: store.nextId.split++,
          household_id: Number(household_id),
          name: String(name),
          total_bill_amount: Number(total_bill_amount ?? 0),
          total_units: Number(total_units ?? 0),
          billing_month: String(billing_month ?? new Date().toISOString().slice(0, 7)),
          method: method as "equal" | "by_room" | "measured",
          members: (members as { name: string; room_name: string; status?: string }[]).map((m) => ({
            id: store.nextId.member++,
            name: m.name,
            room_name: m.room_name,
            share_percentage: 0,
            calculated_amount: 0,
            measured_units: 0,
            status: (m.status ?? "pending") as "paid" | "pending",
          })),
        };
        store.splitGroups.push(group);
        return ok({ group }, 201);
      }
      case "copilot/chat": {
        const { message, lang = "en", householdId = 1 } = body as { message?: string; lang?: string; householdId?: number };
        if (!message) return err("INVALID_INPUT", "message is required");
        return ok(copilotReply(message, lang, Number(householdId)));
      }
      case "households": {
        const b = body as Record<string, unknown>;
        const archetype = (b.archetype as keyof typeof FLOORPLANS) ?? "2BHK";
        const id = store.households.length + 1;
        const household = {
          id,
          user_id: 1,
          name: String(b.name ?? `My ${archetype} Flat`),
          state: String(b.state ?? "Maharashtra"),
          discom: String(b.discom ?? "MSEDCL"),
          connection_type: String(b.connection_type ?? "Single Phase"),
          category: String(b.category ?? "Residential LT-I"),
          tariff_id: 1,
          sanctioned_load_kw: Number(b.sanctioned_load_kw ?? 3),
          billing_day: Number(b.billing_day ?? 1),
          archetype,
          consumer_number: b.consumer_number ? String(b.consumer_number) : undefined,
          last_bill_units: b.last_bill_units ? Number(b.last_bill_units) : undefined,
          last_bill_amount: b.last_bill_amount ? Number(b.last_bill_amount) : undefined,
        };
        store.households.push(household);
        const plan = FLOORPLANS[archetype];
        for (const r of plan.rooms) {
          store.rooms.push({ id: Math.max(...store.rooms.map((x) => x.id)) + 1, household_id: id, ...r });
        }
        const newRooms = store.rooms.filter((r) => r.household_id === id);
        for (const a of ARCH_SEED[archetype].appliances) {
          const room = newRooms.find((r) => r.name === a.room);
          store.appliances.push({
            id: store.nextId.appliance++,
            household_id: id,
            room_id: room?.id ?? 0,
            custom_name: a.custom_name,
            rated_w: a.rated_w,
            standby_w: a.standby_w,
            bee_star_rating: a.bee_star_rating,
            daily_hours_guess: a.daily_hours_guess,
            model_kind: a.model_kind,
            category: a.category,
            pos_x: (room?.x ?? 0) + (a.pos_x ?? 0.5),
            pos_y: a.pos_y ?? 0,
            pos_z: (room?.z ?? 0) + (a.pos_z ?? 0.5),
            rot_y: a.rot_y ?? 0,
            is_on: a.is_on ?? true,
            fan_speed: a.category === "Ceiling Fan" ? 3 : undefined,
            artifact3d: a.artifact3d,
          });
        }
        const audit = household.last_bill_units && household.last_bill_amount ? auditBill(household.last_bill_units, household.last_bill_amount) : null;
        return ok({ household, baselineAudit: audit }, 201);
      }
      default: {
        const mApp = route.match(/^households\/(\d+)\/appliances$/);
        if (mApp) {
          const b = body as Record<string, unknown>;
          const appliance = {
            id: store.nextId.appliance++,
            household_id: Number(mApp[1]),
            room_id: Number(b.room_id ?? 1),
            custom_name: String(b.custom_name ?? "New Appliance"),
            rated_w: Number(b.rated_w ?? 100),
            standby_w: Number(b.standby_w ?? 1),
            bee_star_rating: Number(b.bee_star_rating ?? 3),
            daily_hours_guess: Number(b.daily_hours_guess ?? 4),
            model_kind: (b.model_kind ?? "scheduled") as "constant" | "scheduled" | "cyclic" | "thermostatic",
            category: String(b.category ?? "Other"),
            pos_x: Number(b.pos_x ?? 0.5),
            pos_y: Number(b.pos_y ?? 0),
            pos_z: Number(b.pos_z ?? 0.5),
            rot_y: Number(b.rot_y ?? 0),
            is_on: true,
            artifact3d: b.artifact3d ? String(b.artifact3d) : undefined,
          };
          store.appliances.push(appliance);
          return ok({ appliance }, 201);
        }
        return err("NOT_FOUND", `no route for POST /api/v1/${route}`, 404);
      }
    }
  } catch (e) {
    return err("INTERNAL", e instanceof Error ? e.message : "internal error", 500);
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const store = getStore();
  const route = path.join("/");
  const body = await req.json().catch(() => ({}));

  const mApp = route.match(/^households\/(\d+)\/appliances\/(\d+)$/);
  if (mApp) {
    const appliance = store.appliances.find((a) => a.id === Number(mApp[2]));
    if (!appliance) return err("NOT_FOUND", "appliance not found", 404);
    Object.assign(appliance, body);
    return ok({ appliance });
  }
  const mAlertRead = route.match(/^alerts\/(\d+)\/read$/);
  if (mAlertRead) {
    const alert = store.alerts.find((a) => a.id === Number(mAlertRead[1]));
    if (!alert) return err("NOT_FOUND", "alert not found", 404);
    alert.is_read = (body as { is_read?: boolean }).is_read ?? true;
    return ok({ alert });
  }
  const mDevice = route.match(/^devices\/(\d+)$/);
  if (mDevice) {
    const device = store.devices.find((d) => d.id === Number(mDevice[1]));
    if (!device) return err("NOT_FOUND", "device not found", 404);
    Object.assign(device, body);
    return ok({ device });
  }
  const mSplitMember = route.match(/^split\/groups\/(\d+)\/members\/(\d+)$/);
  if (mSplitMember) {
    const g = store.splitGroups.find((x) => x.id === Number(mSplitMember[1]));
    const member = g?.members.find((m) => m.id === Number(mSplitMember[2]));
    if (!member) return err("NOT_FOUND", "member not found", 404);
    Object.assign(member, body);
    return ok({ member });
  }
  if (route === "environment") {
    Object.assign(store.env, body);
    return ok({ env: store.env });
  }
  return err("NOT_FOUND", `no route for PATCH /api/v1/${route}`, 404);
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const store = getStore();
  const route = path.join("/");

  const mApp = route.match(/^households\/(\d+)\/appliances\/(\d+)$/);
  if (mApp) {
    const idx = store.appliances.findIndex((a) => a.id === Number(mApp[2]));
    if (idx === -1) return err("NOT_FOUND", "appliance not found", 404);
    store.appliances.splice(idx, 1);
    return ok({ success: true });
  }
  const mDevice = route.match(/^devices\/(\d+)$/);
  if (mDevice) {
    const idx = store.devices.findIndex((d) => d.id === Number(mDevice[1]));
    if (idx === -1) return err("NOT_FOUND", "device not found", 404);
    store.devices.splice(idx, 1);
    return ok({ success: true });
  }
  return err("NOT_FOUND", `no route for DELETE /api/v1/${route}`, 404);
}
