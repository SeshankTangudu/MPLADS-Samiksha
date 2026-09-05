"""
Offline Isolation Forest Cross-Check for MPLADS Samiksha.

PURPOSE:
    Independent statistical cross-check of unusual financial allocation patterns
    using scikit-learn's IsolationForest.

CLAIM SAFETY:
    "Isolation Forest identifies statistically unusual allocations for secondary review."
    "An outlier is NOT evidence of fraud or wrongdoing."
    "This does NOT change the platform's Model A risk score."
    "This does NOT replace the deterministic Model A scoring engine."

ARCHITECTURE:
    authentic data (mplads.db)
        ↓
    offline Isolation Forest analysis (this script)
        ↓
    ml/if_results.json  ← precomputed artifact
        ↓
    read-only API + UI consumption

This script is run OFFLINE (not on every API request).
Results are consumed as a static precomputed artifact.

FEATURES USED (4 numeric allocation characteristics, NO Model A score, NO record IDs):
    1. sanctioned_cost      — raw sanctioned works amount (₹ Cr)
    2. expenditure          — reported expenditure (₹ Cr)
    3. unspent_balance      — residual balance (₹ Cr, can be negative)
    4. utilization_ratio    — expenditure / sanctioned_cost (0.0 for zero-cost records)

FEATURE DEPENDENCE & METHODOLOGICAL JUSTIFICATION:
    - utilization_ratio = expenditure / sanctioned_cost
    - unspent_balance is derived from financial allocations and expenditure
    - sanctioned_cost and expenditure are raw financial scale quantities
    Therefore, these features are correlated and represent related dimensions of
    the same financial geometry rather than orthogonal, independent evidence sources.
    Tree-based partitioning in Isolation Forest handles correlated continuous features
    effectively without matrix singularity issues, allowing the algorithm to detect
    geometric outliers (such as disproportionate expenditure relative to sanction,
    negative unspent balance anomalies, or extreme ratio outliers). This model functions
    specifically as a financial-feature anomaly cross-check.

FEATURES EXCLUDED (with justification):
    - lok_sabha_term           : REMOVED. Parliamentary term (15, 16, 17) is a temporal cohort,
                                 not an allocation characteristic. Treating it as an ordinal numeric
                                 feature would imply an arbitrary quantitative distance between terms.
    - total_score / risk_level : excluded to prevent circular cross-check vs Model A
    - source_record_id, id     : non-numeric identifiers, not analytical features
    - mp_name, constituency    : high-cardinality nominal categoricals
    - status                   : discrete workflow state; encoding not justified
    - has_reasons_flag         : already captured downstream by Model A DQ component
    - released_amount          : highly collinear with expenditure (r > 0.95)
    - entitlement              : highly collinear with sanctioned_cost

MODEL CONFIGURATION:
    - algorithm          : IsolationForest (sklearn)
    - n_estimators       : 200   (sufficient and stable for 1,675 records)
    - contamination      : 0.05  (screening configuration, not a fraud rate estimate)
    - random_state       : 42    (fixed for determinism)
    - max_features       : 1.0   (use all 4 features in tree splits)
    - max_samples        : "auto" (min(256, n_samples))
    - scaling            : RobustScaler (resilient to outlier leverage during preprocessing)

CONTAMINATION DOCUMENTATION:
    contamination = 0.05
    "This is a screening configuration that causes approximately 5% of observations
    to be designated as statistical outliers. It is NOT an estimate of the percentage
    of fraudulent or anomalous government works."
"""

import os
import json
import sqlite3
import numpy as np
from datetime import datetime, timezone

from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import RobustScaler
from scipy.stats import rankdata

# ─── Configuration (frozen) ───────────────────────────────────────────────────
DB_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "processed", "mplads.db")
OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "if_results.json")

IF_CONFIG = {
    "model": "IsolationForest",
    "n_estimators": 200,
    "contamination": 0.05,
    "random_state": 42,
    "max_features": 1.0,
    "max_samples": "auto",
    "scaler": "RobustScaler",
    "features": [
        "sanctioned_cost",
        "expenditure",
        "unspent_balance",
        "utilization_ratio",
    ],
    "features_excluded": [
        "lok_sabha_term (removed: temporal cohort rather than allocation feature)",
        "total_score (Model A — excluded to prevent circular cross-check)",
        "risk_level (Model A — excluded to prevent circular cross-check)",
        "source_record_id, id (non-numeric identifiers)",
        "mp_name, constituency (raw high-cardinality categoricals)",
        "status (low-cardinality categorical, not encoded)",
        "has_reasons_flag (already captured in Model A DQ component)",
        "released_amount (highly correlated with expenditure)",
        "entitlement (highly correlated with sanctioned_cost)",
    ],
    "feature_dependence_note": (
        "Features are related financial quantities (utilization_ratio = expenditure / sanctioned_cost; "
        "unspent_balance is derived from financial quantities). They represent multi-dimensional financial "
        "geometry rather than orthogonal independent evidence sources. The model is an exploratory "
        "financial-feature anomaly cross-check."
    ),
    "contamination_rationale": (
        "contamination = 0.05. This is a screening configuration that causes approximately 5% of "
        "observations to be designated as statistical outliers. It is NOT an estimate of the percentage "
        "of fraudulent or anomalous government works."
    ),
}

CLAIM_SAFETY = (
    "Isolation Forest identifies statistically unusual allocations for secondary review. "
    "An outlier is NOT evidence of fraud or wrongdoing and does NOT change the "
    "platform's Model A risk score. This is an independent statistical cross-check only."
)


def load_data(db_path: str) -> list[dict]:
    """Load authentic production records from SQLite. Read-only."""
    conn = sqlite3.connect(db_path)
    rows = conn.execute("""
        SELECT
            p.id,
            p.source_record_id,
            p.mp_name,
            p.state,
            p.constituency,
            p.category,
            p.lok_sabha_term,
            p.sanctioned_cost,
            p.expenditure,
            p.unspent_balance,
            p.status,
            rs.total_score,
            rs.risk_level,
            rs.financial_score,
            rs.timeline_score,
            rs.data_quality_score
        FROM projects p
        LEFT JOIN risk_scores rs ON rs.project_id = p.id
        ORDER BY p.id ASC
    """).fetchall()
    conn.close()

    records = []
    for r in rows:
        sc = float(r[7]) if r[7] else 0.0
        exp = float(r[8]) if r[8] else 0.0
        util = (exp / sc) if sc > 0 else 0.0
        records.append({
            "id": r[0],
            "source_record_id": str(r[1]),
            "mp_name": str(r[2]),
            "state": str(r[3]),
            "constituency": str(r[4]),
            "category": str(r[5]),
            "lok_sabha_term": int(r[6]),
            "sanctioned_cost": sc,
            "expenditure": exp,
            "unspent_balance": float(r[9]) if r[9] is not None else 0.0,
            "utilization_ratio": round(min(util, 20.0), 6),  # cap extreme ratios
            "status": str(r[10]),
            "model_a_total_score": float(r[11]) if r[11] is not None else 0.0,
            "model_a_risk_level": str(r[12]) if r[12] else "Unknown",
            "model_a_financial_score": float(r[13]) if r[13] is not None else 0.0,
            "model_a_timeline_score": float(r[14]) if r[14] is not None else 0.0,
            "model_a_dq_score": float(r[15]) if r[15] is not None else 0.0,
        })
    return records


def build_feature_matrix(records: list[dict]) -> np.ndarray:
    """
    Extract the 4-feature matrix:
    [sanctioned_cost, expenditure, unspent_balance, utilization_ratio]
    Model A scores and parliamentary terms are explicitly excluded.
    """
    X = np.array([
        [
            r["sanctioned_cost"],
            r["expenditure"],
            r["unspent_balance"],
            r["utilization_ratio"],
        ]
        for r in records
    ], dtype=np.float64)
    return X


def run_isolation_forest(records: list[dict]) -> dict:
    """
    Runs offline Isolation Forest on the authentic dataset.
    Returns a results dict ready to be serialised to JSON.
    """
    print(f"Loaded {len(records)} records.")

    X = build_feature_matrix(records)

    # RobustScaler: resistant to the outliers we are trying to find
    scaler = RobustScaler()
    X_scaled = scaler.fit_transform(X)

    # Fixed random_state for full determinism
    clf = IsolationForest(
        n_estimators=IF_CONFIG["n_estimators"],
        contamination=IF_CONFIG["contamination"],
        random_state=IF_CONFIG["random_state"],
        max_features=IF_CONFIG["max_features"],
        max_samples="auto",
        n_jobs=1,
    )
    clf.fit(X_scaled)

    # score_samples returns negative anomaly scores:
    #   more negative = more anomalous
    raw_scores = clf.score_samples(X_scaled)
    # Flip and normalize to [0,1] for readability (higher = more unusual)
    min_s, max_s = raw_scores.min(), raw_scores.max()
    if max_s > min_s:
        normalized_scores = (raw_scores - min_s) / (max_s - min_s)
    else:
        normalized_scores = np.zeros_like(raw_scores)
    # Invert so 1.0 = most unusual
    anomaly_scores = 1.0 - normalized_scores

    # Outlier prediction: -1 = outlier, 1 = inlier
    predictions = clf.predict(X_scaled)

    # Percentile rank (100 = most anomalous)
    ranks = rankdata(anomaly_scores, method="average")
    percentile_ranks = np.round((ranks / len(ranks)) * 100, 1)

    # Annotate records
    results = []
    for i, rec in enumerate(records):
        results.append({
            "source_record_id": rec["source_record_id"],
            "mp_name": rec["mp_name"],
            "state": rec["state"],
            "constituency": rec["constituency"],
            "category": rec["category"],
            "status": rec["status"],
            "sanctioned_cost": rec["sanctioned_cost"],
            "expenditure": rec["expenditure"],
            "unspent_balance": rec["unspent_balance"],
            "utilization_ratio": rec["utilization_ratio"],
            "lok_sabha_term": rec["lok_sabha_term"],
            # Isolation Forest output
            "if_anomaly_score": round(float(anomaly_scores[i]), 6),
            "if_percentile_rank": float(percentile_ranks[i]),
            "if_is_outlier": bool(predictions[i] == -1),
            "if_label": (
                "Statistical Outlier Candidate — Requires Secondary Review"
                if predictions[i] == -1
                else "Within Normal Range"
            ),
            # Model A reference (read-only, NOT used as IF input)
            "model_a_total_score": rec["model_a_total_score"],
            "model_a_risk_level": rec["model_a_risk_level"],
        })

    # Summary statistics
    n_outliers = int(np.sum(predictions == -1))
    outlier_records = [r for r in results if r["if_is_outlier"]]
    outlier_records_sorted = sorted(outlier_records, key=lambda x: -x["if_anomaly_score"])

    # Model A tier distribution among outliers
    model_a_dist_outliers = {}
    for r in outlier_records:
        tier = r["model_a_risk_level"]
        model_a_dist_outliers[tier] = model_a_dist_outliers.get(tier, 0) + 1

    # Overlap with Model A High
    overlap_high = sum(1 for r in outlier_records if r["model_a_risk_level"] == "High")
    overlap_medium = sum(1 for r in outlier_records if r["model_a_risk_level"] == "Medium")
    overlap_low = sum(1 for r in outlier_records if r["model_a_risk_level"] == "Low")

    # Top 20 outliers for UI display
    top_outliers = outlier_records_sorted[:20]

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "total_records_evaluated": len(records),
        "config": IF_CONFIG,
        "claim_safety": CLAIM_SAFETY,
        "summary": {
            "n_outliers": n_outliers,
            "n_inliers": len(records) - n_outliers,
            "outlier_rate_pct": round(n_outliers / len(records) * 100, 2),
            "model_a_tier_distribution_among_outliers": model_a_dist_outliers,
            "overlap_with_model_a_high": overlap_high,
            "overlap_with_model_a_medium": overlap_medium,
            "overlap_with_model_a_low": overlap_low,
            "overlap_label": "Overlap with Model A High Risk",
            "overlap_note": (
                "Overlap shows coincidence between two independent analytical methods. "
                "It does NOT represent accuracy, precision, recall, or validation accuracy. "
                "No ground-truth fraud labels exist in authentic data."
            ),
        },
        "top_outliers": top_outliers,
        "all_results": results,
    }


if __name__ == "__main__":
    print("=== MPLADS Samiksha — Isolation Forest Cross-Check ===")
    print(f"DB: {os.path.abspath(DB_PATH)}")
    print(f"Output: {os.path.abspath(OUTPUT_PATH)}")
    print(f"Features (4): {IF_CONFIG['features']}")
    print()

    records = load_data(DB_PATH)
    output = run_isolation_forest(records)

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    s = output["summary"]
    print(f"Total evaluated: {output['total_records_evaluated']}")
    print(f"Outliers: {s['n_outliers']} ({s['outlier_rate_pct']}%)")
    print(f"Model A tier distribution among outliers: {s['model_a_tier_distribution_among_outliers']}")
    print(f"Overlap with Model A High: {s['overlap_with_model_a_high']}")
    print(f"\nTop 5 outliers:")
    for r in output["top_outliers"][:5]:
        print(f"  {r['source_record_id']} | {r['constituency']} | "
              f"score={r['if_anomaly_score']:.4f} | ModelA={r['model_a_risk_level']} "
              f"({r['model_a_total_score']})")

    print(f"\nResults saved to: {OUTPUT_PATH}")
    print("CLAIM SAFETY:", output["claim_safety"])
