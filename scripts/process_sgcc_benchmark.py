"""
SGCC Electricity Theft & Anomaly Benchmark Processing Script
Processes the downloaded Kaggle SGCC dataset:
- Extracts normal vs flagged theft/anomaly consumer profiles
- Converts wide daily columns to time-series format for WattWise ingestion
"""

import os
import pandas as pd
import numpy as np

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
SGCC_PATH = os.path.join(DATA_DIR, "sgcc", "datasetsmall.csv")

def process_sgcc():
    if not os.path.exists(SGCC_PATH):
        print(f"File not found: {SGCC_PATH}")
        return

    print("Loading SGCC dataset from:", SGCC_PATH)
    df = pd.read_csv(SGCC_PATH)

    # Separate normal (FLAG == 0) and abnormal/theft (FLAG == 1)
    normal_df = df[df['FLAG'] == 0]
    theft_df = df[df['FLAG'] == 1]

    print(f"Found {len(normal_df)} normal consumers and {len(theft_df)} theft/anomaly consumers.")

    date_cols = [c for c in df.columns if c not in ['CONS_NO', 'FLAG']]

    # 1. Extract a representative Normal Consumer daily series
    if len(normal_df) > 0:
        sample_normal = normal_df.iloc[0]
        normal_series = []
        for d in date_cols[:30]: # 30-day billing cycle
            val = float(sample_normal[d])
            # If values are in watt-hours or scaled, ensure realistic household kWh (e.g. 10 - 40 kWh/day)
            kwh = round(val / 100.0, 2) if val > 200 else round(val, 2)
            normal_series.append({'reading_date': d, 'daily_units': kwh})

        normal_out = pd.DataFrame(normal_series)
        normal_out.to_csv(os.path.join(DATA_DIR, "sgcc_normal_daily.csv"), index=False)
        print("Saved normal consumer daily series to data/sgcc_normal_daily.csv")

    # 2. Extract a representative Theft / Anomaly Consumer daily series
    if len(theft_df) > 0:
        sample_theft = theft_df.iloc[0]
        theft_series = []
        for d in date_cols[:30]:
            val = float(sample_theft[d])
            kwh = round(val / 100.0, 2) if val > 200 else round(val, 2)
            theft_series.append({'reading_date': d, 'daily_units': kwh})

        theft_out = pd.DataFrame(theft_series)
        theft_out.to_csv(os.path.join(DATA_DIR, "sgcc_theft_daily.csv"), index=False)
        print("Saved theft/anomaly consumer daily series to data/sgcc_theft_daily.csv")

if __name__ == "__main__":
    process_sgcc()

