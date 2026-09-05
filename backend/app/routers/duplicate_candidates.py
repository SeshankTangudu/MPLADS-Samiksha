"""Duplicate Candidate Intelligence Router.

GET /api/analytics/duplicate-candidates

READ-ONLY endpoint. Surfaces structural similarity candidates from the
authentic production dataset for human review.

IMPORTANT CLAIM SAFETY:
- Candidates are NOT confirmed duplicates.
- Candidates are NOT fraud evidence.
- Similarity is a review signal requiring human verification.
- No Model A risk scores are modified by this endpoint.
- No production database records are mutated.

MATCHING METHODOLOGY (Deterministic, Transparent, Reproducible):
    A pair (A, B) is a similarity candidate if and only if ALL four of the
    following fields match exactly:
        1. constituency      — same electoral constituency
        2. category          — same civic sector (only 3 exist in this dataset)
        3. lok_sabha_term    — same parliamentary term
        4. sanctioned_cost   — same sanctioned works amount (float equality)

    A minimum of 4 structural signals is required. Matching on fewer fields
    (e.g., MP name alone, district alone, category alone) is explicitly excluded.

    MP name is NOT used as a matching key because the same constituency may
    have different MPs across terms or by-elections.

SIMILARITY SCORE FORMULA:
    similarity_score = matched_fields_count / TOTAL_CANDIDATE_FIELDS
    where TOTAL_CANDIDATE_FIELDS = 4.

    For all currently identified pairs: similarity_score = 4/4 = 1.0 (exact structural match).

    This score is labelled "Similarity Score" and must NOT be interpreted as
    fraud probability, duplicate probability, or a Model A risk score.

TEXT SIMILARITY NOTE:
    The 'description' field in this dataset contains allocation-level contextual
    templates ("MPLADS Constituency Works Allocation for <Constituency> (<MP Name>)"),
    not itemized civil project names. Text-similarity matching was not used
    because it would not produce meaningful or defensible results on this field.
"""

from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.database import get_db
from backend.app.models import Project, RiskScore
from backend.app.schemas import (
    DuplicateCandidateRecordSchema,
    DuplicateCandidatePairSchema,
    DuplicateCandidatesResponseSchema,
)

router = APIRouter(tags=["Duplicate Candidate Intelligence"])

# The four structural fields used for multi-signal matching.
# Matching on any single field alone is explicitly insufficient.
CANDIDATE_MATCH_FIELDS = ["constituency", "category", "lok_sabha_term", "sanctioned_cost"]
TOTAL_CANDIDATE_FIELDS = len(CANDIDATE_MATCH_FIELDS)


def _build_record_schema(project: Project) -> DuplicateCandidateRecordSchema:
    """Builds a minimal record summary for use in a candidate pair."""
    return DuplicateCandidateRecordSchema(
        id=project.id,
        source_record_id=project.source_record_id,
        mp_name=project.mp_name,
        state=project.state,
        district=project.district,
        constituency=project.constituency,
        category=project.category,
        lok_sabha_term=project.lok_sabha_term,
        sanctioned_cost=round(project.sanctioned_cost, 2),
        expenditure=round(project.expenditure, 2),
        status=project.status,
        investigate_url=f"/projects/{project.id}",
    )


def _build_rationale(projects: List[Project]) -> str:
    """Constructs a plain-language matching rationale string."""
    p = projects[0]
    return (
        f"Both allocations share identical values across all 4 structural matching fields: "
        f"constituency='{p.constituency}', category='{p.category}', "
        f"parliamentary term={p.lok_sabha_term}, sanctioned cost=₹{p.sanctioned_cost:.2f} Cr. "
        f"Requires human verification to determine whether these represent separate works "
        f"or a potential administrative duplication."
    )


@router.get(
    "/analytics/duplicate-candidates",
    response_model=DuplicateCandidatesResponseSchema,
    summary="Similarity Candidate Pairs for Human Review",
    description=(
        "Returns structural similarity candidate pairs from the authentic production dataset. "
        "These are review candidates, NOT confirmed duplicates or fraud evidence. "
        "All candidates require human verification. "
        "This endpoint is read-only and does not modify any production records or risk scores."
    ),
)
def get_duplicate_candidates(db: Session = Depends(get_db)) -> DuplicateCandidatesResponseSchema:
    """
    Identifies structural similarity candidate pairs requiring human review.

    Matching criteria (ALL four must match for a pair to qualify):
        - constituency
        - category
        - lok_sabha_term
        - sanctioned_cost (> 0 to exclude data-quality zero-cost records)

    Returns all pairs sorted by similarity_score descending, then by pair_id ascending.
    Self-matches are excluded. Reverse duplicates (B,A) are excluded.
    """
    # Find all (constituency, category, term, cost) groups with >= 2 members.
    # sanctioned_cost > 0 excludes zero-cost data-quality anomalies from candidate logic.
    groups = (
        db.query(
            Project.constituency,
            Project.category,
            Project.lok_sabha_term,
            Project.sanctioned_cost,
            func.count(Project.id).label("cnt"),
        )
        .filter(Project.sanctioned_cost > 0.0)
        .group_by(
            Project.constituency,
            Project.category,
            Project.lok_sabha_term,
            Project.sanctioned_cost,
        )
        .having(func.count(Project.id) >= 2)
        .all()
    )

    candidate_pairs: List[DuplicateCandidatePairSchema] = []
    seen_pairs: set = set()

    for group in groups:
        constituency, category, term, cost, _ = group

        members = (
            db.query(Project)
            .filter(
                Project.constituency == constituency,
                Project.category == category,
                Project.lok_sabha_term == term,
                Project.sanctioned_cost == cost,
            )
            .order_by(Project.id.asc())
            .all()
        )

        # Generate unique pairs within this group, excluding self-matches.
        for i in range(len(members)):
            for j in range(i + 1, len(members)):
                a = members[i]
                b = members[j]

                # Deterministic pair_id: always smaller_id-larger_id to prevent reverse duplicates.
                smaller_id = min(a.id, b.id)
                larger_id = max(a.id, b.id)
                pair_id = f"{smaller_id}-{larger_id}"

                if pair_id in seen_pairs:
                    continue
                seen_pairs.add(pair_id)

                record_a = _build_record_schema(a if a.id == smaller_id else b)
                record_b = _build_record_schema(b if b.id == larger_id else a)

                # Similarity score = matched_fields / total_candidate_fields.
                # All pairs here match all 4 fields → 1.0.
                similarity_score = round(TOTAL_CANDIDATE_FIELDS / TOTAL_CANDIDATE_FIELDS, 2)

                rationale = _build_rationale([a, b])

                candidate_pairs.append(
                    DuplicateCandidatePairSchema(
                        pair_id=pair_id,
                        record_a=record_a,
                        record_b=record_b,
                        similarity_score=similarity_score,
                        matched_fields=list(CANDIDATE_MATCH_FIELDS),
                        matching_rationale=rationale,
                        requires_human_verification=True,
                        candidate_label="Potential Similarity Candidate — Requires Verification",
                    )
                )

    # Sort by similarity_score descending, then pair_id ascending for determinism.
    candidate_pairs.sort(key=lambda p: (-p.similarity_score, p.pair_id))

    return DuplicateCandidatesResponseSchema(
        total_candidate_pairs=len(candidate_pairs),
        candidate_pairs=candidate_pairs,
    )
