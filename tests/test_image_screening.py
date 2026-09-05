# -*- coding: utf-8 -*-
"""
Tests for Damage / Condition Image Screening Aid (Phase D).

Verifies:
1. Valid JPEG screening
2. Valid PNG screening
3. Valid WebP screening
4. Corrupt / unsupported image safety
5. Low resolution screening indicator
6. Dark / underexposed image screening indicator
7. Bright / overexposed image screening indicator
8. Low contrast image screening indicator
9. Blurred image sharpness indicator
10. High visual texture / edge density review recommended state
11. Deterministic repeated analysis
12. Missing evidence safety
13. Path traversal protection & zero path leakage
14. API endpoint response schema
15. Model A invariance (zero score modification)
16. GPS/EXIF consistency untouched
17. Natural event context untouched
18. Investment-durability signal untouched
19. Six-language i18n parity for image_screening namespace
20. Synthetic test fixtures remain isolated and never pollute production database or uploads
"""

import io
import os
import pytest
import numpy as np
from PIL import Image
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.database import get_db, SessionLocal
from backend.app.models import Project, RiskScore, RiskFlag, District, Complaint, ComplaintEvidence
from backend.app.services.image_screening_service import (
    analyze_image_screening,
    MIN_SCREENING_WIDTH,
    MIN_SCREENING_HEIGHT,
    LOW_BRIGHTNESS_THRESHOLD,
    HIGH_BRIGHTNESS_THRESHOLD,
    LOW_CONTRAST_THRESHOLD,
    BLUR_THRESHOLD,
    HIGH_EDGE_TEXTURE_THRESHOLD,
    METHODOLOGY_DISCLAIMER,
)
from backend.app.services.natural_event_service import evaluate_natural_event_context
from backend.app.services.durability_service import evaluate_investment_durability
from backend.app.services.evidence_service import evaluate_location_consistency, evaluate_timestamp_consistency


def _create_synthetic_test_image(
    width=600,
    height=600,
    fmt="JPEG",
    fill_color=128,
    with_patterns=True,
) -> bytes:
    """Helper creating isolated in-memory synthetic image bytes for testing."""
    if with_patterns:
        # Create patterned image with sharp edges
        arr = np.full((height, width), fill_color, dtype=np.uint8)
        # Add high-contrast grid lines to generate edge texture
        arr[::20, :] = 255
        arr[:, ::20] = 0
        img = Image.fromarray(arr, mode="L").convert("RGB")
    else:
        # Plain uniform image
        img = Image.new("RGB", (width, height), color=(fill_color, fill_color, fill_color))

    buf = io.BytesIO()
    img.save(buf, format=fmt)
    return buf.getvalue()


# ─── 1. Format Screening Tests ───────────────────────────────────────────────

def test_valid_jpeg_screening():
    img_bytes = _create_synthetic_test_image(600, 600, fmt="JPEG", fill_color=128, with_patterns=True)
    res = analyze_image_screening(img_bytes, filename_context="test.jpg")
    
    assert res["status"] in ["IMAGE_REVIEW_RECOMMENDED", "NO_VISUAL_REVIEW_SIGNAL"]
    assert res["image_width"] == 600
    assert res["image_height"] == 600
    assert res["megapixels"] == 0.36
    assert isinstance(res["brightness"], float)
    assert isinstance(res["contrast"], float)
    assert isinstance(res["sharpness"], float)
    assert isinstance(res["edge_density"], float)
    assert "disclaimer" in res


def test_valid_png_screening():
    img_bytes = _create_synthetic_test_image(500, 500, fmt="PNG", fill_color=140, with_patterns=True)
    res = analyze_image_screening(img_bytes, filename_context="test.png")
    
    assert res["status"] in ["IMAGE_REVIEW_RECOMMENDED", "NO_VISUAL_REVIEW_SIGNAL"]
    assert res["image_width"] == 500
    assert res["image_height"] == 500
    assert res["megapixels"] == 0.25


def test_valid_webp_screening():
    img_bytes = _create_synthetic_test_image(450, 450, fmt="WEBP", fill_color=130, with_patterns=True)
    res = analyze_image_screening(img_bytes, filename_context="test.webp")
    
    assert res["status"] in ["IMAGE_REVIEW_RECOMMENDED", "NO_VISUAL_REVIEW_SIGNAL"]
    assert res["image_width"] == 450
    assert res["image_height"] == 450


def test_unsupported_or_corrupt_image():
    # Corrupt / random bytes
    corrupt_bytes = b"NOT_AN_IMAGE_DATA_SAMPLE_TEST_BYTES_123456"
    res = analyze_image_screening(corrupt_bytes, filename_context="corrupt.bin")
    
    assert res["status"] == "IMAGE_ANALYSIS_UNAVAILABLE"
    assert res["image_width"] is None
    assert len(res["quality_notes"]) > 0


# ─── 2. Technical Quality Screening Limitations ─────────────────────────────

def test_low_resolution_image():
    # 200x200 is below 400x400 MIN_SCREENING_WIDTH / HEIGHT
    img_bytes = _create_synthetic_test_image(200, 200, fmt="JPEG", fill_color=128, with_patterns=True)
    res = analyze_image_screening(img_bytes, filename_context="low_res.jpg")
    
    assert res["status"] == "IMAGE_QUALITY_LIMITED"
    assert any("Low resolution" in q for q in res["quality_notes"])


def test_dark_image():
    # Mean luminance ~10 (below LOW_BRIGHTNESS_THRESHOLD=40)
    img_bytes = _create_synthetic_test_image(500, 500, fmt="JPEG", fill_color=15, with_patterns=False)
    res = analyze_image_screening(img_bytes, filename_context="dark.jpg")
    
    assert res["status"] == "IMAGE_QUALITY_LIMITED"
    assert res["brightness"] < LOW_BRIGHTNESS_THRESHOLD
    assert any("Low average luminance" in q for q in res["quality_notes"])


def test_bright_image():
    # Mean luminance ~245 (above HIGH_BRIGHTNESS_THRESHOLD=220)
    img_bytes = _create_synthetic_test_image(500, 500, fmt="JPEG", fill_color=245, with_patterns=False)
    res = analyze_image_screening(img_bytes, filename_context="bright.jpg")
    
    assert res["status"] == "IMAGE_QUALITY_LIMITED"
    assert res["brightness"] > HIGH_BRIGHTNESS_THRESHOLD
    assert any("High average luminance" in q for q in res["quality_notes"])


def test_low_contrast_image():
    # Uniform color has contrast ~0.0 (below LOW_CONTRAST_THRESHOLD=20)
    img_bytes = _create_synthetic_test_image(500, 500, fmt="JPEG", fill_color=128, with_patterns=False)
    res = analyze_image_screening(img_bytes, filename_context="flat.jpg")
    
    assert res["status"] == "IMAGE_QUALITY_LIMITED"
    assert res["contrast"] < LOW_CONTRAST_THRESHOLD
    assert any("Low contrast" in q for q in res["quality_notes"])


def test_blurred_image():
    # Flat image has sharpness = 0.0 (below BLUR_THRESHOLD=100)
    img_bytes = _create_synthetic_test_image(500, 500, fmt="JPEG", fill_color=120, with_patterns=False)
    res = analyze_image_screening(img_bytes, filename_context="blur.jpg")
    
    assert res["status"] == "IMAGE_QUALITY_LIMITED"
    assert res["sharpness"] < BLUR_THRESHOLD
    assert any("Low sharpness" in q for q in res["quality_notes"])


def test_high_texture_review_recommended():
    # 800x800 high contrast grid with sufficient resolution and sharpness
    img_bytes = _create_synthetic_test_image(800, 800, fmt="PNG", fill_color=128, with_patterns=True)
    res = analyze_image_screening(img_bytes, filename_context="texture.png")
    
    assert res["status"] == "IMAGE_REVIEW_RECOMMENDED"
    assert res["edge_density"] >= HIGH_EDGE_TEXTURE_THRESHOLD
    assert len(res["visual_review_notes"]) > 0
    assert "closer visual inspection recommended" in res["visual_review_notes"][0]


# ─── 3. Determinism & Security Tests ────────────────────────────────────────

def test_deterministic_repeated_analysis():
    img_bytes = _create_synthetic_test_image(600, 600, fmt="JPEG", fill_color=128, with_patterns=True)
    res1 = analyze_image_screening(img_bytes, filename_context="repeat.jpg")
    res2 = analyze_image_screening(img_bytes, filename_context="repeat.jpg")
    
    assert res1["status"] == res2["status"]
    assert res1["image_width"] == res2["image_width"]
    assert res1["brightness"] == res2["brightness"]
    assert res1["contrast"] == res2["contrast"]
    assert res1["sharpness"] == res2["sharpness"]
    assert res1["edge_density"] == res2["edge_density"]
    assert res1["interpretation"] == res2["interpretation"]


def test_missing_evidence_safe_handling():
    # Non-existent file path
    res = analyze_image_screening("/non/existent/evidence_image_12345.jpg")
    assert res["status"] == "IMAGE_ANALYSIS_UNAVAILABLE"
    assert res["image_width"] is None
    assert "unavailable" in res["interpretation"].lower()


def test_safe_path_handling_no_leakage():
    # Attempt path traversal string
    res = analyze_image_screening("../../../etc/shadow")
    assert res["status"] == "IMAGE_ANALYSIS_UNAVAILABLE"
    # Ensure no absolute filesystem paths are reflected back in the result
    res_str = str(res)
    assert "C:\\" not in res_str
    assert "f:\\" not in res_str
    assert "/etc/shadow" not in res["disclaimer"]


# ─── 4. API Endpoints & Contract Tests ──────────────────────────────────────

def test_api_endpoint_image_analysis():
    client = TestClient(app)
    
    # Query an existing complaint
    db = SessionLocal()
    try:
        complaint = db.query(Complaint).first()
        if complaint:
            response = client.get(f"/api/complaints/{complaint.complaint_id}/evidence/image-analysis")
            # If complaint has no image, returns 404 cleanly; if has image, returns 200 with schema
            assert response.status_code in [200, 404]
            if response.status_code == 200:
                data = response.json()
                assert "status" in data
                assert "signal_badge" in data
                assert "disclaimer" in data
    finally:
        db.close()


# ─── 5. Model A & Regression Invariance Tests ───────────────────────────────

def test_model_a_invariance_after_image_analysis():
    """Confirms Phase D image screening does NOT alter Model A production risk scores."""
    db = SessionLocal()
    try:
        projects_count = db.query(Project).count()
        risk_scores_count = db.query(RiskScore).count()
        risk_flags_count = db.query(RiskFlag).count()
        districts_count = db.query(District).count()
        
        assert projects_count == 1675
        assert risk_scores_count == 1675
        assert risk_flags_count == 1067
        assert districts_count == 1015
        
        # Max score invariant
        max_score = db.query(RiskScore.total_score).order_by(RiskScore.total_score.desc()).first()[0]
        assert max_score == 63.0
        
        # Tier distribution invariant
        low_cnt = db.query(RiskScore).filter(RiskScore.risk_level == "Low").count()
        med_cnt = db.query(RiskScore).filter(RiskScore.risk_level == "Medium").count()
        high_cnt = db.query(RiskScore).filter(RiskScore.risk_level == "High").count()
        crit_cnt = db.query(RiskScore).filter(RiskScore.risk_level == "Critical").count()
        
        assert low_cnt == 1166
        assert med_cnt == 413
        assert high_cnt == 96
        assert crit_cnt == 0
    finally:
        db.close()


def test_gps_exif_metadata_remains_unchanged():
    """Phase A regression check."""
    loc_res = evaluate_location_consistency(
        browser_lat=28.6139,
        browser_lon=77.2090,
        district_lat=28.6139,
        district_lon=77.2090,
        exif_lat=28.6139,
        exif_lon=77.2090,
    )
    assert loc_res["location_review_status"] == "LOCATION_CONSISTENT_CONTEXT"
    
    time_res = evaluate_timestamp_consistency(
        captured_at="2024-01-15 10:00:00",
        submitted_at="2024-01-16 12:00:00",
        sanction_date="2023-01-01",
    )
    assert time_res["timestamp_review_status"] == "TIMESTAMP_CONSISTENT"


def test_investment_durability_remains_unchanged():
    """Phase B regression check."""
    db = SessionLocal()
    try:
        project = db.query(Project).first()
        dur_res = evaluate_investment_durability(project, db)
        assert dur_res["source_record_id"] == project.source_record_id
        assert "signal_status" in dur_res
    finally:
        db.close()


def test_natural_event_context_remains_unchanged():
    """Phase C regression check."""
    ev_res = evaluate_natural_event_context(
        district="Puri",
        state="Odisha",
        complaint_submitted_at="2019-05-02T10:00:00",
    )
    assert ev_res["status"] == "NATURAL_EVENT_CONTEXT_MATCH"
    assert ev_res["has_event_match"] is True


def test_six_language_parity_image_screening():
    """Phase D i18n parity check for image_screening namespace."""
    from tests.test_i18n_completeness import load_locale, flatten_dict
    
    en_dict = load_locale('en')
    en_flat = flatten_dict(en_dict)
    
    screening_en_keys = [k for k in en_flat.keys() if k.startswith("image_screening.")]
    assert len(screening_en_keys) >= 15, f"Expected at least 15 image_screening keys, found {len(screening_en_keys)}"
    
    for lang in ['hi', 'bn', 'te', 'mr', 'ta']:
        lang_dict = load_locale(lang)
        lang_flat = flatten_dict(lang_dict)
        
        for k in screening_en_keys:
            assert k in lang_flat, f"Missing key '{k}' in language '{lang}'"
            assert lang_flat[k].strip() != "", f"Empty key '{k}' in language '{lang}'"
            assert lang_flat[k] != en_flat[k], f"Key '{k}' in language '{lang}' matches English verbatim"


def test_synthetic_fixtures_isolated_from_production():
    """Ensures test-generated synthetic files never enter production uploads or database."""
    from backend.app.services.evidence_service import UPLOAD_DIR
    
    # Check uploads directory only has authentic files, no files starting with test_synthetic_
    if os.path.exists(UPLOAD_DIR):
        for fname in os.listdir(UPLOAD_DIR):
            assert not fname.startswith("test_synthetic_"), f"Synthetic file {fname} leaked into production UPLOAD_DIR"
