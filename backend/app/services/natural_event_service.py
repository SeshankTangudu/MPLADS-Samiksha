"""Natural-Event-Aware Complaint Evaluation Service for MPLADS Samiksha (Phase C).

Provides:
- Additive contextual review layer for citizen complaints and parliamentary allocations.
- Deterministic matching against an offline, provenance-backed natural and meteorological event registry.
- Non-causal review interpretations (supporting review without claiming damage causation).
- Explicit district-level administrative spatial labeling (district centroid != project GPS).
- Complete isolation from Model A scoring and risk tiers.
"""

import os
import json
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session

from backend.app.models import Project, Complaint, ComplaintEvidence
from backend.app.services.evidence_service import _parse_date

NATURAL_EVENTS_REGISTRY_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "data", "processed", "natural_events.json")
)
EVENTS_REGISTRY_PATH = NATURAL_EVENTS_REGISTRY_PATH

_EVENTS_CACHE: Optional[List[Dict[str, Any]]] = None

DISCLAIMER_TEXT = (
    "Natural-event context is used only as supporting information for human review. "
    "A temporal or geographic match does not prove that a natural event caused the reported condition, "
    "nor does absence of an event prove that a complaint is invalid. "
    "District-level event matching uses administrative geography and should not be interpreted as exact worksite exposure."
)

LIMITATIONS_TEXT = (
    "DISTRICT-LEVEL EVENT CONTEXT. Administrative district matching uses district names and boundaries. "
    "District centroid coordinates serve as an administrative reference point only, not the physical worksite GPS. "
    "Event presence does not establish causation or physical damage."
)


def load_natural_events_registry(force_reload: bool = False) -> List[Dict[str, Any]]:
    """Loads the curated provenance-backed natural event registry from disk."""
    global _EVENTS_CACHE
    if _EVENTS_CACHE is not None and not force_reload:
        return _EVENTS_CACHE

    target_path = NATURAL_EVENTS_REGISTRY_PATH
    if os.path.exists(target_path):
        try:
            with open(target_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                _EVENTS_CACHE = data.get("events", [])
                return _EVENTS_CACHE
        except Exception:
            pass
    return []


def _normalize_name(name: Optional[str]) -> str:
    """Normalizes string for robust case-insensitive substring comparison."""
    if not name:
        return ""
    return name.strip().lower().replace("-", " ").replace("_", " ")


def evaluate_natural_event_context(
    project: Optional[Project] = None,
    complaint: Optional[Complaint] = None,
    custom_events: Optional[List[Dict[str, Any]]] = None,
    district: Optional[str] = None,
    state: Optional[str] = None,
    complaint_submitted_at: Optional[str] = None,
    evidence_captured_at: Optional[str] = None,
    browser_lat: Optional[float] = None,
    browser_lon: Optional[float] = None,
) -> Dict[str, Any]:
    """Evaluates whether an officially documented natural/meteorological event aligns with an allocation/complaint.
    
    Accepts either (project, complaint) models OR explicit parameters (district, state, complaint_submitted_at, etc.).

    Evaluates:
    1. Spatial alignment: Matches allocation/complaint district against documented event impact areas.
    2. Temporal alignment: Compares complaint submission/evidence capture date against documented event period.
    3. Signal classification: Deterministic assignment of context signal.
    4. Provenance & non-causal explanation: Preserves official sources (IMD/NDMA) and disclaimer.
    """
    events_list = custom_events if custom_events is not None else load_natural_events_registry()

    source_rec_id = project.source_record_id if project else "UNKNOWN"
    complaint_rec_id = complaint.complaint_id if complaint else None

    # Resolve district and state
    proj_district = district or (project.district if project else "") or ""
    proj_state = state or (project.state if project else "") or ""

    if not proj_district:
        return {
            "source_record_id": source_rec_id,
            "complaint_id": complaint_rec_id,
            "status": "NATURAL_EVENT_DATA_INSUFFICIENT",
            "signal_status": "NATURAL_EVENT_DATA_INSUFFICIENT",
            "signal_badge": "Data Insufficient",
            "has_event_context": False,
            "has_event_match": False,
            "event_id": None,
            "event_type": None,
            "event_name": None,
            "event_start": None,
            "event_end": None,
            "district": None,
            "matched_district": None,
            "state": proj_state or None,
            "matched_state": proj_state or None,
            "spatial_relation": "District parameter unavailable for spatial matching.",
            "temporal_relation": "Spatial match not established.",
            "source_name": None,
            "source_url": None,
            "source_reference": None,
            "provenance": None,
            "provenance_status": None,
            "description": None,
            "explanation": "District parameter unavailable. District data is required to perform administrative spatial matching with official natural event records.",
            "limitations": LIMITATIONS_TEXT,
            "disclaimer": DISCLAIMER_TEXT,
        }

    if not events_list:
        return {
            "source_record_id": source_rec_id,
            "complaint_id": complaint_rec_id,
            "status": "NATURAL_EVENT_DATA_UNAVAILABLE",
            "signal_status": "NATURAL_EVENT_DATA_UNAVAILABLE",
            "signal_badge": "Registry Unavailable",
            "has_event_context": False,
            "has_event_match": False,
            "event_id": None,
            "event_type": None,
            "event_name": None,
            "event_start": None,
            "event_end": None,
            "district": proj_district,
            "matched_district": proj_district,
            "state": proj_state,
            "matched_state": proj_state,
            "spatial_relation": "DISTRICT-LEVEL EVENT CONTEXT (Administrative Registry Empty)",
            "temporal_relation": "No event records available for comparison.",
            "source_name": None,
            "source_url": None,
            "source_reference": None,
            "provenance": None,
            "provenance_status": None,
            "description": None,
            "explanation": "Official natural hazard registry is currently unavailable for this region/timeline.",
            "limitations": LIMITATIONS_TEXT,
            "disclaimer": DISCLAIMER_TEXT,
        }

    # Determine reference date for temporal matching
    ref_dt = None
    ref_label = "observation timestamp"

    if evidence_captured_at:
        ref_dt = _parse_date(evidence_captured_at)
        ref_label = "photo capture timestamp"
    elif complaint_submitted_at:
        ref_dt = _parse_date(complaint_submitted_at)
        ref_label = "complaint submission date"
    elif complaint:
        if complaint.evidence and complaint.evidence.captured_at:
            ref_dt = _parse_date(complaint.evidence.captured_at)
            ref_label = "photo capture timestamp"
        elif complaint.submitted_at:
            ref_dt = _parse_date(complaint.submitted_at)
            ref_label = "complaint submission date"
    elif project:
        if project.completion_date:
            ref_dt = _parse_date(project.completion_date)
            ref_label = "project completion date"
        elif project.sanction_date:
            ref_dt = _parse_date(project.sanction_date)
            ref_label = "project sanction date"

    if not ref_dt:
        return {
            "source_record_id": source_rec_id,
            "complaint_id": complaint_rec_id,
            "status": "NATURAL_EVENT_DATA_INSUFFICIENT",
            "signal_status": "NATURAL_EVENT_DATA_INSUFFICIENT",
            "signal_badge": "Data Insufficient",
            "has_event_context": False,
            "has_event_match": False,
            "event_id": None,
            "event_type": None,
            "event_name": None,
            "event_start": None,
            "event_end": None,
            "district": proj_district,
            "matched_district": proj_district,
            "state": proj_state,
            "matched_state": proj_state,
            "spatial_relation": f"DISTRICT-LEVEL EVENT CONTEXT (Spatial district {proj_district})",
            "temporal_relation": "Missing complaint submission or evidence capture timestamp.",
            "source_name": None,
            "source_url": None,
            "source_reference": None,
            "provenance": None,
            "provenance_status": None,
            "description": None,
            "explanation": "Missing complaint submission or evidence capture timestamp to perform temporal matching.",
            "limitations": LIMITATIONS_TEXT,
            "disclaimer": DISCLAIMER_TEXT,
        }

    norm_proj_dist = _normalize_name(proj_district)
    norm_proj_state = _normalize_name(proj_state)

    # Search for matching event
    best_match = None
    best_status = "NATURAL_EVENT_CONTEXT_NOT_FOUND"
    best_temporal_rel = "NO_MATCHING_EVENT_PERIOD"
    best_temporal_desc = "No documented natural event overlapping this timeline in this district."

    for ev in events_list:
        # 1. Spatial Matching (District-level administrative check)
        ev_districts = ev.get("districts", [])
        if not ev_districts and ev.get("district"):
            ev_districts = [ev["district"]]

        norm_ev_dists = [_normalize_name(d) for d in ev_districts]
        norm_ev_state = _normalize_name(ev.get("state", ""))

        is_district_match = any(
            (norm_proj_dist == d or norm_proj_dist in d or d in norm_proj_dist)
            for d in norm_ev_dists
            if d
        )
        is_state_match = (not norm_ev_state) or (norm_proj_state == norm_ev_state) or (norm_proj_state in norm_ev_state)

        if not (is_district_match and is_state_match):
            continue

        # 2. Temporal Matching
        ev_start = _parse_date(ev.get("start_date"))
        ev_end = _parse_date(ev.get("end_date")) or ev_start

        if not ev_start:
            continue

        # Direct overlap: ref_dt within [ev_start, ev_end]
        if ev_start <= ref_dt <= ev_end:
            best_match = ev
            best_status = "NATURAL_EVENT_CONTEXT_MATCH"
            best_temporal_rel = "OVERLAPPING_EVENT_PERIOD"
            best_temporal_desc = (
                f"Direct temporal overlap: {ref_label} ({ref_dt.strftime('%d %b %Y')}) falls within "
                f"the documented event period ({ev_start.strftime('%d %b %Y')} – {ev_end.strftime('%d %b %Y')})."
            )
            break  # Found exact match

        # Immediate aftermath: ref_dt within 14 days post event
        aftermath_end = ev_end + timedelta(days=14)
        if ev_end < ref_dt <= aftermath_end:
            days_after = (ref_dt - ev_end).days
            best_match = ev
            best_status = "NATURAL_EVENT_CONTEXT_POSSIBLE"
            best_temporal_rel = "IMMEDIATE_AFTERMATH_WINDOW"
            best_temporal_desc = (
                f"Immediate post-event window: {ref_label} ({ref_dt.strftime('%d %b %Y')}) recorded "
                f"{days_after} day(s) after documented event conclusion ({ev_end.strftime('%d %b %Y')}) within the 14-day immediate post-event window."
            )

    if best_match:
        ev_type = best_match.get("event_type", "Natural Hazard")
        ev_name = best_match.get("event_name", ev_type)
        ev_start_str = best_match.get("start_date")
        ev_end_str = best_match.get("end_date")

        if best_status == "NATURAL_EVENT_CONTEXT_MATCH":
            badge = "Documented Event Overlap"
            explanation = (
                f"An officially documented natural event ({ev_name}, {ev_type}) occurred in {proj_district} "
                f"district during the relevant complaint period. This information provides administrative contextual explanation "
                f"for human review and does not establish causation or damage responsibility."
            )
        else:
            badge = "Possible Event Context"
            explanation = (
                f"An officially documented natural event ({ev_name}, {ev_type}) occurred in {proj_district} "
                f"near the relevant timeframe (within 14-day immediate post-event window). This provides contextual information "
                f"for review and does not establish causation."
            )

        return {
            "source_record_id": source_rec_id,
            "complaint_id": complaint_rec_id,
            "status": best_status,
            "signal_status": best_status,
            "signal_badge": badge,
            "has_event_context": True,
            "has_event_match": True,
            "event_id": best_match.get("event_id"),
            "event_type": ev_type,
            "event_name": ev_name,
            "event_start": ev_start_str,
            "event_end": ev_end_str,
            "district": proj_district,
            "matched_district": proj_district,
            "state": proj_state,
            "matched_state": proj_state,
            "spatial_relation": "DISTRICT_MATCH",
            "temporal_relation": best_temporal_rel,
            "temporal_description": best_temporal_desc,
            "source_name": best_match.get("source_name", "India Meteorological Department (IMD)"),
            "source_url": best_match.get("source_url", "https://mausam.imd.gov.in"),
            "source_reference": best_match.get("source_reference"),
            "provenance": best_match.get("provenance_status", "AUTHENTIC_OFFICIAL_RECORD"),
            "provenance_status": best_match.get("provenance_status", "AUTHENTIC_OFFICIAL_RECORD"),
            "description": best_match.get("description"),
            "explanation": explanation,
            "limitations": LIMITATIONS_TEXT,
            "disclaimer": DISCLAIMER_TEXT,
        }

    # No event found
    return {
        "source_record_id": source_rec_id,
        "complaint_id": complaint_rec_id,
        "status": "NATURAL_EVENT_CONTEXT_NOT_FOUND",
        "signal_status": "NATURAL_EVENT_CONTEXT_NOT_FOUND",
        "signal_badge": "No Documented Events",
        "has_event_context": False,
        "has_event_match": False,
        "event_id": None,
        "event_type": None,
        "event_name": None,
        "event_start": None,
        "event_end": None,
        "district": proj_district,
        "matched_district": proj_district,
        "state": proj_state,
        "matched_state": proj_state,
        "spatial_relation": "NO_DISTRICT_EVENT_MATCH",
        "temporal_relation": best_temporal_rel,
        "temporal_description": best_temporal_desc,
        "source_name": "Official Meteorological Registry (IMD/NDMA)",
        "source_url": "https://mausam.imd.gov.in",
        "source_reference": "National Weather & Cyclone Reports (RSMC/NDMA)",
        "provenance": "OFFICIAL_REGISTRY_SEARCHED",
        "provenance_status": "OFFICIAL_REGISTRY_SEARCHED",
        "description": None,
        "explanation": f"No documented extreme meteorological events were identified for {proj_district} during the evaluated period.",
        "limitations": LIMITATIONS_TEXT,
        "disclaimer": DISCLAIMER_TEXT,
    }
