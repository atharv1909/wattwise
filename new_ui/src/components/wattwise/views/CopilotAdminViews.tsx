// Multilingual AI Copilot (§2.10) — chat stream with verified arithmetic
// cards; every number is rendered from the deterministic engine `metrics`
// payload, never parsed from the reply text (spec §7.5).
// Admin Analytics (§2.11) — macro stats, distributions, golden fixtures,
// MySQL view status for Power BI/Tableau.
"use client";

import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, Send, ShieldCheck, XCircle } from "lucide-react";
import { apiGet, inr, useWattWise } from "../useWattWise";
import type { CopilotResponse } from "@/lib/wattwise/types";

interface ChatMsg {
  role: "user" | "copilot";
  text: string;
  lang?: string;
  metrics?: CopilotResponse["metrics"];
  intent?: string;
}

const LANGS = [
  { key: "en", label: "English" },
  { key: "hi", label: "हिंदी" },
  { key: "mr", label: "मराठी" },
];

const CHIPS = [
  "What will I save if I buy a 5 star AC?",
  "Which slab am I in?",
  "What happens if I raise the AC temperature?",
  "Should I convert fans to BLDC?",
  "मेरा बिल कितना आएगा?",
  "सोलर लगायला किती बचत होईल?",
];

export function CopilotView() {
  const askCopilot = useWattWise((s) => s.askCopilot);
  const [lang, setLang] = useState("en");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [msgs, setMsgs] = useState<ChatMsg[]>([
    {
      role: "copilot",
      text: "Namaste! I'm the WattWise Copilot. Ask me about bills, slabs or savings — every rupee I quote is computed by the deterministic tariff engine, so my arithmetic can never hallucinate.",
      lang: "en",
    },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const send = async (text: string) => {
    if (!text.trim() || busy) return;
    setMsgs((m) => [...m, { role: "user", text }]);
    setInput("");
    setBusy(true);
    try {
      const res = await askCopilot(text, lang);
      setMsgs((m) => [...m, { role: "copilot", text: res.reply, lang, metrics: res.metrics, intent: res.intent.type }]);
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: 9e9, behavior: "smooth" }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto grid max-w-4xl gap-4 lg:grid-cols-3">
      <div className="flex h-[70vh] flex-col rounded-2xl border border-white/10 bg-stone-950/60 lg:col-span-2" data-testid="copilot-chat">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-stone-100">WattWise Copilot</h3>
            <Badge variant="outline" className="border-white/10 text-[9px] text-stone-500">zero LLM arithmetic</Badge>
          </div>
          <div className="flex gap-1">
            {LANGS.map((l) => (
              <button
                key={l.key}
                onClick={() => setLang(l.key)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${lang === l.key ? "bg-amber-400 text-stone-950" : "bg-white/5 text-stone-400 hover:bg-white/10"}`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
          {msgs.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${m.role === "user" ? "bg-amber-400/90 text-stone-950" : "bg-white/6 text-stone-200"}`}>
                {m.text}
                {m.metrics && (
                  <div className="mt-2 rounded-xl border border-emerald-400/25 bg-emerald-400/8 p-2.5" data-testid="verified-metrics">
                    <p className="mb-1 flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-emerald-300">
                      <CheckCircle2 className="h-3 w-3" /> Verified arithmetic card — computed by billEngine.js
                    </p>
                    <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                      {Object.entries(m.metrics).map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-2 rounded-md bg-black/25 px-2 py-1">
                          <span className="text-stone-400">{k.replace(/([A-Z])/g, " $1").toLowerCase()}</span>
                          <span className="font-bold tabular-nums text-emerald-200">
                            {typeof v === "number" && k.toLowerCase().includes("rupees") ? inr(v) : typeof v === "number" ? v : String(v)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          {busy && <p className="text-xs text-stone-500">Copilot is running the engine…</p>}
        </div>
        <form
          className="flex gap-2 border-t border-white/10 p-3"
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
        >
          <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder={lang === "hi" ? "पूछें: 5 स्टार एसी से कितनी बचत?" : lang === "mr" ? "विचारा: सोलरने किती बचत?" : "Ask about bills, slabs or savings…"} className="border-white/10 bg-white/5 text-sm" />
          <Button type="submit" size="icon" className="shrink-0 bg-amber-400 text-stone-950 hover:bg-amber-300" aria-label="Send">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
      <div className="space-y-3">
        <div className="rounded-2xl border border-white/10 bg-stone-950/60 p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Quick prompts</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {CHIPS.map((c) => (
              <button key={c} onClick={() => void send(c)} className="rounded-full bg-white/5 px-2.5 py-1.5 text-left text-[11px] text-stone-300 transition hover:bg-white/10">
                {c}
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-stone-950/60 p-4 text-[11px] leading-relaxed text-stone-500">
          <p className="font-bold text-stone-300">How grounding works</p>
          <p className="mt-1.5">
            The Copilot classifies intent (en/हिंदी/मराठी keywords), then calls the same <code className="text-amber-300/90">billEngine</code> the
            dashboard uses. Answers render the structured <code className="text-amber-300/90">metrics</code> payload — the LLM never performs
            arithmetic, so a 2.18× slab jump can never become 1.8×.
          </p>
        </div>
      </div>
    </div>
  );
}

interface AdminStats {
  summary: { totalHouseholds: number; totalAppliances: number; totalBillsAudited: number; mismatchedBills: number; auditMismatchRatePercent: number; activeTariff: string };
  archetypeDistribution: Record<string, number>;
  applianceCategories: Record<string, number>;
  goldenFixtures: { case: string; pass: boolean }[];
  views: { name: string; status: string; engine: string; note: string }[];
}

export function AdminView() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  useEffect(() => {
    void (async () => setStats(await apiGet<AdminStats>("/admin/stats")))();
  }, []);
  if (!stats) return <p className="text-sm text-stone-500">Loading admin analytics…</p>;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5" data-testid="admin-summary">
        {[
          ["Households", stats.summary.totalHouseholds],
          ["Appliances", stats.summary.totalAppliances],
          ["Bills audited", stats.summary.totalBillsAudited],
          ["Mismatched", stats.summary.mismatchedBills],
          ["Mismatch rate", `${stats.summary.auditMismatchRatePercent}%`],
        ].map(([k, v]) => (
          <div key={String(k)} className="rounded-2xl border border-white/10 bg-stone-950/60 p-4 text-center">
            <p className="text-[10px] uppercase tracking-widest text-stone-500">{k}</p>
            <p className="mt-1 text-2xl font-black tabular-nums text-amber-300">{v}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-stone-950/60 p-5">
          <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-stone-300">Archetype distribution</h3>
          <div className="mt-3 space-y-2">
            {Object.entries(stats.archetypeDistribution).map(([k, v]) => (
              <div key={k} className="flex items-center gap-3 text-xs">
                <span className="w-20 text-stone-300">{k}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/8">
                  <div className="h-full rounded-full bg-gradient-to-r from-sky-400/80 to-emerald-300" style={{ width: `${(v / stats.summary.totalHouseholds) * 100}%` }} />
                </div>
                <span className="w-8 text-right tabular-nums text-stone-400">{v}</span>
              </div>
            ))}
          </div>
          <h3 className="mt-5 text-sm font-bold uppercase tracking-[0.2em] text-stone-300">Appliance categories</h3>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {Object.entries(stats.applianceCategories).map(([k, v]) => (
              <Badge key={k} variant="outline" className="border-white/10 bg-white/4 text-[10px] text-stone-300">
                {k} × {v}
              </Badge>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-stone-950/60 p-5">
            <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-stone-300">Golden bill fixtures (MERC)</h3>
            <div className="mt-3 space-y-1.5 text-xs">
              {stats.goldenFixtures.map((f) => (
                <div key={f.case} className="flex items-center justify-between rounded-lg bg-white/4 px-3 py-2">
                  <span className="text-stone-300">{f.case}</span>
                  {f.pass ? (
                    <span className="flex items-center gap-1 font-semibold text-emerald-300">
                      <CheckCircle2 className="h-3.5 w-3.5" /> pass
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 font-semibold text-rose-300">
                      <XCircle className="h-3.5 w-3.5" /> fail
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-stone-950/60 p-5">
            <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-stone-300">MySQL views — BI connectivity</h3>
            <div className="mt-3 space-y-1.5 text-xs">
              {stats.views.map((v) => (
                <div key={v.name} className="flex items-center justify-between rounded-lg bg-white/4 px-3 py-2">
                  <div>
                    <p className="font-mono text-stone-200">{v.name}</p>
                    <p className="text-[10px] text-stone-500">{v.note}</p>
                  </div>
                  <Badge variant="outline" className="border-emerald-400/30 bg-emerald-400/8 text-[10px] text-emerald-300">
                    {v.status} · {v.engine}
                  </Badge>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-stone-500">Active tariff: {stats.summary.activeTariff}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
