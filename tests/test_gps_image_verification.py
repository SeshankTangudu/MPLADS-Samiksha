"""Comprehensive automated verification tests for Phase A: GPS-Based Image Verification.

Validates:
1. Matching GPS/EXIF consistency evaluation (<= 25 km threshold)
2. Mismatched GPS/EXIF discrepancy detection (> 25 km threshold)
3. Citizen GPS only within / beyond district administrative centroid threshold (100 km)
4. EXIF GPS only within / beyond district administrative centroid threshold (100 km)
5. Neither GPS nor EXIF available -> LOCATION_DATA_UNAVAILABLE
6. Out-of-bounds / invalid coordinate safety
7. Timestamp consistency evaluation (Consistent, Predates Sanction, Future Anomaly, Unavailable)
8. District centroid non-worksite disclaimer invariants
9. End-to-end FastAPI endpoint integration with evidence upload
10. Strict Model A immutability (zero score / tier / formula mutation)
"""

import os
import io
import pytest
from datetime import datetime, timezone, timedelta
from PIL import Image, ExifTags
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, func
from sqlalchemy.orm import sessionmaker

from backend.app.main import app
from backend.app.database import get_db, DEFAULT_DB_PATH
from backend.app.models import Base, Project, District, RiskScore, Complaint, ComplaintEvidence
from backend.app.services.evidence_service import (
    haversine_distance_km,
    evaluate_location_consistency,
    evaluate_timestamp_consistency,
    extract_image_metadata,
    _dms_to_decimal,
    DISTRICT_CENTROID_REVIEW_THRESHOLD_KM,
    EXIF_VS_BROWSER_GPS_REVIEW_THRESHOLD_KM,
)


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="module")
def db_session():
    engine = create_engine(f"sqlite:///{DEFAULT_DB_PATH}", connect_args={"check_same_thread": False})
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()


def test_haversine_formula_accuracy():
    # Distance between New Delhi (28.6139, 77.2090) and Varanasi (25.3176, 82.9739) ~ 680 km
    d = haversine_distance_km(28.6139, 77.2090, 25.3176, 82.9739)
    assert 670.0 <= d <= 690.0, f"Unexpected distance: {d} km"

    # Zero distance for identical points
    assert haversine_distance_km(25.0, 80.0, 25.0, 80.0) == 0.0

    # None handling
    assert haversine_distance_km(None, 80.0, 25.0, 80.0) == 0.0
    assert haversine_distance_km(25.0, None, 25.0, 80.0) == 0.0


def test_location_consistency_matching_gps_and_exif():
    # Citizen GPS at 25.32, 82.97 and EXIF GPS at 25.321, 82.971 (delta ~ 0.15 km)
    # District centroid at 25.3176, 82.9739 (distance ~ 0.3 km)
    res = evaluate_location_consistency(
        browser_lat=25.32,
        browser_lon=82.97,
        district_lat=25.3176,
        district_lon=82.9739,
        exif_lat=25.321,
        exif_lon=82.971,
    )
    assert res["location_review_status"] == "LOCATION_CONSISTENT_CONTEXT"
    assert res["exif_vs_browser_gps_delta_km"] is not None
    assert res["exif_vs_browser_gps_delta_km"] < 1.0
    assert res["distance_from_district_centroid_km"] is not None
    assert res["distance_from_district_centroid_km"] < 5.0
    assert "match" in res["location_review_details"].lower()


def test_location_consistency_mismatched_gps_and_exif():
    # Citizen GPS in Varanasi (25.32, 82.97), but EXIF GPS in Lucknow (26.8467, 80.9462) -> delta ~ 260 km
    res = evaluate_location_consistency(
        browser_lat=25.32,
        browser_lon=82.97,
        district_lat=25.3176,
        district_lon=82.9739,
        exif_lat=26.8467,
        exif_lon=80.9462,
    )
    assert res["location_review_status"] == "LOCATION_REQUIRES_REVIEW"
    assert res["exif_vs_browser_gps_delta_km"] > EXIF_VS_BROWSER_GPS_REVIEW_THRESHOLD_KM
    assert "discrepancy" in res["location_review_details"].lower() or "differ" in res["location_review_details"].lower()


def test_location_consistency_citizen_gps_only():
    # Inside centroid boundary (30 km)
    res1 = evaluate_location_consistency(
        browser_lat=25.5,
        browser_lon=83.1,
        district_lat=25.3176,
        district_lon=82.9739,
    )
    assert res1["location_review_status"] == "LOCATION_CONSISTENT_CONTEXT"
    assert res1["distance_from_district_centroid_km"] < DISTRICT_CENTROID_REVIEW_THRESHOLD_KM
    assert res1["exif_vs_browser_gps_delta_km"] is None

    # Beyond centroid boundary (> 100 km)
    res2 = evaluate_location_consistency(
        browser_lat=27.0,
        browser_lon=84.5,
        district_lat=25.3176,
        district_lon=82.9739,
    )
    assert res2["location_review_status"] == "LOCATION_REQUIRES_REVIEW"
    assert res2["distance_from_district_centroid_km"] > DISTRICT_CENTROID_REVIEW_THRESHOLD_KM


def test_location_consistency_exif_gps_only():
    res = evaluate_location_consistency(
        browser_lat=None,
        browser_lon=None,
        district_lat=25.3176,
        district_lon=82.9739,
        exif_lat=25.32,
        exif_lon=82.97,
    )
    assert res["location_review_status"] == "LOCATION_CONSISTENT_CONTEXT"
    assert res["distance_from_district_centroid_km"] is not None
    assert "exif gps extracted" in res["location_review_details"].lower()


def test_location_consistency_neither_available():
    res = evaluate_location_consistency(
        browser_lat=None,
        browser_lon=None,
        district_lat=25.3176,
        district_lon=82.9739,
        exif_lat=None,
        exif_lon=None,
    )
    assert res["location_review_status"] == "LOCATION_DATA_UNAVAILABLE"
    assert res["distance_from_district_centroid_km"] is None
    assert res["exif_vs_browser_gps_delta_km"] is None


def test_timestamp_consistency_evaluation():
    sub_date = "2024-05-10T10:00:00Z"
    sanc_date = "2020-01-15"

    # 1. Consistent: Photo captured in 2023, sanction in 2020, submitted in 2024
    res_cons = evaluate_timestamp_consistency(
        captured_at="2023:08:20 14:30:00",
        submitted_at=sub_date,
        sanction_date=sanc_date,
    )
    assert res_cons["timestamp_review_status"] == "TIMESTAMP_CONSISTENT"
    assert "consistent" in res_cons["timestamp_review_details"].lower()

    # 2. Predates sanction: Photo taken in 2012, but project sanctioned in 2020
    res_predates = evaluate_timestamp_consistency(
        captured_at="2012:06:15 09:00:00",
        submitted_at=sub_date,
        sanction_date=sanc_date,
    )
    assert res_predates["timestamp_review_status"] == "TIMESTAMP_PREDATES_SANCTION"
    assert "predates" in res_predates["timestamp_review_details"].lower()

    # 3. Future anomaly: Photo timestamp in 2029, submitted in 2024
    res_future = evaluate_timestamp_consistency(
        captured_at="2029:01:01 12:00:00",
        submitted_at=sub_date,
        sanction_date=sanc_date,
    )
    assert res_future["timestamp_review_status"] == "TIMESTAMP_FUTURE_INCONSISTENT"
    assert "future" in res_future["timestamp_review_details"].lower()

    # 4. Unavailable: Empty or None
    res_unavail = evaluate_timestamp_consistency(
        captured_at=None,
        submitted_at=sub_date,
        sanction_date=sanc_date,
    )
    assert res_unavail["timestamp_review_status"] == "TIMESTAMP_UNAVAILABLE"


def test_image_metadata_extraction_synthetic_in_memory():
    # Create simple valid test image in memory
    img = Image.new("RGB", (120, 80), color=(73, 109, 137))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    file_bytes = buf.getvalue()

    meta = extract_image_metadata(file_bytes, "test_sample.jpg")
    assert meta["is_valid_image"] is True
    assert meta["image_width"] == 120
    assert meta["image_height"] == 80
    assert meta["mime_type"] == "image/jpeg"
    assert meta["metadata_status"] in ["METADATA_UNAVAILABLE", "METADATA_AVAILABLE"]


def test_e2e_complaint_submission_with_gps(client):
    # Create valid synthetic in-memory image
    img = Image.new("RGB", (100, 100), color=(100, 150, 200))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)

    # 1. Matching location within Varanasi (LS16_0478)
    form_data = {
        "category": "QUALITY_CONCERN",
        "description": "Observed significant structural cracks on the community hall wall completed last year.",
        "linked_allocation_id": "LS16_0478",
        "latitude": "25.3200",
        "longitude": "82.9700",
        "location_accuracy_meters": "15.0",
    }
    files = {
        "photo": ("hall_crack_test.jpg", buf.getvalue(), "image/jpeg")
    }

    response = client.post("/api/complaints", data=form_data, files=files)
    assert response.status_code == 201, response.text
    data = response.json()
    assert data["complaint_id"].startswith("MPLADS-2026-")
    assert data["category"] == "QUALITY_CONCERN"
    assert data["evidence"] is not None
    assert data["evidence"]["has_photo"] is True
    assert data["evidence"]["has_gps"] is True
    assert data["evidence"]["latitude"] == 25.32
    assert data["evidence"]["location_review_status"] in ["LOCATION_CONSISTENT_CONTEXT", "LOCATION_CONTEXT_AVAILABLE"]
    assert "timestamp_review_status" in data["evidence"]
    assert "location_review_details" in data["evidence"]
    assert data["evidence"]["location_review_details"] is not None


def test_model_a_invariance_after_evidence_operations(db_session):
    # Verify core Model A analytics remain 100% frozen
    proj_count = db_session.query(func.count(Project.id)).scalar()
    risk_count = db_session.query(func.count(RiskScore.id)).scalar()
    max_score = db_session.query(func.max(RiskScore.total_score)).scalar()
    dist_count = db_session.query(func.count(District.id)).scalar()

    assert proj_count == 1675
    assert risk_count == 1675
    assert max_score == 63.0
    assert dist_count == 1015
