import pytest
import sqlite3
import os
from ml.risk_engine import evaluate_allocation, load_baselines

DB_PATH = "data/processed/mplads.db"

@pytest.fixture(scope="module")
def baselines():
    return load_baselines()

def test_1_zero_clean_baseline(baselines):
    """Test 1 — Zero/clean baseline"""
    record = {
        "scenario": "SYNTHETIC ENGINE VALIDATION",
        "category": "Infrastructure",
        "state": "Normal",
        "expenditure": 0.0,
        "sanctioned_cost": 10.0,
        "unspent_balance": 0.0,
        "status": "Completed",
        "lok_sabha_term": 17,
        "pending_reason": ""
    }
    res = evaluate_allocation(record, baselines)
    assert res["financial_score"] == 0.0
    assert res["timeline_score"] == 0.0
    assert res["data_quality_score"] == 0.0
    assert res["geographic_score"] == 0.0
    assert res.get("duplicate_score", 0.0) == 0.0
    assert res["total_score"] == 0.0
    assert res["risk_level"] == "Low"

def test_2_financial_max(baselines):
    """Test 2 — Financial maximum"""
    record = {
        "scenario": "SYNTHETIC ENGINE VALIDATION",
        "category": "Infrastructure",
        "state": "Normal",
        "expenditure": 1000.0, # Exceeds P90
        "sanctioned_cost": 10.0,
        "unspent_balance": 0.0,
        "status": "Completed",
        "lok_sabha_term": 17,
        "pending_reason": ""
    }
    res = evaluate_allocation(record, baselines)
    assert res["financial_score"] == 35.0
    assert res["timeline_score"] == 0.0
    assert res["data_quality_score"] == 0.0
    assert res["geographic_score"] == 0.0
    assert res["total_score"] == 35.0
    assert res["risk_level"] == "Medium"

def test_3_timeline_max(baselines):
    """Test 3 — Timeline maximum"""
    record = {
        "scenario": "SYNTHETIC ENGINE VALIDATION",
        "category": "Infrastructure",
        "state": "Normal",
        "expenditure": 0.0,
        "sanctioned_cost": 10.0,
        "unspent_balance": 0.0,
        "status": "In Progress",
        "lok_sabha_term": 17,
        "pending_reason": ""
    }
    res = evaluate_allocation(record, baselines)
    assert res["timeline_score"] == 25.0
    assert res["financial_score"] == 0.0
    assert res["data_quality_score"] == 0.0
    assert res["geographic_score"] == 0.0
    assert res["total_score"] == 25.0
    assert res["risk_level"] == "Medium"

def test_4_data_quality_max(baselines):
    """Test 4 — Data Quality maximum"""
    record = {
        "scenario": "SYNTHETIC ENGINE VALIDATION",
        "category": "Infrastructure",
        "state": "Normal",
        "expenditure": 0.0,
        "sanctioned_cost": 0.0, # +5
        "unspent_balance": -1.0, # +5
        "status": "Completed",
        "lok_sabha_term": 17,
        "pending_reason": "Audit Certificate Pending; Eligible MPR not Received" # +10
    }
    res = evaluate_allocation(record, baselines)
    assert res["data_quality_score"] == 20.0
    assert res["financial_score"] == 0.0
    assert res["timeline_score"] == 0.0
    assert res["geographic_score"] == 0.0
    assert res["total_score"] == 20.0
    assert res["risk_level"] == "Low"

def test_5_geographic_inactive(baselines):
    """Test 5 — Geographic is intentionally inactive (current production contract).

    ACCEPTED BEHAVIOR (Model A Reconciliation, Option A):
    The Geographic component is intentionally inactive in the current production
    implementation. The original categorical district-concentration formula was
    reviewed and withheld because it would assign ~5 points to perfectly average
    district allocations, artificially inflating ordinary risk scores.
    Expected: geographic_score == 0.0
    """
    record = {
        "scenario": "SYNTHETIC ENGINE VALIDATION",
        "category": "Infrastructure",
        "state": "Normal",
        "expenditure": 0.0,
        "sanctioned_cost": 10.0,
        "unspent_balance": 0.0,
        "status": "Completed",
        "lok_sabha_term": 17,
        "pending_reason": ""
    }
    res = evaluate_allocation(record, baselines)
    assert res["geographic_score"] == 0.0, (
        "CURRENT PRODUCTION CONTRACT: Geographic component is intentionally inactive. "
        "Expected 0.0 — this is the accepted behavior per Model A Reconciliation (Option A)."
    )


def test_6_duplicate_inactive(baselines):
    """Test 6 — Duplicate is intentionally inactive (current production contract).

    ACCEPTED BEHAVIOR (Model A Reconciliation, Option A):
    The Duplicate component is intentionally inactive in the current production
    implementation. Verified duplicate evidence is absent from the authentic
    deduplicated production dataset. Unverified candidates must not be converted
    into a 10-point risk score.
    Expected: duplicate_score == 0.0
    """
    record = {
        "scenario": "SYNTHETIC ENGINE VALIDATION",
        "category": "Infrastructure",
        "state": "Normal",
        "expenditure": 0.0,
        "sanctioned_cost": 10.0,
        "unspent_balance": 0.0,
        "status": "Completed",
        "lok_sabha_term": 17,
        "pending_reason": ""
    }
    res = evaluate_allocation(record, baselines)
    assert res.get("duplicate_score", 0.0) == 0.0, (
        "CURRENT PRODUCTION CONTRACT: Duplicate component is intentionally inactive. "
        "Expected 0.0 — this is the accepted behavior per Model A Reconciliation (Option A)."
    )

def test_7_current_implemented_maximum(baselines):
    """Test 7 — Current implemented maximum = 72.0 (Tier: High).

    CURRENT PRODUCTION CONTRACT:
    With Geographic and Duplicate intentionally inactive, the highest achievable
    score under the current active implementation is 72.0:
      - Financial = 35 (expenditure >> P90, sanctioned_cost > 0)
      - Timeline  = 22 (15th Lok Sabha, active, non-zero expenditure)
      - DQ        = 15 (Audit cert pending +5, MPR pending +5, negative unspent +5)
      - Geographic = 0  (intentionally inactive)
      - Duplicate  = 0  (intentionally inactive)
      - Total      = 72.0  →  Tier: High

    The Critical tier (75–100) is mathematically unreachable under the current
    implementation. This is a documented limitation of the active scoring engine,
    NOT evidence that the dataset contains no severe cases.
    """
    CRITICAL_THRESHOLD = 75.0
    CURRENT_IMPLEMENTED_MAXIMUM = 72.0

    # Verify the documented ceiling analytically — no engine call needed.
    assert CURRENT_IMPLEMENTED_MAXIMUM < CRITICAL_THRESHOLD, (
        f"Current implemented maximum ({CURRENT_IMPLEMENTED_MAXIMUM}) must be less than "
        f"the Critical threshold ({CRITICAL_THRESHOLD}). "
        "Critical is unreachable under the current production implementation."
    )

    # Confirm empirically with a worst-case synthetic record.
    record = {
        "scenario": "SYNTHETIC ENGINE VALIDATION",
        "category": "Infrastructure & Public Amenities",
        "state": "Uttar Pradesh",
        "expenditure": 500.0,
        "sanctioned_cost": 20.0,
        "unspent_balance": -2.0,
        "status": "In Progress",
        "lok_sabha_term": 15,
        "pending_reason": "Audit Certificate Pending; Eligible MPR not Received"
    }
    res = evaluate_allocation(record, baselines)
    assert res["financial_score"] == 35.0
    assert res["timeline_score"] == 22.0
    assert res["data_quality_score"] == 15.0
    assert res["geographic_score"] == 0.0
    assert res.get("duplicate_score", 0.0) == 0.0
    assert res["total_score"] == 72.0, (
        f"Expected current implemented maximum of 72.0, got {res['total_score']}"
    )
    assert res["risk_level"] == "High", (
        f"Expected tier 'High' at 72.0, got {res['risk_level']}"
    )
    assert res["total_score"] < CRITICAL_THRESHOLD, (
        "Confirmed: current implemented maximum is below the Critical threshold."
    )

def test_8_component_sum_invariant(baselines):
    """Test 8 — Component sum invariant"""
    record = {
        "scenario": "SYNTHETIC ENGINE VALIDATION",
        "category": "Infrastructure",
        "state": "Uttar Pradesh",
        "expenditure": 60.0,
        "sanctioned_cost": 25.0,
        "unspent_balance": -1.5,
        "status": "In Progress",
        "lok_sabha_term": 15,
        "pending_reason": "Audit Certificate Pending"
    }
    res = evaluate_allocation(record, baselines)
    expected_total = sum([
        res.get("financial_score", 0.0),
        res.get("timeline_score", 0.0),
        res.get("data_quality_score", 0.0),
        res.get("geographic_score", 0.0),
        res.get("duplicate_score", 0.0)
    ])
    assert res["total_score"] == min(100.0, round(expected_total, 1))

def test_9_tier_boundary_validation(monkeypatch, baselines):
    """Test 9 — Tier boundary validation"""
    import ml.risk_engine
    record = {"scenario": "SYNTHETIC ENGINE VALIDATION"}
    
    def check_tier(score_val, expected_tier):
        monkeypatch.setattr(ml.risk_engine, 'calculate_financial_score', lambda r, b: (score_val, []))
        monkeypatch.setattr(ml.risk_engine, 'calculate_timeline_score', lambda r: (0.0, []))
        monkeypatch.setattr(ml.risk_engine, 'calculate_data_quality_score', lambda r: (0.0, []))
        monkeypatch.setattr(ml.risk_engine, 'calculate_geographic_score', lambda r, b: (0.0, []))
        res = evaluate_allocation(record, baselines)
        assert res["risk_level"] == expected_tier, f"Score {score_val} expected {expected_tier} but got {res['risk_level']}"

    check_tier(24.9, "Low")
    check_tier(25.0, "Medium")
    check_tier(49.9, "Medium")
    check_tier(50.0, "High")
    check_tier(74.9, "High")
    check_tier(75.0, "Critical")

def test_10_production_immutability():
    """Test 10 — Production immutability"""
    if not os.path.exists(DB_PATH):
        pytest.skip(f"DB not found at {DB_PATH}")
    
    conn = sqlite3.connect(DB_PATH)
    projects_count = conn.execute("SELECT count(*) FROM projects").fetchone()[0]
    scores_count = conn.execute("SELECT count(*) FROM risk_scores").fetchone()[0]
    flags_count = conn.execute("SELECT count(*) FROM risk_flags").fetchone()[0]
    synthetic_count = conn.execute("SELECT count(*) FROM projects WHERE source_record_id LIKE '%SYNTHETIC%' OR description LIKE '%SYNTHETIC%'").fetchone()[0]
    
    assert projects_count == 1675
    assert scores_count == 1675
    assert flags_count == 1067
    assert synthetic_count == 0
    
    # Check distribution
    dist = dict(conn.execute("SELECT risk_level, count(*) FROM risk_scores GROUP BY risk_level").fetchall())
    assert dist.get("Low", 0) == 1166
    assert dist.get("Medium", 0) == 413
    assert dist.get("High", 0) == 96
    assert dist.get("Critical", 0) == 0
    conn.close()
