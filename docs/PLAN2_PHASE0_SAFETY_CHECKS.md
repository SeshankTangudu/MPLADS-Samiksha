# Plan 2 Phase 0 — Pre-Implementation Safety Checks Audit Report

- **Document Version**: 1.0.0
- **Status**: ✅ **SAFETY CHECKS COMPLETE & VERIFIED**
- **Date**: September 2026
- **Auditor**: Lead System Architect, ML Governance Specialist & Data Integrity Reviewer

---

## 1. Executive Summary & Safety Invariants

This audit reconciles core architectural boundaries and empirical data availability across the MPLADS Samiksha platform before continuing roadmap execution.

### Strict Safety Invariants Upheld:
- **Zero Modifications to Model A**: Risk weights (Financial=35, Timeline=25, Data Quality=20, Geographic=10, Duplicate=10) and risk tier cutoffs (<25, 25–49.9, 50–74.9, ≥75) remain **100% frozen**.
- **Zero Synthetic Production Records**: Production database `data/processed/mplads.db` contains exactly 1,675 authentic records.
- **Zero Schema Alterations**: No fabricated fields or external scraped data added.

---

## 2. Check 1 — Critical-Tier Reachability Audit

### Mathematical Formula:
$$\text{Composite Risk Score} = \min(100.0, S_{\text{FIN}} + S_{\text{TIM}} + S_{\text{DQ}} + S_{\text{GEO}} + S_{\text{DUP}})$$

Where component weights are bounded as:
- **Financial ($S_{\text{FIN}}$)**: $0.0 \le S_{\text{FIN}} \le 35.0$
- **Timeline ($S_{\text{TIM}}$)**: $0.0 \le S_{\text{TIM}} \le 25.0$
- **Data Quality ($S_{\text{DQ}}$)**: $0.0 \le S_{\text{DQ}} \le 20.0$ (capped at 20.0, 5 pts per flag)
- **Geographic ($S_{\text{GEO}}$)**: $0.0 \le S_{\text{GEO}} \le 10.0$
- **Duplicate ($S_{\text{DUP}}$)**: $0.0 \le S_{\text{DUP}} \le 10.0$

### Audit Findings:
1. **Theoretical Maximum Possible Score**: **100.0 / 100** (when all 5 risk dimensions reach their upper bounds).
2. **Current Production Maximum Observed Score**: **63.0 / 100** (Observed in records `LS16_0408` and `LS16_0433`, with $S_{\text{FIN}} = 35.0$, $S_{\text{TIM}} = 18.0$, $S_{\text{DQ}} = 10.0$, $S_{\text{GEO}} = 0.0$).
3. **Critical Tier ($\ge 75.0$) Reachability**: **MATHEMATICALLY REACHABLE**.
   - When an allocation accumulates multi-dimensional anomalies (e.g. extreme expenditure deviation + historical prior-term retention + multiple data quality/administrative notations + geographic density), the score reaches $\ge 75.0$.
4. **Purely In-Memory / Test-Only Example Combination**:
   - $S_{\text{FIN}} = 35.0$ (Reported expenditure $\ge P90$ cohort threshold)
   - $S_{\text{TIM}} = 22.0$ (Active historical 15th Lok Sabha allocation)
   - $S_{\text{DQ}} = 15.0$ (Audit Certificate Pending [+5], MPR Pending [+5], Negative Unspent [+5])
   - $S_{\text{GEO}} = 10.0$ (Spatial concentration flag)
   - **Composite Score**: $35.0 + 22.0 + 15.0 + 10.0 = \mathbf{82.0} \ge 75.0 \rightarrow \text{Critical Tier}$.

### Current Production Distribution:
- **Low Risk (<25.0)**: 1,166 (69.61%)
- **Medium Risk (25.0–49.9)**: 413 (24.66%)
- **High Risk (50.0–74.9)**: 96 (5.73%)
- **Critical Risk ($\ge 75.0$)**: 0 (0.00%)
- **Total Validated Allocations**: **1,675**

---

## 3. Check 2 — Release Date / Vendor / Payment Field Audit

An exhaustive inspection was conducted across all raw CSV files in `data/raw/` and `data/reference/`.

### Source Files Inspected:
1. `data/raw/mplads_15th_lok_sabha_spending.csv` (549 records, 20 columns)
2. `data/raw/mplads_16th_lok_sabha_spending.csv` (569 records, 20 columns)
3. `data/raw/mplads_17th_lok_sabha_spending.csv` (557 records, 11 columns)
4. `data/raw/mplads_rajya_sabha_spending_2022.csv` (238 records, 17 columns)
5. `data/reference/centroids.csv` (1,015 records, 6 columns)

### Detailed Field Availability Findings:

| Field Category | Column Name | Source File | Populated Count | Nature / Granularity | Production Analytics Usability |
| :--- | :--- | :--- | :---: | :--- | :--- |
| **Fund Release Date** | `LastReleaseDate` | `mplads_15th_lok_sabha_spending.csv` | 549 / 549 | Aggregate GoI Installment Date (DD-MM-YYYY) | Usable as administrative sanction/release milestone proxy |
| **Fund Release Date** | `LastReleaseDate` | `mplads_16th_lok_sabha_spending.csv` | 569 / 569 | Aggregate GoI Installment Date (DD-MM-YYYY) | Usable as administrative sanction/release milestone proxy |
| **Fund Release Date** | *(None)* | `mplads_17th_lok_sabha_spending.csv` | 0 / 557 | Absent in 17th LS dataset | Not available for 17th LS |
| **Release Amount** | `TotalGOIRelease_crore`, `LastRelAmount_crore` | `mplads_15th_lok_sabha_spending.csv`, `mplads_16th_lok_sabha_spending.csv` | 1,118 / 1,118 | Aggregate GoI Fund Releases to District Authority | Usable for fund release vs entitlement analysis |
| **Release Amount** | `FundReceivedGOI` | `mplads_17th_lok_sabha_spending.csv` | 557 / 557 | Aggregate Cumulative Release from GoI | Usable for fund release vs entitlement analysis |
| **Vendor / Contractor** | *(None)* | All raw datasets | 0 / 1,675 | **ABSENT** | **Cannot support contractor/vendor analytics** |
| **Itemized Invoices** | *(None)* | All raw datasets | 0 / 1,675 | **ABSENT** | **Cannot support invoice-level tracking** |
| **Payment Ledger** | *(None)* | All raw datasets | 0 / 1,675 | **ABSENT** | **Cannot support transactional ledger reconciliation** |

### Definitive Conclusion on Check 2:
- **Release Dates**: `LastReleaseDate` exists in the 15th and 16th Lok Sabha datasets as an **aggregate central installment release date** to district nodal authorities. It is NOT present in the 17th Lok Sabha dataset.
- **Vendor / Contractor / Invoices**: **No vendor, contractor, supplier, invoice, or payment ledger fields exist anywhere in the official MoSPI/OpenCity open datasets.**
- MoSPI publishes aggregate parliamentary constituency allocations, not civil contractor payment vouchers.

---

## 4. Production Database & Regression Verification

- `projects`: **1,675** authentic records
- `risk_scores`: **1,675**
- `risk_flags`: **1,067**
- `districts`: **1,015**
- `orphan_scores`: **0**
- `orphan_flags`: **0**
- `synthetic_records_in_db`: **0**
- `Model A Distribution`: **96 High, 413 Medium, 1,166 Low, 0 Critical (Total = 1,675)**

---

## 5. Platform Governance & Transparent Disclaimers

1. **No Vendor Ledger Fabrication**: The platform will not fabricate contractor identities or payment voucher ledgers that do not exist in authentic government open data.
2. **Financial Utilization Proxy**: Financial utilization is explicitly documented as reported fund deployment relative to approved budget, not physical civil milestone progress.
3. **Analytical Review Indicators**: All risk scores and reason flags are decision-support indicators and do not constitute proof of wrongdoing.
