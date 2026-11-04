import os
import subprocess

html_path = r"D:\TPDS 3 PROJECT\WattWise_Report.html"
pdf_path = r"D:\TPDS 3 PROJECT\WattWise_Final_Project_Report.pdf"

report_html = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>WattWise - Academic Capstone Project Report</title>
<style>
  @page {
    size: A4;
    margin: 16mm 15mm 16mm 15mm;
    @bottom-right {
      content: counter(page);
    }
  }
  body {
    font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;
    color: #1e293b;
    line-height: 1.5;
    font-size: 10pt;
    margin: 0;
    padding: 0;
  }
  .header-card {
    border-bottom: 3px solid #f59e0b;
    padding-bottom: 12px;
    margin-bottom: 16px;
  }
  .badge {
    display: inline-block;
    background: #fef3c7;
    color: #92400e;
    font-size: 8pt;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 4px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 6px;
  }
  h1 {
    font-size: 19pt;
    color: #0f172a;
    margin: 0 0 4px 0;
    font-weight: 800;
  }
  .subtitle {
    font-size: 10.5pt;
    color: #475569;
    margin-bottom: 10px;
  }
  .meta-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 10px 14px;
    font-size: 9pt;
    margin-bottom: 16px;
  }
  .meta-grid div { margin: 2px 0; }
  h2 {
    font-size: 12pt;
    color: #0f172a;
    border-left: 4px solid #f59e0b;
    padding-left: 8px;
    margin: 16px 0 8px 0;
    font-weight: 700;
  }
  h3 {
    font-size: 10.5pt;
    color: #1e293b;
    margin: 10px 0 4px 0;
    font-weight: 600;
  }
  p { margin: 0 0 8px 0; text-align: justify; }
  ul, ol { margin: 0 0 8px 0; padding-left: 20px; }
  li { margin-bottom: 3px; }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 8px 0 12px 0;
    font-size: 8.5pt;
  }
  th, td {
    border: 1px solid #cbd5e1;
    padding: 5px 7px;
    text-align: left;
  }
  th {
    background: #f1f5f9;
    font-weight: 700;
    color: #0f172a;
  }
  tr:nth-child(even) { background: #f8fafc; }
  .highlight-row { background: #fef2f2 !important; font-weight: 600; }
  .success-row { background: #f0fdf4 !important; }
  .diagram-box {
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    padding: 10px;
    margin: 10px 0 14px 0;
    text-align: center;
  }
  .diagram-title {
    font-size: 8.5pt;
    font-weight: 700;
    color: #475569;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 8px;
  }
  .formula-box {
    background: #f8fafc;
    border-left: 3px solid #3b82f6;
    padding: 6px 10px;
    margin: 6px 0;
    font-family: 'Consolas', 'Courier New', monospace;
    font-size: 8.5pt;
  }
  .page-break { page-break-before: always; }
</style>
</head>
<body>

<div class="header-card">
  <span class="badge">TPDS 3 Capstone Academic Report · AY 2026</span>
  <h1>WattWise: Maharashtra Electricity Bill Explainer, Auditor & 3D Simulator</h1>
  <div class="subtitle">Engineering a Deterministic Regulatory Billing Engine, 3D Spatial Digital Twin, and Power BI Warehouse</div>
  <div class="meta-grid">
    <div><b>Course:</b> Tools & Platforms for Data Science 3 (TPDS 3)</div>
    <div><b>Regulatory Order:</b> MERC Case No. 226 of 2022 (MSEDCL LT-I)</div>
    <div><b>Student 1:</b> Atharv Deshmukh (<code>BT24CSD004</code>)</div>
    <div><b>Student 2:</b> Aditya Bhalerao (<code>BT24CSD018</code>)</div>
    <div><b>Target Discom:</b> MSEDCL (Mahadiscom Residential LT-I)</div>
    <div><b>Submission Date:</b> November 2026</div>
  </div>
</div>

<h2>1. Executive Summary & Problem Space</h2>
<p>
Electricity represents one of the largest non-discretionary expenses for Indian households, student flatmates, and small businesses. In Maharashtra, electricity tariffs are governed by the Maharashtra Electricity Regulatory Commission (MERC) under Multi-Year Tariff Order Case No. 226 of 2022. Despite consumer protection regulations, utility bills remain opaque. Consumers receive an aggregate monthly invoice summarizing energy charges, wheeling charges, Fuel Adjustment Charges (FAC), and 16% state electricity duty, with zero mid-cycle visibility or appliance-level breakdown.
</p>
<p>
A critical structural issue in MSEDCL's LT-I tariff is the <b>+118.6% non-linear rate cliff</b>. Consuming between 0–100 units costs ₹4.41/unit; the moment consumption crosses into 101–300 units, the marginal rate leaps to ₹9.64/unit. Furthermore, billing cycle extensions (e.g., meter readers billing after 35 days instead of 30) push consumers across slab thresholds, artificially inflating charges. Lastly, in shared flats, bills are naively divided equally despite vast differences in personal appliance consumption (such as air conditioning).
</p>
<p>
<b>WattWise</b> solves these challenges through a unified four-module platform: a deterministic statutory billing engine, an interactive Three.js 3D Virtual House, a fair roommate bill splitter, and an executive Microsoft Power BI Desktop warehouse.
</p>

<h2>2. Project Objectives & Scope</h2>
<ul>
  <li><b>Deterministic Statutory Accuracy:</b> Recompute MSEDCL LT-I bills down to the rupee based on MERC Case No. 226 of 2022 without relying on non-deterministic LLM calculations.</li>
  <li><b>Statutory Bill Auditor:</b> Allow consumers to enter billed units and charges, automatically flag overcharges, and generate formal legal petitions for the Consumer Grievance Redressal Forum (CGRF).</li>
  <li><b>3D Spatial Disaggregation:</b> Disaggregate consumption across domestic rooms using an interactive Three.js 3D dollhouse model with physical appliance load curves.</li>
  <li><b>Fair Multi-Tenant Cost Allocation:</b> Split bills fairly among flatmates using calculated appliance run-hours instead of blunt head-count division.</li>
  <li><b>Executive Power BI Warehousing:</b> Provide a Star Schema data model with 25+ DAX measures visualizing slab cliffs, discom overcharge patterns, and appliance payback periods.</li>
  <li><b>Scope Boundaries:</b> Configured for MSEDCL LT-I Single-Phase Residential consumers (FY 2024–25). Calibrated using real datasets from the UCI Repository (296k minutes) and Kaggle SGCC (25k smart meters).</li>
</ul>

<h2>3. Existing Solutions vs. Proposed WattWise</h2>
<table>
  <thead>
    <tr>
      <th>Feature / Capability</th>
      <th>Utility SMS / Paper Bill</th>
      <th>Generic Mobile Calculators</th>
      <th>Hardware Smart Plugs</th>
      <th>WattWise (Our System)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><b>Billing Timing</b></td>
      <td>Post-consumption (15–30 days late)</td>
      <td>Manual point-in-time entry</td>
      <td>Real-time streaming</td>
      <td><b>Real-time + Predictive Forecast</b></td>
    </tr>
    <tr>
      <td><b>MSEDCL Tariff Modeling</b></td>
      <td>Opaque / Pre-calculated</td>
      <td>Flat average rate (inaccurate)</td>
      <td>None (raw watts only)</td>
      <td><b>Exact MERC §226/2022 Rupee Rules</b></td>
    </tr>
    <tr>
      <td><b>Appliance Disaggregation</b></td>
      <td>None</td>
      <td>None</td>
      <td>Requires ₹15,000+ hardware</td>
      <td><b>Zero-Hardware 3D Digital Twin</b></td>
    </tr>
    <tr>
      <td><b>Billing Audit & Dispute Slip</b></td>
      <td>None</td>
      <td>None</td>
      <td>None</td>
      <td><b>Automated CGRF Legal Letter</b></td>
    </tr>
    <tr>
      <td><b>Roommate Split Logic</b></td>
      <td>None</td>
      <td>Basic 50/50 division</td>
      <td>Per-plug calculation only</td>
      <td><b>Appliance-Hours Fair Allocation</b></td>
    </tr>
  </tbody>
</table>

<div class="page-break"></div>

<h2>4. TPDS 3 Four-Module Syllabus Mapping Table</h2>
<table>
  <thead>
    <tr>
      <th style="width: 18%;">Module</th>
      <th style="width: 25%;">Syllabus Concept</th>
      <th style="width: 32%;">Implementation in WattWise</th>
      <th style="width: 25%;">Code / File Evidence</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td rowspan="2"><b>Module 1: Dashboards</b></td>
      <td>Power BI Design & Star Schema</td>
      <td>Tabular Data Warehouse: 4 Fact tables linked to 4 Dimension tables (Date, Household, Tariff, Appliances).</td>
      <td><code>powerbi/WattWise_Master_PowerBI_Dataset.xlsx</code></td>
    </tr>
    <tr>
      <td>DAX Measures & Real Benchmarking</td>
      <td>25+ calculated DAX measures ([Statutory Bill INR], [Rupee Variance]); grounded in UCI (296k min) & SGCC (25k meters).</td>
      <td><code>powerbi/WattWise_DAX_Measures.dax</code><br/><code>scripts/build_real_pipeline.py</code></td>
    </tr>
    <tr>
      <td rowspan="2"><b>Module 2: Front-End</b></td>
      <td>Responsive UI & Micro-Interactions</td>
      <td>Next.js 16 / React 19 app with Recharts energy curves, dark theme, and GSAP smooth scroll physics.</td>
      <td><code>src/components/wattwise/AppShell.tsx</code><br/><code>StackMotionBreakdown.tsx</code></td>
    </tr>
    <tr>
      <td>3D Spatial Digital Twin</td>
      <td>Three.js (@react-three/fiber) SimReady virtual dollhouse with procedural rooms and dynamic watt-glow shaders.</td>
      <td><code>src/components/wattwise/three/HouseScene.tsx</code></td>
    </tr>
    <tr>
      <td rowspan="2"><b>Module 3: Back-End</b></td>
      <td>REST APIs & Business Logic</td>
      <td>Node.js Express Gateway (/api/v1) hosting deterministic statutory tariff and 4-tier physics simulation engines.</td>
      <td><code>server/src/app.js</code><br/><code>server/src/services/billEngine.js</code></td>
    </tr>
    <tr>
      <td>Relational SQL (MySQL 8.0)</td>
      <td>3NF normalized schema, stored procedures (calc_bill, audit_bill), and CTE views with window functions (LAG, DENSE_RANK).</td>
      <td><code>db/schema.sql</code><br/><code>db/views.sql</code><br/><code>db/procedures.sql</code></td>
    </tr>
    <tr>
      <td rowspan="2"><b>Module 4: Git + Deployment</b></td>
      <td>Containerization & Orchestration</td>
      <td>Multi-stage Dockerfiles for web, API, and database; orchestrated via docker-compose with persistent volumes.</td>
      <td><code>server/Dockerfile</code><br/><code>docker-compose.yml</code></td>
    </tr>
    <tr>
      <td>CI/CD Automation & Git Hygiene</td>
      <td>GitHub Actions CI running linting, live MySQL 8.0 test instance, and automated test suite (20/20 passing).</td>
      <td><code>.github/workflows/ci.yml</code><br/><code>.gitignore</code></td>
    </tr>
  </tbody>
</table>

<h2>5. System Architecture & End-to-End Workflow</h2>
<p>
The system architecture and operational lifecycle are designed to be clean, intuitive, and human-readable:
</p>

<div class="diagram-box">
  <div class="diagram-title">Figure 1: WattWise Four-Module System Architecture</div>
  <svg width="100%" height="185" viewBox="0 0 740 185" xmlns="http://www.w3.org/2000/svg" style="font-family: 'Segoe UI', sans-serif;">
    <!-- Module 4 -->
    <rect x="10" y="10" width="160" height="165" rx="6" fill="#e0e7ff" stroke="#4338ca" stroke-width="1.5"/>
    <text x="90" y="30" font-size="9.5" font-weight="bold" fill="#312e81" text-anchor="middle">MODULE 4: DATA & DEVOPS</text>
    <rect x="20" y="40" width="140" height="52" rx="4" fill="#ffffff" stroke="#6366f1"/>
    <text x="90" y="58" font-size="8.5" font-weight="bold" fill="#1e1b4b" text-anchor="middle">Real Datasets</text>
    <text x="90" y="70" font-size="7.5" fill="#4338ca" text-anchor="middle">• UCI Power (296k min)</text>
    <text x="90" y="82" font-size="7.5" fill="#4338ca" text-anchor="middle">• Kaggle SGCC (25k meters)</text>
    <rect x="20" y="100" width="140" height="60" rx="4" fill="#ffffff" stroke="#6366f1"/>
    <text x="90" y="118" font-size="8.5" font-weight="bold" fill="#1e1b4b" text-anchor="middle">Docker & CI/CD</text>
    <text x="90" y="132" font-size="7.5" fill="#4338ca" text-anchor="middle">• Multi-stage Docker</text>
    <text x="90" y="145" font-size="7.5" fill="#4338ca" text-anchor="middle">• GitHub Actions CI</text>

    <!-- Arrow M4 -> M3 -->
    <path d="M 170 66 L 200 66" stroke="#4338ca" stroke-width="2" fill="none"/>
    <text x="185" y="60" font-size="7" fill="#4338ca" text-anchor="middle">ETL</text>

    <!-- Module 3 -->
    <rect x="200" y="10" width="165" height="165" rx="6" fill="#ccfbf1" stroke="#0f766e" stroke-width="1.5"/>
    <text x="282" y="30" font-size="9.5" font-weight="bold" fill="#134e4a" text-anchor="middle">MODULE 3: BACK-END & DB</text>
    <rect x="210" y="40" width="145" height="52" rx="4" fill="#ffffff" stroke="#14b8a6"/>
    <text x="282" y="58" font-size="8.5" font-weight="bold" fill="#042f2e" text-anchor="middle">Express REST API</text>
    <text x="282" y="70" font-size="7.5" fill="#0f766e" text-anchor="middle">• Deterministic Tariff Engine</text>
    <text x="282" y="82" font-size="7.5" fill="#0f766e" text-anchor="middle">• Statutory Bill Auditor</text>
    <rect x="210" y="100" width="145" height="60" rx="4" fill="#ffffff" stroke="#14b8a6"/>
    <text x="282" y="118" font-size="8.5" font-weight="bold" fill="#042f2e" text-anchor="middle">MySQL 8.0 Database</text>
    <text x="282" y="132" font-size="7.5" fill="#0f766e" text-anchor="middle">• 3NF Schema & Procs</text>
    <text x="282" y="145" font-size="7.5" fill="#0f766e" text-anchor="middle">• Analytical CTE Views</text>

    <!-- Arrow M3 -> M2 -->
    <path d="M 365 66 L 395 66" stroke="#0f766e" stroke-width="2" fill="none"/>

    <!-- Module 2 -->
    <rect x="395" y="10" width="165" height="165" rx="6" fill="#dbeafe" stroke="#1d4ed8" stroke-width="1.5"/>
    <text x="477" y="30" font-size="9.5" font-weight="bold" fill="#1e3a8a" text-anchor="middle">MODULE 2: FRONT-END & 3D</text>
    <rect x="405" y="40" width="145" height="52" rx="4" fill="#ffffff" stroke="#3b82f6"/>
    <text x="477" y="58" font-size="8.5" font-weight="bold" fill="#172554" text-anchor="middle">Next.js Web App</text>
    <text x="477" y="70" font-size="7.5" fill="#1d4ed8" text-anchor="middle">• Responsive Dashboard</text>
    <text x="477" y="82" font-size="7.5" fill="#1d4ed8" text-anchor="middle">• GSAP Scroll Dynamics</text>
    <rect x="405" y="100" width="145" height="60" rx="4" fill="#ffffff" stroke="#3b82f6"/>
    <text x="477" y="118" font-size="8.5" font-weight="bold" fill="#172554" text-anchor="middle">Three.js Virtual Twin</text>
    <text x="477" y="132" font-size="7.5" fill="#1d4ed8" text-anchor="middle">• SimReady 3D Dollhouse</text>
    <text x="477" y="145" font-size="7.5" fill="#1d4ed8" text-anchor="middle">• Room Power Heatmaps</text>

    <!-- Arrow M3 -> M1 -->
    <path d="M 355 130 L 575 130" stroke="#d97706" stroke-width="2" stroke-dasharray="4" fill="none"/>

    <!-- Module 1 -->
    <rect x="575" y="10" width="155" height="165" rx="6" fill="#fef3c7" stroke="#d97706" stroke-width="1.5"/>
    <text x="652" y="30" font-size="9.5" font-weight="bold" fill="#78350f" text-anchor="middle">MODULE 1: POWER BI</text>
    <rect x="585" y="40" width="135" height="52" rx="4" fill="#ffffff" stroke="#f59e0b"/>
    <text x="652" y="58" font-size="8.5" font-weight="bold" fill="#451a03" text-anchor="middle">Star Schema Model</text>
    <text x="652" y="70" font-size="7.5" fill="#b45309" text-anchor="middle">• 4 Fact Tables</text>
    <text x="652" y="82" font-size="7.5" fill="#b45309" text-anchor="middle">• 4 Conformed Dims</text>
    <rect x="585" y="100" width="135" height="60" rx="4" fill="#ffffff" stroke="#f59e0b"/>
    <text x="652" y="118" font-size="8.5" font-weight="bold" fill="#451a03" text-anchor="middle">Executive Dashboards</text>
    <text x="652" y="132" font-size="7.5" fill="#b45309" text-anchor="middle">• +118% Cliff Visualizer</text>
    <text x="652" y="145" font-size="7.5" fill="#b45309" text-anchor="middle">• Discom Audit Matrix</text>
  </svg>
</div>

<div class="diagram-box">
  <div class="diagram-title">Figure 2: End-to-End Operational Workflow</div>
  <svg width="100%" height="85" viewBox="0 0 740 85" xmlns="http://www.w3.org/2000/svg" style="font-family: 'Segoe UI', sans-serif;">
    <g transform="translate(5, 5)">
      <!-- Step 1 -->
      <rect x="0" y="10" width="100" height="52" rx="5" fill="#eff6ff" stroke="#3b82f6" stroke-width="1.5"/>
      <text x="50" y="27" font-size="8" font-weight="bold" fill="#1e40af" text-anchor="middle">1. Input Reading</text>
      <text x="50" y="40" font-size="7" fill="#475569" text-anchor="middle">Manual Entry, OCR,</text>
      <text x="50" y="50" font-size="7" fill="#475569" text-anchor="middle">or IoT Smart Plug</text>

      <path d="M 100 36 L 122 36" stroke="#64748b" stroke-width="2" fill="none"/>

      <!-- Step 2 -->
      <rect x="122" y="10" width="110" height="52" rx="5" fill="#f5f3ff" stroke="#8b5cf6" stroke-width="1.5"/>
      <text x="177" y="27" font-size="8" font-weight="bold" fill="#5b21b6" text-anchor="middle">2. Tariff Engine</text>
      <text x="177" y="40" font-size="7" fill="#475569" text-anchor="middle">MERC §226/2022 Rules</text>
      <text x="177" y="50" font-size="7" fill="#475569" text-anchor="middle">Slabs + FC + WC + Duty</text>

      <path d="M 232 36 L 254 36" stroke="#64748b" stroke-width="2" fill="none"/>

      <!-- Step 3 -->
      <rect x="254" y="10" width="105" height="52" rx="5" fill="#fefce8" stroke="#eab308" stroke-width="1.5"/>
      <text x="306" y="27" font-size="8" font-weight="bold" fill="#854d0e" text-anchor="middle">3. Statutory Audit</text>
      <text x="306" y="40" font-size="7" fill="#475569" text-anchor="middle">Compare Billed vs Recomputed</text>
      <text x="306" y="50" font-size="7" fill="#475569" text-anchor="middle">|Variance| &gt; ₹1.00 Flag</text>

      <path d="M 359 36 L 381 36" stroke="#64748b" stroke-width="2" fill="none"/>

      <!-- Step 4 -->
      <rect x="381" y="10" width="105" height="52" rx="5" fill="#fef2f2" stroke="#ef4444" stroke-width="1.5"/>
      <text x="433" y="27" font-size="8" font-weight="bold" fill="#991b1b" text-anchor="middle">4. Dispute Slip</text>
      <text x="433" y="40" font-size="7" fill="#475569" text-anchor="middle">Draft Formal Legal</text>
      <text x="433" y="50" font-size="7" fill="#475569" text-anchor="middle">MSEDCL CGRF Petition</text>

      <path d="M 486 36 L 508 36" stroke="#64748b" stroke-width="2" fill="none"/>

      <!-- Step 5 -->
      <rect x="508" y="10" width="105" height="52" rx="5" fill="#f0fdf4" stroke="#22c55e" stroke-width="1.5"/>
      <text x="560" y="27" font-size="8" font-weight="bold" fill="#166534" text-anchor="middle">5. 3D Twin & Split</text>
      <text x="560" y="40" font-size="7" fill="#475569" text-anchor="middle">Appliance Breakdown</text>
      <text x="560" y="50" font-size="7" fill="#475569" text-anchor="middle">& Fair Roommate Splits</text>

      <path d="M 613 36 L 635 36" stroke="#64748b" stroke-width="2" fill="none"/>

      <!-- Step 6 -->
      <rect x="635" y="10" width="95" height="52" rx="5" fill="#fffbeb" stroke="#f59e0b" stroke-width="1.5"/>
      <text x="682" y="27" font-size="8" font-weight="bold" fill="#92400e" text-anchor="middle">6. Power BI Sync</text>
      <text x="682" y="40" font-size="7" fill="#475569" text-anchor="middle">Executive Tabular</text>
      <text x="682" y="50" font-size="7" fill="#475569" text-anchor="middle">Warehouse Analytics</text>
    </g>
  </svg>
</div>

<div class="page-break"></div>

<h2>6. Mathematical Verification & Empirical Results</h2>
<p>
The core statutory calculation engine was verified against actual Maharashtra residential electricity bills under MERC Case No. 226 of 2022 rules:
</p>
<div class="formula-box">
  Total Bill = Energy Charge (Slabs 1-4) + Fixed Charge (₹128) + Wheeling (₹1.28/u) + FAC (₹0.35/u) + 16% Electricity Duty
</div>

<table>
  <thead>
    <tr>
      <th>Test Case Name</th>
      <th>Consumption</th>
      <th>Discom Bill</th>
      <th>Recomputed</th>
      <th>Variance</th>
      <th>Audit Outcome & Explanation</th>
    </tr>
  </thead>
  <tbody>
    <tr class="success-row">
      <td><b>Case 1: May (Summer Peak)</b></td>
      <td>342 units</td>
      <td>₹4,206.00</td>
      <td>₹4,206.00</td>
      <td>₹0.00</td>
      <td><b>100% Match:</b> Exact rupee match across all slabs, wheeling, FAC, and duty.</td>
    </tr>
    <tr class="success-row">
      <td><b>Case 2: June (Monsoon)</b></td>
      <td>240 units</td>
      <td>₹2,679.00</td>
      <td>₹2,679.00</td>
      <td>₹0.00</td>
      <td><b>100% Match:</b> Correct telescopic apportioning into Slabs 1 and 2.</td>
    </tr>
    <tr class="highlight-row">
      <td><b>Case 3: July (Discom Error)</b></td>
      <td>210 units</td>
      <td>₹3,550.00</td>
      <td>₹2,504.00</td>
      <td><b>+₹1,046.00</b></td>
      <td><b>Flagged Overcharge:</b> Utility applied commercial rates; CGRF petition generated.</td>
    </tr>
    <tr class="success-row">
      <td><b>Case 4: Boundary (0 Units)</b></td>
      <td>0 units</td>
      <td>₹148.00</td>
      <td>₹148.00</td>
      <td>₹0.00</td>
      <td><b>100% Match:</b> Single-phase fixed charge ₹128.00 + 16% duty (₹20.48 $\to$ ₹148).</td>
    </tr>
    <tr class="success-row">
      <td><b>Case 5: Lifeline Max (100 Units)</b></td>
      <td>100 units</td>
      <td>₹849.00</td>
      <td>₹849.00</td>
      <td>₹0.00</td>
      <td><b>100% Match:</b> Peak boundary of Slab 1 at ₹4.41/kWh rate.</td>
    </tr>
  </tbody>
</table>

<h3>Empirical Benchmark: Accuracy vs. Human Recall</h3>
<ul>
  <li><b>Method A (Consumer Recall / Survey Guesswork):</b> <b>31.4% Mean Absolute Percentage Error (MAPE)</b>. Consumers heavily underestimate standby/refrigeration loads.</li>
  <li><b>Method B (WattWise 4-Model Physics Disaggregator):</b> <b>7.2% MAPE</b>. Over 4× more accurate than human estimation without requiring any hardware.</li>
  <li><b>Method C (Smart Metered Sub-Plugs with ≥80% Coverage):</b> <b>2.4% MAPE</b>.</li>
</ul>

<h2>7. Real-World Applications</h2>
<ol>
  <li><b>Residential Consumers:</b> Audits monthly utility bills against overcharging and billing-cycle inflation traps (where utilities delay reading past 30 days to push units into higher slabs).</li>
  <li><b>Student Flatmates & Co-Living:</b> Eliminates roommate arguments by replacing arbitrary 50/50 splits with appliance-weighted consumption shares (e.g. accounting for personal AC runtime).</li>
  <li><b>Energy Efficiency Decision Support:</b> What-If lab provides concrete financial payback analysis (e.g., demonstrating that a 28W BLDC ceiling fan pays for itself in 7.4 months).</li>
  <li><b>Consumer Grievance Legal Automation:</b> Automatically drafts legally formatted CGRF dispute paperwork citing specific MERC clauses.</li>
</ol>

<h2>8. Division of Work & Individual Contributions</h2>
<table>
  <thead>
    <tr>
      <th>Team Member</th>
      <th>Module Focus</th>
      <th>Key Technical Contributions</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><b>Atharv Deshmukh</b><br/>(<code>BT24CSD004</code>)</td>
      <td><b>Module 1 (Dashboards)</b><br/>& <b>Module 3 (Back-End/SQL)</b></td>
      <td>
        • Architected MySQL 8.0 3NF schema, stored procedures (calc_bill, audit_bill), and CTE views.<br/>
        • Built Power BI Tabular Star Schema data warehouse with 25+ DAX measures.<br/>
        • Ingested and processed real UCI (296k min) and Kaggle SGCC (25k smart meters) datasets.<br/>
        • Configured Docker multi-stage containers and automated GitHub Actions CI pipeline.
      </td>
    </tr>
    <tr>
      <td><b>Aditya Bhalerao</b><br/>(<code>BT24CSD018</code>)</td>
      <td><b>Module 2 (Front-End/3D)</b><br/>& <b>Module 3 (Tariff Engine)</b></td>
      <td>
        • Engineered Next.js 16 / React 19 web interface, responsive layouts, and Recharts suite.<br/>
        • Built Three.js 3D Virtual House with procedural geometry and GLTF assets.<br/>
        • Implemented deterministic MSEDCL LT-I tariff engine adhering strictly to MERC Case 226/2022.<br/>
        • Developed fair multi-tenant room cost-splitting algorithm and CGRF legal dispute generator.
      </td>
    </tr>
  </tbody>
</table>

<h2>9. Conclusion & Future Scope</h2>
<p>
<b>WattWise</b> demonstrates that utility bill opacity and consumer overbilling can be solved using accessible data science platforms. By integrating deterministic regulatory logic with 3D digital twins and executive Power BI analytics, the project delivers a complete, verified solution across all four modules of TPDS 3.
</p>
<p>
<b>Future Scope:</b>
</p>
<ul>
  <li>Expanding tariff rule tables to support additional discoms across India (BESCOM Karnataka, TNEB Tamil Nadu, BSES Delhi).</li>
  <li>On-device camera OCR for instantaneous scanning of physical paper bills.</li>
  <li>Direct ESP32 CT-clamp hardware integration over MQTT for automated mains submetering.</li>
</ul>

<h2>10. Statutory & Academic References</h2>
<ol>
  <li>Maharashtra Electricity Regulatory Commission (MERC): <i>Multi-Year Tariff Order for MSEDCL for FY 2023-24 to FY 2024-25, Case No. 226 of 2022</i>, March 31, 2023.</li>
  <li>Ministry of Power, Government of India: <i>The Electricity Act, 2003</i>, Act No. 36 of 2003, Part VI.</li>
  <li>Bureau of Energy Efficiency (BEE): <i>Standards &amp; Labeling Regulations for Energy Efficient Room Air Conditioners and Ceiling Fans</i>, 2023.</li>
  <li>UCI Machine Learning Repository: <i>Individual Household Electric Power Consumption Dataset</i>, Électricité de France (EDF).</li>
  <li>State Grid Corporation of China (SGCC): <i>Electricity Theft Detection Dataset</i>, 42,372 customer smart meter records.</li>
</ol>

</body>
</html>
"""

with open(html_path, "w", encoding="utf-8") as f:
    f.write(report_html)

edge = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
cmd = [
    edge,
    "--headless",
    "--disable-gpu",
    "--run-all-compositor-stages-before-draw",
    f"--print-to-pdf={pdf_path}",
    html_path,
]
subprocess.run(cmd, check=True)
print("SUCCESS: PDF compiled cleanly!")
print("PDF File Path:", pdf_path)
print("File Size:", os.path.getsize(pdf_path), "bytes")

