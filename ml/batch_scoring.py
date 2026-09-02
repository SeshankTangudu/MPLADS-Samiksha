"""Batch Scoring Pipeline for MPLADS Samiksha (T12).

Executes deterministic offline risk scoring over all 1,675 allocation records
in data/processed/mplads.db using ml/risk_engine.py and ml/cohort_baselines.json.
Populates `risk_scores` (1:1) and `risk_flags` (1:N) tables with complete explainability.
Guarantees strict idempotency and transactional integrity.
"""

import os
import sys
from datetime import datetime, timezone
from sqlalchemy import create_engine, func
from sqlalchemy.orm import sessionmaker

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, PROJECT_ROOT)

from backend.app.database import DATABASE_URL
from backend.app.models import Project, District, RiskScore, RiskFlag
from ml.risk_engine import evaluate_allocation, load_baselines


def run_batch_scoring(db_url: str = DATABASE_URL) -> dict:
    """Evaluates all projects and populates risk_scores & risk_flags idempotently."""
    engine = create_engine(db_url)
    Session = sessionmaker(bind=engine)
    session = Session()

    baselines = load_baselines()
    computed_at = datetime.now(timezone.utc).isoformat()

    try:
        # 1. Clear existing risk scores and flags to guarantee idempotency
        session.query(RiskFlag).delete()
        session.query(RiskScore).delete()
        session.flush()

        # 2. Fetch all allocation records
        projects = session.query(Project).order_by(Project.id).all()
        print(f"Loaded {len(projects)} allocation records for batch scoring...")

        risk_scores_to_add = []
        risk_flags_to_add = []
        district_flag_counts = {}

        for p in projects:
            rec_dict = {
                "category": p.category,
                "state": p.state,
                "expenditure": p.expenditure,
                "sanctioned_cost": p.sanctioned_cost,
                "unspent_balance": p.unspent_balance,
                "status": p.status,
                "lok_sabha_term": p.lok_sabha_term,
                "pending_reason": p.pending_reason or ""
            }

            eval_res = evaluate_allocation(rec_dict, baselines)

            # Build RiskScore entity
            rs = RiskScore(
                project_id=p.id,
                total_score=eval_res["total_score"],
                risk_level=eval_res["risk_level"],
                financial_score=eval_res["financial_score"],
                timeline_score=eval_res["timeline_score"],
                data_quality_score=eval_res["data_quality_score"],
                geographic_score=eval_res["geographic_score"],
                computed_at=computed_at
            )
            risk_scores_to_add.append(rs)

            # Build RiskFlag entities
            for flag in eval_res["flags"]:
                rf = RiskFlag(
                    project_id=p.id,
                    flag_type=flag["flag_type"],
                    severity=flag["severity"],
                    title=flag["title"],
                    observed_value=flag["observed_value"],
                    baseline_value=flag["baseline_value"],
                    threshold_value=flag["threshold_value"],
                    explanation=flag["explanation"]
                )
                risk_flags_to_add.append(rf)

            # Track district-level High/Critical risk allocation count
            if eval_res["risk_level"] in ("High", "Critical"):
                district_flag_counts[p.district_id] = district_flag_counts.get(p.district_id, 0) + 1

        # 3. Bulk insert risk scores and flags
        session.bulk_save_objects(risk_scores_to_add)
        session.bulk_save_objects(risk_flags_to_add)
        session.flush()

        # 4. Update District flagged allocation counts
        session.query(District).update({"flagged_allocations": 0})
        for dist_id, count in district_flag_counts.items():
            session.query(District).filter(District.id == dist_id).update({"flagged_allocations": count})

        session.commit()
        print(f"Committed {len(risk_scores_to_add)} risk_scores and {len(risk_flags_to_add)} risk_flags.")

        # 5. Verification & Aggregate Distribution
        total_scores = session.query(func.count(RiskScore.id)).scalar()
        total_flags = session.query(func.count(RiskFlag.id)).scalar()

        low_cnt = session.query(func.count(RiskScore.id)).filter(RiskScore.risk_level == "Low").scalar()
        med_cnt = session.query(func.count(RiskScore.id)).filter(RiskScore.risk_level == "Medium").scalar()
        high_cnt = session.query(func.count(RiskScore.id)).filter(RiskScore.risk_level == "High").scalar()
        crit_cnt = session.query(func.count(RiskScore.id)).filter(RiskScore.risk_level == "Critical").scalar()

        summary = {
            "total_scored": total_scores,
            "total_flags": total_flags,
            "risk_distribution": {
                "low": low_cnt,
                "medium": med_cnt,
                "high": high_cnt,
                "critical": crit_cnt
            },
            "computed_at": computed_at
        }
        return summary

    except Exception as e:
        session.rollback()
        raise e
    finally:
        session.close()


if __name__ == "__main__":
    res = run_batch_scoring()
    print("Batch scoring summary:", res)
