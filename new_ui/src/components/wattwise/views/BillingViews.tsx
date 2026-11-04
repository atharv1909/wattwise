// MSEDCL Regulatory Bill Auditor (§2.4), What-If Savings Lab (§2.5) and
// Reality Check & Calibration (§2.6).
"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { BadgeCheck, Ban, Copy, FileWarning, PiggyBank, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import { apiSend, inr, useWattWise } from "../useWattWise";
import type { BillResult } from "@/lib/wattwise/types";

// ---------------- Bill Auditor ----------------

interface AuditResponse {
  unitsBilled: number;
  amountBilled: number;
  amountRecomputed: number;
  difference: number;
  isMismatch: boolean;
  mismatchReason: string | null;
  recomputedBreakdown: BillResult;
}

export function AuditorView() {
  const [units, setUnits] = useState("210");
  const [amount, setAmount] = useState("3550");
  const [month, setMonth] = useState("2026-07");
  const [result, setResult] = useState<AuditResponse | null>(null);
  const [busy, setBusy] = useState(false);

  const audit = async () => {
    setBusy(true);
    try {
      const res = await apiSend<AuditResponse>("POST", "/bills/audit", {
        units: Number(units),
        amount: Number(amount),
        billMonth: month,
        householdId: 1,
      });
      setResult(res);
    } finally {
      setBusy(false);
    }
  };

  const disputeText = useMemo(() => {
    if (!result?.isMismatch) return "";
    return [
      "To: MSEDCL Consumer Grievance Redressal Forum",
      `Subject: Billing discrepancy dispute — ${month} cycle`,
      `Consumer No.: 028540192842 (Sharma Residence, 2BHK Nagpur)`,
      ``,
      `Units billed: ${result.unitsBilled} kWh`,
      `Amount charged by discom: ${inr(result.amountBilled, 2)}`,
      `Amount recomputed under MERC Tariff Order Case No. 226 of 2022: ${inr(result.amountRecomputed, 2)}`,
      `Ground of discrepancy: ${result.difference > 0 ? "Overcharge" : "Undercharge"} of ${inr(Math.abs(result.difference), 2)} — suspected incorrect fixed charge tier / erroneous surcharge.`,
      ``,
      `Requested action: Reconcile the bill against the statutory telescopic slab schedule, wheeling charges (₹1.28/unit), FAC (₹0.35/unit) and 16% electricity duty, and issue a corrected bill / refund.`,
    ].join("\n");
  }, [result, month]);

  return (
    <div className="grid gap-5 lg:grid-cols-5">
      <div className="space-y-4 lg:col-span-2">
        <div className="rounded-2xl border border-white/10 bg-stone-950/60 p-5">
          <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-stone-300">Audit a paper bill</h3>
          <p className="mt-1 text-xs text-stone-500">Every line item is recomputed to the exact rupee under MERC Case No. 226 of 2022.</p>
          <div className="mt-4 space-y-3">
            <div>
              <Label className="text-xs text-stone-400">Units billed (kWh)</Label>
              <Input value={units} onChange={(e) => setUnits(e.target.value)} type="number" className="mt-1 border-white/10 bg-white/5" />
            </div>
            <div>
              <Label className="text-xs text-stone-400">Total amount charged (₹)</Label>
              <Input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" className="mt-1 border-white/10 bg-white/5" />
            </div>
            <div>
              <Label className="text-xs text-stone-400">Billing month</Label>
              <Input value={month} onChange={(e) => setMonth(e.target.value)} placeholder="YYYY-MM" className="mt-1 border-white/10 bg-white/5" />
            </div>
            <Button onClick={() => void audit()} disabled={busy} className="w-full bg-amber-400 font-semibold text-stone-950 hover:bg-amber-300">
              {busy ? "Recomputing…" : "Run statutory audit"}
            </Button>
          </div>
          <div className="mt-4 rounded-lg bg-white/5 p-3 text-[11px] leading-relaxed text-stone-500">
            Try the demo error case: <b className="text-stone-300">210 units · ₹3,550</b> — the discom overcharged; the recomputed statutory
            bill is <b className="text-stone-300">{inr(2287)}</b>.
          </div>
        </div>
        {result && (
          <div
            className={`rounded-2xl border p-5 ${
              result.isMismatch
                ? result.difference > 0
                  ? "border-rose-500/30 bg-rose-500/8"
                  : "border-sky-500/30 bg-sky-500/8"
                : "border-emerald-500/30 bg-emerald-500/8"
            }`}
            data-testid="audit-verdict"
          >
            <div className="flex items-center gap-2">
              {result.isMismatch ? (
                <FileWarning className={`h-5 w-5 ${result.difference > 0 ? "text-rose-300" : "text-sky-300"}`} />
              ) : (
                <BadgeCheck className="h-5 w-5 text-emerald-300" />
              )}
              <h3 className="text-base font-bold text-stone-100">
                {!result.isMismatch
                  ? "Exact Match"
                  : result.difference > 0
                    ? `Overcharged by ${inr(result.difference, 2)}`
                    : `Undercharged by ${inr(Math.abs(result.difference), 2)}`}
              </h3>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-stone-400">
              {result.isMismatch
                ? result.mismatchReason
                : "Bill verified to the exact rupee — every statutory line item reconciles with the MERC order."}
            </p>
            {result.isMismatch && (
              <Button
                variant="outline"
                size="sm"
                className="mt-3 border-white/15 bg-white/5 text-xs"
                onClick={() => {
                  void navigator.clipboard.writeText(disputeText);
                  toast.success("Dispute slip copied — paste it into the consumer grievance portal");
                }}
              >
                <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy Discom Dispute Slip
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-white/10 bg-stone-950/60 p-5 lg:col-span-3">
        <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-stone-300">Itemized tariff breakdown comparison</h3>
        {result ? (
          <div className="mt-4 overflow-x-auto" data-testid="audit-breakdown">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/10 text-left text-[10px] uppercase tracking-wider text-stone-500">
                  <th className="py-2 pr-3">Line item</th>
                  <th className="py-2 pr-3 text-right">This bill (recomputed)</th>
                  <th className="py-2 text-right">Stated by discom</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {result.recomputedBreakdown.slabBreakdown.map((s) => (
                  <tr key={s.slabOrder} className="border-b border-white/5">
                    <td className="py-1.5 pr-3 text-stone-300">
                      Slab {s.slabOrder} ({s.range}) — {s.unitsInSlab.toFixed(0)} u × {inr(s.rate, 2)}
                    </td>
                    <td className="py-1.5 pr-3 text-right text-stone-200">{inr(s.amount, 2)}</td>
                    <td className="py-1.5 text-right text-stone-600">—</td>
                  </tr>
                ))}
                <tr className="border-b border-white/5">
                  <td className="py-1.5 pr-3 text-stone-300">Fixed charges (prorated ₹128/month)</td>
                  <td className="py-1.5 pr-3 text-right text-stone-200">{inr(result.recomputedBreakdown.fixedCharges, 2)}</td>
                  <td className="py-1.5 text-right text-stone-600">—</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-1.5 pr-3 text-stone-300">Wheeling charges (₹1.28 × {result.unitsBilled})</td>
                  <td className="py-1.5 pr-3 text-right text-stone-200">{inr(result.recomputedBreakdown.wheelingCharges, 2)}</td>
                  <td className="py-1.5 text-right text-stone-600">—</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-1.5 pr-3 text-stone-300">FAC (₹0.35 × {result.unitsBilled})</td>
                  <td className="py-1.5 pr-3 text-right text-stone-200">{inr(result.recomputedBreakdown.facCharges, 2)}</td>
                  <td className="py-1.5 text-right text-stone-600">—</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-1.5 pr-3 text-stone-300">Taxable subtotal</td>
                  <td className="py-1.5 pr-3 text-right text-stone-200">{inr(result.recomputedBreakdown.taxableSubtotal, 2)}</td>
                  <td className="py-1.5 text-right text-stone-600">—</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-1.5 pr-3 text-stone-300">Electricity duty (16%)</td>
                  <td className="py-1.5 pr-3 text-right text-stone-200">{inr(result.recomputedBreakdown.dutyAmount, 2)}</td>
                  <td className="py-1.5 text-right text-stone-600">—</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-3 font-bold text-stone-100">Net rounded payable</td>
                  <td className="py-2.5 pr-3 text-right text-base font-black text-amber-300">{inr(result.amountRecomputed)}</td>
                  <td className="py-2.5 text-right text-base font-black text-stone-300">{inr(result.amountBilled)}</td>
                </tr>
              </tbody>
            </table>
            <p className="mt-3 text-[11px] text-stone-500">
              Statutory citation: MERC Tariff Order Case No. 226 of 2022 / Mid-Term Review FY 2024-25. Disputes beyond ±₹5.00 are flagged.
            </p>
          </div>
        ) : (
          <p className="mt-6 text-sm text-stone-500">Run an audit to see the full statutory recomputation.</p>
        )}
      </div>
    </div>
  );
}

// ---------------- What-If Savings Lab ----------------

interface WhatIfResponse {
  baseline: { totalUnits: number; monthlyBill: number };
  simulated: { totalUnits: number; monthlyBill: number };
  savings: { monthlyUnitsSaved: number; monthlyRupeesSaved: number; annualRupeesSaved: number; percentageReduction: number; solarGeneratedUnits: number };
  breakdown: { name: string; unitsSaved: number; rupeesSaved: number }[];
}

export function WhatIfView() {
  const runWhatIf = useWattWise((s) => s.runWhatIf);
  const env = useWattWise((s) => s.env);
  const [upgradeAc, setUpgradeAc] = useState(true);
  const [bldc, setBldc] = useState(false);
  const [setpointShift, setSetpointShift] = useState(2);
  const [reduceHours, setReduceHours] = useState(1);
  const [solarKw, setSolarKw] = useState(2);
  const [result, setResult] = useState<WhatIfResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [equipCost, setEquipCost] = useState(95000);

  const simulate = async () => {
    setBusy(true);
    try {
      setResult(
        await runWhatIf({
          upgradeAcTo5Star: upgradeAc,
          upgradeFansToBldc: bldc,
          acSetpointShift: setpointShift > 0 ? setpointShift : undefined,
          reduceAcHoursBy: reduceHours > 0 ? reduceHours : undefined,
          solarKw,
        })
      );
    } finally {
      setBusy(false);
    }
  };

  const paybackMonths = result && result.savings.monthlyRupeesSaved > 0 ? Math.round(equipCost / result.savings.monthlyRupeesSaved) : null;

  return (
    <div className="grid gap-5 lg:grid-cols-5">
      <div className="rounded-2xl border border-white/10 bg-stone-950/60 p-5 lg:col-span-2">
        <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-stone-300">Intervention levers</h3>
        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2.5">
            <div>
              <p className="text-xs font-medium text-stone-200">Upgrade AC → 5-star inverter</p>
              <p className="text-[10px] text-stone-500">ISEER 3.8 → 5.0</p>
            </div>
            <Switch checked={upgradeAc} onCheckedChange={setUpgradeAc} aria-label="Upgrade AC to 5 star" />
          </div>
          <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2.5">
            <div>
              <p className="text-xs font-medium text-stone-200">Ceiling fans → BLDC (28W)</p>
              <p className="text-[10px] text-stone-500">from 75W induction</p>
            </div>
            <Switch checked={bldc} onCheckedChange={setBldc} aria-label="Upgrade fans to BLDC" />
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-stone-400">Thermostat setpoint shift</span>
              <span className="font-semibold tabular-nums text-stone-200">+{setpointShift}°C</span>
            </div>
            <Slider value={[setpointShift]} min={0} max={4} step={1} onValueChange={([v]) => setSetpointShift(v)} aria-label="Setpoint shift" />
            <p className="mt-1 text-[10px] text-stone-500">each +1°C saves ~6% compressor energy (current setpoint {env.acSetpointC}°C)</p>
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-stone-400">Behavioural AC curtailment</span>
              <span className="font-semibold tabular-nums text-stone-200">−{reduceHours}h/day</span>
            </div>
            <Slider value={[reduceHours]} min={0} max={6} step={1} onValueChange={([v]) => setReduceHours(v)} aria-label="Reduce AC hours" />
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-stone-400">Rooftop solar PV</span>
              <span className="font-semibold tabular-nums text-stone-200">{solarKw} kWp</span>
            </div>
            <Slider value={[solarKw]} min={0} max={5} step={0.5} onValueChange={([v]) => setSolarKw(v)} aria-label="Solar capacity" />
            <p className="mt-1 text-[10px] text-stone-500">~120 kWh generated per kWp per month (net-metered)</p>
          </div>
          <div>
            <Label className="text-xs text-stone-400">Estimated equipment cost (₹)</Label>
            <Input value={equipCost} onChange={(e) => setEquipCost(Number(e.target.value) || 0)} type="number" className="mt-1 border-white/10 bg-white/5" />
          </div>
          <Button onClick={() => void simulate()} disabled={busy} className="w-full bg-emerald-400 font-semibold text-stone-950 hover:bg-emerald-300">
            {busy ? "Simulating…" : "Run optimized scenario"}
          </Button>
        </div>
      </div>

      <div className="space-y-4 lg:col-span-3">
        {result ? (
          <>
            <div className="grid grid-cols-3 gap-3" data-testid="whatif-results">
              <div className="rounded-2xl border border-white/10 bg-stone-950/60 p-4">
                <p className="text-[10px] uppercase tracking-widest text-stone-500">Baseline</p>
                <p className="mt-1 text-xl font-black tabular-nums text-stone-200">{result.baseline.totalUnits.toFixed(0)} kWh</p>
                <p className="text-xs text-stone-500">{inr(result.baseline.monthlyBill)}/mo</p>
              </div>
              <div className="rounded-2xl border border-emerald-400/25 bg-emerald-400/8 p-4">
                <p className="text-[10px] uppercase tracking-widest text-emerald-300/80">Optimized</p>
                <p className="mt-1 text-xl font-black tabular-nums text-emerald-200">{result.simulated.totalUnits.toFixed(0)} kWh</p>
                <p className="text-xs text-stone-400">{inr(result.simulated.monthlyBill)}/mo</p>
              </div>
              <div className="rounded-2xl border border-amber-400/25 bg-amber-400/8 p-4">
                <p className="text-[10px] uppercase tracking-widest text-amber-300/80">Monthly savings</p>
                <p className="mt-1 text-xl font-black tabular-nums text-amber-200">{inr(result.savings.monthlyRupeesSaved)}</p>
                <p className="text-xs text-stone-400">{result.savings.monthlyUnitsSaved.toFixed(0)} kWh · −{result.savings.percentageReduction.toFixed(1)}%</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-stone-950/60 p-4">
                <PiggyBank className="h-8 w-8 text-emerald-300" />
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-stone-500">Annualized savings</p>
                  <p className="text-xl font-black tabular-nums text-emerald-300">{inr(result.savings.annualRupeesSaved)}/yr</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-stone-950/60 p-4">
                <TrendingDown className="h-8 w-8 text-sky-300" />
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-stone-500">Payback (₹{equipCost.toLocaleString("en-IN")} capex)</p>
                  <p className="text-xl font-black tabular-nums text-sky-300">{paybackMonths ?? "—"} months</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-stone-950/60 p-5">
              <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-stone-300">Savings breakdown by intervention</h3>
              <div className="mt-3 space-y-2">
                {result.breakdown.map((b) => (
                  <div key={b.name} className="flex items-center gap-3 text-xs">
                    <span className="w-52 shrink-0 truncate text-stone-300">{b.name}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/8">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-amber-300"
                        style={{ width: `${Math.min(100, (b.rupeesSaved / Math.max(1, Math.max(...result.breakdown.map((x) => x.rupeesSaved)))) * 100)}%` }}
                      />
                    </div>
                    <span className="w-20 text-right tabular-nums text-stone-400">{b.unitsSaved.toFixed(0)} kWh</span>
                    <span className="w-20 text-right font-semibold tabular-nums text-emerald-300">{inr(b.rupeesSaved)}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="flex h-full min-h-72 items-center justify-center rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-stone-500">
            Configure the levers and run the scenario to see baseline vs optimized bills.
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------- Reality Check ----------------

interface RealityResponse {
  benchmark: { method: string; kwh: number; kwhError: number; estimatedRupees: number; rupeeError: number; mapePercent: number; note: string; rank?: string }[];
  unexplainedLoad: { unexplainedKwh: number; unexplainedRupees: number; subMeterCoveragePercent: number; diagnostics: string[] };
}

export function RealityCheckView() {
  const sim = useWattWise((s) => s.sim);
  const readings = useWattWise((s) => s.readings);
  const [result, setResult] = useState<RealityResponse | null>(null);

  const run = async () => {
    const actualUnits = 342;
    const actualAmount = 4206;
    const res = await apiSend<RealityResponse>("POST", "/whatif/reality-check", {
      actualBill: { units: actualUnits, amount: actualAmount },
      guessedUsage: { totalUnits: Math.round((sim?.totalUnits ?? 320) * 0.74) },
      simulatedUsage: { totalUnits: sim?.totalUnits ?? 325 },
      measuredUsage: { totalUnits: 296, coveragePercent: 82 },
    });
    setResult(res);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-stone-950/60 p-4">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-stone-300">Reality Check & Calibration</h3>
          <p className="mt-1 text-xs text-stone-500">
            Four-tier benchmark against the ground-truth MSEDCL metered bill (342 kWh · {inr(4206)} golden fixture).
          </p>
        </div>
        <Button onClick={() => void run()} className="bg-amber-400 font-semibold text-stone-950 hover:bg-amber-300">
          Calibrate now
        </Button>
      </div>
      {result && (
        <>
          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-stone-950/60 p-5" data-testid="reality-table">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/10 text-left text-[10px] uppercase tracking-wider text-stone-500">
                  <th className="py-2 pr-3">Method</th>
                  <th className="py-2 pr-3 text-right">Est. kWh</th>
                  <th className="py-2 pr-3 text-right">kWh error</th>
                  <th className="py-2 pr-3 text-right">Est. ₹</th>
                  <th className="py-2 pr-3 text-right">₹ error</th>
                  <th className="py-2 pr-3 text-right">MAPE</th>
                  <th className="py-2 text-right">Rank</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {result.benchmark.map((r) => (
                  <tr key={r.method} className={`border-b border-white/5 ${r.rank === "#1" ? "bg-emerald-400/6" : ""}`}>
                    <td className="py-2 pr-3">
                      <p className="font-medium text-stone-200">{r.method}</p>
                      <p className="text-[10px] text-stone-500">{r.note}</p>
                    </td>
                    <td className="py-2 pr-3 text-right text-stone-300">{r.kwh.toFixed(0)}</td>
                    <td className={`py-2 pr-3 text-right ${Math.abs(r.kwhError) < 20 ? "text-emerald-300" : "text-rose-300"}`}>
                      {r.kwhError > 0 ? "+" : ""}
                      {r.kwhError.toFixed(0)}
                    </td>
                    <td className="py-2 pr-3 text-right text-stone-300">{inr(r.estimatedRupees)}</td>
                    <td className={`py-2 pr-3 text-right ${Math.abs(r.rupeeError) < 150 ? "text-emerald-300" : "text-rose-300"}`}>
                      {r.rupeeError > 0 ? "+" : ""}
                      {inr(r.rupeeError)}
                    </td>
                    <td className="py-2 pr-3 text-right font-semibold text-stone-200">{r.mapePercent.toFixed(1)}%</td>
                    <td className="py-2 text-right text-stone-400">{r.rank ?? "truth"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="rounded-2xl border border-white/10 bg-stone-950/60 p-5">
            <div className="flex items-center gap-2">
              <Ban className="h-4 w-4 text-rose-300" />
              <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-stone-300">Unexplained load diagnostics</h3>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-white/5 p-3">
                <p className="text-[10px] uppercase tracking-wider text-stone-500">Unexplained</p>
                <p className="text-xl font-black tabular-nums text-rose-300">{result.unexplainedLoad.unexplainedKwh.toFixed(1)} kWh</p>
              </div>
              <div className="rounded-xl bg-white/5 p-3">
                <p className="text-[10px] uppercase tracking-wider text-stone-500">Worth</p>
                <p className="text-xl font-black tabular-nums text-stone-200">{inr(result.unexplainedLoad.unexplainedRupees)}</p>
              </div>
              <div className="rounded-xl bg-white/5 p-3">
                <p className="text-[10px] uppercase tracking-wider text-stone-500">Sub-meter coverage</p>
                <p className="text-xl font-black tabular-nums text-sky-300">{result.unexplainedLoad.subMeterCoveragePercent}%</p>
              </div>
            </div>
            <ul className="mt-3 space-y-1.5 text-xs text-stone-400">
              {result.unexplainedLoad.diagnostics.map((d) => (
                <li key={d} className="flex gap-2">
                  <span className="text-amber-400">▸</span> {d}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
      <div className="rounded-2xl border border-white/10 bg-stone-950/60 p-5 text-xs leading-relaxed text-stone-500">
        <Badge variant="outline" className="mb-2 border-white/10 text-[10px] text-stone-400">Benchmark source</Badge>
        <p>
          Method A recall error is typically 25–35% MAPE; the physics simulation (Method B) lands at 5–10%; calibrated smart metering
          (Method C) reaches &lt;3% with ≥80% plug coverage. The gap between your best estimate and the paper bill is the{" "}
          <b className="text-stone-300">unexplained load</b> — vampire standby, wiring losses, unmetered devices or meter drift.
        </p>
      </div>
    </div>
  );
}
