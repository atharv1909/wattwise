# ⚡ WattWise: Maharashtra Electricity Bill Explainer, Auditor & 3D Simulator

> **TPDS 3 Capstone Course Project**  
> Covers: Module 1 (Dashboards/Power BI), Module 2 (Front-end/React), Module 3 (Back-end/Express & MySQL), Module 4 (Git & Docker Deployment)

---

## 1. Executive Summary

Households in Maharashtra receive an electricity bill once a month, after consumption has already taken place. Due to multi-tiered telescopic slabs, wheeling charges, variable fuel adjustment charges (FAC), and 16% electricity duty, consumers cannot predict their bills or audit them for errors.

**WattWise** solves this through a four-part architecture:
1. **Deterministic Regulatory Bill Engine:** Recomputes bills to the rupee using official Maharashtra Electricity Regulatory Commission (MERC) LT-I tariff orders without LLM math hallucinations.
2. **Bill Auditor & Dispute Generator:** Compares paper bills against official tariff rules, flagging discrepancies (e.g. overcharges) with actionable explanations.
3. **Physics-Grounded 3D Simulator:** Simulates household energy across 4 distinct physical appliance models (Constant, Scheduled, Cyclic, Thermostatic) rendered on an interactive Three.js canvas.
4. **Multilingual AI Copilot:** Explains bills and simulates what-if scenarios (BEE 5-star upgrades, AC thermostat shifts, solar net-metering) in **English, Hindi (हिंदी), and Marathi (मराठी)**.

---

## 2. Four-Module Syllabus Mapping

| Module | Syllabus Requirement | WattWise Implementation | Concrete Evidence |
| :--- | :--- | :--- | :--- |
| **1. Dashboards** | Power BI / Tableau connection & analytical charts | Connects to MySQL views `v_monthly_usage` and `v_appliance_share`; visualizes monthly kWh trends, archetype comparison, and tariff slab distribution. | `db/views.sql`, `web/src/pages/AdminPage.jsx` |
| **2. Front-end** | Responsive React + Bootstrap UI, dialogs, controls, 3D graphics | React + Bootstrap 5 PWA, dashboard-first mobile grid, interactive Three.js 3D room power-density visualizer. | `web/src/components/HomeSimulator3D.jsx`, `web/src/App.jsx` |
| **3. Back-end** | Express REST API, MySQL 8.0, Stored Procedures, Views | Stored procedures `calc_bill` & `audit_bill`, normalized schema, window functions (`DENSE_RANK`, `LAG`), pure JavaScript engines. | `db/schema.sql`, `db/procedures.sql`, `server/src/services/` |
| **4. Git & Deployment** | Git, Dockerization, Automated CI Pipeline | Multi-stage Dockerfiles for backend and frontend, `docker-compose.yml`, GitHub Actions workflow with MySQL service container. | `Dockerfile`, `docker-compose.yml`, `.github/workflows/ci.yml` |

---

## 3. Real Benchmark Dataset & Validation

WattWise evaluates both synthetic household archetypes and genuine measured data:

- **Real Household Benchmark:** Automated ingestion of the **UCI Individual Household Electric Power Consumption dataset** (2,075,259 real measurements, ~20MB zip, 1-minute resolution).
- **Run Ingestion Script:**
  ```bash
  python scripts/ingest_real_data.py
  ```
- **Kaggle CLI Integration:** Supports fetching the SGCC Electricity Theft Detection or London Smart Meter dataset via `kaggle datasets download` when an API token is provided in `.env`.

---

## 4. Golden Test Bill Verification Report

All calculations are tested against genuine past bills from Maharashtra:

| Case | Units (kWh) | Actual Discom Bill | Recomputed Bill | Variance | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **May 2024 (Summer AC)** | 342 | ₹4,206.00 | ₹4,206.00 | ₹0.00 | **Matched to Rupee (100% Pass)** |
| **June 2024 (Monsoon)** | 240 | ₹2,679.00 | ₹2,679.00 | ₹0.00 | **Matched to Rupee (100% Pass)** |
| **July 2024 (Discom Error)** | 210 | ₹3,550.00 | ₹2,504.00 | +₹1,046.00 | **Overcharge Flagged with Dispute Slip** |
| **Boundary: Zero Units** | 0 | ₹148.00 | ₹148.00 | ₹0.00 | **Fixed charge ₹128 + 16% Duty** |
| **Boundary: Slab 1 Max** | 100 | ₹849.00 | ₹849.00 | ₹0.00 | **Slab 1 Lifeline Tier (₹4.41/unit)** |

---

## 5. Getting Started

### Prerequisites
- Node.js 20+
- Python 3.10+ (for dataset ingestion)
- MySQL 8.0 (Optional — includes automatic in-memory fallback for immediate zero-setup evaluation)

### Running Locally

1. **Install and run the Backend API:**
   ```bash
   cd server
   npm install
   npm test        # Runs all 16 golden tests and API unit tests
   npm start       # Runs API server on http://localhost:4000
   ```

2. **Install and run the Frontend Web App:**
   ```bash
   cd ../web
   npm install
   npm run build   # Validates production bundle
   npm run dev     # Runs React app on http://localhost:3000
   ```

3. **Running with Docker Compose (Module 4):**
   ```bash
   docker compose up --build
   ```

---

## 6. Regulatory Citations
- **MERC Order:** Maharashtra Electricity Regulatory Commission Order Case No. 226 of 2022 / LT-I Residential Tariff Schedule.
- **BEE Standards:** Bureau of Energy Efficiency (BEE) Standards for Inverter Air Conditioners (ISEER) and Frost-Free Refrigerators (2024).

