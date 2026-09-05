"""Phase 3 Tests: MP / Representative Constituency-Scoped Portal.

Validates:
1. GET /api/projects/constituencies returns sorted real authentic constituencies.
2. GET /api/analytics/constituency/{name} returns accurate aggregates, risk tiers, trajectory, and peer benchmarks.
3. Invalid / non-existent constituency returns 404 cleanly.
4. Single-term constituency returns INSUFFICIENT HISTORY trajectory.
5. GET /api/projects with constituency filter returns only allocations belonging to that constituency.
6. Baseline Model A risk scores, distributions, and frozen records are completely unmodified.
"""

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_list_constituencies():
    """Verify authentic distinct constituencies are returned alphabetically."""
    response = client.get("/api/projects/constituencies")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    # Must be sorted alphabetically
    assert data == sorted(data)
    # Check sample authentic constituency in list
    assert any("Varanasi" in c for c in data)


def test_constituency_analytics_varanasi():
    """Verify analytical overview for Varanasi."""
    response = client.get("/api/analytics/constituency/Varanasi")
    assert response.status_code == 200
    data = response.json()
    assert "Varanasi" in data["constituency_name"]
    assert data["total_allocations"] > 0
    assert data["total_sanctioned_crore"] > 0
    assert data["total_expenditure_crore"] >= 0
    assert data["financial_utilization_proxy"] >= 0
    assert "risk_distribution" in data
    assert sum(data["risk_distribution"].values()) == data["total_allocations"]
    assert len(data["term_breakdown"]) > 0
    assert len(data["priority_allocations"]) > 0
    assert data["trajectory_status"] in ["STABLE", "ESCALATING", "IMPROVING", "ELEVATED", "INSUFFICIENT HISTORY"]
    assert data["peer_benchmark"] is not None
    assert "disclaimer" in data


def test_constituency_analytics_not_found():
    """Verify 404 response for invalid constituency name."""
    response = client.get("/api/analytics/constituency/NonExistentFictionalConstituency999")
    assert response.status_code == 404
    assert "no allocation records found" in response.json()["detail"].lower()


def test_projects_constituency_scoping():
    """Verify filtering allocations by constituency returns only relevant records."""
    response = client.get("/api/projects?constituency=Varanasi")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] > 0
    for item in data["items"]:
        assert "varanasi" in item["constituency"].lower()


def test_trajectory_insufficient_history_safety():
    """Verify single-term constituencies report INSUFFICIENT HISTORY safely."""
    # Query a single-term constituency if available
    response = client.get("/api/projects/constituencies")
    constituencies = response.json()
    
    # Check at least one constituency
    if constituencies:
        test_c = constituencies[0]
        res = client.get(f"/api/analytics/constituency/{test_c}")
        assert res.status_code == 200
        data = res.json()
        if len(data["term_breakdown"]) < 2:
            assert data["trajectory_status"] == "INSUFFICIENT HISTORY"
            assert data["trajectory_delta"] is None


def test_frozen_baseline_unaltered():
    """Verify baseline Model A distribution and total record counts remain strictly unchanged."""
    res_stats = client.get("/api/stats/overview")
    assert res_stats.status_code == 200
    stats = res_stats.json()
    assert stats["total_allocations"] == 1675
    assert stats["risk_distribution"]["high"] == 96
    assert stats["risk_distribution"]["critical"] == 0
    assert stats["risk_distribution"]["medium"] == 413
    assert stats["risk_distribution"]["low"] == 1166
