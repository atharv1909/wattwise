// WattWise app shell — sidebar navigation across the 11 spec features,
// header with alert badge + household switcher, and Socket.IO telemetry wiring.
"use client";

import { useEffect } from "react";
import { io, type Socket } from "socket.io-client";
import { Badge } from "@/components/ui/badge";
import { Bell, CircuitBoard, CloudSun, Gauge, HandCoins, LayoutDashboard, LineChart, MessageSquareText, PlugZap, Radar, Stethoscope } from "lucide-react";
import { useWattWise, type ViewKey } from "./useWattWise";
import { Home3DView } from "./views/Home3DView";
import { DashboardView } from "./views/DashboardView";
import { AuditorView, RealityCheckView, WhatIfView } from "./views/BillingViews";
import { AlertsView, IoTView, SplitterView } from "./views/OpsViews";
import { AdminView, CopilotView } from "./views/CopilotAdminViews";

const NAV: { key: ViewKey; label: string; icon: typeof Gauge; hint: string }[] = [
  { key: "home3d", label: "3D Home", icon: LayoutDashboard, hint: "SimReady house" },
  { key: "dashboard", label: "Dashboard", icon: Gauge, hint: "Slab forecasting" },
  { key: "auditor", label: "Bill Auditor", icon: Stethoscope, hint: "MERC §226/2022" },
  { key: "whatif", label: "What-If Lab", icon: CloudSun, hint: "Savings levers" },
  { key: "reality", label: "Reality Check", icon: Radar, hint: "MAPE calibration" },
  { key: "iot", label: "IoT Devices", icon: PlugZap, hint: "Telemetry" },
  { key: "splitter", label: "Bill Splitter", icon: HandCoins, hint: "Fair flatmate splits" },
  { key: "alerts", label: "Alerts", icon: Bell, hint: "Notification center" },
  { key: "copilot", label: "AI Copilot", icon: MessageSquareText, hint: "en · हिंदी · मराठी" },
  { key: "admin", label: "Admin", icon: LineChart, hint: "BI analytics" },
];

function useTelemetrySocket() {
  const setTelemetry = useWattWise((s) => s.setTelemetry);
  const setSocketStatus = useWattWise((s) => s.setSocketStatus);
  useEffect(() => {
    let socket: Socket | null = null;
    try {
      const socketUrl =
        process.env.NEXT_PUBLIC_SOCKET_URL ||
        (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
          ? `${window.location.protocol}//${window.location.hostname}:3003`
          : "/");
      socket = io(socketUrl, { query: { XTransformPort: "3003" }, transports: ["websocket", "polling"], reconnectionAttempts: 3 });
      socket.on("connect", () => {
        setSocketStatus("live");
        socket?.emit("join:household", 1);
      });
      socket.on("joined:household", () => setSocketStatus("live"));
      socket.on("device:telemetry", (frame) => setTelemetry(frame));
      socket.on("disconnect", () => setSocketStatus("offline"));
      socket.on("connect_error", () => setSocketStatus("offline"));
    } catch {
      setSocketStatus("offline");
    }
    return () => {
      socket?.disconnect();
    };
  }, [setTelemetry, setSocketStatus]);
}

export function AppShell() {
  const view = useWattWise((s) => s.view);
  const setView = useWattWise((s) => s.setView);
  const loadAll = useWattWise((s) => s.loadAll);
  const households = useWattWise((s) => s.households);
  const activeId = useWattWise((s) => s.activeHouseholdId);
  const setActiveHousehold = useWattWise((s) => s.setActiveHousehold);
  const unread = useWattWise((s) => s.alerts?.unread ?? 0);
  const bundle = useWattWise((s) => s.bundle);
  useTelemetrySocket();

  useEffect(() => {
    void loadAll(1);
  }, [loadAll]);

  return (
    <div className="flex min-h-screen flex-col bg-stone-950 text-stone-200">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-stone-950/85 backdrop-blur-md">
        <div className="flex h-14 items-center gap-3 px-4">
          <button className="flex items-center gap-2" onClick={() => setView("home3d")} aria-label="WattWise home">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-300 to-amber-500 font-black text-stone-950">W</span>
            <span className="text-base font-black tracking-tight text-stone-100">
              Watt<span className="text-amber-400">Wise</span>
            </span>
          </button>
          <Badge variant="outline" className="hidden border-white/10 text-[9px] uppercase tracking-widest text-stone-500 md:inline-flex">
            MERC Case No. 226 of 2022 · FY 2024-25
          </Badge>
          <div className="ml-auto flex items-center gap-2">
            <select
              value={activeId}
              onChange={(e) => void setActiveHousehold(Number(e.target.value))}
              className="h-9 rounded-lg border border-white/10 bg-white/5 px-2 text-xs text-stone-200 outline-none"
              aria-label="Active household"
            >
              {households.map((h) => (
                <option key={h.id} value={h.id} className="bg-stone-900">
                  {h.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => setView("alerts")}
              className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-stone-300 hover:bg-white/10"
              aria-label={`Alerts (${unread} unread)`}
            >
              <Bell className="h-4 w-4" />
              {unread > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
                  {unread}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* sidebar */}
        <nav className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-56 shrink-0 flex-col gap-0.5 overflow-y-auto border-r border-white/10 p-3 lg:flex" aria-label="Primary">
          {NAV.map((item) => (
            <button
              key={item.key}
              onClick={() => setView(item.key)}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                view === item.key ? "bg-amber-400/12 text-amber-200 ring-1 ring-amber-400/25" : "text-stone-400 hover:bg-white/5 hover:text-stone-200"
              }`}
              aria-current={view === item.key ? "page" : undefined}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="min-w-0">
                <span className="block truncate text-xs font-semibold">{item.label}</span>
                <span className="block truncate text-[10px] text-stone-600 group-hover:text-stone-500">{item.hint}</span>
              </span>
            </button>
          ))}
          <div className="mt-auto rounded-xl border border-white/8 bg-white/3 p-3 text-[10px] leading-relaxed text-stone-500">
            <CircuitBoard className="mb-1 h-3.5 w-3.5 text-amber-400" />
            MySQL 8.0 & Real Datasets (UCI 296k · SGCC 25k) active · Pipeline connected.
          </div>
        </nav>

        {/* mobile nav */}
        <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center lg:hidden">
          <div className="m-2 flex max-w-full gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-stone-950/90 p-1.5 backdrop-blur-md">
            {NAV.map((item) => (
              <button
                key={item.key}
                onClick={() => setView(item.key)}
                className={`flex shrink-0 flex-col items-center rounded-xl px-3 py-1.5 ${view === item.key ? "bg-amber-400/15 text-amber-200" : "text-stone-500"}`}
                aria-label={item.label}
              >
                <item.icon className="h-4 w-4" />
                <span className="mt-0.5 text-[9px]">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* main */}
        <main className="min-w-0 flex-1 pb-20 lg:pb-0">
          <div key={view} className="animate-in fade-in duration-300">
            {view === "home3d" && <Home3DView />}
            {view === "dashboard" && (
              <div className="p-4 lg:p-6">
                <h1 className="mb-4 text-xl font-black text-stone-100">Live Energy Dashboard</h1>
                <DashboardView />
              </div>
            )}
            {view === "auditor" && (
              <div className="p-4 lg:p-6">
                <h1 className="mb-4 text-xl font-black text-stone-100">MSEDCL Regulatory Bill Auditor</h1>
                <AuditorView />
              </div>
            )}
            {view === "whatif" && (
              <div className="p-4 lg:p-6">
                <h1 className="mb-4 text-xl font-black text-stone-100">What-If Savings Lab</h1>
                <WhatIfView />
              </div>
            )}
            {view === "reality" && (
              <div className="p-4 lg:p-6">
                <h1 className="mb-4 text-xl font-black text-stone-100">Reality Check & Calibration</h1>
                <RealityCheckView />
              </div>
            )}
            {view === "iot" && (
              <div className="p-4 lg:p-6">
                <h1 className="mb-4 text-xl font-black text-stone-100">IoT Device Management</h1>
                <IoTView />
              </div>
            )}
            {view === "splitter" && (
              <div className="p-4 lg:p-6">
                <h1 className="mb-4 text-xl font-black text-stone-100">Shared Bill Splitter {bundle ? `· ${bundle.household.name}` : ""}</h1>
                <SplitterView />
              </div>
            )}
            {view === "alerts" && (
              <div className="p-4 lg:p-6">
                <h1 className="mb-4 text-xl font-black text-stone-100">Predictive Alerts</h1>
                <AlertsView />
              </div>
            )}
            {view === "copilot" && (
              <div className="p-4 lg:p-6">
                <h1 className="mb-4 text-xl font-black text-stone-100">Multilingual AI Copilot</h1>
                <CopilotView />
              </div>
            )}
            {view === "admin" && (
              <div className="p-4 lg:p-6">
                <h1 className="mb-4 text-xl font-black text-stone-100">Admin Analytics & BI Integration</h1>
                <AdminView />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
