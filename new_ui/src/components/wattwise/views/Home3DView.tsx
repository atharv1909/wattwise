// 3D Home view — the interactive SimReady house with environmental controls,
// live appliance inspector, room aggregation, plus the two Codrops-driven
// scroll sections (archetype carousel + stack-motion breakdown).
"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Activity, Fan, Snowflake, Thermometer, Waves, X, Zap } from "lucide-react";
import { inr, useWattWise } from "../useWattWise";
import { ArchetypeCarousel } from "../ArchetypeCarousel";
import { StackMotionBreakdown } from "../StackMotionBreakdown";
import { liveWatts } from "@/lib/wattwise/engine";
import type { Archetype } from "@/lib/wattwise/types";

const HouseScene = dynamic(() => import("../three/HouseScene"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-stone-950">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-amber-400/30 border-t-amber-400" />
        <p className="mt-4 text-sm text-stone-400">Importing SimReady artifacts…</p>
      </div>
    </div>
  ),
});

function EnvControls() {
  const env = useWattWise((s) => s.env);
  const setEnv = useWattWise((s) => s.setEnv);
  const bundle = useWattWise((s) => s.bundle);
  const [tab, setTab] = useState<"climate" | "day">("climate");
  return (
    <div className="pointer-events-auto w-64 rounded-xl border border-white/10 bg-stone-950/80 p-4 shadow-xl backdrop-blur-md">
      <div className="mb-3 flex gap-1 rounded-lg bg-white/5 p-1 text-xs">
        <button
          className={`flex-1 rounded-md px-2 py-1.5 font-medium transition ${tab === "climate" ? "bg-amber-400/90 text-stone-950" : "text-stone-400 hover:text-stone-200"}`}
          onClick={() => setTab("climate")}
        >
          Climate
        </button>
        <button
          className={`flex-1 rounded-md px-2 py-1.5 font-medium transition ${tab === "day" ? "bg-amber-400/90 text-stone-950" : "text-stone-400 hover:text-stone-200"}`}
          onClick={() => setTab("day")}
        >
          Billing day
        </button>
      </div>
      {tab === "climate" ? (
        <div className="space-y-4">
          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-stone-400">
                <Thermometer className="h-3.5 w-3.5" /> Outside ambient
              </span>
              <span className="font-semibold tabular-nums text-stone-200">{env.ambientTempC}°C</span>
            </div>
            <Slider
              value={[env.ambientTempC]}
              min={20}
              max={45}
              step={1}
              onValueChange={([v]) => void setEnv({ ambientTempC: v })}
              aria-label="Outside ambient temperature"
            />
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-stone-400">
                <Snowflake className="h-3.5 w-3.5" /> AC setpoint
              </span>
              <span className="font-semibold tabular-nums text-stone-200">{env.acSetpointC}°C</span>
            </div>
            <Slider
              value={[env.acSetpointC]}
              min={18}
              max={28}
              step={1}
              onValueChange={([v]) => void setEnv({ acSetpointC: v })}
              aria-label="AC thermostat setpoint"
            />
          </div>
          {bundle && (
            <p className="text-[11px] leading-snug text-stone-500">
              ΔT {Math.max(0, env.ambientTempC - env.acSetpointC)}°C drives the thermostatic AC duty ratio — watch the compressor light in 3D.
            </p>
          )}
        </div>
      ) : (
        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-stone-400">
              <Waves className="h-3.5 w-3.5" /> Day of cycle
            </span>
            <span className="font-semibold tabular-nums text-stone-200">Day {env.day} / 30</span>
          </div>
          <Slider value={[env.day]} min={1} max={30} step={1} onValueChange={([v]) => void setEnv({ day: v })} aria-label="Billing cycle day" />
          <p className="mt-3 text-[11px] leading-snug text-stone-500">
            Slab forecasting and month-end projections recompute from this day.
          </p>
        </div>
      )}
    </div>
  );
}

function LiveWattsBadge() {
  const bundle = useWattWise((s) => s.bundle);
  const env = useWattWise((s) => s.env);
  const telemetry = useWattWise((s) => s.telemetry);
  const socketStatus = useWattWise((s) => s.socketStatus);
  const watts = useMemo(() => {
    if (!bundle) return 0;
    return Math.round(bundle.appliances.reduce((s, a) => s + liveWatts(a, env), 0));
  }, [bundle, env]);
  return (
    <div className="pointer-events-auto flex items-center gap-3 rounded-xl border border-white/10 bg-stone-950/80 px-4 py-2.5 shadow-xl backdrop-blur-md">
      <Zap className="h-4 w-4 text-amber-300" aria-hidden />
      <div>
        <p className="text-[10px] uppercase tracking-widest text-stone-500">Live household draw</p>
        <p className="text-lg font-bold tabular-nums leading-none text-stone-100">
          {watts.toLocaleString("en-IN")} <span className="text-xs font-medium text-stone-400">W</span>
        </p>
      </div>
      {telemetry && (
        <div className="ml-2 border-l border-white/10 pl-3 text-[10px] leading-tight text-stone-400">
          <p className="tabular-nums">{telemetry.v.toFixed(1)} V · {telemetry.i.toFixed(2)} A</p>
          <p className="tabular-nums">{(telemetry.e_wh / 1000).toFixed(2)} kWh cumulative</p>
        </div>
      )}
      <span
        className={`ml-1 h-2 w-2 rounded-full ${socketStatus === "live" ? "animate-pulse bg-emerald-400" : socketStatus === "connecting" ? "bg-amber-400" : "bg-stone-600"}`}
        title={`Telemetry socket: ${socketStatus}`}
      />
    </div>
  );
}

function Inspector() {
  const bundle = useWattWise((s) => s.bundle);
  const sim = useWattWise((s) => s.sim);
  const selectedId = useWattWise((s) => s.selectedApplianceId);
  const selectAppliance = useWattWise((s) => s.selectAppliance);
  const toggleAppliance = useWattWise((s) => s.toggleAppliance);
  const setFanSpeed = useWattWise((s) => s.setFanSpeed);
  const app = bundle?.appliances.find((a) => a.id === selectedId);
  const simApp = sim?.appliances.find((a) => a.id === selectedId);
  if (!app) return null;
  const on = app.is_on ?? true;
  return (
    <div className="pointer-events-auto w-80 rounded-xl border border-white/10 bg-stone-950/85 p-4 shadow-2xl backdrop-blur-md">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-stone-500">{simApp?.roomName ?? "Appliance"}</p>
          <h3 className="text-base font-bold text-stone-100">{app.custom_name}</h3>
        </div>
        <button onClick={() => selectAppliance(null)} aria-label="Close inspector" className="rounded-md p-1 text-stone-500 hover:bg-white/10 hover:text-stone-200">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-3 flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
        <span className="flex items-center gap-2 text-xs text-stone-300">
          {app.model_kind === "thermostatic" ? <Snowflake className="h-4 w-4 text-sky-300" /> : app.category === "Ceiling Fan" ? <Fan className="h-4 w-4 text-emerald-300" /> : <Activity className="h-4 w-4 text-amber-300" />}
          {on ? "Running" : "Standby"}
        </span>
        <Switch checked={on} onCheckedChange={() => void toggleAppliance(app.id)} aria-label={`Toggle ${app.custom_name}`} />
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
        {[
          ["Rated power", `${app.rated_w} W`],
          ["Standby", `${app.standby_w} W`],
          ["BEE star", `${app.bee_star_rating}★`],
          ["Physics model", app.model_kind],
          ["30-day energy", simApp ? `${simApp.totalKwh.toFixed(1)} kWh` : "—"],
          ["Bill share", simApp ? `${simApp.percentageShare.toFixed(1)}%` : "—"],
          ["Cost share", simApp ? inr(simApp.estimatedCostInr) : "—"],
          ["Daily energy", simApp ? `${simApp.dailyKwh.toFixed(2)} kWh/day` : "—"],
        ].map(([k, v]) => (
          <div key={k} className="rounded-lg bg-white/5 px-2.5 py-2">
            <dt className="text-[10px] uppercase tracking-wider text-stone-500">{k}</dt>
            <dd className="mt-0.5 font-semibold tabular-nums text-stone-200">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-[11px] leading-snug text-stone-500">{simApp?.details}</p>
      {app.category === "Ceiling Fan" && (
        <div className="mt-3">
          <p className="mb-1.5 text-[10px] uppercase tracking-wider text-stone-500">Fan speed level (1–5)</p>
          <Slider
            value={[app.fan_speed ?? 3]}
            min={1}
            max={5}
            step={1}
            onValueChange={([v]) => void setFanSpeed(app.id, v)}
            aria-label="Fan speed"
          />
        </div>
      )}
    </div>
  );
}

function RoomBreakdown() {
  const sim = useWattWise((s) => s.sim);
  const selectAppliance = useWattWise((s) => s.selectAppliance);
  if (!sim) return null;
  return (
    <div className="rounded-2xl border border-white/10 bg-stone-950/60 p-5">
      <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-stone-300">Room aggregation</h3>
      <p className="mt-1 text-xs text-stone-500">kWh and bill share per room over the 30-day simulation</p>
      <div className="mt-4 space-y-2.5">
        {sim.rooms.map((r) => (
          <div key={r.room} className="flex items-center gap-3">
            <span className="w-36 shrink-0 truncate text-xs font-medium text-stone-300">{r.room}</span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/8">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500/80 to-amber-300/90"
                style={{ width: `${Math.min(100, r.percentageShare)}%` }}
              />
            </div>
            <span className="w-24 shrink-0 text-right text-xs tabular-nums text-stone-400">{r.kwh.toFixed(1)} kWh</span>
            <Badge variant="outline" className="w-16 justify-center border-white/10 text-[10px] text-stone-400">
              {r.percentageShare.toFixed(1)}%
            </Badge>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {sim.appliances.slice(0, 8).map((a) => (
          <Button
            key={a.id}
            variant="outline"
            size="sm"
            className="border-white/10 bg-white/5 text-xs text-stone-300 hover:bg-white/10"
            onClick={() => selectAppliance(a.id)}
          >
            {a.name} · {a.percentageShare.toFixed(0)}%
          </Button>
        ))}
      </div>
    </div>
  );
}

function ApplianceToggles() {
  const bundle = useWattWise((s) => s.bundle);
  const toggleAppliance = useWattWise((s) => s.toggleAppliance);
  const selectAppliance = useWattWise((s) => s.selectAppliance);
  if (!bundle) return null;
  return (
    <ScrollArea className="pointer-events-auto max-h-52 w-60 rounded-xl border border-white/10 bg-stone-950/80 p-3 shadow-xl backdrop-blur-md">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-stone-500">Appliance interactivity</p>
      <div className="space-y-1">
        {bundle.appliances.map((a) => (
          <div key={a.id} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-white/5">
            <button className="min-w-0 flex-1 truncate text-left text-xs text-stone-300" onClick={() => selectAppliance(a.id)}>
              {a.custom_name}
            </button>
            <span className="shrink-0 text-[10px] tabular-nums text-stone-500">{a.rated_w}W</span>
            <Switch checked={a.is_on ?? true} onCheckedChange={() => void toggleAppliance(a.id)} aria-label={`Toggle ${a.custom_name}`} className="scale-90" />
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

export function Home3DView() {
  const bundle = useWattWise((s) => s.bundle);
  const sim = useWattWise((s) => s.sim);
  const readings = useWattWise((s) => s.readings);
  const [entered, setEntered] = useState(false);

  // bisection switches for constrained environments: ?noscene skips WebGL,
  // ?nogsap skips the GSAP scroll sections
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const noScene = params.has("noscene");
  const noGsap = params.has("nogsap");

  return (
    <div>
      {/* ——— hero: 3D house ——— */}
      <section className="relative" data-testid="house-section">
        <div className="relative h-[78vh] min-h-[540px] w-full overflow-hidden border-b border-white/10">
          {noScene ? (
            <div className="flex h-full items-center justify-center bg-stone-950 text-sm text-stone-500">3D scene disabled (?noscene)</div>
          ) : (
            <HouseScene />
          )}
          {/* top overlay row */}
          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-4">
            <div className="max-w-[240px]">
              <div className="pointer-events-auto rounded-xl border border-white/10 bg-stone-950/80 px-4 py-3 shadow-xl backdrop-blur-md">
                <p className="text-[10px] uppercase tracking-widest text-stone-500">Active household</p>
                <p className="text-sm font-bold text-stone-100">{bundle?.household.name ?? "…"}</p>
                <p className="mt-0.5 text-[11px] text-stone-400">
                  {bundle?.household.discom} · {bundle?.household.category} · {bundle?.household.sanctioned_load_kw} kW load
                </p>
              </div>
            </div>
            <LiveWattsBadge />
          </div>
          {/* left controls */}
          <div className="pointer-events-none absolute left-4 top-28 flex flex-col gap-3 sm:top-24">
            <EnvControls />
            <ApplianceToggles />
          </div>
          {/* right inspector */}
          <div className="pointer-events-none absolute right-4 top-28 sm:top-24">
            <Inspector />
          </div>
          {/* bottom stat strip */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-4">
            <div className="pointer-events-auto flex divide-x divide-white/10 rounded-xl border border-white/10 bg-stone-950/80 shadow-xl backdrop-blur-md">
              {[
                ["Projected units", sim ? `${sim.totalUnits.toFixed(0)} kWh` : "—"],
                ["Projected bill", sim ? inr(sim.projectedBill) : "—"],
                ["MTD consumed", readings ? `${readings.forecast.totalUnitsSoFar.toFixed(0)} kWh` : "—"],
                ["Peak appliance", sim?.appliances[0] ? `${sim.appliances[0].name.split(" ").slice(0, 2).join(" ")} ${sim.appliances[0].percentageShare.toFixed(0)}%` : "—"],
              ].map(([k, v]) => (
                <div key={k} className="px-5 py-3">
                  <p className="text-[10px] uppercase tracking-widest text-stone-500">{k}</p>
                  <p className="text-sm font-bold tabular-nums text-stone-100">{v}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ——— Codrops section 1: archetype carousel (scroll) ——— */}
      {noGsap ? (
        <div className="p-10 text-center text-sm text-stone-500">GSAP sections disabled (?nogsap)</div>
      ) : (
        <>
          <ArchetypeCarousel onPick={() => setEntered(true)} />
          {/* ——— Codrops section 2: stack-motion breakdown (scroll, pinned) ——— */}
          <StackMotionBreakdown />
        </>
      )}

      {/* ——— room aggregation + credits ——— */}
      <section className="mx-auto max-w-5xl px-4 pb-16">
        <RoomBreakdown />
        <p className="mt-6 text-[11px] leading-relaxed text-stone-600">
          3D artifacts: NVIDIA <span className="text-stone-500">SimReady</span> assets (CC-BY-4.0, web-ready GLB conversions from the
          simready-glb library) and LG Electronics SimReady appliances (CC-BY-4.0, converted locally from OpenUSD). Interaction patterns
          adapted from Codrops <span className="text-stone-500">3DCarousel</span> and <span className="text-stone-500">3DStackMotion</span> (MIT).
          {entered ? " Household switched via the carousel." : ""}
        </p>
      </section>
    </div>
  );
}
