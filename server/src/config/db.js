/**
 * WattWise Database Connection & Data Store
 * Supports Dual-Mode: MySQL 8.0 (when connected) + In-Memory Fallback Store
 * Ensures the app works 100% out of the box for testing and evaluation.
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

let pool = null;
let useMysql = false;

// In-Memory Seed Data Fallback Store
const memoryStore = {
  users: [
    { id: 1, name: 'Aditya Sharma', email: 'demo@wattwise.in', password_hash: '$2a$10$78e9LdQe5PjGjQ5d3d4.uePZ.rXN8H9K8Dk6v8H7I.aYJ.Nq4M8S.', role: 'user' },
    { id: 2, name: 'Course Evaluator (Admin)', email: 'admin@wattwise.in', password_hash: '$2a$10$78e9LdQe5PjGjQ5d3d4.uePZ.rXN8H9K8Dk6v8H7I.aYJ.Nq4M8S.', role: 'admin' }
  ],
  households: [
    { id: 1, user_id: 1, name: 'Sharma Residence (2BHK, Nagpur)', tariff_id: 1, sanctioned_load_kw: 3.0, billing_day: 1, archetype: '2BHK' },
    { id: 2, user_id: 1, name: 'Verma Villa (3BHK, Pune)', tariff_id: 1, sanctioned_load_kw: 5.0, billing_day: 1, archetype: '3BHK' },
    { id: 3, user_id: 1, name: 'Students PG Flat (Nagpur)', tariff_id: 1, sanctioned_load_kw: 3.0, billing_day: 1, archetype: 'PG_Flat' },
    { id: 4, user_id: 1, name: 'Kulkarni Compact (1BHK, Nashik)', tariff_id: 1, sanctioned_load_kw: 1.5, billing_day: 1, archetype: '1BHK' }
  ],
  rooms: [
    { id: 1, household_id: 1, name: 'Master Bedroom', room_type: 'Bedroom', width_m: 4.0, length_m: 4.5 },
    { id: 2, household_id: 1, name: 'Living & Dining Room', room_type: 'Living Room', width_m: 5.0, length_m: 6.0 },
    { id: 3, household_id: 1, name: 'Kitchen', room_type: 'Kitchen', width_m: 3.0, length_m: 3.5 },
    { id: 4, household_id: 1, name: 'Bathroom & Utility', room_type: 'Bathroom', width_m: 2.5, length_m: 2.5 }
  ],
  appliances: [
    { id: 1, household_id: 1, room_id: 1, catalog_id: 1, custom_name: 'Master Bedroom Split AC', rated_w: 1500, standby_w: 3.5, bee_star_rating: 3, daily_hours_guess: 6.5, model_kind: 'thermostatic', category: 'Air Conditioner', pos_x: -2.0, pos_y: 1.5, pos_z: 0.0 },
    { id: 2, household_id: 1, room_id: 2, catalog_id: 6, custom_name: 'Living Room Ceiling Fan 1', rated_w: 75, standby_w: 0.0, bee_star_rating: 1, daily_hours_guess: 12.0, model_kind: 'scheduled', category: 'Ceiling Fan', pos_x: 0.0, pos_y: 2.2, pos_z: 0.0 },
    { id: 3, household_id: 1, room_id: 2, catalog_id: 6, custom_name: 'Living Room Ceiling Fan 2', rated_w: 75, standby_w: 0.0, bee_star_rating: 1, daily_hours_guess: 8.0, model_kind: 'scheduled', category: 'Ceiling Fan', pos_x: 2.0, pos_y: 2.2, pos_z: 0.0 },
    { id: 4, household_id: 1, room_id: 3, catalog_id: 4, custom_name: 'Kitchen Double Door Fridge', rated_w: 140, standby_w: 2.0, bee_star_rating: 3, daily_hours_guess: 24.0, model_kind: 'cyclic', category: 'Refrigerator', pos_x: 3.0, pos_y: 0.8, pos_z: -1.0 },
    { id: 5, household_id: 1, room_id: 4, catalog_id: 10, custom_name: 'Bathroom Geyser', rated_w: 2000, standby_w: 1.0, bee_star_rating: 3, daily_hours_guess: 1.0, model_kind: 'scheduled', category: 'Water Geyser', pos_x: 1.5, pos_y: 1.8, pos_z: 2.0 },
    { id: 6, household_id: 1, room_id: 2, catalog_id: 12, custom_name: 'Hall Smart 4K TV', rated_w: 65, standby_w: 2.0, bee_star_rating: 4, daily_hours_guess: 5.0, model_kind: 'scheduled', category: 'Television', pos_x: 0.0, pos_y: 0.9, pos_z: -2.5 },
    { id: 7, household_id: 1, room_id: 2, catalog_id: 13, custom_name: 'Wi-Fi Fiber Router', rated_w: 10, standby_w: 10.0, bee_star_rating: 5, daily_hours_guess: 24.0, model_kind: 'constant', category: 'Always-On', pos_x: -1.5, pos_y: 0.5, pos_z: -2.0 },
    { id: 8, household_id: 1, room_id: 1, catalog_id: 8, custom_name: 'Master Bedroom LED Batten', rated_w: 20, standby_w: 0.0, bee_star_rating: 5, daily_hours_guess: 5.0, model_kind: 'scheduled', category: 'Lighting', pos_x: -2.0, pos_y: 2.0, pos_z: 1.0 },
    { id: 9, household_id: 1, room_id: 2, catalog_id: 8, custom_name: 'Living Room LED Batten', rated_w: 20, standby_w: 0.0, bee_star_rating: 5, daily_hours_guess: 6.0, model_kind: 'scheduled', category: 'Lighting', pos_x: 1.0, pos_y: 2.0, pos_z: -1.0 }
  ],
  bills: [
    {
      id: 1,
      household_id: 1,
      bill_month: '2024-05',
      units_billed: 342,
      amount_billed: 4402,
      amount_recomputed: 4402,
      mismatch_flag: false,
      mismatch_reason: null
    },
    {
      id: 2,
      household_id: 1,
      bill_month: '2024-06',
      units_billed: 240,
      amount_billed: 2904,
      amount_recomputed: 2904,
      mismatch_flag: false,
      mismatch_reason: null
    },
    {
      id: 3,
      household_id: 1,
      bill_month: '2024-07',
      units_billed: 210,
      amount_billed: 3550,
      amount_recomputed: 2504,
      mismatch_flag: true,
      mismatch_reason: 'Discom overcharged ₹1,046.00: Incorrect fixed charge tier applied or erroneous surcharge'
    }
  ],
  readings: [
    { reading_date: '2024-10-01', daily_units: 8.5 },
    { reading_date: '2024-10-02', daily_units: 8.7 },
    { reading_date: '2024-10-03', daily_units: 8.8 },
    { reading_date: '2024-10-04', daily_units: 9.4 },
    { reading_date: '2024-10-05', daily_units: 10.5 },
    { reading_date: '2024-10-06', daily_units: 8.8 },
    { reading_date: '2024-10-07', daily_units: 9.1 },
    { reading_date: '2024-10-08', daily_units: 9.1 },
    { reading_date: '2024-10-09', daily_units: 9.5 },
    { reading_date: '2024-10-10', daily_units: 9.2 },
    { reading_date: '2024-10-11', daily_units: 11.2 },
    { reading_date: '2024-10-12', daily_units: 10.7 },
    { reading_date: '2024-10-13', daily_units: 8.9 },
    { reading_date: '2024-10-14', daily_units: 9.1 },
    { reading_date: '2024-10-15', daily_units: 9.3 },
    { reading_date: '2024-10-16', daily_units: 9.2 },
    { reading_date: '2024-10-17', daily_units: 9.8 },
    { reading_date: '2024-10-18', daily_units: 10.5 },
    { reading_date: '2024-10-19', daily_units: 9.7 },
    { reading_date: '2024-10-20', daily_units: 9.5 }
  ],
  devices: [
    { id: 1, household_id: 1, appliance_id: 1, kind: 'smart_plug', name: 'Plug-AC-Master', token_hash: 'demo_token_001', last_seen: null, is_active: true },
    { id: 2, household_id: 1, appliance_id: 4, kind: 'smart_plug', name: 'Plug-Fridge', token_hash: 'demo_token_002', last_seen: null, is_active: true }
  ],
  powerSamples: [],
  usageEvents: [],
  splitGroups: [
    {
      id: 1,
      household_id: 1,
      name: 'Sharma Family Split',
      split_method: 'by_room',
      members: [
        { user_id: 1, room_id: 1, name: 'Master Bedroom' },
        { user_id: 1, room_id: 2, name: 'Living Room' },
        { user_id: 1, room_id: 3, name: 'Kitchen' }
      ]
    }
  ],
  alerts: [
    {
      id: 1,
      household_id: 1,
      alert_type: 'slab_breach_warning',
      title: 'Approaching Slab 2 (100 kWh)',
      message: 'You have consumed 88 kWh this cycle. Reaching 101 kWh increases your unit rate from ₹4.41 to ₹9.64/unit (2.18x jump).',
      is_read: false,
      created_at: new Date(Date.now() - 3600000 * 24).toISOString()
    },
    {
      id: 2,
      household_id: 1,
      alert_type: 'unusual_spike',
      title: 'High Standby Power Detected',
      message: 'Appliance drawing 25W during idle hours (02:00 - 05:00 AM). Check AC standby or entertainment system.',
      is_read: false,
      created_at: new Date(Date.now() - 3600000 * 12).toISOString()
    },
    {
      id: 3,
      household_id: 1,
      alert_type: 'bill_mismatch',
      title: 'July 2024 Bill Mismatch Detected',
      message: 'Discom billed ₹3,550 for 210 units, but deterministic calculation shows ₹2,504. Potential ₹1,046 overcharge.',
      is_read: true,
      created_at: new Date(Date.now() - 3600000 * 72).toISOString()
    }
  ]
};

async function initDatabase() {
  const host = process.env.DB_HOST || 'localhost';
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || 'wattwise';

  try {
    pool = mysql.createPool({
      host,
      user,
      password,
      database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    // Test connection
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    useMysql = true;
    console.log(`[DB] Connected successfully to MySQL 8.0 database: ${database}`);
  } catch (err) {
    useMysql = false;
    console.log(`[DB] MySQL server not reachable with current credentials (${err.message}). Using high-performance in-memory repository.`);
  }
}

function getStore() {
  return memoryStore;
}

function isUsingMysql() {
  return useMysql;
}

function getPool() {
  return pool;
}

module.exports = {
  initDatabase,
  getStore,
  isUsingMysql,
  getPool
};
