# ⚡ WattWise

**Know your electricity bill before it arrives, and know exactly which appliance caused it.**

WattWise is a full-stack web app (PWA) that helps Indian households predict, explain, verify and reduce their electricity bill. It combines a **tariff-accurate bill engine**, a **3D virtual home** where you place and run your appliances, and an optional **IoT layer** that records real appliance usage automatically, so the numbers are measured instead of guessed.

> Status: course project / work in progress. Replace the placeholders marked `TODO` as you build.

---

## Table of contents
1. [The problem](#1-the-problem)
2. [What WattWise does](#2-what-wattwise-does)
3. [Who uses it](#3-who-uses-it)
4. [How it works at a glance](#4-how-it-works-at-a-glance)
5. [Tech stack](#5-tech-stack)
6. [Architecture](#6-architecture)
7. [Bill calculation engine](#7-bill-calculation-engine)
8. [3D household simulator](#8-3d-household-simulator)
9. [IoT auto-logging (real usage, not guesses)](#9-iot-auto-logging)
10. [Validation: proving the numbers are right](#10-validation-proving-the-numbers-are-right)
11. [Database design (MySQL)](#11-database-design-mysql)
12. [REST API](#12-rest-api)
13. [Frontend screens](#13-frontend-screens)
14. [Dashboards (admin / analytics)](#14-dashboards-admin--analytics)
15. [Project structure](#15-project-structure)
16. [Getting started](#16-getting-started)
17. [Docker and deployment](#17-docker-and-deployment)
18. [Testing and CI](#18-testing-and-ci)
19. [Security and privacy](#19-security-and-privacy)
20. [Hardware safety (read before touching any wiring)](#20-hardware-safety)
21. [Roadmap and build phases](#21-roadmap-and-build-phases)
22. [Course syllabus mapping](#22-course-syllabus-mapping)
23. [Demo script](#23-demo-script)
24. [Limitations](#24-limitations)
25. [Data sources and credits](#25-data-sources-and-credits)
26. [License](#26-license)

---

## 1. The problem

- A monthly electricity bill is a surprise. Households do not know **which appliance or habit** produced it.
- Tariffs are layered (slabs, fixed charges, fuel adjustment, duty, sometimes time-of-day rates), so people cannot predict the bill or check it for mistakes.
- Energy-saving advice is generic ("use LED bulbs") because nobody has per-appliance data for *their* home.
- Existing guesses ("my AC runs 8 hours") are usually wrong, so any estimate built on them is wrong too.

## 2. What WattWise does

| Feature | What the user gets |
|---|---|
| **Live bill projection** | Month-to-date units, projected units, projected bill, slab-by-slab breakdown |
| **Appliance-wise breakdown** | Share of the bill per appliance and per room |
| **3D virtual home** | Build your home in 3D, place appliances, run a simulated day/month, watch the bill update |
| **Bill checker** | Enter units and amount from a real bill; WattWise recomputes it from the tariff and flags a mismatch |
| **Reality check** | Compares the simulated/measured consumption to the *actual* billed units and shows the unexplained gap |
| **Auto-logging (optional)** | Smart plugs / energy meters record each appliance's real runtime and energy |
| **Alerts** | "You will cross the next slab in 6 days", "Fridge draws more than usual" |
| **What-if simulator** | Swap in a 5-star AC, add rooftop solar, shift usage out of peak hours; see the savings |
| **Shared bill splitter** | Split one meter's bill fairly across rooms/flatmates/PG residents by measured or simulated use |
| **Admin analytics** | Aggregate usage by region and tariff, top saving tips, device health |

## 3. Who uses it

- **Households** who want to cut and understand their bill.
- **Students and tenants (PGs, hostels, shared flats)** who split one meter.
- **Small shop owners** with a handful of heavy appliances.
- **Admin (you / course evaluators)** who see aggregate analytics.

## 4. How it works at a glance

```
 Real bill (units, amount)  ─┐
                              ├─►  Reality check  ◄── Simulated usage (3D home)
 Tariff rules (slabs, etc.) ──┤         ▲                     ▲
                              │         │                     │
 Smart plugs / meters (MQTT) ─┴─► Measured usage ─────────────┘ (calibrates the simulation)
```

The loop: **simulate → measure → compare with the real bill → calibrate → explain the gap.**

## 5. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Front-end | React + Bootstrap (responsive, PWA) | Course Module 2 |
| 3D | three.js via `@react-three/fiber` + `@react-three/drei` | Declarative 3D inside React |
| Back-end | Node.js + Express (REST, JWT auth) | Course Module 3 |
| Database | **MySQL 8** (InnoDB) | Relational fit: tariffs, readings, joins, stored procedures |
| Realtime | WebSocket (Socket.IO) | Live appliance state in the 3D scene |
| IoT transport | MQTT (Mosquitto broker) + `mqtt.js` subscriber | Standard for smart plugs and ESP32 |
| Charts | Recharts or Chart.js in-app; Metabase/Power BI for admin | Course Module 1 |
| Containers | Docker + docker-compose | Course Module 4 |
| CI/CD | GitHub Actions | Course Module 4 |
| Weather (optional) | Open-Meteo or similar free weather API [verify terms] | Drives AC/cooler duty cycle in simulation |

## 6. Architecture

```
                    ┌────────────────────────────────────────────┐
 Browser / PWA ───► │ React + Bootstrap UI  +  three.js 3D scene │
                    └───────────────┬────────────────────────────┘
                                    │ HTTPS (REST) + WebSocket
                    ┌───────────────▼────────────────────────────┐
                    │ Node/Express API                            │
                    │  auth · households · appliances · bills     │
                    │  billEngine · simEngine · alerts            │
                    └───────┬──────────────────────┬─────────────┘
                            │ SQL                  │ subscribe
                    ┌───────▼────────┐     ┌───────▼──────────────┐
                    │ MySQL 8        │     │ MQTT broker (Mosquitto)│
                    └────────────────┘     └───────▲──────────────┘
                                                   │ publish
                                    ┌──────────────┴──────────────┐
                                    │ Smart plugs / ESP32 + energy │
                                    │ sensor at the appliance      │
                                    └──────────────────────────────┘
```

Key design rule: the **bill engine is one pure module** (`billEngine`) used by every feature (projection, checker, simulator, what-if). It takes `(units_by_time, tariff)` and returns a full bill. One implementation, one place to test.

## 7. Bill calculation engine

Tariffs differ by state, discom and category, and they change. **Never hardcode rates.** Store them in the database and load them by `(state, discom, category, effective_from)`.

Typical structure (varies by discom; confirm each component in the current regulator tariff order):

```
energy_charge   = Σ over slabs ( units_in_slab × rate_per_unit )
fixed_charge    = f(sanctioned_load) or flat per month
fuel_adj_charge = units × FAC_rate                 (if applicable)
tod_adjustment  = Σ over TOD periods ( units × (multiplier or rate) )   (if applicable)
duty_tax        = duty_percent × (energy + fixed + FAC)                  (if applicable)
other_charges   = configurable lines
total           = energy + fixed + FAC + TOD + duty + other
```

Implementation notes:
- Slab calculation is a loop over ordered `tariff_slabs` rows; implement it **once** as a pure function and mirror it as a MySQL stored function only if you want to demo SQL skills (keep Node as the source of truth, and test both against the same fixtures).
- Billing cycle and partial months: compute from reading dates, not calendar months.
- Add **golden tests**: take 5 to 10 real past bills (your own family's), encode them as fixtures, and require the engine to reproduce them to the rupee or explain the difference.
- Seed the tariff for Maharashtra (MSEDCL residential) first since you are in Nagpur; **copy the numbers from the official tariff order PDF and cite its date and order number in the `tariffs` table** (`source_url`, `effective_from`).

## 8. 3D household simulator

### 8.1 Goal
Reproduce your real home digitally so that running it for a virtual month produces **units and a bill you can compare against the real bill.**

### 8.2 Scene model
- **Home builder:** rooms drawn on a grid (width × length), walls extruded, floor plan saved as JSON in MySQL.
- **Appliance catalog:** glTF models (use freely licensed assets such as Kenney or Quaternius, and check each licence) mapped to a catalog row.
- **Placement:** drag from a catalog panel into a room; position, rotation and room are stored.
- **Interaction:** click an appliance to open its panel (power, schedule, standby, real device link).
- **Visual feedback:** glow/animation when ON, colour by instantaneous wattage, floating kWh label, heat-map overlay for "cost per room".
- **Time control:** play/pause/scrub; speed 1 min/s → 1 day/10 s; day/night lighting follows simulated time.

### 8.3 Appliance power models
Each appliance has a model, not just "watts × hours".

| Type | Model |
|---|---|
| Always-on (router, standby) | Constant `standby_w` |
| Scheduled on/off (lights, TV, fan, geyser) | `rated_w × on_time` from a weekly schedule; optional ramp/warm-up |
| Cyclic (refrigerator) | Compressor duty cycle (e.g. on X min / off Y min), scaled by ambient temperature |
| Thermostatic (AC, cooler, geyser) | Duty cycle as a function of outside temperature, setpoint, tonnage/star rating; simple first-order model |
| Motor loads (washing machine, mixer, pump) | Per-cycle energy (kWh per cycle) × cycles per week |
| Variable (inverter AC, fans) | Speed level → watts lookup table |

Parameters live in `appliances` (per instance) and `appliance_catalog` (defaults). Every default must carry a `source` note (nameplate, BEE star label, or measured).

### 8.4 Simulation engine
- Pure function: `simulate(home, schedules, weather, start, end, step=1min) → power_series per appliance`.
- Runs **server-side** for month-long runs (fast, reproducible, testable) and **client-side** for the live animation.
- Output goes to `sim_runs` and `sim_samples`, then through the same `billEngine`.

### 8.5 Calibration (what makes it "concrete")
After one real bill cycle:
1. `actual_units` (from bill) vs `simulated_units` → **error %**.
2. Fit correction factors per appliance (usage hours, efficiency derating) with constrained least squares so the simulation matches the measured sub-metered appliances first, then the total.
3. Remaining difference is shown as **"unexplained load"** (standby, forgotten devices, wrong wattage, wiring losses, meter error). This is a feature, not a failure: it tells the user where to look.

## 9. IoT auto-logging

Goal: record each appliance's **actual ON time and energy** automatically.

### 9.1 Tiers (build in order; each tier is a valid demo)

| Tier | How usage is obtained | Hardware | Effort |
|---|---|---|---|
| **0** | Manual entry of hours | None | Done in phase 1 |
| **1** | Simulated device (a script publishing realistic MQTT messages) | None | Low; lets you build and test the whole pipeline without hardware |
| **2** | **Smart plugs with energy monitoring** on plug-in appliances | Plugs that expose local HTTP/MQTT (e.g. Shelly or Tasmota-based plugs [verify current models and local-API support]) | Medium |
| **3** | **DIY sensor node**: ESP32 + energy sensor module publishing MQTT | ESP32 + PZEM-004T v3 or similar [verify]; **mains wiring, see §20** | Medium/High |
| **4** (stretch) | Whole-home measurement (CT clamp) + **NILM**: infer which appliance turned on from step changes in total power | CT clamp on the main feed, installed by a qualified electrician | High |

> Heavy loads (AC, geyser, induction) need plugs **rated for the current**. A 1.5-ton AC or a geyser often needs a 16 A-rated device, and many cheap plugs are not suitable. Check the rating against the appliance's draw.

### 9.2 Data flow
1. Device publishes to topic `wattwise/<household_id>/<device_id>/telemetry` every N seconds:
   ```json
   {"ts": 1767225600, "v": 231.4, "i": 1.82, "p": 395.2, "e_wh": 128934.0}
   ```
2. Backend MQTT subscriber validates the payload, checks the device is registered to that household (reject unknown), and inserts into `power_samples`.
3. A **state machine** converts samples to **usage events**: ON when `p > on_threshold` for a minimum duration, OFF when below `off_threshold`; stores `usage_events(start, end, wh)`.
4. Hourly/daily **rollups** are written to `usage_rollups` (keep raw samples for a limited window, e.g. 14 days, to control DB size).
5. Socket.IO pushes live wattage to the 3D scene; the matching virtual appliance glows and shows watts.
6. The same events feed the bill projection and alerts.

### 9.3 Device pairing
- User adds a device in the UI → server issues a **device token and MQTT credentials** (per-device, revocable).
- User links the device to an appliance (`appliance_id`) so the physical plug and the 3D object are the same entity.

### 9.4 Reliability
- Devices buffer samples locally on disconnect and send later with original timestamps (`ts`); the server de-duplicates on `(device_id, ts)`.
- Mark gaps as `missing`, not zero. Never silently treat missing as "off".
- Report **sub-meter coverage** = measured kWh ÷ billed kWh. Show it honestly.

## 10. Validation: proving the numbers are right

This is the section evaluators will remember. Run it on your own home for at least one full billing cycle (two is better).

**Three estimates of the same bill:**

| Method | Input | Expected behaviour |
|---|---|---|
| A. Guess | User's guessed hours per appliance | Worst |
| B. Simulation | 3D home + schedules + weather | Better |
| C. Measured | Smart-plug data for monitored appliances + simulation for the rest | Best |

**Procedure**
1. Record the actual bill: units, amount, billing dates.
2. Run A, B, C for the same dates.
3. Compute for each: absolute error in units and ₹, and **MAPE** = `|estimate − actual| / actual`.
4. Report per-appliance share and **sub-meter coverage**.
5. Show the **unexplained load** and a short list of likely causes.

**Results table (fill with your real data; do not invent numbers):**

| Billing cycle | Actual units | A: Guess | B: Sim | C: Measured | Actual ₹ | C: ₹ | C error % | Coverage % |
|---|---|---|---|---|---|---|---|---|
| TODO | | | | | | | | |

**Honest caveats to state in your report:** meter tolerance, estimated vs actual billing days, unmonitored loads, and that plug-measured power is only as good as the device's calibration (check one plug against a known load).

## 11. Database design (MySQL)

Core principle: normalised schema, foreign keys everywhere, composite indexes on time-series tables.

### 11.1 Entity overview
```
users 1─* households 1─* rooms 1─* appliances *─1 appliance_catalog
households 1─* meter_readings
households *─1 tariffs 1─* tariff_slabs
tariffs 1─* tariff_charges ; tariffs 1─* tod_periods
appliances 1─* usage_events ; devices 1─* power_samples
households 1─* bills ; households 1─* alerts
households 1─* sim_runs 1─* sim_samples
households 1─* shared_groups 1─* group_members
```

### 11.2 Schema (starter)

```sql
CREATE TABLE users (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  pw_hash VARCHAR(255) NOT NULL,
  role ENUM('user','admin') NOT NULL DEFAULT 'user',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tariffs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  state VARCHAR(64) NOT NULL,
  discom VARCHAR(128) NOT NULL,
  category VARCHAR(64) NOT NULL,          -- e.g. residential, commercial
  effective_from DATE NOT NULL,
  effective_to DATE NULL,
  fixed_charge_type ENUM('flat','per_kw') NOT NULL,
  fixed_charge_value DECIMAL(10,2) NOT NULL,
  duty_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
  source_url VARCHAR(500),
  UNIQUE KEY uq_tariff (state, discom, category, effective_from)
);

CREATE TABLE tariff_slabs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tariff_id INT NOT NULL,
  slab_order TINYINT NOT NULL,
  from_unit DECIMAL(10,2) NOT NULL,
  to_unit DECIMAL(10,2) NULL,             -- NULL = open ended
  rate_per_unit DECIMAL(8,4) NOT NULL,
  FOREIGN KEY (tariff_id) REFERENCES tariffs(id) ON DELETE CASCADE,
  UNIQUE KEY uq_slab (tariff_id, slab_order)
);

CREATE TABLE tariff_charges (            -- FAC, surcharges, other lines
  id INT AUTO_INCREMENT PRIMARY KEY,
  tariff_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  basis ENUM('per_unit','percent_of_energy','flat') NOT NULL,
  value DECIMAL(10,4) NOT NULL,
  FOREIGN KEY (tariff_id) REFERENCES tariffs(id) ON DELETE CASCADE
);

CREATE TABLE tod_periods (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tariff_id INT NOT NULL,
  start_time TIME NOT NULL, end_time TIME NOT NULL,
  multiplier DECIMAL(5,3) NOT NULL,
  FOREIGN KEY (tariff_id) REFERENCES tariffs(id) ON DELETE CASCADE
);

CREATE TABLE households (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  name VARCHAR(120) NOT NULL,
  tariff_id INT NOT NULL,
  sanctioned_load_kw DECIMAL(5,2),
  billing_day TINYINT,
  floor_plan JSON,                        -- 3D layout
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (tariff_id) REFERENCES tariffs(id)
);

CREATE TABLE rooms (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  household_id BIGINT NOT NULL,
  name VARCHAR(80) NOT NULL,
  geometry JSON,
  FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE
);

CREATE TABLE appliance_catalog (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type VARCHAR(60) NOT NULL,              -- ac, fridge, fan, led, geyser ...
  model_kind ENUM('constant','scheduled','cyclic','thermostatic','per_cycle','variable') NOT NULL,
  default_rated_w INT, default_standby_w DECIMAL(6,2),
  default_params JSON, gltf_path VARCHAR(255),
  source_note VARCHAR(255)
);

CREATE TABLE appliances (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  household_id BIGINT NOT NULL, room_id BIGINT NULL,
  catalog_id INT NOT NULL, label VARCHAR(100),
  rated_w INT, standby_w DECIMAL(6,2), star_rating TINYINT,
  params JSON, schedule JSON,
  pos_x FLOAT, pos_y FLOAT, pos_z FLOAT, rot_y FLOAT,
  FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL,
  FOREIGN KEY (catalog_id) REFERENCES appliance_catalog(id)
);

CREATE TABLE meter_readings (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  household_id BIGINT NOT NULL,
  read_at DATETIME NOT NULL, kwh_total DECIMAL(12,3) NOT NULL,
  source ENUM('manual','photo','device') NOT NULL DEFAULT 'manual',
  INDEX idx_hh_time (household_id, read_at),
  FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE
);

CREATE TABLE bills (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  household_id BIGINT NOT NULL,
  period_start DATE NOT NULL, period_end DATE NOT NULL,
  units_billed DECIMAL(10,2) NOT NULL, amount_billed DECIMAL(10,2) NOT NULL,
  amount_recomputed DECIMAL(10,2), mismatch_flag BOOLEAN DEFAULT FALSE,
  breakdown JSON,
  FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE
);

CREATE TABLE devices (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  household_id BIGINT NOT NULL, appliance_id BIGINT NULL,
  kind VARCHAR(40), token_hash VARCHAR(255) NOT NULL,
  last_seen TIMESTAMP NULL, is_active BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE,
  FOREIGN KEY (appliance_id) REFERENCES appliances(id) ON DELETE SET NULL
);

CREATE TABLE power_samples (               -- raw, short retention
  device_id BIGINT NOT NULL, ts DATETIME NOT NULL,
  p_w FLOAT, v FLOAT, i FLOAT, e_wh DOUBLE,
  PRIMARY KEY (device_id, ts),
  FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);

CREATE TABLE usage_events (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  appliance_id BIGINT NOT NULL, start_ts DATETIME NOT NULL, end_ts DATETIME,
  wh DOUBLE, source ENUM('measured','simulated','manual') NOT NULL,
  INDEX idx_app_time (appliance_id, start_ts),
  FOREIGN KEY (appliance_id) REFERENCES appliances(id) ON DELETE CASCADE
);

CREATE TABLE usage_rollups (
  appliance_id BIGINT NOT NULL, bucket DATETIME NOT NULL,
  granularity ENUM('hour','day') NOT NULL,
  wh DOUBLE NOT NULL, minutes_on INT, source ENUM('measured','simulated','manual') NOT NULL,
  PRIMARY KEY (appliance_id, bucket, granularity, source)
);

CREATE TABLE sim_runs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  household_id BIGINT NOT NULL, start_date DATE, end_date DATE,
  config JSON, total_kwh DOUBLE, bill_amount DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE
);

CREATE TABLE alerts (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  household_id BIGINT NOT NULL, type VARCHAR(50), message VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, read_at TIMESTAMP NULL,
  FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE
);

CREATE TABLE shared_groups (
  id BIGINT AUTO_INCREMENT PRIMARY KEY, household_id BIGINT NOT NULL, name VARCHAR(100),
  split_method ENUM('equal','by_room','by_usage') NOT NULL,
  FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE
);
CREATE TABLE group_members (
  group_id BIGINT NOT NULL, user_id BIGINT NOT NULL, room_id BIGINT NULL,
  PRIMARY KEY (group_id, user_id),
  FOREIGN KEY (group_id) REFERENCES shared_groups(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### 11.3 SQL features to showcase (for marks)
- **Joins and aggregates:** per-appliance and per-room monthly kWh and cost.
- **Window functions:** running month-to-date units, rank of appliances by consumption.
- **Stored function/procedure:** `calc_bill(household_id, period_start, period_end)` mirroring the Node engine.
- **Views:** `v_monthly_usage`, `v_appliance_share`.
- **Transactions:** bill creation + recompute + alert in one transaction.
- **Indexes and `EXPLAIN`:** show the query plan on `power_samples` before/after indexing.
- **Event scheduler or cron job:** nightly rollups and raw-sample purge.

### 11.4 Why MySQL (and when MongoDB would fit)
Tariffs, readings, bills and relationships are naturally relational, and the course lists SQL. If you want a MongoDB component, the **high-volume `power_samples`** (document-per-sample or bucketed) is the one place it is defensible; keep it optional and justify it in your report.

## 12. REST API

Base path `/api/v1`. All routes except auth require `Authorization: Bearer <JWT>`.

| Method & path | Purpose |
|---|---|
| `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh` | Auth |
| `GET/POST /households`, `GET/PATCH /households/:id` | Home profile, tariff, sanctioned load |
| `GET/POST /households/:id/rooms` | Rooms |
| `GET /catalog/appliances` | Appliance catalog |
| `GET/POST/PATCH/DELETE /households/:id/appliances` | Appliances (incl. 3D position) |
| `POST /households/:id/readings` | Add meter reading (manual/photo) |
| `GET /households/:id/usage?from&to&group=day|appliance|room` | Usage analytics |
| `GET /households/:id/projection` | Projected units and bill |
| `POST /households/:id/bills` | Save an actual bill; returns recomputed bill + mismatch flag |
| `POST /bill/calculate` | Stateless: `{units, tariff_id, period}` → breakdown |
| `POST /households/:id/simulate` | Run a simulation; returns series + bill |
| `POST /households/:id/whatif` | Apply changes (new appliance, solar, schedule shift), return delta |
| `GET /households/:id/reality-check?bill_id=` | A/B/C comparison and unexplained load |
| `GET/POST /households/:id/devices`, `DELETE /devices/:id` | IoT device management and pairing |
| `GET /households/:id/alerts`, `PATCH /alerts/:id/read` | Alerts |
| `GET/POST /households/:id/groups` , `GET /groups/:id/split?period=` | Bill splitting |
| `GET /admin/stats` (admin) | Aggregate analytics |

**WebSocket events:** `device:telemetry`, `appliance:state`, `alert:new`.

Standard error shape: `{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [...] } }`.

## 13. Frontend screens

1. **Landing / auth**
2. **Onboarding wizard:** state → discom → category → sanctioned load → last bill
3. **Dashboard:** month-to-date units, projected bill, slab gauge ("X units to next slab"), top 5 appliances, alerts
4. **3D Home:** builder mode and live mode; appliance panel; time scrubber; room heat-map
5. **Appliances:** list/table, schedules, link to IoT device
6. **Bill Checker:** enter bill → recomputed breakdown → mismatch explanation
7. **Reality Check:** guess vs simulation vs measured vs actual (chart + table), unexplained load
8. **What-if Lab:** sliders (AC star rating, hours, solar kW) with live savings
9. **Devices:** pair, status, last seen, signal quality
10. **Split Bill:** groups and shares
11. **Alerts and settings**

Responsive rules: mobile shows a simplified 3D (rotate/zoom only) and the dashboard-first layout; 3D builder is desktop/tablet.

## 14. Dashboards (admin / analytics)

Metabase or Power BI connected to a read-only MySQL user (Course Module 1):
- Total simulated/measured kWh by month and tariff category
- Top appliance types by share
- Mismatch rate of bill checker (how often bills differ from recomputation)
- Device uptime and data gaps
- Savings achieved from what-if recommendations
- Map by state/discom (aggregate only, no personal data)

## 15. Project structure

```
wattwise/
├── README.md
├── docker-compose.yml
├── .env.example
├── docs/
│   ├── er-diagram.png
│   ├── architecture.png
│   ├── validation-report.md
│   └── tariff-sources.md            # citations for every tariff row
├── db/
│   ├── schema.sql
│   ├── seed_tariffs.sql             # cite order number + date
│   ├── seed_catalog.sql
│   ├── seed_demo.sql
│   └── procedures.sql
├── server/                          # Node + Express
│   ├── src/
│   │   ├── app.js  server.js
│   │   ├── config/                  # env, db pool
│   │   ├── middleware/              # auth, validation, rateLimit, errors
│   │   ├── routes/                  # one file per resource
│   │   ├── controllers/
│   │   ├── services/
│   │   │   ├── billEngine.js        # pure, heavily tested
│   │   │   ├── simEngine.js         # pure, heavily tested
│   │   │   ├── calibration.js
│   │   │   ├── projection.js
│   │   │   ├── alerts.js
│   │   │   └── mqttIngest.js        # subscriber + state machine
│   │   └── sockets/
│   └── tests/
├── web/                             # React + Bootstrap + R3F
│   ├── src/
│   │   ├── pages/  components/  hooks/
│   │   ├── three/                   # scene, builder, appliance models
│   │   └── services/                # API client
│   └── public/                      # PWA manifest, glTF assets
├── iot/
│   ├── simulator/                   # Tier 1 fake device publisher
│   ├── esp32-firmware/              # Tier 3 sketch (if you build it)
│   └── mosquitto/                   # broker config
└── .github/workflows/ci.yml
```

## 16. Getting started

**Prerequisites:** Node 20+, Docker, Git. (Everything else runs in containers.)

```bash
git clone https://github.com/<you>/wattwise.git
cd wattwise
cp .env.example .env              # set DB password, JWT secret, MQTT creds
docker compose up -d --build      # mysql, mosquitto, api, web
docker compose exec api npm run db:migrate
docker compose exec api npm run db:seed   # tariffs, catalog, demo household
```

Open `http://localhost:3000` and log in with the seeded demo account (see `.env.example`).

**Try it without any hardware:**
```bash
cd iot/simulator
npm install
node simulate.js --household 1 --device 1   # publishes fake plug telemetry
```
Watch the matching appliance glow in the 3D home.

**`.env.example`**
```
NODE_ENV=development
PORT=4000
DB_HOST=mysql
DB_USER=wattwise
DB_PASSWORD=change_me
DB_NAME=wattwise
JWT_SECRET=change_me
MQTT_URL=mqtt://mosquitto:1883
MQTT_USER=wattwise_server
MQTT_PASSWORD=change_me
WEATHER_API_BASE=
```

## 17. Docker and deployment

`docker-compose.yml` services: `mysql`, `mosquitto`, `api`, `web` (nginx), optionally `metabase`.

- Persist MySQL with a named volume; never bake secrets into images.
- Deploy `web` and `api` to a container-capable host (Render, Railway, Fly.io, or a small VM). Check current free-tier limits yourself; they change.
- Hosted MQTT: either run Mosquitto on the VM, or use a managed broker. **Enable TLS and per-device credentials** for anything internet-facing.
- Home devices should connect **outbound** to your broker. Do not open ports on your home router.

## 18. Testing and CI

- **Unit (Jest):** `billEngine` (slab edges: 0, boundary, above top slab, partial billing period), `simEngine` (cyclic and thermostatic models), calibration, MQTT payload validation, state machine (flapping, gaps, duplicate timestamps).
- **Golden tests:** real past bills reproduced by the engine.
- **API (Supertest):** auth, authorization (a user cannot read another household), validation errors.
- **DB:** migrations apply cleanly on empty DB; stored procedure result equals Node result on fixtures.
- **E2E (Playwright, optional):** onboarding → add appliance → run simulation → bill appears.
- **CI (GitHub Actions):** lint, tests with a MySQL service container, build images on `main`.

## 19. Security and privacy

- Passwords hashed with bcrypt/argon2; JWT with short expiry + refresh; rate limiting on auth routes.
- Parameterised queries only (no string-built SQL); input validation on every route.
- **Row-level ownership checks** on every household/appliance/device route.
- Per-device MQTT credentials; ACLs restrict each device to its own topic; ability to revoke.
- Electricity usage reveals when people are home. Treat it as **personal data**: collect the minimum, allow export and delete, show only aggregated data in admin analytics, never expose raw samples to other users.
- Store tariff and catalog data separately from personal data.

## 20. Hardware safety

**Mains electricity can kill and start fires.**
- Use **certified, ready-made smart plugs** for plug-in appliances. Do not modify mains plugs or open live equipment.
- **Never exceed a plug's current rating.** Check the appliance's current draw before using it with a plug.
- A DIY ESP32 + energy-sensor build involves mains voltage. Do it **only with a qualified electrician's help**, in an insulated enclosure, with proper fuse/MCB protection. If in doubt, use the simulated device (Tier 1) for your demo.
- Whole-home measurement at the main panel must be installed by a licensed electrician.
- In your report, state which tier you actually implemented and tested.

## 21. Roadmap and build phases

| Phase | Deliverable | Course module |
|---|---|---|
| 1 | Schema, seeds, `billEngine` with golden tests, auth, households/appliances CRUD | 3 |
| 2 | React UI: onboarding, dashboard, appliance list, bill checker | 2 |
| 3 | Projection + alerts + what-if | 2, 3 |
| 4 | 3D home builder + appliance models + static scene | 2 |
| 5 | `simEngine` + simulated month + bill from simulation + Reality Check page | 2, 3 |
| 6 | MQTT ingest + Tier 1 simulator + live glow in 3D + usage events/rollups | 3 |
| 7 | Metabase/Power BI admin dashboard | 1 |
| 8 | Docker, CI, deployment, README polish, demo video | 4 |
| 9 | Real devices (Tier 2) + validation on your home | Extra marks |
| 10 | Stretch: photo meter-reading (OCR), NILM, solar module, PWA offline | Stretch |

**Cut line:** phases 1 to 8 make a complete, deployable course project. Phase 9 is the part that makes the results "concrete" and distinctive.

## 22. Course syllabus mapping

| Course module | Where WattWise covers it |
|---|---|
| **1. Dashboards** | In-app charts + Metabase/Power BI admin dashboard on MySQL, map of aggregate usage by region |
| **2. Front-end** | Responsive React + Bootstrap UI, PWA, 3D scene with three.js |
| **3. Back-end** | Express REST API, MySQL schema/joins/procedures/views, JWT auth, MQTT ingestion |
| **4. Git + deployment** | Branching and PRs, GitHub Actions, Docker/docker-compose, cloud deployment |

## 23. Demo script (3 minutes)

1. **Problem (20 s):** show a confusing real bill.
2. **Onboarding (20 s):** pick state/discom, enter sanctioned load.
3. **3D home (60 s):** place AC, fridge, fans, lights; press play; watch units and bill climb; point out the slab gauge.
4. **Live device (30 s):** turn on a real (or simulated) plug; the appliance glows with live watts.
5. **Reality check (30 s):** guess vs simulation vs measured vs actual bill; show unexplained load.
6. **What-if (20 s):** swap to a 5-star AC; show annual savings.

## 24. Limitations

- Tariff rules vary by state and change; the app is only as accurate as the tariff rows and their cited source.
- Simulated results depend on user-entered schedules and appliance parameters; calibration reduces but does not eliminate error.
- Measured coverage is limited to appliances with a device; the rest is estimated and labelled as such.
- Plug-based measurement accuracy depends on the device; verify against a known load.
- Not a substitute for an official meter, bill, or an electrician.

## 25. Data sources and credits

- **Tariffs:** state electricity regulatory commission tariff orders (cite the exact order and date per tariff row).
- **Appliance wattage and efficiency:** nameplates, BEE star-rating labels, manufacturer sheets, or your own measurements (record which).
- **Demo/test data (optional):** public household smart-meter datasets such as the London smart-meter dataset or UCI household power consumption [verify access] for stress-testing charts.
- **3D assets:** list each model's author and licence in `docs/credits.md`.
- **Libraries:** React, Bootstrap, three.js, react-three-fiber, drei, Express, mysql2, mqtt.js, Mosquitto, Socket.IO, Jest, Metabase.

## 26. License

MIT (or your choice). Third-party assets keep their own licences.
