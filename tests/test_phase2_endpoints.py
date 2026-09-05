import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_get_cohorts_endpoint():
    response = client.get("/api/analytics/cohorts")
    assert response.status_code == 200
    data = response.json()
    assert "categories" in data
    assert "states" in data
    assert "cohorts" in data
    assert len(data["categories"]) > 0
    assert len(data["cohorts"]) > 0
    assert "disclaimer" in data
    assert "Risk indicators are analytical signals" in data["disclaimer"]


def test_get_district_detail_endpoint():
    # Test valid district detail
    response = client.get("/api/analytics/district/1")
    assert response.status_code in [200, 404]
    if response.status_code == 200:
        data = response.json()
        assert "district_id" in data
        assert "district_name" in data
        assert "total_allocations" in data
        assert "disclaimer" in data
        assert "District centroid coordinates" in data["disclaimer"]


def test_project_detail_phase2_fields():
    # Test project detail includes Phase 2 fields (ml_cross_check, risk_trajectory, duplicate_candidates)
    response = client.get("/api/projects/1")
    assert response.status_code in [200, 404]
    if response.status_code == 200:
        data = response.json()
        assert "ml_cross_check" in data
        if data["ml_cross_check"]:
            assert "method" in data["ml_cross_check"]
            assert "disclaimer" in data["ml_cross_check"]
        assert "risk_trajectory" in data
        if data["risk_trajectory"]:
            assert "trajectory_status" in data["risk_trajectory"]
            assert data["risk_trajectory"]["trajectory_status"] in [
                "STABLE", "IMPROVING", "ELEVATED", "ESCALATING", "INSUFFICIENT HISTORY",
                "Stable", "Improving", "Deteriorating", "Persistently Elevated"
            ]
        assert "duplicate_candidates" in data


def test_cross_term_intelligence_multi_term():
    """Test P1-6 Cross-Term Intelligence on a real multi-term record (LS16_0100)."""
    response = client.get("/api/projects/LS16_0100")
    assert response.status_code == 200
    data = response.json()
    assert "risk_trajectory" in data
    traj = data["risk_trajectory"]
    assert traj is not None
    assert "observed_points" in traj
    points = traj["observed_points"]
    assert len(points) >= 2
    for pt in points:
        assert "term" in pt
        assert "source_record_id" in pt
        assert "mp_name" in pt
        assert "sanctioned_cost" in pt
        assert "expenditure" in pt
        assert "unspent_balance" in pt
        assert "financial_utilization" in pt
        assert "total_score" in pt
        assert "risk_level" in pt
        assert "primary_flag" in pt
        assert "category" in pt
        assert "district" in pt
        assert "constituency" in pt


def test_cross_term_intelligence_single_term():
    """Test P1-6 Cross-Term Intelligence on a single-term record."""
    response = client.get("/api/projects/LS15_0032")
    assert response.status_code == 200
    data = response.json()
    assert "risk_trajectory" in data
    traj = data["risk_trajectory"]
    assert traj is not None
    assert traj["trajectory_status"] == "INSUFFICIENT HISTORY"
    assert traj["has_sufficient_history"] is False
