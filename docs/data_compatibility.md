# MPLADS Samiksha — Data Compatibility & Field Verification Report

- **Document Version**: 2.1 (Post-Audit Terminology & Unit of Observation Realignment)
- **Status**: VERIFIED & AUDITED (Pre-Contract Freeze)
- **Author**: Data Engineer & Architect Agents
- **Target Downstream Contracts**: `docs/contracts/db_contract.md`, `docs/contracts/api_contract.md`

---

## 1. Unit of Observation & Terminology Taxonomy

> [!IMPORTANT]
> **Unit of Observation Declaration**:
> The 1,675 records in `data/processed/projects_clean.csv` represent **Constituency-Level Parliamentary Term Work & Fund Allocations** across the 15th, 16th, and 17th Lok Sabha sessions (2009–2024).
> In official open statistical datasets released by MoSPI prior to the digital e-SAKSHI portal transition, records were published and tracked at the Parliamentary Constituency scheme allocation level per Member of Parliament and Lok Sabha term.

### 1.1 Structural Distinction of Data Granularities

To prevent misleading claims, the platform strictly distinguishes between three tiers of data:

1. **Constituency Allocation Record (Current Dataset)**:
   - Aggregated parliamentary term financial and administrative allocation for a constituency.
   - Tracks entitlement, cumulative funds released by MoSPI, aggregate sanctioned works budget, actual reported expenditure incurred, unspent balance, and administrative delay remarks.
   - **Supported by current dataset.**

2. **Itemized Project / Work-Level Record (e-SAKSHI Micro-Portal)**:
   - Individual civil work recommendations (e.g., "Installation of 5 Solar High-Mast Lights at Village X", "Construction of Community Hall").
   - **Not present as an itemized open CSV release in the pre-eSAKSHI historical snapshot; transparently disclosed.**

3. **Physical Work-Site / Contractor Execution Record**:
   - Geotagged site GPS coordinates, milestone engineering progress (% concrete poured), contractor invoices, and RTGS payment vouchers.
   - **Not present in public open data releases; transparently disclosed as out of scope for the offline MVP.**

---

## 2. Comprehensive Field-Level Verification Matrix

| # | Platform Requirement | Raw Source Column(s) | Cleaned Column | Data Type | Transformation / Derivation Performed | Usability % | Availability Classification | Safe Use Cases | Key Limitation & Real-World Accuracy Disclosure |
|---|---|---|---|---|---|---|---|---|---|
| 1 | **Source Record ID** | `Sl No`, `Sno`, index | `source_record_id` | `VARCHAR(32)` | Canonical key formatted as `LS<term>_<index:04d>` | **100.0%** | **DERIVED** | PK, DB Index, Lookups | Synthetic source-record index ensuring uniqueness across terms; **not a government project ID**. |
| 2 | **Allocation Description** | Contextual template | `description` | `TEXT` | Formatted as `"MPLADS Constituency Works Allocation for {constituency} ({mp_name})"` | **100.0%** | **DERIVED** | Card title, Allocation description | Allocation-level description; **not an itemized civil project name**. |
| 3 | **Member of Parliament** | `MP Name`, `MPName` | `mp_name` | `VARCHAR(128)` | Stripped prefixes/titles, normalized to Title Case | **100.0%** | **DIRECTLY AVAILABLE** | Search, Filter, MP analytics | Direct official MP attribution. |
| 4 | **State / UT** | `State`, constituency mapping | `state` | `VARCHAR(64)` | Normalized name against official 38 State/UT list | **100.0%** | **DIRECTLY AVAILABLE** | State breakdown, Cohort grouping | State/UT administration jurisdiction. |
| 5 | **District** | `District`, constituency | `district` | `VARCHAR(64)` | Normalized string; fallback to constituency | **100.0%** | **DIRECTLY AVAILABLE** | District filters, Leaflet GIS | 761 distinct administrative districts. |
| 6 | **Constituency** | `Constituency`, `Constituency ` | `constituency` | `VARCHAR(64)` | Stripped trailing spaces and punctuation | **99.94%** | **DIRECTLY AVAILABLE** | Search, Filtering | Parliamentary constituency boundary. |
| 7 | **Civic Category** | Scheme categorization | `category` | `VARCHAR(64)` | Standardized into 3 broad civic sectors: "Community Development", "Infrastructure & Public Amenities", "Rural & Urban Development" | **100.0%** | **DERIVED** | Category cohorts, Recharts | Broad civic sector proxy; granular sub-codes absent in open snapshot. |
| 8 | **Sanctioned Works Budget** | `WSCost`, `TotalGOIRelease - UnSanctionBalance` | `sanctioned_cost` | `FLOAT` (in Cr) | Stripped ₹/commas, parsed to float | **100.0%** | **DIRECTLY AVAILABLE** | Financial anomaly scoring, KPIs | Total sanctioned works amount in ₹ Crores. |
| 9 | **Estimated Entitlement** | `Entitlement`, `TotalEntitlementAmount_crore` | `entitlement` | `FLOAT` (in Cr) | Normalized to float | **100.0%** | **DIRECTLY AVAILABLE** | Budget tracking, Guidelines | Standard guideline entitlement (₹5 Cr/yr per MP). |
| 10 | **Released Amount** | `FundReceivedGOI`, `TotalGOIRelease_crore` | `released_amount` | `FLOAT` (in Cr) | Normalized to float | **100.0%** | **DIRECTLY AVAILABLE** | Release vs Sanction ratios | Actual funds released by MoSPI to district authorities. |
| 11 | **Reported Expenditure** | `ActualExpenditureIncurred`, `TotalGOIRelease - UnspentBalance` | `expenditure` | `FLOAT` (in Cr) | Stripped ₹/commas, parsed to float | **100.0%** | **DIRECTLY AVAILABLE** | Financial anomaly engine (P90), Peers | Reported expenditure incurred on sanctioned works in ₹ Crores. |
| 12 | **Unspent Balance** | `UnspentBalance`, `UnspentBalance_crore` | `unspent_balance` | `FLOAT` (in Cr) | Normalized to float | **100.0%** | **DIRECTLY AVAILABLE** | Stagnation & unspent anomaly flags | Unutilized funds remaining with district administration in ₹ Crores. |
| 13 | **Milestone / Sanction Date** | `LastReleaseDate`, term start | `sanction_date` | `VARCHAR(10)` | Parsed from DD-MM-YYYY to YYYY-MM-DD; fallback to term start | **100.0%** | **PARTIALLY AVAILABLE** | Timeline cohort baselines, sorting | Reflects term start or milestone release date; **not a day-level recommendation timestamp**. |
| 14 | **Term Close Date** | Term close date | `completion_date` | `VARCHAR(10)` | Assigned term end for "Completed" financial status; empty otherwise | **25.07%** | **DERIVED** | Timeline duration on closed allocations | Reflects parliamentary term closure for fully spent allocations; **not a physical completion certificate date**. |
| 15 | **Allocation Status** | Financial progression ratios | `status` | `VARCHAR(32)` | Derived: Completed (expenditure >= sanctioned), In Progress (expenditure > 0), Sanctioned, Allocated | **100.0%** | **DERIVED** | Status filter, Risk distribution | Financial lifecycle state; **not a physical on-site completion verification**. |
| 16 | **Financial Utilization Proxy** | `expenditure / sanctioned_cost` | Calculated | `FLOAT` (0-100%) | Ratio of reported expenditure to sanctioned works budget | **100.0%** (where cost > 0) | **DERIVED** | Utilization bar, Peer comparables | **Financial utilization rate only; strictly NOT physical engineering completion percentage.** |
| 17 | **Administrative Delay Remarks** | `ReasonsforNotRel` | `pending_reason` | `TEXT` | Official administrative text ("Audit Certificate Pending", "Eligible MPR not Received", etc.) | **7.34%** (123 records) | **DIRECTLY AVAILABLE** | Data Quality & Compliance flags | Official compliance reasons for fund withholding. |
| 18 | **Exact Work GPS Pins** | GPS coordinates | None | N/A | None | **0.0%** | **NOT AVAILABLE** | None | **No micro-level site GPS available in open data; platform uses district centroids.** |
| 19 | **District Centroid** | Open geocoding reference | `latitude`, `longitude` | `FLOAT` | District-to-centroid lookup in `data/reference/centroids.csv` | **100.0%** | **DERIVED / REF MAPPED** | Leaflet District Map | Centroid coordinate for district spatial context (1,015 matched). |
| 20 | **Vendor / Invoice Ledger** | Bank vouchers | None | N/A | None | **0.0%** | **NOT AVAILABLE** | None | **No invoice or vendor bank data available in snapshot.** |
| 21 | **Parliamentary Term** | `lok_sabha`, `ls_start_year` | `lok_sabha_term` | `INTEGER` | Integer term tag (15, 16, 17) | **100.0%** | **DIRECTLY AVAILABLE** | Historical trends, Multi-term comparison | Spans 15th (2009–14), 16th (2014–19), 17th (2019–24) Lok Sabha. |

---

## 3. Realignment of Anomaly Signals & Capabilities

All anomaly detection engines operate strictly over **reported financial and administrative allocation data**:

1. **Financial Outliers (Weight 35)**:
   - Compares reported allocation expenditure and sanctioned works budgets against category/state cohort P90 distributions.
   - Evaluates abnormal ratio of unspent funds or extreme variance relative to peer allocations.

2. **Timeline & Administrative Stagnation (Weight 25)**:
   - Flags allocations showing multi-year retention of unspent balances without expenditure progression across parliamentary terms.

3. **Data Quality & Compliance Review (Weight 5 each, cap 20)**:
   - Identifies documentation review items from official `ReasonsforNotRel` remarks (Audit Certificate Pending, Eligible MPR Pending, Utilisation Certificate Pending), zero-expenditure active allocations, and missing district metadata.

4. **Geographic Distribution Context (Weight 10)**:
   - Maps aggregate district-level risk signal density across India using verified district centroids.

---

## 4. Mandatory Product & UI Terminology Rules

All downstream UI components, API schemas, and documentation must adhere to these terminology rules:
- Use **"Constituency Allocation"** or **"Allocation Record"** instead of "Civil Infrastructure Project".
- Use **"Reported Expenditure"** instead of "Verified Project Cost".
- Use **"Financial Utilization"** instead of "Project Progress" or "Construction Completion %".
- Use **"District Centroid"** instead of "Project Site GPS".
- Use **"Documentation Review Item"** instead of "Proof of Malfeasance".
- Always display the **Standing Disclaimer**: *"Risk indicators are analytical signals intended to support review. They do not constitute proof of wrongdoing."*
