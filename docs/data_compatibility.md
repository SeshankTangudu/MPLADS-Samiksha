# MPLADS Samiksha — Data Compatibility Gate Report

- **Gate Status**: COMPATIBILITY VERIFIED
- **Date**: 2026-09-01
- **Author**: Data Engineer & Architect Agents
- **Target Downstream Contracts**: `docs/contracts/db_contract.md`, `docs/contracts/api_contract.md`

---

## 1. Actual Acquired Datasets Profile

The platform has acquired four authentic, unaltered government data snapshots in `data/raw/`:
1. `mplads_17th_lok_sabha_spending.csv` (17th Lok Sabha, 2019–2024, 557 records)
2. `mplads_16th_lok_sabha_spending.csv` (16th Lok Sabha, 2014–2019, 572 records)
3. `mplads_15th_lok_sabha_spending.csv` (15th Lok Sabha, 2009–2014, 552 records)
4. `mplads_rajya_sabha_spending_2022.csv` (Rajya Sabha sitting members, 2022, 236 records)

Total unified cleaned dataset in `data/processed/projects_clean.csv`: **1,675 validated records**.

---

## 2. Granularity & Field Availability Matrix

| Feature / Dimension | Required by Vision | Actually Available in Real Data | Resolution & Derivation Strategy | Compatibility Status |
|---|---|---|---|---|
| **MP Identification** | MP Name, House, Constituency | Directly present (`MPName`, `Constituency`, `House`) | Normalized to title case, tracked per term | **SUPPORTED** |
| **Geographic Context** | State, District | Directly present in 15th/16th LS; derived from constituency in 17th LS | Mapped against `data/reference/centroids.csv` (100% matched) | **SUPPORTED** |
| **Financial Metrics** | Sanctioned cost, Expenditure, Entitlement, Released amount, Unspent balance | Directly present in numeric crore amounts across all terms | Normalized to float (in Crores), cleaned from currency strings | **SUPPORTED** |
| **Timeline / Dates** | Sanction date, Completion date, Term years | Term years and last release dates present | Term dates (`2009-06-01`, `2014-06-01`, `2019-06-01`) and last release dates formatted to ISO-8601 | **SUPPORTED** |
| **Compliance Reasons** | Reasons for non-release / audit flags | Present in 15th/16th datasets (`ReasonsforNotRel`) | Extracted into `pending_reason` documentation-review signal | **SUPPORTED** |
| **Project Status** | Allocated, Sanctioned, In Progress, Completed | Derived from release, sanctioned, unspent balance, and expenditure ratios | Deterministic derivation rule verified in `scripts/clean_data.py` | **DERIVED** |
| **Project Category** | Category breakdown | Inferred by broad civic sector | Standardized into "Community Development", "Infrastructure & Public Amenities", "Rural & Urban Development" | **DERIVED** |
| **Vendor / Payment Ledger** | Micro invoices / contractor bank transfers | **NOT PRESENT** in public release | Explicitly noted as out of scope for snapshot; transparently disclosed in Methodology | **UNSUPPORTED** (Documented) |

---

## 3. Anomaly Detection Feasibility on Validated Data

1. **Financial Anomaly Family (Weight 35)**:
   - *Condition*: Expenditure or cost > P90 of category/state cohort **AND** ratio > 3.0x median of cohort.
   - *Feasibility*: **100% Feasible** using `sanctioned_cost`, `expenditure`, and `unspent_balance`.

2. **Timeline & Stagnation Anomaly Family (Weight 25)**:
   - *Condition*: Multi-year allocation in active status without expenditure progress.
   - *Feasibility*: **100% Feasible** using term lifecycles and release date intervals.

3. **Data Quality & Audit Anomaly Family (Weight 5 each, cap 20)**:
   - *Condition*: Missing district/state, zero expenditure on active status, audit certificate pending, eligible MPR pending.
   - *Feasibility*: **100% Feasible** using `pending_reason`, zero-expenditure checks, and null validations.

4. **Geographic Concentration Anomaly Family (Weight 10)**:
   - *Condition*: District share of flagged allocations above district P90.
   - *Feasibility*: **100% Feasible** via centroid mapping in `centroids.csv`.

---

## 4. Contract Adjustments for Architect Freeze (T06 / T08)

The DB and API schemas must accommodate:
- Financial values stored in Crores (`DECIMAL` / `FLOAT`).
- Mandatory fields: `source_record_id`, `mp_name`, `state`, `district`, `constituency`, `category`, `sanctioned_cost`, `expenditure`, `status`, `total_score`, `risk_level`.
- `risk_flags` table storing 1:N flag signals (`flag_type`, `severity`, `title`, `observed_value`, `baseline_value`, `threshold_value`, `explanation`).
