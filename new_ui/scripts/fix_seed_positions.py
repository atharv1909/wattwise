#!/usr/bin/env python3
"""Fix room-local appliance coordinates in seed.ts and validate placements."""
import re

PATH = "/home/z/my-project/src/lib/wattwise/seed.ts"
src = open(PATH).read()

# (anchor custom_name, old pos pair, new pos pair) — room-LOCAL coordinates
FIXES = [
    ("Storage Geyser 15L", "pos_x: 4.7, pos_y: 1.6, pos_z: 2.75", "pos_x: 0.3, pos_y: 1.6, pos_z: 0.15"),
    ("\"Washing Machine\", rated_w: 500, standby_w: 1.5, bee_star_rating: 5, daily_hours_guess: 0.6", "pos_x: 0.6, pos_y: 0, pos_z: 4.6", "pos_x: 0.6, pos_y: 0, pos_z: 0.6"),
    ("Balcony Light", "pos_x: 2.2, pos_y: 2.68, pos_z: 4.7", "pos_x: 2.2, pos_y: 2.68, pos_z: 0.7"),
    # 3BHK
    ("Master 5-Star Inverter AC", "pos_x: 2.3, pos_y: 2.12, pos_z: 4.58", "pos_x: 2.3, pos_y: 2.12, pos_z: 0.18"),
    ("Master Bedroom BLDC Fan", "pos_x: 2.3, pos_y: 2.62, pos_z: 6.2", "pos_x: 2.3, pos_y: 2.62, pos_z: 1.8"),
    ("Kids Room Split AC", "pos_x: 6.3, pos_y: 2.12, pos_z: 4.58", "pos_x: 1.7, pos_y: 2.12, pos_z: 0.18"),
    ("Kids Room Ceiling Fan", "pos_x: 6.3, pos_y: 2.62, pos_z: 5.9", "pos_x: 1.7, pos_y: 2.62, pos_z: 1.5"),
    ("Study Room Ceiling Fan", "pos_x: 10.0, pos_y: 2.62, pos_z: 4.8", "pos_x: 2.0, pos_y: 2.62, pos_z: 1.6"),
    ("Study Laptop Workstation", "pos_x: 10.0, pos_y: 0.76, pos_z: 3.7", "pos_x: 2.0, pos_y: 0.76, pos_z: 0.5"),
    ("Refrigerator 340L Side-by-Side", "pos_x: 6.05, pos_y: 0, pos_z: 0.55", "pos_x: 0.45, pos_y: 0, pos_z: 0.55"),
    ("Microwave Convection 28L", "pos_x: 7.0, pos_y: 0.92, pos_z: 0.45", "pos_x: 1.4, pos_y: 0.92, pos_z: 0.45"),
    ("Chimney Extractor 90cm", "pos_x: 7.9, pos_y: 1.65, pos_z: 0.6", "pos_x: 2.3, pos_y: 1.65, pos_z: 0.6"),
    ("Instant Geyser 3L", "pos_x: 5.85, pos_y: 1.6, pos_z: 4.1", "pos_x: 0.25, pos_y: 1.6, pos_z: 0.9"),
    ("Storage Geyser 25L\", rated_w: 2000, standby_w: 2, bee_star_rating: 3", "pos_x: 8.5, pos_y: 1.6, pos_z: 6.6", "pos_x: 0.5, pos_y: 1.6, pos_z: 0.2"),
    ("Washing Machine 8kg Front Load", "pos_x: 9.3, pos_y: 0, pos_z: 0.6", "pos_x: 0.5, pos_y: 0, pos_z: 0.6"),
    ("Dishwasher 12 Place", "pos_x: 11.4, pos_y: 0, pos_z: 0.6", "pos_x: 2.6, pos_y: 0, pos_z: 0.6"),
    # PG
    ("Room A Split AC (shared)", "pos_x: 5.8, pos_y: 2.12, pos_z: 0.18, rot_y: Math.PI", "pos_x: 1.6, pos_y: 2.12, pos_z: 0.18, rot_y: 0"),
    ("Room A Ceiling Fan", "pos_x: 5.8, pos_y: 2.62, pos_z: 1.6", "pos_x: 1.6, pos_y: 2.62, pos_z: 1.6"),
    ("Room B Ceiling Fan", "pos_x: 8.2, pos_y: 2.62, pos_z: 1.6", "pos_x: 0.8, pos_y: 2.62, pos_z: 1.6"),
    ("Tenant Laptop (Amit)", "pos_x: 8.0, pos_y: 0.55, pos_z: 0.9", "pos_x: 0.6, pos_y: 0.55, pos_z: 0.9"),
    ("Room C Ceiling Fan", "pos_x: 1.7, pos_y: 2.62, pos_z: 5.0", "pos_x: 1.7, pos_y: 2.62, pos_z: 1.4"),
    ("Tenant Laptop (Kiran)", "pos_x: 0.6, pos_y: 0.55, pos_z: 4.0", "pos_x: 0.6, pos_y: 0.55, pos_z: 0.4"),
    ("PG Refrigerator 190L", "pos_x: 3.85, pos_y: 0, pos_z: 3.85", "pos_x: 0.45, pos_y: 0, pos_z: 0.25"),
    ("Induction Cooktop", "pos_x: 5.4, pos_y: 0, pos_z: 3.85", "pos_x: 2.0, pos_y: 0, pos_z: 0.25"),
    ("Storage Geyser 15L\", rated_w: 2000, standby_w: 2, bee_star_rating: 3, daily_hours_guess: 1.5", "pos_x: 6.55, pos_y: 1.6, pos_z: 4.75", "pos_x: 0.35, pos_y: 1.6, pos_z: 1.15"),
]

applied = 0
for anchor, old, new in FIXES:
    # find the appliance line containing anchor, then replace pos substring on that line
    lines = src.split("\n")
    done = False
    for i, ln in enumerate(lines):
        if anchor in ln and old in ln:
            lines[i] = ln.replace(old, new)
            src = "\n".join(lines)
            applied += 1
            done = True
            break
    if not done:
        print(f"WARN: no match for {anchor!r} / {old!r}")
open(PATH, "w").write(src)
print(f"applied {applied}/{len(FIXES)} fixes")
