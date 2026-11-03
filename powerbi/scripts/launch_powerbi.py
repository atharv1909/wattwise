"""
WattWise Power BI Workspace Launcher
TPDS 3 Course Project - Module 1 (Power BI & Advanced Analytics)
"""

import os
import subprocess
import sys

DATA_DIR = r"D:\TPDS 3 PROJECT\powerbi\data"
PBI_EXE = r"C:\Users\athar\AppData\Local\Microsoft\WindowsApps\PBIDesktopStore.exe"

print("==================================================================")
print("  ⚡ WattWise Power BI Desktop Workspace Launcher")
print("==================================================================")
print(f"Data Source Folder: {DATA_DIR}")

# 1. Open Data Folder in Windows Explorer for easy drag-and-drop
print("[1/2] Opening Power BI Data Folder in Windows Explorer...")
os.system(f'explorer "{DATA_DIR}"')

# 2. Launch Clean Power BI Desktop
print("[2/2] Launching Microsoft Power BI Desktop...")
try:
    subprocess.Popen([PBI_EXE])
    print("\n✅ Power BI Desktop launched successfully!")
    print("\nQuick 30-Second Steps in Power BI Desktop:")
    print(" 1. Click 'Get Data' -> 'Text/CSV'")
    print(" 2. Select 'Fact_MonthlyBilling.csv' from the opened data folder")
    print(" 3. Click 'Load' -> Your entire 144-bill audited dataset is ready!")
    print(" 4. (Optional) Repeat for 'Fact_ApplianceBreakdown.csv' & 'Fact_GridTheftBenchmark.csv'")
    print(" 5. Drag fields onto the canvas to build your cards & charts!")
except Exception as e:
    print(f"Could not launch Power BI Desktop automatically: {e}")
    print("Please launch Power BI Desktop from your Start menu.")

print("==================================================================")
