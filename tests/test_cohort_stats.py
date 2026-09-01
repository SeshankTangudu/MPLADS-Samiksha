"""Automated verification tests for T10 Cohort Statistics Computation."""

import os
import json
import pytest
import pandas as pd
from sqlalchemy import create_engine

from backend.app.database import DATABASE_URL
from ml.cohort_stats import compute_cohort_stats, OUTPUT_JSON_PATH


@pytest.fixture(scope="module")
def cohort_data():
    if not os.path.exists(OUTPUT_JSON_PATH):
        payload = compute_cohort_stats()
    else:
        with open(OUTPUT_JSON_PATH, "r", encoding="utf-8") as f:
            payload = json.load(f)
    return payload


def test_cohort_json_exists(cohort_data):
    assert os.path.exists(OUTPUT_JSON_PATH)
    assert cohort_data["meta"]["total_records"] == 1675
    assert len(cohort_data["cohorts"]) > 0


def test_global_baselines(cohort_data):
    glob = cohort_data["global"]
    assert glob["count"] == 1675
    assert 10.0 <= glob["expenditure_median"] <= 25.0
    assert 15.0 <= glob["expenditure_p90"] <= 35.0
    assert 80.0 <= glob["utilization_median"] <= 100.0


def test_category_baselines_presence(cohort_data):
    cats = cohort_data["categories"]
    expected_categories = [
        "Infrastructure & Public Amenities",
        "Community Development",
        "Rural & Urban Development"
    ]
    for cat in expected_categories:
        assert cat in cats, f"Category '{cat}' missing from baselines"
        assert cats[cat]["count"] > 50
        assert cats[cat]["expenditure_median"] > 0


def test_spot_check_five_cohorts(cohort_data):
    engine = create_engine(DATABASE_URL)
    df = pd.read_sql_table("projects", engine)

    # Check 5 specific valid category+state combinations present in the dataset
    sample_cohorts = [
        ("Infrastructure & Public Amenities", "Uttar Pradesh"),
        ("Infrastructure & Public Amenities", "Maharashtra"),
        ("Rural & Urban Development", "Tamil Nadu"),
        ("Infrastructure & Public Amenities", "Bihar"),
        ("Rural & Urban Development", "West Bengal")
    ]

    for cat, state in sample_cohorts:
        key = f"{cat}::{state}"
        assert key in cohort_data["cohorts"], f"Cohort {key} missing from baselines"

        sub_df = df[(df["category"] == cat) & (df["state"] == state)]
        if len(sub_df) >= 10:
            expected_median = round(float(sub_df["expenditure"].median()), 2)
            actual_median = cohort_data["cohorts"][key]["expenditure_median"]
            assert actual_median == expected_median, f"Median mismatch for {key}: {actual_median} vs {expected_median}"
