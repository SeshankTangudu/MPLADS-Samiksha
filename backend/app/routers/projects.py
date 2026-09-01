"""Project / Allocation Endpoints (T09).

Implements GET /api/projects (list with filters) and GET /api/projects/{id} (deep detail).
"""

import math
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc, func

from backend.app.database import get_db
from backend.app.models import Project, RiskScore, RiskFlag
from backend.app.schemas import (
    ProjectItemSchema,
    AllocationDetailSchema,
    RiskAssessmentSchema,
    ReasonCardSchema,
    PeerComparableSchema,
    ProjectDetailResponseSchema,
    PaginationEnvelope
)
from ml.risk_engine import evaluate_allocation, load_baselines

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
    category: str = Query(None, description="Filter by civic category"),
    status: str = Query(None, description="Filter by status"),
    term: int = Query(None, description="Filter by Lok Sabha term (15, 16, 17)"),
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
    if category and category.strip():
        query = query.filter(Project.category == category.strip())
    if status and status.strip():
        query = query.filter(Project.status == status.strip())
    if term:
        query = query.filter(Project.lok_sabha_term == term)

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
            has_reasons_flag=p.has_reasons_flag
        )
        items.append(item)

    return PaginationEnvelope[ProjectItemSchema](
        items=items,
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages
    )


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
        pending_reason=project.pending_reason or ""
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

    return ProjectDetailResponseSchema(
        allocation=alloc_detail,
        risk_assessment=risk_assessment,
        reasons=reasons,
        peer_comparables=peer_comparables,
        disclaimer="Risk indicators are analytical signals intended to support review. They do not constitute proof of wrongdoing."
    )
