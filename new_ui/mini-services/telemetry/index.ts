// WattWise telemetry mini-service (Socket.IO) — implements the real-time
// channels from the spec: device:telemetry, appliance:state, alert:new.
// Simulates IoT smart-plug physics for joined households every 2 seconds.
import { Server } from "socket.io";

const PORT = 3003;

const io = new Server(PORT, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

interface SimState {
  watts: number;
  eWh: number;
  t: number;
}

const states = new Map<number, SimState>();

io.on("connection", (socket) => {
  console.log("[telemetry] client connected", socket.id);

  socket.on("join:household", (householdId: number) => {
    const room = `household_${householdId}`;
    void socket.join(room);
    if (!states.has(householdId)) states.set(householdId, { watts: 742, eWh: 142580, t: 0 });
    socket.emit("joined:household", { householdId, room, status: "ok" });
  });

  socket.on("leave:household", (householdId: number) => {
    void socket.leave(`household_${householdId}`);
  });

  socket.on("disconnect", () => {
    console.log("[telemetry] client disconnected", socket.id);
  });
});

// physics-flavoured telemetry heartbeat
setInterval(() => {
  for (const [householdId, st] of states) {
    st.t += 1;
    // thermostatic compressor cycling + cyclic fridge duty + noise
    const acCycle = (Math.sin(st.t / 9) + 1) / 2; // 0..1
    const fridgeCycle = (Math.sin(st.t / 5 + 1.3) + 1) / 2;
    const target = 148 + acCycle * 1240 + fridgeCycle * 96 + 36 + Math.sin(st.t / 3) * 12;
    st.watts = Math.max(120, st.watts + (target - st.watts) * 0.35 + (Math.random() - 0.5) * 30);
    st.eWh += (st.watts * 2) / 3600; // 2-second integration

    const payload = {
      deviceId: 1,
      householdId,
      v: Math.round((230 + (Math.random() - 0.5) * 4) * 10) / 10,
      i: Math.round((st.watts / 230) * 100) / 100,
      p: Math.round(st.watts * 10) / 10,
      e_wh: Math.round(st.eWh),
      ts: new Date().toISOString(),
    };
    io.to(`household_${householdId}`).emit("device:telemetry", payload);

    // hysteresis-driven appliance state flips (AC compressor)
    if (acCycle > 0.93 && st.watts > 900) {
      io.to(`household_${householdId}`).emit("appliance:state", {
        householdId,
        deviceId: 1,
        applianceId: 1,
        state: "ON",
        powerW: Math.round(st.watts),
      });
    }
  }
}, 2000);

// one-off demo alert push after 45s of uptime
setTimeout(() => {
  io.emit("alert:new", {
    id: 901,
    householdId: 1,
    type: "slab_breach_warning",
    severity: "warning",
    title: "Live: Slab 2 at 84%",
    message: "Real-time telemetry projects a slab breach in 6 days at current run-rate. Consider +2°C on the AC setpoint.",
    created_at: new Date().toISOString(),
  });
}, 45000);

console.log(`[telemetry] WattWise Socket.IO service listening on :${PORT}`);
