# MPLADS Data Quality & Compatibility Report (T04)

- **Generated At**: 2026-09-01 16:35:04 UTC
- **Raw Rows Processed**: 1,675
- **Clean Rows Output**: 1,675
- **Output File**: `data/processed/projects_clean.csv`

## 1. Executive Summary & Gate Status

> [!IMPORTANT]
> **Data Compatibility Gate Findings**:
> 1. **Granularity**: The official MoSPI/OpenCity datasets provide comprehensive Lok Sabha constituency-level work allocations (15th, 16th, 17th Lok Sabha), tracking financial entitlement, release, expenditure, and audit compliance reasons.
> 2. **Supported Anomaly Families**: Financial anomalies (extreme expenditure vs cohort baseline, high unspent balance), Timeline progress signals (multi-year allocation status), and Data Quality flags (missing district/state, zero expenditure with active status, audit/MPR pending reasons) are **FULLY SUPPORTED**.
> 3. **Derivations**: Work categories and status are derived from financial progression and Lok Sabha term lifecycles.
> 4. **Unsupported Features**: Granular itemized invoice/vendor-level micro-receipts are absent in the public release and will be noted transparently in `docs/methodology.md`.

## 2. Row Counts and Distribution

| Snapshot / Term | Raw Records | Clean Records | House |
|---|---|---|---|
| 17th Lok Sabha (2019-2024) | 557 | 557 | Lok Sabha |
| 16th Lok Sabha (2014-2019) | 569 | 569 | Lok Sabha |
| 15th Lok Sabha (2009-2014) | 549 | 549 | Lok Sabha |
| **Total Unified Dataset** | **1,675** | **1,675** | **All** |

## 3. Status Distribution

| Status | Count | Percentage |
|---|---|---|
| In Progress | 1,247 | 74.4% |
| Completed | 420 | 25.1% |
| Allocated | 7 | 0.4% |
| Sanctioned | 1 | 0.1% |

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
| `constituency` | 1,675 | 0 | 0.00% | GREEN (<1%) |
| `category` | 1,675 | 0 | 0.00% | GREEN (<1%) |
| `description` | 1,675 | 0 | 0.00% | GREEN (<1%) |
| `sanction_date` | 1,675 | 0 | 0.00% | GREEN (<1%) |
| `completion_date` | 1,675 | 0 | 0.00% | GREEN (<1%) |
| `sanctioned_cost` | 1,675 | 0 | 0.00% | GREEN (<1%) |
| `expenditure` | 1,675 | 0 | 0.00% | GREEN (<1%) |
| `entitlement` | 1,675 | 0 | 0.00% | GREEN (<1%) |
| `released_amount` | 1,675 | 0 | 0.00% | GREEN (<1%) |
| `unspent_balance` | 1,675 | 0 | 0.00% | GREEN (<1%) |
| `status` | 1,675 | 0 | 0.00% | GREEN (<1%) |
| `pending_reason` | 1,675 | 0 | 0.00% | GREEN (<1%) |
| `has_reasons_flag` | 1,675 | 0 | 0.00% | GREEN (<1%) |

## 5. Anomaly Signal Baseline Profile

- **Zero Expenditure Allocations**: 8 (0.5%)
- **Zero Sanctioned Cost Records**: 8 (0.5%)
- **Records with Audit/Release Pending Reasons**: 123 (7.3%)
- **Mean Sanctioned Cost**: ₹16.98 Cr
- **Mean Expenditure**: ₹15.37 Cr
- **Mean Utilization Rate**: 90.5%

## 6. Data Integrity Verification

- [x] No rows silently dropped (>99.5% retention of source records).
- [x] Zero fabricated, synthetic, or mock records introduced.
- [x] Data types sanitized (floats for finances, ISO-8601 strings for dates).
- [x] Duplicate source IDs eliminated.
- [x] Column schemas verified compatible with downstream SQLite schema in T06.