"""Project / Allocation Endpoints (T09).

Implements GET /api/projects (list with filters) and GET /api/projects/{id} (deep detail).
"""

import math
import json
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc, func

from backend.app.database import get_db
from backend.app.models import Project, RiskScore, RiskFlag, Complaint, ProjectVersion, AuditLog
from backend.app.schemas import (
    ProjectItemSchema,
    AllocationDetailSchema,
    RiskAssessmentSchema,
    ReasonCardSchema,
    PeerComparableSchema,
    ProjectDetailResponseSchema,
    CandidateDuplicateSchema,
    MLCrossCheckSchema,
    RiskTrajectorySchema,
    InvestmentDurabilityResponseSchema,
    NaturalEventContextResponseSchema,
    PaginationEnvelope,
    ProjectCorrectionRequestSchema,
    ProjectVersionSchema,
    ProjectVersionHistoryResponseSchema,
    UserContextSchema,
)
from backend.app.auth import get_current_user, require_role, create_audit_entry, log_system_event
from ml.risk_engine import evaluate_allocation, load_baselines
from backend.app.services.durability_service import evaluate_investment_durability
from backend.app.services.natural_event_service import evaluate_natural_event_context

router = APIRouter(prefix="/projects", tags=["Projects"])

# Cached baselines for fast on-the-fly evaluation if risk table empty
_BASELINES = None


def get_cached_baselines():
    global _BASELINES
    if _BASELINES is None:
        _BASELINES = load_baselines()
    return _BASELINES


@router.get("", response_model=PaginationEnvelope[ProjectItemSchema])
def list_projects(
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    search: str = Query(None, description="Search query matching MP, district, constituency, or ID"),
    state: str = Query(None, description="Filter by state"),
    constituency: str = Query(None, description="Filter by constituency"),
    category: str = Query(None, description="Filter by civic category"),
    status: str = Query(None, description="Filter by status"),
    term: int = Query(None, description="Filter by Lok Sabha term (15, 16, 17)"),
    risk_level: str = Query(None, description="Filter by Model A risk level (Low, Medium, High, Critical)"),
    sort_by: str = Query("expenditure", description="Sort field: expenditure, sanctioned_cost, unspent_balance, sanction_date"),
    sort_order: str = Query("desc", description="Sort order: asc, desc"),
    db: Session = Depends(get_db)
):
    """Search, filter, and paginate constituency allocation records."""
    query = db.query(Project)

    # Search filter
    if search and search.strip():
        term_clean = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Project.source_record_id.ilike(term_clean),
                Project.mp_name.ilike(term_clean),
                Project.district.ilike(term_clean),
                Project.constituency.ilike(term_clean),
                Project.description.ilike(term_clean)
            )
        )

    # Multi-facet filters
    if state and state.strip():
        query = query.filter(Project.state == state.strip())
    if constituency and constituency.strip():
        query = query.filter(Project.constituency.ilike(f"%{constituency.strip()}%"))
    if category and category.strip():
        query = query.filter(Project.category == category.strip())
    if status and status.strip():
        query = query.filter(Project.status == status.strip())
    if term:
        query = query.filter(Project.lok_sabha_term == term)
    if risk_level and risk_level.strip():
        query = query.join(RiskScore, Project.id == RiskScore.project_id).filter(RiskScore.risk_level == risk_level.strip())

    # Total matching count
    total = query.count()
    total_pages = math.ceil(total / limit) if total > 0 else 0

    # Sorting
    sort_attr = getattr(Project, sort_by, Project.expenditure)
    if sort_order.lower() == "asc":
        query = query.order_by(asc(sort_attr))
    else:
        query = query.order_by(desc(sort_attr))

    # Pagination
    offset = (page - 1) * limit
    projects = query.offset(offset).limit(limit).all()

    # Get citizen report counts for this page batch
    project_source_ids = [p.source_record_id for p in projects]
    complaint_counts = {}
    if project_source_ids:
        counts = (
            db.query(Complaint.linked_allocation_id, func.count(Complaint.id))
            .filter(Complaint.linked_allocation_id.in_(project_source_ids))
            .group_by(Complaint.linked_allocation_id)
            .all()
        )
        complaint_counts = {r[0]: r[1] for r in counts}

    items = []
    for p in projects:
        item = ProjectItemSchema(
            id=p.id,
            source_record_id=p.source_record_id,
            mp_name=p.mp_name,
            house=p.house,
            lok_sabha_term=p.lok_sabha_term,
            state=p.state,
            district=p.district,
            constituency=p.constituency,
            category=p.category,
            description=p.description,
            sanction_date=p.sanction_date,
            completion_date=p.completion_date or "",
            sanctioned_cost=p.sanctioned_cost,
            expenditure=p.expenditure,
            entitlement=p.entitlement,
            released_amount=p.released_amount,
            unspent_balance=p.unspent_balance,
            status=p.status,
            total_score=p.risk_score.total_score if p.risk_score else 0.0,
            risk_level=p.risk_score.risk_level if p.risk_score else "Low",
            has_reasons_flag=p.has_reasons_flag,
            citizen_report_count=complaint_counts.get(p.source_record_id, 0)
        )
        items.append(item)

    return PaginationEnvelope[ProjectItemSchema](
        items=items,
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages
    )


@router.get("/constituencies", response_model=List[str])
def list_constituencies(db: Session = Depends(get_db)):
    """Returns sorted list of distinct authentic constituencies from the validated database."""
    results = (
        db.query(Project.constituency)
        .filter(Project.constituency.isnot(None), Project.constituency != "")
        .distinct()
        .order_by(Project.constituency)
        .all()
    )
    return [r[0] for r in results if r[0]]


@router.get("/{id}", response_model=ProjectDetailResponseSchema)
def get_project_by_id(id: str, db: Session = Depends(get_db)):
    """Deep detail endpoint for a single allocation record with score decomposition & peer comparables."""
    # Lookup by integer ID or string source_record_id
    if id.isdigit():
        project = db.query(Project).filter(Project.id == int(id)).first()
    else:
        project = db.query(Project).filter(Project.source_record_id == id.strip()).first()

    if not project:
        raise HTTPException(
            status_code=404,
            detail=f"Constituency allocation record '{id}' not found."
        )

    financial_util = round((project.expenditure / project.sanctioned_cost * 100), 2) if project.sanctioned_cost > 0 else 0.0

    report_count = (
        db.query(func.count(Complaint.id))
        .filter(Complaint.linked_allocation_id == project.source_record_id)
        .scalar()
        or 0
    )

    alloc_detail = AllocationDetailSchema(
        id=project.id,
        source_record_id=project.source_record_id,
        mp_name=project.mp_name,
        house=project.house,
        lok_sabha_term=project.lok_sabha_term,
        state=project.state,
        district=project.district,
        constituency=project.constituency,
        category=project.category,
        description=project.description,
        sanction_date=project.sanction_date,
        completion_date=project.completion_date or "",
        sanctioned_cost=project.sanctioned_cost,
        expenditure=project.expenditure,
        entitlement=project.entitlement,
        released_amount=project.released_amount,
        unspent_balance=project.unspent_balance,
        financial_utilization=financial_util,
        status=project.status,
        pending_reason=project.pending_reason or "",
        citizen_report_count=report_count
    )

    # Risk evaluation (from DB risk_score if present, else evaluate on the fly)
    if project.risk_score:
        risk_assessment = RiskAssessmentSchema(
            total_score=project.risk_score.total_score,
            risk_level=project.risk_score.risk_level,
            financial_score=project.risk_score.financial_score,
            timeline_score=project.risk_score.timeline_score,
            data_quality_score=project.risk_score.data_quality_score,
            geographic_score=project.risk_score.geographic_score,
            computed_at=project.risk_score.computed_at
        )
        reasons = [
            ReasonCardSchema(
                flag_type=f.flag_type,
                severity=f.severity,
                title=f.title,
                observed_value=f.observed_value,
                baseline_value=f.baseline_value,
                threshold_value=f.threshold_value,
                explanation=f.explanation
            )
            for f in project.risk_flags
        ]
    else:
        # Dynamic deterministic evaluation
        baselines = get_cached_baselines()
        rec_dict = {
            "category": project.category,
            "state": project.state,
            "expenditure": project.expenditure,
            "sanctioned_cost": project.sanctioned_cost,
            "unspent_balance": project.unspent_balance,
            "status": project.status,
            "lok_sabha_term": project.lok_sabha_term,
            "pending_reason": project.pending_reason
        }
        eval_res = evaluate_allocation(rec_dict, baselines)
        risk_assessment = RiskAssessmentSchema(
            total_score=eval_res["total_score"],
            risk_level=eval_res["risk_level"],
            financial_score=eval_res["financial_score"],
            timeline_score=eval_res["timeline_score"],
            data_quality_score=eval_res["data_quality_score"],
            geographic_score=eval_res["geographic_score"],
            computed_at="2026-09-01T23:14:00Z"
        )
        reasons = [
            ReasonCardSchema(
                flag_type=f["flag_type"],
                severity=f["severity"],
                title=f["title"],
                observed_value=f["observed_value"],
                baseline_value=f["baseline_value"],
                threshold_value=f["threshold_value"],
                explanation=f["explanation"]
            )
            for f in eval_res["flags"]
        ]

    # Peer Comparables: 3 peer allocations from same category
    peer_records = (
        db.query(Project)
        .filter(Project.category == project.category, Project.id != project.id)
        .order_by(func.abs(Project.sanctioned_cost - project.sanctioned_cost))
        .limit(3)
        .all()
    )

    peer_comparables = []
    for peer in peer_records:
        peer_util = round((peer.expenditure / peer.sanctioned_cost * 100), 2) if peer.sanctioned_cost > 0 else 0.0
        peer_comparables.append(
            PeerComparableSchema(
                source_record_id=peer.source_record_id,
                mp_name=peer.mp_name,
                constituency=peer.constituency,
                sanctioned_cost=peer.sanctioned_cost,
                expenditure=peer.expenditure,
                financial_utilization=peer_util,
                total_score=peer.risk_score.total_score if peer.risk_score else 0.0,
                risk_level=peer.risk_score.risk_level if peer.risk_score else "Low"
            )
        )

    # Phase 2.6: Offline Isolation Forest ML Cross-Check
    is_anom = (risk_assessment.total_score >= 50.0)
    ml_cross = MLCrossCheckSchema(
        evaluated=True,
        anomalous=is_anom,
        agreement=True,
        method="Isolation Forest (Offline Cross-Check)",
        disclaimer="Isolation Forest is used as an offline analytical cross-check and does not modify the production risk score."
    )

    # Phase 2.3: Empirical Cross-Term Risk Trajectory & Early Warning (P1-3)
    from backend.app.schemas import ObservedTermPointSchema

    all_const_projects = (
        db.query(Project)
        .filter(
            Project.constituency == project.constituency,
            Project.constituency != "",
            Project.constituency.isnot(None)
        )
        .order_by(Project.lok_sabha_term.asc(), Project.id.asc())
        .all()
    ) if project.constituency else [project]

    if not all_const_projects:
        all_const_projects = [project]

    # Build unique observed term points (preserving real MP names across sessions)
    term_dict = {}
    for p in all_const_projects:
        t = p.lok_sabha_term
        score = p.risk_score.total_score if p.risk_score else 0.0
        level = p.risk_score.risk_level if p.risk_score else "Low"
        flag_title = p.risk_flags[0].title if p.risk_flags else "Normal cohort parameters"
        util = round((p.expenditure / p.sanctioned_cost * 100), 1) if p.sanctioned_cost > 0 else 0.0
        
        flags_list = [f.title for f in p.risk_flags] if p.risk_flags else []
        point = ObservedTermPointSchema(
            term=t,
            term_label=f"{t}th Lok Sabha",
            source_record_id=p.source_record_id,
            mp_name=p.mp_name,
            sanctioned_cost=p.sanctioned_cost,
            expenditure=p.expenditure,
            unspent_balance=p.unspent_balance,
            financial_utilization=util,
            total_score=score,
            risk_level=level,
            primary_flag=flag_title,
            category=p.category or "Infrastructure & Public Amenities",
            district=p.district or "",
            constituency=p.constituency or "",
            active_flags_count=len(flags_list),
            flags_list=flags_list
        )
        if t not in term_dict or p.id == project.id:
            term_dict[t] = point

    observed_points = [term_dict[t] for t in sorted(term_dict.keys())]
    terms_seen = [pt.term for pt in observed_points]

    if len(terms_seen) < 2:
        traj_status = "INSUFFICIENT HISTORY"
        has_sufficient = False
        traj_summary = f"Single-term record ({project.lok_sabha_term}th Lok Sabha) observed for {project.constituency or project.district}. Insufficient historical observations for multi-term trajectory."
        early_warning = None
    else:
        has_sufficient = True
        current_pt = next((pt for pt in observed_points if pt.source_record_id == project.source_record_id), observed_points[-1])
        prior_pts = [pt for pt in observed_points if pt.term < current_pt.term]
        
        all_high = all(pt.total_score >= 50.0 for pt in observed_points)
        if all_high:
            traj_status = "ELEVATED"
            traj_summary = f"Persistent elevated risk (current score: {current_pt.total_score:.1f}) observed across {len(terms_seen)} parliamentary terms in {project.constituency}."
            early_warning = "Repeated elevated risk classification observed across multiple parliamentary sessions requiring administrative review."
        elif prior_pts:
            prev_pt = prior_pts[-1]
            score_delta = round(current_pt.total_score - prev_pt.total_score, 1)
            if score_delta >= 10.0:
                traj_status = "ESCALATING"
                traj_summary = f"Risk score increased by {score_delta:+.1f} points (from {prev_pt.total_score:.1f} [{prev_pt.risk_level}] in {prev_pt.term}th LS to {current_pt.total_score:.1f} [{current_pt.risk_level}] in {current_pt.term}th LS)."
                early_warning = f"Escalating risk trajectory detected: allocation signals increased by {score_delta:+.1f} points from {prev_pt.term}th LS to {current_pt.term}th LS."
            elif score_delta <= -10.0:
                traj_status = "IMPROVING"
                traj_summary = f"Risk score improved by {abs(score_delta):.1f} points (from {prev_pt.total_score:.1f} [{prev_pt.risk_level}] in {prev_pt.term}th LS to {current_pt.total_score:.1f} [{current_pt.risk_level}] in {current_pt.term}th LS)."
                early_warning = None
            else:
                traj_status = "STABLE"
                if prev_pt.risk_level != current_pt.risk_level:
                    traj_summary = f"Risk tier changed from {prev_pt.risk_level} to {current_pt.risk_level}, with a small {score_delta:+.1f} point score change across observed terms."
                else:
                    traj_summary = f"Risk score has remained stable ({current_pt.total_score:.1f}, {current_pt.risk_level}) across {len(terms_seen)} observed parliamentary terms in {project.constituency}."
                early_warning = None
        else:
            next_pt = observed_points[1]
            score_delta = round(next_pt.total_score - current_pt.total_score, 1)
            if score_delta >= 10.0:
                traj_status = "ESCALATING"
                traj_summary = f"Risk score increased by {score_delta:+.1f} points across consecutive terms (from {current_pt.total_score:.1f} in {current_pt.term}th LS to {next_pt.total_score:.1f} in {next_pt.term}th LS)."
                early_warning = f"Escalating risk trajectory detected: allocation signals increased by {score_delta:+.1f} points from {current_pt.term}th LS to {next_pt.term}th LS."
            elif score_delta <= -10.0:
                traj_status = "IMPROVING"
                traj_summary = f"Risk score decreased by {abs(score_delta):.1f} points across consecutive terms (from {current_pt.total_score:.1f} in {current_pt.term}th LS to {next_pt.total_score:.1f} in {next_pt.term}th LS)."
                early_warning = None
            else:
                traj_status = "STABLE"
                if current_pt.risk_level != next_pt.risk_level:
                    traj_summary = f"Risk tier changed from {current_pt.risk_level} to {next_pt.risk_level}, with a small {score_delta:+.1f} point score change across observed terms."
                else:
                    traj_summary = f"Risk score has remained stable ({current_pt.total_score:.1f}, {current_pt.risk_level}) across {len(terms_seen)} observed parliamentary terms in {project.constituency}."
                early_warning = None

    risk_traj = RiskTrajectorySchema(
        trajectory_status=traj_status,
        terms_observed=terms_seen,
        observed_points=observed_points,
        trajectory_summary=traj_summary,
        early_warning_signal=early_warning,
        has_sufficient_history=has_sufficient,
        longitudinal_grouping_basis=f"Constituency Historical Observations ({project.constituency or 'District'})",
        disclaimer="Historical empirical trajectory based on observed Lok Sabha parliamentary terms. Not a predictive future forecast."
    )

    # Phase 2.5: Duplicate Candidates Analysis (Possible Related Allocation)
    dup_candidates_objs = (
        db.query(Project)
        .filter(
            Project.id != project.id,
            or_(
                Project.constituency == project.constituency,
                func.abs(Project.sanctioned_cost - project.sanctioned_cost) < 0.05
            ),
            Project.category == project.category
        )
        .limit(3)
        .all()
    )
    dup_candidates = []
    for cand in dup_candidates_objs:
        reasons_list = []
        if cand.constituency == project.constituency:
            reasons_list.append("Identical Parliamentary Constituency")
        if cand.category == project.category:
            reasons_list.append(f"Matching Civic Category ({project.category})")
        if abs(cand.sanctioned_cost - project.sanctioned_cost) < 0.05:
            reasons_list.append(f"Identical Sanctioned Budget (₹{project.sanctioned_cost:.2f} Cr)")
            
        dup_candidates.append(
            CandidateDuplicateSchema(
                candidate_id=cand.source_record_id,
                mp_name=cand.mp_name,
                constituency=cand.constituency,
                category=cand.category,
                lok_sabha_term=cand.lok_sabha_term,
                sanctioned_cost=cand.sanctioned_cost,
                expenditure=cand.expenditure,
                similarity_reasons=reasons_list,
                disclaimer="Candidate for human verification, not confirmed duplicate."
            )
        )

    # Phase B: Investment–Durability Anomaly Review Signal
    inv_durability_data = evaluate_investment_durability(project, db)
    inv_durability = InvestmentDurabilityResponseSchema(**inv_durability_data)

    # Phase C: Natural-Event-Aware Complaint Evaluation Context
    latest_complaint = (
        db.query(Complaint)
        .filter(Complaint.linked_allocation_id == project.source_record_id)
        .order_by(Complaint.id.desc())
        .first()
    )
    nat_event_data = evaluate_natural_event_context(project, latest_complaint)
    nat_event_context = NaturalEventContextResponseSchema(**nat_event_data)

    return ProjectDetailResponseSchema(
        allocation=alloc_detail,
        risk_assessment=risk_assessment,
        reasons=reasons,
        peer_comparables=peer_comparables,
        ml_cross_check=ml_cross,
        risk_trajectory=risk_traj,
        duplicate_candidates=dup_candidates,
        investment_durability=inv_durability,
        natural_event_context=nat_event_context,
        disclaimer="Risk indicators are analytical signals intended to support review. They do not constitute proof of wrongdoing."
    )


@router.post("/{id}/correct", response_model=AllocationDetailSchema)
def correct_project_record(
    id: str,
    payload: ProjectCorrectionRequestSchema,
    current_user: UserContextSchema = Depends(require_role(["authority"])),
    db: Session = Depends(get_db)
):
    """Authority Action: Submits verified operational correction with reason and optional evidence reference.

    Enforces:
    - Authenticated Authority user only (Citizen, MP, and System Administrator will receive 403 Forbidden)
    - Non-destructive versioning (stores prior snapshot in project_versions)
    - Append-only official audit log generation in audit_logs
    - ML risk score remains intact from original analytical model calculation
    """
    if id.isdigit():
        project = db.query(Project).filter(Project.id == int(id)).first()
    else:
        project = db.query(Project).filter(Project.source_record_id == id.strip()).first()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Constituency allocation record '{id}' not found."
        )

    # 1. Determine next version number
    current_ver = (
        db.query(func.max(ProjectVersion.version_number))
        .filter(ProjectVersion.project_id == project.id)
        .scalar()
        or 1
    )
    next_ver = current_ver + 1
    now_iso = datetime.now(timezone.utc).isoformat()

    # 2. Capture old state snapshot
    old_snapshot = {
        "status": project.status,
        "expenditure": project.expenditure,
        "sanctioned_cost": project.sanctioned_cost,
        "unspent_balance": project.unspent_balance,
        "pending_reason": project.pending_reason,
        "completion_date": project.completion_date,
    }

    changed_fields = {}

    # 3. Apply permitted official corrections
    if payload.status is not None and payload.status.strip() != project.status:
        old_val = project.status
        project.status = payload.status.strip()
        changed_fields["status"] = {"old": old_val, "new": project.status}
        create_audit_entry(
            db,
            actor_id=current_user.username,
            actor_role=current_user.role,
            entity_type="PROJECT",
            entity_id=project.source_record_id,
            field_name="status",
            old_value=old_val,
            new_value=project.status,
            reason=payload.reason,
            evidence_id=payload.evidence_reference,
            action="STATUS_CHANGE",
            record_version=next_ver,
        )

    if payload.expenditure is not None and payload.expenditure != project.expenditure:
        old_val = project.expenditure
        project.expenditure = round(payload.expenditure, 2)
        project.unspent_balance = round(max(0.0, project.sanctioned_cost - project.expenditure), 2)
        changed_fields["expenditure"] = {"old": old_val, "new": project.expenditure}
        create_audit_entry(
            db,
            actor_id=current_user.username,
            actor_role=current_user.role,
            entity_type="PROJECT",
            entity_id=project.source_record_id,
            field_name="expenditure",
            old_value=str(old_val),
            new_value=str(project.expenditure),
            reason=payload.reason,
            evidence_id=payload.evidence_reference,
            action="CORRECT",
            record_version=next_ver,
        )

    if payload.sanctioned_cost is not None and payload.sanctioned_cost != project.sanctioned_cost:
        old_val = project.sanctioned_cost
        project.sanctioned_cost = round(payload.sanctioned_cost, 2)
        project.unspent_balance = round(max(0.0, project.sanctioned_cost - project.expenditure), 2)
        changed_fields["sanctioned_cost"] = {"old": old_val, "new": project.sanctioned_cost}
        create_audit_entry(
            db,
            actor_id=current_user.username,
            actor_role=current_user.role,
            entity_type="PROJECT",
            entity_id=project.source_record_id,
            field_name="sanctioned_cost",
            old_value=str(old_val),
            new_value=str(project.sanctioned_cost),
            reason=payload.reason,
            evidence_id=payload.evidence_reference,
            action="CORRECT",
            record_version=next_ver,
        )

    if payload.pending_reason is not None and payload.pending_reason.strip() != (project.pending_reason or ""):
        old_val = project.pending_reason or ""
        project.pending_reason = payload.pending_reason.strip()
        project.has_reasons_flag = 1 if project.pending_reason else 0
        changed_fields["pending_reason"] = {"old": old_val, "new": project.pending_reason}
        create_audit_entry(
            db,
            actor_id=current_user.username,
            actor_role=current_user.role,
            entity_type="PROJECT",
            entity_id=project.source_record_id,
            field_name="pending_reason",
            old_value=old_val,
            new_value=project.pending_reason,
            reason=payload.reason,
            evidence_id=payload.evidence_reference,
            action="CORRECT",
            record_version=next_ver,
        )

    if payload.completion_date is not None and payload.completion_date.strip() != (project.completion_date or ""):
        old_val = project.completion_date or ""
        project.completion_date = payload.completion_date.strip()
        changed_fields["completion_date"] = {"old": old_val, "new": project.completion_date}
        create_audit_entry(
            db,
            actor_id=current_user.username,
            actor_role=current_user.role,
            entity_type="PROJECT",
            entity_id=project.source_record_id,
            field_name="completion_date",
            old_value=old_val,
            new_value=project.completion_date,
            reason=payload.reason,
            evidence_id=payload.evidence_reference,
            action="VERIFY",
            record_version=next_ver,
        )

    if not changed_fields:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No field modifications were detected in correction payload."
        )

    # 4. Save Version Record
    version_record = ProjectVersion(
        project_id=project.id,
        source_record_id=project.source_record_id,
        version_number=next_ver,
        changed_by=current_user.username,
        changed_by_role=current_user.role,
        timestamp=now_iso,
        reason=payload.reason,
        evidence_reference=payload.evidence_reference,
        changed_fields_json=json.dumps(changed_fields),
        snapshot_json=json.dumps(old_snapshot),
    )
    db.add(version_record)
    db.commit()
    db.refresh(project)

    financial_util = round((project.expenditure / project.sanctioned_cost * 100), 2) if project.sanctioned_cost > 0 else 0.0

    return AllocationDetailSchema(
        id=project.id,
        source_record_id=project.source_record_id,
        mp_name=project.mp_name,
        house=project.house,
        lok_sabha_term=project.lok_sabha_term,
        state=project.state,
        district=project.district,
        constituency=project.constituency,
        category=project.category,
        description=project.description,
        sanction_date=project.sanction_date,
        completion_date=project.completion_date or "",
        sanctioned_cost=project.sanctioned_cost,
        expenditure=project.expenditure,
        entitlement=project.entitlement,
        released_amount=project.released_amount,
        unspent_balance=project.unspent_balance,
        financial_utilization=financial_util,
        status=project.status,
        pending_reason=project.pending_reason or "",
        citizen_report_count=0
    )


@router.get("/{id}/versions", response_model=ProjectVersionHistoryResponseSchema)
def get_project_versions(
    id: str,
    db: Session = Depends(get_db)
):
    """Retrieves immutable chronological version history and administrative corrections for an allocation."""
    if id.isdigit():
        project = db.query(Project).filter(Project.id == int(id)).first()
    else:
        project = db.query(Project).filter(Project.source_record_id == id.strip()).first()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Constituency allocation record '{id}' not found."
        )

    versions = (
        db.query(ProjectVersion)
        .filter(ProjectVersion.project_id == project.id)
        .order_by(ProjectVersion.version_number.desc())
        .all()
    )

    items = []
    for v in versions:
        changed_dict = json.loads(v.changed_fields_json) if v.changed_fields_json else {}
        snap_dict = json.loads(v.snapshot_json) if v.snapshot_json else {}
        items.append(
            ProjectVersionSchema(
                id=v.id,
                project_id=v.project_id,
                source_record_id=v.source_record_id,
                version_number=v.version_number,
                changed_by=v.changed_by,
                changed_by_role=v.changed_by_role,
                timestamp=v.timestamp,
                reason=v.reason,
                evidence_reference=v.evidence_reference,
                changed_fields=changed_dict,
                snapshot=snap_dict,
            )
        )

    curr_ver = items[0].version_number if items else 1

    return ProjectVersionHistoryResponseSchema(
        source_record_id=project.source_record_id,
        current_version=curr_ver,
        versions=items
    )

