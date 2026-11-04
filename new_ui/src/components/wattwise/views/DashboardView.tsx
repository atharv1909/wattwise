// Live Energy Dashboard — data stream indicator, metric summaries, dynamic
// slab gauge, consumption time-series and top appliance ranking (spec §2.2).
"use client";

import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, Database, Gauge, TrendingUp, Zap } from "lucide-react";
import { apiGet, inr, kwh, useWattWise, type ReadingsPayload } from "../useWattWise";

const SOURCES = [
  { key: "demo", label: "Seeded (Nagpur)" },
  { key: "real", label: "UCI Real" },
  { key: "sgcc_normal", label: "SGCC Normal" },
  { key: "sgcc_theft", label: "SGCC Theft" },
];

export function DashboardView() {
  const sim = useWattWise((s) => s.sim);
  const readings = useWattWise((s) => s.readings);
  const tariff = useWattWise((s) => s.tariff);
  const [source, setSource] = useState("demo");
  const [live, setLive] = useState<ReadingsPayload | null>(null);
  const [loading, setLoading] = useState(false);

  const data = live ?? readings;
  const switchSource = async (key: string) => {
    setSource(key);
    setLoading(true);
    try {
      setLive(await apiGet<ReadingsPayload>(`/readings?source=${key}&householdId=1`));
    } finally {
      setLoading(false);
    }
  };

  const chartData = useMemo(
    () =>
      (data?.readings ?? []).map((r) => ({
        date: r.reading_date.slice(8),
        units: r.daily_units,
        weekend: r.is_weekend,
      })),
    [data]
  );

  const gauge = data?.forecast.slabGauge;
  const gaugePercent = gauge ? Math.min(100, gauge.percentageThroughSlab) : 0;

  return (
    <div className="space-y-5">
      {/* active data stream */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-stone-950/60 p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-400/15 text-amber-300">
            <Database className="h-4.5 w-4.5" />
          </span>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-stone-500">Active data stream</p>
            <p className="text-sm font-semibold text-stone-100">{data?.datasetLabel ?? "…"}</p>
            <p className="text-[11px] text-stone-500">
              {(data?.observations ?? 0).toLocaleString("en-IN")} observations · Day {data?.forecast.daysElapsed ?? "—"} of {data?.forecast.daysTotal ?? 30}
            </p>
          </div>
        </div>
        <Tabs value={source} onValueChange={(v) => void switchSource(v)}>
          <TabsList className="bg-white/5">
            {SOURCES.map((s) => (
              <TabsTrigger key={s.key} value={s.key} className="text-xs">
                {s.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* metric cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Month-to-date", value: kwh(data?.forecast.totalUnitsSoFar ?? 0, 0), icon: Zap, tone: "text-amber-300" },
          { label: "Projected month-end", value: kwh(data?.forecast.projectedUnitsMonthEnd ?? 0, 0), icon: TrendingUp, tone: "text-emerald-300" },
          { label: "Projected bill", value: inr(data?.forecast.projectedBill ?? 0), icon: Gauge, tone: "text-stone-100" },
          { label: "Avg daily", value: `${(data?.forecast.avgDailyUnits ?? 0).toFixed(2)} kWh/day`, icon: ActivityIcon, tone: "text-sky-300" },
        ].map((c) => (
          <div key={c.label} className="rounded-2xl border border-white/10 bg-stone-950/60 p-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-widest text-stone-500">{c.label}</p>
              <c.icon className={`h-4 w-4 ${c.tone}`} />
            </div>
            <p className={`mt-2 text-2xl font-black tabular-nums ${c.tone}`}>{c.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* slab gauge */}
        <div className="rounded-2xl border border-white/10 bg-stone-950/60 p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-stone-300">Dynamic slab gauge</h3>
            <Badge className="border-0 bg-amber-400/15 text-[10px] text-amber-300 hover:bg-amber-400/15">MSEDCL LT-I</Badge>
          </div>
          <p className="mt-3 text-2xl font-black text-stone-100">{gauge?.currentSlab ?? "—"}</p>
          <p className="text-xs text-stone-400">
            Marginal rate {inr(gauge?.currentRate ?? 0, 2)}/kWh
            {gauge?.nextSlab ? ` · next: ${gauge.nextSlab} at ${inr(gauge.nextRate ?? 0, 2)}/kWh` : " · top slab"}
          </p>
          <Progress value={gaugePercent} className="mt-4 h-2.5 bg-white/8" aria-label="Slab usage" />
          <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-lg bg-white/5 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-stone-500">Remaining in slab</p>
              <p className="font-bold tabular-nums text-emerald-300">{gauge?.unitsRemainingInSlab.toFixed(1) ?? "—"} kWh</p>
            </div>
            <div className="rounded-lg bg-white/5 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-stone-500">Slab penalty</p>
              <p className="flex items-center gap-1 font-bold tabular-nums text-rose-300">
                <AlertTriangle className="h-3.5 w-3.5" />×{gauge?.penaltyMultiplier.toFixed(2) ?? "—"}
              </p>
            </div>
          </div>
          <div className="mt-4 space-y-1.5">
            {(tariff?.tariff.slabs ?? []).map((s) => (
              <div key={s.order} className="flex items-center justify-between rounded-md px-2 py-1 text-xs odd:bg-white/4">
                <span className="text-stone-400">
                  Slab {s.order}: {s.from}–{s.to ?? "∞"}
                </span>
                <span className="font-semibold tabular-nums text-stone-200">{inr(s.rate, 2)}/kWh</span>
              </div>
            ))}
          </div>
        </div>

        {/* time series */}
        <div className="rounded-2xl border border-white/10 bg-stone-950/60 p-5 lg:col-span-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-stone-300">Consumption time series</h3>
            {loading && <span className="text-[11px] text-stone-500">loading…</span>}
          </div>
          <div className="mt-4 h-64" data-testid="consumption-chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="unitsFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#fbbf24" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#ffffff10" />
                <XAxis dataKey="date" tick={{ fill: "#a8a29e", fontSize: 10 }} tickLine={false} axisLine={{ stroke: "#ffffff18" }} />
                <YAxis tick={{ fill: "#a8a29e", fontSize: 10 }} tickLine={false} axisLine={false} unit=" kWh" width={58} />
                <Tooltip
                  contentStyle={{ background: "#1c1917", border: "1px solid #ffffff22", borderRadius: 10, fontSize: 12 }}
                  labelStyle={{ color: "#d6d3d1" }}
                  formatter={(v: number) => [`${v} kWh`, "Daily units"]}
                />
                <Area type="monotone" dataKey="units" stroke="#fbbf24" strokeWidth={2} fill="url(#unitsFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-[11px] text-stone-500">
            Weekend days retain their natural bump; the theft dataset shows sudden drops/spikes characteristic of meter tampering.
          </p>
        </div>
      </div>

      {/* top appliances + sim comparison */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-stone-950/60 p-5">
          <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-stone-300">Top consuming appliances</h3>
          <div className="mt-4 space-y-3">
            {(sim?.appliances ?? []).slice(0, 6).map((a, i) => (
              <div key={a.id} className="flex items-center gap-3">
                <span className="w-5 text-center text-xs font-bold text-stone-600">#{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-stone-200">{a.name}</p>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/8">
                    <div className="h-full rounded-full bg-gradient-to-r from-rose-500/80 to-amber-300" style={{ width: `${Math.min(100, a.percentageShare)}%` }} />
                  </div>
                </div>
                <span className="w-20 text-right text-xs tabular-nums text-stone-400">{a.totalKwh.toFixed(1)} kWh</span>
                <span className="w-16 text-right text-xs font-semibold tabular-nums text-amber-300">{inr(a.estimatedCostInr)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-stone-950/60 p-5">
          <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-stone-300">Physics sim vs readings forecast</h3>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-emerald-400/8 p-4 ring-1 ring-emerald-400/20">
              <p className="text-[10px] uppercase tracking-wider text-emerald-300/80">Readings forecast</p>
              <p className="mt-1 text-2xl font-black tabular-nums text-emerald-200">{(data?.forecast.projectedUnitsMonthEnd ?? 0).toFixed(0)} kWh</p>
              <p className="text-xs text-stone-400">{inr(data?.forecast.projectedBill ?? 0)} projected</p>
            </div>
            <div className="rounded-xl bg-amber-400/8 p-4 ring-1 ring-amber-400/20">
              <p className="text-[10px] uppercase tracking-wider text-amber-300/80">3D physics sim</p>
              <p className="mt-1 text-2xl font-black tabular-nums text-amber-200">{(sim?.totalUnits ?? 0).toFixed(0)} kWh</p>
              <p className="text-xs text-stone-400">{inr(sim?.projectedBill ?? 0)} projected</p>
            </div>
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-stone-500">
            The delta between statistical forecast and physics simulation feeds the Reality Check calibration (Method B MAPE ≈ 5–10%).
          </p>
        </div>
      </div>
    </div>
  );
}

function ActivityIcon(props: { className?: string }) {
  return <Zap {...props} />;
}
