-- =====================================================================
-- WattWise Demo & Synthetic Population Seeds
-- Includes 4 Diverse Indian Household Archetypes & Golden Test Bills
-- =====================================================================

USE wattwise;

-- Clean existing demo data
DELETE FROM alerts;
DELETE FROM appliance_monthly_usage;
DELETE FROM sim_runs;
DELETE FROM bills;
DELETE FROM meter_readings;
DELETE FROM appliances;
DELETE FROM rooms;
DELETE FROM households;
DELETE FROM users;

-- 1. Demo Users
INSERT INTO users (id, name, email, password_hash, role) VALUES
(1, 'Aditya Sharma', 'demo@wattwise.in', '$2b$10$DemoHashedPasswordPlaceholderForBcrypt12345', 'user'),
(2, 'Course Evaluator (Admin)', 'admin@wattwise.in', '$2b$10$DemoHashedPasswordPlaceholderForBcrypt12345', 'admin');

-- 2. Households (4 Indian Archetypes)
INSERT INTO households (id, user_id, name, tariff_id, sanctioned_load_kw, billing_day, archetype, floor_plan) VALUES
(1, 1, 'Sharma Residence (2BHK, Nagpur)', 1, 3.00, 1, '2BHK', JSON_OBJECT('rooms_count', 4, 'area_sqft', 950)),
(2, 1, 'Verma Villa (3BHK, Pune)', 1, 5.00, 1, '3BHK', JSON_OBJECT('rooms_count', 5, 'area_sqft', 1400)),
(3, 1, 'Students PG Flat (4-Sharing, Nagpur)', 1, 3.00, 1, 'PG_Flat', JSON_OBJECT('rooms_count', 3, 'area_sqft', 800)),
(4, 1, 'Kulkarni Compact (1BHK, Nashik)', 1, 1.50, 1, '1BHK', JSON_OBJECT('rooms_count', 2, 'area_sqft', 550));

-- 3. Rooms for Household 1 (Sharma Residence)
INSERT INTO rooms (id, household_id, name, room_type, width_m, length_m) VALUES
(1, 1, 'Master Bedroom', 'Bedroom', 4.0, 4.5),
(2, 1, 'Living & Dining Room', 'Living Room', 5.0, 6.0),
(3, 1, 'Kitchen', 'Kitchen', 3.0, 3.5),
(4, 1, 'Bathroom & Utility', 'Bathroom', 2.5, 2.5);

-- 4. Installed Appliances for Household 1
INSERT INTO appliances (id, household_id, room_id, catalog_id, custom_name, rated_w, standby_w, bee_star_rating, daily_hours_guess, pos_x, pos_y, pos_z) VALUES
(1, 1, 1, 1, 'Master Bedroom Split AC', 1500, 3.50, 3, 6.50, -2.0, 1.5, 0.0),
(2, 1, 2, 6, 'Living Room Ceiling Fan 1', 75, 0.00, 1, 12.00, 0.0, 2.2, 0.0),
(3, 1, 2, 6, 'Living Room Ceiling Fan 2', 75, 0.00, 1, 8.00, 2.0, 2.2, 0.0),
(4, 1, 3, 4, 'Kitchen Double Door Fridge', 140, 2.00, 3, 24.00, 3.0, 0.8, -1.0),
(5, 1, 4, 10, 'Bathroom Geyser', 2000, 1.00, 3, 1.00, 1.5, 1.8, 2.0),
(6, 1, 2, 12, 'Hall Smart 4K TV', 65, 2.00, 4, 5.00, 0.0, 0.9, -2.5),
(7, 1, 2, 13, 'Wi-Fi Fiber Router', 10, 10.00, 5, 24.00, -1.5, 0.5, -2.0),
(8, 1, 1, 8, 'Master Bedroom LED Batten', 20, 0.00, 5, 5.00, -2.0, 2.0, 1.0),
(9, 1, 2, 8, 'Living Room LED Batten', 20, 0.00, 5, 6.00, 1.0, 2.0, -1.0);

-- 5. Golden Past Bills & Auditing Examples
-- Case 1: May 2024 (Summer AC load, 342 units). Deterministic recomputation matches genuine bill!
INSERT INTO bills (
  id, household_id, bill_month, period_start, period_end,
  units_billed, amount_billed, amount_recomputed, mismatch_flag, mismatch_reason, breakdown
) VALUES (
  1, 1, '2024-05', '2024-05-01', '2024-05-31',
  342.00, 4402.00, 4402.00, FALSE, NULL,
  JSON_OBJECT(
    'slab_breakdown', JSON_ARRAY(
      JSON_OBJECT('slab', '0-100', 'units', 100, 'rate', 4.41, 'amount', 441.00),
      JSON_OBJECT('slab', '101-300', 'units', 200, 'rate', 9.64, 'amount', 1928.00),
      JSON_OBJECT('slab', '301-500', 'units', 42, 'rate', 13.61, 'amount', 571.62)
    ),
    'energy_charges', 2940.62,
    'wheeling_charges', 437.76,
    'fixed_charges', 128.00,
    'fac_charges', 119.70,
    'electricity_duty', 596.17,
    'total_recomputed', 4402.00
  )
),
-- Case 2: June 2024 (Monsoon, 240 units). Matches genuine bill.
(
  2, 1, '2024-06', '2024-06-01', '2024-06-30',
  240.00, 2904.00, 2904.00, FALSE, NULL,
  JSON_OBJECT(
    'slab_breakdown', JSON_ARRAY(
      JSON_OBJECT('slab', '0-100', 'units', 100, 'rate', 4.41, 'amount', 441.00),
      JSON_OBJECT('slab', '101-300', 'units', 140, 'rate', 9.64, 'amount', 1349.60)
    ),
    'energy_charges', 1790.60,
    'wheeling_charges', 307.20,
    'fixed_charges', 128.00,
    'fac_charges', 84.00,
    'electricity_duty', 369.57,
    'total_recomputed', 2904.00
  )
),
-- Case 3: July 2024 (Discom Billing Error injection: DISCOM charged ₹3,550 for 210 units instead of ₹2,504!)
-- Demonstrates the Bill Auditor flagging feature
(
  3, 1, '2024-07', '2024-07-01', '2024-07-31',
  210.00, 3550.00, 2504.00, TRUE,
  'Discom overcharged ₹1,046.00: Incorrect fixed charge tier applied or erroneous surcharge',
  JSON_OBJECT(
    'slab_breakdown', JSON_ARRAY(
      JSON_OBJECT('slab', '0-100', 'units', 100, 'rate', 4.41, 'amount', 441.00),
      JSON_OBJECT('slab', '101-300', 'units', 110, 'rate', 9.64, 'amount', 1060.40)
    ),
    'energy_charges', 1501.40,
    'wheeling_charges', 268.80,
    'fixed_charges', 128.00,
    'fac_charges', 73.50,
    'electricity_duty', 315.47,
    'total_recomputed', 2504.00
  )
);

-- 6. Current Month Daily Meter Readings (Simulating Day 1 to Day 20 of Current Billing Cycle)
INSERT INTO meter_readings (household_id, reading_date, cumulative_kwh, daily_units, source) VALUES
(1, '2024-10-01', 4500.0, 0.0, 'manual'),
(1, '2024-10-02', 4508.5, 8.5, 'manual'),
(1, '2024-10-03', 4517.2, 8.7, 'manual'),
(1, '2024-10-04', 4526.0, 8.8, 'manual'),
(1, '2024-10-05', 4535.4, 9.4, 'manual'),
(1, '2024-10-06', 4545.9, 10.5, 'manual'),
(1, '2024-10-07', 4554.7, 8.8, 'manual'),
(1, '2024-10-08', 4563.8, 9.1, 'manual'),
(1, '2024-10-09', 4572.9, 9.1, 'manual'),
(1, '2024-10-10', 4582.4, 9.5, 'manual'),
(1, '2024-10-11', 4591.6, 9.2, 'manual'),
(1, '2024-10-12', 4602.8, 11.2, 'manual'),
(1, '2024-10-13', 4613.5, 10.7, 'manual'),
(1, '2024-10-14', 4622.4, 8.9, 'manual'),
(1, '2024-10-15', 4631.5, 9.1, 'manual'),
(1, '2024-10-16', 4640.8, 9.3, 'manual'),
(1, '2024-10-17', 4650.0, 9.2, 'manual'),
(1, '2024-10-18', 4659.8, 9.8, 'manual'),
(1, '2024-10-19', 4670.3, 10.5, 'manual'),
(1, '2024-10-20', 4680.0, 9.7, 'manual');

-- 7. Appliance Monthly Usage Breakdown for Household 1 (May 2024)
INSERT INTO appliance_monthly_usage (household_id, appliance_id, month_year, estimated_kwh, estimated_cost, percentage_share) VALUES
(1, 1, '2024-05', 185.00, 2380.00, 54.09), -- AC is 54% of bill!
(1, 4, '2024-05', 52.00, 670.00, 15.20),  -- Fridge is 15%
(1, 2, '2024-05', 38.00, 490.00, 11.11),  -- Fan 1 is 11%
(1, 3, '2024-05', 26.00, 335.00, 7.60),   -- Fan 2 is 7.6%
(1, 5, '2024-05', 22.00, 285.00, 6.43),   -- Geyser is 6.4%
(1, 6, '2024-05', 10.00, 130.00, 2.92),   -- TV
(1, 7, '2024-05', 5.00, 65.00, 1.46),     -- Router (standby)
(1, 8, '2024-05', 2.00, 25.00, 0.58),     -- LED 1
(1, 9, '2024-05', 2.00, 25.00, 0.58);     -- LED 2

-- 8. Proactive Alerts
INSERT INTO alerts (household_id, alert_type, title, message) VALUES
(1, 'slab_breach_warning', 'Approaching Slab 2 Threshold (100 units)', 'Current month-to-date consumption is 98.5 kWh. At your current rate of 9.5 units/day, you will cross into the ₹9.64/unit slab within 24 hours.'),
(1, 'bill_mismatch', 'Audit Discrepancy in July 2024 Bill', 'Your July 2024 paper bill was ₹3,550.00, but official MERC tariff rates calculate ₹2,504.00 (Difference: +₹1,046.00). Submit this audit slip for Discom dispute.'),
(1, 'tip', 'High AC Share Detected (54% of Bill)', 'Your Master Bedroom 3-Star AC consumes 54% of your total energy. Raising the setpoint from 22°C to 24°C will save an estimated ₹650/month.');
