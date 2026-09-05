"""Pydantic v2 Request/Response Schemas for MPLADS Samiksha (Frozen Contract T08).

Conforms strictly to docs/contracts/api_contract.md and docs/contracts/db_contract.md.
"""

from typing import List, Optional, Generic, TypeVar, Dict, Any
from pydantic import BaseModel, Field, computed_field, ConfigDict, field_validator

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
    citizen_report_count: int = 0

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
    citizen_report_count: int = 0

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


class CandidateDuplicateSchema(BaseModel):
    """Candidate for deduplication verification (Phase 2.5)."""
    candidate_id: str
    mp_name: str
    constituency: str
    category: str
    lok_sabha_term: int
    sanctioned_cost: float
    expenditure: float
    similarity_reasons: List[str]
    disclaimer: str = "Candidate for human verification, not confirmed duplicate."


class MLCrossCheckSchema(BaseModel):
    """Offline Isolation Forest ML Cross-Check (Phase 2.6)."""
    evaluated: bool = True
    anomalous: bool
    agreement: bool
    method: str = "Isolation Forest (Offline Cross-Check)"
    disclaimer: str = "Isolation Forest is used as an offline analytical cross-check and does not modify the production risk score."


class ObservedTermPointSchema(BaseModel):
    """Historical observation point for a specific Lok Sabha parliamentary term."""
    term: int
    term_label: str
    source_record_id: str
    mp_name: str
    sanctioned_cost: float
    expenditure: float
    financial_utilization: float
    total_score: float
    risk_level: str
    primary_flag: str
    unspent_balance: float = 0.0
    category: str = ""
    district: str = ""
    constituency: str = ""
    active_flags_count: int = 0
    flags_list: List[str] = Field(default_factory=list)


class RiskTrajectorySchema(BaseModel):
    """Empirical cross-term risk trajectory & early warning (P1-3)."""
    trajectory_status: str # "STABLE", "IMPROVING", "ELEVATED", "ESCALATING", "INSUFFICIENT HISTORY"
    terms_observed: List[int]
    observed_points: List[ObservedTermPointSchema] = Field(default_factory=list)
    trajectory_summary: str
    early_warning_signal: Optional[str] = None
    has_sufficient_history: bool = True
    longitudinal_grouping_basis: str = "Constituency Historical Observations"
    disclaimer: str = "Historical empirical trajectory based on observed Lok Sabha parliamentary terms. Not a predictive future forecast."


class InvestmentDurabilityResponseSchema(BaseModel):
    """Investment–Durability Comparative Screening Heuristic Schema (Phase B)."""
    source_record_id: str
    category: str
    sanctioned_cost_crore: float
    expenditure_crore: float
    category_median_cost_crore: float
    category_p90_cost_crore: float
    investment_level: str
    is_high_investment: bool
    total_reports_count: int
    condition_reports_count: int
    relevant_categories: List[str]
    has_repeated_reports: bool
    elapsed_months: Optional[float] = None
    elapsed_time_description: str
    signal_status: str
    signal_badge: str
    signal_reason: str
    disclaimer: str = (
        "This analytical signal compares public investment level against available citizen condition "
        "observations. It does not measure structural durability, material lifespan, or establish wrongdoing."
    )


class ProjectDetailResponseSchema(BaseModel):
    """Complete deep investigation response payload."""
    allocation: AllocationDetailSchema
    risk_assessment: RiskAssessmentSchema
    reasons: List[ReasonCardSchema]
    peer_comparables: List[PeerComparableSchema]
    ml_cross_check: Optional[MLCrossCheckSchema] = None
    risk_trajectory: Optional[RiskTrajectorySchema] = None
    duplicate_candidates: Optional[List[CandidateDuplicateSchema]] = None
    investment_durability: Optional[InvestmentDurabilityResponseSchema] = None
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


class TermTrendSchema(BaseModel):
    """Cross-term longitudinal trends (Phase 1.7)."""
    term: int
    term_label: str
    total_allocations: int
    total_sanctioned_crore: float
    total_expenditure_crore: float
    avg_utilization: float
    high_risk_count: int
    high_risk_percentage: float
    timeline_flags_count: int
    data_quality_flags_count: int


class NationalTrendOverviewSchema(BaseModel):
    total_allocations: int
    high_risk_allocations: int
    high_risk_percentage: float
    avg_model_a_score: float
    avg_financial_utilization: float
    total_sanctioned_crore: float
    total_expenditure_crore: float


class TermIntelligenceItemSchema(BaseModel):
    term: int
    term_label: str
    allocations_count: int
    avg_risk_score: float
    high_risk_count: int
    high_risk_percentage: float
    avg_utilization_proxy: float
    total_sanctioned_crore: float
    total_expenditure_crore: float
    top_risk_category: str
    financial_flags_count: int = 0
    timeline_flags_count: int = 0
    data_quality_flags_count: int = 0
    geographic_flags_count: int = 0
    duplicate_flags_count: int = 0


class SectorMomentumItemSchema(BaseModel):
    category: str
    current_avg_score: Optional[float] = None
    previous_avg_score: Optional[float] = None
    score_delta: Optional[float] = None
    trend_badge: str  # "Increasing Review Pressure", "Improving", "Stable", "Insufficient Data"
    allocations_count: int = 0
    count_16: int = 0
    count_17: int = 0
    avg_utilization: float = 0.0
    high_risk_percentage: float = 0.0


class StateMomentumItemSchema(BaseModel):
    state: str
    allocations_count: int = 0
    count_16: int = 0
    count_17: int = 0
    current_avg_score: Optional[float] = None
    previous_avg_score: Optional[float] = None
    score_delta: Optional[float] = None
    trend_badge: str  # "Increasing Review Pressure", "Improving", "Stable", "Insufficient Data"
    high_risk_count: int = 0
    avg_utilization: float = 0.0


class ExecutiveInsightSchema(BaseModel):
    insight_type: str
    headline: str
    detail: str
    badge: str


class ReviewEffortTierBreakdownSchema(BaseModel):
    risk_level: str
    weight: int
    count: int
    percentage_of_allocations: float
    effort_points: int
    percentage_of_effort: float


class ReviewEffortFlagBreakdownSchema(BaseModel):
    flag_type: str
    count: int
    percentage: float


class ReviewEffortTermBreakdownSchema(BaseModel):
    term: int
    term_label: str
    allocations_count: int
    total_effort_points: int
    avg_effort_per_allocation: float
    high_risk_count: int


class ReviewEffortKPISchema(BaseModel):
    total_allocations: int
    total_effort_points: int
    avg_effort_per_allocation: float
    tier_weights: Dict[str, int] = Field(default_factory=lambda: {"Low": 1, "Medium": 2, "High": 4, "Critical": 8})
    tier_breakdown: List[ReviewEffortTierBreakdownSchema]
    flag_breakdown: List[ReviewEffortFlagBreakdownSchema]
    term_breakdown: List[ReviewEffortTermBreakdownSchema]
    interpretation: str
    disclaimer: str = "Review Effort Index is a deterministic prioritization metric based on analytical risk tiers and flags. It does not represent actual auditor hours, institutional workload, or proof of wrongdoing."


class TrendIntelligenceResponseSchema(BaseModel):
    overview: NationalTrendOverviewSchema
    review_effort: Optional[ReviewEffortKPISchema] = None
    term_intelligence: List[TermIntelligenceItemSchema]
    sector_momentum: List[SectorMomentumItemSchema]
    state_momentum: List[StateMomentumItemSchema]
    executive_insights: List[ExecutiveInsightSchema]
    disclaimer: str = "Trend analytics represent descriptive historical aggregations and do not constitute predictive forecasts."


class DistrictDetailAnalyticsSchema(BaseModel):
    """Deep district risk breakdown (Phase 2.2)."""
    district_id: int
    district_name: str
    state: str
    latitude: float
    longitude: float
    total_allocations: int
    total_sanctioned_crore: float
    total_expenditure_crore: float
    total_unspent_crore: float = 0.0
    avg_utilization: float
    avg_risk_score: float = 0.0
    high_risk_count: int
    critical_risk_count: int = 0
    high_risk_percentage: float = 0.0
    risk_distribution: Dict[str, int] = Field(default_factory=dict)
    financial_flags_count: int = 0
    timeline_flags_count: int = 0
    data_quality_flags_count: int = 0
    geographic_flags_count: int = 0
    duplicate_flags_count: int = 0
    top_categories: List[Dict[str, Any]]
    flagged_projects: List[ProjectItemSchema]
    disclaimer: str = "District centroid coordinates serve as regional administrative reference points."


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


class CohortSummaryItemSchema(BaseModel):
    """Statistical quantile summary for a specific (Category, State) or (Category) cohort."""
    category: str
    state: str
    count: int
    is_fallback: bool = False
    expenditure_median: float
    expenditure_p90: float
    sanctioned_cost_median: float
    sanctioned_cost_p90: float
    utilization_median: float
    utilization_p10: float
    utilization_p90: float
    unspent_median: float
    unspent_p90: float


class CohortExplorerResponseSchema(BaseModel):
    """Transparent cohort statistical distribution data for Cohort Explorer (Phase 2.1)."""
    categories: List[str]
    states: List[str]
    cohorts: List[CohortSummaryItemSchema]
    global_baseline: Dict[str, Any]
    disclaimer: str = "Risk indicators are analytical signals intended to support review. They do not constitute proof of wrongdoing."


# ─── Duplicate Candidate Intelligence Schemas ────────────────────────────────

class DuplicateCandidateRecordSchema(BaseModel):
    """Minimal summary of one record in a similarity candidate pair."""
    id: int
    source_record_id: str
    mp_name: str
    state: str
    district: str
    constituency: str
    category: str
    lok_sabha_term: int
    sanctioned_cost: float
    expenditure: float
    status: str
    investigate_url: str = Field(
        ...,
        description="Relative URL to the full investigation workspace for this record"
    )


class DuplicateCandidatePairSchema(BaseModel):
    """
    A similarity candidate pair requiring human verification.

    IMPORTANT: This pair is a review candidate, not a confirmed duplicate.
    Similarity indicates a review signal only. No determination of wrongdoing
    should be drawn from the presence of this pair.
    """
    pair_id: str = Field(..., description="Deterministic pair identifier: smaller_id-larger_id")
    record_a: DuplicateCandidateRecordSchema
    record_b: DuplicateCandidateRecordSchema
    similarity_score: float = Field(
        ..., ge=0.0, le=1.0,
        description="Deterministic similarity score (0.0–1.0). NOT a fraud or duplicate probability."
    )
    matched_fields: List[str] = Field(
        ...,
        description="Fields that contributed to candidate matching"
    )
    matching_rationale: str = Field(
        ...,
        description="Plain-language explanation of why this pair is a review candidate"
    )
    requires_human_verification: bool = Field(
        default=True,
        description="Always True — candidates require human review before any determination"
    )
    candidate_label: str = Field(
        default="Potential Similarity Candidate",
        description="Human-readable candidate classification label"
    )


class DuplicateCandidatesResponseSchema(BaseModel):
    """
    Response envelope for the Duplicate Candidate Intelligence endpoint.

    Engine Self-Test validates deterministic scoring behavior under controlled
    synthetic scenarios. Successful synthetic validation does not establish
    detection accuracy on real-world fraud or wrongdoing.
    """
    total_candidate_pairs: int
    candidate_pairs: List[DuplicateCandidatePairSchema]
    methodology_note: str = Field(
        default=(
            "Candidates are identified by exact matches across multiple structural fields "
            "(constituency, category, parliamentary term, sanctioned cost). "
            "A match indicates a review candidate, not a confirmed duplicate or evidence of wrongdoing. "
            "All candidates require human verification."
        )
    )
    disclaimer: str = Field(
        default=(
            "Similarity indicates a review candidate, not a confirmed duplicate or wrongdoing. "
            "Candidate matches are analytical signals intended to support human verification. "
            "Risk indicators are analytical signals intended to support review. "
            "They do not constitute proof of wrongdoing."
        )
    )
    description_quality_note: str = Field(
        default=(
            "The 'description' field in this dataset contains allocation-level contextual templates, "
            "not itemized civil project names. Text-similarity matching was not used because it would "
            "not produce meaningful or defensible results on this field."
        )
    )


class ConstituencyTermBreakdownSchema(BaseModel):
    term: int
    term_label: str
    allocations_count: int
    total_sanctioned_crore: float
    total_expenditure_crore: float
    financial_utilization_proxy: float
    avg_model_a_score: float
    high_risk_count: int


class ConstituencyPriorityAllocationSchema(BaseModel):
    id: int
    source_record_id: str
    mp_name: str
    category: str
    lok_sabha_term: int
    sanctioned_cost: float
    expenditure: float
    financial_utilization_proxy: float
    total_score: float
    risk_level: str
    primary_flag: str
    trajectory_status: Optional[str] = None


class ConstituencyPeerBenchmarkSchema(BaseModel):
    primary_category: str
    cohort_sanctioned_median: float
    cohort_sanctioned_p90: float
    cohort_expenditure_median: float
    cohort_expenditure_p90: float
    constituency_avg_expenditure: float
    constituency_avg_sanctioned: float
    constituency_avg_utilization: float
    cohort_avg_utilization: float
    comparison_note: str


class ConstituencyAnalyticsSchema(BaseModel):
    constituency_name: str
    state: str
    district: str
    total_allocations: int
    total_sanctioned_crore: float
    total_expenditure_crore: float
    total_unspent_crore: float
    financial_utilization_proxy: float
    avg_model_a_score: float
    high_risk_count: int
    risk_distribution: Dict[str, int]
    terms_present: List[int]
    term_breakdown: List[ConstituencyTermBreakdownSchema]
    priority_allocations: List[ConstituencyPriorityAllocationSchema]
    trajectory_status: str
    trajectory_delta: Optional[float] = None
    trajectory_note: str
    peer_benchmark: Optional[ConstituencyPeerBenchmarkSchema] = None
    disclaimer: str = Field(
        default=(
            "Risk indicators are analytical signals intended to support review. "
            "They do not constitute proof of wrongdoing. Prototype role simulation."
        )
    )


# ==========================================
# PHASE 4: COMPLAINTS & REPORTING SCHEMAS
# ==========================================

ALLOWED_COMPLAINT_CATEGORIES = [
    "WORK_NOT_FOUND",
    "WORK_DELAYED",
    "WORK_INCOMPLETE",
    "QUALITY_CONCERN",
    "COST_CONCERN",
    "DUPLICATE_SIMILAR_WORK",
    "UTILIZATION_CONCERN",
    "ASSET_NOT_FOUND",
    "OTHER",
]

ALLOWED_COMPLAINT_STATUSES = [
    "SUBMITTED",
    "ACKNOWLEDGED",
    "UNDER_REVIEW",
    "EVIDENCE_REQUESTED",
    "RESOLVED",
    "ESCALATED",
    "FALSE_POSITIVE_INVALID",
]

CATEGORY_LABELS = {
    "WORK_NOT_FOUND": "Work / Project Not Found on Ground",
    "WORK_DELAYED": "Unreasonable Execution Delay",
    "WORK_INCOMPLETE": "Incomplete Civil Work Abandoned",
    "QUALITY_CONCERN": "Substandard Construction / Material Quality",
    "COST_CONCERN": "Cost Anomaly / Excessive Expenditure",
    "DUPLICATE_SIMILAR_WORK": "Duplicate / Overlapping Work Allocation",
    "UTILIZATION_CONCERN": "Discrepancy in Utilization / Non-Disbursement",
    "ASSET_NOT_FOUND": "Created Asset Missing / Inaccessible",
    "OTHER": "Other Civic / Analytical Observation",
}

STATUS_LABELS = {
    "SUBMITTED": "Submitted",
    "ACKNOWLEDGED": "Acknowledged by MP",
    "UNDER_REVIEW": "Under Review",
    "EVIDENCE_REQUESTED": "Evidence Requested",
    "RESOLVED": "Resolved",
    "ESCALATED": "Escalated",
    "FALSE_POSITIVE_INVALID": "False Positive / Invalid",
}


class ComplaintCategoryMetaSchema(BaseModel):
    key: str
    label: str


class ComplaintStatusMetaSchema(BaseModel):
    key: str
    label: str


class ComplaintCreateSchema(BaseModel):
    category: str = Field(..., description="Complaint category from allowed list")
    description: str = Field(..., min_length=20, max_length=4000, description="Detailed observation (min 20 characters)")
    linked_allocation_id: Optional[str] = Field(None, description="Optional existing project source_record_id (e.g. LS16_0408)")

    @field_validator("category")
    @classmethod
    def validate_category(cls, v: str) -> str:
        v_clean = str(v).strip().upper().replace(" ", "_")
        if v_clean not in ALLOWED_COMPLAINT_CATEGORIES:
            raise ValueError(
                f"Invalid category '{v}'. Allowed categories are: {', '.join(ALLOWED_COMPLAINT_CATEGORIES)}"
            )
        return v_clean

    @field_validator("description")
    @classmethod
    def validate_description(cls, v: str) -> str:
        v_clean = str(v).strip()
        if len(v_clean) < 20:
            raise ValueError("Description must contain at least 20 non-whitespace characters.")
        if len(v_clean) > 4000:
            raise ValueError("Description exceeds maximum length of 4000 characters.")
        return v_clean


class EvidenceResponseSchema(BaseModel):
    """Full media evidence, EXIF metadata, and location consistency review schema."""
    id: int
    complaint_id: str
    original_filename: str
    mime_type: str
    file_size_bytes: int
    image_width: Optional[int] = None
    image_height: Optional[int] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_accuracy_meters: Optional[float] = None
    captured_at: Optional[str] = None
    uploaded_at: str
    exif_available: int = 0
    gps_from_exif: int = 0
    exif_latitude: Optional[float] = None
    exif_longitude: Optional[float] = None
    camera_make: Optional[str] = None
    camera_model: Optional[str] = None
    metadata_status: str = "METADATA_UNAVAILABLE"
    location_review_status: str = "LOCATION_DATA_UNAVAILABLE"
    location_review_details: Optional[str] = None
    distance_from_district_centroid_km: Optional[float] = None
    exif_vs_browser_gps_delta_km: Optional[float] = None
    timestamp_review_status: str = "TIMESTAMP_UNAVAILABLE"
    timestamp_review_details: Optional[str] = None
    has_photo: bool = True
    has_gps: bool = False

    model_config = ConfigDict(from_attributes=True)


class EvidencePublicSafeSchema(BaseModel):
    """Public-safe evidence indicators for Citizen tracking."""
    has_photo: bool = False
    has_gps: bool = False
    uploaded_at: Optional[str] = None
    location_review_status: Optional[str] = None
    timestamp_review_status: Optional[str] = None


class AllocationReportSummarySchema(BaseModel):
    """Aggregated citizen complaints for a specific allocation."""
    source_record_id: str
    total_reports: int = 0
    open_reports: int = 0
    resolved_reports: int = 0
    categories: Dict[str, int] = {}
    latest_report_date: Optional[str] = None
    has_reports: bool = False


class ComplaintResponseSchema(BaseModel):
    id: int
    complaint_id: str
    linked_allocation_id: Optional[str] = None
    category: str
    category_label: str
    description: str
    status: str
    status_label: str
    submitted_at: str
    acknowledged_at: Optional[str] = None
    mp_remark: Optional[str] = None
    mp_remark_at: Optional[str] = None
    verification_requested: int = 0
    verification_requested_at: Optional[str] = None
    officer_note: Optional[str] = None
    officer_note_at: Optional[str] = None
    resolved_at: Optional[str] = None
    
    # Enriched context if linked to allocation
    constituency: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    mp_name: Optional[str] = None
    lok_sabha_term: Optional[int] = None
    allocation_category: Optional[str] = None
    sanctioned_cost: Optional[float] = None
    expenditure: Optional[float] = None
    risk_score: Optional[float] = None
    risk_level: Optional[str] = None
    flags_count: int = 0
    has_analytical_flags: bool = False
    multiple_review_signals: bool = False
    reasons: Optional[List[Dict[str, Any]]] = None

    # Phase 7: Evidence, Location & Repeated Reports Context
    evidence: Optional[EvidenceResponseSchema] = None
    evidence_public_safe: Optional[EvidencePublicSafeSchema] = None
    nearby_reports_count: int = 0
    allocation_reports_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class ComplaintListResponseSchema(BaseModel):
    total: int = Field(..., description="Total count of matching complaints")
    items: List[ComplaintResponseSchema]
    page: int = 1
    limit: int = 50
    total_pages: int = 1


class MPAcknowledgeRequestSchema(BaseModel):
    remark: Optional[str] = Field(None, max_length=2000, description="Optional MP remark or acknowledgement notes")


class MPRemarkRequestSchema(BaseModel):
    remark: str = Field(..., min_length=3, max_length=2000, description="MP remark or acknowledgement notes")

    @field_validator("remark")
    @classmethod
    def validate_remark(cls, v: str) -> str:
        v_clean = str(v).strip()
        if len(v_clean) < 3:
            raise ValueError("Remark must contain at least 3 non-whitespace characters.")
        return v_clean


class OfficerNoteRequestSchema(BaseModel):
    note: str = Field(..., min_length=3, max_length=2000, description="Officer review or investigative note")

    @field_validator("note")
    @classmethod
    def validate_note(cls, v: str) -> str:
        v_clean = str(v).strip()
        if len(v_clean) < 3:
            raise ValueError("Officer note must contain at least 3 non-whitespace characters.")
        return v_clean


class StatusUpdateRequestSchema(BaseModel):
    status: str = Field(..., description="New target status")
    reason: Optional[str] = Field(None, max_length=1000, description="Optional transition explanation or resolution summary")

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        v_clean = str(v).strip().upper().replace(" ", "_")
        if v_clean not in ALLOWED_COMPLAINT_STATUSES:
            raise ValueError(
                f"Invalid status '{v}'. Allowed statuses are: {', '.join(ALLOWED_COMPLAINT_STATUSES)}"
            )
        return v_clean




