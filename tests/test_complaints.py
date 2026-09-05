"""Comprehensive Test Suite for Phase 4: Complaints Database & Backend API.

Verifies:
- Separation of governance/complaint layer from frozen analytical engine
- Strict Category and Description validation
- Complaint ID generation format (MPLADS-2026-XXXXXX)
- Linked allocation verification (valid vs invalid)
- Enforced server-side state transitions (SUBMITTED -> ACKNOWLEDGED -> UNDER_REVIEW -> ...)
- MP actions (acknowledge, remark, request field verification)
- Authority actions (status updates, officer notes)
- Complaint listing, querying, and filtering
"""

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database import SessionLocal
from backend.app.models import Project, RiskScore, RiskFlag

client = TestClient(app)


@pytest.fixture
def valid_project_source_id():
    """Fetches an existing project source_record_id from the database."""
    db = SessionLocal()
    try:
        project = db.query(Project).first()
        assert project is not None, "A valid project record must exist in the database."
        return project.source_record_id
    finally:
        db.close()


def test_complaints_categories_and_statuses_metadata():
    """Verify categories and statuses metadata endpoints."""
    res_cat = client.get("/api/complaints/categories")
    assert res_cat.status_code == 200
    categories = res_cat.json()
    assert len(categories) == 9
    cat_keys = [c["key"] for c in categories]
    assert "WORK_NOT_FOUND" in cat_keys
    assert "QUALITY_CONCERN" in cat_keys
    assert "UTILIZATION_CONCERN" in cat_keys
    assert "OTHER" in cat_keys

    res_stat = client.get("/api/complaints/statuses")
    assert res_stat.status_code == 200
    statuses = res_stat.json()
    stat_keys = [s["key"] for s in statuses]
    assert "SUBMITTED" in stat_keys
    assert "ACKNOWLEDGED" in stat_keys
    assert "UNDER_REVIEW" in stat_keys
    assert "RESOLVED" in stat_keys


def test_complaint_submission_validation_errors():
    """Test validation errors for invalid category, short/whitespace description, and non-existent allocation."""
    # 1. Invalid Category
    res = client.post("/api/complaints", json={
        "category": "BOGUS_CATEGORY",
        "description": "This is a valid length description with more than 20 characters.",
    })
    assert res.status_code == 422

    # 2. Short description (< 20 chars)
    res = client.post("/api/complaints", json={
        "category": "WORK_NOT_FOUND",
        "description": "Too short",
    })
    assert res.status_code == 422

    # 3. Whitespace-only description
    res = client.post("/api/complaints", json={
        "category": "WORK_NOT_FOUND",
        "description": "                        ",
    })
    assert res.status_code == 422

    # 4. Non-existent linked allocation ID
    res = client.post("/api/complaints", json={
        "category": "WORK_NOT_FOUND",
        "description": "The community hall was never constructed at the specified site.",
        "linked_allocation_id": "NON_EXISTENT_ALLOCATION_9999"
    })
    assert res.status_code == 400
    assert "does not exist" in res.json()["detail"]


def test_complaint_lifecycle_and_state_transitions(valid_project_source_id):
    """Test end-to-end complaint submission, MP workflows, and enforced authority state transitions."""
    # 1. Citizen submits valid complaint linked to allocation
    payload = {
        "category": "WORK_NOT_FOUND",
        "description": "Field visit confirms no solar high mast lighting was installed at this location.",
        "linked_allocation_id": valid_project_source_id
    }
    create_res = client.post("/api/complaints", json=payload)
    assert create_res.status_code == 201
    c_data = create_res.json()
    
    complaint_id = c_data["complaint_id"]
    assert complaint_id.startswith("MPLADS-2026-")
    assert len(complaint_id) == 18  # MPLADS-2026-XXXXXX
    assert c_data["status"] == "SUBMITTED"
    assert c_data["linked_allocation_id"] == valid_project_source_id
    assert c_data["mp_name"] is not None
    assert c_data["state"] is not None

    # 2. Invalid Transition: Attempt direct resolution from SUBMITTED (must fail)
    invalid_res = client.post(f"/api/complaints/{complaint_id}/status", json={
        "status": "RESOLVED",
        "reason": "Direct jump should be forbidden"
    })
    assert invalid_res.status_code == 400
    assert "Invalid status transition" in invalid_res.json()["detail"]

    # 3. MP Acknowledges complaint with remark
    ack_res = client.post(f"/api/complaints/{complaint_id}/acknowledge", json={
        "remark": "I have taken note of this report and instructed the local Nodal Officer to inspect."
    })
    assert ack_res.status_code == 200
    ack_data = ack_res.json()
    assert ack_data["status"] == "ACKNOWLEDGED"
    assert ack_data["acknowledged_at"] is not None
    assert "instructed the local Nodal Officer" in ack_data["mp_remark"]

    # 4. MP Requests field verification
    verify_res = client.post(f"/api/complaints/{complaint_id}/request-verification")
    assert verify_res.status_code == 200
    verify_data = verify_res.json()
    assert verify_data["verification_requested"] == 1
    assert verify_data["verification_requested_at"] is not None

    # 5. MP adds additional remark
    remark_res = client.post(f"/api/complaints/{complaint_id}/remark", json={
        "remark": "Followed up with District Magistrate regarding inspection status."
    })
    assert remark_res.status_code == 200
    assert "Followed up with District Magistrate" in remark_res.json()["mp_remark"]

    # 6. Authority moves status to UNDER_REVIEW
    review_res = client.post(f"/api/complaints/{complaint_id}/status", json={
        "status": "UNDER_REVIEW",
        "reason": "Junior Engineer assigned for physical site verification."
    })
    assert review_res.status_code == 200
    assert review_res.json()["status"] == "UNDER_REVIEW"

    # 7. Authority adds officer note
    note_res = client.post(f"/api/complaints/{complaint_id}/note", json={
        "note": "Site visit scheduled for 15th of next month with Executive Agency team."
    })
    assert note_res.status_code == 200
    assert "Site visit scheduled" in note_res.json()["officer_note"]
    assert note_res.json()["officer_note_at"] is not None

    # 8. Authority transitions to EVIDENCE_REQUESTED
    ev_res = client.post(f"/api/complaints/{complaint_id}/status", json={
        "status": "EVIDENCE_REQUESTED",
        "reason": "Requesting measurement book and geo-tagged photographs from implementing agency."
    })
    assert ev_res.status_code == 200
    assert ev_res.json()["status"] == "EVIDENCE_REQUESTED"

    # 9. Authority transitions to RESOLVED
    resolve_res = client.post(f"/api/complaints/{complaint_id}/status", json={
        "status": "RESOLVED",
        "reason": "Field inspection completed; rectified installation verified by Executive Engineer."
    })
    assert resolve_res.status_code == 200
    resolve_data = resolve_res.json()
    assert resolve_data["status"] == "RESOLVED"
    assert resolve_data["resolved_at"] is not None


def test_complaint_unlinked_and_query_filters():
    """Verify complaint creation without linked allocation, and list filtering."""
    # Create unlinked complaint
    res = client.post("/api/complaints", json={
        "category": "UTILIZATION_CONCERN",
        "description": "General community observation regarding delayed unspent balance returns in district."
    })
    assert res.status_code == 201
    c_unlinked = res.json()
    assert c_unlinked["linked_allocation_id"] is None

    # Filter by category
    list_cat = client.get("/api/complaints", params={"category": "UTILIZATION_CONCERN"})
    assert list_cat.status_code == 200
    assert list_cat.json()["total"] >= 1

    # Filter by verification_requested_only
    list_ver = client.get("/api/complaints", params={"verification_requested_only": True})
    assert list_ver.status_code == 200
    for item in list_ver.json()["items"]:
        assert item["verification_requested"] == 1


def test_frozen_analytical_engine_invariance(valid_project_source_id):
    """Verify that complaint creation and updates do NOT alter Model A risk scores or project records."""
    db = SessionLocal()
    try:
        project_before = db.query(Project).filter(Project.source_record_id == valid_project_source_id).first()
        risk_before = db.query(RiskScore).filter(RiskScore.project_id == project_before.id).first()
        
        sanctioned_cost_before = project_before.sanctioned_cost
        expenditure_before = project_before.expenditure
        total_risk_score_before = risk_before.total_score if risk_before else None
        risk_level_before = risk_before.risk_level if risk_before else None
    finally:
        db.close()

    # Submit complaint on this project
    create_res = client.post("/api/complaints", json={
        "category": "COST_CONCERN",
        "description": "Allegation of inflated contractor bills compared to standard schedule of rates.",
        "linked_allocation_id": valid_project_source_id
    })
    assert create_res.status_code == 201
    complaint_id = create_res.json()["complaint_id"]

    # Perform MP & Authority actions
    client.post(f"/api/complaints/{complaint_id}/acknowledge")
    client.post(f"/api/complaints/{complaint_id}/request-verification")

    # Verify project and analytical risk records are completely untouched
    db = SessionLocal()
    try:
        project_after = db.query(Project).filter(Project.source_record_id == valid_project_source_id).first()
        risk_after = db.query(RiskScore).filter(RiskScore.project_id == project_after.id).first()

        assert project_after.sanctioned_cost == sanctioned_cost_before
        assert project_after.expenditure == expenditure_before
        if risk_before:
            assert risk_after.total_score == total_risk_score_before
            assert risk_after.risk_level == risk_level_before
    finally:
        db.close()


def test_public_tracking_and_safe_fields(valid_project_source_id):
    """Test public tracking endpoint by complaint ID and verify data consistency."""
    # 1. Create complaint
    create_res = client.post("/api/complaints", json={
        "category": "ASSET_NOT_FOUND",
        "description": "The community borewell and pump set is not present at the surveyed GPS coordinates.",
        "linked_allocation_id": valid_project_source_id
    })
    assert create_res.status_code == 201
    complaint_id = create_res.json()["complaint_id"]

    # 2. Track complaint
    track_res = client.get(f"/api/complaints/{complaint_id}")
    assert track_res.status_code == 200
    track_data = track_res.json()
    assert track_data["complaint_id"] == complaint_id
    assert track_data["category"] == "ASSET_NOT_FOUND"
    assert track_data["category_label"] is not None
    assert track_data["status"] == "SUBMITTED"
    assert track_data["status_label"] == "Submitted"
    assert track_data["linked_allocation_id"] == valid_project_source_id
    assert track_data["constituency"] is not None

    # 3. Non-existent complaint tracking (404)
    non_existent = client.get("/api/complaints/MPLADS-2026-999999")
    assert non_existent.status_code == 404
    assert "not found" in non_existent.json()["detail"].lower()


def test_analytical_engine_baseline_invariance():
    """Verify that complaint table existence does not affect the baseline analytical engine metrics."""
    overview_res = client.get("/api/stats/overview")
    assert overview_res.status_code == 200
    stats = overview_res.json()

    assert stats["total_allocations"] == 1675
    assert stats["total_districts"] == 1015
    assert stats["risk_distribution"]["low"] == 1166
    assert stats["risk_distribution"]["medium"] == 413
    assert stats["risk_distribution"]["high"] == 96
    assert stats["risk_distribution"]["critical"] == 0


def test_phase6_mp_reports_and_constituency_scoping():
    """Phase 6: Verify MP reports scoping, read-only analytical context, remark, and verification request."""
    # Find a project with a constituency
    db = SessionLocal()
    try:
        project = db.query(Project).filter(Project.constituency.isnot(None), Project.constituency != "").first()
        assert project is not None
        source_id = project.source_record_id
        constituency = project.constituency
    finally:
        db.close()

    # Submit complaint on this constituency allocation
    submit_res = client.post("/api/complaints", json={
        "category": "WORK_NOT_FOUND",
        "description": "Constituency field audit reveals no high-mast light at village entrance.",
        "linked_allocation_id": source_id
    })
    assert submit_res.status_code == 201
    complaint_data = submit_res.json()
    complaint_id = complaint_data["complaint_id"]

    # 1. MP queries constituency reports
    mp_list = client.get("/api/complaints", params={"constituency": constituency})
    assert mp_list.status_code == 200
    items = mp_list.json()["items"]
    matching = [i for i in items if i["complaint_id"] == complaint_id]
    assert len(matching) == 1
    assert matching[0]["constituency"] == constituency
    assert matching[0]["risk_score"] is not None or matching[0]["risk_score"] == 0.0 or matching[0]["risk_level"] is not None

    # 2. MP Acknowledges
    ack_res = client.post(f"/api/complaints/{complaint_id}/acknowledge")
    assert ack_res.status_code == 200
    assert ack_res.json()["status"] == "ACKNOWLEDGED"

    # 3. MP Adds Remark
    remark_res = client.post(f"/api/complaints/{complaint_id}/remark", json={
        "remark": "I have instructed the District Development Officer to verify local records."
    })
    assert remark_res.status_code == 200
    assert remark_res.json()["mp_remark"] == "I have instructed the District Development Officer to verify local records."
    assert remark_res.json()["status"] == "ACKNOWLEDGED"  # Remark does NOT alter status

    # 4. MP Requests Field Verification
    ver_res = client.post(f"/api/complaints/{complaint_id}/request-verification")
    assert ver_res.status_code == 200
    assert ver_res.json()["verification_requested"] == 1
    assert ver_res.json()["status"] == "ACKNOWLEDGED"  # Verification request does NOT alter status to EVIDENCE_REQUESTED


def test_phase6_mp_permission_boundaries():
    """Phase 6: Verify MP actions cannot execute official Authority status transitions."""
    # Create complaint
    submit_res = client.post("/api/complaints", json={
        "category": "OTHER",
        "description": "Routine public feedback regarding speed breaker construction on rural road."
    })
    assert submit_res.status_code == 201
    complaint_id = submit_res.json()["complaint_id"]

    # Verification request must NOT change status to EVIDENCE_REQUESTED or RESOLVED
    ver_res = client.post(f"/api/complaints/{complaint_id}/request-verification")
    assert ver_res.status_code == 200
    assert ver_res.json()["verification_requested"] == 1
    assert ver_res.json()["status"] == "SUBMITTED"

    # Direct invalid transition attempt: SUBMITTED -> RESOLVED directly must be rejected by workflow rules
    bad_transition = client.post(f"/api/complaints/{complaint_id}/status", json={
        "status": "RESOLVED",
        "reason": "Direct closure attempt"
    })
    assert bad_transition.status_code == 400
    assert "Invalid status transition" in bad_transition.json()["detail"]


def test_phase6_authority_queue_and_transitions():
    """Phase 6: Verify Authority full queue visibility, filtering, valid transitions, and officer notes."""
    # Create complaint
    submit_res = client.post("/api/complaints", json={
        "category": "QUALITY_CONCERN",
        "description": "Concrete mix quality in school addition appears degraded with surface cracks."
    })
    assert submit_res.status_code == 201
    complaint_id = submit_res.json()["complaint_id"]

    # Authority views queue
    queue_res = client.get("/api/complaints")
    assert queue_res.status_code == 200
    assert any(c["complaint_id"] == complaint_id for c in queue_res.json()["items"])

    # Authority adds officer note
    note_res = client.post(f"/api/complaints/{complaint_id}/note", json={
        "note": "Assigned to Junior Technical Officer for core sample review."
    })
    assert note_res.status_code == 200
    assert "Junior Technical Officer" in note_res.json()["officer_note"]

    # Transition 1: SUBMITTED -> UNDER_REVIEW
    t1 = client.post(f"/api/complaints/{complaint_id}/status", json={
        "status": "UNDER_REVIEW",
        "reason": "Commencing technical review"
    })
    assert t1.status_code == 200
    assert t1.json()["status"] == "UNDER_REVIEW"

    # Transition 2: UNDER_REVIEW -> EVIDENCE_REQUESTED
    t2 = client.post(f"/api/complaints/{complaint_id}/status", json={
        "status": "EVIDENCE_REQUESTED",
        "reason": "Requesting concrete batch test receipts from executing agency"
    })
    assert t2.status_code == 200
    assert t2.json()["status"] == "EVIDENCE_REQUESTED"

    # Transition 3: EVIDENCE_REQUESTED -> RESOLVED
    t3 = client.post(f"/api/complaints/{complaint_id}/status", json={
        "status": "RESOLVED",
        "reason": "Rectification completed by contractor under defect liability."
    })
    assert t3.status_code == 200
    assert t3.json()["status"] == "RESOLVED"
    assert t3.json()["resolved_at"] is not None


def test_phase6_multiple_review_signals_logic():
    """Phase 6: Verify ⭐ Multiple Review Signals is present ONLY when complaint + analytical flag coexist."""
    db = SessionLocal()
    try:
        # Find a project with analytical risk flags
        flagged_project = (
            db.query(Project)
            .join(RiskFlag, Project.id == RiskFlag.project_id)
            .first()
        )
        assert flagged_project is not None
        flagged_source_id = flagged_project.source_record_id

        # Find a project WITHOUT analytical risk flags
        unflagged_project = (
            db.query(Project)
            .filter(~Project.id.in_(db.query(RiskFlag.project_id)))
            .first()
        )
        unflagged_source_id = unflagged_project.source_record_id if unflagged_project else None
    finally:
        db.close()

    # 1. Complaint linked to flagged project -> multiple_review_signals == True
    res_flagged = client.post("/api/complaints", json={
        "category": "COST_CONCERN",
        "description": "Allegation of inflated financial expenditure for civil road works.",
        "linked_allocation_id": flagged_source_id
    })
    assert res_flagged.status_code == 201
    assert res_flagged.json()["multiple_review_signals"] is True
    assert res_flagged.json()["has_analytical_flags"] is True
    assert len(res_flagged.json()["reasons"]) > 0

    # 2. Unlinked complaint -> multiple_review_signals == False
    res_unlinked = client.post("/api/complaints", json={
        "category": "OTHER",
        "description": "General civic grievance without specific allocation reference code."
    })
    assert res_unlinked.status_code == 201
    assert res_unlinked.json()["multiple_review_signals"] is False

    # 3. If unflagged project exists -> multiple_review_signals == False
    if unflagged_source_id:
        res_unflagged = client.post("/api/complaints", json={
            "category": "WORK_DELAYED",
            "description": "Observation of slow work pace on allocation without existing analytical flags.",
            "linked_allocation_id": unflagged_source_id
        })
        assert res_unflagged.status_code == 201
        assert res_unflagged.json()["multiple_review_signals"] is False


def test_phase6_analytical_isolation_and_invariance(valid_project_source_id):
    """Phase 6: Verify complaint operations do NOT alter Model A, risk scores, or duplicate candidate stats."""
    db = SessionLocal()
    try:
        project_before = db.query(Project).filter(Project.source_record_id == valid_project_source_id).first()
        risk_score_before = db.query(RiskScore).filter(RiskScore.project_id == project_before.id).first()
        score_val_before = risk_score_before.total_score if risk_score_before else 0.0
        level_val_before = risk_score_before.risk_level if risk_score_before else "Low"
    finally:
        db.close()

    # Perform full lifecycle of complaint on this project
    sub_res = client.post("/api/complaints", json={
        "category": "WORK_NOT_FOUND",
        "description": "Testing strict analytical isolation across full lifecycle operations.",
        "linked_allocation_id": valid_project_source_id
    })
    cid = sub_res.json()["complaint_id"]
    client.post(f"/api/complaints/{cid}/acknowledge")
    client.post(f"/api/complaints/{cid}/remark", json={"remark": "MP inspection noted."})
    client.post(f"/api/complaints/{cid}/request-verification")
    client.post(f"/api/complaints/{cid}/note", json={"note": "Internal engineering report received."})
    client.post(f"/api/complaints/{cid}/status", json={"status": "UNDER_REVIEW", "reason": "Triage"})
    client.post(f"/api/complaints/{cid}/status", json={"status": "RESOLVED", "reason": "Completed"})

    # Check analytical scores
    db = SessionLocal()
    try:
        project_after = db.query(Project).filter(Project.source_record_id == valid_project_source_id).first()
        risk_score_after = db.query(RiskScore).filter(RiskScore.project_id == project_after.id).first()
        score_val_after = risk_score_after.total_score if risk_score_after else 0.0
        level_val_after = risk_score_after.risk_level if risk_score_after else "Low"

        assert score_val_after == score_val_before
        assert level_val_after == level_val_before
    finally:
        db.close()

    # Check global overview stats are unchanged
    overview_res = client.get("/api/stats/overview")
    assert overview_res.status_code == 200
    stats = overview_res.json()
    assert stats["total_allocations"] == 1675
    assert stats["risk_distribution"]["low"] == 1166
    assert stats["risk_distribution"]["medium"] == 413
    assert stats["risk_distribution"]["high"] == 96
    assert stats["risk_distribution"]["critical"] == 0


def test_phase7_evidence_upload_and_metadata(valid_project_source_id):
    """Phase 7: Test photo evidence upload, image validation, metadata extraction, and file retrieval."""
    import io
    from PIL import Image

    # 1. Create a valid test JPEG image in memory
    img = Image.new("RGB", (320, 240), color=(73, 109, 137))
    img_bytes = io.BytesIO()
    img.save(img_bytes, format="JPEG")
    img_bytes.seek(0)

    # 2. Submit multipart form complaint with photo and GPS
    files = {
        "photo": ("site_evidence.jpg", img_bytes.getvalue(), "image/jpeg")
    }
    data = {
        "category": "WORK_INCOMPLETE",
        "description": "Photographic inspection of the half-constructed health sub-centre building.",
        "linked_allocation_id": valid_project_source_id,
        "latitude": "28.6139",
        "longitude": "77.2090",
        "location_accuracy_meters": "12.5"
    }

    res = client.post("/api/complaints", data=data, files=files)
    assert res.status_code == 201
    c_data = res.json()
    cid = c_data["complaint_id"]

    assert c_data["evidence"] is not None
    assert c_data["evidence"]["has_photo"] is True
    assert c_data["evidence"]["has_gps"] is True
    assert c_data["evidence"]["image_width"] == 320
    assert c_data["evidence"]["image_height"] == 240
    assert c_data["evidence"]["mime_type"] == "image/jpeg"
    assert c_data["evidence"]["latitude"] == 28.6139
    assert c_data["evidence"]["longitude"] == 77.2090
    assert c_data["evidence"]["location_review_status"] in ["LOCATION_CONTEXT_AVAILABLE", "LOCATION_REQUIRES_REVIEW"]

    # 3. Retrieve evidence file via API
    file_res = client.get(f"/api/complaints/{cid}/evidence/file")
    assert file_res.status_code == 200
    assert file_res.headers["content-type"] == "image/jpeg"
    assert len(file_res.content) > 0


def test_phase7_evidence_validation_rules(valid_project_source_id):
    """Phase 7: Test file format validation (reject non-images) and optional GPS submission."""
    # 1. Submit invalid file (e.g. text file disguised as image or raw text)
    invalid_file = {
        "photo": ("not_an_image.txt", b"This is not a real JPEG image file.", "text/plain")
    }
    data = {
        "category": "QUALITY_CONCERN",
        "description": "Testing rejection of non-image file formats during submission.",
        "linked_allocation_id": valid_project_source_id
    }
    res_bad = client.post("/api/complaints", data=data, files=invalid_file)
    assert res_bad.status_code in [422, 400]

    # 2. Submit GPS coordinates without photo (GPS-only observation)
    data_gps_only = {
        "category": "WORK_DELAYED",
        "description": "Geo-tagged physical observation without camera evidence attached.",
        "linked_allocation_id": valid_project_source_id,
        "latitude": "19.0760",
        "longitude": "72.8777",
        "location_accuracy_meters": "8.0"
    }
    res_gps = client.post("/api/complaints", data=data_gps_only)
    assert res_gps.status_code == 201
    gps_data = res_gps.json()
    assert gps_data["evidence"]["has_photo"] is False
    assert gps_data["evidence"]["has_gps"] is True
    assert gps_data["evidence"]["latitude"] == 19.0760
    assert gps_data["evidence"]["longitude"] == 72.8777


def test_phase7_repeated_reports_and_allocation_summary(valid_project_source_id):
    """Phase 7: Test multiple reports on same allocation and allocation summary endpoint."""
    # Submit first report
    client.post("/api/complaints", json={
        "category": "WORK_NOT_FOUND",
        "description": "First observation submitted by community member regarding this site.",
        "linked_allocation_id": valid_project_source_id
    })

    # Submit second report
    client.post("/api/complaints", json={
        "category": "COST_CONCERN",
        "description": "Second independent observation noting cost discrepancies for same work.",
        "linked_allocation_id": valid_project_source_id
    })

    # Query allocation summary
    summary_res = client.get(f"/api/complaints/allocation/{valid_project_source_id}/summary")
    assert summary_res.status_code == 200
    s_data = summary_res.json()
    assert s_data["source_record_id"] == valid_project_source_id
    assert s_data["total_reports"] >= 2
    assert s_data["has_reports"] is True
    assert len(s_data["categories"]) >= 1


def test_phase7_location_distance_and_review_status():
    """Phase 7: Test deterministic Haversine distance logic and location status."""
    from backend.app.services.evidence_service import evaluate_location_consistency, haversine_distance_km

    # Exact distance test: Delhi (28.6139, 77.2090) to Mumbai (19.0760, 72.8777) ~ 1166 km
    dist = haversine_distance_km(28.6139, 77.2090, 19.0760, 72.8777)
    assert 1100 <= dist <= 1200

    # Test status assignment: close (< 100 km)
    close_eval = evaluate_location_consistency(
        browser_lat=28.6139,
        browser_lon=77.2090,
        district_lat=28.6500,
        district_lon=77.2300,
    )
    assert close_eval["location_review_status"] in ["LOCATION_CONSISTENT_CONTEXT", "LOCATION_CONTEXT_AVAILABLE"]
    assert close_eval["distance_from_district_centroid_km"] < 10.0

    # Test status assignment: far (> 100 km)
    far_eval = evaluate_location_consistency(
        browser_lat=28.6139,
        browser_lon=77.2090,
        district_lat=19.0760,
        district_lon=72.8777,
    )
    assert far_eval["location_review_status"] == "LOCATION_REQUIRES_REVIEW"
    assert far_eval["distance_from_district_centroid_km"] > 1000.0

    # Test status assignment: no coords
    none_eval = evaluate_location_consistency(
        browser_lat=None,
        browser_lon=None,
        district_lat=28.6500,
        district_lon=77.2300,
    )
    assert none_eval["location_review_status"] == "LOCATION_DATA_UNAVAILABLE"


