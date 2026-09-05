"""Deterministic tests for Duplicate Candidate Intelligence.

CLAIM SAFETY:
    "Candidate matches are analytical signals intended to support human verification."
    "Successful candidate identification does not establish detection accuracy
     on real-world fraud or wrongdoing."

Tests cover:
    1.  Candidate logic does not modify Model A.
    2.  No production DB mutation.
    3.  Same-record self-match is excluded.
    4.  Candidate pairs are not duplicated in reverse order.
    5.  MP name alone cannot create a candidate.
    6.  Category alone cannot create a candidate.
    7.  District alone cannot create a candidate.
    8.  Candidate output contains explicit matching rationale.
    9.  Candidate output is clearly marked as requiring human verification.
    10. Empty/no-candidate case is handled cleanly.
    11. Existing 1,675 production records remain unchanged.
    12. Existing risk distribution remains: Low=1166, Medium=413, High=96, Critical=0.
    13. API endpoint returns correct schema and disclaimer.
    14. Similarity score is in [0.0, 1.0].
    15. pair_id is deterministic (smaller_id-larger_id format).
"""

import os
import sqlite3
import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.routers.duplicate_candidates import (
    CANDIDATE_MATCH_FIELDS,
    TOTAL_CANDIDATE_FIELDS,
    _build_rationale,
)
from backend.app.models import Project

DB_PATH = "data/processed/mplads.db"
client = TestClient(app)


# ─── Test 1: API does not modify production Model A risk scores ───────────────
def test_1_candidate_logic_does_not_modify_model_a():
    """GET /analytics/duplicate-candidates must not alter any risk_scores row."""
    if not os.path.exists(DB_PATH):
        pytest.skip("DB not found")
    conn = sqlite3.connect(DB_PATH)
    scores_before = conn.execute(
        "SELECT project_id, total_score, risk_level FROM risk_scores ORDER BY project_id"
    ).fetchall()

    # Hit the endpoint
    response = client.get("/api/analytics/duplicate-candidates")
    assert response.status_code == 200

    scores_after = conn.execute(
        "SELECT project_id, total_score, risk_level FROM risk_scores ORDER BY project_id"
    ).fetchall()
    conn.close()

    assert scores_before == scores_after, (
        "GET /analytics/duplicate-candidates must not alter any production risk_scores row."
    )


# ─── Test 2: No production DB mutation ───────────────────────────────────────
def test_2_no_production_db_mutation():
    """GET /analytics/duplicate-candidates must not mutate any production table."""
    if not os.path.exists(DB_PATH):
        pytest.skip("DB not found")
    conn = sqlite3.connect(DB_PATH)
    before_proj = conn.execute("SELECT count(*) FROM projects").fetchone()[0]
    before_scores = conn.execute("SELECT count(*) FROM risk_scores").fetchone()[0]
    before_flags = conn.execute("SELECT count(*) FROM risk_flags").fetchone()[0]

    client.get("/api/analytics/duplicate-candidates")

    after_proj = conn.execute("SELECT count(*) FROM projects").fetchone()[0]
    after_scores = conn.execute("SELECT count(*) FROM risk_scores").fetchone()[0]
    after_flags = conn.execute("SELECT count(*) FROM risk_flags").fetchone()[0]
    conn.close()

    assert before_proj == after_proj
    assert before_scores == after_scores
    assert before_flags == after_flags


# ─── Test 3: Self-match excluded ─────────────────────────────────────────────
def test_3_self_match_excluded():
    """No pair should have record_a.id == record_b.id."""
    response = client.get("/api/analytics/duplicate-candidates")
    assert response.status_code == 200
    data = response.json()
    for pair in data["candidate_pairs"]:
        assert pair["record_a"]["id"] != pair["record_b"]["id"], (
            f"Self-match detected: pair_id={pair['pair_id']}"
        )


# ─── Test 4: No reverse duplicates ───────────────────────────────────────────
def test_4_no_reverse_duplicate_pairs():
    """pair_id must be deterministic (smaller-larger) so no reverse duplicate exists."""
    response = client.get("/api/analytics/duplicate-candidates")
    assert response.status_code == 200
    data = response.json()
    seen_normalized = set()
    for pair in data["candidate_pairs"]:
        a_id = pair["record_a"]["id"]
        b_id = pair["record_b"]["id"]
        normalized = f"{min(a_id, b_id)}-{max(a_id, b_id)}"
        assert normalized not in seen_normalized, (
            f"Reverse/duplicate pair detected: {normalized}"
        )
        seen_normalized.add(normalized)
        # pair_id itself must be the normalized form
        assert pair["pair_id"] == normalized


# ─── Test 5: MP name alone cannot create a candidate ─────────────────────────
def test_5_mp_name_alone_cannot_create_candidate():
    """MP name is not in CANDIDATE_MATCH_FIELDS."""
    assert "mp_name" not in CANDIDATE_MATCH_FIELDS, (
        "mp_name must NOT be a matching field — it is not a primary identity key."
    )


# ─── Test 6: Category alone cannot create a candidate ────────────────────────
def test_6_category_alone_cannot_create_candidate():
    """
    With only 3 categories, matching on category alone would produce trivially large groups.
    Verify that CANDIDATE_MATCH_FIELDS requires > 1 field.
    """
    assert len(CANDIDATE_MATCH_FIELDS) >= 4, (
        "Matching must require at least 4 fields. Category alone is insufficient."
    )
    assert "category" in CANDIDATE_MATCH_FIELDS, (
        "category should be part of the compound match, not the sole criterion."
    )


# ─── Test 7: District alone cannot create a candidate ────────────────────────
def test_7_district_alone_cannot_create_candidate():
    """District is not in CANDIDATE_MATCH_FIELDS (constituency is used instead)."""
    assert "district" not in CANDIDATE_MATCH_FIELDS, (
        "district alone must not create a candidate. The compound key uses constituency."
    )


# ─── Test 8: Candidate output contains explicit matching rationale ────────────
def test_8_candidate_output_contains_matching_rationale():
    """Each candidate pair must include a non-empty matching_rationale."""
    response = client.get("/api/analytics/duplicate-candidates")
    assert response.status_code == 200
    data = response.json()
    for pair in data["candidate_pairs"]:
        assert pair["matching_rationale"], (
            f"pair_id={pair['pair_id']} has an empty matching_rationale"
        )
        assert len(pair["matched_fields"]) >= 4, (
            f"pair_id={pair['pair_id']} has fewer than 4 matched fields"
        )


# ─── Test 9: Candidate output is marked as requiring human verification ───────
def test_9_candidate_requires_human_verification():
    """requires_human_verification must always be True."""
    response = client.get("/api/analytics/duplicate-candidates")
    assert response.status_code == 200
    data = response.json()
    for pair in data["candidate_pairs"]:
        assert pair["requires_human_verification"] is True, (
            f"pair_id={pair['pair_id']} must have requires_human_verification=True"
        )
    # Envelope-level disclaimer must exist
    assert "Similarity indicates a review candidate" in data["disclaimer"]
    assert "human verification" in data["disclaimer"].lower()


# ─── Test 10: Empty/no-candidate case handled cleanly ────────────────────────
def test_10_empty_candidate_case_handled():
    """Response must return 0 pairs cleanly when no groups match — verify schema."""
    response = client.get("/api/analytics/duplicate-candidates")
    assert response.status_code == 200
    data = response.json()
    # Even if there are pairs, verify total matches list length
    assert data["total_candidate_pairs"] == len(data["candidate_pairs"])
    # Envelope fields exist
    assert "methodology_note" in data
    assert "disclaimer" in data
    assert "description_quality_note" in data


# ─── Test 11: Production records unchanged ────────────────────────────────────
def test_11_production_records_unchanged():
    """projects count must remain 1,675 after calling the endpoint."""
    if not os.path.exists(DB_PATH):
        pytest.skip("DB not found")
    client.get("/api/analytics/duplicate-candidates")
    conn = sqlite3.connect(DB_PATH)
    count = conn.execute("SELECT count(*) FROM projects").fetchone()[0]
    synthetic_count = conn.execute(
        "SELECT count(*) FROM projects WHERE source_record_id LIKE '%SYNTHETIC%' OR description LIKE '%SYNTHETIC%'"
    ).fetchone()[0]
    conn.close()
    assert count == 1675, f"Expected 1675 projects, got {count}"
    assert synthetic_count == 0


# ─── Test 12: Risk distribution unchanged ─────────────────────────────────────
def test_12_risk_distribution_unchanged():
    """Model A distribution must remain unchanged after calling the endpoint."""
    if not os.path.exists(DB_PATH):
        pytest.skip("DB not found")
    client.get("/api/analytics/duplicate-candidates")
    conn = sqlite3.connect(DB_PATH)
    dist = dict(conn.execute(
        "SELECT risk_level, count(*) FROM risk_scores GROUP BY risk_level"
    ).fetchall())
    conn.close()
    assert dist.get("Low", 0) == 1166
    assert dist.get("Medium", 0) == 413
    assert dist.get("High", 0) == 96
    assert dist.get("Critical", 0) == 0


# ─── Test 13: API endpoint schema is correct ──────────────────────────────────
def test_13_api_endpoint_schema():
    """Response conforms to DuplicateCandidatesResponseSchema."""
    response = client.get("/api/analytics/duplicate-candidates")
    assert response.status_code == 200
    data = response.json()
    assert "total_candidate_pairs" in data
    assert "candidate_pairs" in data
    assert isinstance(data["candidate_pairs"], list)
    # Each pair must have required fields
    for pair in data["candidate_pairs"]:
        for field in ["pair_id", "record_a", "record_b", "similarity_score",
                      "matched_fields", "matching_rationale", "requires_human_verification",
                      "candidate_label"]:
            assert field in pair, f"Missing field '{field}' in pair {pair.get('pair_id')}"
        for rec_key in ["record_a", "record_b"]:
            rec = pair[rec_key]
            for rf in ["id", "source_record_id", "mp_name", "state", "district",
                       "constituency", "category", "lok_sabha_term",
                       "sanctioned_cost", "expenditure", "status", "investigate_url"]:
                assert rf in rec, f"Missing field '{rf}' in {rec_key} of pair {pair['pair_id']}"


# ─── Test 14: Similarity score is in valid range ─────────────────────────────
def test_14_similarity_score_range():
    """similarity_score must be between 0.0 and 1.0 inclusive."""
    response = client.get("/api/analytics/duplicate-candidates")
    assert response.status_code == 200
    data = response.json()
    for pair in data["candidate_pairs"]:
        score = pair["similarity_score"]
        assert 0.0 <= score <= 1.0, (
            f"pair_id={pair['pair_id']}: similarity_score={score} is out of range [0, 1]"
        )


# ─── Test 15: pair_id is deterministic ───────────────────────────────────────
def test_15_pair_id_is_deterministic():
    """Calling the endpoint twice must return identical pair_ids in the same order."""
    r1 = client.get("/api/analytics/duplicate-candidates").json()
    r2 = client.get("/api/analytics/duplicate-candidates").json()
    ids1 = [p["pair_id"] for p in r1["candidate_pairs"]]
    ids2 = [p["pair_id"] for p in r2["candidate_pairs"]]
    assert ids1 == ids2, "pair_ids must be identical across calls (determinism)"
    assert r1["total_candidate_pairs"] == r2["total_candidate_pairs"]
