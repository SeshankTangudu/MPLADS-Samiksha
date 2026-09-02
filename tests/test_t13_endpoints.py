"""Automated verification tests for T13 Remaining Backend API Endpoints."""

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_anomalies_list_endpoint():
    response = client.get("/api/anomalies?min_score=25.0&limit=10")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert data["total"] > 0
    assert len(data["items"]) <= 10
    for item in data["items"]:
        assert item["total_score"] >= 25.0
        assert item["risk_level"] in ("Medium", "High", "Critical")


def test_anomalies_filter_by_risk_level():
    response = client.get("/api/anomalies?risk_level=High")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 96  # Matches audited High risk count
    for item in data["items"]:
        assert item["risk_level"] == "High"
        assert item["total_score"] >= 50.0


def test_analytics_by_category_endpoint():
    response = client.get("/api/analytics/by-category")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 3
    for cat in data:
        assert "category" in cat
        assert cat["total_allocations"] > 0
        assert cat["total_sanctioned_crore"] > 0
        assert cat["avg_utilization"] >= 0.0


def test_analytics_by_district_endpoint():
    response = client.get("/api/analytics/by-district")
    assert response.status_code == 200
    data = response.json()
    assert len(data) > 0
    first_d = data[0]
    assert "district_name" in first_d
    assert "total_allocations" in first_d
    assert "flagged_allocations" in first_d


def test_locations_endpoint():
    response = client.get("/api/locations")
    assert response.status_code == 200
    data = response.json()
    assert len(data) > 0
    first_loc = data[0]
    assert "latitude" in first_loc
    assert "longitude" in first_loc
    assert 6.0 <= first_loc["latitude"] <= 38.0
    assert 68.0 <= first_loc["longitude"] <= 98.0


def test_methodology_endpoint():
    response = client.get("/api/methodology")
    assert response.status_code == 200
    data = response.json()
    assert data["version"] == "2.0.0"
    assert "composite_formula" in data
    assert len(data["components"]) == 5
    assert "disclaimer" in data


def test_reports_csv_export():
    response = client.get("/api/reports/risk-summary.csv")
    assert response.status_code == 200
    assert "text/csv" in response.headers["content-type"]
    assert "attachment; filename=mplads_risk_summary.csv" in response.headers["content-disposition"]
    
    lines = response.text.strip().split("\n")
    assert len(lines) == 1676  # Header + 1,675 records
    header = lines[0]
    assert "Record_ID" in header
    assert "Total_Risk_Score" in header
    assert "Primary_Reason_Signal" in header
