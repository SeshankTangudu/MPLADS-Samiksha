"""Isolation Forest Cross-Check Router.

GET /api/analytics/isolation-forest

READ-ONLY endpoint. Serves the precomputed offline Isolation Forest artifact.

CLAIM SAFETY:
    "Isolation Forest identifies statistically unusual allocations for secondary review."
    "An outlier is NOT evidence of fraud or wrongdoing."
    "This does NOT change the platform's Model A risk score."
    "This does NOT replace the deterministic Model A scoring engine."

ARCHITECTURE:
    This endpoint serves a precomputed artifact (ml/if_results.json).
    The model is NOT re-fitted on every request.
    The artifact is generated offline by running: python ml/isolation_forest.py

No production database records are read, written, or modified by this endpoint.
"""

import os
import json
from typing import Any, Dict, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

# Path to the precomputed offline artifact.
# Resolves to: <project_root>/ml/if_results.json
# routers/ → app/ → backend/ → <project_root>/
_PROJECT_ROOT = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..")
)
IF_RESULTS_PATH = os.path.join(_PROJECT_ROOT, "ml", "if_results.json")

router = APIRouter(tags=["Isolation Forest Cross-Check"])


class IFSummarySchema(BaseModel):
    n_outliers: int
    n_inliers: int
    outlier_rate_pct: float
    model_a_tier_distribution_among_outliers: Dict[str, int]
    overlap_with_model_a_high: int
    overlap_with_model_a_medium: int
    overlap_with_model_a_low: int
    overlap_label: Optional[str] = "Overlap with Model A High Risk"
    overlap_note: str


class IFOutlierRecordSchema(BaseModel):
    source_record_id: str
    mp_name: str
    state: str
    constituency: str
    category: str
    status: str
    sanctioned_cost: float
    expenditure: float
    unspent_balance: float
    utilization_ratio: float
    lok_sabha_term: int
    if_anomaly_score: float = Field(..., description="Normalized anomaly score (0–1). Higher = more statistically unusual. NOT a fraud score.")
    if_percentile_rank: float
    if_is_outlier: bool
    if_label: str
    model_a_total_score: float
    model_a_risk_level: str


class IFCrossCheckResponseSchema(BaseModel):
    generated_at: str
    total_records_evaluated: int
    config: Dict[str, Any]
    claim_safety: str
    summary: IFSummarySchema
    top_outliers: list[IFOutlierRecordSchema]
    disclaimer: str = Field(
        default=(
            "Isolation Forest identifies statistical outliers in the selected feature space. "
            "An outlier is not evidence of fraud or wrongdoing and does not change the "
            "platform's Model A risk score. "
            "Risk indicators are analytical signals intended to support review. "
            "They do not constitute proof of wrongdoing."
        )
    )


def _load_artifact() -> Dict[str, Any]:
    """Load the precomputed offline IF artifact. Raises 503 if not yet generated."""
    path = os.path.abspath(IF_RESULTS_PATH)
    if not os.path.exists(path):
        raise HTTPException(
            status_code=503,
            detail=(
                "Isolation Forest artifact not yet generated. "
                "Run: python ml/isolation_forest.py"
            ),
        )
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


@router.get(
    "/analytics/isolation-forest",
    response_model=IFCrossCheckResponseSchema,
    summary="Isolation Forest Statistical Cross-Check (Read-Only)",
    description=(
        "Returns the precomputed offline Isolation Forest cross-check results. "
        "This is an independent statistical cross-check and does NOT replace Model A. "
        "No production records are modified by this endpoint."
    ),
)
def get_isolation_forest_results() -> IFCrossCheckResponseSchema:
    """
    Serves the precomputed Isolation Forest artifact.

    CLAIM SAFETY:
        - Outliers are statistically unusual allocations, NOT confirmed fraud.
        - Results do NOT modify Model A scores or tiers.
        - Model is fitted offline, NOT on every API call.
    """
    data = _load_artifact()

    return IFCrossCheckResponseSchema(
        generated_at=data["generated_at"],
        total_records_evaluated=data["total_records_evaluated"],
        config=data["config"],
        claim_safety=data["claim_safety"],
        summary=IFSummarySchema(**data["summary"]),
        top_outliers=[IFOutlierRecordSchema(**r) for r in data["top_outliers"]],
    )
