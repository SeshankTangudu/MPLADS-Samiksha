# Checkpoint T06 — Database Schema + Load DB

- **Task ID**: T06
- **Agent**: Database Engineer
- **Timestamp**: 2026-09-01T22:44:00+05:30
- **Status**: PASSED

## Change Review Summary (§B.22 & Change Gate)

### Created / Modified Files:
1. `backend/app/models.py` — SQLAlchemy ORM models implementing the 6 frozen schema tables (`mps`, `districts`, `projects`, `risk_scores`, `risk_flags`, `analytics_cache`) with foreign keys, constraints, and compound indexes (Backend Model Code).
2. `scripts/build_db.py` — Idempotent database creation and data ingestion script populating tables from `projects_clean.csv` and `centroids.csv` (Pipeline Tooling).
3. `tests/test_database.py` — Automated verification tests validating table presence, project row count match (1,675), primary key uniqueness, foreign key integrity, financial sums, and index presence (Test).
4. `data/processed/mplads.db` — SQLite database file containing the loaded, indexed real dataset (Generated / Local Binary, git-ignored).

### Verification
- `scripts/build_db.py` executed cleanly:
  - 1,015 records loaded into `districts`.
  - 1,547 records loaded into `mps`.
  - 1,675 allocation records loaded into `projects` (100% match with `projects_clean.csv`).
- Foreign key integrity verified with `PRAGMA foreign_key_check` (0 violations).
- Financial sums match CSV totals (`sanctioned_cost` sum: ₹24,823.50 Cr, `expenditure` sum: ₹21,624.25 Cr).
- Automated test suite `pytest tests/test_database.py` PASSED (7/7 green). Full test suite: 20/20 PASSED.

### Downstream Unlocked Tasks
- **T08** (ORM models + Pydantic schemas) — `READY`
- **T10** (Cohort statistics script) — `READY`
- **T15** (Overview + Dashboard pages) — `READY`
- **T16** (Project Explorer) — `READY`
