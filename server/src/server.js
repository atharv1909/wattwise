require('dotenv').config();
const http = require('http');
let Server = null;
try {
  Server = require('socket.io').Server;
} catch (err) {
  console.warn('[Socket.IO] socket.io package not found, using lightweight mock');
}
const app = require('./app');
const { initDatabase } = require('./config/db');
const { startMqttIngest } = require('./services/mqttIngest');

const PORT = process.env.PORT || 4000;

async function bootstrap() {
  await initDatabase();

  const server = http.createServer(app);

  let io = null;
  if (Server) {
    try {
      io = new Server(server, {
        cors: {
          origin: '*',
          methods: ['GET', 'POST', 'PATCH', 'DELETE']
        }
      });
    } catch (e) {
      console.warn('[Socket.IO] Initialization error:', e.message);
    }
  }

  if (io) {
    io.on('connection', (socket) => {
      console.log(`⚡ [Socket.IO] Client connected: ${socket.id}`);

    // Household subscription room
    socket.on('join:household', (householdId) => {
      const room = `household_${householdId}`;
      socket.join(room);
      console.log(`⚡ [Socket.IO] Client ${socket.id} joined room: ${room}`);
      socket.emit('joined:household', { householdId, room, status: 'ok' });
    });

    socket.on('leave:household', (householdId) => {
      const room = `household_${householdId}`;
      socket.leave(room);
      console.log(`⚡ [Socket.IO] Client ${socket.id} left room: ${room}`);
    });

    socket.on('disconnect', (reason) => {
      console.log(`⚡ [Socket.IO] Client disconnected: ${socket.id} (${reason})`);
    });
  });
  }

  // Start MQTT Ingest service (wrapped safely so backend runs even if broker is offline)
  try {
    startMqttIngest(io);
  } catch (mqttErr) {
    console.warn(`[MQTT] Ingestion service failed to initialize: ${mqttErr.message}`);
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`⚡ WattWise Backend API running on http://0.0.0.0:${PORT}`);
    console.log(`   Health Check: http://localhost:${PORT}/health`);
    console.log(`   Tariffs API:  http://localhost:${PORT}/api/v1/tariffs/msedcl`);
    console.log(`   Socket.IO:    Ready for live smart plug telemetry`);
  });
}

bootstrap();
