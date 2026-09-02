"""Methodology Transparency Endpoint (T13).

Implements GET /api/methodology exposing published weights, formulas, thresholds, and Responsible AI disclaimers.
"""

from fastapi import APIRouter
from backend.app.schemas import MethodologyResponseSchema, MethodologyComponentSchema

router = APIRouter(prefix="/methodology", tags=["Methodology"])


@router.get("", response_model=MethodologyResponseSchema)
def get_methodology():
    """Returns mathematical formulation, weights, cohort parameters, and transparency disclosures."""
    components = [
        MethodologyComponentSchema(
            dimension="Financial Outlier Deviation (FIN)",
            weight=35,
            formula="min(35, max(0, ((expenditure - Cohort P50) / (Cohort P90 - Cohort P50)) * 35))",
            description="Evaluates reported expenditure against localized (Category, State) P90 cohort thresholds.",
            cohort_basis="(Category, State) for N >= 10; Category (National) fallback"
        ),
        MethodologyComponentSchema(
            dimension="Timeline & Administrative Stagnation (TIM)",
            weight=25,
            formula="25.0 if (active and exp == 0) else (18.0 if prior_term_16 else (22.0 if prior_term_15 else 0.0))",
            description="Identifies administrative retention across multi-year sessions without expenditure deployment.",
            cohort_basis="Parliamentary term lifecycle status"
        ),
        MethodologyComponentSchema(
            dimension="Data Quality & Compliance Review (DQ)",
            weight=20,
            formula="min(20, sum(5 * dq_flags))",
            description="Flags official audit certificate notations, missing MPRs, zero sanctioned costs, or accounting notes.",
            cohort_basis="Administrative delay records (ReasonsforNotRel)"
        ),
        MethodologyComponentSchema(
            dimension="Geographic Concentration (GEO)",
            weight=10,
            formula="10.0 * spatial_density_factor",
            description="Assesses spatial concentration across administrative district centroids.",
            cohort_basis="District centroid reference mapping"
        ),
        MethodologyComponentSchema(
            dimension="Duplicate Allocation Detection (DUP)",
            weight=10,
            formula="10.0 if duplicate_detected else 0.0",
            description="Detects duplicate allocation entries (evaluates to 0 on verified clean dataset).",
            cohort_basis="Exact and near-duplicate record matching"
        ),
    ]

    risk_levels = {
        "Low": "0.0 – 24.9: Normal cohort parameters",
        "Medium": "25.0 – 49.9: Minor single-dimension deviation or documentation item",
        "High": "50.0 – 74.9: Compounding multi-signal outlier or significant financial deviation",
        "Critical": "75.0 – 100.0: Severe multi-dimensional compounding anomaly across all criteria"
    }

    return MethodologyResponseSchema(
        title="MPLADS Samiksha Analytical Risk Scoring Methodology",
        version="2.0.0",
        composite_formula="min(100, 35·FIN + 25·TIM + min(20, 5·DQ) + 10·GEO + 10·DUP)",
        components=components,
        risk_levels=risk_levels,
        disclaimer="Risk indicators are analytical signals intended to support review. They do not constitute proof of wrongdoing."
    )
