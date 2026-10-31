-- =====================================================================
-- WattWise Stored Procedures & Functions (MySQL 8.0)
-- TPDS 3 Course Requirement: Stored Procedures & Business Logic in SQL
-- =====================================================================

USE wattwise;

DROP PROCEDURE IF EXISTS calc_bill;
DROP PROCEDURE IF EXISTS audit_bill;

DELIMITER $$

-- 1. calc_bill: Mirrors the pure JavaScript billEngine in SQL
-- Iterates over ordered tariff_slabs, applies tiered rates, adds wheeling, fixed charges, FAC, and duty
CREATE PROCEDURE calc_bill(
  IN  p_units DECIMAL(10, 2),
  IN  p_tariff_id INT,
  OUT p_total DECIMAL(10, 2),
  OUT p_energy DECIMAL(10, 2),
  OUT p_wheeling DECIMAL(10, 2),
  OUT p_fixed DECIMAL(10, 2),
  OUT p_fac DECIMAL(10, 2),
  OUT p_duty DECIMAL(10, 2)
)
BEGIN
  DECLARE v_fixed_monthly DECIMAL(10, 2);
  DECLARE v_wheeling_rate DECIMAL(8, 4);
  DECLARE v_fac_rate DECIMAL(8, 4);
  DECLARE v_duty_pct DECIMAL(5, 2);
  
  DECLARE v_remaining_units DECIMAL(10, 2);
  DECLARE v_energy_sum DECIMAL(10, 2) DEFAULT 0.00;
  
  -- Cursor variables
  DECLARE done INT DEFAULT FALSE;
  DECLARE cur_from DECIMAL(10, 2);
  DECLARE cur_to DECIMAL(10, 2);
  DECLARE cur_rate DECIMAL(8, 4);
  DECLARE cur_slab_capacity DECIMAL(10, 2);
  DECLARE cur_units_in_slab DECIMAL(10, 2);

  DECLARE slab_cursor CURSOR FOR
    SELECT from_unit, to_unit, rate_per_unit
    FROM tariff_slabs
    WHERE tariff_id = p_tariff_id
    ORDER BY slab_order ASC;

  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

  -- Load tariff base parameters
  SELECT fixed_charge_monthly, wheeling_charge_per_unit, fac_per_unit, duty_percent
  INTO v_fixed_monthly, v_wheeling_rate, v_fac_rate, v_duty_pct
  FROM tariffs
  WHERE id = p_tariff_id;

  SET p_fixed = IFNULL(v_fixed_monthly, 128.00);
  SET p_wheeling = ROUND(p_units * IFNULL(v_wheeling_rate, 1.28), 2);
  SET p_fac = ROUND(p_units * IFNULL(v_fac_rate, 0.35), 2);

  -- Slab by slab calculation
  SET v_remaining_units = p_units;
  OPEN slab_cursor;

  slab_loop: LOOP
    FETCH slab_cursor INTO cur_from, cur_to, cur_rate;
    IF done OR v_remaining_units <= 0 THEN
      LEAVE slab_loop;
    END IF;

    IF cur_to IS NOT NULL THEN
      -- Slabs: 0-100 (capacity 100), 101-300 (capacity 200), etc.
      SET cur_slab_capacity = (cur_to - cur_from) + (CASE WHEN cur_from = 0 THEN 0 ELSE 1 END);
      SET cur_units_in_slab = LEAST(v_remaining_units, cur_slab_capacity);
    ELSE
      -- Open ended highest slab
      SET cur_units_in_slab = v_remaining_units;
    END IF;

    SET v_energy_sum = v_energy_sum + (cur_units_in_slab * cur_rate);
    SET v_remaining_units = v_remaining_units - cur_units_in_slab;
  END LOOP;

  CLOSE slab_cursor;

  SET p_energy = ROUND(v_energy_sum, 2);
  
  -- Electricity Duty: 16% on subtotal (Energy + Wheeling + Fixed + FAC)
  SET p_duty = ROUND((p_energy + p_wheeling + p_fixed + p_fac) * (IFNULL(v_duty_pct, 16.0) / 100.0), 2);
  
  -- Total Bill rounded to integer rupee
  SET p_total = ROUND(p_energy + p_wheeling + p_fixed + p_fac + p_duty);
END$$

-- 2. audit_bill: Compares customer's actual paper bill with deterministic tariff rules
CREATE PROCEDURE audit_bill(
  IN  p_household_id BIGINT,
  IN  p_units DECIMAL(10, 2),
  IN  p_amount DECIMAL(10, 2),
  OUT p_mismatch_flag INT,
  OUT p_recomputed DECIMAL(10, 2),
  OUT p_difference DECIMAL(10, 2)
)
BEGIN
  DECLARE v_tariff_id INT;
  DECLARE v_energy DECIMAL(10, 2);
  DECLARE v_wheeling DECIMAL(10, 2);
  DECLARE v_fixed DECIMAL(10, 2);
  DECLARE v_fac DECIMAL(10, 2);
  DECLARE v_duty DECIMAL(10, 2);

  SELECT tariff_id INTO v_tariff_id FROM households WHERE id = p_household_id;
  IF v_tariff_id IS NULL THEN
    SET v_tariff_id = 1; -- Fallback to MSEDCL Residential default
  END IF;

  CALL calc_bill(p_units, v_tariff_id, p_recomputed, v_energy, v_wheeling, v_fixed, v_fac, v_duty);

  SET p_difference = ROUND(p_amount - p_recomputed, 2);
  -- Flag if discrepancy exceeds ₹5 tolerance
  IF ABS(p_difference) > 5.00 THEN
    SET p_mismatch_flag = 1;
  ELSE
    SET p_mismatch_flag = 0;
  END IF;
END$$

DELIMITER ;
