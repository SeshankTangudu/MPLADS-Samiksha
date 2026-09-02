"""Automated verification tests for T12 Batch Scoring Pipeline."""

import pytest
import pandas as pd
from sqlalchemy import create_engine, func
from sqlalchemy.orm import sessionmaker

from backend.app.database import DATABASE_URL
from backend.app.models import Project, District, RiskScore, RiskFlag
from ml.batch_scoring import run_batch_scoring


@pytest.fixture(scope="module")
def db_session():
    engine = create_engine(DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()


def test_batch_scoring_completeness(db_session):
    total_projects = db_session.query(func.count(Project.id)).scalar()
    total_scores = db_session.query(func.count(RiskScore.id)).scalar()
    assert total_scores == total_projects == 1675


def test_risk_scores_1_to_1_relationship(db_session):
    total_scores = db_session.query(func.count(RiskScore.id)).scalar()
    distinct_project_ids = db_session.query(func.count(func.distinct(RiskScore.project_id))).scalar()
    assert total_scores == distinct_project_ids == 1675


def test_score_bounds_and_risk_levels(db_session):
    scores = db_session.query(RiskScore).all()
    valid_levels = {"Low", "Medium", "High", "Critical"}

    low_count = 0
    med_count = 0
    high_count = 0
    crit_count = 0

    for s in scores:
        assert 0.0 <= s.total_score <= 100.0, f"Score {s.total_score} out of bounds"
        assert s.risk_level in valid_levels

        if s.total_score >= 75.0:
            assert s.risk_level == "Critical"
            crit_count += 1
        elif s.total_score >= 50.0:
            assert s.risk_level == "High"
            high_count += 1
        elif s.total_score >= 25.0:
            assert s.risk_level == "Medium"
            med_count += 1
        else:
            assert s.risk_level == "Low"
            low_count += 1

    assert low_count == 1166
    assert med_count == 413
    assert high_count == 96
    assert crit_count == 0


def test_risk_flags_integrity_and_schema(db_session):
    flags = db_session.query(RiskFlag).all()
    assert len(flags) == 1067

    valid_types = {"FINANCIAL", "TIMELINE", "DATA_QUALITY", "GEOGRAPHIC"}
    valid_severities = {"INFO", "WARNING", "CRITICAL"}

    for f in flags:
        assert f.flag_type in valid_types
        assert f.severity in valid_severities
        assert f.title != ""
        assert f.observed_value != ""
        assert f.explanation != ""
        assert f.project_id >= 1


def test_idempotency_repeatable_execution():
    res1 = run_batch_scoring()
    res2 = run_batch_scoring()
    assert res1["total_scored"] == res2["total_scored"] == 1675
    assert res1["total_flags"] == res2["total_flags"] == 1067
    assert res1["risk_distribution"] == res2["risk_distribution"]
