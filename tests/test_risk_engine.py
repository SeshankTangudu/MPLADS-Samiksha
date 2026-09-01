"""Automated verification tests for T11 Deterministic Risk Engine."""

import pytest
from ml.risk_engine import (
    load_baselines,
    evaluate_allocation,
    get_cohort_baseline,
    calculate_financial_score,
    calculate_timeline_score,
    calculate_data_quality_score
)


@pytest.fixture(scope="module")
def baselines():
    return load_baselines()


def test_cost_anomaly_trigger(baselines):
    # Record exceeding P90 with ratio >= 1.30
    record = {
        "source_record_id": "TEST_001",
        "category": "Infrastructure & Public Amenities",
        "state": "Uttar Pradesh",
        "expenditure": 32.0,  # P50=22.05, P90=24.89, ratio=1.45 >= 1.30
        "sanctioned_cost": 35.0,
        "unspent_balance": 3.0,
        "status": "In Progress",
        "lok_sabha_term": 17,
        "pending_reason": ""
    }
    result = evaluate_allocation(record, baselines)
    assert result["financial_score"] == 35.0
    financial_flags = [f for f in result["flags"] if f["flag_type"] == "FINANCIAL"]
    assert len(financial_flags) >= 1
    assert "High Reported Expenditure Outlier" in financial_flags[0]["title"]


def test_cost_below_median(baselines):
    # Record below P50
    record = {
        "source_record_id": "TEST_002",
        "category": "Infrastructure & Public Amenities",
        "state": "Uttar Pradesh",
        "expenditure": 15.0,  # P50=22.05
        "sanctioned_cost": 25.0,
        "unspent_balance": 10.0,
        "status": "In Progress",
        "lok_sabha_term": 17,
        "pending_reason": ""
    }
    result = evaluate_allocation(record, baselines)
    assert result["financial_score"] == 0.0
    financial_flags = [f for f in result["flags"] if f["flag_type"] == "FINANCIAL" and "Expenditure" in f["title"]]
    assert len(financial_flags) == 0


def test_fallback_cohort_lookup(baselines):
    # Non-existent localized state cohort should fallback to Category baseline
    baseline = get_cohort_baseline(baselines, "Infrastructure & Public Amenities", "NonExistentState")
    assert baseline["is_fallback"] is True
    assert baseline["expenditure_median"] > 0


def test_zero_spread_cohort(baselines):
    # Cohort where P90 == P50
    flat_baseline = {"expenditure_median": 20.0, "expenditure_p90": 20.0}
    record = {"expenditure": 25.0, "sanctioned_cost": 30.0}
    score, flags = calculate_financial_score(record, flat_baseline)
    assert score == 0.0


def test_zero_sanctioned_cost(baselines):
    record = {
        "source_record_id": "TEST_003",
        "category": "Infrastructure & Public Amenities",
        "state": "Uttar Pradesh",
        "expenditure": 0.0,
        "sanctioned_cost": 0.0,
        "status": "Allocated",
        "pending_reason": ""
    }
    result = evaluate_allocation(record, baselines)
    assert result["financial_score"] == 0.0
    dq_flags = [f for f in result["flags"] if "Zero Sanctioned" in f["title"]]
    assert len(dq_flags) == 1


def test_audit_pending_reason_flag(baselines):
    record = {
        "source_record_id": "TEST_004",
        "category": "Community Development",
        "state": "National / Multi-State",
        "expenditure": 10.0,
        "sanctioned_cost": 15.0,
        "status": "In Progress",
        "lok_sabha_term": 17,
        "pending_reason": "Audit Certificate Pending, Eligible MPR not Received."
    }
    result = evaluate_allocation(record, baselines)
    assert result["data_quality_score"] == 10.0  # 5 for Audit + 5 for MPR
    assert len(result["flags"]) >= 2


def test_deterministic_repeatability(baselines):
    record = {
        "source_record_id": "TEST_005",
        "category": "Infrastructure & Public Amenities",
        "state": "Maharashtra",
        "expenditure": 24.5,
        "sanctioned_cost": 25.0,
        "status": "In Progress",
        "lok_sabha_term": 16,
        "pending_reason": ""
    }
    r1 = evaluate_allocation(record, baselines)
    r2 = evaluate_allocation(record, baselines)
    assert r1 == r2


def test_score_bounds_and_tier_assignment(baselines):
    record_critical = {
        "category": "Infrastructure & Public Amenities",
        "state": "Delhi",
        "expenditure": 35.0,
        "sanctioned_cost": 35.0,
        "status": "In Progress",
        "lok_sabha_term": 15,
        "pending_reason": "Audit Certificate Pending, Eligible MPR not Received."
    }
    res = evaluate_allocation(record_critical, baselines)
    assert 0.0 <= res["total_score"] <= 100.0
    assert res["risk_level"] in ("Low", "Medium", "High", "Critical")
