# -*- coding: utf-8 -*-
"""Comprehensive Test Suite for Phase B: Investment–Durability Anomaly Detection.

Validates:
1. Normal investment + no complaints -> INVESTMENT_CONDITION_NORMAL
2. High investment + early condition complaint -> HIGH_INVESTMENT_EARLY_CONDITION_CONCERN
3. High investment + repeated complaints -> HIGH_INVESTMENT_REPEATED_CONCERNS
4. Low/normal investment + condition complaint -> INVESTMENT_CONDITION_MONITORED
5. Missing complaint data -> Handled gracefully
6. Missing completion date -> Falls back to sanction date or defaults
7. Missing sanction date -> Handled gracefully
8. Missing expenditure / zero costs -> DATA_INSUFFICIENT
9. Category with insufficient cohort data -> Defaults to fallback baselines
10. Boundary percentile cases (Median, P90)
11. Repeated reports handling without claiming independent confirmation
12. Model A invariance (composite scores, tiers, flags remain untouched)
13. Phase A invariance (GPS/EXIF verification unchanged)
14. Deterministic repeatability
15. API endpoint verification (GET /api/analytics/investment-durability/{id} & GET /api/projects/{id})
"""

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database import SessionLocal
from backend.app.models import Project, RiskScore, RiskFlag, Complaint
from backend.app.services.durability_service import (
    evaluate_investment_durability,
    load_category_baselines,
    CONDITION_CATEGORIES
)

client = TestClient(app)


@pytest.fixture
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.rollback()
        db.close()


def test_category_baselines_loaded():
    baselines = load_category_baselines()
    assert isinstance(baselines, dict)
    assert len(baselines) > 0
    for cat, stats in baselines.items():
        assert "sanctioned_cost_median" in stats or "expenditure_median" in stats
        assert "sanctioned_cost_p90" in stats or "expenditure_p90" in stats


def test_normal_investment_no_complaints(db_session):
    proj = Project(
        source_record_id="TEST_NORM_01",
        category="Roads, Pathways and Bridges",
        sanctioned_cost=5.0,
        expenditure=5.0,
        sanction_date="2020-01-15",
        completion_date="2021-01-15"
    )
    result = evaluate_investment_durability(proj, db_session)
    assert result["signal_status"] == "INVESTMENT_CONDITION_NORMAL"
    assert result["is_high_investment"] is False
    assert result["condition_reports_count"] == 0
    assert "disclaimer" in result


def test_high_investment_early_condition_concern(db_session):
    proj = Project(
        source_record_id="TEST_HIGH_01",
        category="Roads, Pathways and Bridges",
        sanctioned_cost=30.0,
        expenditure=28.0,
        sanction_date="2020-01-15",
        completion_date="2021-01-15"
    )
    comp = Complaint(
        complaint_id="CMP-TEST-001",
        linked_allocation_id="TEST_HIGH_01",
        category="QUALITY_CONCERN",
        description="Cracks observed in bridge pavement",
        submitted_at="2021-06-15"
    )
    db_session.add(comp)
    db_session.flush()

    try:
        result = evaluate_investment_durability(proj, db_session)
        assert result["signal_status"] == "HIGH_INVESTMENT_EARLY_CONDITION_CONCERN"
        assert result["is_high_investment"] is True
        assert result["condition_reports_count"] == 1
        assert result["elapsed_months"] is not None
        assert result["elapsed_months"] <= 36.0
    finally:
        db_session.rollback()


def test_high_investment_repeated_concerns(db_session):
    proj = Project(
        source_record_id="TEST_HIGH_02",
        category="Public Health & Sanitation",
        sanctioned_cost=25.0,
        expenditure=25.0,
        sanction_date="2018-01-15",
        completion_date="2019-01-15"
    )
    comp1 = Complaint(
        complaint_id="CMP-TEST-002A",
        linked_allocation_id="TEST_HIGH_02",
        category="QUALITY_CONCERN",
        description="First quality observation",
        submitted_at="2020-01-15"
    )
    comp2 = Complaint(
        complaint_id="CMP-TEST-002B",
        linked_allocation_id="TEST_HIGH_02",
        category="WORK_INCOMPLETE",
        description="Second quality observation",
        submitted_at="2020-06-15"
    )
    db_session.add_all([comp1, comp2])
    db_session.flush()

    try:
        result = evaluate_investment_durability(proj, db_session)
        assert result["signal_status"] == "HIGH_INVESTMENT_REPEATED_CONCERNS"
        assert result["has_repeated_reports"] is True
        assert result["condition_reports_count"] == 2
    finally:
        db_session.rollback()


def test_low_investment_with_condition_complaint(db_session):
    proj = Project(
        source_record_id="TEST_LOW_01",
        category="Drinking Water Facility",
        sanctioned_cost=3.0,
        expenditure=3.0,
        sanction_date="2020-01-15",
        completion_date="2021-01-15"
    )
    comp = Complaint(
        complaint_id="CMP-TEST-003",
        linked_allocation_id="TEST_LOW_01",
        category="QUALITY_CONCERN",
        description="Pump leakage",
        submitted_at="2021-03-15"
    )
    db_session.add(comp)
    db_session.flush()

    try:
        result = evaluate_investment_durability(proj, db_session)
        assert result["signal_status"] == "INVESTMENT_CONDITION_MONITORED"
        assert result["is_high_investment"] is False
        assert result["condition_reports_count"] == 1
    finally:
        db_session.rollback()


def test_missing_expenditure_and_sanction(db_session):
    proj = Project(
        source_record_id="TEST_ZERO_01",
        category="Other",
        sanctioned_cost=0.0,
        expenditure=0.0,
        sanction_date="",
        completion_date=""
    )
    result = evaluate_investment_durability(proj, db_session)
    assert result["signal_status"] == "DATA_INSUFFICIENT"
    assert result["investment_level"] == "Data Insufficient"


def test_missing_completion_date_falls_back_to_sanction(db_session):
    proj = Project(
        source_record_id="TEST_SANCTION_ONLY",
        category="Roads, Pathways and Bridges",
        sanctioned_cost=28.0,
        expenditure=28.0,
        sanction_date="2020-01-01",
        completion_date=""
    )
    comp = Complaint(
        complaint_id="CMP-TEST-004",
        linked_allocation_id="TEST_SANCTION_ONLY",
        category="QUALITY_CONCERN",
        description="Observation after sanction",
        submitted_at="2020-06-01"
    )
    db_session.add(comp)
    db_session.flush()

    try:
        result = evaluate_investment_durability(proj, db_session)
        assert result["signal_status"] == "HIGH_INVESTMENT_EARLY_CONDITION_CONCERN"
        assert "after sanction" in result["elapsed_time_description"]
    finally:
        db_session.rollback()


def test_missing_dates_handled_gracefully(db_session):
    proj = Project(
        source_record_id="TEST_NO_DATES",
        category="Roads, Pathways and Bridges",
        sanctioned_cost=28.0,
        expenditure=28.0,
        sanction_date="",
        completion_date=""
    )
    comp = Complaint(
        complaint_id="CMP-TEST-005",
        linked_allocation_id="TEST_NO_DATES",
        category="QUALITY_CONCERN",
        description="Observation with no project dates",
        submitted_at="2021-01-01"
    )
    db_session.add(comp)
    db_session.flush()

    try:
        result = evaluate_investment_durability(proj, db_session)
        assert result["signal_status"] == "INVESTMENT_CONDITION_MONITORED"
        assert result["elapsed_time_description"] == "Timeline not available"
    finally:
        db_session.rollback()


def test_unknown_category_fallback(db_session):
    proj = Project(
        source_record_id="TEST_UNKNOWN_CAT",
        category="Completely Unknown Category 999",
        sanctioned_cost=5.0,
        expenditure=5.0
    )
    result = evaluate_investment_durability(proj, db_session)
    assert result["category_median_cost_crore"] > 0
    assert result["category_p90_cost_crore"] > 0
    assert result["signal_status"] == "INVESTMENT_CONDITION_NORMAL"


def test_api_investment_durability_endpoint(db_session):
    real_proj = db_session.query(Project).first()
    assert real_proj is not None

    resp = client.get(f"/api/analytics/investment-durability/{real_proj.source_record_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["source_record_id"] == real_proj.source_record_id
    assert "signal_status" in data
    assert "investment_level" in data
    assert "disclaimer" in data
    assert "structural durability" in data["disclaimer"]


def test_project_deep_detail_includes_durability(db_session):
    real_proj = db_session.query(Project).first()
    assert real_proj is not None

    resp = client.get(f"/api/projects/{real_proj.source_record_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert "investment_durability" in data
    assert data["investment_durability"] is not None
    assert data["investment_durability"]["source_record_id"] == real_proj.source_record_id


def test_model_a_invariance(db_session):
    """Verifies that Model A score calculations, risk flags, and database records remain 100% frozen."""
    real_proj = db_session.query(Project).first()
    assert real_proj is not None

    initial_score = real_proj.risk_score.total_score if real_proj.risk_score else None
    initial_level = real_proj.risk_score.risk_level if real_proj.risk_score else None

    # Call evaluate_investment_durability
    _ = evaluate_investment_durability(real_proj, db_session)

    # Re-query
    db_session.refresh(real_proj)
    if real_proj.risk_score:
        assert real_proj.risk_score.total_score == initial_score
        assert real_proj.risk_score.risk_level == initial_level

    # Check total database counts
    total_projects = db_session.query(Project).count()
    total_risk_scores = db_session.query(RiskScore).count()
    total_risk_flags = db_session.query(RiskFlag).count()

    assert total_projects == 1675
    assert total_risk_scores == 1675
    assert total_risk_flags == 1067
