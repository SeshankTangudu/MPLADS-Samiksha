"""Reports and CSV Export Endpoints (T13).

Implements GET /api/reports/risk-summary.csv.
"""

import io
import csv
from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.app.database import get_db
from backend.app.models import Project, RiskScore, RiskFlag

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/risk-summary.csv")
def export_risk_summary_csv(db: Session = Depends(get_db)):
    """Streams a formatted CSV export of all allocation records ranked by risk score with explainable reasons."""
    projects = (
        db.query(Project)
        .outerjoin(RiskScore, Project.id == RiskScore.project_id)
        .order_by(desc(RiskScore.total_score), desc(Project.expenditure))
        .all()
    )

    output = io.StringIO()
    writer = csv.writer(output)

    # Write CSV Header
    writer.writerow([
        "Record_ID",
        "Lok_Sabha_Term",
        "Member_of_Parliament",
        "House",
        "State",
        "District",
        "Constituency",
        "Civic_Category",
        "Sanctioned_Works_Cost_Cr",
        "Reported_Expenditure_Cr",
        "Unspent_Balance_Cr",
        "Financial_Utilization_Pct",
        "Status",
        "Total_Risk_Score",
        "Risk_Level",
        "Primary_Reason_Signal",
        "Disclaimer"
    ])

    disclaimer = "Risk indicators are analytical signals intended to support review. They do not constitute proof of wrongdoing."

    for p in projects:
        score = p.risk_score.total_score if p.risk_score else 0.0
        level = p.risk_score.risk_level if p.risk_score else "Low"
        top_reason = p.risk_flags[0].title if p.risk_flags else "Normal cohort parameters"
        util = round((p.expenditure / p.sanctioned_cost * 100), 2) if p.sanctioned_cost > 0 else 0.0

        writer.writerow([
            p.source_record_id,
            f"{p.lok_sabha_term}th Lok Sabha",
            p.mp_name,
            p.house,
            p.state,
            p.district,
            p.constituency,
            p.category,
            f"{p.sanctioned_cost:.2f}",
            f"{p.expenditure:.2f}",
            f"{p.unspent_balance:.2f}",
            f"{util:.2f}",
            p.status,
            f"{score:.1f}",
            level,
            top_reason,
            disclaimer
        ])

    csv_content = output.getvalue()
    return Response(
        content=csv_content,
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": "attachment; filename=mplads_risk_summary.csv"
        }
    )
