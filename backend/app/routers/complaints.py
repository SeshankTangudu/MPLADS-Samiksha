import os
import secrets
import math
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Request, UploadFile, File, Form, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from backend.app.database import get_db
from backend.app.models import Complaint, ComplaintEvidence, Project, District, RiskFlag, RiskScore
from backend.app.schemas import (
    ALLOWED_COMPLAINT_CATEGORIES,
    ALLOWED_COMPLAINT_STATUSES,
    CATEGORY_LABELS,
    STATUS_LABELS,
    ComplaintCategoryMetaSchema,
    ComplaintStatusMetaSchema,
    ComplaintCreateSchema,
    ComplaintResponseSchema,
    ComplaintListResponseSchema,
    EvidenceResponseSchema,
    EvidencePublicSafeSchema,
    AllocationReportSummarySchema,
    MPAcknowledgeRequestSchema,
    MPRemarkRequestSchema,
    OfficerNoteRequestSchema,
    StatusUpdateRequestSchema,
)
from backend.app.services.evidence_service import (
    extract_image_metadata,
    evaluate_location_consistency,
    evaluate_timestamp_consistency,
    save_evidence_file,
    calculate_nearby_reports,
    get_allocation_report_summary,
    ALLOWED_MIME_TYPES,
    MAX_FILE_SIZE_BYTES,
    UPLOAD_DIR,
)
from backend.app.services.natural_event_service import evaluate_natural_event_context

router = APIRouter(prefix="/complaints", tags=["Complaints & Governance"])

# Enforced server-side state transition matrix
VALID_STATUS_TRANSITIONS = {
    "SUBMITTED": ["ACKNOWLEDGED", "UNDER_REVIEW", "FALSE_POSITIVE_INVALID"],
    "ACKNOWLEDGED": ["UNDER_REVIEW", "FALSE_POSITIVE_INVALID"],
    "UNDER_REVIEW": ["EVIDENCE_REQUESTED", "ESCALATED", "RESOLVED", "FALSE_POSITIVE_INVALID"],
    "EVIDENCE_REQUESTED": ["UNDER_REVIEW", "ESCALATED", "RESOLVED", "FALSE_POSITIVE_INVALID"],
    "ESCALATED": ["UNDER_REVIEW", "RESOLVED", "FALSE_POSITIVE_INVALID"],
    "RESOLVED": ["UNDER_REVIEW"],
    "FALSE_POSITIVE_INVALID": ["UNDER_REVIEW"],
}


def _generate_unique_complaint_id(db: Session) -> str:
    """Generates a stable, unique complaint ID in format MPLADS-2026-XXXXXX."""
    for _ in range(10):
        # 6-digit unique number
        num = secrets.randbelow(900000) + 100000
        candidate_id = f"MPLADS-2026-{num}"
        exists = db.query(Complaint.id).filter(Complaint.complaint_id == candidate_id).first()
        if not exists:
            return candidate_id
    
    # Fallback to timestamp-based sequence if collisions occur
    seq = db.query(func.count(Complaint.id)).scalar() + 100001
    return f"MPLADS-2026-{seq}"


def _build_complaint_response(complaint: Complaint, db: Session) -> ComplaintResponseSchema:
    """Enriches complaint model with human-readable labels, analytical context, and evidence metadata."""
    linked_project = None
    risk_score_val = None
    risk_level_val = None
    flags_count = 0
    reasons_list = []
    allocation_reports_count = 0

    if complaint.linked_allocation_id:
        linked_project = db.query(Project).filter(Project.source_record_id == complaint.linked_allocation_id).first()
        if linked_project:
            if linked_project.risk_score:
                risk_score_val = linked_project.risk_score.total_score
                risk_level_val = linked_project.risk_score.risk_level
            if linked_project.risk_flags:
                flags_count = len(linked_project.risk_flags)
                reasons_list = [
                    {
                        "flag_type": f.flag_type,
                        "severity": f.severity,
                        "title": f.title,
                        "observed_value": f.observed_value,
                        "threshold_value": f.threshold_value,
                        "explanation": f.explanation,
                    }
                    for f in linked_project.risk_flags
                ]
        allocation_reports_count = (
            db.query(func.count(Complaint.id))
            .filter(Complaint.linked_allocation_id == complaint.linked_allocation_id)
            .scalar()
            or 0
        )

    has_flags = flags_count > 0
    multiple_signals = bool(complaint.linked_allocation_id and has_flags)

    # Process Evidence
    evidence_schema = None
    evidence_public_safe = EvidencePublicSafeSchema(has_photo=False, has_gps=False, uploaded_at=None)
    nearby_reports_cnt = 0

    ev = complaint.evidence
    if ev:
        has_gps_coords = ev.latitude is not None and ev.longitude is not None
        has_photo_file = bool(ev.file_path and ev.file_path.strip())
        evidence_public_safe = EvidencePublicSafeSchema(
            has_photo=has_photo_file,
            has_gps=has_gps_coords,
            uploaded_at=ev.uploaded_at,
            location_review_status=ev.location_review_status,
            timestamp_review_status=getattr(ev, "timestamp_review_status", "TIMESTAMP_UNAVAILABLE"),
        )
        evidence_schema = EvidenceResponseSchema(
            id=ev.id,
            complaint_id=ev.complaint_id,
            original_filename=ev.original_filename,
            mime_type=ev.mime_type,
            file_size_bytes=ev.file_size_bytes,
            image_width=ev.image_width,
            image_height=ev.image_height,
            latitude=ev.latitude,
            longitude=ev.longitude,
            location_accuracy_meters=ev.location_accuracy_meters,
            captured_at=ev.captured_at,
            uploaded_at=ev.uploaded_at,
            exif_available=ev.exif_available,
            gps_from_exif=ev.gps_from_exif,
            exif_latitude=ev.exif_latitude,
            exif_longitude=ev.exif_longitude,
            camera_make=ev.camera_make,
            camera_model=ev.camera_model,
            metadata_status=ev.metadata_status,
            location_review_status=ev.location_review_status,
            location_review_details=getattr(ev, "location_review_details", None),
            distance_from_district_centroid_km=ev.distance_from_district_centroid_km,
            exif_vs_browser_gps_delta_km=ev.exif_vs_browser_gps_delta_km,
            timestamp_review_status=getattr(ev, "timestamp_review_status", "TIMESTAMP_UNAVAILABLE"),
            timestamp_review_details=getattr(ev, "timestamp_review_details", None),
            has_photo=has_photo_file,
            has_gps=has_gps_coords,
        )
        if has_gps_coords:
            nearby_reports_cnt = calculate_nearby_reports(db, complaint.complaint_id, ev.latitude, ev.longitude)

    # Natural Event Context Evaluation
    natural_event_ctx = None
    if linked_project:
        ev_captured = ev.captured_at if ev else None
        natural_event_ctx = evaluate_natural_event_context(
            district=linked_project.district,
            state=linked_project.state,
            complaint_submitted_at=complaint.submitted_at,
            evidence_captured_at=ev_captured,
        )

    return ComplaintResponseSchema(
        id=complaint.id,
        complaint_id=complaint.complaint_id,
        linked_allocation_id=complaint.linked_allocation_id,
        category=complaint.category,
        category_label=CATEGORY_LABELS.get(complaint.category, complaint.category),
        description=complaint.description,
        status=complaint.status,
        status_label=STATUS_LABELS.get(complaint.status, complaint.status),
        submitted_at=complaint.submitted_at,
        acknowledged_at=complaint.acknowledged_at,
        mp_remark=complaint.mp_remark,
        mp_remark_at=complaint.mp_remark_at,
        verification_requested=complaint.verification_requested,
        verification_requested_at=complaint.verification_requested_at,
        officer_note=complaint.officer_note,
        officer_note_at=complaint.officer_note_at,
        resolved_at=complaint.resolved_at,
        constituency=linked_project.constituency if linked_project else None,
        district=linked_project.district if linked_project else None,
        state=linked_project.state if linked_project else None,
        mp_name=linked_project.mp_name if linked_project else None,
        lok_sabha_term=linked_project.lok_sabha_term if linked_project else None,
        allocation_category=linked_project.category if linked_project else None,
        sanctioned_cost=linked_project.sanctioned_cost if linked_project else None,
        expenditure=linked_project.expenditure if linked_project else None,
        risk_score=risk_score_val,
        risk_level=risk_level_val,
        flags_count=flags_count,
        has_analytical_flags=has_flags,
        multiple_review_signals=multiple_signals,
        reasons=reasons_list,
        evidence=evidence_schema,
        evidence_public_safe=evidence_public_safe,
        nearby_reports_count=nearby_reports_cnt,
        allocation_reports_count=allocation_reports_count,
        natural_event_context=natural_event_ctx,
    )


@router.get("/categories", response_model=List[ComplaintCategoryMetaSchema])
def get_complaint_categories() -> List[ComplaintCategoryMetaSchema]:
    """Returns the list of validated complaint categories with human-readable descriptions."""
    return [ComplaintCategoryMetaSchema(key=k, label=v) for k, v in CATEGORY_LABELS.items()]


@router.get("/statuses", response_model=List[ComplaintStatusMetaSchema])
def get_complaint_statuses() -> List[ComplaintStatusMetaSchema]:
    """Returns the list of workflow statuses with human-readable labels."""
    return [ComplaintStatusMetaSchema(key=k, label=v) for k, v in STATUS_LABELS.items()]


@router.post("", response_model=ComplaintResponseSchema, status_code=status.HTTP_201_CREATED)
async def submit_complaint(
    request: Request,
    db: Session = Depends(get_db)
) -> ComplaintResponseSchema:
    """Citizen Action: Submits a new public complaint/observation with optional photo & GPS evidence.
    
    Validates category, non-empty description (min 20 chars), linked allocation existence,
    optional image file MIME/size/EXIF metadata, and location consistency.
    """
    content_type = request.headers.get("content-type", "")

    category_val = None
    desc_val = None
    linked_alloc_val = None
    lat_val = None
    lon_val = None
    accuracy_val = None
    photo_file = None

    if "multipart/form-data" in content_type or "application/x-www-form-urlencoded" in content_type:
        form = await request.form()
        category_val = form.get("category")
        desc_val = form.get("description")
        linked_alloc_val = form.get("linked_allocation_id")
        lat_val = form.get("latitude")
        lon_val = form.get("longitude")
        accuracy_val = form.get("location_accuracy_meters") or form.get("accuracy")
        raw_photo = form.get("photo")
        if raw_photo and hasattr(raw_photo, "filename") and raw_photo.filename:
            photo_file = raw_photo
    else:
        try:
            body = await request.json()
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Malformed request payload."
            )
        category_val = body.get("category")
        desc_val = body.get("description")
        linked_alloc_val = body.get("linked_allocation_id")
        lat_val = body.get("latitude")
        lon_val = body.get("longitude")
        accuracy_val = body.get("location_accuracy_meters") or body.get("accuracy")

    # Validate core fields through Pydantic validator
    try:
        validated_data = ComplaintCreateSchema(
            category=category_val if category_val is not None else "",
            description=desc_val if desc_val is not None else "",
            linked_allocation_id=linked_alloc_val if linked_alloc_val else None,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )

    # Validate linked allocation if provided
    if validated_data.linked_allocation_id:
        alloc_clean = validated_data.linked_allocation_id.strip()
        project_exists = db.query(Project.id).filter(Project.source_record_id == alloc_clean).first()
        if not project_exists:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Linked allocation '{alloc_clean}' does not exist in the parliamentary database."
            )
        linked_id = alloc_clean
    else:
        linked_id = None

    # Parse and validate GPS coordinates if provided
    parsed_lat = None
    parsed_lon = None
    parsed_acc = None

    if lat_val is not None and str(lat_val).strip() != "":
        try:
            parsed_lat = float(lat_val)
            if not (-90.0 <= parsed_lat <= 90.0):
                raise ValueError("Latitude out of range [-90, 90].")
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Invalid latitude value. Must be a float between -90.0 and 90.0."
            )

    if lon_val is not None and str(lon_val).strip() != "":
        try:
            parsed_lon = float(lon_val)
            if not (-180.0 <= parsed_lon <= 180.0):
                raise ValueError("Longitude out of range [-180, 180].")
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Invalid longitude value. Must be a float between -180.0 and 180.0."
            )

    if accuracy_val is not None and str(accuracy_val).strip() != "":
        try:
            parsed_acc = float(accuracy_val)
        except Exception:
            pass

    now_iso = datetime.now(timezone.utc).isoformat()
    complaint_id = _generate_unique_complaint_id(db)

    complaint = Complaint(
        complaint_id=complaint_id,
        linked_allocation_id=linked_id,
        category=validated_data.category,
        description=validated_data.description,
        status="SUBMITTED",
        submitted_at=now_iso,
        verification_requested=0,
    )
    db.add(complaint)
    db.flush()

    # Get District centroid coordinates if linked to a project
    dist_lat = None
    dist_lon = None
    if linked_id:
        proj = db.query(Project).filter(Project.source_record_id == linked_id).first()
        if proj and proj.district_rel:
            dist_lat = proj.district_rel.latitude
            dist_lon = proj.district_rel.longitude

    # Handle Photo Evidence if provided
    if photo_file:
        file_bytes = await photo_file.read()
        if len(file_bytes) > MAX_FILE_SIZE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="Uploaded image exceeds maximum allowable limit of 5 MB."
            )

        meta = extract_image_metadata(file_bytes, photo_file.filename or "evidence.jpg")
        if not meta["is_valid_image"] or meta["mime_type"] not in ALLOWED_MIME_TYPES:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Uploaded file is not a valid image format. Supported formats: JPEG, PNG, WebP."
            )

        saved_path = save_evidence_file(file_bytes, photo_file.filename or "evidence.jpg", meta["mime_type"], complaint_id)

        loc_eval = evaluate_location_consistency(
            browser_lat=parsed_lat,
            browser_lon=parsed_lon,
            district_lat=dist_lat,
            district_lon=dist_lon,
            exif_lat=meta["exif_latitude"],
            exif_lon=meta["exif_longitude"],
        )

        time_eval = evaluate_timestamp_consistency(
            captured_at=meta["captured_at"],
            submitted_at=now_iso,
            sanction_date=proj.sanction_date if linked_id and proj else None,
            completion_date=proj.completion_date if linked_id and proj else None,
        )

        evidence = ComplaintEvidence(
            complaint_id=complaint_id,
            file_path=saved_path,
            original_filename=photo_file.filename or "evidence.jpg",
            mime_type=meta["mime_type"],
            file_size_bytes=len(file_bytes),
            image_width=meta["image_width"],
            image_height=meta["image_height"],
            latitude=parsed_lat,
            longitude=parsed_lon,
            location_accuracy_meters=parsed_acc,
            captured_at=meta["captured_at"],
            uploaded_at=now_iso,
            exif_available=meta["exif_available"],
            gps_from_exif=meta["gps_from_exif"],
            exif_latitude=meta["exif_latitude"],
            exif_longitude=meta["exif_longitude"],
            camera_make=meta["camera_make"],
            camera_model=meta["camera_model"],
            metadata_status=meta["metadata_status"],
            location_review_status=loc_eval["location_review_status"],
            location_review_details=loc_eval["location_review_details"],
            distance_from_district_centroid_km=loc_eval["distance_from_district_centroid_km"],
            exif_vs_browser_gps_delta_km=loc_eval["exif_vs_browser_gps_delta_km"],
            timestamp_review_status=time_eval["timestamp_review_status"],
            timestamp_review_details=time_eval["timestamp_review_details"],
        )
        db.add(evidence)
    elif parsed_lat is not None and parsed_lon is not None:
        # Citizen provided GPS without a photo
        loc_eval = evaluate_location_consistency(
            browser_lat=parsed_lat,
            browser_lon=parsed_lon,
            district_lat=dist_lat,
            district_lon=dist_lon,
        )
        evidence = ComplaintEvidence(
            complaint_id=complaint_id,
            file_path="",
            original_filename="",
            mime_type="",
            file_size_bytes=0,
            image_width=None,
            image_height=None,
            latitude=parsed_lat,
            longitude=parsed_lon,
            location_accuracy_meters=parsed_acc,
            captured_at=None,
            uploaded_at=now_iso,
            exif_available=0,
            gps_from_exif=0,
            exif_latitude=None,
            exif_longitude=None,
            camera_make=None,
            camera_model=None,
            metadata_status="METADATA_UNAVAILABLE",
            location_review_status=loc_eval["location_review_status"],
            location_review_details=loc_eval["location_review_details"],
            distance_from_district_centroid_km=loc_eval["distance_from_district_centroid_km"],
            exif_vs_browser_gps_delta_km=None,
            timestamp_review_status="TIMESTAMP_UNAVAILABLE",
            timestamp_review_details="No image attached; timestamp review unavailable.",
        )
        db.add(evidence)

    db.commit()
    db.refresh(complaint)

    return _build_complaint_response(complaint, db)


@router.get("", response_model=ComplaintListResponseSchema)
def list_complaints(
    status: Optional[str] = Query(None, description="Filter by status (e.g. SUBMITTED, UNDER_REVIEW)"),
    category: Optional[str] = Query(None, description="Filter by category"),
    linked_allocation_id: Optional[str] = Query(None, description="Filter by source_record_id"),
    mp_name: Optional[str] = Query(None, description="Filter by MP Name linked to allocation"),
    state: Optional[str] = Query(None, description="Filter by State linked to allocation"),
    district: Optional[str] = Query(None, description="Filter by District linked to allocation"),
    constituency: Optional[str] = Query(None, description="Filter by Constituency linked to allocation"),
    term: Optional[int] = Query(None, description="Filter by Lok Sabha term"),
    risk_tier: Optional[str] = Query(None, description="Filter by analytical Risk Tier (Low, Medium, High)"),
    verification_requested_only: bool = Query(False, description="Filter only where verification was requested"),
    multiple_signals_only: bool = Query(False, description="Filter only records with Multiple Review Signals"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=100, description="Page size limit"),
    db: Session = Depends(get_db)
) -> ComplaintListResponseSchema:
    """Lists complaints with optional filtering by status, category, allocation, MP, or geographic entity."""
    query = db.query(Complaint)

    if status:
        query = query.filter(Complaint.status == status.strip().upper())
    if category:
        query = query.filter(Complaint.category == category.strip().upper())
    if linked_allocation_id:
        query = query.filter(Complaint.linked_allocation_id == linked_allocation_id.strip())
    if verification_requested_only:
        query = query.filter(Complaint.verification_requested == 1)

    # Join with Project if geographic, term, or risk filters applied
    needs_project_join = bool(mp_name or state or district or constituency or term or risk_tier or multiple_signals_only)
    if needs_project_join:
        query = query.join(Project, Complaint.linked_allocation_id == Project.source_record_id)
        if mp_name:
            query = query.filter(Project.mp_name.ilike(f"%{mp_name.strip()}%"))
        if state:
            query = query.filter(Project.state.ilike(f"%{state.strip()}%"))
        if district:
            query = query.filter(Project.district.ilike(f"%{district.strip()}%"))
        if constituency:
            query = query.filter(Project.constituency.ilike(f"%{constituency.strip()}%"))
        if term:
            query = query.filter(Project.lok_sabha_term == term)
        if risk_tier:
            query = query.join(RiskScore, Project.id == RiskScore.project_id).filter(RiskScore.risk_level.ilike(risk_tier.strip()))
        if multiple_signals_only:
            query = query.join(RiskFlag, Project.id == RiskFlag.project_id)

    total = query.count()
    total_pages = math.ceil(total / limit) if total > 0 else 1

    complaints = (
        query.order_by(Complaint.id.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    items = [_build_complaint_response(c, db) for c in complaints]

    return ComplaintListResponseSchema(
        total=total,
        items=items,
        page=page,
        limit=limit,
        total_pages=total_pages
    )


@router.get("/{complaint_id}", response_model=ComplaintResponseSchema)
def get_complaint(
    complaint_id: str,
    db: Session = Depends(get_db)
) -> ComplaintResponseSchema:
    """Public / Portal Action: Retrieve details of a specific complaint by complaint_id."""
    complaint = db.query(Complaint).filter(Complaint.complaint_id == complaint_id.strip()).first()
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Complaint with ID '{complaint_id}' was not found."
        )
    return _build_complaint_response(complaint, db)


@router.post("/{complaint_id}/acknowledge", response_model=ComplaintResponseSchema)
def acknowledge_complaint(
    complaint_id: str,
    payload: Optional[MPAcknowledgeRequestSchema] = None,
    db: Session = Depends(get_db)
) -> ComplaintResponseSchema:
    """MP Action: Acknowledges a citizen complaint and optionally records an initial remark."""
    complaint = db.query(Complaint).filter(Complaint.complaint_id == complaint_id.strip()).first()
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Complaint with ID '{complaint_id}' was not found."
        )

    now_iso = datetime.now(timezone.utc).isoformat()
    complaint.acknowledged_at = now_iso

    # Advance status if in SUBMITTED state
    if complaint.status == "SUBMITTED":
        complaint.status = "ACKNOWLEDGED"

    if payload and payload.remark and payload.remark.strip():
        complaint.mp_remark = payload.remark.strip()
        complaint.mp_remark_at = now_iso

    db.commit()
    db.refresh(complaint)
    return _build_complaint_response(complaint, db)


@router.post("/{complaint_id}/remark", response_model=ComplaintResponseSchema)
def add_mp_remark(
    complaint_id: str,
    payload: MPRemarkRequestSchema,
    db: Session = Depends(get_db)
) -> ComplaintResponseSchema:
    """MP Action: Adds or updates an MP remark on the complaint."""
    complaint = db.query(Complaint).filter(Complaint.complaint_id == complaint_id.strip()).first()
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Complaint with ID '{complaint_id}' was not found."
        )

    now_iso = datetime.now(timezone.utc).isoformat()
    complaint.mp_remark = payload.remark.strip()
    complaint.mp_remark_at = now_iso

    db.commit()
    db.refresh(complaint)
    return _build_complaint_response(complaint, db)


@router.post("/{complaint_id}/request-verification", response_model=ComplaintResponseSchema)
def request_field_verification(
    complaint_id: str,
    db: Session = Depends(get_db)
) -> ComplaintResponseSchema:
    """MP Action: Requests formal administrative field verification for the complaint."""
    complaint = db.query(Complaint).filter(Complaint.complaint_id == complaint_id.strip()).first()
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Complaint with ID '{complaint_id}' was not found."
        )

    now_iso = datetime.now(timezone.utc).isoformat()
    complaint.verification_requested = 1
    complaint.verification_requested_at = now_iso

    db.commit()
    db.refresh(complaint)
    return _build_complaint_response(complaint, db)


@router.post("/{complaint_id}/status", response_model=ComplaintResponseSchema)
def update_complaint_status(
    complaint_id: str,
    payload: StatusUpdateRequestSchema,
    db: Session = Depends(get_db)
) -> ComplaintResponseSchema:
    """Authority Action: Updates complaint workflow status with enforced state transition validation."""
    complaint = db.query(Complaint).filter(Complaint.complaint_id == complaint_id.strip()).first()
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Complaint with ID '{complaint_id}' was not found."
        )

    current_status = complaint.status
    target_status = payload.status

    # Validate transition
    if current_status != target_status:
        allowed_targets = VALID_STATUS_TRANSITIONS.get(current_status, [])
        if target_status not in allowed_targets:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Invalid status transition from '{current_status}' to '{target_status}'. "
                    f"Allowed transitions: {', '.join(allowed_targets) if allowed_targets else 'None (terminal)'}."
                )
            )

    now_iso = datetime.now(timezone.utc).isoformat()
    complaint.status = target_status

    if target_status in ["RESOLVED", "FALSE_POSITIVE_INVALID"]:
        complaint.resolved_at = now_iso

    if payload.reason and payload.reason.strip():
        note_entry = f"[{target_status}] {payload.reason.strip()}"
        if complaint.officer_note:
            complaint.officer_note = f"{complaint.officer_note}\n{note_entry}"
        else:
            complaint.officer_note = note_entry
        complaint.officer_note_at = now_iso

    db.commit()
    db.refresh(complaint)
    return _build_complaint_response(complaint, db)


@router.post("/{complaint_id}/note", response_model=ComplaintResponseSchema)
def add_officer_note(
    complaint_id: str,
    payload: OfficerNoteRequestSchema,
    db: Session = Depends(get_db)
) -> ComplaintResponseSchema:
    """Authority Action: Records administrative officer investigation / review note."""
    complaint = db.query(Complaint).filter(Complaint.complaint_id == complaint_id.strip()).first()
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Complaint with ID '{complaint_id}' was not found."
        )

    now_iso = datetime.now(timezone.utc).isoformat()
    complaint.officer_note = payload.note.strip()
    complaint.officer_note_at = now_iso

    db.commit()
    db.refresh(complaint)
    return _build_complaint_response(complaint, db)


@router.get("/{complaint_id}/evidence/file")
def get_complaint_evidence_file(
    complaint_id: str,
    db: Session = Depends(get_db)
):
    """Retrieves the uploaded image file for an authorized complaint record."""
    complaint = db.query(Complaint).filter(Complaint.complaint_id == complaint_id.strip()).first()
    if not complaint or not complaint.evidence or not complaint.evidence.file_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No media evidence file found for complaint '{complaint_id}'."
        )

    clean_basename = os.path.basename(complaint.evidence.file_path)
    file_full_path = os.path.join(UPLOAD_DIR, clean_basename)
    if not os.path.exists(file_full_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evidence file does not exist on disk."
        )

    return FileResponse(file_full_path, media_type=complaint.evidence.mime_type)


@router.get("/allocation/{source_record_id}/summary", response_model=AllocationReportSummarySchema)
def get_allocation_complaints_summary(
    source_record_id: str,
    db: Session = Depends(get_db)
) -> AllocationReportSummarySchema:
    """Returns aggregated citizen complaints count and categories for a specific allocation."""
    data = get_allocation_report_summary(db, source_record_id)
    return AllocationReportSummarySchema(
        source_record_id=source_record_id,
        total_reports=data["total_reports"],
        open_reports=data["open_reports"],
        resolved_reports=data["resolved_reports"],
        categories=data["categories"],
        latest_report_date=data["latest_report_date"],
        has_reports=data["has_reports"],
    )

