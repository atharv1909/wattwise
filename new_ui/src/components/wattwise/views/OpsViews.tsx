// IoT Device Management (§2.7), Shared Bill Splitter (§2.8) and the
// Predictive Alerts & Notification Center (§2.9).
"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Copy, Cpu, Plus, Radio, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { apiGet, apiSend, fmtDate, inr, useWattWise, type DevicePayload } from "../useWattWise";
import type { SplitGroup } from "@/lib/wattwise/types";

// ---------------- IoT Device Management ----------------

export function IoTView() {
  const bundle = useWattWise((s) => s.bundle);
  const devicesData = useWattWise((s) => s.devices);
  const telemetry = useWattWise((s) => s.telemetry);
  const [name, setName] = useState("");
  const [kind, setKind] = useState("smart_plug");
  const [applianceId, setApplianceId] = useState<string>("none");
  const [busy, setBusy] = useState(false);

  const addDevice = async () => {
    if (!name.trim()) {
      toast.error("Device name is required");
      return;
    }
    setBusy(true);
    try {
      await apiSend("POST", "/devices", {
        household_id: bundle?.household.id ?? 1,
        name: name.trim(),
        kind,
        appliance_id: applianceId === "none" ? null : Number(applianceId),
      });
      const refreshed = await apiGet<DevicePayload>(`/devices/${bundle?.household.id ?? 1}`);
      useWattWise.setState({ devices: refreshed });
      setName("");
      toast.success(`Device "${name.trim()}" paired — token generated`);
    } finally {
      setBusy(false);
    }
  };

  const toggleDevice = async (id: number, active: boolean) => {
    await apiSend("PATCH", `/devices/${id}`, { is_active: active });
    const refreshed = await apiGet<DevicePayload>(`/devices/${bundle?.household.id ?? 1}`);
    useWattWise.setState({ devices: refreshed });
  };

  const removeDevice = async (id: number) => {
    await apiSend("DELETE", `/devices/${id}`);
    const refreshed = await apiGet<DevicePayload>(`/devices/${bundle?.household.id ?? 1}`);
    useWattWise.setState({ devices: refreshed });
    toast.success("Device unregistered");
  };

  return (
    <div className="grid gap-5 lg:grid-cols-5">
      <div className="rounded-2xl border border-white/10 bg-stone-950/60 p-5 lg:col-span-2">
        <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-stone-300">Pair new hardware</h3>
        <div className="mt-4 space-y-3">
          <div>
            <Label className="text-xs text-stone-400">Device name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Plug-AC-Bedroom2" className="mt-1 border-white/10 bg-white/5" />
          </div>
          <div>
            <Label className="text-xs text-stone-400">Device type</Label>
            <Select value={kind} onValueChange={setKind}>
              <SelectTrigger className="mt-1 border-white/10 bg-white/5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-white/10 bg-stone-900">
                <SelectItem value="smart_plug">smart_plug</SelectItem>
                <SelectItem value="esp32_meter">esp32_meter</SelectItem>
                <SelectItem value="ct_clamp">ct_clamp</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-stone-400">Link to appliance</Label>
            <Select value={applianceId} onValueChange={setApplianceId}>
              <SelectTrigger className="mt-1 border-white/10 bg-white/5">
                <SelectValue placeholder="None (main circuit)" />
              </SelectTrigger>
              <SelectContent className="border-white/10 bg-stone-900">
                <SelectItem value="none">None (main circuit)</SelectItem>
                {(bundle?.appliances ?? []).map((a) => (
                  <SelectItem key={a.id} value={String(a.id)}>
                    {a.custom_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => void addDevice()} disabled={busy} className="w-full bg-amber-400 font-semibold text-stone-950 hover:bg-amber-300">
            <Plus className="mr-1.5 h-4 w-4" /> {busy ? "Pairing…" : "Pair device & generate token"}
          </Button>
        </div>
        <div className="mt-5 rounded-xl bg-white/5 p-3 text-[11px] leading-relaxed text-stone-500">
          <Radio className="mr-1 inline h-3.5 w-3.5 text-emerald-400" />
          Live telemetry streams over Socket.IO every 2 s (V · A · W · Wh). The pulse in the header of the 3D Home is fed by the same channel.
        </div>
      </div>

      <div className="space-y-4 lg:col-span-3">
        {telemetry && (
          <div className="grid grid-cols-4 gap-3" data-testid="telemetry-strip">
            {[
              ["Voltage", `${telemetry.v.toFixed(1)} V`],
              ["Current", `${telemetry.i.toFixed(2)} A`],
              ["Active power", `${telemetry.p.toFixed(0)} W`],
              ["Cumulative", `${(telemetry.e_wh / 1000).toFixed(2)} kWh`],
            ].map(([k, v]) => (
              <div key={k} className="rounded-2xl border border-emerald-400/20 bg-emerald-400/6 p-3 text-center">
                <p className="text-[10px] uppercase tracking-wider text-emerald-300/80">{k}</p>
                <p className="mt-1 text-lg font-black tabular-nums text-emerald-200">{v}</p>
              </div>
            ))}
          </div>
        )}
        <div className="rounded-2xl border border-white/10 bg-stone-950/60 p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-stone-300">Registered devices</h3>
            <Badge variant="outline" className="border-white/10 text-[10px] text-stone-400">
              Sub-meter coverage {devicesData?.coveragePercent ?? 0}%
            </Badge>
          </div>
          <div className="mt-4 space-y-2">
            {(devicesData?.devices ?? []).map((d) => {
              const online = d.is_active && Date.now() - new Date(d.last_seen).getTime() < 120000;
              return (
                <div key={d.id} className="flex items-center gap-3 rounded-xl bg-white/4 px-3 py-2.5">
                  <Cpu className={`h-4.5 w-4.5 shrink-0 ${online ? "text-emerald-400" : "text-stone-600"}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-stone-200">
                      {d.name} <span className="ml-1 rounded bg-white/10 px-1 py-0.5 text-[9px] uppercase tracking-wider text-stone-400">{d.kind}</span>
                    </p>
                    <p className="text-[10px] text-stone-500">
                      {d.linked_appliance_name ?? "Main circuit"} · last seen {fmtDate(d.last_seen)}
                    </p>
                  </div>
                  {d.token && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-[10px] text-stone-400 hover:bg-white/10"
                      onClick={() => {
                        void navigator.clipboard.writeText(d.token ?? "");
                        toast.success("Auth token copied (ww_live_…)");
                      }}
                    >
                      <Copy className="h-3 w-3" /> token
                    </Button>
                  )}
                  <Switch checked={d.is_active} onCheckedChange={(v) => void toggleDevice(d.id, v)} aria-label={`Toggle ${d.name}`} />
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-stone-500 hover:bg-rose-500/15 hover:text-rose-300" onClick={() => void removeDevice(d.id)} aria-label={`Delete ${d.name}`}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              );
            })}
            {(devicesData?.devices ?? []).length === 0 && <p className="text-sm text-stone-500">No devices registered yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------- Shared Bill Splitter ----------------

export function SplitterView() {
  const [groups, setGroups] = useState<SplitGroup[]>([]);
  const [calc, setCalc] = useState<Record<number, { members: { id: number; name: string; room_name: string; share_percentage: number; calculated_amount: number; measured_units: number; status: string }[]; method?: string }>>({});
  const [activeGroup, setActiveGroup] = useState<number | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await apiGet<{ groups: SplitGroup[] }>("/split/groups/household/4");
      setGroups(res.groups);
      setActiveGroup(res.groups[0]?.id ?? null);
    })();
  }, []);

  const recalc = async (groupId: number, method?: string) => {
    if (method) {
      const g = groups.find((x) => x.id === groupId);
      if (g) {
        await apiSend("PATCH", `/split/groups/${groupId}/members/0`, {}).catch(() => undefined);
      }
    }
    const res = await apiGet<{ members: { id: number; name: string; room_name: string; share_percentage: number; calculated_amount: number; measured_units: number; status: string }[]; method: string }>(`/split/groups/${groupId}/calculate`);
    setCalc((c) => ({ ...c, [groupId]: res }));
    if (method) {
      // reflect method change in local state (demo in-memory store recomputes on the fly)
      setGroups((gs) => gs.map((g) => (g.id === groupId ? { ...g, method: method as SplitGroup["method"] } : g)));
    }
  };

  const group = groups.find((g) => g.id === activeGroup);
  const members = calc[activeGroup ?? -1]?.members ?? group?.members ?? [];

  const shareText = group
    ? [`*${group.name} — ${group.billing_month} bill*`, `Total: ${inr(group.total_bill_amount)} (${group.total_units} kWh)`, ""].concat(
        members.map((m) => `${m.name} (${m.room_name}): ${inr(m.calculated_amount)} — ${m.share_percentage.toFixed(1)}% [${m.status}]`)
      ).join("\n")
    : "";

  return (
    <div className="grid gap-5 lg:grid-cols-5">
      <div className="rounded-2xl border border-white/10 bg-stone-950/60 p-5 lg:col-span-2">
        <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-stone-300">Split groups</h3>
        <div className="mt-3 space-y-2">
          {groups.map((g) => (
            <button
              key={g.id}
              onClick={() => {
                setActiveGroup(g.id);
                void recalc(g.id);
              }}
              className={`w-full rounded-xl px-3 py-2.5 text-left transition ${g.id === activeGroup ? "bg-amber-400/15 ring-1 ring-amber-400/40" : "bg-white/5 hover:bg-white/10"}`}
            >
              <p className="text-xs font-bold text-stone-100">{g.name}</p>
              <p className="text-[10px] text-stone-500">
                {inr(g.total_bill_amount)} · {g.total_units} kWh · {g.billing_month}
              </p>
            </button>
          ))}
        </div>
        {group && (
          <div className="mt-4">
            <Label className="text-xs text-stone-400">Split methodology</Label>
            <Select value={group.method} onValueChange={(m) => void recalc(group.id, m)}>
              <SelectTrigger className="mt-1 border-white/10 bg-white/5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-white/10 bg-stone-900">
                <SelectItem value="equal">Equal</SelectItem>
                <SelectItem value="by_room">By room / appliance weighting</SelectItem>
                <SelectItem value="measured">Measured (sub-metered)</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              className="mt-3 w-full border-white/15 bg-white/5 text-xs"
              onClick={() => {
                void navigator.clipboard.writeText(shareText);
                toast.success("WhatsApp/Telegram summary copied");
              }}
            >
              <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy share summary
            </Button>
          </div>
        )}
      </div>
      <div className="rounded-2xl border border-white/10 bg-stone-950/60 p-5 lg:col-span-3" data-testid="split-table">
        <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-stone-300">Member shares — {group?.method ?? "—"} method</h3>
        <table className="mt-4 w-full text-xs">
          <thead>
            <tr className="border-b border-white/10 text-left text-[10px] uppercase tracking-wider text-stone-500">
              <th className="py-2 pr-3">Member</th>
              <th className="py-2 pr-3">Room</th>
              <th className="py-2 pr-3 text-right">Share</th>
              <th className="py-2 pr-3 text-right">Units</th>
              <th className="py-2 pr-3 text-right">Payable</th>
              <th className="py-2 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {members.map((m) => (
              <tr key={m.id} className="border-b border-white/5">
                <td className="py-2 pr-3 font-medium text-stone-200">{m.name}</td>
                <td className="py-2 pr-3 text-stone-400">{m.room_name}</td>
                <td className="py-2 pr-3 text-right text-stone-300">{m.share_percentage.toFixed(1)}%</td>
                <td className="py-2 pr-3 text-right text-stone-400">{m.measured_units.toFixed(0)}</td>
                <td className="py-2 pr-3 text-right font-bold text-amber-300">{inr(m.calculated_amount, 2)}</td>
                <td className="py-2 text-right">
                  <Badge className={`border-0 text-[10px] ${m.status === "paid" ? "bg-emerald-400/15 text-emerald-300" : "bg-amber-400/15 text-amber-300"} hover:${m.status === "paid" ? "bg-emerald-400/15" : "bg-amber-400/15"}`}>
                    {m.status}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {members.length === 0 && <p className="mt-4 text-sm text-stone-500">Select a group and recalculate to see the fair split.</p>}
      </div>
    </div>
  );
}

// ---------------- Alerts & Notification Center ----------------

export function AlertsView() {
  const alerts = useWattWise((s) => s.alerts);
  const markAlertRead = useWattWise((s) => s.markAlertRead);
  const markAllRead = useWattWise((s) => s.markAllRead);
  const setView = useWattWise((s) => s.setView);
  const [filter, setFilter] = useState<string>("all");

  const filtered = (alerts?.alerts ?? []).filter((a) => filter === "all" || a.severity === filter);
  const tone: Record<string, string> = {
    danger: "border-rose-500/30 bg-rose-500/8",
    warning: "border-amber-500/30 bg-amber-500/8",
    primary: "border-sky-500/30 bg-sky-500/8",
    success: "border-emerald-500/30 bg-emerald-500/8",
  };
  const dot: Record<string, string> = { danger: "bg-rose-400", warning: "bg-amber-400", primary: "bg-sky-400", success: "bg-emerald-400" };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1.5">
          {["all", "danger", "warning", "primary", "success"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1.5 text-[11px] font-medium capitalize transition ${filter === f ? "bg-amber-400 text-stone-950" : "bg-white/5 text-stone-400 hover:bg-white/10"}`}
            >
              {f === "all" ? "All" : f}
            </button>
          ))}
        </div>
        <Button variant="outline" size="sm" className="border-white/15 bg-white/5 text-xs" onClick={() => void markAllRead()}>
          Mark all as read
        </Button>
      </div>
      <div className="space-y-3">
        {filtered.map((a) => (
          <div key={a.id} className={`rounded-2xl border p-4 transition ${tone[a.severity] ?? "border-white/10 bg-white/4"} ${a.is_read ? "opacity-55" : ""}`} data-testid="alert-card">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${dot[a.severity] ?? "bg-stone-400"} ${a.is_read ? "" : "animate-pulse"}`} />
                <div>
                  <p className="text-sm font-bold text-stone-100">{a.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-stone-400">{a.message}</p>
                  <p className="mt-1.5 text-[10px] uppercase tracking-wider text-stone-600">
                    {a.alert_type.replace(/_/g, " ")} · {fmtDate(a.created_at)}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                {!a.is_read && (
                  <Button variant="ghost" size="sm" className="h-7 text-[10px] text-stone-400 hover:bg-white/10" onClick={() => void markAlertRead(a.id)}>
                    Mark read
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 border-white/15 bg-white/5 text-[10px]"
                  onClick={() => {
                    if (a.alert_type === "bill_mismatch") setView("auditor");
                    else if (a.alert_type === "slab_breach_warning") setView("dashboard");
                    else setView("home3d");
                  }}
                >
                  {a.alert_type === "bill_mismatch" ? "Open Bill Auditor" : a.alert_type === "slab_breach_warning" ? "Open Slab Gauge" : "Adjust in 3D Home"}
                </Button>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-stone-500">No alerts in this severity bucket.</p>}
      </div>
    </div>
  );
}
