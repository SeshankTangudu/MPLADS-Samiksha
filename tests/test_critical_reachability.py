"""Engine Self-Test — Phase 0 Critical-Tier Gap Validation.

PURPOSE:
    This test documents the known gap between the theoretical Model A framework
    and the current production implementation.

THEORETICAL FRAMEWORK (documented in docs/methodology.md):
    - Financial = 35
    - Timeline  = 25
    - Data Quality = 20
    - Geographic   = 10
    - Duplicate    = 10
    - Theoretical Maximum = 100
    - Critical Threshold  = 75

CURRENT PRODUCTION IMPLEMENTATION (accepted via Model A Reconciliation, Option A):
    - Financial    = active, max 35
    - Timeline     = active, max 25
    - Data Quality = active, max 20
    - Geographic   = INTENTIONALLY INACTIVE, contributes 0
    - Duplicate    = INTENTIONALLY INACTIVE, contributes 0
    - Current Implemented Ceiling = 72
    - Critical is UNREACHABLE under the current implementation.

IMPORTANT:
    The Critical tier being unreachable is a limitation of the current active
    scoring engine. It does NOT constitute evidence that the dataset contains
    no severe cases.

    "Engine Self-Test validates deterministic scoring behavior under controlled
    synthetic scenarios. Successful synthetic validation does not establish
    detection accuracy on real-world fraud or wrongdoing."

EARLIER TEST DEFECT (now corrected):
    A previous version of this test asserted `result["total_score"] >= 70.0`
    while its docstring claimed to validate the Critical tier (>= 75.0). That
    assertion boundary was incorrect and masked the implementation gap. It has
    been corrected to accurately reflect the documented contract.
"""

import pytest
from ml.risk_engine import evaluate_allocation, load_baselines

CRITICAL_THRESHOLD = 75.0
CURRENT_IMPLEMENTED_MAXIMUM = 72.0


def test_critical_tier_unreachable_under_current_implementation():
    """Validates that the Critical tier (>=75) is unreachable under the
    current active implementation because Geographic and Duplicate are
    intentionally inactive.

    This test PASSES when the documented implementation gap is correctly
    maintained. It should only FAIL if Geographic or Duplicate components
    are unexpectedly activated, which would require a deliberate change to
    the frozen Model A and a full reconciliation review.
    """
    baselines = load_baselines()

    # Worst-case synthetic record using all active components at maximum.
    # (Geographic and Duplicate are inactive, so they contribute 0.)
    worst_case_record = {
        "scenario": "SYNTHETIC ENGINE VALIDATION",
        "category": "Infrastructure & Public Amenities",
        "state": "Uttar Pradesh",
        "expenditure": 60.0,
        "sanctioned_cost": 25.0,
        "unspent_balance": -1.5,
        "status": "In Progress",
        "lok_sabha_term": 15,
        "pending_reason": "Audit Certificate Pending; Eligible MPR not Received"
    }

    result = evaluate_allocation(worst_case_record, baselines)

    # --- Active components verify correctly ---
    assert result["financial_score"] == 35.0, (
        f"Expected Financial=35.0, got {result['financial_score']}"
    )
    assert result["timeline_score"] == 22.0, (
        f"Expected Timeline=22.0 (15th Lok Sabha, non-zero expenditure), "
        f"got {result['timeline_score']}"
    )
    assert result["data_quality_score"] == 15.0, (
        f"Expected DQ=15.0 (Audit+5, MPR+5, NegUnspent+5), "
        f"got {result['data_quality_score']}"
    )

    # --- Inactive components are confirmed at 0 ---
    assert result["geographic_score"] == 0.0, (
        "Geographic component must be 0.0 — it is intentionally inactive."
    )
    assert result.get("duplicate_score", 0.0) == 0.0, (
        "Duplicate component must be 0.0 — it is intentionally inactive."
    )

    # --- Implemented ceiling is 72.0 ---
    assert result["total_score"] == CURRENT_IMPLEMENTED_MAXIMUM, (
        f"Expected current implemented maximum of {CURRENT_IMPLEMENTED_MAXIMUM}, "
        f"got {result['total_score']}"
    )
    assert result["risk_level"] == "High", (
        f"Expected tier 'High' at 72.0, got {result['risk_level']}"
    )

    # --- Critical is unreachable: implemented max < Critical threshold ---
    assert result["total_score"] < CRITICAL_THRESHOLD, (
        f"IMPLEMENTATION GAP CONFIRMED: Current implemented maximum "
        f"({result['total_score']}) < Critical threshold ({CRITICAL_THRESHOLD}). "
        "Critical is unreachable under the current active scoring engine."
    )
