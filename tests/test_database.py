"""Automated verification tests for T06 SQLite Database & Schema."""

import os
import pytest
import pandas as pd
from sqlalchemy import create_engine, select, func, text, inspect
from sqlalchemy.orm import sessionmaker

from backend.app.models import Base, MP, District, Project, RiskScore, RiskFlag, AnalyticsCache

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "processed", "mplads.db")
DATABASE_URL = f"sqlite:///{DB_PATH}"
PROJECTS_CSV = os.path.join(os.path.dirname(__file__), "..", "data", "processed", "projects_clean.csv")


@pytest.fixture(scope="module")
def db_session():
    assert os.path.exists(DB_PATH), "Database file data/processed/mplads.db must exist"
    engine = create_engine(DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()


def test_database_file_exists():
    assert os.path.exists(DB_PATH)
    assert os.path.getsize(DB_PATH) > 100_000, "Database file must have non-trivial size"


def test_table_presence(db_session):
    engine = db_session.get_bind()
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    expected_tables = ["mps", "districts", "projects", "risk_scores", "risk_flags", "analytics_cache"]
    for t in expected_tables:
        assert t in tables, f"Expected table '{t}' missing from database"


def test_projects_row_count(db_session):
    df_csv = pd.read_csv(PROJECTS_CSV)
    db_count = db_session.query(func.count(Project.id)).scalar()
    assert db_count == len(df_csv), f"Project count in DB ({db_count}) != CSV ({len(df_csv)})"
    assert db_count == 1675


def test_primary_key_uniqueness(db_session):
    total_projects = db_session.query(func.count(Project.id)).scalar()
    distinct_ids = db_session.query(func.count(func.distinct(Project.id))).scalar()
    distinct_source_ids = db_session.query(func.count(func.distinct(Project.source_record_id))).scalar()
    assert total_projects == distinct_ids == distinct_source_ids == 1675


def test_foreign_key_integrity(db_session):
    engine = db_session.get_bind()
    with engine.connect() as conn:
        fk_violations = conn.execute(text("PRAGMA foreign_key_check;")).fetchall()
        assert len(fk_violations) == 0, f"Foreign key violations found: {fk_violations}"

    # Verify ORM navigation
    sample_projects = db_session.query(Project).limit(10).all()
    for p in sample_projects:
        assert p.mp is not None, f"Project {p.source_record_id} has unresolvable MP"
        assert p.district_rel is not None, f"Project {p.source_record_id} has unresolvable District"


def test_financial_aggregates_match_csv(db_session):
    df_csv = pd.read_csv(PROJECTS_CSV)
    csv_sanctioned = round(df_csv["sanctioned_cost"].sum(), 2)
    csv_expenditure = round(df_csv["expenditure"].sum(), 2)

    db_sanctioned = round(db_session.query(func.sum(Project.sanctioned_cost)).scalar(), 2)
    db_expenditure = round(db_session.query(func.sum(Project.expenditure)).scalar(), 2)

    assert abs(csv_sanctioned - db_sanctioned) < 0.1, f"Sanctioned sum mismatch: CSV={csv_sanctioned}, DB={db_sanctioned}"
    assert abs(csv_expenditure - db_expenditure) < 0.1, f"Expenditure sum mismatch: CSV={csv_expenditure}, DB={db_expenditure}"


def test_database_indexes(db_session):
    engine = db_session.get_bind()
    inspector = inspect(engine)
    project_indexes = [idx["name"] for idx in inspector.get_indexes("projects")]
    assert "idx_projects_category_status" in project_indexes or any("category" in str(idx) for idx in project_indexes)
    assert any("district_id" in str(idx) for idx in project_indexes)
    assert any("source_record_id" in str(idx) for idx in project_indexes)
