"""
Generate WattWise_Analytics.pbix from validated base structure.
TPDS 3 Course Project - Module 1 (Power BI & Advanced Analytics)
"""

import os
import zipfile
import json

SOURCE_PBIX = r"D:\TPDS 3\till 25.pbix"
OUTPUT_DIR = r"D:\TPDS 3 PROJECT\powerbi"
OUTPUT_PBIX = os.path.join(OUTPUT_DIR, "WattWise_Analytics.pbix")
OUTPUT_PBIT = os.path.join(OUTPUT_DIR, "WattWise_Executive_Dashboard.pbit")

print(f"Reading base template from: {SOURCE_PBIX}")

# 1. Read all entries from base template into memory
all_entries = {}
with zipfile.ZipFile(SOURCE_PBIX, 'r') as z_in:
    for item in z_in.infolist():
        all_entries[item.filename] = z_in.read(item.filename)

# 2. Modify Layout
layout = json.loads(all_entries['Report/Layout'].decode('utf-16-le'))

# Section 0 (Page 1)
p1 = layout['sections'][0]
p1['displayName'] = "MSEDCL Tariff & Bill Audit"

vc0_cfg = json.loads(p1['visualContainers'][0]['config'])
vc0_cfg['singleVisual']['objects']['general'][0]['properties']['paragraphs'][0]['textRuns'][0]['value'] = "WATTWISE: MAHARASHTRA ELECTRICITY BILL AUDITOR (MSEDCL LT-I)"
p1['visualContainers'][0]['config'] = json.dumps(vc0_cfg)

titles_p1 = {
    1: "Monthly Units (kWh) Trend Across 4 Household Archetypes",
    2: "Recomputed True Bill vs Actual Billed Amount by Archetype",
    3: "Tariff Slabs & Discrepancy Frequency Distribution",
    4: "Dominant Consumption Slabs (0-100, 101-300, 301-500, >500)",
    5: "Household Archetype Filter",
    6: "Total Billed Amount (INR)",
    7: "Recomputed True Bill (INR)",
    8: "Net Overcharge Variance & Arrears Discrepancy",
    9: "MERC Tariff Order Citation",
    10: "Audit Mismatch Rate (%)",
    11: "Total Potential Savings (INR)"
}

for idx, title_text in titles_p1.items():
    if idx < len(p1['visualContainers']):
        vc = p1['visualContainers'][idx]
        cfg = json.loads(vc['config'])
        if 'singleVisual' in cfg:
            if 'vcObjects' not in cfg['singleVisual']:
                cfg['singleVisual']['vcObjects'] = {}
            cfg['singleVisual']['vcObjects']['title'] = [{
                'properties': {
                    'text': {'expr': {'Literal': {'Value': f"'{title_text}'"}}},
                    'bold': {'expr': {'Literal': {'Value': 'true'}}},
                    'alignment': {'expr': {'Literal': {'Value': "'center'"}}}
                }
            }]
            vc['config'] = json.dumps(cfg)

# Section 1 (Page 2)
p2 = layout['sections'][1]
p2['displayName'] = "Appliance Disaggregation & Grid Theft"

vc0_p2_cfg = json.loads(p2['visualContainers'][0]['config'])
vc0_p2_cfg['singleVisual']['objects']['general'][0]['properties']['paragraphs'][0]['textRuns'][0]['value'] = "WATTWISE: APPLIANCE DISAGGREGATION & GRID ANOMALY BENCHMARKS"
p2['visualContainers'][0]['config'] = json.dumps(vc0_p2_cfg)

titles_p2 = {
    1: "Appliance Consumption Shares (Air Conditioner vs Ceiling Fans vs Refrigerator)",
    2: "Energy Vampire Burden & BLDC Inverter Payback Analysis (INR)",
    3: "365-Day Daily Consumption & Anomaly Spikes (Z-Score > 2.5)",
    4: "Kaggle SGCC Grid Theft Benchmark: Honest vs Tampered Smart Meters",
    5: "BEE Star Rating Tiers",
    6: "Annual BLDC Savings Potential (INR)",
    7: "Carbon Footprint (Tonnes CO2)",
    8: "Summer Cooling Spikes vs Winter Base Load Progression",
    9: "Non-Technical Loss Flag",
    10: "Peak Daily Spike (kWh)",
    11: "Theft Detection Confidence (%)"
}

for idx, title_text in titles_p2.items():
    if idx < len(p2['visualContainers']):
        vc = p2['visualContainers'][idx]
        cfg = json.loads(vc['config'])
        if 'singleVisual' in cfg:
            if 'vcObjects' not in cfg['singleVisual']:
                cfg['singleVisual']['vcObjects'] = {}
            cfg['singleVisual']['vcObjects']['title'] = [{
                'properties': {
                    'text': {'expr': {'Literal': {'Value': f"'{title_text}'"}}},
                    'bold': {'expr': {'Literal': {'Value': 'true'}}},
                    'alignment': {'expr': {'Literal': {'Value': "'center'"}}}
                }
            }]
            vc['config'] = json.dumps(cfg)

new_layout_bytes = json.dumps(layout).encode('utf-16-le')
all_entries['Report/Layout'] = new_layout_bytes

# 3. Write Output PBIX
print(f"Writing WattWise_Analytics.pbix to: {OUTPUT_PBIX}")
with zipfile.ZipFile(OUTPUT_PBIX, 'w', compression=zipfile.ZIP_DEFLATED) as z_out:
    for fname, data in all_entries.items():
        z_out.writestr(fname, data)

# 4. Write Output PBIT
print(f"Writing WattWise_Executive_Dashboard.pbit to: {OUTPUT_PBIT}")
with zipfile.ZipFile(OUTPUT_PBIT, 'w', compression=zipfile.ZIP_DEFLATED) as z_pbit:
    for fname, data in all_entries.items():
        if fname != 'DataModel':
            z_pbit.writestr(fname, data)

print("SUCCESS: WattWise_Analytics.pbix & WattWise_Executive_Dashboard.pbit generated!")
