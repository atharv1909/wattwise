-- =====================================================================
-- WattWise Database Schema (MySQL 8.0)
-- TPDS 3 Course Project: Module 3 (Databases & Backend)
-- Covers: Normalized Schema, Foreign Keys, Triggers, Views, Procedures
-- =====================================================================

CREATE DATABASE IF NOT EXISTS wattwise;
USE wattwise;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Tariffs Table (Stores official regulatory tariff orders - MERC / MSEDCL)
CREATE TABLE IF NOT EXISTS tariffs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  state VARCHAR(64) NOT NULL,
  discom VARCHAR(128) NOT NULL,
  category VARCHAR(64) NOT NULL,                 -- e.g., 'Residential (LT-I)', 'Commercial'
  phase ENUM('single_phase', 'three_phase') NOT NULL DEFAULT 'single_phase',
  effective_from DATE NOT NULL,
  effective_to DATE NULL,
  fixed_charge_monthly DECIMAL(10, 2) NOT NULL,  -- e.g. 128.00 per month
  wheeling_charge_per_unit DECIMAL(8, 4) NOT NULL DEFAULT 1.2800,
  fac_per_unit DECIMAL(8, 4) NOT NULL DEFAULT 0.3500,     -- Fuel Adjustment Charge
  duty_percent DECIMAL(5, 2) NOT NULL DEFAULT 16.00,       -- Maharashtra 16% Electricity Duty
  order_reference VARCHAR(255) NOT NULL,         -- MERC Case No. and Tariff Order Citation
  source_url VARCHAR(500),
  UNIQUE KEY uq_tariff (state, discom, category, phase, effective_from)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Tariff Slabs Table (Dynamic tiered pricing per tariff)
CREATE TABLE IF NOT EXISTS tariff_slabs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tariff_id INT NOT NULL,
  slab_order TINYINT NOT NULL,
  from_unit DECIMAL(10, 2) NOT NULL,
  to_unit DECIMAL(10, 2) NULL,                    -- NULL indicates open-ended (e.g. >500 units)
  rate_per_unit DECIMAL(8, 4) NOT NULL,
  FOREIGN KEY (tariff_id) REFERENCES tariffs(id) ON DELETE CASCADE,
  UNIQUE KEY uq_slab_tier (tariff_id, slab_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Households Table
CREATE TABLE IF NOT EXISTS households (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  name VARCHAR(120) NOT NULL,
  tariff_id INT NOT NULL,
  sanctioned_load_kw DECIMAL(5, 2) NOT NULL DEFAULT 2.00,
  billing_day TINYINT NOT NULL DEFAULT 1,         -- Day of the month billing cycle begins
  floor_plan JSON NULL,                           -- Lightweight 3D/2.5D room dimensions
  archetype ENUM('1BHK', '2BHK', '3BHK', 'PG_Flat', 'Independent_House') NOT NULL DEFAULT '2BHK',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (tariff_id) REFERENCES tariffs(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Rooms Table
CREATE TABLE IF NOT EXISTS rooms (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  household_id BIGINT NOT NULL,
  name VARCHAR(80) NOT NULL,
  room_type ENUM('Living Room', 'Bedroom', 'Kitchen', 'Bathroom', 'Balcony', 'Study') NOT NULL DEFAULT 'Living Room',
  width_m FLOAT NOT NULL DEFAULT 4.0,
  length_m FLOAT NOT NULL DEFAULT 4.0,
  FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Appliance Catalog (BEE star ratings & standard Indian appliance models)
CREATE TABLE IF NOT EXISTS appliance_catalog (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category VARCHAR(60) NOT NULL,                  -- 'Air Conditioner', 'Refrigerator', 'Ceiling Fan', etc.
  model_kind ENUM('constant', 'scheduled', 'cyclic', 'thermostatic', 'per_cycle', 'variable') NOT NULL,
  typical_rated_w INT NOT NULL,
  typical_standby_w DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
  bee_star_rating TINYINT NOT NULL DEFAULT 3,      -- 1 to 5 Stars
  default_daily_hours DECIMAL(4, 2) NOT NULL DEFAULT 4.00,
  source_note VARCHAR(255) NOT NULL               -- e.g. 'BEE Standards 2024 / Manufacturer Spec'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Installed Appliances
CREATE TABLE IF NOT EXISTS appliances (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  household_id BIGINT NOT NULL,
  room_id BIGINT NULL,
  catalog_id INT NOT NULL,
  custom_name VARCHAR(100) NOT NULL,
  rated_w INT NOT NULL,
  standby_w DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
  bee_star_rating TINYINT NOT NULL DEFAULT 3,
  daily_hours_guess DECIMAL(4, 2) NOT NULL DEFAULT 4.00,
  pos_x FLOAT NOT NULL DEFAULT 0.0,
  pos_y FLOAT NOT NULL DEFAULT 0.0,
  pos_z FLOAT NOT NULL DEFAULT 0.0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL,
  FOREIGN KEY (catalog_id) REFERENCES appliance_catalog(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. Daily Meter Readings (Enables Bayesian/ridge regression and daily forecast)
CREATE TABLE IF NOT EXISTS meter_readings (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  household_id BIGINT NOT NULL,
  reading_date DATE NOT NULL,
  cumulative_kwh DECIMAL(12, 3) NOT NULL,
  daily_units DECIMAL(10, 3) NULL,                -- Computed delta from previous reading
  source ENUM('manual', 'estimated', 'simulated') NOT NULL DEFAULT 'manual',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_hh_reading_date (household_id, reading_date),
  INDEX idx_hh_date (household_id, reading_date),
  FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. Past and Current Bills (Auditing & Golden Test Verification)
CREATE TABLE IF NOT EXISTS bills (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  household_id BIGINT NOT NULL,
  bill_month VARCHAR(7) NOT NULL,                  -- Format 'YYYY-MM'
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  units_billed DECIMAL(10, 2) NOT NULL,
  amount_billed DECIMAL(10, 2) NOT NULL,          -- What the discom charged on the paper bill
  amount_recomputed DECIMAL(10, 2) NOT NULL,      -- Deterministically recomputed by billEngine
  mismatch_flag BOOLEAN NOT NULL DEFAULT FALSE,
  mismatch_reason VARCHAR(255) NULL,
  breakdown JSON NOT NULL,                        -- Full slab, fixed charge, duty, wheeling breakdown
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_hh_bill_month (household_id, bill_month),
  FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 10. Simulation Runs (Deterministic 30-day simulation of 4 appliance models)
CREATE TABLE IF NOT EXISTS sim_runs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  household_id BIGINT NOT NULL,
  run_name VARCHAR(100) NOT NULL DEFAULT 'Default 30-Day Simulation',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_kwh DECIMAL(10, 2) NOT NULL,
  projected_bill DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 11. Appliance Estimated Consumption Breakdowns
CREATE TABLE IF NOT EXISTS appliance_monthly_usage (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  household_id BIGINT NOT NULL,
  appliance_id BIGINT NOT NULL,
  month_year VARCHAR(7) NOT NULL,                 -- 'YYYY-MM'
  estimated_kwh DECIMAL(10, 2) NOT NULL,
  estimated_cost DECIMAL(10, 2) NOT NULL,
  percentage_share DECIMAL(5, 2) NOT NULL,
  FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE,
  FOREIGN KEY (appliance_id) REFERENCES appliances(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 12. System Alerts
CREATE TABLE IF NOT EXISTS alerts (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  household_id BIGINT NOT NULL,
  alert_type ENUM('slab_breach_warning', 'unusual_spike', 'bill_mismatch', 'tip') NOT NULL,
  title VARCHAR(120) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
