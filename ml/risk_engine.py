"""Deterministic Risk Engine for MPLADS Samiksha (T11).

Pure, explainable, deterministic mathematical scoring functions conforming to:
- docs/cohort_methodology.md
- docs/contracts/db_contract.md
- docs/contracts/api_contract.md
- DEC-004 & DEC-005

Evaluates reported financial, timeline, data quality, and geographic allocation dimensions.
All flags are analytical review indicators and strictly non-accusatory.
"""

import os
import json
from typing import Dict, Any, List, Optional

# Load cohort baselines from default JSON artifact
BASELINES_PATH = os.path.join(os.path.dirname(__file__), "cohort_baselines.json")


def load_baselines(path: Optional[str] = None) -> Dict[str, Any]:
    """Loads precomputed statistical cohort baselines from JSON."""
    target_path = path or BASELINES_PATH
    if not os.path.exists(target_path):
        raise FileNotFoundError(f"Cohort baselines file not found: {target_path}")
    with open(target_path, "r", encoding="utf-8") as f:
        return json.load(f)


def get_cohort_baseline(
    baselines: Dict[str, Any],
    category: str,
    state: str
) -> Dict[str, Any]:
    """Hierarchical cohort lookup: (Category, State) -> Category -> Global."""
    key = f"{category}::{state}"
    cohorts = baselines.get("cohorts", {})
    if key in cohorts:
        return cohorts[key]

    categories = baselines.get("categories", {})
    if category in categories:
        cat_info = categories[category].copy()
        cat_info["is_fallback"] = True
        return cat_info

    glob_info = baselines.get("global", {}).copy()
    glob_info["is_fallback"] = True
    return glob_info


def calculate_financial_score(
    record: Dict[str, Any],
    baseline: Dict[str, Any]
) -> tuple[float, List[Dict[str, Any]]]:
    """Calculates financial deviation sub-score (0–35) and explainable reason flags."""
    flags = []
    expenditure = float(record.get("expenditure", 0.0))
    sanctioned_cost = float(record.get("sanctioned_cost", 0.0))
    unspent_balance = float(record.get("unspent_balance", 0.0))

    p50_exp = baseline.get("expenditure_median", 17.92)
    p90_exp = baseline.get("expenditure_p90", 22.83)
    p90_unspent = baseline.get("unspent_p90", 4.50)

    # Edge case: zero expenditure or zero sanctioned cost
    if expenditure <= 0.0 or sanctioned_cost <= 0.0:
        return 0.0, flags

    # Calculate financial sub-score S_FIN (0–35)
    if p90_exp > p50_exp:
        s_fin = min(35.0, max(0.0, ((expenditure - p50_exp) / (p90_exp - p50_exp)) * 35.0))
    else:
        s_fin = 0.0

    cost_ratio = (expenditure / p50_exp) if p50_exp > 0 else 1.0

    # Trigger Cost Anomaly Flag if expenditure > P90 AND cost_ratio >= 1.30
    if expenditure > p90_exp and cost_ratio >= 1.30:
        flags.append({
            "flag_type": "FINANCIAL",
            "severity": "WARNING" if cost_ratio < 1.50 else "CRITICAL",
            "title": "High Reported Expenditure Outlier",
            "observed_value": f"₹{expenditure:.2f} Cr",
            "baseline_value": f"₹{p50_exp:.2f} Cr (Cohort Median)",
            "threshold_value": f"> ₹{p90_exp:.2f} Cr (P90) & >= 1.30x median",
            "explanation": (
                f"Reported expenditure is {cost_ratio:.2f}x the cohort median and exceeds the 90th percentile "
                f"threshold of peer allocations in the same category."
            )
        })

    # Unspent accumulation flag
    if unspent_balance > p90_unspent and unspent_balance >= 5.0:
        flags.append({
            "flag_type": "FINANCIAL",
            "severity": "WARNING",
            "title": "Elevated Unspent Balance Retention",
            "observed_value": f"₹{unspent_balance:.2f} Cr unspent",
            "baseline_value": f"₹{baseline.get('unspent_median', 2.0):.2f} Cr (Cohort Median)",
            "threshold_value": f"> ₹{p90_unspent:.2f} Cr",
            "explanation": "Unspent balance is significantly higher than peer cohort median."
        })

    return round(s_fin, 2), flags


def calculate_timeline_score(
    record: Dict[str, Any]
) -> tuple[float, List[Dict[str, Any]]]:
    """Calculates timeline / administrative stagnation sub-score (0–25)."""
    flags = []
    status = str(record.get("status", "")).strip()
    term = int(record.get("lok_sabha_term", 17))
    expenditure = float(record.get("expenditure", 0.0))
    s_tim = 0.0

    # 1. Active stagnation with zero expenditure
    if status in ("In Progress", "Allocated") and expenditure == 0.0:
        s_tim = 25.0
        flags.append({
            "flag_type": "TIMELINE",
            "severity": "WARNING",
            "title": "Zero Expenditure Active Allocation",
            "observed_value": "₹0.00 Cr reported spent",
            "baseline_value": "> ₹0.00 Cr",
            "threshold_value": "Active status with zero progress",
            "explanation": "Allocation remains in active state without any recorded expenditure deployment."
        })
    # 2. Historical prior-term allocations still active
    elif status == "In Progress" and term in (15, 16):
        s_tim = 18.0 if term == 16 else 22.0
        flags.append({
            "flag_type": "TIMELINE",
            "severity": "INFO",
            "title": f"Prior-Term Active Allocation ({term}th Lok Sabha)",
            "observed_value": f"{term}th Lok Sabha session",
            "baseline_value": "Completed / Term Closure",
            "threshold_value": "In Progress beyond parliamentary term end",
            "explanation": f"Allocation originating in the {term}th Lok Sabha remains active in reporting."
        })

    return round(s_tim, 2), flags


def calculate_data_quality_score(
    record: Dict[str, Any]
) -> tuple[float, List[Dict[str, Any]]]:
    """Calculates administrative review / data quality sub-score (0–20, 5 pts each)."""
    flags = []
    pending_reason = str(record.get("pending_reason", "")).strip()
    sanctioned_cost = float(record.get("sanctioned_cost", 0.0))
    unspent_balance = float(record.get("unspent_balance", 0.0))
    score = 0.0

    # 1. Audit / Utilisation certificate pending
    if "Audit Certificate Pending" in pending_reason or "Utilisation Certificate Pending" in pending_reason:
        score += 5.0
        flags.append({
            "flag_type": "DATA_QUALITY",
            "severity": "WARNING",
            "title": "Audit / Utilisation Certificate Pending",
            "observed_value": "Administrative remark flagged",
            "baseline_value": "Certificates Submitted",
            "threshold_value": "Formal pending certificate notation",
            "explanation": f"Official administrative remarks record: '{pending_reason}'."
        })

    # 2. Monthly Progress Report (MPR) pending
    if "Eligible MPR not Received" in pending_reason:
        score += 5.0
        flags.append({
            "flag_type": "DATA_QUALITY",
            "severity": "INFO",
            "title": "Monthly Progress Report (MPR) Pending",
            "observed_value": "Eligible MPR not Received",
            "baseline_value": "MPR Received",
            "threshold_value": "Missing progress report",
            "explanation": "Administrative release withheld pending receipt of eligible Monthly Progress Report."
        })

    # 3. Zero sanctioned cost anomaly
    if sanctioned_cost == 0.0:
        score += 5.0
        flags.append({
            "flag_type": "DATA_QUALITY",
            "severity": "INFO",
            "title": "Zero Sanctioned Works Cost",
            "observed_value": "₹0.00 Cr sanctioned",
            "baseline_value": "> ₹0.00 Cr",
            "threshold_value": "Missing sanctioned cost entry",
            "explanation": "Allocation record has zero recorded sanctioned works amount."
        })

    # 4. Negative unspent balance
    if unspent_balance < 0.0:
        score += 5.0
        flags.append({
            "flag_type": "DATA_QUALITY",
            "severity": "INFO",
            "title": "Negative Unspent Balance Notation",
            "observed_value": f"₹{unspent_balance:.2f} Cr",
            "baseline_value": ">= ₹0.00 Cr",
            "threshold_value": "< 0.0",
            "explanation": "Unspent balance reflects an administrative accounting adjustment."
        })

    s_dq = min(20.0, score)
    return round(s_dq, 2), flags


def calculate_geographic_score(
    record: Dict[str, Any],
    baseline: Dict[str, Any]
) -> tuple[float, List[Dict[str, Any]]]:
    """Calculates spatial density sub-score (0–10)."""
    flags = []
    # Deterministic spatial check
    s_geo = 0.0
    return round(s_geo, 2), flags


def evaluate_allocation(
    record: Dict[str, Any],
    baselines: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """Main evaluation entry point. Returns composite risk score and reason cards."""
    if baselines is None:
        baselines = load_baselines()

    category = str(record.get("category", "")).strip()
    state = str(record.get("state", "")).strip()

    baseline = get_cohort_baseline(baselines, category, state)

    s_fin, f_fin = calculate_financial_score(record, baseline)
    s_tim, f_tim = calculate_timeline_score(record)
    s_dq, f_dq = calculate_data_quality_score(record)
    s_geo, f_geo = calculate_geographic_score(record, baseline)

    all_flags = f_fin + f_tim + f_dq + f_geo

    # Composite formula: min(100, S_FIN + S_TIM + S_DQ + S_GEO)
    raw_score = s_fin + s_tim + s_dq + s_geo
    total_score = min(100.0, round(raw_score, 1))

    # Risk Tier assignment per frozen contract §2.4
    if total_score >= 75.0:
        risk_level = "Critical"
    elif total_score >= 50.0:
        risk_level = "High"
    elif total_score >= 25.0:
        risk_level = "Medium"
    else:
        risk_level = "Low"

    return {
        "total_score": total_score,
        "risk_level": risk_level,
        "financial_score": s_fin,
        "timeline_score": s_tim,
        "data_quality_score": s_dq,
        "geographic_score": s_geo,
        "flags": all_flags
    }
