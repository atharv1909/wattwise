-- =====================================================================
-- WattWise Tariff Seeds: Maharashtra State Electricity Distribution Co. Ltd. (MSEDCL)
-- Citations from official MERC Tariff Orders (merc.gov.in)
-- =====================================================================

USE wattwise;

-- Clear previous seeds for clean idempotency
DELETE FROM tariff_slabs;
DELETE FROM tariffs;

-- 1. MSEDCL LT-I Residential (Single Phase) - Standard Domestic Household
INSERT INTO tariffs (
  id, state, discom, category, phase, effective_from, effective_to,
  fixed_charge_monthly, wheeling_charge_per_unit, fac_per_unit, duty_percent,
  order_reference, source_url
) VALUES (
  1,
  'Maharashtra',
  'MSEDCL (Mahavitaran)',
  'Residential LT-I',
  'single_phase',
  '2024-04-01',
  NULL,
  128.00,       -- Fixed charge: ₹128/month for Single Phase LT-I
  1.2800,       -- Wheeling charge: ₹1.28 per unit
  0.3500,       -- Fuel Adjustment Charge (FAC): ₹0.35 per unit
  16.00,        -- Maharashtra State Electricity Duty: 16% on (Energy + Wheeling + Fixed + FAC)
  'MERC Order in Case No. 226 of 2022 / Mid-Term Review & Tariff Schedule FY 2024-25',
  'https://www.merc.gov.in/tariff-orders/msedcl-lt-tariffs'
);

-- Slabs for Tariff ID 1 (MSEDCL Single Phase Residential)
INSERT INTO tariff_slabs (tariff_id, slab_order, from_unit, to_unit, rate_per_unit) VALUES
(1, 1, 0, 100, 4.4100),       -- Slab 1: 0 - 100 units @ ₹4.41/kWh
(1, 2, 101, 300, 9.6400),     -- Slab 2: 101 - 300 units @ ₹9.64/kWh
(1, 3, 301, 500, 13.6100),    -- Slab 3: 301 - 500 units @ ₹13.61/kWh
(1, 4, 501, NULL, 15.7200);   -- Slab 4: Above 500 units @ ₹15.72/kWh

-- 2. MSEDCL LT-I Residential (Three Phase) - High-sanctioned load / Large home
INSERT INTO tariffs (
  id, state, discom, category, phase, effective_from, effective_to,
  fixed_charge_monthly, wheeling_charge_per_unit, fac_per_unit, duty_percent,
  order_reference, source_url
) VALUES (
  2,
  'Maharashtra',
  'MSEDCL (Mahavitaran)',
  'Residential LT-I',
  'three_phase',
  '2024-04-01',
  NULL,
  470.00,       -- Fixed charge: ₹470/month for Three Phase LT-I
  1.2800,       -- Wheeling charge: ₹1.28 per unit
  0.3500,       -- FAC: ₹0.35 per unit
  16.00,        -- Maharashtra Duty: 16%
  'MERC Order in Case No. 226 of 2022 / Mid-Term Review & Tariff Schedule FY 2024-25',
  'https://www.merc.gov.in/tariff-orders/msedcl-lt-tariffs'
);

-- Slabs for Tariff ID 2 (Three Phase Slabs have identical unit rates, different fixed charge)
INSERT INTO tariff_slabs (tariff_id, slab_order, from_unit, to_unit, rate_per_unit) VALUES
(2, 1, 0, 100, 4.4100),
(2, 2, 101, 300, 9.6400),
(2, 3, 301, 500, 13.6100),
(2, 4, 501, NULL, 15.7200);

-- 3. Historical Baseline (FY 2022-23) - For testing past bills & multi-year auditing
INSERT INTO tariffs (
  id, state, discom, category, phase, effective_from, effective_to,
  fixed_charge_monthly, wheeling_charge_per_unit, fac_per_unit, duty_percent,
  order_reference, source_url
) VALUES (
  3,
  'Maharashtra',
  'MSEDCL (Mahavitaran)',
  'Residential LT-I (FY22-23 Baseline)',
  'single_phase',
  '2022-04-01',
  '2024-03-31',
  116.00,
  1.1700,
  0.2500,
  16.00,
  'MERC Order Case No. 322 of 2019 / Tariff Schedule FY 2022-23',
  'https://www.merc.gov.in/tariff-orders/msedcl-baseline-2022'
);

INSERT INTO tariff_slabs (tariff_id, slab_order, from_unit, to_unit, rate_per_unit) VALUES
(3, 1, 0, 100, 3.4400),
(3, 2, 101, 300, 8.8000),
(3, 3, 301, 500, 12.5000),
(3, 4, 501, NULL, 14.5000);
