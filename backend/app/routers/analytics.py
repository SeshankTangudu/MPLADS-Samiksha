"""Analytics and Geospatial Centroid Endpoints (T13).

Implements GET /api/analytics/by-category, GET /api/analytics/by-district, and GET /api/locations.
"""

from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from backend.app.database import get_db
from backend.app.models import Project, District, RiskScore
from backend.app.schemas import (
    CategoryAnalyticsSchema,
    DistrictAnalyticsSchema,
    LocationPointSchema
)

router = APIRouter(tags=["Analytics"])


@router.get("/analytics/by-category", response_model=List[CategoryAnalyticsSchema])
def get_analytics_by_category(db: Session = Depends(get_db)):
    """Returns aggregated financial and risk metrics grouped by civic sector category."""
    categories = db.query(Project.category).distinct().all()
    results = []

    for (cat_name,) in categories:
        total_allocations = db.query(func.count(Project.id)).filter(Project.category == cat_name).scalar() or 0
        total_sanctioned = db.query(func.sum(Project.sanctioned_cost)).filter(Project.category == cat_name).scalar() or 0.0
        total_expenditure = db.query(func.sum(Project.expenditure)).filter(Project.category == cat_name).scalar() or 0.0

        avg_util = round((total_expenditure / total_sanctioned * 100), 2) if total_sanctioned > 0 else 0.0

        # Count flagged allocations (High or Critical risk)
        flagged_count = (
            db.query(func.count(Project.id))
            .join(RiskScore, Project.id == RiskScore.project_id)
            .filter(Project.category == cat_name, RiskScore.risk_level.in_(["High", "Critical"]))
            .scalar() or 0
        )

        flagged_pct = round((flagged_count / total_allocations * 100), 2) if total_allocations > 0 else 0.0

        results.append(
            CategoryAnalyticsSchema(
                category=cat_name,
                total_allocations=total_allocations,
                total_sanctioned_crore=round(total_sanctioned, 2),
                total_expenditure_crore=round(total_expenditure, 2),
                avg_utilization=avg_util,
                flagged_count=flagged_count,
                flagged_percentage=flagged_pct
            )
        )

    return sorted(results, key=lambda x: x.total_allocations, reverse=True)


@router.get("/analytics/by-district", response_model=List[DistrictAnalyticsSchema])
def get_analytics_by_district(db: Session = Depends(get_db)):
    """Returns top aggregated districts ranked by allocation volume and risk density."""
    districts = (
        db.query(District)
        .filter(District.total_allocations > 0)
        .order_by(desc(District.flagged_allocations), desc(District.total_allocations))
        .limit(50)
        .all()
    )

    results = []
    for d in districts:
        total_exp = (
            db.query(func.sum(Project.expenditure))
            .filter(Project.district_id == d.id)
            .scalar() or 0.0
        )

        dominant_risk = "High" if d.flagged_allocations >= 2 else ("Medium" if d.flagged_allocations == 1 else "Low")

        results.append(
            DistrictAnalyticsSchema(
                district_id=d.id,
                district_name=d.district_name,
                state=d.state,
                latitude=d.latitude,
                longitude=d.longitude,
                total_allocations=d.total_allocations,
                total_expenditure_crore=round(total_exp, 2),
                flagged_allocations=d.flagged_allocations,
                dominant_risk_level=dominant_risk
            )
        )

    return results


@router.get("/locations", response_model=List[LocationPointSchema])
def get_locations(db: Session = Depends(get_db)):
    """Returns district centroid coordinates for Leaflet map visualization."""
    districts = db.query(District).filter(District.total_allocations > 0).all()
    results = []

    for d in districts:
        total_exp = (
            db.query(func.sum(Project.expenditure))
            .filter(Project.district_id == d.id)
            .scalar() or 0.0
        )

        dominant_risk = "High" if d.flagged_allocations >= 2 else ("Medium" if d.flagged_allocations == 1 else "Low")

        results.append(
            LocationPointSchema(
                district_id=d.id,
                district_name=d.district_name,
                state=d.state,
                latitude=d.latitude,
                longitude=d.longitude,
                total_allocations=d.total_allocations,
                total_expenditure_crore=round(total_exp, 2),
                flagged_allocations=d.flagged_allocations,
                dominant_risk_level=dominant_risk
            )
        )

    return results
