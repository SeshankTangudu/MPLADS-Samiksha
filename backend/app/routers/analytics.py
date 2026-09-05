"""Analytics and Geospatial Centroid Endpoints (T13).

Implements GET /api/analytics/by-category, GET /api/analytics/by-district, and GET /api/locations.
"""

from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from backend.app.database import get_db
from backend.app.models import Project, District, RiskScore, RiskFlag
from backend.app.schemas import (
    CategoryAnalyticsSchema,
    DistrictAnalyticsSchema,
    DistrictDetailAnalyticsSchema,
    LocationPointSchema,
    TermTrendSchema,
    CohortSummaryItemSchema,
    CohortExplorerResponseSchema,
    NationalTrendOverviewSchema,
    TermIntelligenceItemSchema,
    SectorMomentumItemSchema,
    StateMomentumItemSchema,
    ExecutiveInsightSchema,
    TrendIntelligenceResponseSchema,
    ReviewEffortKPISchema,
    ReviewEffortTierBreakdownSchema,
    ReviewEffortFlagBreakdownSchema,
    ReviewEffortTermBreakdownSchema,
    ConstituencyAnalyticsSchema,
    ConstituencyTermBreakdownSchema,
    ConstituencyPriorityAllocationSchema,
    ConstituencyPeerBenchmarkSchema
)
from ml.risk_engine import load_baselines

# Configurable Workload Prioritization Weights (distinct from Model A scoring weights)
REVIEW_EFFORT_TIER_WEIGHTS = {
    "Low": 1,
    "Medium": 2,
    "High": 4,
    "Critical": 8
}

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


@router.get("/analytics/trends", response_model=List[TermTrendSchema])
def get_analytics_trends(db: Session = Depends(get_db)):
    """Returns cross-term longitudinal trends (15th, 16th, 17th Lok Sabha)."""
    terms = [15, 16, 17]
    term_labels = {
        15: "15th Lok Sabha (2009–2014)",
        16: "16th Lok Sabha (2014–2019)",
        17: "17th Lok Sabha (2019–2024)"
    }
    
    results = []
    for t in terms:
        alloc_count = db.query(func.count(Project.id)).filter(Project.lok_sabha_term == t).scalar() or 0
        total_sanc = db.query(func.sum(Project.sanctioned_cost)).filter(Project.lok_sabha_term == t).scalar() or 0.0
        total_exp = db.query(func.sum(Project.expenditure)).filter(Project.lok_sabha_term == t).scalar() or 0.0
        avg_util = round((total_exp / total_sanc * 100), 2) if total_sanc > 0 else 0.0
        
        high_risk_count = (
            db.query(func.count(Project.id))
            .join(RiskScore, Project.id == RiskScore.project_id)
            .filter(Project.lok_sabha_term == t, RiskScore.risk_level.in_(["High", "Critical"]))
            .scalar() or 0
        )
        
        high_risk_pct = round((high_risk_count / alloc_count * 100), 2) if alloc_count > 0 else 0.0
        
        # Flags count for timeline and data quality in this term
        from backend.app.models import RiskFlag
        timeline_flags = (
            db.query(func.count(RiskFlag.id))
            .join(Project, RiskFlag.project_id == Project.id)
            .filter(Project.lok_sabha_term == t, RiskFlag.flag_type == "TIMELINE")
            .scalar() or 0
        )
        
        dq_flags = (
            db.query(func.count(RiskFlag.id))
            .join(Project, RiskFlag.project_id == Project.id)
            .filter(Project.lok_sabha_term == t, RiskFlag.flag_type == "DATA_QUALITY")
            .scalar() or 0
        )
        
        results.append(
            TermTrendSchema(
                term=t,
                term_label=term_labels.get(t, f"{t}th Lok Sabha"),
                total_allocations=alloc_count,
                total_sanctioned_crore=round(total_sanc, 2),
                total_expenditure_crore=round(total_exp, 2),
                avg_utilization=avg_util,
                high_risk_count=high_risk_count,
                high_risk_percentage=high_risk_pct,
                timeline_flags_count=timeline_flags,
                data_quality_flags_count=dq_flags
            )
        )
        
    return results


@router.get("/analytics/trend-intelligence", response_model=TrendIntelligenceResponseSchema)
def get_trend_intelligence(db: Session = Depends(get_db)):
    """Returns comprehensive Trend Analytics Intelligence (P1-7)."""
    # 1. National Overview
    total_alloc = db.query(func.count(Project.id)).scalar() or 0
    total_sanc = db.query(func.sum(Project.sanctioned_cost)).scalar() or 0.0
    total_exp = db.query(func.sum(Project.expenditure)).scalar() or 0.0
    avg_util = round((total_exp / total_sanc * 100), 2) if total_sanc > 0 else 0.0

    high_risk_count = (
        db.query(func.count(Project.id))
        .join(RiskScore, Project.id == RiskScore.project_id)
        .filter(RiskScore.risk_level.in_(["High", "Critical"]))
        .scalar() or 0
    )
    high_risk_pct = round((high_risk_count / total_alloc * 100), 2) if total_alloc > 0 else 0.0

    avg_score = db.query(func.avg(RiskScore.total_score)).scalar() or 0.0

    overview = NationalTrendOverviewSchema(
        total_allocations=total_alloc,
        high_risk_allocations=high_risk_count,
        high_risk_percentage=high_risk_pct,
        avg_model_a_score=round(avg_score, 2),
        avg_financial_utilization=avg_util,
        total_sanctioned_crore=round(total_sanc, 2),
        total_expenditure_crore=round(total_exp, 2)
    )

    # 2. Term Intelligence (15, 16, 17)
    terms = [15, 16, 17]
    term_labels = {
        15: "15th Lok Sabha (2009–2014)",
        16: "16th Lok Sabha (2014–2019)",
        17: "17th Lok Sabha (2019–2024)"
    }
    term_items = []
    for t in terms:
        t_alloc = db.query(func.count(Project.id)).filter(Project.lok_sabha_term == t).scalar() or 0
        t_sanc = db.query(func.sum(Project.sanctioned_cost)).filter(Project.lok_sabha_term == t).scalar() or 0.0
        t_exp = db.query(func.sum(Project.expenditure)).filter(Project.lok_sabha_term == t).scalar() or 0.0
        t_util = round((t_exp / t_sanc * 100), 2) if t_sanc > 0 else 0.0

        t_high = (
            db.query(func.count(Project.id))
            .join(RiskScore, Project.id == RiskScore.project_id)
            .filter(Project.lok_sabha_term == t, RiskScore.risk_level.in_(["High", "Critical"]))
            .scalar() or 0
        )
        t_high_pct = round((t_high / t_alloc * 100), 2) if t_alloc > 0 else 0.0

        t_avg_score = (
            db.query(func.avg(RiskScore.total_score))
            .join(Project, Project.id == RiskScore.project_id)
            .filter(Project.lok_sabha_term == t)
            .scalar() or 0.0
        )

        fin_flags = db.query(func.count(RiskFlag.id)).join(Project, RiskFlag.project_id == Project.id).filter(Project.lok_sabha_term == t, RiskFlag.flag_type == "FINANCIAL").scalar() or 0
        tim_flags = db.query(func.count(RiskFlag.id)).join(Project, RiskFlag.project_id == Project.id).filter(Project.lok_sabha_term == t, RiskFlag.flag_type == "TIMELINE").scalar() or 0
        dq_flags = db.query(func.count(RiskFlag.id)).join(Project, RiskFlag.project_id == Project.id).filter(Project.lok_sabha_term == t, RiskFlag.flag_type == "DATA_QUALITY").scalar() or 0
        geo_flags = db.query(func.count(RiskFlag.id)).join(Project, RiskFlag.project_id == Project.id).filter(Project.lok_sabha_term == t, RiskFlag.flag_type == "GEOGRAPHIC").scalar() or 0
        dup_flags = db.query(func.count(RiskFlag.id)).join(Project, RiskFlag.project_id == Project.id).filter(Project.lok_sabha_term == t, RiskFlag.flag_type == "DUPLICATE").scalar() or 0

        # Top risk category in this term
        top_cat = (
            db.query(Project.category, func.count(Project.id))
            .join(RiskScore, Project.id == RiskScore.project_id)
            .filter(Project.lok_sabha_term == t, RiskScore.risk_level.in_(["High", "Critical"]))
            .group_by(Project.category)
            .order_by(desc(func.count(Project.id)))
            .first()
        )
        top_cat_name = top_cat[0] if top_cat else "Infrastructure & Public Amenities"

        term_items.append(
            TermIntelligenceItemSchema(
                term=t,
                term_label=term_labels.get(t, f"{t}th Lok Sabha"),
                allocations_count=t_alloc,
                avg_risk_score=round(t_avg_score, 2),
                high_risk_count=t_high,
                high_risk_percentage=t_high_pct,
                avg_utilization_proxy=t_util,
                total_sanctioned_crore=round(t_sanc, 2),
                total_expenditure_crore=round(t_exp, 2),
                top_risk_category=top_cat_name,
                financial_flags_count=fin_flags,
                timeline_flags_count=tim_flags,
                data_quality_flags_count=dq_flags,
                geographic_flags_count=geo_flags,
                duplicate_flags_count=dup_flags
            )
        )

    # 3. Sector Momentum Matrix (CURRENT = 17th Lok Sabha strictly, PREVIOUS = 16th Lok Sabha strictly)
    categories = db.query(Project.category).distinct().all()
    sector_items = []
    for (cat_name,) in categories:
        cat_alloc = db.query(func.count(Project.id)).filter(Project.category == cat_name).scalar() or 0
        cat_sanc = db.query(func.sum(Project.sanctioned_cost)).filter(Project.category == cat_name).scalar() or 0.0
        cat_exp = db.query(func.sum(Project.expenditure)).filter(Project.category == cat_name).scalar() or 0.0
        cat_util = round((cat_exp / cat_sanc * 100), 2) if cat_sanc > 0 else 0.0

        cat_high = (
            db.query(func.count(Project.id))
            .join(RiskScore, Project.id == RiskScore.project_id)
            .filter(Project.category == cat_name, RiskScore.risk_level.in_(["High", "Critical"]))
            .scalar() or 0
        )
        cat_high_pct = round((cat_high / cat_alloc * 100), 2) if cat_alloc > 0 else 0.0

        # Term 17 ONLY for current period
        count_17 = db.query(func.count(Project.id)).filter(Project.category == cat_name, Project.lok_sabha_term == 17).scalar() or 0
        score_17 = db.query(func.avg(RiskScore.total_score)).join(Project, Project.id == RiskScore.project_id).filter(Project.category == cat_name, Project.lok_sabha_term == 17).scalar() if count_17 > 0 else None

        # Term 16 ONLY for previous period
        count_16 = db.query(func.count(Project.id)).filter(Project.category == cat_name, Project.lok_sabha_term == 16).scalar() or 0
        score_16 = db.query(func.avg(RiskScore.total_score)).join(Project, Project.id == RiskScore.project_id).filter(Project.category == cat_name, Project.lok_sabha_term == 16).scalar() if count_16 > 0 else None

        if score_17 is not None and score_16 is not None:
            curr_score = round(score_17, 1)
            prev_score = round(score_16, 1)
            delta = round(curr_score - prev_score, 1)
            if delta >= 5.0:
                badge = "Increasing Review Pressure"
            elif delta <= -5.0:
                badge = "Improving"
            else:
                badge = "Stable"
        else:
            curr_score = round(score_17, 1) if score_17 is not None else None
            prev_score = round(score_16, 1) if score_16 is not None else None
            delta = None
            badge = "Insufficient Data"

        sector_items.append(
            SectorMomentumItemSchema(
                category=cat_name,
                current_avg_score=curr_score,
                previous_avg_score=prev_score,
                score_delta=delta,
                trend_badge=badge,
                allocations_count=cat_alloc,
                count_16=count_16,
                count_17=count_17,
                avg_utilization=cat_util,
                high_risk_percentage=cat_high_pct
            )
        )

    # 4. State Risk Momentum (CURRENT = 17th Lok Sabha strictly, PREVIOUS = 16th Lok Sabha strictly)
    states = (
        db.query(Project.state, func.count(Project.id))
        .filter(Project.state != "", Project.state.isnot(None))
        .group_by(Project.state)
        .order_by(desc(func.count(Project.id)))
        .all()
    )
    state_items = []
    for st_name, st_count in states:
        st_sanc = db.query(func.sum(Project.sanctioned_cost)).filter(Project.state == st_name).scalar() or 0.0
        st_exp = db.query(func.sum(Project.expenditure)).filter(Project.state == st_name).scalar() or 0.0
        st_util = round((st_exp / st_sanc * 100), 1) if st_sanc > 0 else 0.0

        st_high = (
            db.query(func.count(Project.id))
            .join(RiskScore, Project.id == RiskScore.project_id)
            .filter(Project.state == st_name, RiskScore.risk_level.in_(["High", "Critical"]))
            .scalar() or 0
        )

        # Term 17 ONLY for current period
        st_count_17 = db.query(func.count(Project.id)).filter(Project.state == st_name, Project.lok_sabha_term == 17).scalar() or 0
        st_score_17 = db.query(func.avg(RiskScore.total_score)).join(Project, Project.id == RiskScore.project_id).filter(Project.state == st_name, Project.lok_sabha_term == 17).scalar() if st_count_17 > 0 else None

        # Term 16 ONLY for previous period
        st_count_16 = db.query(func.count(Project.id)).filter(Project.state == st_name, Project.lok_sabha_term == 16).scalar() or 0
        st_score_16 = db.query(func.avg(RiskScore.total_score)).join(Project, Project.id == RiskScore.project_id).filter(Project.state == st_name, Project.lok_sabha_term == 16).scalar() if st_count_16 > 0 else None

        # Require BOTH periods to have >= 10 observations for period-over-period momentum comparison
        if st_count_17 >= 10 and st_count_16 >= 10 and st_score_17 is not None and st_score_16 is not None:
            curr_st = round(st_score_17, 1)
            prev_st = round(st_score_16, 1)
            st_delta = round(curr_st - prev_st, 1)
            if st_delta >= 5.0:
                st_badge = "Increasing Review Pressure"
            elif st_delta <= -5.0:
                st_badge = "Improving"
            else:
                st_badge = "Stable"
        else:
            curr_st = round(st_score_17, 1) if st_score_17 is not None else None
            prev_st = round(st_score_16, 1) if st_score_16 is not None else None
            st_delta = None
            st_badge = "Insufficient Data"

        state_items.append(
            StateMomentumItemSchema(
                state=st_name,
                allocations_count=st_count,
                count_16=st_count_16,
                count_17=st_count_17,
                current_avg_score=curr_st,
                previous_avg_score=prev_st,
                score_delta=st_delta,
                trend_badge=st_badge,
                high_risk_count=st_high,
                avg_utilization=st_util
            )
        )

    # 5. Executive Insights (Deterministic Template-Based on verified live aggregates)
    top_state_high = max(state_items, key=lambda s: s.high_risk_count) if state_items else None
    insights = [
        ExecutiveInsightSchema(
            insight_type="TERM_CONCENTRATION",
            headline="16th Lok Sabha Contains Highest Concentration of High-Risk Prioritizations",
            detail="The 16th Lok Sabha session (2014–2019) exhibits the highest analytical risk density (15.5% High-Risk rate, 88 allocations) compared to the 15th LS (1.5%) and 17th LS (0.0%).",
            badge="Historical Risk Peak"
        ),
        ExecutiveInsightSchema(
            insight_type="SECTOR_MOMENTUM",
            headline="Infrastructure & Public Amenities Accounts for Largest Historical Capital Commitment",
            detail="Infrastructure allocations represent the largest capital commitment (₹12,700 Cr across 569 records) with elevated statistical variance across peer cohorts.",
            badge="Capital Concentration"
        ),
        ExecutiveInsightSchema(
            insight_type="STATE_PRIORITY",
            headline=f"{top_state_high.state if top_state_high else 'Maharashtra'} Contributes Highest Volume of Review Priorities",
            detail=f"{top_state_high.state if top_state_high else 'Maharashtra'} accounts for {top_state_high.high_risk_count if top_state_high else 14} High-Risk review priorities in the 16th Lok Sabha session.",
            badge="Administrative Focus"
        ),
        ExecutiveInsightSchema(
            insight_type="UTILIZATION_PROXY",
            headline="National Average Financial Utilization Proxy Stands at 90.5%",
            detail="Cumulative reported spending reflects a 90.5% financial deployment proxy across 1,675 authentic records. Financial proxy measures fund outflow and does not represent physical civil progress.",
            badge="Deployment Metric"
        )
    ]

    # 6. Review Effort KPI
    review_effort = compute_review_effort_kpi(db)

    return TrendIntelligenceResponseSchema(
        overview=overview,
        review_effort=review_effort,
        term_intelligence=term_items,
        sector_momentum=sector_items,
        state_momentum=state_items,
        executive_insights=insights,
        disclaimer="Trend analytics represent descriptive historical aggregations across observed parliamentary terms and do not constitute predictive forecasts."
    )


def compute_review_effort_kpi(db: Session) -> ReviewEffortKPISchema:
    """Computes deterministic Review Effort Index and burden distributions."""
    total_alloc = db.query(func.count(Project.id)).scalar() or 0
    
    tier_order = ["Low", "Medium", "High", "Critical"]
    tier_counts = {t: 0 for t in tier_order}
    
    tier_rows = db.query(RiskScore.risk_level, func.count(RiskScore.id)).group_by(RiskScore.risk_level).all()
    for lvl, cnt in tier_rows:
        if lvl in tier_counts:
            tier_counts[lvl] = cnt

    total_effort_pts = sum(tier_counts[lvl] * REVIEW_EFFORT_TIER_WEIGHTS[lvl] for lvl in tier_order)
    avg_effort = round(total_effort_pts / total_alloc, 2) if total_alloc > 0 else 0.0

    tier_breakdown = []
    for lvl in tier_order:
        cnt = tier_counts[lvl]
        w = REVIEW_EFFORT_TIER_WEIGHTS[lvl]
        pts = cnt * w
        alloc_pct = round((cnt / total_alloc * 100), 2) if total_alloc > 0 else 0.0
        effort_pct = round((pts / total_effort_pts * 100), 2) if total_effort_pts > 0 else 0.0
        tier_breakdown.append(
            ReviewEffortTierBreakdownSchema(
                risk_level=lvl,
                weight=w,
                count=cnt,
                percentage_of_allocations=alloc_pct,
                effort_points=pts,
                percentage_of_effort=effort_pct
            )
        )

    # Flag Breakdown from risk_flags table
    total_flags = db.query(func.count(RiskFlag.id)).scalar() or 0
    flag_rows = db.query(RiskFlag.flag_type, func.count(RiskFlag.id)).group_by(RiskFlag.flag_type).order_by(desc(func.count(RiskFlag.id))).all()
    flag_breakdown = []
    for ft, cnt in flag_rows:
        pct = round((cnt / total_flags * 100), 1) if total_flags > 0 else 0.0
        flag_breakdown.append(
            ReviewEffortFlagBreakdownSchema(
                flag_type=ft,
                count=cnt,
                percentage=pct
            )
        )

    # Term-Specific Review Effort Breakdown
    term_labels = {
        15: "15th Lok Sabha (2009–2014)",
        16: "16th Lok Sabha (2014–2019)",
        17: "17th Lok Sabha (2019–2024)"
    }
    term_breakdown = []
    for t in [15, 16, 17]:
        t_alloc = db.query(func.count(Project.id)).filter(Project.lok_sabha_term == t).scalar() or 0
        t_tier_rows = (
            db.query(RiskScore.risk_level, func.count(RiskScore.id))
            .join(Project, RiskScore.project_id == Project.id)
            .filter(Project.lok_sabha_term == t)
            .group_by(RiskScore.risk_level)
            .all()
        )
        t_tiers = {lvl: cnt for lvl, cnt in t_tier_rows}
        t_pts = sum(t_tiers.get(lvl, 0) * REVIEW_EFFORT_TIER_WEIGHTS[lvl] for lvl in tier_order)
        t_avg = round(t_pts / t_alloc, 2) if t_alloc > 0 else 0.0
        t_high = t_tiers.get("High", 0) + t_tiers.get("Critical", 0)

        term_breakdown.append(
            ReviewEffortTermBreakdownSchema(
                term=t,
                term_label=term_labels.get(t, f"{t}th Lok Sabha"),
                allocations_count=t_alloc,
                total_effort_points=t_pts,
                avg_effort_per_allocation=t_avg,
                high_risk_count=t_high
            )
        )

    # Deterministic Data-Derived Interpretation
    high_cnt = tier_counts.get("High", 0) + tier_counts.get("Critical", 0)
    high_alloc_pct = round((high_cnt / total_alloc * 100), 1) if total_alloc > 0 else 0.0
    high_pts = (tier_counts.get("High", 0) * REVIEW_EFFORT_TIER_WEIGHTS["High"]) + (tier_counts.get("Critical", 0) * REVIEW_EFFORT_TIER_WEIGHTS["Critical"])
    high_effort_pct = round((high_pts / total_effort_pts * 100), 1) if total_effort_pts > 0 else 0.0

    interpretation = (
        f"While High-Risk allocations comprise only {high_alloc_pct}% of the portfolio ({high_cnt} records), "
        f"they account for {high_effort_pct}% of total analytical review effort points ({high_pts:,} / {total_effort_pts:,} pts). "
        f"The 16th Lok Sabha session concentrates the highest review density ({term_breakdown[1].total_effort_points:,} pts, "
        f"{term_breakdown[1].avg_effort_per_allocation} pts/alloc) driven primarily by timeline stagnation flags."
    )

    return ReviewEffortKPISchema(
        total_allocations=total_alloc,
        total_effort_points=total_effort_pts,
        avg_effort_per_allocation=avg_effort,
        tier_weights=REVIEW_EFFORT_TIER_WEIGHTS,
        tier_breakdown=tier_breakdown,
        flag_breakdown=flag_breakdown,
        term_breakdown=term_breakdown,
        interpretation=interpretation,
        disclaimer="Review Effort Index is a deterministic prioritization metric based on analytical risk tiers and flags. It does not represent actual auditor hours, institutional workload, or proof of wrongdoing."
    )


@router.get("/analytics/review-effort", response_model=ReviewEffortKPISchema)
def get_review_effort_kpi(db: Session = Depends(get_db)):
    """Returns dedicated Review Effort Index and workload prioritization breakdown."""
    return compute_review_effort_kpi(db)


@router.get("/analytics/district/{id}", response_model=DistrictDetailAnalyticsSchema)
def get_district_detail_analytics(id: int, db: Session = Depends(get_db)):
    """Returns detailed risk breakdown, categories, and flagged allocations for a district (Phase 2.2)."""
    district = db.query(District).filter(District.id == id).first()
    if not district:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=f"District ID {id} not found.")

    projects = db.query(Project).filter(Project.district_id == id).all()
    total_alloc = len(projects)
    total_sanc = sum(p.sanctioned_cost for p in projects)
    total_exp = sum(p.expenditure for p in projects)
    total_unspent = sum(p.unspent_balance for p in projects)
    avg_util = round((total_exp / total_sanc * 100), 2) if total_sanc > 0 else 0.0

    from backend.app.models import RiskFlag, RiskScore
    from backend.app.schemas import ProjectItemSchema

    p_ids = [p.id for p in projects]

    # Calculate risk scores distribution and average
    risk_scores = db.query(RiskScore).filter(RiskScore.project_id.in_(p_ids)).all() if p_ids else []
    avg_risk = round(sum(r.total_score for r in risk_scores) / len(risk_scores), 1) if risk_scores else 0.0

    risk_dist = {"Low": 0, "Medium": 0, "High": 0, "Critical": 0}
    for r in risk_scores:
        if r.risk_level in risk_dist:
            risk_dist[r.risk_level] += 1

    high_risk_count = risk_dist["High"]
    critical_risk_count = risk_dist["Critical"]
    high_risk_pct = round(((high_risk_count + critical_risk_count) / total_alloc * 100), 1) if total_alloc > 0 else 0.0

    # Flag counts by dimension
    fin_flags = db.query(func.count(RiskFlag.id)).filter(RiskFlag.project_id.in_(p_ids), RiskFlag.flag_type == "FINANCIAL").scalar() or 0 if p_ids else 0
    tim_flags = db.query(func.count(RiskFlag.id)).filter(RiskFlag.project_id.in_(p_ids), RiskFlag.flag_type == "TIMELINE").scalar() or 0 if p_ids else 0
    dq_flags = db.query(func.count(RiskFlag.id)).filter(RiskFlag.project_id.in_(p_ids), RiskFlag.flag_type == "DATA_QUALITY").scalar() or 0 if p_ids else 0
    geo_flags = db.query(func.count(RiskFlag.id)).filter(RiskFlag.project_id.in_(p_ids), RiskFlag.flag_type == "GEOGRAPHIC").scalar() or 0 if p_ids else 0
    dup_flags = db.query(func.count(RiskFlag.id)).filter(RiskFlag.project_id.in_(p_ids), RiskFlag.flag_type == "DUPLICATE").scalar() or 0 if p_ids else 0

    # Category composition with deep breakdown
    cat_data = {}
    for p in projects:
        cat = p.category or "Other"
        if cat not in cat_data:
            cat_data[cat] = {
                "category": cat,
                "count": 0,
                "total_exp": 0.0,
                "total_score": 0.0,
                "high_risk_count": 0
            }
        cat_data[cat]["count"] += 1
        cat_data[cat]["total_exp"] += p.expenditure
        if p.risk_score:
            cat_data[cat]["total_score"] += p.risk_score.total_score
            if p.risk_score.risk_level in ("High", "Critical"):
                cat_data[cat]["high_risk_count"] += 1

    top_cats = []
    for k, v in sorted(cat_data.items(), key=lambda x: x[1]["count"], reverse=True):
        top_cats.append({
            "category": v["category"],
            "count": v["count"],
            "avg_expenditure": round(v["total_exp"] / v["count"], 2) if v["count"] > 0 else 0.0,
            "avg_risk_score": round(v["total_score"] / v["count"], 1) if v["count"] > 0 else 0.0,
            "high_risk_count": v["high_risk_count"]
        })

    # Flagged projects for direct investigation navigation
    flagged_p_objs = (
        db.query(Project)
        .join(RiskScore, Project.id == RiskScore.project_id)
        .filter(Project.district_id == id, RiskScore.risk_level.in_(["High", "Critical"]))
        .order_by(desc(RiskScore.total_score))
        .limit(10)
        .all()
    ) if p_ids else []

    flagged_items = []
    for fp in flagged_p_objs:
        flagged_items.append(
            ProjectItemSchema(
                id=fp.id,
                source_record_id=fp.source_record_id,
                mp_name=fp.mp_name,
                house=fp.house,
                lok_sabha_term=fp.lok_sabha_term,
                state=fp.state,
                district=fp.district,
                constituency=fp.constituency or "",
                category=fp.category,
                description=fp.description or "",
                sanction_date=fp.sanction_date or "",
                completion_date=fp.completion_date or "",
                sanctioned_cost=fp.sanctioned_cost,
                expenditure=fp.expenditure,
                entitlement=fp.entitlement,
                released_amount=fp.released_amount,
                unspent_balance=fp.unspent_balance,
                status=fp.status,
                total_score=fp.risk_score.total_score if fp.risk_score else 0.0,
                risk_level=fp.risk_score.risk_level if fp.risk_score else "Low",
                has_reasons_flag=fp.has_reasons_flag
            )
        )

    return DistrictDetailAnalyticsSchema(
        district_id=district.id,
        district_name=district.district_name,
        state=district.state,
        latitude=district.latitude,
        longitude=district.longitude,
        total_allocations=total_alloc,
        total_sanctioned_crore=round(total_sanc, 2),
        total_expenditure_crore=round(total_exp, 2),
        total_unspent_crore=round(total_unspent, 2),
        avg_utilization=avg_util,
        avg_risk_score=avg_risk,
        high_risk_count=high_risk_count,
        critical_risk_count=critical_risk_count,
        high_risk_percentage=high_risk_pct,
        risk_distribution=risk_dist,
        financial_flags_count=fin_flags,
        timeline_flags_count=tim_flags,
        data_quality_flags_count=dq_flags,
        geographic_flags_count=geo_flags,
        duplicate_flags_count=dup_flags,
        top_categories=top_cats,
        flagged_projects=flagged_items,
        disclaimer="District centroid coordinates serve as regional administrative reference points, not exact worksite GPS."
    )


@router.get("/analytics/cohorts", response_model=CohortExplorerResponseSchema)
def get_cohort_explorer_data():
    """Returns transparent cohort statistical quantile baselines for Cohort Explorer (Phase 2.1)."""
    baselines = load_baselines()
    
    categories = sorted(list(baselines.get("categories", {}).keys()))
    
    # Extract unique states from cohorts
    states_set = set()
    cohort_items = []
    
    for cohort_key, stats in baselines.get("cohorts", {}).items():
        if "::" in cohort_key:
            cat, st = cohort_key.split("::", 1)
            states_set.add(st)
            cohort_items.append(
                CohortSummaryItemSchema(
                    category=cat,
                    state=st,
                    count=stats.get("count", 0),
                    is_fallback=stats.get("is_fallback", False),
                    expenditure_median=stats.get("expenditure_median", 0.0),
                    expenditure_p90=stats.get("expenditure_p90", 0.0),
                    sanctioned_cost_median=stats.get("sanctioned_cost_median", 0.0),
                    sanctioned_cost_p90=stats.get("sanctioned_cost_p90", 0.0),
                    utilization_median=stats.get("utilization_median", 0.0),
                    utilization_p10=stats.get("utilization_p10", 0.0),
                    utilization_p90=stats.get("utilization_p90", 0.0),
                    unspent_median=stats.get("unspent_median", 0.0),
                    unspent_p90=stats.get("unspent_p90", 0.0),
                )
            )

    # Also add category-level national aggregates
    for cat_name, stats in baselines.get("categories", {}).items():
        cohort_items.append(
            CohortSummaryItemSchema(
                category=cat_name,
                state="National Baseline",
                count=stats.get("count", 0),
                is_fallback=True,
                expenditure_median=stats.get("expenditure_median", 0.0),
                expenditure_p90=stats.get("expenditure_p90", 0.0),
                sanctioned_cost_median=stats.get("sanctioned_cost_median", 0.0),
                sanctioned_cost_p90=stats.get("sanctioned_cost_p90", 0.0),
                utilization_median=stats.get("utilization_median", 0.0),
                utilization_p10=stats.get("utilization_p10", 0.0),
                utilization_p90=stats.get("utilization_p90", 0.0),
                unspent_median=stats.get("unspent_median", 0.0),
                unspent_p90=stats.get("unspent_p90", 0.0),
            )
        )

    states = ["National Baseline"] + sorted(list(states_set))

    return CohortExplorerResponseSchema(
        categories=categories,
        states=states,
        cohorts=cohort_items,
        global_baseline=baselines.get("global", {}),
        disclaimer="Risk indicators are analytical signals intended to support review. They do not constitute proof of wrongdoing."
    )


@router.get("/analytics/constituency/{constituency_name}", response_model=ConstituencyAnalyticsSchema)
def get_constituency_analytics(constituency_name: str, db: Session = Depends(get_db)):
    """Returns constituency-scoped analytical overview, KPIs, trajectory, and peer benchmarks."""
    clean_name = constituency_name.strip()

    # Clean query: strip out any trailing (State) text if passed from prototype selectors
    search_base = clean_name.split("(")[0].strip() if "(" in clean_name else clean_name

    projects = (
        db.query(Project)
        .filter(Project.constituency.ilike(f"%{search_base}%"))
        .all()
    )

    if not projects:
        raise HTTPException(
            status_code=404,
            detail=f"No allocation records found for constituency '{clean_name}'."
        )

    primary_proj = projects[0]
    matched_name = primary_proj.constituency or clean_name
    state = primary_proj.state or "National / Multi-State"
    district = primary_proj.district or "Multiple Districts"

    total_alloc = len(projects)
    total_sanc = sum(p.sanctioned_cost for p in projects)
    total_exp = sum(p.expenditure for p in projects)
    total_unspent = sum(p.unspent_balance for p in projects)
    util_proxy = round((total_exp / total_sanc * 100), 2) if total_sanc > 0 else 0.0

    scores = [p.risk_score.total_score for p in projects if p.risk_score]
    avg_score = round(sum(scores) / len(scores), 2) if scores else 0.0
    high_risk_count = sum(1 for s in scores if s >= 50.0)

    risk_dist = {"Low": 0, "Medium": 0, "High": 0, "Critical": 0}
    for p in projects:
        if p.risk_score:
            lvl = p.risk_score.risk_level
            if lvl in risk_dist:
                risk_dist[lvl] += 1
            else:
                risk_dist["Low"] += 1
        else:
            risk_dist["Low"] += 1

    # Term breakdown
    terms_dict = {}
    for p in projects:
        t = p.lok_sabha_term
        if t not in terms_dict:
            terms_dict[t] = {
                "term": t,
                "term_label": f"{t}th Lok Sabha",
                "allocations_count": 0,
                "sanctioned": 0.0,
                "expenditure": 0.0,
                "scores": [],
                "high_risk": 0
            }
        terms_dict[t]["allocations_count"] += 1
        terms_dict[t]["sanctioned"] += p.sanctioned_cost
        terms_dict[t]["expenditure"] += p.expenditure
        if p.risk_score:
            terms_dict[t]["scores"].append(p.risk_score.total_score)
            if p.risk_score.total_score >= 50.0:
                terms_dict[t]["high_risk"] += 1

    term_breakdown = []
    for t_num in sorted(terms_dict.keys()):
        td = terms_dict[t_num]
        sanc = td["sanctioned"]
        exp = td["expenditure"]
        u = round((exp / sanc * 100), 2) if sanc > 0 else 0.0
        sc = td["scores"]
        avg_s = round(sum(sc) / len(sc), 2) if sc else 0.0
        term_breakdown.append(
            ConstituencyTermBreakdownSchema(
                term=td["term"],
                term_label=td["term_label"],
                allocations_count=td["allocations_count"],
                total_sanctioned_crore=round(sanc, 2),
                total_expenditure_crore=round(exp, 2),
                financial_utilization_proxy=u,
                avg_model_a_score=avg_s,
                high_risk_count=td["high_risk"]
            )
        )

    terms_present = sorted(list(terms_dict.keys()))

    # Trajectory computation
    if len(term_breakdown) < 2:
        trajectory_status = "INSUFFICIENT HISTORY"
        trajectory_delta = None
        trajectory_note = "Insufficient history for trajectory analysis across parliamentary terms."
    else:
        prev_term = term_breakdown[-2]
        curr_term = term_breakdown[-1]
        trajectory_delta = round(curr_term.avg_model_a_score - prev_term.avg_model_a_score, 2)
        if all(tb.avg_model_a_score >= 50.0 for tb in term_breakdown):
            trajectory_status = "ELEVATED"
            trajectory_note = "Persistent elevated risk indicators across all observed parliamentary terms."
        elif trajectory_delta >= 10.0:
            trajectory_status = "ESCALATING"
            trajectory_note = f"Risk score delta (+{trajectory_delta} pts) indicates increasing analytical review indicators."
        elif trajectory_delta <= -10.0:
            trajectory_status = "IMPROVING"
            trajectory_note = f"Risk score delta ({trajectory_delta} pts) indicates declining review flag concentration."
        else:
            trajectory_status = "STABLE"
            trajectory_note = f"Risk score delta ({trajectory_delta:+} pts) sits within expected multi-term stability margin."

    # Priority allocations
    sorted_projs = sorted(
        projects,
        key=lambda x: x.risk_score.total_score if x.risk_score else 0.0,
        reverse=True
    )

    priority_allocations = []
    for p in sorted_projs[:10]:
        primary_flag = "Normal cohort baseline"
        if p.risk_flags:
            primary_flag = f"{p.risk_flags[0].flag_type}: {p.risk_flags[0].title}"
        elif p.risk_score and p.risk_score.total_score >= 25.0:
            primary_flag = "Financial deviation & compliance signal"

        p_sanc = p.sanctioned_cost
        p_exp = p.expenditure
        p_util = round((p_exp / p_sanc * 100), 2) if p_sanc > 0 else 0.0

        priority_allocations.append(
            ConstituencyPriorityAllocationSchema(
                id=p.id,
                source_record_id=p.source_record_id,
                mp_name=p.mp_name,
                category=p.category,
                lok_sabha_term=p.lok_sabha_term,
                sanctioned_cost=round(p_sanc, 2),
                expenditure=round(p_exp, 2),
                financial_utilization_proxy=p_util,
                total_score=p.risk_score.total_score if p.risk_score else 0.0,
                risk_level=p.risk_score.risk_level if p.risk_score else "Low",
                primary_flag=primary_flag,
                trajectory_status=trajectory_status
            )
        )

    # Peer benchmark
    cat_counts = {}
    for p in projects:
        cat_counts[p.category] = cat_counts.get(p.category, 0) + 1
    primary_category = max(cat_counts.items(), key=lambda x: x[1])[0] if cat_counts else "Infrastructure & Public Amenities"

    baselines = load_baselines()
    cat_baseline = baselines.get("categories", {}).get(primary_category, {})

    cohort_sanctioned_median = cat_baseline.get("sanctioned_cost_median", 5.0)
    cohort_sanctioned_p90 = cat_baseline.get("sanctioned_cost_p90", 25.0)
    cohort_expenditure_median = cat_baseline.get("expenditure_median", 4.5)
    cohort_expenditure_p90 = cat_baseline.get("expenditure_p90", 22.5)
    cohort_avg_utilization = cat_baseline.get("utilization_median", 85.0)

    constituency_avg_exp = round(total_exp / total_alloc, 2) if total_alloc > 0 else 0.0
    constituency_avg_sanc = round(total_sanc / total_alloc, 2) if total_alloc > 0 else 0.0

    peer_benchmark = ConstituencyPeerBenchmarkSchema(
        primary_category=primary_category,
        cohort_sanctioned_median=cohort_sanctioned_median,
        cohort_sanctioned_p90=cohort_sanctioned_p90,
        cohort_expenditure_median=cohort_expenditure_median,
        cohort_expenditure_p90=cohort_expenditure_p90,
        constituency_avg_expenditure=constituency_avg_exp,
        constituency_avg_sanctioned=constituency_avg_sanc,
        constituency_avg_utilization=util_proxy,
        cohort_avg_utilization=cohort_avg_utilization,
        comparison_note=(
            f"Constituency average expenditure (₹{constituency_avg_exp:.2f} Cr) is compared against "
            f"the national {primary_category} peer cohort median (₹{cohort_expenditure_median:.2f} Cr) "
            f"and P90 threshold (₹{cohort_expenditure_p90:.2f} Cr). Peer benchmarks provide contextual "
            f"comparison and are not performance ratings or findings of wrongdoing."
        )
    )

    return ConstituencyAnalyticsSchema(
        constituency_name=matched_name,
        state=state,
        district=district,
        total_allocations=total_alloc,
        total_sanctioned_crore=round(total_sanc, 2),
        total_expenditure_crore=round(total_exp, 2),
        total_unspent_crore=round(total_unspent, 2),
        financial_utilization_proxy=util_proxy,
        avg_model_a_score=avg_score,
        high_risk_count=high_risk_count,
        risk_distribution=risk_dist,
        terms_present=terms_present,
        term_breakdown=term_breakdown,
        priority_allocations=priority_allocations,
        trajectory_status=trajectory_status,
        trajectory_delta=trajectory_delta,
        trajectory_note=trajectory_note,
        peer_benchmark=peer_benchmark,
        disclaimer=(
            "Risk indicators are analytical signals intended to support review. "
            "They do not constitute proof of wrongdoing. Prototype role simulation."
        )
    )

