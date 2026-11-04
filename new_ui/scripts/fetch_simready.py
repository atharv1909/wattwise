#!/usr/bin/env python3
"""Download curated NVIDIA SimReady assets (web-ready GLB conversions)
from the codepawl/simready-glb Hugging Face dataset (CC-BY-4.0, models by NVIDIA).
Catalog: https://huggingface.co/datasets/codepawl/simready-glb
Originals: https://huggingface.co/datasets/nvidia/simready-assets
"""
import json
import os
import sys
import urllib.request

BASE = "https://huggingface.co/datasets/codepawl/simready-glb/resolve/main/glb"
OUT = "/home/z/my-project/public/assets/simready"
MANIFEST = "/tmp/simready/manifest.jsonl"

# asset name -> role in the WattWise 3D home
PICKS = {
    "TV_a01": "tv",
    "appliance_refrigerator_a01": "refrigerator",
    "ventilation_ceilingFan_hvls_a01": "ceiling_fan",
    "climate_shopFan_pedestal_a01": "pedestal_fan",
    "lamp_ceiling_1m_rectangle_a01": "ceiling_light",
    "lamp_ceiling_50cm_square_a01": "kitchen_light",
    "lamp_table_bedside_a01": "bedside_lamp",
    "sofa_soft_b01": "sofa",
    "toilet_a01": "toilet",
    "sanitary_sink_wallMounted_a01": "sink",
    "mirror_bathroom_a01": "mirror",
    "socket_a01": "socket",
    "measurement_clock_alarm_a01": "alarm_clock",
    "computer_desktop_tower_a01": "pc_tower",
    "computer_monitor_office_a01": "pc_monitor",
    "computer_keyboard_a01": "keyboard",
    "appliance_toaster_a01": "toaster",
    "appliance_extractor_a01": "extractor",
    "blinds_window_2m_open_a01": "blinds",
    "kitchenware_pan_a01": "pan",
    "dishware_mug_coffee_a01": "mug",
    "misc_glass_vase_a01": "vase",
    "water_cooler_a01": "water_cooler",
    "climate_heater_portableElectric_a01": "room_heater",
}


def load_bounds():
    bounds = {}
    with open(MANIFEST) as f:
        for line in f:
            d = json.loads(line)
            if d["asset"] in PICKS:
                b = d.get("bounds", {})
                bounds[d["asset"]] = {
                    "min": b.get("min"),
                    "max": b.get("max"),
                    "triangles": d.get("optimized", {}).get("triangles"),
                    "bytes": d.get("optimized", {}).get("bytes"),
                }
    return bounds


def main():
    os.makedirs(OUT, exist_ok=True)
    bounds = load_bounds()
    report = {}
    for asset, role in PICKS.items():
        dest = os.path.join(OUT, f"{role}.glb")
        url = f"{BASE}/{asset}.glb"
        if os.path.exists(dest) and os.path.getsize(dest) > 10_000:
            print(f"skip (exists): {role}.glb")
        else:
            print(f"downloading {asset} -> {role}.glb ...", flush=True)
            try:
                req = urllib.request.Request(url, headers={"User-Agent": "wattwise/1.0"})
                with urllib.request.urlopen(req, timeout=120) as r, open(dest, "wb") as f:
                    f.write(r.read())
            except Exception as e:  # noqa: BLE001
                print(f"  FAILED {asset}: {e}", file=sys.stderr)
                continue
        b = bounds.get(asset, {})
        report[role] = {"asset": asset, "file": f"{role}.glb", **b}
    with open(os.path.join(OUT, "catalog.json"), "w") as f:
        json.dump(
            {
                "source": "NVIDIA SimReady assets (nvidia/simready-assets), web-ready GLB conversions by codepawl/simready-glb",
                "license": "CC-BY-4.0",
                "items": report,
            },
            f,
            indent=2,
        )
    total = sum(os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT) if f.endswith(".glb"))
    print(f"OK: {len(report)} assets, total {total/1e6:.1f} MB")


if __name__ == "__main__":
    main()
