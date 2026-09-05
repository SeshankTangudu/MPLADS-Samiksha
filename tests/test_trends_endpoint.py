"""Automated tests for Phase 1.7 Analytics Trends Endpoint."""

from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_analytics_trends_endpoint():
    response = client.get("/api/analytics/trends")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 3
    
    terms = [d["term"] for d in data]
    assert set(terms) == {15, 16, 17}
    
    # Check 17th Lok Sabha trend item
    ls17 = next(d for d in data if d["term"] == 17)
    assert ls17["total_allocations"] > 0
    assert ls17["total_sanctioned_crore"] > 0
    assert ls17["total_expenditure_crore"] > 0
    assert ls17["avg_utilization"] >= 0.0
    assert "17th Lok Sabha" in ls17["term_label"]


def test_trend_intelligence_endpoint():
    """Test P1-7 Trend Analytics Intelligence endpoint."""
    response = client.get("/api/analytics/trend-intelligence")
    assert response.status_code == 200
    data = response.json()
    assert "overview" in data
    assert "term_intelligence" in data
    assert "sector_momentum" in data
    assert "state_momentum" in data
    assert "executive_insights" in data
    assert "disclaimer" in data

    # 1. Overview checks
    ov = data["overview"]
    assert ov["total_allocations"] == 1675
    assert ov["high_risk_allocations"] == 96
    assert 5.0 <= ov["high_risk_percentage"] <= 6.0
    assert ov["avg_model_a_score"] > 0.0

    # 2. Term intelligence checks
    terms = data["term_intelligence"]
    assert len(terms) == 3
    assert set(t["term"] for t in terms) == {15, 16, 17}

    # 3. Sector momentum checks (Strict period-over-period: 17 vs 16)
    sectors = data["sector_momentum"]
    assert len(sectors) > 0
    for s in sectors:
        assert s["trend_badge"] in ["Increasing Review Pressure", "Improving", "Stable", "Insufficient Data"]
        # If term 17 has observations and term 16 has 0, previous is None and delta is None
        if s["count_17"] > 0 and s["count_16"] == 0:
            assert s["previous_avg_score"] is None
            assert s["score_delta"] is None
            assert s["trend_badge"] == "Insufficient Data"
        elif s["count_16"] > 0 and s["count_17"] == 0:
            assert s["current_avg_score"] is None
            assert s["score_delta"] is None
            assert s["trend_badge"] == "Insufficient Data"

    # 4. State momentum checks (Strict period-over-period: 17 vs 16 with N >= 10 safeguard)
    states = data["state_momentum"]
    assert len(states) > 0
    for st in states:
        assert st["trend_badge"] in ["Increasing Review Pressure", "Improving", "Stable", "Insufficient Data"]
        # If either period has < 10 observations, delta is None
        if st["count_17"] < 10 or st["count_16"] < 10:
            assert st["score_delta"] is None
            assert st["trend_badge"] == "Insufficient Data"

    # 5. Executive insights checks
    insights = data["executive_insights"]
    assert len(insights) >= 3
    for ins in insights:
        assert len(ins["headline"]) > 0
        assert len(ins["detail"]) > 0


def test_momentum_period_isolation():
    """Verify that term 15 observations do not leak into term 16 or term 17 momentum calculations."""
    response = client.get("/api/analytics/trend-intelligence")
    assert response.status_code == 200
    data = response.json()

    # Verify Community Development (term 17 records only)
    comm_dev = next((s for s in data["sector_momentum"] if s["category"] == "Community Development"), None)
    if comm_dev:
        assert comm_dev["count_17"] == 557
        assert comm_dev["count_16"] == 0
        assert comm_dev["previous_avg_score"] is None
        assert comm_dev["current_avg_score"] is not None
        assert comm_dev["score_delta"] is None
        assert comm_dev["trend_badge"] == "Insufficient Data"

    # Verify Infrastructure (term 16 records only)
    infra = next((s for s in data["sector_momentum"] if s["category"] == "Infrastructure & Public Amenities"), None)
    if infra:
        assert infra["count_16"] == 569
        assert infra["count_17"] == 0
        assert infra["current_avg_score"] is None
        assert infra["previous_avg_score"] is not None
        assert infra["score_delta"] is None
        assert infra["trend_badge"] == "Insufficient Data"


def test_review_effort_kpi_calculation():
    """Verify Review Effort Index calculation and tier weighting rules."""
    response = client.get("/api/analytics/review-effort")
    assert response.status_code == 200
    data = response.json()

    assert data["total_allocations"] == 1675
    # Total effort points = 1166*1 + 413*2 + 96*4 + 0*8 = 2376
    assert data["total_effort_points"] == 2376
    assert round(data["avg_effort_per_allocation"], 2) == 1.42

    # Verify tier weights
    weights = data["tier_weights"]
    assert weights == {"Low": 1, "Medium": 2, "High": 4, "Critical": 8}

    # Verify tier breakdown
    tb = {t["risk_level"]: t for t in data["tier_breakdown"]}
    assert tb["Low"]["count"] == 1166
    assert tb["Low"]["effort_points"] == 1166
    assert tb["Medium"]["count"] == 413
    assert tb["Medium"]["effort_points"] == 826
    assert tb["High"]["count"] == 96
    assert tb["High"]["effort_points"] == 384
    assert tb["Critical"]["count"] == 0
    assert tb["Critical"]["effort_points"] == 0

    # Verify term breakdown
    term_dict = {t["term"]: t for t in data["term_breakdown"]}
    assert len(term_dict) == 3
    assert term_dict[15]["total_effort_points"] == 668
    assert term_dict[16]["total_effort_points"] == 1053
    assert term_dict[17]["total_effort_points"] == 655

    # Verify active flag counts from risk_flags
    flag_dict = {f["flag_type"]: f["count"] for f in data["flag_breakdown"]}
    assert flag_dict["TIMELINE"] == 734
    assert flag_dict["DATA_QUALITY"] == 244
    assert flag_dict["FINANCIAL"] == 89
    assert sum(flag_dict.values()) == 1067

    # Verify deterministic interpretation text
    assert len(data["interpretation"]) > 0
    assert "High-Risk" in data["interpretation"]
    assert "2,376" in data["interpretation"] or "2376" in data["interpretation"]



