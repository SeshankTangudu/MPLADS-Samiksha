# Plan 2 Phase 5 — Audit Case File / Printable Investigation Dossier Implementation Report

- **Feature**: P1-5 — Audit Case File / Printable Investigation Dossier
- **Document Version**: 1.0.0
- **Status**: ✅ **COMPLETE & VERIFIED**
- **Date**: September 2026
- **Auditor**: Lead System Architect, ML Engineer & Data Integrity Reviewer

---

## 1. Objective & Architectural Scope

The **Audit Case File / Printable Investigation Dossier** capability (P1-5) provides a structured, presentation-and-export layer that synthesizes analytical signals, empirical multi-term trajectories, peer benchmarks, review triage workflow history, and data provenance into a clean, comprehensive case dossier formatted for screen viewing and print/PDF generation.

### Strict Presentation/Export Layer Separation Rule:
- The case dossier is strictly a presentation and export interface.
- It consumes existing analytical outputs from Model A, Trajectory, and Review Triage APIs.
- It makes **zero modifications** to:
  - Model A risk scoring formulas or weights (35, 25, 20, 10, 10)
  - Risk tiers (<25, 25–49.9, 50–74.9, ≥75)
  - Production risk flags or database tables
  - Cohort statistics or quantile calculations
  - Multi-term trajectory evaluations
  - Review triage metadata schemas

---

## 2. Exact Case Dossier Contents & Structure

The dossier renders 9 core evidence-oriented sections:

1. **Case Header & Allocation Identification**:
   - `source_record_id` (e.g. `LS16_0100`), MP Name, Constituency, Parliamentary Term (`16th Lok Sabha`), Civic Sector (`category`), District Centroid, State / UT.
   - Current Model A Risk Score & Tier (`53 / 100 — High Risk`).
   - Printable dossier header banner showing generation timestamp and internal case reference format (`MPLADS Samiksha — Analytical Review Dossier`).

2. **Analytical Risk Summary & 5-Dimension Decomposition**:
   - Linear breakdown of the 5 core dimensions: Financial (35), Timeline (25), Data Quality (20), Geographic (10), Deduplication (10).
   - Explainable ReasonCards displaying active flags, observed values, peer cohort thresholds, and signal rationales.

3. **Financial Deployment Profile & Utilization Proxy**:
   - Sanctioned works budget (₹ Cr), reported expenditure (₹ Cr), MoSPI releases (₹ Cr), unspent balance (₹ Cr).
   - Labeled explicitly as:
     `Financial Utilization Proxy — expenditure / sanctioned cost × 100`
   - Prominent disclaimer:
     `*Financial utilization is a proxy based on expenditure and sanctioned cost and does not represent physical work progress.`

4. **Multi-Term Risk Trajectory & Early Warning (Phase 3 Integration)**:
   - Term progression table across 15th, 16th, and 17th Lok Sabha sessions with authentic MP names, sanctioned amounts, reported spending, utilization %, and risk scores.
   - Trajectory classification using the verified $\pm 10.0$-point delta rule (`ESCALATING`, `IMPROVING`, `STABLE`, `ELEVATED`, or `INSUFFICIENT HISTORY`).
   - Early warning analytical banner when score deltas or persistent risk levels warrant attention.

5. **Evidence Completeness Matrix (Phase 1.4 Integration)**:
   - Clear comparative table distinguishing **Evidence Available in MoSPI Dataset** from **Evidence Requiring Administrative Verification** (explicit disclosure that transaction-level payment vouchers, physical civil completion certificates, and exact worksite GPS coordinates are absent from public open data).

6. **Human Review Disposition & Triage History (Phase 4 Integration)**:
   - Current review status (`NEW`, `UNDER REVIEW`, `EVIDENCE REQUESTED`, `RESOLVED`, `FALSE POSITIVE`, `ESCALATED`).
   - Auditor triage notes and requested evidence checklist.
   - Chronological audit trail of all status transitions with ISO timestamps.
   - Required separation disclaimer:
     `*Human review disposition is administrative review metadata and does not modify the underlying Model A risk score, risk tier, or analytical flags.`

7. **Recommended Review Actions for Auditor (Phase 1.3 G)**:
   - Deterministic, category-derived action items based on active ReasonCards (e.g. inspecting financial ledgers, verifying project stagnation notices, requesting pending MPRs).

8. **Peer Cohort Comparables**:
   - Contextual table of peer allocations in the same civic sector and budget tier for comparative evaluation.

9. **Data Provenance & Responsible AI Disclaimers**:
   - Verified MoSPI open data release provenance, ingestion key, and district centroid match.
   - Standing Platform Disclaimer:
     `"Risk indicators are analytical signals intended to support review. They do not constitute proof of wrongdoing."`

---

## 3. Print / Export Behavior & CSS Implementation

- **Print Invocation**: Dedicated `"Print Case Dossier"` button in the top action bar calling native `window.print()`.
- **CSS Stylesheet (`@media print` in `frontend/src/index.css`)**:
  - Hides non-essential UI elements (`nav`, `footer`, interactive buttons, breadcrumbs, inputs, filter bars) via `display: none !important`.
  - Applies high-contrast print typography and removes heavy background shadows.
  - Preserves table structures, KPI metric boxes, and disclaimers.
  - Enforces `page-break-inside: avoid` and `break-inside: avoid` on cards and table rows to prevent awkward splits across standard A4 pages.
  - Displays printable dossier banner at the top of the exported case file.

---

## 4. Verification Results

- **Backend Test Suite**: **72 / 72 passing (100%)** (`pytest -v` in 7.06s).
- **Frontend Production Build**: **PASS** (`npm run build` compiled cleanly into `dist/` with 0 errors).
- **Live Browser Session**: Verified on `http://localhost:5173/projects/LS16_0100`:
  - Case header elements and record key correctly rendered
  - Model A score (53.0 High) matches baseline
  - Active ReasonCards and 5-dimension signals match Investigation Workspace
  - Trajectory table (15th, 16th, 17th LS) and status accurately reflected
  - Review triage status (`FALSE POSITIVE`), notes, checklist, and audit trail preserved
  - "Print Case Dossier" button active and responsive
  - 0 console errors logged.
- **Model A Immutability**:
  - Scoring formulas and weights remain 100% frozen.
  - Risk distribution: **96 High, 413 Medium, 1,166 Low, 0 Critical (Total = 1,675)** — **100% Preserved**.
- **Production Database Integrity**:
  - Exactly 1,675 authentic records, 1,015 districts, 0 orphan records, 0 synthetic records in `mplads.db`.

---

## 5. Claim Safety & Governance Verification

- No official audit case numbers fabricated.
- No fake government reviewer identities or decisions generated.
- No missing payment vouchers, physical civil milestones, or micro-GPS coordinates claimed to exist.
- Clear and prominent platform disclaimers maintained throughout:
  > *"Risk indicators are analytical signals intended to support review. They do not constitute proof of wrongdoing."*  
  > *"Financial utilization is a proxy based on expenditure and sanctioned cost and does not represent physical work progress."*
