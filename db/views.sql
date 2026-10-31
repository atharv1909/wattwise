-- =====================================================================
-- WattWise SQL Views & Analytical Window Functions (MySQL 8.0)
-- TPDS 3 Course Requirement: Module 1 (Power BI Integration) & Module 3 (Advanced SQL)
-- Features: Multi-table JOINs, Window Functions (DENSE_RANK, SUM OVER), CTEs
-- =====================================================================

USE wattwise;

-- 1. View: Monthly Usage Trends across households and archetypes (For Power BI Module 1)
CREATE OR REPLACE VIEW v_monthly_usage AS
SELECT 
  b.id AS bill_id,
  h.id AS household_id,
  h.name AS household_name,
  h.archetype,
  h.sanctioned_load_kw,
  t.discom,
  t.category AS tariff_category,
  b.bill_month,
  b.units_billed,
  b.amount_billed,
  b.amount_recomputed,
  (b.amount_billed - b.amount_recomputed) AS variance_rupees,
  b.mismatch_flag,
  -- Window function: Average monthly consumption across that household archetype
  AVG(b.units_billed) OVER(PARTITION BY h.archetype, b.bill_month) AS archetype_avg_units,
  -- Window function: Running total consumption for the household year-to-date
  SUM(b.units_billed) OVER(PARTITION BY h.id ORDER BY b.bill_month ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_annual_units
FROM bills b
JOIN households h ON b.household_id = h.id
JOIN tariffs t ON h.tariff_id = t.id;

-- 2. View: Appliance Share & Consumption Ranking (For Power BI Doughnut/Treemap Charts)
CREATE OR REPLACE VIEW v_appliance_share AS
WITH RankedAppliances AS (
  SELECT 
    amu.id,
    amu.household_id,
    h.name AS household_name,
    h.archetype,
    a.custom_name AS appliance_name,
    c.category AS appliance_category,
    c.model_kind,
    a.bee_star_rating,
    amu.month_year,
    amu.estimated_kwh,
    amu.estimated_cost,
    amu.percentage_share,
    -- Window Function: Rank appliances by energy consumed per household in that month
    DENSE_RANK() OVER(
      PARTITION BY amu.household_id, amu.month_year 
      ORDER BY amu.estimated_kwh DESC
    ) AS consumption_rank
  FROM appliance_monthly_usage amu
  JOIN appliances a ON amu.appliance_id = a.id
  JOIN appliance_catalog c ON a.catalog_id = c.id
  JOIN households h ON amu.household_id = h.id
)
SELECT * FROM RankedAppliances;

-- 3. View: Daily Meter Reading Deltas & Cumulative Progression
CREATE OR REPLACE VIEW v_daily_readings_analysis AS
SELECT 
  mr.id,
  mr.household_id,
  h.name AS household_name,
  mr.reading_date,
  mr.cumulative_kwh,
  -- Window function: Compute daily units consumed using LAG
  COALESCE(
    mr.daily_units, 
    mr.cumulative_kwh - LAG(mr.cumulative_kwh, 1) OVER(PARTITION BY mr.household_id ORDER BY mr.reading_date)
  ) AS calculated_daily_kwh,
  -- 7-day moving average of daily consumption
  AVG(
    COALESCE(
      mr.daily_units, 
      mr.cumulative_kwh - LAG(mr.cumulative_kwh, 1) OVER(PARTITION BY mr.household_id ORDER BY mr.reading_date)
    )
  ) OVER(PARTITION BY mr.household_id ORDER BY mr.reading_date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS moving_avg_7day_kwh
FROM meter_readings mr
JOIN households h ON mr.household_id = h.id;

-- 4. View: Bill Auditor Summary (Mismatch rate analysis for evaluators)
CREATE OR REPLACE VIEW v_bill_audit_summary AS
SELECT 
  h.archetype,
  COUNT(b.id) AS total_bills_audited,
  SUM(CASE WHEN b.mismatch_flag = 1 THEN 1 ELSE 0 END) AS mismatched_bills_count,
  ROUND(SUM(CASE WHEN b.mismatch_flag = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(b.id), 2) AS mismatch_rate_percent,
  ROUND(AVG(ABS(b.amount_billed - b.amount_recomputed)), 2) AS avg_absolute_error_inr
FROM bills b
JOIN households h ON b.household_id = h.id
GROUP BY h.archetype;
