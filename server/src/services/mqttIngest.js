/**
 * WattWise MQTT Ingestion & Device State Machine Service
 * Subscribes to smart plug telemetry topics, stores real-time power samples,
 * tracks ON/OFF appliance state transitions using hysteresis timers, and broadcasts via Socket.IO.
 */

let mqtt = null;
try {
  mqtt = require('mqtt');
} catch (e) {
  console.warn('[MQTT] mqtt package not found. Running in simulated telemetry mode.');
}
const { getStore } = require('../config/db');

// State tracking per device key: `${householdId}_${deviceId}`
// Format: { currentState: 'OFF', highPowerSince: null, lowPowerSince: null }
const deviceStateTrackers = new Map();

let client = null;

/**
 * Initialize and start the MQTT telemetry ingestion service.
 * @param {import('socket.io').Server} [io] - Socket.IO instance for live event broadcast
 * @returns {mqtt.MqttClient}
 */
function startMqttIngest(io = null) {
  if (!mqtt) {
    console.log('[MQTT] Ingestion service disabled (mqtt package not loaded).');
    return null;
  }
  const brokerUrl = process.env.MQTT_URL || 'mqtt://localhost:1883';
  console.log(`[MQTT] Attempting connection to broker at: ${brokerUrl}`);

  try {
    client = mqtt.connect(brokerUrl, {
      reconnectPeriod: 5000,
      connectTimeout: 8000,
      clientId: `wattwise_server_${process.pid}_${Math.random().toString(16).substring(2, 8)}`
    });

    client.on('connect', () => {
      console.log('⚡ [MQTT] Connected successfully to MQTT Broker');
      client.subscribe('wattwise/+/+/telemetry', { qos: 0 }, (err) => {
        if (err) {
          console.error('[MQTT] Failed to subscribe to wattwise/+/+/telemetry:', err.message);
        } else {
          console.log('⚡ [MQTT] Subscribed to topic pattern: wattwise/+/+/telemetry');
        }
      });
    });

    client.on('message', (topic, message) => {
      handleTelemetryMessage(topic, message, io);
    });

    client.on('error', (err) => {
      // Graceful error logging without process termination
      console.warn(`[MQTT] Broker connection warning (${brokerUrl}): ${err.message}`);
    });

    client.on('offline', () => {
      console.warn('[MQTT] Client is offline; will retry automatically.');
    });

    client.on('reconnect', () => {
      console.log('[MQTT] Attempting to reconnect to MQTT Broker...');
    });

  } catch (err) {
    console.warn(`[MQTT] Initialization warning: ${err.message}. Backend will run with simulated/in-memory data.`);
  }

  return client;
}

/**
 * Parse telemetry payloads and evaluate ON/OFF state transitions.
 * @param {string} topic
 * @param {Buffer} rawMessage
 * @param {import('socket.io').Server} io
 */
function handleTelemetryMessage(topic, rawMessage, io) {
  try {
    const parts = topic.split('/');
    // Expected structure: wattwise / {householdId} / {deviceId} / telemetry
    if (parts.length < 4 || parts[0] !== 'wattwise' || parts[3] !== 'telemetry') {
      return;
    }

    const householdId = Number(parts[1]);
    const deviceId = Number(parts[2]);

    if (isNaN(householdId) || isNaN(deviceId)) {
      return;
    }

    const payload = JSON.parse(rawMessage.toString());
    const {
      ts = new Date().toISOString(),
      v = 230.0,
      i = 0.0,
      p = 0.0,
      e_wh = 0.0
    } = payload;

    const store = getStore();
    if (!store.devices) {
      store.devices = [];
    }

    // Validate that the device exists in the registered store
    const device = store.devices.find(d => d.id === deviceId && d.household_id === householdId);
    if (!device) {
      // Unregistered device ignored to prevent arbitrary telemetry injection
      return;
    }

    // Update last seen timestamp & active flag
    device.last_seen = ts;
    device.is_active = true;

    // Persist to store.powerSamples
    if (!store.powerSamples) {
      store.powerSamples = [];
    }

    const sample = {
      id: store.powerSamples.length + 1,
      household_id: householdId,
      device_id: deviceId,
      appliance_id: device.appliance_id || null,
      v: Number(v),
      i: Number(i),
      p: Number(p),
      e_wh: Number(e_wh),
      ts: ts
    };

    store.powerSamples.push(sample);

    // Bounded memory buffer: retain last 5,000 power samples
    if (store.powerSamples.length > 5000) {
      store.powerSamples.splice(0, store.powerSamples.length - 5000);
    }

    // -------------------------------------------------------------
    // ON/OFF State Machine with 30s Hysteresis Timer
    // - If p > 10W sustained for 30s -> ON event
    // - If p < 5W sustained for 30s -> OFF event
    // -------------------------------------------------------------
    const trackerKey = `${householdId}_${deviceId}`;
    if (!deviceStateTrackers.has(trackerKey)) {
      deviceStateTrackers.set(trackerKey, {
        currentState: p > 10 ? 'ON' : 'OFF',
        highPowerSince: null,
        lowPowerSince: null
      });
    }

    const tracker = deviceStateTrackers.get(trackerKey);
    const now = Date.now();
    let emittedEvent = null;

    if (tracker.currentState === 'OFF') {
      if (p > 10.0) {
        if (!tracker.highPowerSince) {
          tracker.highPowerSince = now;
        } else if (now - tracker.highPowerSince >= 30000) {
          // Sustained power > 10W for 30s -> Transition to ON
          tracker.currentState = 'ON';
          tracker.highPowerSince = null;
          tracker.lowPowerSince = null;

          emittedEvent = recordUsageEvent(store, householdId, deviceId, device.appliance_id, 'ON', p, ts);
        }
      } else {
        // Reset high timer if power dropped back under 10W
        tracker.highPowerSince = null;
      }
    } else if (tracker.currentState === 'ON') {
      if (p < 5.0) {
        if (!tracker.lowPowerSince) {
          tracker.lowPowerSince = now;
        } else if (now - tracker.lowPowerSince >= 30000) {
          // Sustained power < 5W for 30s -> Transition to OFF
          tracker.currentState = 'OFF';
          tracker.lowPowerSince = null;
          tracker.highPowerSince = null;

          emittedEvent = recordUsageEvent(store, householdId, deviceId, device.appliance_id, 'OFF', p, ts);
        }
      } else {
        // Reset low timer if power surged back above 5W
        tracker.lowPowerSince = null;
      }
    }

    // -------------------------------------------------------------
    // Socket.IO Real-Time Dispatch to Household Room
    // -------------------------------------------------------------
    if (io) {
      const room = `household_${householdId}`;

      // Emit continuous telemetry point
      io.to(room).emit('telemetry', {
        household_id: householdId,
        device_id: deviceId,
        appliance_id: device.appliance_id,
        sample
      });

      // Emit discrete appliance state change event if triggered
      if (emittedEvent) {
        io.to(room).emit('device:event', emittedEvent);
      }
    }

  } catch (err) {
    console.error('[MQTT] Error processing telemetry message:', err.message);
  }
}

/**
 * Record a state transition event in memory store.
 */
function recordUsageEvent(store, householdId, deviceId, applianceId, eventType, powerW, ts) {
  if (!store.usageEvents) {
    store.usageEvents = [];
  }

  const event = {
    id: store.usageEvents.length + 1,
    household_id: householdId,
    device_id: deviceId,
    appliance_id: applianceId,
    event_type: eventType,
    power_w: powerW,
    timestamp: ts
  };

  store.usageEvents.push(event);
  console.log(`⚡ [State Machine] Device ${deviceId} (Household ${householdId}) transitioned to ${eventType} (${powerW}W)`);

  return event;
}

/**
 * Stop MQTT subscriber client.
 */
function stopMqttIngest() {
  if (client) {
    client.end(true);
    client = null;
    console.log('[MQTT] Ingest client stopped.');
  }
}

module.exports = {
  startMqttIngest,
  stopMqttIngest,
  deviceStateTrackers
};
