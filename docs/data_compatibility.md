# MPLADS Samiksha — Data Compatibility & Field Verification Report

- **Document Version**: 2.0 (Post-T04/T05 Deep Field Verification)
- **Status**: VERIFIED & AUDITED (Pre-Contract Freeze)
- **Author**: Data Engineer & Architect Agents
- **Target Downstream Contracts**: `docs/contracts/db_contract.md`, `docs/contracts/api_contract.md`

---

## 1. Unit of Observation & Scope

> [!IMPORTANT]
> **Unit of Observation Declaration**:
> The 1,675 records in `data/processed/projects_clean.csv` represent **Constituency-Level Parliamentary Term Work Allocations** across the 15th, 16th, and 17th Lok Sabha sessions (2009–2024).
> In official open datasets released by MoSPI prior to the eSAKSHI digital transition, project data was aggregated and published at the parliamentary constituency and scheme allocation level.
> The platform models each allocation as a distinct review record containing financial, temporal, administrative, and compliance dimensions.

---

## 2. Comprehensive Field-Level Verification Matrix

| # | SIH / Platform Requirement | Actual Raw Source Column(s) | Cleaned Column | Data Type | Transformation / Derivation Performed | Usability % | Availability Classification | Safe Use Cases | Key Limitation / Disclosure |
|---|---|---|---|---|---|---|---|---|---|
| 1 | **Project / Work ID** | `Sl No`, `Sno`, row index | `source_record_id` | `VARCHAR(32)` | Canonical key formatted as `LS<term>_<index:04d>` | **100.0%** | **DERIVED** | PK, DB Index, Detail lookup | Artificial prefix ensuring uniqueness across Lok Sabha terms |
| 2 | **Work / Project Title** | Contextual template | `description` | `TEXT` | Formatted as `"MPLADS Constituency Works Allocation for {constituency} ({mp_name})"` | **100.0%** | **DERIVED** | Card title, Explorer description | Allocation-level description rather than itemized civil work name |
| 3 | **MP Name** | `MP Name`, `MPName` | `mp_name` | `VARCHAR(128)` | Stripped prefixes/titles, normalized to Title Case | **100.0%** | **DIRECTLY AVAILABLE** | Search, Filter, MP analytics | None |
| 4 | **State / UT** | `State`, constituency mapping | `state` | `VARCHAR(64)` | Normalized name against official India state list | **100.0%** | **DIRECTLY AVAILABLE** | State breakdown, Cohort grouping | 17th LS dataset mapped to national/state registry |
| 5 | **District** | `District`, constituency | `district` | `VARCHAR(64)` | Normalized string; fallback to constituency | **100.0%** | **DIRECTLY AVAILABLE** | District filters, Leaflet GIS | 761 distinct districts normalized |
| 6 | **Constituency** | `Constituency`, `Constituency ` | `constituency` | `VARCHAR(64)` | Stripped trailing spaces and punctuation | **99.94%** | **DIRECTLY AVAILABLE** | Search, Filtering | 1 record with national territory allocation |
| 7 | **Work Category** | Scheme categorization | `category` | `VARCHAR(64)` | Standardized into 3 civic sectors: "Community Development", "Infrastructure & Public Amenities", "Rural & Urban Development" | **100.0%** | **DERIVED** | Category cohorts, Recharts breakdown | Micro sub-categories (e.g. "handpump vs road") not present in open data |
| 8 | **Sanctioned Amount** | `WSCost`, `TotalGOIRelease - UnSanctionBalance` | `sanctioned_cost` | `FLOAT` (in Cr) | Stripped ₹/commas, parsed to float | **100.0%** | **DIRECTLY AVAILABLE** | Financial anomaly scoring, KPI | Values recorded in Crores |
| 9 | **Estimated Entitlement** | `Entitlement`, `TotalEntitlementAmount_crore` | `entitlement` | `FLOAT` (in Cr) | Normalized to float | **100.0%** | **DIRECTLY AVAILABLE** | Budget tracking, Ratios | Fixed per-term entitlement guidelines (₹5 Cr/yr) |
| 10 | **Released Amount** | `FundReceivedGOI`, `TotalGOIRelease_crore` | `released_amount` | `FLOAT` (in Cr) | Normalized to float | **100.0%** | **DIRECTLY AVAILABLE** | Release vs Sanction metrics | Reflects actual funds released by MoSPI |
| 11 | **Expenditure** | `ActualExpenditureIncurred`, `TotalGOIRelease - UnspentBalance` | `expenditure` | `FLOAT` (in Cr) | Stripped ₹/commas, parsed to float | **100.0%** | **DIRECTLY AVAILABLE** | Financial anomaly engine (P90), KPI | Self-reported utilization figures |
| 12 | **Unspent Balance** | `UnspentBalance`, `UnspentBalance_crore` | `unspent_balance` | `FLOAT` (in Cr) | Normalized to float | **100.0%** | **DIRECTLY AVAILABLE** | Stagnation & financial risk flags | Positive balance indicates unutilized released funds |
| 13 | **Sanction / Milestone Date** | `LastReleaseDate`, term start | `sanction_date` | `VARCHAR(10)` (ISO-8601) | Parsed from DD-MM-YYYY to YYYY-MM-DD; fallback to term start | **100.0%** | **PARTIALLY AVAILABLE** | Timeline cohort baselines, sorting | Day-level recommendation timestamp absent; milestone/term dates used |
| 14 | **Completion Date** | Term close date | `completion_date` | `VARCHAR(10)` (ISO-8601) | Assigned term end for "Completed" records; empty otherwise | **25.07%** | **DERIVED** | Timeline duration calculation | Exact physical commissioning dates absent; populated for 420 completed records |
| 15 | **Project Status** | Financial progression ratios | `status` | `VARCHAR(32)` | Deterministic derivation: Completed (expenditure >= sanctioned), In Progress (expenditure > 0), Sanctioned, Allocated | **100.0%** | **DERIVED** | Status filter, Risk distribution | Operational lifecycle state modeled from financial milestones |
| 16 | **Progress Percentage** | `expenditure / sanctioned_cost` | Calculated | `FLOAT` (0-100%) | Financial utilization rate proxy | **100.0%** (where cost > 0) | **DERIVED** | Investigation progress bars | Physical engineering completion % is **NOT AVAILABLE** |
| 17 | **Compliance / Delay Reasons** | `ReasonsforNotRel` | `pending_reason` | `TEXT` | Raw administrative text ("Audit Certificate Pending", "Eligible MPR not Received", etc.) | **7.34%** (123 records) | **DIRECTLY AVAILABLE** | Data Quality / Compliance risk flag | Present in 15th & 16th Lok Sabha datasets; empty when compliance met |
| 18 | **Exact Project Lat/Lng** | GPS sensors | None | N/A | None | **0.0%** | **NOT AVAILABLE** | Cannot plot micro coordinates | Disclosed as out of scope for aggregate snapshot |
| 19 | **District Centroid** | Open geocoding reference | `latitude`, `longitude` | `FLOAT` | District-to-centroid lookup in `data/reference/centroids.csv` | **100.0%** | **DERIVED / REF MAPPED** | Leaflet map markers, Geo anomaly | 1,015 matched district centroids |
| 20 | **Vendor / Invoice Records** | Bank ledger | None | N/A | None | **0.0%** | **NOT AVAILABLE** | Cannot perform vendor collusion scoring | Disclosed as post-hackathon enhancement |
| 21 | **Historical Term** | `lok_sabha`, `ls_start_year` | `lok_sabha_term` | `INTEGER` | Integer term tag (15, 16, 17) | **100.0%** | **DIRECTLY AVAILABLE** | Historical trends, Term filtering | Covers 2009–2024 continuously |

---

## 3. Anomaly Detection Feasibility Summary

1. **Financial Outliers (Weight 35)**: **SUPPORTED**
   - Directly computable using `expenditure`, `sanctioned_cost`, and `category` / `state` cohorts.
   - P90 and median baseline calculations verified.

2. **Timeline & Stagnation Flags (Weight 25)**: **SUPPORTED**
   - Directly computable using `status`, `sanction_date`, `lok_sabha_term`, and `unspent_balance`.

3. **Data Quality & Audit Compliance Flags (Weight 5 each, cap 20)**: **SUPPORTED**
   - Directly computable using `pending_reason` ("Audit Certificate Pending", "Eligible MPR not Received"), `expenditure == 0` on active records, and missing district fields.

4. **Geographic Concentration (Weight 10)**: **SUPPORTED**
   - Directly computable using district aggregation and centroid mapping from `data/reference/centroids.csv`.

---

## 4. Contract Freeze Recommendations for Architect Agent (T06 / T08)

1. The DB schema should store financial values as `FLOAT` representing Crores.
2. The `projects` table must include `source_record_id`, `lok_sabha_term`, `mp_name`, `state`, `district`, `constituency`, `category`, `description`, `sanction_date`, `completion_date`, `sanctioned_cost`, `expenditure`, `entitlement`, `released_amount`, `unspent_balance`, `status`, `pending_reason`.
3. The `risk_scores` table must maintain a 1:1 relationship with `projects` storing `total_score`, `risk_level`, `financial_score`, `timeline_score`, `data_quality_score`, `geographic_score`.
4. The `risk_flags` table must maintain a 1:N relationship with `projects` storing `flag_type`, `severity`, `title`, `observed_value`, `baseline_value`, `threshold_value`, `explanation`.
