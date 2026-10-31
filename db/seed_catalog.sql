-- =====================================================================
-- WattWise Appliance Catalog Seeds
-- BEE Star Ratings & Physical Parameters for Indian Household Equipment
-- =====================================================================

USE wattwise;

DELETE FROM appliances;
DELETE FROM appliance_catalog;

INSERT INTO appliance_catalog (
  id, category, model_kind, typical_rated_w, typical_standby_w,
  bee_star_rating, default_daily_hours, source_note
) VALUES
-- 1. Air Conditioners (Thermostatic Model)
(1, '1.5 Ton Split AC (3-Star)', 'thermostatic', 1500, 3.50, 3, 6.00, 'BEE ISEER 3.8 Standard 2024'),
(2, '1.5 Ton Inverter AC (5-Star)', 'thermostatic', 1050, 2.00, 5, 6.00, 'BEE ISEER 5.0 High Efficiency 2024'),
(3, '1.0 Ton Split AC (3-Star)', 'thermostatic', 1100, 3.00, 3, 5.00, 'BEE ISEER 3.7 Standard 2024'),

-- 2. Refrigerators (Cyclic Model: ~40% compressor duty cycle)
(4, 'Double Door Refrigerator (260L 3-Star)', 'cyclic', 140, 2.00, 3, 24.00, 'BEE Star Label ~210 kWh/year'),
(5, 'Single Door Refrigerator (190L 4-Star)', 'cyclic', 90, 1.50, 4, 24.00, 'BEE Star Label ~135 kWh/year'),

-- 3. Ceiling Fans (Scheduled Model)
(6, 'Standard Induction Ceiling Fan', 'scheduled', 75, 0.00, 1, 10.00, 'Conventional Capacitor Motor Fan'),
(7, 'BLDC Energy Saving Ceiling Fan (5-Star)', 'scheduled', 28, 0.50, 5, 10.00, 'Brushless DC Motor 5-Star BEE 2024'),

-- 4. Lighting (Scheduled Model)
(8, 'LED Tube Light / Batten', 'scheduled', 20, 0.00, 5, 6.00, 'Standard 20W T5 LED Batten'),
(9, 'LED Bulb (9W)', 'scheduled', 9, 0.00, 5, 5.00, '9W B22 LED Bulb'),

-- 5. Water Heating (Scheduled High-Wattage Model)
(10, 'Storage Water Geyser (15L 3-Star)', 'scheduled', 2000, 1.00, 3, 1.00, 'Instant/Storage Geyser BEE 2023'),
(11, 'Storage Water Geyser (15L 5-Star)', 'scheduled', 1800, 0.50, 5, 0.80, '5-Star High Insulation Geyser'),

-- 6. Entertainment & Always-On (Constant / Scheduled)
(12, 'Smart LED TV 43-inch', 'scheduled', 65, 1.50, 4, 4.00, '4K UHD LED TV Active Run'),
(13, 'Wi-Fi Router & Modem', 'constant', 10, 10.00, 5, 24.00, 'Dual-Band Gigabit Router (Always ON)'),
(14, 'Desktop Computer / Laptop Setup', 'scheduled', 150, 5.00, 4, 6.00, 'Workstation / Monitor Setup'),

-- 7. Kitchen & Utility
(15, 'Fully Automatic Washing Machine', 'per_cycle', 450, 1.00, 4, 0.75, 'Front/Top Load Wash Cycle ~0.35 kWh/cycle'),
(16, 'Microwave Oven (20L)', 'scheduled', 1200, 2.00, 3, 0.30, 'Convection/Grill Magnetron Active');
