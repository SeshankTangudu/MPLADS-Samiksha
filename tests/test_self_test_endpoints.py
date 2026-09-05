"""Automated tests for Phase 1.2 Self-Test & Synthetic Fixtures Endpoint."""

from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_self_test_fixtures_endpoint():
    response = client.get("/api/self-test/fixtures")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 5
    
    # Check worst-case critical fixture
    critical_fix = next((f for f in data if "Critical" in f["scenario_title"]), None)
    assert critical_fix is not None
    assert critical_fix["is_synthetic"] is True
    assert "SYNTHETIC VALIDATION DATA" in critical_fix["disclaimer"]
    assert critical_fix["evaluation"]["total_score"] >= 70.0
    
    # Check baseline fixture
    baseline_fix = next((f for f in data if "Low Risk" in f["scenario_title"] or "Baseline" in f["scenario_title"]), None)
    assert baseline_fix is not None
    assert baseline_fix["evaluation"]["risk_level"] == "Low"
