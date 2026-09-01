"""Cohort Statistics and Baseline Calculator (T10).

Computes robust non-parametric statistical baselines (Median, P10, P90, IQR)
across civic category and state cohorts from the SQLite database.
Handles small cohorts via hierarchical fallback (Category-State -> Category -> Global).
Outputs precomputed baselines to ml/cohort_baselines.json.
"""

import os
import sys
import json
import numpy as np
import pandas as pd
from sqlalchemy import create_engine

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, PROJECT_ROOT)

from backend.app.database import DATABASE_URL

OUTPUT_JSON_PATH = os.path.join(PROJECT_ROOT, "ml", "cohort_baselines.json")
MIN_COHORT_SIZE = 10  # Minimum sample size for localized cohort statistics


def compute_cohort_stats():
    """Extracts all allocation records, computes statistical baselines, and saves JSON."""
    engine = create_engine(DATABASE_URL)
    df = pd.read_sql_table("projects", engine)

    print(f"Loaded {len(df)} allocation records from SQLite database.")

    # Calculate financial utilization rate (%)
    df["financial_utilization"] = np.where(
        df["sanctioned_cost"] > 0,
        (df["expenditure"] / df["sanctioned_cost"]) * 100.0,
        0.0
    )

    # 1. Global Baseline (Fallback tier 3)
    global_stats = {
        "count": int(len(df)),
        "expenditure_median": round(float(df["expenditure"].median()), 2),
        "expenditure_p90": round(float(df["expenditure"].quantile(0.90)), 2),
        "sanctioned_cost_median": round(float(df["sanctioned_cost"].median()), 2),
        "sanctioned_cost_p90": round(float(df["sanctioned_cost"].quantile(0.90)), 2),
        "utilization_median": round(float(df["financial_utilization"].median()), 2),
        "utilization_p10": round(float(df["financial_utilization"].quantile(0.10)), 2),
        "utilization_p90": round(float(df["financial_utilization"].quantile(0.90)), 2),
        "unspent_median": round(float(df["unspent_balance"].median()), 2),
        "unspent_p90": round(float(df["unspent_balance"].quantile(0.90)), 2),
    }

    # 2. Category-Level Baselines (Fallback tier 2)
    category_baselines = {}
    for cat_name, cat_df in df.groupby("category"):
        category_baselines[cat_name] = {
            "count": int(len(cat_df)),
            "expenditure_median": round(float(cat_df["expenditure"].median()), 2),
            "expenditure_p90": round(float(cat_df["expenditure"].quantile(0.90)), 2),
            "sanctioned_cost_median": round(float(cat_df["sanctioned_cost"].median()), 2),
            "sanctioned_cost_p90": round(float(cat_df["sanctioned_cost"].quantile(0.90)), 2),
            "utilization_median": round(float(cat_df["financial_utilization"].median()), 2),
            "utilization_p10": round(float(cat_df["financial_utilization"].quantile(0.10)), 2),
            "utilization_p90": round(float(cat_df["financial_utilization"].quantile(0.90)), 2),
            "unspent_median": round(float(cat_df["unspent_balance"].median()), 2),
            "unspent_p90": round(float(cat_df["unspent_balance"].quantile(0.90)), 2),
        }

    # 3. Category + State Baselines (Primary tier 1)
    cohort_baselines = {}
    for (cat_name, state_name), sub_df in df.groupby(["category", "state"]):
        key = f"{cat_name}::{state_name}"
        count = len(sub_df)

        if count >= MIN_COHORT_SIZE:
            cohort_baselines[key] = {
                "count": int(count),
                "is_fallback": False,
                "expenditure_median": round(float(sub_df["expenditure"].median()), 2),
                "expenditure_p90": round(float(sub_df["expenditure"].quantile(0.90)), 2),
                "sanctioned_cost_median": round(float(sub_df["sanctioned_cost"].median()), 2),
                "sanctioned_cost_p90": round(float(sub_df["sanctioned_cost"].quantile(0.90)), 2),
                "utilization_median": round(float(sub_df["financial_utilization"].median()), 2),
                "utilization_p10": round(float(sub_df["financial_utilization"].quantile(0.10)), 2),
                "utilization_p90": round(float(sub_df["financial_utilization"].quantile(0.90)), 2),
                "unspent_median": round(float(sub_df["unspent_balance"].median()), 2),
                "unspent_p90": round(float(sub_df["unspent_balance"].quantile(0.90)), 2),
            }
        else:
            # Small cohort: Use category-level baseline
            cat_stats = category_baselines[cat_name].copy()
            cat_stats["is_fallback"] = True
            cat_stats["original_count"] = int(count)
            cohort_baselines[key] = cat_stats

    payload = {
        "meta": {
            "version": "2.0.0",
            "total_records": len(df),
            "min_cohort_size": MIN_COHORT_SIZE,
            "generated_at": pd.Timestamp.now(tz="UTC").isoformat(),
            "description": "Empirical non-parametric baselines for MPLADS allocation risk engine"
        },
        "global": global_stats,
        "categories": category_baselines,
        "cohorts": cohort_baselines
    }

    os.makedirs(os.path.dirname(OUTPUT_JSON_PATH), exist_ok=True)
    with open(OUTPUT_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)

    print(f"Cohort baselines generated successfully: {OUTPUT_JSON_PATH}")
    print(f"- Total Category+State cohorts: {len(cohort_baselines)}")
    print(f"- Global median expenditure: Rs. {global_stats['expenditure_median']} Cr")
    print(f"- Global P90 expenditure: Rs. {global_stats['expenditure_p90']} Cr")
    print(f"- Global median utilization: {global_stats['utilization_median']}%")

    return payload


if __name__ == "__main__":
    compute_cohort_stats()
