import os
import zipfile
import json

src = r"D:\TPDS 3\till 25.pbix"
out_pbix = r"D:\TPDS 3 PROJECT\powerbi\WattWise_Analytics.pbix"

with zipfile.ZipFile(src, "r") as z_in:
    entries = {}
    for item in z_in.infolist():
        entries[item.filename] = (item.compress_type, z_in.read(item.filename))

layout = json.loads(entries["Report/Layout"][1].decode("utf-16-le"))

# Page 1 - MSEDCL Tariff & Regulatory Audit
p1 = layout["sections"][0]
p1["displayName"] = "MSEDCL Tariff & Bill Audit"

vc0_cfg = json.loads(p1["visualContainers"][0]["config"])
if "singleVisual" in vc0_cfg and "objects" in vc0_cfg["singleVisual"]:
    try:
        vc0_cfg["singleVisual"]["objects"]["general"][0]["properties"]["paragraphs"][0]["textRuns"][0]["value"] = "WATTWISE: MAHARASHTRA ELECTRICITY BILL AUDITOR (MSEDCL LT-I)"
        p1["visualContainers"][0]["config"] = json.dumps(vc0_cfg)
    except:
        pass

titles_p1 = {
    1: "Monthly Units (kWh) Trend Across 4 Household Archetypes",
    2: "Recomputed True Bill vs Actual Billed Amount by Archetype",
    3: "Tariff Slabs & Discrepancy Frequency Distribution",
    4: "Dominant Consumption Slabs (0-100, 101-300, 301-500, >500)",
    5: "Household Archetype Slicer",
    6: "Total Billed Amount (INR)",
    7: "Recomputed True Bill (INR)",
    8: "Net Overcharge Variance & Discrepancy",
    9: "MERC Case No. 226/2022 Statutory Baseline",
    10: "Audit Mismatch Rate (%)",
    11: "Total Potential Savings (INR)"
}

for idx, title_text in titles_p1.items():
    if idx < len(p1["visualContainers"]):
        vc = p1["visualContainers"][idx]
        cfg = json.loads(vc["config"])
        if "singleVisual" in cfg:
            if "vcObjects" not in cfg["singleVisual"]:
                cfg["singleVisual"]["vcObjects"] = {}
            cfg["singleVisual"]["vcObjects"]["title"] = [{
                "properties": {
                    "text": {"expr": {"Literal": {"Value": f"'{title_text}'"}}},
                    "bold": {"expr": {"Literal": {"Value": "true"}}},
                    "alignment": {"expr": {"Literal": {"Value": "'center'"}}}
                }
            }]
            vc["config"] = json.dumps(cfg)

# Page 2 - Appliance Disaggregation & Grid Anomaly Benchmarks
p2 = layout["sections"][1]
p2["displayName"] = "Appliance Disaggregation & Grid Theft"

vc0_p2_cfg = json.loads(p2["visualContainers"][0]["config"])
if "singleVisual" in vc0_p2_cfg and "objects" in vc0_p2_cfg["singleVisual"]:
    try:
        vc0_p2_cfg["singleVisual"]["objects"]["general"][0]["properties"]["paragraphs"][0]["textRuns"][0]["value"] = "WATTWISE: APPLIANCE DISAGGREGATION & GRID ANOMALY BENCHMARKS"
        p2["visualContainers"][0]["config"] = json.dumps(vc0_p2_cfg)
    except:
        pass

titles_p2 = {
    1: "Appliance Consumption Shares (AC vs Fans vs Refrigerator)",
    2: "Energy Vampire Burden & BLDC Inverter Payback Analysis (INR)",
    3: "Daily Consumption & Anomaly Spikes (Z-Score > 2.5)",
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
    if idx < len(p2["visualContainers"]):
        vc = p2["visualContainers"][idx]
        cfg = json.loads(vc["config"])
        if "singleVisual" in cfg:
            if "vcObjects" not in cfg["singleVisual"]:
                cfg["singleVisual"]["vcObjects"] = {}
            cfg["singleVisual"]["vcObjects"]["title"] = [{
                "properties": {
                    "text": {"expr": {"Literal": {"Value": f"'{title_text}'"}}},
                    "bold": {"expr": {"Literal": {"Value": "true"}}},
                    "alignment": {"expr": {"Literal": {"Value": "'center'"}}}
                }
            }]
            vc["config"] = json.dumps(cfg)

new_layout_bytes = json.dumps(layout).encode("utf-16-le")
entries["Report/Layout"] = (zipfile.ZIP_DEFLATED, new_layout_bytes)

# Write output PBIX with exact compression preservation
with zipfile.ZipFile(out_pbix, "w") as z_out:
    for filename, (ctype, data) in entries.items():
        info = zipfile.ZipInfo(filename)
        # CRITICAL: DataModel MUST BE STORED (compress_type=0), others DEFLATED (compress_type=8)
        if filename == "DataModel":
            info.compress_type = zipfile.ZIP_STORED
        else:
            info.compress_type = zipfile.ZIP_DEFLATED
        z_out.writestr(info, data)

print("SUCCESS: Generated WattWise_Analytics.pbix!")
print("File Path:", out_pbix)
print("File Size:", os.path.getsize(out_pbix), "bytes")

