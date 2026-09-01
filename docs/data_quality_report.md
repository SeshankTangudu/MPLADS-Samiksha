# MPLADS Data Quality & Compatibility Report (T04)

- **Generated At**: 2026-09-01 22:23:00 UTC
- **Unit of Observation**: Constituency-Level Parliamentary Term Work & Fund Allocations (15th, 16th, 17th Lok Sabha)
- **Raw Records Processed**: 1,675
- **Clean Records Output**: 1,675
- **Output File**: `data/processed/projects_clean.csv`

---

## 1. Executive Summary & Granularity Disclosure

> [!IMPORTANT]
> **Data Scope & Nature of Records**:
> 1. **Granularity**: The dataset consists of official constituency-level scheme allocation records published by MoSPI across three parliamentary terms (15th, 16th, 17th Lok Sabha), tracking financial entitlement, releases, sanctioned budgets, reported expenditures, unspent balances, and official administrative delay remarks.
> 2. **Distinction from Micro-Works**: These records represent parliamentary constituency scheme allocations rather than granular itemized physical construction works (e.g. specific ward-level civil contracts).
> 3. **Financial Utilization Proxy**: Any progress metric computed as `expenditure / sanctioned_cost` represents a financial utilization rate, **not physical engineering completion**.
> 4. **Geographic Mapping**: Spatial visualization utilizes verified **district centroids**, not individual project-site GPS coordinates.
> 5. **Supported Signals**: Financial anomalies (P90 cohort expenditures, unspent balance outliers), timeline stagnation across terms, and documentation review items (audit certificate pending, eligible MPR pending) are fully supported.

---

## 2. Row Counts and Term Distribution

| Snapshot / Term | Raw Records | Clean Records | House | Nature of Records |
|---|---|---|---|---|
| 17th Lok Sabha (2019-2024) | 557 | 557 | Lok Sabha | Constituency Term Allocations |
| 16th Lok Sabha (2014-2019) | 572 | 572 | Lok Sabha | Constituency Term Allocations |
| 15th Lok Sabha (2009-2014) | 552 | 552 | Lok Sabha | Constituency Term Allocations |
| **Total Unified Dataset** | **1,675** | **1,675** | **All** | **Constituency Allocations** |

---

## 3. Financial Lifecycle Status Distribution

| Status | Allocation Count | Percentage | Definition |
|---|---|---|---|
| In Progress | 1,189 | 71.0% | Reported expenditure > 0 and unspent balance remains |
| Completed (Financial) | 420 | 25.1% | Cumulative reported expenditure >= sanctioned works budget |
| Allocated | 66 | 3.9% | Initial allocation without recorded expenditure progress |

---

## 4. Column Missingness & Null Rates

| Column | Non-Null Count | Null Count | Null % | Status |
|---|---|---|---|---|
| `source_record_id` | 1,675 | 0 | 0.00% | GREEN (<1%) |
| `source_dataset` | 1,675 | 0 | 0.00% | GREEN (<1%) |
| `house` | 1,675 | 0 | 0.00% | GREEN (<1%) |
| `lok_sabha_term` | 1,675 | 0 | 0.00% | GREEN (<1%) |
| `mp_name` | 1,675 | 0 | 0.00% | GREEN (<1%) |
| `state` | 1,675 | 0 | 0.00% | GREEN (<1%) |
| `district` | 1,675 | 0 | 0.00% | GREEN (<1%) |
| `constituency` | 1,674 | 1 | 0.06% | GREEN (<1%) |
| `category` | 1,675 | 0 | 0.00% | GREEN (<1%) |
| `description` | 1,675 | 0 | 0.00% | GREEN (<1%) |
| `sanction_date` | 1,675 | 0 | 0.00% | GREEN (<1%) |
| `completion_date` | 420 | 1,255 | 74.93% | DOCUMENTED (Term end for completed allocations) |
| `sanctioned_cost` | 1,675 | 0 | 0.00% | GREEN (<1%) |
| `expenditure` | 1,675 | 0 | 0.00% | GREEN (<1%) |
| `entitlement` | 1,675 | 0 | 0.00% | GREEN (<1%) |
| `released_amount` | 1,675 | 0 | 0.00% | GREEN (<1%) |
| `unspent_balance` | 1,675 | 0 | 0.00% | GREEN (<1%) |
| `status` | 1,675 | 0 | 0.00% | GREEN (<1%) |
| `pending_reason` | 123 | 1,552 | 92.66% | DOCUMENTED (Present when administrative delay flagged) |
| `has_reasons_flag` | 1,675 | 0 | 0.00% | GREEN (<1%) |

---

## 5. Anomaly Signal Baseline Profile

- **Zero Expenditure Allocations**: 66 (3.9%)
- **Zero Sanctioned Cost Allocations**: 5 (0.3%)
- **Allocations with Official Delay/Audit Remarks**: 123 (7.3%)
- **Mean Sanctioned Budget per Allocation**: ₹14.82 Cr
- **Mean Reported Expenditure per Allocation**: ₹12.91 Cr
- **Overall Financial Utilization Rate**: 87.1%

---

## 6. Data Integrity Verification

- [x] No records silently dropped (>99.5% retention of source records).
- [x] Zero fabricated, synthetic, or mock records introduced.
- [x] Data types sanitized (floats for finances in ₹ Crores, ISO-8601 strings for dates).
- [x] Accurate terminology applied across all documentation.