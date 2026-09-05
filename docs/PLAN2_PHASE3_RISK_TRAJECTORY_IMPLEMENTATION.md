# Plan 2 Phase 3 — Risk Trajectory / Empirical Early Warning Implementation Report

- **Feature**: P1-3 — Risk Trajectory / Empirical Early Warning
- **Document Version**: 1.1.0 (Targeted Methodology Correction Applied)
- **Status**: ✅ **COMPLETE & VERIFIED**
- **Date**: September 2026
- **Auditor**: Lead System Architect, ML Engineer & Data Integrity Reviewer

---

## 1. Objective & Non-Predictive Architecture

The **Risk Trajectory / Empirical Early Warning** capability (P1-3) provides transparent, observable longitudinal intelligence within the Investigation Workspace (`/projects/:id`). It demonstrates whether a constituency's observed Model A risk signals and financial characteristics have changed across authentic parliamentary sessions (15th, 16th, 17th Lok Sabha).

> **Core Principle**: Trajectory classification is based strictly on observed historical score changes and is NOT a predictive model.

---

## 2. Corrected Classification Methodology (Conservative 10-Point Rule)

In accordance with strict conservative methodology, a meaningful score movement between consecutive observed parliamentary terms requires an absolute change of **at least 10 points** ($|\Delta| \ge 10.0$):

1. **`ESCALATING` ($\Delta \ge +10.0$)**:
   - Meaningful risk score increase of $\ge +10.0$ points between consecutive observed terms.
   - Generates empirical early-warning review signal explaining the specific point increase.
2. **`IMPROVING` ($\Delta \le -10.0$)**:
   - Meaningful risk score decrease of $\ge -10.0$ points between consecutive observed terms.
   - Summarizes observed score improvement without triggering an escalation warning.
3. **`STABLE` ($|\Delta| < 10.0$)**:
   - Sub-10-point score variations are classified as `STABLE`.
   - **Tier Boundary Movement**: If a small score change ($< 10$ points) crosses a tier boundary (e.g. 49 $\rightarrow$ 50), the system describes the boundary change accurately (e.g. *"Risk tier changed from Medium to High, with a small +1.0 point score change across observed terms"*), but **does NOT** trigger an `ESCALATING` classification or an escalation alert banner solely due to a boundary crossing.
4. **`ELEVATED`**:
   - Retained only when persistent elevated risk ($\ge 50.0$ points) is observed across all available parliamentary terms.
5. **`INSUFFICIENT HISTORY`**:
   - When only a single parliamentary term is observed in the dataset ($< 2$ terms), the system displays an explicit limitation notice rather than synthesizing a trajectory.

---

## 3. Mathematical Validation Across Real Longitudinal Cases

Direct SQLite queries were executed and compared against the FastAPI project detail endpoint:

| Scenario / Case ID | Constituency | Observed Terms & Scores | Score Delta ($\Delta$) | Trajectory Status | Early-Warning Alert | Match |
| :--- | :--- | :---: | :---: | :---: | :--- | :---: |
| **Case 1: `LS17_0505`** | Hamirpur | 15LS (22.0) $\rightarrow$ 16LS (18.0) $\rightarrow$ 17LS (35.0) | $+17.0$ pts | `ESCALATING` | Active (`+17.0 pts from 16LS to 17LS`) | ✅ **100% Match** |
| **Case 2: `LS17_0105`** | North West Delhi | 15LS (0.0) $\rightarrow$ 16LS (53.0) $\rightarrow$ 17LS (0.0) | $-53.0$ pts | `IMPROVING` | None (`Score improved by 53.0 pts`) | ✅ **100% Match** |
| **Case 3: `LS16_0143`** | Hamirpur | 15LS (22.0) $\rightarrow$ 16LS (18.0) | $-4.0$ pts | `STABLE` | None (`Sub-10 pt movement = Stable`) | ✅ **100% Match** |
| **Case 4: `LS15_0032`** | Adilabad (St) | 15LS (0.0) | N/A (1 term) | `INSUFFICIENT HISTORY` | None (`Single-term limitation notice`) | ✅ **100% Match** |

---

## 4. Verification Results

- **Backend Test Suite**: **72 / 72 passing (100%)** (`pytest -v` in 24.02s).
- **Frontend Production Build**: **PASS** (`npm run build` compiled cleanly into `dist/` with 0 errors).
- **Live Browser Session**: Verified interactive rendering of `ESCALATING`, `IMPROVING`, `STABLE`, and `INSUFFICIENT HISTORY` cases in Chromium browser session with 0 console errors.
- **Model A Immutability**:
  - Formulas, weights (35, 25, 20, 10, 10), and thresholds (<25, 25–49.9, 50–74.9, ≥75) 100% frozen.
  - Production risk distribution: 96 High, 413 Medium, 1,166 Low, 0 Critical (Total = 1,675) 100% preserved.
- **Production Database Integrity**:
  - Exactly 1,675 authentic records, 1,015 districts, 0 orphan records, 0 synthetic records in `mplads.db`.

---

## 5. Claim Safety & Responsible AI Compliance

- **Non-Predictive Disclaimer**:
  > *"Historical empirical trajectory based on observed Lok Sabha parliamentary terms. Not a predictive future forecast."*
- **Standing Platform Disclaimer**:
  > *"Risk indicators are analytical signals intended to support review. They do not constitute proof of wrongdoing."*
- **Zero Hallucination / Zero Future Extrapolation**:
  - No synthetic intermediate points.
  - No probability scores or pseudo-completion estimates.
  - All signals explain exactly *why* they were generated from observable historical session changes.
