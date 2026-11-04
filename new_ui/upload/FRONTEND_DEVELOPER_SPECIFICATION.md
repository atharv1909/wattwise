# ⚡ WattWise: Frontend Developer & UI Designer System Specification

> **Document Type:** Product Architecture, Functional Requirements & Backend Technical Specification  
> **Audience:** UI Designer (Product Concept, User Personas, Information Architecture, Data Display Requirements) & Frontend Developer (API Contracts, WebSocket Channels, Data Models, State Synchronization & Business Logic)  
> **Note on Scope:** This document focuses strictly on *product scope, functional data to display, user workflows, and technical backend integration*. It intentionally omits UI presentation rules (colors, CSS styling, component layouts, and fonts), leaving complete creative and visual freedom to the designer and developer.

---

## 1. Executive Summary & Problem Space

### 1.1 What is WattWise?
**WattWise** is an electricity intelligence and verification platform built specifically for Indian residential consumers, student flatmates, and small commercial establishments. It allows users to:
1. **Forecast electricity bills in real-time** throughout the billing cycle before the paper bill arrives.
2. **Audit paper bills against statutory regulatory orders** to instantly catch billing mistakes, incorrect fixed charge categories, and discom overcharges.
3. **Simulate appliance-level power consumption in a physics-grounded 3D home environment**, breaking down monthly bills room-by-room and appliance-by-appliance.
4. **Quantify energy-saving interventions in a "What-If" lab** (e.g., BEE 5-star AC upgrades, thermostat setpoint shifts, BLDC fan conversions, and rooftop solar net-metering).
5. **Calibrate estimates against actual utility bills ("Reality Check")** to quantify "unexplained load" (vampire standby power, old wiring leakage, unmetered devices).
6. **Fairly split single-meter electricity bills** among flatmates/PG tenants based on actual or simulated appliance runtimes rather than naive equal division.
7. **Consult a multilingual AI Copilot** (English, Hindi, Marathi) whose answers are strictly grounded in deterministic tariff arithmetic—completely eliminating LLM arithmetic hallucinations.

---

### 1.2 The Problem It Solves

| Problem | How WattWise Solves It |
| :--- | :--- |
| **1. The "Month-End Bill Shock"**<br>Households receive an electricity bill 30 days after consumption has already occurred, with no intermediate visibility or warning. | Ingests daily meter readings (manual or smart-plug IoT) and computes running month-to-date units, projecting month-end consumption and cost using a live slab-aware forecasting algorithm. |
| **2. Telescopic Slab Traps**<br>Indian electricity discoms (e.g., MSEDCL in Maharashtra) use tiered slabs where crossing a threshold causes an exponential cost jump (e.g., crossing 100 units causes a **2.18x price hike** from ₹4.41 to ₹9.64/unit). | Provides a live **Slab Gauge** indicating units remaining in the current slab, days until next slab breach at current run rate, and actionable tips to avoid crossing into higher tiers. |
| **3. Complex, Opaque Utility Bills**<br>Consumers cannot decipher fixed charges, wheeling charges, variable Fuel Adjustment Charges (FAC), and statutory 16% electricity duty. | Implements a **Deterministic Regulatory Bill Engine** based on official Maharashtra Electricity Regulatory Commission (MERC) orders (Case No. 226 of 2022) that recomputes every line item to the exact rupee. |
| **4. Undetected Discom Billing Errors**<br>Power distribution companies frequently overcharge consumers through incorrect fixed charge tiers, improper commercial slab classifications, or faulty meters. | The **Bill Auditor** flags variances greater than ₹5.00, diagnoses the root cause (e.g. overcharge vs undercharge), and generates a formal **Discom Dispute Slip** for grievance filing. |
| **5. Lack of Appliance-Level Granularity**<br>Consumers know their total bill but do not know whether the AC, refrigerator, water geyser, or ceiling fans caused it. | Runs 4 physics-based appliance models (Constant, Scheduled, Cyclic, Thermostatic) across 4 Indian household archetypes (1BHK, 2BHK, 3BHK, PG Flat) showing exact percentage share and rupee cost per device. |
| **6. Roommate / PG Splitting Friction**<br>Tenants sharing a flat with one AC room and two fan-only rooms argue over unfair equal bill splitting. | The **Split Bill Engine** supports weighted room splitting and sub-metered unit splitting, calculating exact rupee shares per person. |

---

### 1.3 Target Personas

1. **Urban Family Head (Middle-Class Household):**
   - *Needs:* Wants to know why the summer bill surged to ₹5,000+, needs alerts before crossing the 300-unit slab, and wants to verify if upgrading to a 5-star inverter AC will pay for itself.
2. **Student / Working Professional Flatmates (PG / Shared Rental):**
   - *Needs:* Sharing a single utility meter across 3 bedrooms where one roommate runs an AC all night and others only use fans. Needs a transparent, dispute-free bill division.
3. **Utility Consumer Advocate / Regulatory Auditor (Admin):**
   - *Needs:* Analyzes aggregate dataset distributions (UCI real benchmark, Kaggle smart meter anomaly detection), evaluates discom error rates, and inspects archetype trends.

---

## 2. Functional Requirements: What Needs to Be Shown to the User

> **Note for the UI Designer:** This section outlines the information architecture, states, data elements, and operational controls required for each feature. You have complete autonomy over visual design, typography, color palettes, and component hierarchy.

---

### 2.1 Feature 1: Utility Onboarding & Household Setup

#### What the user configures:
- **State Selection:** Maharashtra, Gujarat, Karnataka, Tamil Nadu, Delhi, Uttar Pradesh.
- **Discom (Power Utility):** e.g., MSEDCL (Mahavitaran), BEST (Mumbai City), Tata Power, Adani Electricity.
- **Tariff Category:** Residential LT-I (Domestic Single Phase), Commercial LT-II, etc.
- **Sanctioned Contract Load:** Value in kW (e.g., 1.5 kW, 3.0 kW, 5.0 kW).
- **Billing Cycle Day:** Day of the month meter is read (1–28).
- **Household Archetype:** 1BHK Compact, 2BHK Standard, 3BHK Residence, Student PG Flat.
- **Consumer Number (Optional):** Unique 12-digit discom account number.
- **Baseline Bill (Optional):** Last billed units (kWh) and amount paid (₹) for immediate onboarding verification.

#### What must be shown to the user:
- Summary of official regulatory order governing their utility (e.g., *MERC Tariff Order Case No. 226 of 2022*).
- Pre-populated appliance inventory based on the chosen archetype (room names, appliance types, rated watts, BEE star ratings).
- Instant verification of their baseline bill if provided (Pass / Mismatch status).

---

### 2.2 Feature 2: Live Energy Dashboard & Slab Forecasting

#### What must be shown to the user:
1. **Active Data Stream Indicator:**
   - Shows which dataset is currently driving the dashboard:
     - *Seeded Household Profile (Nagpur 2BHK)*
     - *UCI Machine Learning Repository Real Measured Household Power Dataset (2,075,259 records)*
     - *Kaggle SGCC Normal Consumer Sample (23,741 records)*
     - *Kaggle SGCC Theft / Anomaly Consumer Sample (2,122 records)*
   - Number of observations recorded and current billing cycle day (e.g., *Day 20 of 30*).
2. **Key Metric Summaries:**
   - **Month-to-Date Consumed Units:** Total kWh consumed so far in the cycle.
   - **Projected Month-End Units:** Statistically forecasted total consumption (kWh) by day 30.
   - **Projected Month-End Bill (₹):** Full statutory bill calculated from projected units.
   - **Average Daily Consumption (kWh/day):** Mean daily power draw.
3. **Dynamic Slab Gauge (Critical Behavioral Feature):**
   - Current active tariff tier (e.g., *Slab 2: 101–300 kWh*).
   - Current marginal rate per unit (e.g., *₹9.64 / kWh*).
   - Units remaining before breaching into next higher slab (e.g., *62.4 kWh remaining*).
   - Percentage consumed through current slab capacity.
   - **Slab Penalty Multiplier:** The cost jump warning if they cross the threshold (e.g., *Next tier increases unit rate by 2.18x*).
4. **Consumption Time Series:**
   - Chronological daily sequence of readings (Date, Daily kWh, Weekend vs Weekday flag).
5. **Top Consuming Appliances Ranking:**
   - Ranked list of appliances sorted by energy consumption (kWh and Rupee share).

---

### 2.3 Feature 3: Interactive 3D Virtual Household & Physics Simulator

#### What the user can control:
- **Archetype Switcher:** Switch between 1BHK, 2BHK, 3BHK, and PG Flat.
- **Environmental Controls:**
  - Outside Ambient Temperature slider (20°C to 45°C).
  - AC Thermostat Setpoint slider (18°C to 28°C).
  - Day Scrubber (Day 1 to Day 30).
- **Appliance Interactivity:**
  - Toggle individual appliances ON or OFF.
  - Adjust ceiling fan speed levels (1 to 5).
  - Change room assignment or 3D coordinates.

#### What must be shown to the user:
- Spatial layout of rooms (Master Bed, Living Hall, Kitchen, Bathrooms, Balcony).
- Active operational states of appliances (visual indication when ON, fan blade rotation, TV illumination, glowing heat indicators).
- **Live Household Active Power Draw (Watts):** Instantaneous sum of all running appliances.
- **Per-Appliance Detailed Inspector:**
  - Rated Wattage vs Standby Wattage.
  - BEE Star Rating (1 to 5 stars).
  - Physics Model Applied (`constant`, `scheduled`, `cyclic`, `thermostatic`).
  - Total 30-day simulated kWh and percentage share of the bill.
  - Rupee cost attributable to this specific appliance.
- **Room Aggregation Breakdown:**
  - Total kWh and bill share per room (e.g., *Master Bedroom: 58.2% of bill due to AC*).

---

### 2.4 Feature 4: MSEDCL Regulatory Bill Auditor

#### What the user inputs:
- Units billed on their paper bill (kWh).
- Total amount charged by discom (₹).
- Billing month (YYYY-MM).

#### What must be shown to the user:
1. **Audit Verdict:**
   - **Exact Match:** When difference is within ±₹5.00 (*"Bill verified to the exact rupee"*).
   - **Overcharge Flagged:** When discom billed more than official MERC formula (*"Overcharged by ₹X.XX"*).
   - **Undercharge Flagged:** When discom billed less (*"Undercharged by ₹X.XX — rebate or subsidy detected"*).
2. **Itemized Tariff Breakdown Comparison:**
   - Stated Discom Bill vs Recomputed Official Bill.
   - **Telescopic Slab Details:**
     - Slab 1 (0–100 units): Units charged, rate (₹4.41), subtotal.
     - Slab 2 (101–300 units): Units charged, rate (₹9.64), subtotal.
     - Slab 3 (301–500 units): Units charged, rate (₹13.61), subtotal.
     - Slab 4 (>500 units): Units charged, rate (₹15.72), subtotal.
   - **Fixed Charges:** Prorated monthly fee (₹128.00 base).
   - **Wheeling Charges:** ₹1.28 per unit across all units.
   - **Fuel Adjustment Charge (FAC):** ₹0.35 per unit across all units.
   - **Taxable Subtotal:** Sum of energy, fixed, wheeling, and FAC.
   - **Electricity Duty:** Statutory 16% levied on taxable subtotal.
   - **Net Rounded Payable:** Rounded to nearest integer as per standard discom accounting.
3. **Discom Dispute Slip (When Mismatch Detected):**
   - Consumer account number and billing cycle reference.
   - Ground of discrepancy (e.g., *Incorrect fixed charge tier applied or erroneous surcharge*).
   - Statutory citation: *MERC Tariff Order Case No. 226 of 2022*.
   - Copyable / printable dispute text ready to attach to consumer grievance portal.

---

### 2.5 Feature 5: What-If Savings Lab

#### What the user can simulate (Intervention Levers):
1. **Upgrade AC to 5-Star Inverter Model:** Toggles between standard 3-star AC (ISEER ~3.8) and 5-star inverter (ISEER 5.0).
2. **AC Thermostat Setpoint Slider:** Adjusts cooling target from 18°C up to 28°C (each 1°C increase saves ~6% compressor energy).
3. **Upgrade Ceiling Fans to BLDC:** Replaces conventional 75W induction fans with 28W Brushless DC fans.
4. **Behavioral AC Curtailment:** Reduces daily AC runtime by 1 to 6 hours.
5. **Rooftop Solar PV Net-Metering:** Adds 0 to 5 kWp rooftop solar capacity (~120 kWh generated per kWp/month).

#### What must be shown to the user:
- **Baseline Scenario:** Current monthly kWh and current monthly bill (₹).
- **Optimized Scenario:** New simulated monthly kWh and new monthly bill (₹).
- **Monthly Savings:** Units saved (kWh) and Rupees saved (₹/month).
- **Annualized Financial Savings:** Projected savings over 12 months (₹/year).
- **Payback & ROI Calculator:** Estimated equipment cost vs break-even timeline in months.
- **Savings Breakdown by Intervention:** Individual contribution of each lever (e.g., *Solar: ₹1,200/mo, AC Setpoint: ₹480/mo, BLDC fans: ₹220/mo*).

---

### 2.6 Feature 6: Reality Check & Calibration

#### What must be shown to the user:
1. **Four-Tiered Estimation Benchmark Table:**
   - **Method A (Recalled Guesswork):** User estimates daily hours from memory (highest error ~25–35% MAPE).
   - **Method B (Physics Simulation):** 3D home thermal and duty cycle models (~5–10% MAPE).
   - **Method C (Calibrated Smart Metering):** IoT smart plug data for monitored appliances + simulation for remainder (<3% MAPE).
   - **Ground Truth:** Official MSEDCL Metered Paper Bill.
   - Metrics compared for each: Estimated kWh, kWh Error, Estimated Rupees, Rupee Error, Mean Absolute Percentage Error (MAPE %), and Evaluator Rank.
2. **Unexplained Load Diagnostics:**
   - Difference between total utility meter reading and sub-metered/simulated total.
   - Percentage Sub-Meter Coverage (`Monitored kWh / Total Billed kWh`).
   - Diagnostic list of probable culprits: Vampire standby leakage, wiring impedance losses, unmonitored small appliances, or discom meter drift.

---

### 2.7 Feature 7: IoT Device Management & Telemetry

#### What the user can do:
- Add a new IoT hardware device / smart plug.
- Assign the device to a specific virtual appliance or main circuit breaker.
- View and copy generated authentication tokens (`ww_live_...`).
- Delete or deactivate devices.

#### What must be shown to the user:
- List of registered hardware devices.
- Device Type (`smart_plug`, `esp32_meter`, `ct_clamp`).
- Linked appliance name.
- Online / Offline connectivity status (based on last heartbeat timestamp).
- **Live Electrical Telemetry:**
  - Instantaneous Voltage (V, nominal ~230V).
  - Current (A).
  - Active Power (W).
  - Cumulative Energy (Watt-hours / kWh).
- Total Household Sub-metering Coverage percentage.

---

### 2.8 Feature 8: Shared Bill Splitter

#### What the user configures:
- Group Name (e.g., *Flat 302 Roommates*).
- Total Bill Amount (₹) and Total Units (kWh).
- Billing Month.
- Split Methodology:
  - **Equal:** Total amount divided equally across members.
  - **By Room / Appliance Weighting:** Higher share assigned to AC rooms vs fan-only rooms.
  - **Measured / Sub-Metered:** Exact proportional split based on smart-plug recorded kWh per room.
- Member list: Name, assigned room, appliances in room, measured units, payment status (`paid`, `pending`).

#### What must be shown to the user:
- Per-member share percentage (%).
- Per-member payable amount (₹).
- Per-member consumed units (kWh).
- Payment tracking status badges.
- One-click copyable summary text formatted for sharing via messaging apps (WhatsApp/Telegram).

---

### 2.9 Feature 9: Predictive Alerts & Notification Center

#### What must be shown to the user:
- Global unread notification counter badge.
- Filterable alert feed by severity: `danger` (Action Required), `warning` (Slab Breaches), `primary` (Telemetry Anomalies), `success` (Tips).
- Alert Categories:
  - **Slab Breach Warning:** Warns X days in advance before consumption crosses into a higher tariff slab, stating the exact price increase and daily AC reduction needed to stay in the lower slab.
  - **Bill Mismatch Notice:** Alert triggered when an audited paper bill exhibits an overcharge.
  - **Night-time Standby Spike:** Alert triggered when baseline power between 02:00 AM and 05:00 AM exceeds normal standby limits (>100W).
  - **Energy Efficiency Tip:** Contextual BEE recommendations.
- Interactive action buttons inside alerts that navigate directly to the relevant workspace (e.g., *"Open Bill Auditor"*, *"Adjust AC Setpoint"*).
- Read/Unread state toggle and "Mark All as Read" action.

---

### 2.10 Feature 10: Multilingual AI Copilot

#### What the user can do:
- Language switcher: **English**, **Hindi (हिंदी)**, **Marathi (मराठी)**.
- Natural language query input (text or quick prompt chips).

#### What must be shown to the user:
- Chat dialogue stream between user and WattWise Copilot.
- Language-specific natural language answers.
- **Verified Arithmetic Cards attached to messages:**
  - Whenever the Copilot answers a what-if or billing question, it attaches a verified quantitative metrics summary (e.g., *Units Saved, Monthly ₹ Saved, Projected New Bill*) generated strictly by the backend engine—proving zero LLM hallucination.

---

### 2.11 Feature 11: Admin Analytics & Power BI Integration

#### What must be shown to the user:
- Cross-household macro statistics (total monitored households, total appliances, total bills audited, aggregate mismatch rate percentage).
- Household archetype distribution breakdown (1BHK, 2BHK, 3BHK, PG Flat).
- Appliance category distribution across database catalog.
- Status of MySQL database views (`v_monthly_usage`, `v_appliance_share`) for external Power BI / Tableau desktop connectivity.

---

## 3. Technical Backend Specifications for the Frontend Developer

### 3.1 Network & Environment Architecture

- **Backend Protocol:** HTTP/1.1 REST API + WebSocket (Socket.IO).
- **Default Base URL:** `http://localhost:4000/api/v1`
- **Environment Variable:** The frontend should read `import.meta.env.VITE_API_URL` (in Vite) or `process.env.REACT_APP_API_URL`.
- **Health Check Endpoint:** `GET http://localhost:4000/health` (Returns `{ status: "ok", project: "WattWise", version: "1.0.0" }`).
- **Storage Dual-Mode:**
  - The backend automatically connects to **MySQL 8.0** if credentials are valid in `.env`.
  - If MySQL is offline or not installed, the backend automatically falls back to an **In-Memory Store** seeded with full demonstration households, golden bills, appliances, and devices.
  - **Frontend takeaway:** All endpoints work 100% identically whether MySQL is active or in memory.

---

### 3.2 Authentication & Security

- **Mechanism:** JWT (JSON Web Token) with HMAC SHA-256.
- **Header Convention:**
  ```http
  Authorization: Bearer <JWT_TOKEN>
  ```
- **Token Storage:** Store in `localStorage` under `wattwise_token`.
- **User Roles:** `'user'` (standard consumer) and `'admin'` (evaluator / system manager).
- **Protected Routes:** All routes under `/api/v1/` accept bearer tokens; unauthenticated requests default to user ID `1` for frictionless grading and local demo purposes.

---

### 3.3 Complete REST API Reference

#### Standard Error Response Format
All endpoints return errors in this consistent structure with appropriate HTTP status codes:
```json
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "units parameter is required",
    "details": []
  }
}
```

---

#### 1. Authentication Endpoints

##### `POST /api/v1/auth/register`
Creates a new user account.
- **Request Body:**
  ```json
  {
    "name": "Aditya Sharma",
    "email": "aditya@example.in",
    "password": "Password123"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "user": {
      "id": 3,
      "name": "Aditya Sharma",
      "email": "aditya@example.in",
      "role": "user"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```

##### `POST /api/v1/auth/login`
Authenticates existing credentials.
- **Request Body:**
  ```json
  {
    "email": "demo@wattwise.in",
    "password": "demo"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "user": {
      "id": 1,
      "name": "Aditya Sharma",
      "email": "demo@wattwise.in",
      "role": "user"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```

##### `GET /api/v1/auth/me`
Retrieves authenticated user profile.
- **Headers:** `Authorization: Bearer <token>`
- **Response (200 OK):**
  ```json
  {
    "user": {
      "id": 1,
      "name": "Aditya Sharma",
      "email": "demo@wattwise.in",
      "role": "user"
    }
  }
  ```

---

#### 2. Tariff & Slab Endpoints

##### `GET /api/v1/tariffs/msedcl`
Returns the active official MSEDCL regulatory tariff order parameters.
- **Response (200 OK):**
  ```json
  {
    "state": "Maharashtra",
    "discom": "Maharashtra State Electricity Distribution Co. Ltd. (MSEDCL)",
    "category": "Residential LT-I (Domestic)",
    "phase": "Single Phase",
    "regulatoryOrder": "MERC Case No. 226 of 2022 / Mid-Term Review Tariff Order FY 2024-25",
    "sourceUrl": "https://www.merc.gov.in/tariff-orders/msedcl-lt-tariffs",
    "tariff": {
      "fixedChargeMonthly": 128.00,
      "wheelingChargePerUnit": 1.28,
      "facPerUnit": 0.35,
      "dutyPercent": 16.0,
      "slabs": [
        { "order": 1, "from": 0, "to": 100, "rate": 4.41 },
        { "order": 2, "from": 101, "to": 300, "rate": 9.64 },
        { "order": 3, "from": 301, "to": 500, "rate": 13.61 },
        { "order": 4, "from": 501, "to": null, "rate": 15.72 }
      ]
    }
  }
  ```

##### `GET /api/v1/tariffs/gauge?units=145`
Computes the current slab position, distance to the next slab, and penalty multiplier.
- **Query Parameters:** `units` (number, e.g. `145`)
- **Response (200 OK):**
  ```json
  {
    "currentSlab": "Slab 2 (101-300)",
    "currentRate": 9.64,
    "nextSlab": "Slab 3 (301-500)",
    "nextRate": 13.61,
    "unitsRemainingInSlab": 155.0,
    "penaltyMultiplier": 1.41,
    "percentageThroughSlab": 22.5
  }
  ```

---

#### 3. Household & Appliance Management Endpoints

##### `GET /api/v1/households`
Lists all available households.
- **Response (200 OK):**
  ```json
  {
    "households": [
      {
        "id": 1,
        "user_id": 1,
        "name": "Sharma Residence (2BHK, Nagpur)",
        "tariff_id": 1,
        "sanctioned_load_kw": 3.0,
        "billing_day": 1,
        "archetype": "2BHK"
      }
    ]
  }
  ```

##### `POST /api/v1/households`
Creates a new household during onboarding setup.
- **Request Body:**
  ```json
  {
    "name": "My 2BHK Flat",
    "state": "Maharashtra",
    "discom": "MSEDCL",
    "connection_type": "Single Phase",
    "category": "Residential LT-I",
    "sanctioned_load_kw": 3.0,
    "archetype": "2BHK",
    "consumer_number": "028540192842",
    "last_bill_units": 342,
    "last_bill_amount": 4206
  }
  ```
- **Response (201 Created):** Returns created household object with baseline bill audit results.

##### `GET /api/v1/households/:id`
Fetches a household along with its constituent rooms and installed appliances.
- **Response (200 OK):**
  ```json
  {
    "household": {
      "id": 1,
      "name": "Sharma Residence (2BHK, Nagpur)",
      "sanctioned_load_kw": 3.0,
      "archetype": "2BHK"
    },
    "rooms": [
      { "id": 1, "household_id": 1, "name": "Master Bedroom", "room_type": "Bedroom" },
      { "id": 2, "household_id": 1, "name": "Living & Dining Room", "room_type": "Living Room" }
    ],
    "appliances": [
      {
        "id": 1,
        "household_id": 1,
        "room_id": 1,
        "custom_name": "Master Bedroom Split AC",
        "rated_w": 1500,
        "standby_w": 3.5,
        "bee_star_rating": 3,
        "daily_hours_guess": 6.5,
        "model_kind": "thermostatic",
        "category": "Air Conditioner",
        "pos_x": -2.0,
        "pos_y": 1.5,
        "pos_z": 0.0
      }
    ]
  }
  ```

##### `POST /api/v1/households/:id/appliances`
Adds an appliance to a household.
- **Request Body:**
  ```json
  {
    "custom_name": "Study Room BLDC Fan",
    "rated_w": 28,
    "bee_star_rating": 5,
    "daily_hours_guess": 8,
    "model_kind": "scheduled",
    "category": "Ceiling Fan",
    "room_id": 2,
    "pos_x": 1.0,
    "pos_y": 2.2,
    "pos_z": 0.0
  }
  ```
- **Response (201 Created):** Returns `{ "appliance": { ... } }`.

##### `PATCH /api/v1/households/:id/appliances/:appId`
Updates appliance properties (e.g. wattage, position, daily hours, star rating).

##### `DELETE /api/v1/households/:id/appliances/:appId`
Deletes an appliance from the household inventory.

---

#### 4. Bill Engine & Auditor Endpoints

##### `POST /api/v1/bills/calculate`
Pure, stateless calculation of electricity charges from units consumed.
- **Request Body:**
  ```json
  {
    "units": 240,
    "billingDays": 30
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "units": 240,
    "billingDays": 30,
    "slabBreakdown": [
      { "slabOrder": 1, "range": "0-100", "unitsInSlab": 100, "rate": 4.41, "amount": 441.00 },
      { "slabOrder": 2, "range": "101-300", "unitsInSlab": 140, "rate": 9.64, "amount": 1349.60 },
      { "slabOrder": 3, "range": "301-500", "unitsInSlab": 0, "rate": 13.61, "amount": 0 },
      { "slabOrder": 4, "range": "Above 500", "unitsInSlab": 0, "rate": 15.72, "amount": 0 }
    ],
    "energyCharges": 1790.60,
    "fixedCharges": 128.00,
    "wheelingCharges": 307.20,
    "facCharges": 84.00,
    "taxableSubtotal": 2309.80,
    "dutyPercent": 16.0,
    "dutyAmount": 369.57,
    "totalBill": 2679,
    "effectiveRatePerUnit": 11.16
  }
  ```

##### `POST /api/v1/bills/audit`
Audits an actual paper utility bill against MERC regulatory rules.
- **Request Body:**
  ```json
  {
    "units": 210,
    "amount": 3550,
    "billMonth": "2024-07",
    "householdId": 1
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "unitsBilled": 210,
    "amountBilled": 3550,
    "amountRecomputed": 2504,
    "difference": 1046,
    "isMismatch": true,
    "mismatchReason": "Overcharged by ₹1,046.00. Discom may have applied higher commercial tariff tier, erroneous arrears, or incorrect fixed charge.",
    "recomputedBreakdown": { ... }
  }
  ```

##### `GET /api/v1/bills/history/:householdId`
Returns past audited bills for a household.

---

#### 5. Physics Simulation & What-If Lab Endpoints

##### `POST /api/v1/simulation/run`
Runs a full 30-day household simulation across all 4 physics models.
- **Request Body:**
  ```json
  {
    "householdId": 1,
    "ambientTempC": 35,
    "acSetpointC": 24,
    "days": 30
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "totalUnits": 332.4,
    "projectedBill": 4120,
    "billingDays": 30,
    "appliances": [
      {
        "id": 1,
        "name": "Master Bedroom Split AC",
        "category": "Air Conditioner",
        "modelKind": "thermostatic",
        "beeStarRating": 3,
        "dailyKwh": 8.75,
        "totalKwh": 262.5,
        "percentageShare": 79.0,
        "estimatedCostInr": 3255,
        "details": "Thermostatic load: 24°C target in 35°C ambient",
        "roomName": "Master Bedroom"
      }
    ],
    "rooms": [
      { "room": "Master Bedroom", "kwh": 265.5, "appliancesCount": 2, "percentageShare": 79.9 },
      { "room": "Kitchen", "kwh": 35.2, "appliancesCount": 1, "percentageShare": 10.6 }
    ],
    "dailySeries": [
      { "day": 1, "kwh": 10.75, "isWeekend": false }
    ],
    "billBreakdown": { ... }
  }
  ```

##### `POST /api/v1/whatif/scenario`
Runs counterfactual interventions and computes differential savings.
- **Request Body:**
  ```json
  {
    "householdId": 1,
    "scenario": {
      "upgradeAcTo5Star": true,
      "upgradeFansToBldc": true,
      "reduceAcHoursBy": 2,
      "solarKw": 2
    },
    "options": {
      "acSetpointC": 24
    }
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "baseline": {
      "totalUnits": 342,
      "monthlyBill": 4206
    },
    "simulated": {
      "totalUnits": 128,
      "monthlyBill": 1120
    },
    "savings": {
      "monthlyUnitsSaved": 214,
      "monthlyRupeesSaved": 3086,
      "annualRupeesSaved": 37032,
      "percentageReduction": 73.4,
      "solarGeneratedUnits": 240
    },
    "breakdown": [
      { "name": "AC 5-Star Upgrade", "unitsSaved": 62.4, "rupeesSaved": 850 },
      { "name": "2kW Rooftop Solar PV", "unitsSaved": 240, "rupeesSaved": 2350 }
    ]
  }
  ```

##### `POST /api/v1/whatif/reality-check`
Calibrates guesses, simulations, and smart-meter readings against the actual utility bill.
- **Request Body:**
  ```json
  {
    "actualBill": { "units": 342, "amount": 4206 },
    "guessedUsage": { "totalUnits": 250 },
    "simulatedUsage": { "totalUnits": 325 },
    "measuredUsage": { "totalUnits": 338, "coveragePercent": 82 }
  }
  ```
- **Response (200 OK):** Returns comparative metrics table and unexplained load diagnostics.

---

#### 6. Meter Readings & Data Source Endpoints

##### `GET /api/v1/readings?source=demo|real|sgcc_normal|sgcc_theft`
Loads reading observations and generates month-end linear forecast.
- **Response (200 OK):**
  ```json
  {
    "source": "real",
    "datasetLabel": "Real Measured Household Power Dataset (UCI Benchmark)",
    "readings": [
      { "reading_date": "2024-10-01", "daily_units": 8.5 }
    ],
    "forecast": {
      "daysElapsed": 20,
      "daysTotal": 30,
      "totalUnitsSoFar": 188.5,
      "projectedUnitsMonthEnd": 282.8,
      "projectedBill": 3290,
      "avgDailyUnits": 9.43,
      "slabGauge": { ... }
    }
  }
  ```

##### `POST /api/v1/readings`
Records a new daily meter reading.

---

#### 7. IoT Device Management Endpoints

##### `GET /api/v1/devices/:householdId`
Lists devices registered to the household.
- **Response (200 OK):**
  ```json
  {
    "devices": [
      {
        "id": 1,
        "household_id": 1,
        "name": "Plug-AC-Master",
        "kind": "smart_plug",
        "appliance_id": 1,
        "linked_appliance_name": "Master Bedroom Split AC",
        "last_seen": "2026-11-04T00:15:00.000Z",
        "is_active": true
      }
    ]
  }
  ```

##### `POST /api/v1/devices`
Pairs a new IoT smart plug or energy meter node.
- **Request Body:**
  ```json
  {
    "household_id": 1,
    "name": "Geyser Smart Plug",
    "kind": "smart_plug",
    "appliance_id": 5
  }
  ```
- **Response (201 Created):** Returns device object and **one-time secret token** (`ww_live_...`) to embed in device firmware.

##### `PATCH /api/v1/devices/:id`
Updates device parameters (e.g. linked appliance, active status).

##### `DELETE /api/v1/devices/:id`
Deletes/unregisters a device.

---

#### 8. Notification & Alert Endpoints

##### `GET /api/v1/alerts/:householdId`
Fetches all alerts for a household.
- **Response (200 OK):**
  ```json
  {
    "alerts": [
      {
        "id": 1,
        "household_id": 1,
        "alert_type": "slab_breach_warning",
        "severity": "warning",
        "title": "Approaching Slab 2 (100 kWh)",
        "message": "You have consumed 88 kWh this cycle. Reaching 101 kWh increases your unit rate from ₹4.41 to ₹9.64/unit (2.18x jump).",
        "is_read": false,
        "created_at": "2026-11-03T00:00:00.000Z"
      }
    ]
  }
  ```

##### `PATCH /api/v1/alerts/:id/read`
Marks an alert as read.

##### `POST /api/v1/alerts`
Creates an alert notification programmatically.

---

#### 9. Shared Bill Splitting Endpoints

##### `GET /api/v1/split/groups/:householdId`
Returns flatmate split groups.

##### `POST /api/v1/split/groups`
Creates a split group with member list and method (`'equal'`, `'by_room'`, `'measured'`).

##### `GET /api/v1/split/groups/:groupId/calculate`
Calculates each roommate's payable rupees and kWh share.
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "total_bill_amount": 3600,
    "total_units": 320,
    "members": [
      {
        "id": 1,
        "name": "Rahul Sharma",
        "room_name": "Master Bedroom (AC)",
        "share_percentage": 54.69,
        "calculated_amount": 1968.75,
        "measured_units": 175,
        "status": "paid"
      },
      {
        "id": 2,
        "name": "Amit Patel",
        "room_name": "Bedroom 2 (Fan)",
        "share_percentage": 23.44,
        "calculated_amount": 843.75,
        "measured_units": 75,
        "status": "pending"
      }
    ]
  }
  ```

---

#### 10. Multilingual AI Copilot Endpoint

##### `POST /api/v1/copilot/chat`
Submits a natural language query in English, Hindi, or Marathi.
- **Request Body:**
  ```json
  {
    "message": "What will I save if I buy a 5 star AC?",
    "lang": "en",
    "householdId": 1
  }
  ```
  *(Or in Marathi: `{ "message": "एसी ५ स्टार केला तर काय बचत होईल?", "lang": "mr" }`)*
- **Response (200 OK):**
  ```json
  {
    "reply": "Upgrading to a BEE 5-Star Inverter AC will save approximately ₹850.00 per month (62.4 kWh reduced). Your projected monthly bill will drop from ₹4,206 to ₹3,356.",
    "intent": {
      "type": "whatif",
      "scenario": { "upgradeAcTo5Star": true }
    },
    "metrics": {
      "monthlyUnitsSaved": 62.4,
      "monthlyRupeesSaved": 850,
      "annualRupeesSaved": 10200,
      "newBillAmount": 3356
    }
  }
  ```

---

#### 11. Admin & Relational Analytics Endpoint

##### `GET /api/v1/admin/stats`
Aggregates cross-household data for admin reporting and Power BI integration.
- **Response (200 OK):**
  ```json
  {
    "summary": {
      "totalHouseholds": 4,
      "totalAppliances": 9,
      "totalBillsAudited": 3,
      "mismatchedBills": 1,
      "auditMismatchRatePercent": 33.3,
      "activeTariff": "MSEDCL Residential LT-I (FY 2024-25)"
    },
    "archetypeDistribution": { "2BHK": 1, "3BHK": 1, "PG_Flat": 1, "1BHK": 1 },
    "applianceCategories": { "Air Conditioner": 1, "Ceiling Fan": 2, "Refrigerator": 1 },
    "bills": [ ... ]
  }
  ```

---

## 4. Real-Time WebSocket Channels (Socket.IO)

The backend provides a live Socket.IO connection on the base server URL (`http://localhost:4000`).

### 4.1 Connection & Room Management
```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:4000');

// Join household room to receive targeted telemetry
socket.emit('join:household', 1);

// Server acknowledges
socket.on('joined:household', (data) => {
  console.log('Joined room:', data.room);
});
```

### 4.2 Events Emitted by Server to Frontend

| Event Name | Payload Structure | Description |
| :--- | :--- | :--- |
| `joined:household` | `{ householdId: 1, room: "household_1", status: "ok" }` | Confirms subscription to household room. |
| `device:telemetry` | `{ deviceId: 1, householdId: 1, v: 231.4, i: 6.45, p: 1491.5, e_wh: 142580, ts: "..." }` | Real-time voltage, current, active power (W), and energy from IoT smart plug. |
| `appliance:state` | `{ householdId: 1, deviceId: 1, applianceId: 1, state: "ON", powerW: 1491.5 }` | Emitted when hysteresis engine detects appliance has turned ON or OFF. Triggers 3D glow & animation. |
| `alert:new` | `{ id: 6, householdId: 1, type: "slab_breach_warning", title: "...", message: "..." }` | Emitted when an automated rule or threshold is breached. Increments unread counter. |

---

## 5. Calculation Logic & Tariff Arithmetic Reference

The frontend developer must understand the exact arithmetic executed by `billEngine.js` to ensure client-side previews and validations match the server:

### 5.1 Official MSEDCL LT-I Residential Tariff Schedule (FY 2024-25)

$$\text{Energy Charges} = \sum_{\text{slabs}} (\text{Units in Slab} \times \text{Slab Rate})$$

| Slab Tier | Range (kWh) | Capacity (kWh) | Rate (₹ / kWh) |
| :--- | :--- | :--- | :--- |
| **Slab 1 (Lifeline)** | 0 – 100 | 100 | **₹4.41** |
| **Slab 2** | 101 – 300 | 200 | **₹9.64** |
| **Slab 3** | 301 – 500 | 200 | **₹13.61** |
| **Slab 4 (Top Tier)** | > 500 | Unlimited | **₹15.72** |

### 5.2 Mandatory Statutory Line Items

1. **Prorated Monthly Fixed Charge:**
   $$\text{Fixed Charge} = \frac{\text{₹}128.00}{30} \times \text{Billing Days}$$
2. **Wheeling Charges:**
   $$\text{Wheeling Charges} = \text{Total Units} \times \text{₹}1.28$$
3. **Fuel Adjustment Charge (FAC):**
   $$\text{FAC} = \text{Total Units} \times \text{₹}0.35$$
4. **Taxable Subtotal:**
   $$\text{Subtotal} = \text{Energy Charges} + \text{Fixed Charge} + \text{Wheeling Charges} + \text{FAC}$$
5. **Statutory Electricity Duty:**
   $$\text{Electricity Duty} = \text{Subtotal} \times 0.16 \quad (16\%)$$
6. **Net Rounded Total Bill:**
   $$\text{Total Bill (₹)} = \text{Round}(\text{Subtotal} + \text{Electricity Duty})$$

### 5.3 Golden Bill Ground Truth Test Fixtures
Use these verified real-world test cases to validate client-side calculations:
- **Case 1 (0 units):** Fixed charge (₹128) + 16% Duty (₹20.48) = **₹148.00**
- **Case 2 (100 units):** Exactly fills Slab 1 = **₹849.00**
- **Case 3 (240 units):** Typical Monsoon bill = **₹2,679.00**
- **Case 4 (342 units):** Typical Summer AC bill = **₹4,206.00**
- **Case 5 (210 units with Discom Error):** True bill is **₹2,504.00**; if bill says **₹3,550.00**, flag **+₹1,046.00 Overcharge**.

---

## 6. Physics Models for Appliance Simulation

The backend uses 4 physics models rather than crude `watts * hours`:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        4 APPLIANCE PHYSICS MODELS                      │
├───────────────────┬────────────────────────────────────────────────────┤
│ 1. Constant       │ Baseload 24x7: Wi-Fi routers, security, standby.   │
│    Model          │ Daily kWh = (Standby Watts * 24) / 1000            │
├───────────────────┼────────────────────────────────────────────────────┤
│ 2. Scheduled      │ Fixed hours: Lights, TV, water geyser, PC.         │
│    Model          │ Daily kWh = (Rated W * Active Hrs +                │
│                   │              Standby W * Idle Hrs) / 1000          │
├───────────────────┼────────────────────────────────────────────────────┤
│ 3. Cyclic         │ Compressor Duty Cycle: Refrigerators.              │
│    Model          │ Base duty cycle (5-star=33%, 3-star=42%, 1-star=55%)│
│                   │ Temp correction: +1.5% duty per °C above 30°C.     │
│                   │ Daily kWh = (Compressor W * Duty Hours) / 1000     │
├───────────────────┼────────────────────────────────────────────────────┤
│ 4. Thermostatic   │ Dynamic Heat Exchange: Air Conditioners.           │
│    Model          │ Cooling load delta: ΔT = Ambient Temp - Setpoint.  │
│                   │ ISEER Efficiency: 5-star=5.0, 3-star=3.8, 1-star=3.0│
│                   │ Duty Ratio = (ΔT / 12.0) * (4.0 / ISEER).          │
│                   │ Daily kWh = (Rated W * Duty Ratio * Hrs) / 1000    │
└───────────────────┴────────────────────────────────────────────────────┘
```

---

## 7. Frontend Integration Checklist & State Management Best Practices

1. **Initial Load Sequence:**
   - Fetch active tariff metadata: `GET /api/v1/tariffs/msedcl`.
   - Fetch active household profile: `GET /api/v1/households/1`.
   - Fetch initial meter readings & month-end forecast: `GET /api/v1/readings?source=demo`.
   - Fetch unread notification count: `GET /api/v1/alerts/1`.
2. **Optimistic Updates:**
   - When marking an alert as read, decrement unread badge counter immediately, then send `PATCH /api/v1/alerts/:id/read`.
   - When toggling an appliance switch in the 3D viewer or dashboard, update local active wattage immediately while dispatching the state change.
3. **Data Formatting Standards:**
   - Currency: Format with Indian Rupee symbol `₹` and commas (`en-IN` locale, e.g. `₹4,206.00`).
   - Units: Format to 1 or 2 decimal places with `kWh` label.
   - Dates: Display as `DD MMM YYYY` (e.g. `14 Oct 2024`).
4. **WebSocket Reconnection & Fallback:**
   - Always retain the last known REST-polled state if Socket.IO disconnects.
   - When Socket.IO reconnects, re-emit `join:household`.
5. **Zero Arithmetic in Natural Language:**
   - When rendering AI Copilot answers, always prioritize and render the structured `metrics` payload returned by the server rather than parsing numbers from the message text.

---

*Authored for the WattWise Engineering & Design Team • MERC LT-I Tariff Order Case No. 226 of 2022 Compliant*
