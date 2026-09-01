"""Automated verification tests for T09 FastAPI REST Endpoints."""

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_stats_overview_endpoint():
    response = client.get("/api/stats/overview")
    assert response.status_code == 200
    data = response.json()
    assert data["total_allocations"] == 1675
    assert data["total_sanctioned_crore"] > 0
    assert data["total_expenditure_crore"] > 0
    assert data["overall_utilization_rate"] > 0
    assert "risk_distribution" in data
    assert "disclaimer" in data


def test_projects_list_pagination():
    response = client.get("/api/projects?page=1&limit=10")
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 10
    assert data["total"] == 1675
    assert data["page"] == 1
    assert data["limit"] == 10
    assert data["total_pages"] == 168

    first_item = data["items"][0]
    assert "source_record_id" in first_item
    assert "sanctioned_cost" in first_item
    assert "expenditure" in first_item
    assert "financial_utilization" in first_item


def test_projects_list_search():
    response = client.get("/api/projects?search=Delhi")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] > 0
    for item in data["items"]:
        match = "delhi" in item["state"].lower() or "delhi" in item["district"].lower() or "delhi" in item["mp_name"].lower() or "delhi" in item["description"].lower()
        assert match


def test_projects_list_filters():
    response = client.get("/api/projects", params={"category": "Infrastructure & Public Amenities", "term": 16})
    assert response.status_code == 200
    data = response.json()
    assert data["total"] > 0
    for item in data["items"]:
        assert item["category"] == "Infrastructure & Public Amenities"
        assert item["lok_sabha_term"] == 16


def test_project_detail_by_id():
    response = client.get("/api/projects/1")
    assert response.status_code == 200
    data = response.json()
    assert "allocation" in data
    assert "risk_assessment" in data
    assert "reasons" in data
    assert "peer_comparables" in data
    assert "disclaimer" in data
    assert data["allocation"]["id"] == 1


def test_project_detail_by_source_record_id():
    response = client.get("/api/projects/LS17_0001")
    assert response.status_code == 200
    data = response.json()
    assert data["allocation"]["source_record_id"] == "LS17_0001"


def test_project_detail_404():
    response = client.get("/api/projects/NON_EXISTENT_ID_99999")
    assert response.status_code == 404
    data = response.json()
    assert "detail" in data
    assert data["code"] == "HTTP_404"
