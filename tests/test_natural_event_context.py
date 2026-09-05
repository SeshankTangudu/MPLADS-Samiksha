import os
import json
import pytest
from datetime import datetime
from backend.app.services.natural_event_service import (
    evaluate_natural_event_context,
    load_natural_events_registry,
    NATURAL_EVENTS_REGISTRY_PATH,
)
from backend.app.database import SessionLocal
from backend.app.models import Project, RiskScore, RiskFlag
from ml.risk_engine import load_baselines, evaluate_allocation


def test_load_natural_events_registry_authenticity():
    """Verify authentic natural events registry loads with proper provenance."""
    events = load_natural_events_registry(force_reload=True)
    assert len(events) >= 8, f"Expected at least 8 authentic events, got {len(events)}"
    
    for ev in events:
        assert "event_id" in ev
        assert "event_type" in ev
        assert "start_date" in ev
        assert "end_date" in ev
        assert "source_name" in ev
        assert "source_url" in ev
        assert "provenance_status" in ev
        assert ev["provenance_status"] == "OFFICIAL_GOVERNMENT_RECORD"
        assert ev["source_url"].startswith("http")


def test_exact_spatial_and_temporal_match():
    """1. Exact spatial + temporal event match: Returns NATURAL_EVENT_CONTEXT_MATCH with OVERLAPPING_EVENT_PERIOD."""
    # Cyclone Fani hit Puri / Khordha (Odisha) from 2019-04-26 to 2019-05-05
    res = evaluate_natural_event_context(
        district="Puri",
        state="Odisha",
        complaint_submitted_at="2019-05-03T10:00:00Z"
    )
    assert res["signal_status"] == "NATURAL_EVENT_CONTEXT_MATCH"
    assert res["has_event_match"] is True
    assert res["temporal_relation"] == "OVERLAPPING_EVENT_PERIOD"
    assert res["spatial_relation"] == "DISTRICT_MATCH"
    assert "Fani" in (res["event_name"] or "")
    assert res["source_name"] == "India Meteorological Department (IMD)"
    assert res["source_url"] == "https://mausam.imd.gov.in"
    assert res["provenance"] == "OFFICIAL_GOVERNMENT_RECORD"
    # Ensure non-causal explanation wording
    assert "does not establish causation" in res["explanation"]
    assert "contextual explanation" in res["explanation"] or "contextual information" in res["explanation"]


def test_district_mismatch():
    """2. District mismatch: Event exists in one district, but complaint is from another."""
    # Fani was in Odisha (Puri, Khordha, Cuttack), not in Pune (Maharashtra)
    res = evaluate_natural_event_context(
        district="Pune",
        state="Maharashtra",
        complaint_submitted_at="2019-05-03T10:00:00Z"
    )
    assert res["signal_status"] == "NATURAL_EVENT_CONTEXT_NOT_FOUND"
    assert res["has_event_match"] is False
    assert res["event_name"] is None
    assert "No documented extreme meteorological" in res["explanation"]


def test_event_outside_relevant_period():
    """3. Event outside relevant period: Same district but months before/after."""
    # Cyclone Fani was in May 2019; complaint in November 2019
    res = evaluate_natural_event_context(
        district="Puri",
        state="Odisha",
        complaint_submitted_at="2019-11-20T10:00:00Z"
    )
    assert res["signal_status"] == "NATURAL_EVENT_CONTEXT_NOT_FOUND"
    assert res["has_event_match"] is False


def test_overlapping_aftermath_window():
    """4. Event aftermath window (within 14 days post-event): Returns NATURAL_EVENT_CONTEXT_POSSIBLE."""
    # Cyclone Fani ended 2019-05-05. Complaint on 2019-05-10 (5 days after end date)
    res = evaluate_natural_event_context(
        district="Khordha",
        state="Odisha",
        complaint_submitted_at="2019-05-10T14:00:00Z"
    )
    assert res["signal_status"] == "NATURAL_EVENT_CONTEXT_POSSIBLE"
    assert res["has_event_match"] is True
    assert res["temporal_relation"] == "IMMEDIATE_AFTERMATH_WINDOW"
    assert "14-day immediate post-event window" in res["explanation"]


def test_missing_event_data(monkeypatch):
    """5. Missing event dataset handled safely: Returns NATURAL_EVENT_DATA_UNAVAILABLE."""
    # Simulate empty or missing registry
    monkeypatch.setattr("backend.app.services.natural_event_service._EVENTS_CACHE", [])
    monkeypatch.setattr("backend.app.services.natural_event_service.NATURAL_EVENTS_REGISTRY_PATH", "non_existent_file.json")
    
    res = evaluate_natural_event_context(
        district="Puri",
        state="Odisha",
        complaint_submitted_at="2019-05-03T10:00:00Z"
    )
    assert res["signal_status"] == "NATURAL_EVENT_DATA_UNAVAILABLE"
    assert res["has_event_match"] is False
    assert "Official natural hazard registry is currently unavailable" in res["explanation"]


def test_missing_complaint_timestamp():
    """6. Missing complaint timestamp: Returns NATURAL_EVENT_DATA_INSUFFICIENT."""
    res = evaluate_natural_event_context(
        district="Puri",
        state="Odisha",
        complaint_submitted_at=None,
        evidence_captured_at=None
    )
    assert res["signal_status"] == "NATURAL_EVENT_DATA_INSUFFICIENT"
    assert res["has_event_match"] is False
    assert "Missing complaint submission or evidence capture timestamp" in res["explanation"]


def test_missing_district():
    """7. Missing district: Returns NATURAL_EVENT_DATA_INSUFFICIENT."""
    res = evaluate_natural_event_context(
        district="",
        state="Odisha",
        complaint_submitted_at="2019-05-03T10:00:00Z"
    )
    assert res["signal_status"] == "NATURAL_EVENT_DATA_INSUFFICIENT"
    assert res["has_event_match"] is False
    assert "District parameter unavailable" in res["explanation"]


def test_citizen_gps_available_but_project_gps_unavailable():
    """8. Citizen GPS available but project GPS unavailable: Uses district matching without substituting centroid."""
    res = evaluate_natural_event_context(
        district="Puri",
        state="Odisha",
        complaint_submitted_at="2019-05-03T10:00:00Z",
        browser_lat=19.8135,
        browser_lon=85.8312
    )
    assert res["signal_status"] == "NATURAL_EVENT_CONTEXT_MATCH"
    assert res["spatial_relation"] == "DISTRICT_MATCH"
    assert "DISTRICT-LEVEL EVENT CONTEXT" in res["limitations"]
    assert "Administrative district matching" in res["limitations"]


def test_district_centroid_not_substituted_as_project_gps():
    """9. District centroid is NOT substituted as project GPS."""
    res = evaluate_natural_event_context(
        district="Puri",
        state="Odisha",
        complaint_submitted_at="2019-05-03T10:00:00Z"
    )
    # The limitations must clearly document that district matching does not represent worksite location
    assert "District centroid coordinates serve as an administrative reference point only" in res["limitations"]
    assert "not the physical worksite GPS" in res["limitations"]


def test_provenance_and_source_url_preserved():
    """10 & 11. Provenance fields and source URL preserved in response."""
    res = evaluate_natural_event_context(
        district="South 24 Parganas",
        state="West Bengal",
        complaint_submitted_at="2020-05-20T12:00:00Z"
    )
    assert res["signal_status"] == "NATURAL_EVENT_CONTEXT_MATCH"
    assert res["event_name"] == "Super Cyclonic Storm Amphan"
    assert res["source_name"] == "India Meteorological Department (IMD)"
    assert res["source_url"] == "https://mausam.imd.gov.in"
    assert "Amphan" in res["source_reference"]
    assert res["provenance"] == "OFFICIAL_GOVERNMENT_RECORD"


def test_natural_event_context_does_not_modify_model_a():
    """12. Natural event context does NOT modify Model A scores, weights, tiers, or flags."""
    db = SessionLocal()
    try:
        # Check an existing project
        proj = db.query(Project).filter(Project.source_record_id == "LS16_0100").first()
        assert proj is not None
        initial_score = proj.risk_score.total_score
        initial_tier = proj.risk_score.risk_level
        initial_flags_count = len(proj.risk_flags)

        # Call natural event evaluation multiple times
        res = evaluate_natural_event_context(
            district=proj.district,
            state=proj.state,
            complaint_submitted_at="2020-05-20T12:00:00Z"
        )

        # Refresh from DB and verify Model A is unchanged
        db.refresh(proj)
        assert proj.risk_score.total_score == initial_score
        assert proj.risk_score.risk_level == initial_tier
        assert len(proj.risk_flags) == initial_flags_count
    finally:
        db.close()


def test_repeated_complaints_do_not_create_duplicate_events():
    """13. Repeated complaints do not alter the static read-only natural events registry."""
    events_initial = load_natural_events_registry(force_reload=True)
    count_initial = len(events_initial)

    for i in range(5):
        evaluate_natural_event_context(
            district="Puri",
            state="Odisha",
            complaint_submitted_at=f"2019-05-0{i+1}T10:00:00Z"
        )

    events_after = load_natural_events_registry(force_reload=True)
    assert len(events_after) == count_initial


def test_deterministic_repeated_evaluation():
    """14. Deterministic repeated evaluation: 10 repeated calls return identical outputs."""
    runs = []
    for _ in range(10):
        r = evaluate_natural_event_context(
            district="Mandi",
            state="Himachal Pradesh",
            complaint_submitted_at="2023-07-10T08:00:00Z"
        )
        runs.append(r)
    
    first = runs[0]
    for other in runs[1:]:
        assert other == first, "Evaluation output must be 100% deterministic"
        assert other["signal_status"] == "NATURAL_EVENT_CONTEXT_MATCH"
        assert other["event_name"] == "North India Severe Monsoon Rainstorm & Flash Floods"


def test_six_language_key_parity_for_natural_events():
    """16. Six-language key parity: all natural_events dictionary keys exist across all 6 locales."""
    locales = ["en", "hi", "bn", "te", "mr", "ta"]
    locale_data = {}
    
    for loc in locales:
        file_path = os.path.join("frontend", "src", "i18n", "locales", f"{loc}.js")
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
            # Extract natural_events dictionary keys by finding the lines inside natural_events: { ... }
            start = content.find('"natural_events": {')
            assert start != -1, f"natural_events namespace missing from {loc}.js"
            open_brace = content.find('{', start)
            close_brace = content.find('}', open_brace)
            snippet = content[open_brace:close_brace+1]
            # Parse json
            parsed = json.loads(snippet)
            locale_data[loc] = parsed

    en_keys = set(locale_data["en"].keys())
    assert len(en_keys) >= 15, f"Expected at least 15 natural_events keys, got {len(en_keys)}"

    for loc in locales[1:]:
        loc_keys = set(locale_data[loc].keys())
        diff = en_keys.symmetric_difference(loc_keys)
        assert len(diff) == 0, f"Key mismatch between en and {loc}: {diff}"
