# TPDS 3 Course Syllabus Mapping & Academic Evidence

**Project Title:** WattWise: Maharashtra Electricity Bill Explainer, Auditor & 3D Simulator  
**Domain:** Energy Data Science, Utility Tariffs, Physics Modeling & Full-Stack Web Engineering  
**Primary Discom Tariff:** Maharashtra State Electricity Distribution Co. Ltd. (MSEDCL LT-I Residential)  
**Regulatory Citation:** Maharashtra Electricity Regulatory Commission (MERC) Case No. 226 of 2022  

---

## Four-Module Mapping Table

| Module | Syllabus Concept | How WattWise Implements It | Concrete Evidence & File Location |
| :--- | :--- | :--- | :--- |
| **Module 1: Dashboards** | Dashboard designing with Power BI / Tableau | Power BI connection to MySQL views (`v_monthly_usage`, `v_appliance_share`); visualizes monthly kWh trends, archetype comparison, and tariff slab distribution. | [db/views.sql](file:///d:/TPDS%203%20PROJECT/db/views.sql), [web/src/pages/AdminPage.jsx](file:///d:/TPDS%203%20PROJECT/web/src/pages/AdminPage.jsx) |
| | Deep dive with data and connection | Read-only connection string and normalized relational joins connecting 4 Indian household archetypes. | [db/schema.sql](file:///d:/TPDS%203%20PROJECT/db/schema.sql), [db/seed_demo.sql](file:///d:/TPDS%203%20PROJECT/db/seed_demo.sql) |
| | Creating analytical charts | Monthly kWh trend, appliance share badge ranking, live slab gauge, and actual vs. forecast regression. | [web/src/pages/DashboardPage.jsx](file:///d:/TPDS%203%20PROJECT/web/src/pages/DashboardPage.jsx) |
| | Mapping data, models & real datasets | Combines synthetic population seeds with real measured household benchmark data (UCI Individual Household Electric Power dataset). | [scripts/ingest_real_data.py](file:///d:/TPDS%203%20PROJECT/scripts/ingest_real_data.py), `data/real_daily_readings.csv` |
| **Module 2: Front-end** | Responsive UI & design patterns | React + Bootstrap 5 grid, dashboard-first layout on mobile, card pattern for summaries, and badge indicators. | [web/src/App.jsx](file:///d:/TPDS%203%20PROJECT/web/src/App.jsx), [web/src/index.css](file:///d:/TPDS%203%20PROJECT/web/src/index.css) |
| | Screen design, dialogs & UI controls | 6 complete screens: Dashboard, Bill Checker, What-If Lab, Reality Check, AI Copilot, and Admin Analytics. | [web/src/pages/](file:///d:/TPDS%203%20PROJECT/web/src/pages/) |
| | 3D Graphics / Modern Web Frameworks | Interactive Three.js 3D Household Room Simulator: color-coded procedural power-density blocks showing active watts. | [web/src/components/HomeSimulator3D.jsx](file:///d:/TPDS%203%20PROJECT/web/src/components/HomeSimulator3D.jsx) |
| **Module 3: Back-end** | Web servers and HTTP requests | Express REST API (`/api/v1`), standard HTTP status codes (200, 201, 400, 401, 500), CORS, and JSON error contracts. | [server/src/app.js](file:///d:/TPDS%203%20PROJECT/server/src/app.js), [server/src/routes/](file:///d:/TPDS%203%20PROJECT/server/src/routes/) |
| | Databases: Relational SQL | MySQL 8.0 schema with normalization (3NF), foreign keys with `ON DELETE CASCADE`, composite indexes. | [db/schema.sql](file:///d:/TPDS%203%20PROJECT/db/schema.sql) |
| | Advanced SQL: Stored Procedures & Views | Stored procedures `calc_bill` & `audit_bill`; views with window functions (`DENSE_RANK`, `AVG OVER`, `LAG`). | [db/procedures.sql](file:///d:/TPDS%203%20PROJECT/db/procedures.sql), [db/views.sql](file:///d:/TPDS%203%20PROJECT/db/views.sql) |
| | Node.js business logic | Deterministic `billEngine`, 4-model physics `simEngine`, `forecast` with MAPE evaluation, and multilingual `copilot`. | [server/src/services/](file:///d:/TPDS%203%20PROJECT/server/src/services/) |
| **Module 4: Git + Deployment** | Git version control | Initialized git repository, branch structure, and commit history. | `.git/` in project root |
| | Containerization with Docker | Production multi-stage `Dockerfile` for Node.js API and Nginx-based `Dockerfile` for React web app. | [server/Dockerfile](file:///d:/TPDS%203%20PROJECT/server/Dockerfile), [web/Dockerfile](file:///d:/TPDS%203%20PROJECT/web/Dockerfile) |
| | Orchestration | `docker-compose.yml` linking MySQL 8.0, Express API, and React Web with health checks and persistent volumes. | [docker-compose.yml](file:///d:/TPDS%203%20PROJECT/docker-compose.yml) |
| | Automated CI Pipeline | GitHub Actions workflow (`.github/workflows/ci.yml`) spinning up MySQL service container, running Jest test suite, and compiling Vite frontend. | [.github/workflows/ci.yml](file:///d:/TPDS%203%20PROJECT/.github/workflows/ci.yml) |

---

## Golden Test Bill Verification Summary

| Test Case | Consumption (kWh) | Actual MSEDCL Bill | Recomputed Bill | Discrepancy Flag | Explanation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Case 1: May 2024 (Summer)** | 342 units | ₹4,206.00 | ₹4,206.00 | **Passed (Matched to Rupee)** | Exact slab breakdown matches official MERC order. |
| **Case 2: June 2024 (Monsoon)** | 240 units | ₹2,679.00 | ₹2,679.00 | **Passed (Matched to Rupee)** | Fixed charge + wheeling + FAC + 16% duty identical. |
| **Case 3: July 2024 (Injected Error)** | 210 units | ₹3,550.00 | ₹2,504.00 | **Flagged (Mismatch detected)** | Overcharged by +₹1,046.00 due to improper surcharge or commercial tariff tier application. |
| **Case 4: 0 Units (Boundary)** | 0 units | ₹148.00 | ₹148.00 | **Passed** | Fixed charge ₹128.00 + 16% duty = ₹148.00. |
| **Case 5: Exactly 100 Units** | 100 units | ₹849.00 | ₹849.00 | **Passed** | Stays strictly within Slab 1 (₹4.41/unit). |

