"""Automated verification tests for T04 Data Pipeline."""

import os
import pandas as pd
import pytest

DATA_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "processed", "projects_clean.csv")
DQ_REPORT = os.path.join(os.path.dirname(__file__), "..", "docs", "data_quality_report.md")

def test_clean_data_exists():
    assert os.path.exists(DATA_FILE), "projects_clean.csv must exist"
    assert os.path.exists(DQ_REPORT), "data_quality_report.md must exist"

def test_clean_data_schema():
    df = pd.read_csv(DATA_FILE)
    required_cols = [
        "source_record_id", "source_dataset", "house", "lok_sabha_term",
        "mp_name", "state", "district", "constituency", "category",
        "description", "sanction_date", "sanctioned_cost", "expenditure",
        "entitlement", "released_amount", "unspent_balance", "status"
    ]
    for col in required_cols:
        assert col in df.columns, f"Required column {col} missing from projects_clean.csv"

def test_no_critical_nulls():
    df = pd.read_csv(DATA_FILE)
    assert len(df) >= 1500, f"Expected at least 1500 records, found {len(df)}"
    assert df["source_record_id"].isnull().sum() == 0
    assert df["source_record_id"].is_unique, "source_record_id must be unique"
    assert df["mp_name"].isnull().sum() == 0
    assert df["status"].isnull().sum() == 0

def test_financial_types():
    df = pd.read_csv(DATA_FILE)
    assert pd.api.types.is_numeric_dtype(df["sanctioned_cost"])
    assert pd.api.types.is_numeric_dtype(df["expenditure"])
    assert (df["sanctioned_cost"] >= 0).all()
    assert (df["expenditure"] >= 0).all()
