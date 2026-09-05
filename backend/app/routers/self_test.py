"""Engine Self-Test & Synthetic Fixture Endpoint (Phase 1.2).

Provides isolated, clearly labeled synthetic validation fixtures to test and
demonstrate Model A scoring behavior across risk tiers (including worst-case Critical).
These fixtures are strictly isolated and NEVER saved into the production database.
"""

from fastapi import APIRouter
from typing import List, Dict, Any
from pydantic import BaseModel

from ml.risk_engine import evaluate_allocation, load_baselines

router = APIRouter(prefix="/self-test", tags=["SelfTest"])

_BASELINES = None

def get_baselines():
    global _BASELINES
    if _BASELINES is None:
        _BASELINES = load_baselines()
    return _BASELINES


class SyntheticFixtureSchema(BaseModel):
    id: str
    scenario_title: str
    scenario_description: str
    category: str
    state: str
    sanctioned_cost: float
    expenditure: float
    unspent_balance: float
    status: str
    lok_sabha_term: int
    pending_reason: str
    evaluation: Dict[str, Any]
    is_synthetic: bool = True
    disclaimer: str = "SYNTHETIC VALIDATION DATA — NOT GOVERNMENT DATA. For engine testing only."


@router.get("/fixtures", response_model=List[SyntheticFixtureSchema])
def get_self_test_fixtures():
    """Returns isolated synthetic fixtures evaluated on the fly via Model A."""
    baselines = get_baselines()
    
    scenarios = [
        {
            "id": "SYNTH_CRITICAL_01",
            "scenario_title": "Compounding Multi-Signal Anomaly (Critical Tier Target)",
            "scenario_description": "Synthetic worst-case allocation with severe financial outlier, prior-term unspent retention, and multiple administrative delay notes.",
            "category": "Infrastructure & Public Amenities",
            "state": "Uttar Pradesh",
            "sanctioned_cost": 25.0,
            "expenditure": 65.0, # High financial outlier
            "unspent_balance": -2.5, # Negative unspent notation
            "status": "In Progress",
            "lok_sabha_term": 15, # 15th LS prior term retention
            "pending_reason": "Audit Certificate Pending; Eligible MPR not Received"
        },
        {
            "id": "SYNTH_FIN_OUTLIER_02",
            "scenario_title": "Isolated Financial Outlier (High Risk)",
            "scenario_description": "Reported expenditure significantly exceeds cohort P90 threshold with 1.8x median cost ratio.",
            "category": "Community Development",
            "state": "Bihar",
            "sanctioned_cost": 20.0,
            "expenditure": 42.0,
            "unspent_balance": 1.2,
            "status": "Completed",
            "lok_sabha_term": 17,
            "pending_reason": ""
        },
        {
            "id": "SYNTH_TIMELINE_03",
            "scenario_title": "Active Zero-Expenditure Dormancy (Medium Risk)",
            "scenario_description": "Active sanctioned allocation with zero expenditure deployment across term.",
            "category": "Rural & Urban Development",
            "state": "Maharashtra",
            "sanctioned_cost": 15.0,
            "expenditure": 0.0,
            "unspent_balance": 15.0,
            "status": "In Progress",
            "lok_sabha_term": 17,
            "pending_reason": ""
        },
        {
            "id": "SYNTH_COMPLIANCE_04",
            "scenario_title": "Compliance Review Remark (Medium Risk)",
            "scenario_description": "Allocation flagged with official pending Audit Certificate notation.",
            "category": "Community Development",
            "state": "Rajasthan",
            "sanctioned_cost": 12.0,
            "expenditure": 10.5,
            "unspent_balance": 1.5,
            "status": "In Progress",
            "lok_sabha_term": 17,
            "pending_reason": "Audit Certificate Pending"
        },
        {
            "id": "SYNTH_BASELINE_05",
            "scenario_title": "Normal Cohort Baseline (Low Risk)",
            "scenario_description": "Normal spending parameters aligned with median peer cohort metrics and zero delay remarks.",
            "category": "Infrastructure & Public Amenities",
            "state": "Karnataka",
            "sanctioned_cost": 14.0,
            "expenditure": 12.8,
            "unspent_balance": 1.2,
            "status": "Completed",
            "lok_sabha_term": 17,
            "pending_reason": ""
        }
    ]
    
    results = []
    for sc in scenarios:
        eval_dict = {
            "category": sc["category"],
            "state": sc["state"],
            "expenditure": sc["expenditure"],
            "sanctioned_cost": sc["sanctioned_cost"],
            "unspent_balance": sc["unspent_balance"],
            "status": sc["status"],
            "lok_sabha_term": sc["lok_sabha_term"],
            "pending_reason": sc["pending_reason"]
        }
        res = evaluate_allocation(eval_dict, baselines)
        results.append(
            SyntheticFixtureSchema(
                id=sc["id"],
                scenario_title=sc["scenario_title"],
                scenario_description=sc["scenario_description"],
                category=sc["category"],
                state=sc["state"],
                sanctioned_cost=sc["sanctioned_cost"],
                expenditure=sc["expenditure"],
                unspent_balance=sc["unspent_balance"],
                status=sc["status"],
                lok_sabha_term=sc["lok_sabha_term"],
                pending_reason=sc["pending_reason"],
                evaluation=res
            )
        )
    
    return results
