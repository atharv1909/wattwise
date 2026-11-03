#!/usr/bin/env node
/**
 * WattWise IoT Smart Plug Telemetry Simulator
 * Simulates high-fidelity telemetry from smart plugs (ESP32 / Tuya / BL0937 energy meters)
 * Emits continuous voltage, current, active power, and accumulated watt-hours to MQTT.
 *
 * Usage:
 *   node simulate.js --household 1 --device 1 --type ac
 *   node simulate.js --household 1 --device 2 --type fridge
 *   node simulate.js --all
 */

const mqtt = require('mqtt');

// -------------------------------------------------------------
// CLI Argument Parsing
// -------------------------------------------------------------
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    household: 1,
    device: 1,
    type: 'auto',
    intervalSec: 5,
    broker: process.env.MQTT_URL || 'mqtt://localhost:1883',
    all: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--household' && args[i + 1]) {
      options.household = parseInt(args[++i], 10);
    } else if (arg.startsWith('--household=')) {
      options.household = parseInt(arg.split('=')[1], 10);
    } else if (arg === '--device' && args[i + 1]) {
      options.device = parseInt(args[++i], 10);
    } else if (arg.startsWith('--device=')) {
      options.device = parseInt(arg.split('=')[1], 10);
    } else if (arg === '--type' && args[i + 1]) {
      options.type = args[++i].toLowerCase();
    } else if (arg.startsWith('--type=')) {
      options.type = arg.split('=')[1].toLowerCase();
    } else if (arg === '--broker' && args[i + 1]) {
      options.broker = args[++i];
    } else if (arg.startsWith('--broker=')) {
      options.broker = arg.split('=')[1];
    } else if (arg === '--interval' && args[i + 1]) {
      options.intervalSec = Math.max(1, parseInt(args[++i], 10));
    } else if (arg === '--all') {
      options.all = true;
    }
  }

  return options;
}

const config = parseArgs();

// -------------------------------------------------------------
// Appliance Physical Simulation Profiles
// -------------------------------------------------------------
const PROFILES = {
  ac: {
    name: '1.5 Ton Inverter AC',
    powerFactor: 0.90,
    ratedW: 1450,
    standbyW: 3.5,
    // Cycle every 16 samples (~80s): 10 samples ON (~50s > 10W triggers state machine ON), 6 samples OFF (~30s < 5W triggers OFF)
    cycleLength: 16,
    activeSamples: 10,
    computePower: (step) => {
      const inActive = (step % 16) < 10;
      if (!inActive) {
        return 3.5 + Math.random() * 0.8; // Standby ~3.5W
      }
      // Modulated inverter power (1380W - 1520W)
      return 1450 + Math.sin(step * 0.4) * 80 + (Math.random() * 20 - 10);
    }
  },
  fridge: {
    name: 'Double Door Refrigerator',
    powerFactor: 0.85,
    ratedW: 140,
    standbyW: 2.0,
    // Cycle every 18 samples: 10 samples ON (50s at 140W), 8 samples OFF (40s at 2W)
    cycleLength: 18,
    activeSamples: 10,
    computePower: (step) => {
      const inCompressorOn = (step % 18) < 10;
      if (!inCompressorOn) {
        return 2.0 + Math.random() * 0.5; // Idle ~2W
      }
      return 135 + Math.sin(step * 0.5) * 12 + (Math.random() * 6 - 3);
    }
  },
  fan: {
    name: 'BLDC / Induction Ceiling Fan',
    powerFactor: 0.95,
    ratedW: 70,
    standbyW: 0.0,
    cycleLength: 1,
    activeSamples: 1,
    computePower: () => {
      return 68 + Math.random() * 5; // Steady ~70W
    }
  }
};

// Auto-determine type if not explicitly passed
function resolveType(deviceId, explicitType) {
  if (explicitType && PROFILES[explicitType]) {
    return explicitType;
  }
  if (deviceId === 2) return 'fridge';
  if (deviceId === 3) return 'fan';
  return 'ac';
}

// -------------------------------------------------------------
// Simulator Runtime State
// -------------------------------------------------------------
const devicesToRun = config.all
  ? [
      { id: 1, type: 'ac', e_wh: 12450.0, step: 0 },
      { id: 2, type: 'fridge', e_wh: 34200.0, step: 4 }
    ]
  : [
      {
        id: config.device,
        type: resolveType(config.device, config.type),
        e_wh: 15200.0,
        step: 0
      }
    ];

console.log('====================================================');
console.log('⚡ WattWise Smart Plug Telemetry Simulator');
console.log(`Broker:    ${config.broker}`);
console.log(`Household: ${config.household}`);
console.log(`Devices:   ${devicesToRun.map(d => `#${d.id} (${d.type})`).join(', ')}`);
console.log(`Interval:  ${config.intervalSec} seconds`);
console.log('====================================================');

const client = mqtt.connect(config.broker, {
  clientId: `wattwise_sim_${Math.random().toString(16).substring(2, 8)}`,
  reconnectPeriod: 3000
});

client.on('connect', () => {
  console.log(`⚡ Connected to MQTT Broker successfully at ${config.broker}`);
  startPublishLoop();
});

client.on('error', (err) => {
  console.error(`[MQTT Error] ${err.message}`);
});

let intervalTimer = null;

function startPublishLoop() {
  if (intervalTimer) clearInterval(intervalTimer);

  intervalTimer = setInterval(() => {
    // Realistic Indian grid voltage fluctuation (220V - 240V nominal 230V)
    const baseVoltage = 230.0 + Math.sin(Date.now() / 30000) * 5.0;
    const voltageNoise = (Math.random() * 4.0) - 2.0;
    const voltage = parseFloat(Math.min(240, Math.max(220, baseVoltage + voltageNoise)).toFixed(1));

    devicesToRun.forEach(device => {
      device.step++;
      const profile = PROFILES[device.type] || PROFILES.ac;
      const rawPower = profile.computePower(device.step);
      const powerW = parseFloat(Math.max(0, rawPower).toFixed(1));

      // Current calculation: I = P / (V * PF)
      const pf = profile.powerFactor;
      const currentA = powerW > 5.0
        ? parseFloat((powerW / (voltage * pf)).toFixed(2))
        : parseFloat((powerW / voltage).toFixed(3));

      // Accumulated energy: Wh += P * (seconds / 3600)
      const deltaWh = (powerW * (config.intervalSec / 3600.0));
      device.e_wh += deltaWh;
      const energyWh = parseFloat(device.e_wh.toFixed(2));

      const payload = {
        ts: new Date().toISOString(),
        v: voltage,
        i: currentA,
        p: powerW,
        e_wh: energyWh
      };

      const topic = `wattwise/${config.household}/${device.id}/telemetry`;

      client.publish(topic, JSON.stringify(payload), { qos: 0 }, (err) => {
        if (err) {
          console.error(`[Publish Error] ${topic}: ${err.message}`);
        } else {
          console.log(`[PUB] ${topic} -> ${powerW}W | ${voltage}V | ${currentA}A | ${energyWh}Wh (${profile.name})`);
        }
      });
    });
  }, config.intervalSec * 1000);
}

// Graceful termination
process.on('SIGINT', () => {
  console.log('\nStopping telemetry simulator...');
  if (intervalTimer) clearInterval(intervalTimer);
  client.end(false, () => {
    console.log('MQTT client disconnected. Exiting.');
    process.exit(0);
  });
});
