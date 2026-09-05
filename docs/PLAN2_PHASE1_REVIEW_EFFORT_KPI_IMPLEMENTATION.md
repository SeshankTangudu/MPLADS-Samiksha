# Plan 2 Phase 1 — Review Effort Index Implementation & Verification Report

- **Document Version**: 1.0.0
- **Status**: ✅ **ACCEPTED & INDEPENDENTLY VERIFIED**
- **Date**: September 2026
- **Feature Code**: `P1-1`
- **Module**: Analytics Intelligence & Auditor Review Triage

---

## 1. Executive Summary & Objective

The **Review Effort Index** (formerly Analytical Review Effort) is a transparent, deterministic decision-support KPI designed to help auditors understand the approximate **analytical review burden** and **triage priority** represented by the current portfolio risk distribution.

> [!IMPORTANT]
> **Definitional Distinction & Governance Guardrail**:
> - The Review Effort Index is **NOT** a prediction of actual auditor hours, institutional workload, or legal investigation costs.
> - It is a **deterministic analytical prioritization metric** weighted by Model A risk tiers and active anomaly flags.
> - **Platform Disclosure**: *"This index estimates relative analytical review effort based on Model A risk tier and active analytical flags. It does not represent actual auditor hours or institutional workload."*

---

## 2. Mathematical Methodology & Configurable Tier Weights

### Workload-Prioritization Formula:
$$\text{Total Review Effort Index} = (N_{\text{Low}} \times W_{\text{Low}}) + (N_{\text{Med}} \times W_{\text{Med}}) + (N_{\text{High}} \times W_{\text{High}}) + (N_{\text{Crit}} \times W_{\text{Crit}})$$

$$\text{Average Effort Per Allocation} = \frac{\text{Total Review Effort Index}}{N_{\text{Total}}}$$

### Configurable Workload Weights (Configured in `backend/app/routers/analytics.py`):
- **Low Risk Tier ($W_{\text{Low}}$)**: **1.0x** (Standard baseline review)
- **Medium Risk Tier ($W_{\text{Med}}$)**: **2.0x** (Moderate analytical verification)
- **High Risk Tier ($W_{\text{High}}$)**: **4.0x** (In-depth forensic audit & document check)
- **Critical Risk Tier ($W_{\text{Crit}}$)**: **8.0x** (Multi-agency prioritized investigation)

> [!NOTE]
> These are **workload-prioritization weights**, completely distinct from Model A scoring weights (Financial=35, Timeline=25, DQ=20, Geographic=10, Duplicate=10).

---

## 3. National Baseline Results (Live SQLite Aggregations)

| Metric | Empirical Value | Portfolio / Effort Share | Analytical Note |
| :--- | :---: | :---: | :--- |
| **Total Validated Allocations** | **1,675** | 100.0% | Complete MoSPI authentic baseline |
| **Total Review Effort Index** | **2,376 pts** | 100.0% | National aggregate prioritization points |
| **Average Effort Per Allocation** | **1.42 pts/alloc** | — | National effort density |
| **Low-Risk Contribution** | 1,166 records | 49.07% effort (1,166 pts) | 69.61% of portfolio |
| **Medium-Risk Contribution** | 413 records | 34.76% effort (826 pts) | 24.66% of portfolio |
| **High-Risk Contribution** | 96 records | 16.16% effort (384 pts) | 5.73% of portfolio (**3x concentration**) |
| **Critical-Risk Contribution** | 0 records | 0.00% effort (0 pts) | 0.00% of portfolio |

---

## 4. Longitudinal & Flag Burden Breakdown

### By Parliamentary Term:
- **15th Lok Sabha (2009–2014)**: 549 allocations | **668 effort points** | **1.22 pts/allocation** (8 High Risk)
- **16th Lok Sabha (2014–2019)**: 569 allocations | **1,053 effort points** | **1.85 pts/allocation** (88 High Risk — **Peak Burden**)
- **17th Lok Sabha (2019–2024)**: 557 allocations | **655 effort points** | **1.18 pts/allocation** (0 High Risk)

### Active Anomaly Flag Burden (`risk_flags` Table):
- **Timeline Retention Flags**: **734 flags** (68.8%)
- **Data Quality / MPR Flags**: **244 flags** (22.9%)
- **Financial Outlier Flags**: **89 flags** (8.3%)
- **Total Active Flags**: **1,067 flags**

### Deterministic Data-Derived Interpretation:
> *"While High-Risk allocations comprise only 5.7% of the portfolio (96 records), they account for 16.2% of total analytical review effort points (384 / 2,376 pts). The 16th Lok Sabha session concentrates the highest review density (1,053 pts, 1.85 pts/alloc) driven primarily by timeline stagnation flags."*

---

## 5. Files Changed

1. [backend/app/schemas.py](file:///f:/MPLADS-Samiksha/backend/app/schemas.py): Added `ReviewEffortTierBreakdownSchema`, `ReviewEffortFlagBreakdownSchema`, `ReviewEffortTermBreakdownSchema`, `ReviewEffortKPISchema`, and added `review_effort` to `TrendIntelligenceResponseSchema`.
2. [backend/app/routers/analytics.py](file:///f:/MPLADS-Samiksha/backend/app/routers/analytics.py): Implemented `compute_review_effort_kpi(db)` and `GET /api/analytics/review-effort` endpoint; embedded in `GET /api/analytics/trend-intelligence`.
3. [frontend/src/services/api.js](file:///f:/MPLADS-Samiksha/frontend/src/services/api.js): Added `getReviewEffort` method.
4. [frontend/src/pages/AnalyticsPage.jsx](file:///f:/MPLADS-Samiksha/frontend/src/pages/AnalyticsPage.jsx): Built the Review Effort Index card, KPI grid, tier distribution bars, term comparison, and interpretation box.
5. [tests/test_trends_endpoint.py](file:///f:/MPLADS-Samiksha/tests/test_trends_endpoint.py): Added `test_review_effort_kpi_calculation` unit test verifying mathematical invariants and flag counts.

---

## 6. Verification & Regression Audit

- **Automated Tests**: **77 / 77 passed (100%)** in 9.73s.
- **Frontend Build**: `npm run build` compiled cleanly into `dist/` in 16.11s (0 errors).
- **Live Browser Verification**: Full audit on `http://localhost:5173/analytics` confirmed rendering of all 4 KPI cards, 4 tier cards, 3 term cards, interpretation box, and 0 console errors.
- **Model A Distribution**: **96 High, 413 Medium, 1,166 Low, 0 Critical (Total = 1,675 — 100% Frozen)**.
- **Database Integrity**:
  - `projects`: 1,675
  - `risk_scores`: 1,675
  - `risk_flags`: 1,067
  - `districts`: 1,015
  - `orphan_scores`: 0
  - `orphan_flags`: 0
  - `synthetic_records_in_db`: 0
