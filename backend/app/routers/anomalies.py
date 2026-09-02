"""Anomaly Intelligence Queue Endpoints (T13).

Implements GET /api/anomalies returning prioritized allocations with risk scores >= 25.0.
"""

import math
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.app.database import get_db
from backend.app.models import Project, RiskScore, RiskFlag
from backend.app.schemas import ProjectItemSchema, PaginationEnvelope

router = APIRouter(prefix="/anomalies", tags=["Anomalies"])


@router.get("", response_model=PaginationEnvelope[ProjectItemSchema])
def list_anomalies(
    min_score: float = Query(25.0, ge=0.0, le=100.0, description="Minimum risk score threshold"),
    risk_level: str = Query(None, description="Filter by risk tier: Medium, High, Critical"),
    flag_type: str = Query(None, description="Filter by flag type: FINANCIAL, TIMELINE, DATA_QUALITY, GEOGRAPHIC"),
    search: str = Query(None, description="Search query matching MP, district, constituency, or ID"),
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db)
):
    """Returns prioritized review queue of flagged allocations ordered by risk score descending."""
    query = (
        db.query(Project)
        .join(RiskScore, Project.id == RiskScore.project_id)
        .filter(RiskScore.total_score >= min_score)
    )

    if risk_level and risk_level.strip():
        query = query.filter(RiskScore.risk_level == risk_level.strip())

    if flag_type and flag_type.strip():
        query = query.join(RiskFlag, Project.id == RiskFlag.project_id).filter(RiskFlag.flag_type == flag_type.strip()).distinct()

    if search and search.strip():
        term_clean = f"%{search.strip()}%"
        query = query.filter(
            (Project.source_record_id.ilike(term_clean)) |
            (Project.mp_name.ilike(term_clean)) |
            (Project.district.ilike(term_clean)) |
            (Project.constituency.ilike(term_clean))
        )

    total = query.count()
    total_pages = math.ceil(total / limit) if total > 0 else 0

    query = query.order_by(desc(RiskScore.total_score), desc(Project.expenditure))

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
