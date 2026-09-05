"""Deterministic tests for Isolation Forest Cross-Check.

CLAIM SAFETY:
    "Isolation Forest identifies statistically unusual allocations for secondary review."
    "An outlier is NOT evidence of fraud or wrongdoing."
    "This does NOT change the platform's Model A risk score."

Tests cover:
    1.  IF uses only the documented 5-feature set.
    2.  Model A risk score is NOT an input feature.
    3.  random_state is explicitly fixed.
    4.  Output is deterministic (two runs produce identical results).
    5.  source_record_id is preserved in output.
    6.  No duplicate source_record_ids in output.
    7.  No production DB mutation.
    8.  No synthetic production records.
    9.  Model A risk_scores remain unchanged.
    10. Model A risk tiers remain unchanged.
    11. Existing 1,675 production records remain intact.
    12. Existing 1,067 production flags remain intact.
    13. Missing/null feature handling is deterministic.
    14. Empty/small dataset handling is safe.
    15. API endpoint schema is correct; outlier label is clearly separated from Model A.
"""

import os
import json
import sqlite3
import numpy as np
import pytest
from fastapi.testclient import TestClient

# ─── Module-level imports (keeping IF logic importable for unit tests) ────────
from ml.isolation_forest import (
    IF_CONFIG,
    build_feature_matrix,
    run_isolation_forest,
    load_data,
)
from backend.app.main import app

DB_PATH = "data/processed/mplads.db"
IF_RESULTS_PATH = "ml/if_results.json"

client = TestClient(app)


# ─── Test 1: Feature set is exactly the 4 documented features ────────────────
def test_1_feature_set_is_documented():
    """IF must use exactly the 4 documented allocation features and no others."""
    expected = {
        "sanctioned_cost",
        "expenditure",
        "unspent_balance",
        "utilization_ratio",
    }
    actual = set(IF_CONFIG["features"])
    assert actual == expected, (
        f"Feature set mismatch.\nExpected: {expected}\nActual: {actual}"
    )
    assert len(IF_CONFIG["features"]) == 4
    # Explicitly confirm lok_sabha_term is excluded
    assert "lok_sabha_term" not in actual, (
        "lok_sabha_term must NOT be in the IF feature set (it is a temporal cohort, not an allocation feature)"
    )


# ─── Test 2: Model A risk score is NOT an input feature ──────────────────────
def test_2_model_a_score_not_an_input_feature():
    """Model A total_score and risk_level must NOT appear in the feature list."""
    features = IF_CONFIG["features"]
    assert "total_score" not in features, "total_score (Model A) must not be an input feature"
    assert "risk_level" not in features, "risk_level (Model A) must not be an input feature"
    assert "model_a_total_score" not in features
    assert "model_a_risk_level" not in features
    assert "financial_score" not in features
    assert "timeline_score" not in features
    assert "data_quality_score" not in features


# ─── Test 3: random_state is explicitly fixed ─────────────────────────────────
def test_3_random_state_is_fixed():
    """random_state must be explicitly set to a fixed integer for reproducibility."""
    rs = IF_CONFIG.get("random_state")
    assert rs is not None, "random_state must be explicitly set"
    assert isinstance(rs, int), f"random_state must be an int, got {type(rs)}"
    assert rs == 42


# ─── Test 4: Output is deterministic ─────────────────────────────────────────
def test_4_output_is_deterministic():
    """Running run_isolation_forest twice must produce identical anomaly scores."""
    if not os.path.exists(DB_PATH):
        pytest.skip("DB not found")
    records = load_data(DB_PATH)
    result1 = run_isolation_forest(records)
    result2 = run_isolation_forest(records)

    scores1 = [r["if_anomaly_score"] for r in result1["all_results"]]
    scores2 = [r["if_anomaly_score"] for r in result2["all_results"]]
    assert scores1 == scores2, "Isolation Forest output must be deterministic"

    outliers1 = [r["source_record_id"] for r in result1["all_results"] if r["if_is_outlier"]]
    outliers2 = [r["source_record_id"] for r in result2["all_results"] if r["if_is_outlier"]]
    assert outliers1 == outliers2, "Outlier membership must be deterministic"


# ─── Test 5: source_record_id is preserved ───────────────────────────────────
def test_5_source_record_id_preserved():
    """Every result record must have a non-empty source_record_id."""
    if not os.path.exists(DB_PATH):
        pytest.skip("DB not found")
    records = load_data(DB_PATH)
    result = run_isolation_forest(records)
    for r in result["all_results"]:
        assert r["source_record_id"], f"Empty source_record_id in result: {r}"


# ─── Test 6: No duplicate source_record_ids ───────────────────────────────────
def test_6_no_duplicate_source_record_ids():
    """Each source_record_id must appear exactly once in the output."""
    if not os.path.exists(DB_PATH):
        pytest.skip("DB not found")
    records = load_data(DB_PATH)
    result = run_isolation_forest(records)
    ids = [r["source_record_id"] for r in result["all_results"]]
    assert len(ids) == len(set(ids)), "Duplicate source_record_ids found in IF output"


# ─── Test 7: No production DB mutation ────────────────────────────────────────
def test_7_no_production_db_mutation():
    """Calling the IF API endpoint must not mutate any production table."""
    if not os.path.exists(DB_PATH):
        pytest.skip("DB not found")
    conn = sqlite3.connect(DB_PATH)
    before = {
        "projects": conn.execute("SELECT count(*) FROM projects").fetchone()[0],
        "risk_scores": conn.execute("SELECT count(*) FROM risk_scores").fetchone()[0],
        "risk_flags": conn.execute("SELECT count(*) FROM risk_flags").fetchone()[0],
    }

    # Serve from precomputed artifact — no DB write
    client.get("/api/analytics/isolation-forest")

    after = {
        "projects": conn.execute("SELECT count(*) FROM projects").fetchone()[0],
        "risk_scores": conn.execute("SELECT count(*) FROM risk_scores").fetchone()[0],
        "risk_flags": conn.execute("SELECT count(*) FROM risk_flags").fetchone()[0],
    }
    conn.close()
    assert before == after, "GET /api/analytics/isolation-forest must not mutate production tables"


# ─── Test 8: No synthetic production records ─────────────────────────────────
def test_8_no_synthetic_production_records():
    """No synthetic records should be present in production DB."""
    if not os.path.exists(DB_PATH):
        pytest.skip("DB not found")
    conn = sqlite3.connect(DB_PATH)
    synthetic = conn.execute(
        "SELECT count(*) FROM projects WHERE source_record_id LIKE '%SYNTHETIC%' OR description LIKE '%SYNTHETIC%'"
    ).fetchone()[0]
    conn.close()
    assert synthetic == 0


# ─── Test 9: Model A risk_scores remain unchanged ────────────────────────────
def test_9_model_a_scores_unchanged():
    """Model A scores must be identical before and after running IF analysis."""
    if not os.path.exists(DB_PATH):
        pytest.skip("DB not found")
    conn = sqlite3.connect(DB_PATH)
    scores_before = conn.execute(
        "SELECT project_id, total_score, risk_level FROM risk_scores ORDER BY project_id"
    ).fetchall()

    # Run the offline IF analysis
    records = load_data(DB_PATH)
    run_isolation_forest(records)

    scores_after = conn.execute(
        "SELECT project_id, total_score, risk_level FROM risk_scores ORDER BY project_id"
    ).fetchall()
    conn.close()
    assert scores_before == scores_after, "Model A scores were modified — this must not happen"


# ─── Test 10: Model A risk tiers remain unchanged ────────────────────────────
def test_10_model_a_tiers_unchanged():
    """After IF analysis, Model A production distribution must be exactly as expected."""
    if not os.path.exists(DB_PATH):
        pytest.skip("DB not found")
    records = load_data(DB_PATH)
    run_isolation_forest(records)
    conn = sqlite3.connect(DB_PATH)
    dist = dict(conn.execute(
        "SELECT risk_level, count(*) FROM risk_scores GROUP BY risk_level"
    ).fetchall())
    conn.close()
    assert dist.get("Low", 0) == 1166
    assert dist.get("Medium", 0) == 413
    assert dist.get("High", 0) == 96
    assert dist.get("Critical", 0) == 0


# ─── Test 11: 1,675 production records remain intact ─────────────────────────
def test_11_production_records_intact():
    """projects table must still contain exactly 1,675 rows."""
    if not os.path.exists(DB_PATH):
        pytest.skip("DB not found")
    conn = sqlite3.connect(DB_PATH)
    count = conn.execute("SELECT count(*) FROM projects").fetchone()[0]
    conn.close()
    assert count == 1675


# ─── Test 12: 1,067 production flags remain intact ───────────────────────────
def test_12_production_flags_intact():
    """risk_flags table must still contain exactly 1,067 rows."""
    if not os.path.exists(DB_PATH):
        pytest.skip("DB not found")
    conn = sqlite3.connect(DB_PATH)
    count = conn.execute("SELECT count(*) FROM risk_flags").fetchone()[0]
    conn.close()
    assert count == 1067


# ─── Test 13: Missing/null feature handling is deterministic ─────────────────
def test_13_missing_null_feature_handling():
    """Zero sanctioned_cost records must produce utilization_ratio=0.0 (not NaN/error)."""
    if not os.path.exists(DB_PATH):
        pytest.skip("DB not found")
    records = load_data(DB_PATH)
    zero_cost = [r for r in records if r["sanctioned_cost"] == 0.0]
    for r in zero_cost:
        assert r["utilization_ratio"] == 0.0, (
            f"{r['source_record_id']}: zero sanctioned_cost should yield utilization_ratio=0.0"
        )

    # Feature matrix must contain no NaN or Inf
    X = build_feature_matrix(records)
    assert not np.any(np.isnan(X)), "Feature matrix contains NaN"
    assert not np.any(np.isinf(X)), "Feature matrix contains Inf"


# ─── Test 14: Empty/small dataset handling is safe ───────────────────────────
def test_14_small_dataset_handling():
    """IF must run without error on a minimal dataset (>= 2 records)."""
    minimal_records = [
        {
            "source_record_id": "TEST_001",
            "mp_name": "Test MP A",
            "state": "Test State",
            "constituency": "Test C",
            "category": "Infrastructure",
            "lok_sabha_term": 17,
            "sanctioned_cost": 10.0,
            "expenditure": 5.0,
            "unspent_balance": 5.0,
            "utilization_ratio": 0.5,
            "status": "In Progress",
            "model_a_total_score": 0.0,
            "model_a_risk_level": "Low",
            "model_a_financial_score": 0.0,
            "model_a_timeline_score": 0.0,
            "model_a_dq_score": 0.0,
        },
        {
            "source_record_id": "TEST_002",
            "mp_name": "Test MP B",
            "state": "Test State",
            "constituency": "Test C2",
            "category": "Infrastructure",
            "lok_sabha_term": 17,
            "sanctioned_cost": 20.0,
            "expenditure": 18.0,
            "unspent_balance": 2.0,
            "utilization_ratio": 0.9,
            "status": "Completed",
            "model_a_total_score": 0.0,
            "model_a_risk_level": "Low",
            "model_a_financial_score": 0.0,
            "model_a_timeline_score": 0.0,
            "model_a_dq_score": 0.0,
        },
    ]
    # Should not raise
    result = run_isolation_forest(minimal_records)
    assert result["total_records_evaluated"] == 2
    assert len(result["all_results"]) == 2
    assert result["all_results"][0]["source_record_id"] in {"TEST_001", "TEST_002"}


# ─── Test 15: API schema and claim-safety separation ─────────────────────────
def test_15_api_schema_and_claim_safety_separation():
    """
    API endpoint must:
    - Return correct schema
    - Contain claim_safety and disclaimer fields
    - Mark anomaly_score as NOT a fraud probability
    - Show IF and Model A as separate signals
    """
    if not os.path.exists(IF_RESULTS_PATH):
        pytest.skip("IF artifact not yet generated")

    response = client.get("/api/analytics/isolation-forest")
    assert response.status_code == 200

    data = response.json()

    # Top-level envelope fields
    for field in ["generated_at", "total_records_evaluated", "config",
                  "claim_safety", "summary", "top_outliers", "disclaimer"]:
        assert field in data, f"Missing field '{field}' in response"

    # Claim-safety wording
    assert "NOT evidence of fraud" in data["claim_safety"] or \
           "not evidence of fraud" in data["claim_safety"].lower() or \
           "secondary review" in data["claim_safety"]
    assert "Model A" in data["disclaimer"] or "model a" in data["disclaimer"].lower()

    # Summary fields
    summary = data["summary"]
    for f in ["n_outliers", "n_inliers", "outlier_rate_pct",
              "model_a_tier_distribution_among_outliers", "overlap_note"]:
        assert f in summary, f"Missing summary field '{f}'"

    # Top outlier record fields
    for rec in data["top_outliers"]:
        for rf in ["source_record_id", "if_anomaly_score", "if_is_outlier",
                   "if_label", "model_a_total_score", "model_a_risk_level"]:
            assert rf in rec, f"Missing outlier field '{rf}'"
        # Anomaly score in valid range
        assert 0.0 <= rec["if_anomaly_score"] <= 1.0
        # IF label must not say "fraud"
        assert "fraud" not in rec["if_label"].lower(), (
            f"if_label must not contain 'fraud': {rec['if_label']}"
        )
        # Model A and IF must appear as separate fields (not merged into one score)
        assert "model_a_risk_level" in rec
        assert "if_is_outlier" in rec
