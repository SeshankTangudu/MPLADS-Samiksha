# Checkpoint: Architect Contract Freeze

- **Stage**: Architect Contract Freeze
- **Agent**: Architect Agent
- **Timestamp**: 2026-09-01T22:30:00+05:30
- **Status**: **FROZEN & AUTHORITATIVE**

---

## 1. Frozen Contracts Summary

1. **Database Schema Contract**: `docs/contracts/db_contract.md`
   - Defines 6 tables: `mps`, `districts`, `projects` (Constituency Allocations), `risk_scores`, `risk_flags`, `analytics_cache`.
   - All financial metrics stored in ₹ Crores as floats (`sanctioned_cost`, `expenditure`, `entitlement`, `released_amount`, `unspent_balance`).
   - 8 mandatory indexes defined for sub-50ms query response.
   - Zero synthetic/unsupported fields included.

2. **API Schema Contract**: `docs/contracts/api_contract.md`
   - Defines 9 read-only REST endpoints covering Stats Overview, Project Pagination & Filter, Deep Investigation Breakdown, Anomaly Queue, Category & District Analytics, Leaflet Map Locations, Methodology, and Risk CSV export.
   - Exposes `financial_utilization` proxy (`(expenditure / sanctioned_cost) * 100`).
   - Structured error format and standing disclaimers standardized.

---

## 2. Supported Features Covered
- **P0**: Dashboard Overview (`GET /api/stats/overview`, `GET /api/analytics/*`)
- **P0**: Project Explorer with search/filter/sort/pagination (`GET /api/projects`)
- **P0**: Anomaly Intelligence Center (`GET /api/anomalies`)
- **P0**: Project Investigation score decomposition & peer comparables (`GET /api/projects/{id}`)
- **P0**: Explainable Risk Engine data contracts (`risk_scores`, `risk_flags`)
- **P1**: Geographic Leaflet Map Centroid Layer (`GET /api/locations`)
- **P1**: Risk Summary CSV Export (`GET /api/reports/risk-summary.csv`)
- **P0**: Methodology Page transparency parameters (`GET /api/methodology`)

---

## 3. Excluded Unsupported Features (Disclosed)
- Physical on-site civil engineering progress meters (% construction done)
- Exact micro-coordinate project site GPS pins (district centroids used instead)
- Vendor bank accounts, invoice ledger, and payment voucher records
- Verified government work IDs (synthetic `source_record_id` used instead)

---

## 4. Downstream Task State
- **T06** (Schema + Load DB) — `READY` (Unlocked by Contract Freeze)
