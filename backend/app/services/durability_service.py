"""Investment–Durability Anomaly Detection Service for MPLADS Samiksha (Phase B).

Provides:
- Explainable comparative screening heuristics evaluating public financial investment
  against available citizen condition/maintenance observations.
- Category-level cohort benchmarking using empirical percentiles (Median, P90).
- Elapsed timeline evaluation between milestone dates (completion/sanction) and citizen observations.
- Transparent, non-accusatory review signals for human audit prioritization.
- Strict isolation from Model A scoring and risk tiers.
"""

import os
import json
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.models import Project, Complaint
from backend.app.services.evidence_service import _parse_date

BASELINES_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "ml", "cohort_baselines.json")
)

# Condition-related citizen observation categories
CONDITION_CATEGORIES = {
    "QUALITY_CONCERN",
    "WORK_INCOMPLETE",
    "WORK_NOT_FOUND",
    "ASSET_NOT_FOUND",
}

DISCLAIMER_TEXT = (
    "This analytical signal compares public investment level against available citizen condition "
    "observations. It does not measure structural durability, material lifespan, or establish wrongdoing."
)


def load_category_baselines() -> Dict[str, Any]:
    """Loads empirical category baseline percentiles from cohort_baselines.json."""
    if os.path.exists(BASELINES_PATH):
        try:
            with open(BASELINES_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
                return data.get("categories", {})
        except Exception:
            pass
    return {}


def evaluate_investment_durability(
    project: Project,
    db: Session,
) -> Dict[str, Any]:
    """Computes the Investment–Durability Review Signal for a parliamentary work allocation.
    
    Evaluates:
    1. Financial investment tier relative to category cohort baseline (Median, P90).
    2. Linked citizen observation history, focusing on condition/quality concerns.
    3. Elapsed timeline from project milestone (completion date or sanction date) to report(s).
    4. Deterministic screening signal classification.
    """
    if not project:
        return {
            "source_record_id": "UNKNOWN",
            "category": "Unknown",
            "sanctioned_cost_crore": 0.0,
            "expenditure_crore": 0.0,
            "category_median_cost_crore": 0.0,
            "category_p90_cost_crore": 0.0,
            "investment_level": "Data Insufficient",
            "is_high_investment": False,
            "total_reports_count": 0,
            "condition_reports_count": 0,
            "relevant_categories": [],
            "has_repeated_reports": False,
            "elapsed_months": None,
            "elapsed_time_description": "No milestone data available.",
            "signal_status": "DATA_INSUFFICIENT",
            "signal_badge": "Data Insufficient",
            "signal_reason": "Allocation record not found.",
            "disclaimer": DISCLAIMER_TEXT,
        }

    category = project.category or "Other"
    sanctioned = float(project.sanctioned_cost or 0.0)
    expenditure = float(project.expenditure or 0.0)
    primary_cost = sanctioned if sanctioned > 0 else expenditure

    # 1. Category Cohort Benchmark
    category_baselines = load_category_baselines()
    cat_data = category_baselines.get(category, {})

    median_cost = float(cat_data.get("sanctioned_cost_median", cat_data.get("expenditure_median", 15.0)))
    p90_cost = float(cat_data.get("sanctioned_cost_p90", cat_data.get("expenditure_p90", 22.0)))

    if primary_cost <= 0:
        inv_level = "Data Insufficient"
        is_high_inv = False
    elif primary_cost >= p90_cost:
        inv_level = f"Top Decile (≥ P90: ₹{p90_cost:.2f} Cr)"
        is_high_inv = True
    elif primary_cost >= median_cost:
        inv_level = f"Upper Cohort (≥ Median: ₹{median_cost:.2f} Cr)"
        is_high_inv = True
    else:
        inv_level = f"Cohort Normal (< Median: ₹{median_cost:.2f} Cr)"
        is_high_inv = False

    # 2. Linked Citizen Observations
    complaints = (
        db.query(Complaint)
        .filter(Complaint.linked_allocation_id == project.source_record_id)
        .order_by(Complaint.id.asc())
        .all()
    )

    total_reports = len(complaints)
    condition_complaints = [c for c in complaints if c.category in CONDITION_CATEGORIES]
    condition_count = len(condition_complaints)
    relevant_cats = sorted(list({c.category for c in complaints}))
    has_repeated = total_reports >= 2

    # 3. Elapsed Time Context
    completion_dt = _parse_date(project.completion_date)
    sanction_dt = _parse_date(project.sanction_date)
    milestone_dt = completion_dt if completion_dt else sanction_dt
    milestone_label = "completion" if completion_dt else "sanction"

    elapsed_months = None
    elapsed_str = "Timeline not available"

    if milestone_dt:
        # Determine reference date (first condition report date, or latest report, or current date)
        if condition_complaints and condition_complaints[0].submitted_at:
            ref_dt = _parse_date(condition_complaints[0].submitted_at) or datetime.now(timezone.utc).replace(tzinfo=None)
        elif complaints and complaints[0].submitted_at:
            ref_dt = _parse_date(complaints[0].submitted_at) or datetime.now(timezone.utc).replace(tzinfo=None)
        else:
            ref_dt = datetime.now(timezone.utc).replace(tzinfo=None)

        if ref_dt >= milestone_dt:
            delta_days = (ref_dt - milestone_dt).days
            elapsed_months = round(delta_days / 30.4375, 1)
            elapsed_years = round(delta_days / 365.25, 1)
            if elapsed_months < 12:
                elapsed_str = f"{int(elapsed_months)} months after {milestone_label}"
            else:
                elapsed_str = f"{elapsed_years} years ({int(elapsed_months)} months) after {milestone_label}"
        else:
            elapsed_str = f"Reported prior to recorded {milestone_label} date"

    # 4. Signal Determination
    if primary_cost <= 0:
        signal_status = "DATA_INSUFFICIENT"
        signal_badge = "Data Insufficient"
        signal_reason = "Sanctioned and expenditure figures are unavailable for financial benchmarking."

    elif total_reports == 0:
        signal_status = "INVESTMENT_CONDITION_NORMAL"
        signal_badge = "No Condition Concerns"
        signal_reason = f"Allocation investment (₹{primary_cost:.2f} Cr, {inv_level}) has zero recorded citizen condition concerns."

    elif is_high_inv and condition_count >= 2:
        signal_status = "HIGH_INVESTMENT_REPEATED_CONCERNS"
        signal_badge = "High Investment + Repeated Concerns"
        signal_reason = (
            f"Substantial financial investment (₹{primary_cost:.2f} Cr, {inv_level}) combined with {condition_count} "
            f"condition-related citizen reports ({', '.join(relevant_cats)}). Priority review recommended."
        )

    elif is_high_inv and condition_count >= 1 and (elapsed_months is not None and elapsed_months <= 36.0):
        signal_status = "HIGH_INVESTMENT_EARLY_CONDITION_CONCERN"
        signal_badge = "High Investment + Early Concern"
        signal_reason = (
            f"High-investment allocation (₹{primary_cost:.2f} Cr, {inv_level}) received condition observation "
            f"within {elapsed_str}. Human field inspection recommended."
        )

    elif condition_count >= 1:
        signal_status = "INVESTMENT_CONDITION_MONITORED"
        signal_badge = "Condition Observation Recorded"
        signal_reason = (
            f"Condition observation ({', '.join(relevant_cats)}) recorded for allocation with standard cohort investment "
            f"(₹{primary_cost:.2f} Cr). Active administrative monitoring."
        )

    else:
        # Non-condition complaints (e.g. administrative inquiry)
        signal_status = "INVESTMENT_CONDITION_NORMAL"
        signal_badge = "Standard Monitoring"
        signal_reason = (
            f"Allocation investment (₹{primary_cost:.2f} Cr, {inv_level}) has {total_reports} citizen report(s) "
            f"without physical structural defect flags."
        )

    return {
        "source_record_id": project.source_record_id,
        "category": category,
        "sanctioned_cost_crore": round(sanctioned, 2),
        "expenditure_crore": round(expenditure, 2),
        "category_median_cost_crore": round(median_cost, 2),
        "category_p90_cost_crore": round(p90_cost, 2),
        "investment_level": inv_level,
        "is_high_investment": is_high_inv,
        "total_reports_count": total_reports,
        "condition_reports_count": condition_count,
        "relevant_categories": relevant_cats,
        "has_repeated_reports": has_repeated,
        "elapsed_months": elapsed_months,
        "elapsed_time_description": elapsed_str,
        "signal_status": signal_status,
        "signal_badge": signal_badge,
        "signal_reason": signal_reason,
        "disclaimer": DISCLAIMER_TEXT,
    }
