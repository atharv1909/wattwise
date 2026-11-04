import os
import shutil
import zipfile
import json

src = r"D:\TPDS 3\till 25.pbix"
out_pbix = r"D:\TPDS 3 PROJECT\powerbi\WattWise_Analytics.pbix"
temp_dir = r"D:\TPDS 3 PROJECT\powerbi\pbix_temp"

# 1. Clean temp dir
if os.path.exists(temp_dir):
    shutil.rmtree(temp_dir)
os.makedirs(temp_dir)

# 2. Extract base PBIX
with zipfile.ZipFile(src, "r") as z:
    z.extractall(temp_dir)

# 3. Read and modify Layout
layout_path = os.path.join(temp_dir, "Report", "Layout")
with open(layout_path, "r", encoding="utf-16le", errors="ignore") as f:
    raw_content = f.read()

clean_json = (
    raw_content.replace(chr(0), "")
    .replace(chr(28), "")
    .replace(chr(29), "")
    .replace(chr(25), "")
)
layout = json.loads(clean_json)

# Update Page 1
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
                    "text": {"expr": {"Literal": {"Value": "'" + title_text + "'"}}},
                    "bold": {"expr": {"Literal": {"Value": "true"}}},
                    "alignment": {"expr": {"Literal": "'center'"}}
                }
            }]
            vc["config"] = json.dumps(cfg)

# Update Page 2
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
                    "text": {"expr": {"Literal": {"Value": "'" + title_text + "'"}}},
                    "bold": {"expr": {"Literal": {"Value": "true"}}},
                    "alignment": {"expr": {"Literal": "'center'"}}
                }
            }]
            vc["config"] = json.dumps(cfg)

# Write back layout in UTF-16 LE
with open(layout_path, "w", encoding="utf-16le") as f:
    f.write(json.dumps(layout, ensure_ascii=False))

# 4. DELETE SecurityBindings file
sec_file = os.path.join(temp_dir, "SecurityBindings")
if os.path.exists(sec_file):
    os.remove(sec_file)
    print("Deleted SecurityBindings file.")

# 5. Remove SecurityBindings from [Content_Types].xml
ct_path = os.path.join(temp_dir, "[Content_Types].xml")
if os.path.exists(ct_path):
    with open(ct_path, "r", encoding="utf-8") as f:
        ct = f.read()
    ct = ct.replace('<Override PartName="/SecurityBindings" ContentType=""/>', "")
    ct = ct.replace('<Override PartName="/SecurityBindings" ContentType="" />', "")
    with open(ct_path, "w", encoding="utf-8") as f:
        f.write(ct)
    print("Updated [Content_Types].xml (removed SecurityBindings mapping).")

# 6. Repack into PBIX preserving DataModel as ZIP_STORED
if os.path.exists(out_pbix):
    os.remove(out_pbix)

with zipfile.ZipFile(out_pbix, "w") as z_out:
    for root, dirs, files in os.walk(temp_dir):
        for file in files:
            full = os.path.join(root, file)
            arcname = os.path.relpath(full, temp_dir).replace("\\", "/")
            info = zipfile.ZipInfo(arcname)
            if file == "DataModel":
                info.compress_type = zipfile.ZIP_STORED
            else:
                info.compress_type = zipfile.ZIP_DEFLATED
            with open(full, "rb") as f_in:
                z_out.writestr(info, f_in.read())

shutil.rmtree(temp_dir)
print("SUCCESS: WattWise_Analytics.pbix created without SecurityBindings!")
print("File size:", os.path.getsize(out_pbix), "bytes")
with zipfile.ZipFile(out_pbix, "r") as z:
    print("Entries:", z.namelist())

