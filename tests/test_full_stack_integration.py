"""Full Stack End-to-End Integration Test Suite (T22).

Validates complete contract conformance, database-to-API-to-UI data consistency,
geospatial centroid bounds, CSV exports, and Responsible AI guardrails.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, func
from sqlalchemy.orm import sessionmaker

from backend.app.main import app
from backend.app.database import DATABASE_URL
from backend.app.models import Project, District, MP, RiskScore, RiskFlag

client = TestClient(app)


@pytest.fixture(scope="module")
def db_session():
    engine = create_engine(DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()


def test_e2e_health_and_root_metadata():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"

    res_root = client.get("/")
    assert res_root.status_code == 200
    root_data = res_root.json()
    assert "MPLADS Samiksha" in root_data["name"]
    assert "disclaimer" in root_data


def test_e2e_overview_stats_consistency(db_session):
    res = client.get("/api/stats/overview")
    assert res.status_code == 200
    data = res.json()

    db_proj_count = db_session.query(func.count(Project.id)).scalar()
    db_sanctioned = db_session.query(func.sum(Project.sanctioned_cost)).scalar()
    db_spent = db_session.query(func.sum(Project.expenditure)).scalar()

    assert data["total_allocations"] == db_proj_count == 1675
    assert abs(data["total_sanctioned_crore"] - round(db_sanctioned, 2)) < 0.05
    assert abs(data["total_expenditure_crore"] - round(db_spent, 2)) < 0.05
    assert data["risk_distribution"]["high"] == 96
    assert data["risk_distribution"]["critical"] == 0


def test_e2e_project_explorer_pagination_and_search():
    res = client.get("/api/projects?search=Varanasi")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] > 0
    for item in data["items"]:
        assert "varanasi" in (item["district"] + item["constituency"] + item["description"] + item["mp_name"]).lower()


def test_e2e_project_deep_investigation_lookup():
    # Test lookup by integer ID
    res = client.get("/api/projects/1")
    assert res.status_code == 200
    detail = res.json()
    assert detail["allocation"]["id"] == 1
    assert "financial_utilization" in detail["allocation"]
    assert detail["risk_assessment"]["total_score"] >= 0.0
    assert len(detail["peer_comparables"]) <= 3
    assert "disclaimer" in detail

    # Test lookup by source_record_id
    src_id = detail["allocation"]["source_record_id"]
    res_src = client.get(f"/api/projects/{src_id}")
    assert res_src.status_code == 200
    assert res_src.json()["allocation"]["source_record_id"] == src_id


def test_e2e_anomaly_review_queue_prioritization():
    res = client.get("/api/anomalies?min_score=50.0&limit=50")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 96  # High risk tier
    items = data["items"]
    # Verify descending sort order by total_score
    for i in range(len(items) - 1):
        assert items[i]["total_score"] >= items[i + 1]["total_score"]


def test_e2e_analytics_by_category_sums(db_session):
    res = client.get("/api/analytics/by-category")
    assert res.status_code == 200
    cats = res.json()
    assert len(cats) == 3

    total_allocs_sum = sum(c["total_allocations"] for c in cats)
    assert total_allocs_sum == 1675


def test_e2e_locations_and_geospatial_bounds():
    res = client.get("/api/locations")
    assert res.status_code == 200
    locations = res.json()
    assert len(locations) > 0

    for loc in locations:
        assert loc["latitude"] is not None and loc["longitude"] is not None
        # Strict India geographic bounding box
        assert 6.0 <= loc["latitude"] <= 38.0, f"Latitude {loc['latitude']} out of India bounds"
        assert 68.0 <= loc["longitude"] <= 98.0, f"Longitude {loc['longitude']} out of India bounds"
        assert loc["dominant_risk_level"] in ("Low", "Medium", "High", "Critical")


def test_e2e_methodology_transparency_schema():
    res = client.get("/api/methodology")
    assert res.status_code == 200
    data = res.json()
    assert data["version"] == "2.0.0"
    assert len(data["components"]) == 5
    weights_sum = sum(c["weight"] for c in data["components"])
    assert weights_sum == 100
    assert "disclaimer" in data


def test_e2e_csv_export_stream():
    res = client.get("/api/reports/risk-summary.csv")
    assert res.status_code == 200
    assert "text/csv" in res.headers["content-type"]
    lines = res.text.strip().split("\n")
    assert len(lines) == 1676  # 1 header + 1,675 data rows


def test_e2e_responsible_ai_non_accusatory_guardrails(db_session):
    flags = db_session.query(RiskFlag).all()
    forbidden_words = ["fraud", "corrupt", "illegal", "criminal", "scam", "guilt", "embezzl"]

    for f in flags:
        text = f"{f.title} {f.explanation}".lower()
        for word in forbidden_words:
            assert word not in text, f"Found forbidden accusatory word '{word}' in flag: {f.title}"
