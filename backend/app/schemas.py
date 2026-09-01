"""Pydantic v2 Request/Response Schemas for MPLADS Samiksha (Frozen Contract T08).

Conforms strictly to docs/contracts/api_contract.md and docs/contracts/db_contract.md.
"""

from typing import List, Optional, Generic, TypeVar, Dict, Any
from pydantic import BaseModel, Field, computed_field, ConfigDict

T = TypeVar("T")


class PaginationEnvelope(BaseModel, Generic[T]):
    """Standardized API pagination wrapper."""
    items: List[T]
    total: int = Field(..., description="Total count of matching records")
    page: int = Field(..., ge=1, description="Current page number (1-indexed)")
    limit: int = Field(..., ge=1, le=100, description="Items per page")
    total_pages: int = Field(..., ge=0, description="Total pages available")


class RiskDistributionSchema(BaseModel):
    """Counts of allocations across four risk tiers."""
    low: int = Field(..., ge=0, description="Count of allocations in Low risk tier (0-24)")
    medium: int = Field(..., ge=0, description="Count of allocations in Medium risk tier (25-49)")
    high: int = Field(..., ge=0, description="Count of allocations in High risk tier (50-74)")
    critical: int = Field(..., ge=0, description="Count of allocations in Critical risk tier (75-100)")


class OverviewStatsSchema(BaseModel):
    """Macro portfolio KPIs and risk distribution."""
    total_allocations: int
    total_mps: int
    total_districts: int
    total_sanctioned_crore: float
    total_expenditure_crore: float
    total_unspent_crore: float
    overall_utilization_rate: float = Field(..., description="Aggregate financial utilization rate (%)")
    risk_distribution: RiskDistributionSchema
    flagged_rate_percentage: float
    terms_covered: List[int]
    disclaimer: str = "Risk indicators are analytical signals intended to support review. They do not constitute proof of wrongdoing."


class ProjectItemSchema(BaseModel):
    """Constituency allocation item returned in list endpoints."""
    id: int
    source_record_id: str
    mp_name: str
    house: str
    lok_sabha_term: int
    state: str
    district: str
    constituency: str
    category: str
    description: str
    sanction_date: str
    completion_date: str = ""
    sanctioned_cost: float
    expenditure: float
    entitlement: float
    released_amount: float
    unspent_balance: float
    status: str
    total_score: float = 0.0
    risk_level: str = "Low"
    has_reasons_flag: int = 0

    @computed_field
    @property
    def financial_utilization(self) -> float:
        """Derived financial utilization proxy: (expenditure / sanctioned_cost) * 100."""
        if self.sanctioned_cost > 0:
            return round((self.expenditure / self.sanctioned_cost) * 100, 2)
        return 0.0

    model_config = ConfigDict(from_attributes=True)


class AllocationDetailSchema(BaseModel):
    """Detailed allocation metadata."""
    id: int
    source_record_id: str
    mp_name: str
    house: str
    lok_sabha_term: int
    state: str
    district: str
    constituency: str
    category: str
    description: str
    sanction_date: str
    completion_date: str = ""
    sanctioned_cost: float
    expenditure: float
    entitlement: float
    released_amount: float
    unspent_balance: float
    financial_utilization: float
    status: str
    pending_reason: str = ""

    model_config = ConfigDict(from_attributes=True)


class RiskAssessmentSchema(BaseModel):
    """Risk score breakdown across four analytical dimensions."""
    total_score: float
    risk_level: str
    financial_score: float
    timeline_score: float
    data_quality_score: float
    geographic_score: float
    computed_at: str

    model_config = ConfigDict(from_attributes=True)


class ReasonCardSchema(BaseModel):
    """Explainable anomaly signal reason item with observed vs baseline vs threshold."""
    flag_type: str
    severity: str
    title: str
    observed_value: str
    baseline_value: str
    threshold_value: str
    explanation: str

    model_config = ConfigDict(from_attributes=True)


class PeerComparableSchema(BaseModel):
    """Peer allocation in same category/state cohort for relative comparison."""
    source_record_id: str
    mp_name: str
    constituency: str
    sanctioned_cost: float
    expenditure: float
    financial_utilization: float
    total_score: float
    risk_level: str


class ProjectDetailResponseSchema(BaseModel):
    """Complete deep investigation response payload."""
    allocation: AllocationDetailSchema
    risk_assessment: RiskAssessmentSchema
    reasons: List[ReasonCardSchema]
    peer_comparables: List[PeerComparableSchema]
    disclaimer: str = "Risk indicators are analytical signals intended to support review. They do not constitute proof of wrongdoing."


class CategoryAnalyticsSchema(BaseModel):
    """Category aggregate metrics."""
    category: str
    total_allocations: int
    total_sanctioned_crore: float
    total_expenditure_crore: float
    avg_utilization: float
    flagged_count: int
    flagged_percentage: float


class DistrictAnalyticsSchema(BaseModel):
    """District aggregate metrics."""
    district_id: int
    district_name: str
    state: str
    latitude: float
    longitude: float
    total_allocations: int
    total_expenditure_crore: float
    flagged_allocations: int
    dominant_risk_level: str


class LocationPointSchema(BaseModel):
    """Geographic point data for Leaflet map markers."""
    district_id: int
    district_name: str
    state: str
    latitude: float
    longitude: float
    total_allocations: int
    total_expenditure_crore: float
    flagged_allocations: int
    dominant_risk_level: str

    model_config = ConfigDict(from_attributes=True)


class MethodologyComponentSchema(BaseModel):
    """Description of a risk scoring component."""
    dimension: str
    weight: int
    formula: str
    description: str
    cohort_basis: str


class MethodologyResponseSchema(BaseModel):
    """Methodology parameters and formulas."""
    title: str = "MPLADS Samiksha Analytical Risk Scoring Methodology"
    version: str = "2.0.0"
    composite_formula: str = "min(100, 35·FIN + 25·TIM + min(20, 5·DQ) + 10·GEO)"
    components: List[MethodologyComponentSchema]
    risk_levels: Dict[str, str]
    disclaimer: str
