# Plan 1 — Source Field & Data Boundary Audit

**Document Version**: 1.0.0  
**Phase**: Phase 0.2 Safety Check  
**Author**: Lead System Architect & Data Engineer  
**Inspection Date**: September 2026  

---

## 1. Source Datasets Inspected

1. `data/raw/mplads_17th_lok_sabha_spending.csv` (557 rows)
2. `data/raw/mplads_16th_lok_sabha_spending.csv` (572 rows)
3. `data/raw/mplads_15th_lok_sabha_spending.csv` (552 rows)
4. `data/raw/mplads_rajya_sabha_spending_2022.csv` (236 rows)
5. `data/processed/projects_clean.csv` (1,675 unified rows)
6. `data/reference/centroids.csv` (1,015 matched administrative district centroids)

---

## 2. Field Audit Findings

### 2.1 Confirmed Available Fields in Authentic Source Data
- **Member of Parliament**: `mp_name` (100% available across terms).
- **Constituency / District / State**: `constituency`, `district`, `state` (100% normalized).
- **Parliamentary Term**: `lok_sabha_term` (15, 16, 17).
- **Sanctioned Works Budget**: `sanctioned_cost` (₹ Crores, directly extracted from `WSCost` / GOI Release minus unsanctioned balance).
- **Reported Expenditure**: `expenditure` (₹ Crores, directly extracted from `ActualExpenditureIncurred`).
- **Cumulative Government Release**: `released_amount` (₹ Crores, extracted from `FundReceivedGOI`).
- **Guideline Entitlement**: `entitlement` (₹ Crores, standard ₹5 Cr/yr baseline).
- **Unspent Fund Balance**: `unspent_balance` (₹ Crores, extracted from official `UnspentBalance`).
- **Milestone Sanction / Release Date**: `sanction_date` (YYYY-MM-DD format parsed from term start / milestone release dates).
- **Administrative Delay Remarks**: `pending_reason` (Extracted from official `ReasonsforNotRel` text notes across 123 records).
- **Administrative District Centroid Coordinates**: `latitude`, `longitude` (Mapped from `data/reference/centroids.csv` across 1,015 districts).

---

### 2.2 Fields Confirmed NOT Present in Authentic Source Data
- **Transaction-Level Payment Identifiers**: No RTGS transaction references, bank voucher numbers, or disbursement timestamp logs.
- **Contractor / Vendor Ledgers**: No contractor corporate names, vendor PAN/GSTIN numbers, or subcontractor ledgers.
- **Itemized Invoices / BOQ**: No itemized line-item invoices or unit cost sheets.
- **Physical Civil Construction Milestones**: No on-site engineering stage percentages (% foundation, % masonry, % slab).
- **Micro-Level Worksite GPS Coordinates**: No individual project-level physical GPS survey pins (district centroids used instead).

---

## 3. Legitimacy & Capability Feasibility Assessment

| Capability | Legitimate with Available Data? | Implementation Guidance |
| :--- | :---: | :--- |
| **Financial Anomaly Detection** | 🟢 **YES** | Legitimate over reported expenditure vs peer cohort quantile distributions. |
| **Timeline Stagnation Tracking** | 🟢 **YES** | Legitimate over multi-year active status and zero expenditure deployments. |
| **Administrative Compliance Flags** | 🟢 **YES** | Legitimate over official `ReasonsforNotRel` text remarks. |
| **Geospatial District Risk Density**| 🟢 **YES** | Legitimate over 1,015 verified district reference centroids. |
| **Payment / Invoice Intelligence** | 🔴 **NO (Data-Limited)** | Must be transparently disclosed as out of scope; do NOT fabricate fake payment ledgers. |
| **Physical Work Verification** | 🔴 **NO (Data-Limited)** | Must be framed strictly as **Financial Utilization Proxy**; do NOT claim physical progress. |
| **Predictive ML Time-Series** | 🟡 **DEFERRED** | Replaced with deterministic empirical quantile baselines to preserve explainability. |

---

## 4. Conclusion & Safety Declaration
- Zero synthetic fields or mock contractor records will be injected into production data.
- All downstream Plan 1 features will consume only the confirmed, authentic fields listed in Section 2.1.
