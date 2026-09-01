# API Contract (FROZEN)

- **Version**: 1.0.0 (FROZEN)
- **Status**: **FROZEN & AUTHORITATIVE**
- **Effective Date**: 2026-09-01
- **Architect**: Architect Agent
- **Base URL**: `/api`
- **Protocol**: HTTP/1.1 JSON (Read-Only REST)
- **Unit of Observation**: Constituency-Level Parliamentary Term Work & Fund Allocations (15th, 16th, 17th Lok Sabha)

---

## 1. Global Conventions & Standards

1. **Read-Only API**: All mutation endpoints are disabled for MVP runtime stability.
2. **Standard Pagination Envelope**:
   ```json
   {
     "items": [],
     "total": 1675,
     "page": 1,
     "limit": 20,
     "total_pages": 84
   }
   ```
3. **Structured Error Format (HTTP 4xx / 5xx)**:
   ```json
   {
     "detail": "Descriptive error message",
     "code": "HTTP_404",
     "timestamp": "2026-09-01T22:30:00Z"
   }
   ```
4. **Standing Disclaimer Header**: Present on all JSON and CSV outputs.

---

## 2. Endpoint Specifications

### 2.1 `GET /api/stats/overview`
Returns macro portfolio KPIs, financial totals, and risk tier distribution across all 1,675 allocations.

**Response (200 OK)**:
```json
{
  "total_allocations": 1675,
  "total_mps": 1050,
  "total_districts": 761,
  "total_sanctioned_crore": 24823.50,
  "total_expenditure_crore": 21624.25,
  "total_unspent_crore": 3199.25,
  "overall_utilization_rate": 87.11,
  "risk_distribution": {
    "low": 1220,
    "medium": 380,
    "high": 65,
    "critical": 10
  },
  "flagged_rate_percentage": 4.48,
  "terms_covered": [15, 16, 17],
  "disclaimer": "Risk indicators are analytical signals intended to support review. They do not constitute proof of wrongdoing."
}
```

---

### 2.2 `GET /api/projects`
Search, filter, and paginate constituency allocation records.

**Query Parameters**:
- `page` (int, default: 1)
- `limit` (int, default: 20, max: 100)
- `search` (string, optional: matches MP name, constituency, district, ID)
- `state` (string, optional)
- `category` (string, optional)
- `status` (string, optional: `Allocated`, `Sanctioned`, `In Progress`, `Completed`)
- `risk_level` (string, optional: `Low`, `Medium`, `High`, `Critical`)
- `term` (int, optional: 15, 16, 17)
- `sort_by` (string, default: `total_score`, options: `total_score`, `expenditure`, `sanctioned_cost`, `unspent_balance`, `sanction_date`)
- `sort_order` (string, default: `desc`, options: `asc`, `desc`)

**Response (200 OK)**:
```json
{
  "items": [
    {
      "id": 1,
      "source_record_id": "LS17_0001",
      "mp_name": "Kuldeep Rai Sharma",
      "house": "Lok Sabha",
      "lok_sabha_term": 17,
      "state": "National / Multi-State",
      "district": "Andaman And Nicobar Islands",
      "constituency": "Andaman And Nicobar Islands",
      "category": "Community Development",
      "description": "MPLADS Constituency Works Allocation for Andaman And Nicobar Islands (Kuldeep Rai Sharma)",
      "sanction_date": "2019-06-01",
      "completion_date": "",
      "sanctioned_cost": 10.92,
      "expenditure": 2.53,
      "entitlement": 17.00,
      "released_amount": 5.00,
      "unspent_balance": 2.68,
      "financial_utilization": 23.17,
      "status": "In Progress",
      "total_score": 58.5,
      "risk_level": "High",
      "has_reasons_flag": 0
    }
  ],
  "total": 1675,
  "page": 1,
  "limit": 20,
  "total_pages": 84
}
```

---

### 2.3 `GET /api/projects/{id}`
Returns complete deep-investigation data for a specific allocation, including risk score decomposition, explainable reason cards, and peer comparables.

**Path Parameter**: `id` (int or string `source_record_id`)

**Response (200 OK)**:
```json
{
  "allocation": {
    "id": 1,
    "source_record_id": "LS17_0001",
    "mp_name": "Kuldeep Rai Sharma",
    "house": "Lok Sabha",
    "lok_sabha_term": 17,
    "state": "National / Multi-State",
    "district": "Andaman And Nicobar Islands",
    "constituency": "Andaman And Nicobar Islands",
    "category": "Community Development",
    "description": "MPLADS Constituency Works Allocation for Andaman And Nicobar Islands (Kuldeep Rai Sharma)",
    "sanction_date": "2019-06-01",
    "completion_date": "",
    "sanctioned_cost": 10.92,
    "expenditure": 2.53,
    "entitlement": 17.00,
    "released_amount": 5.00,
    "unspent_balance": 2.68,
    "financial_utilization": 23.17,
    "status": "In Progress",
    "pending_reason": ""
  },
  "risk_assessment": {
    "total_score": 58.5,
    "risk_level": "High",
    "financial_score": 35.0,
    "timeline_score": 23.5,
    "data_quality_score": 0.0,
    "geographic_score": 0.0,
    "computed_at": "2026-09-01T22:30:00Z"
  },
  "reasons": [
    {
      "flag_type": "FINANCIAL",
      "severity": "WARNING",
      "title": "Low Financial Utilization Outlier",
      "observed_value": "23.2%",
      "baseline_value": "85.4% (Category Median)",
      "threshold_value": "< 30.0% utilization",
      "explanation": "Reported expenditure is significantly lower than peer allocations in the same category."
    },
    {
      "flag_type": "TIMELINE",
      "severity": "WARNING",
      "title": "Extended Multi-Year Active Status",
      "observed_value": "5.0 years in status",
      "baseline_value": "2.4 years (Term Median)",
      "threshold_value": "> 4.0 years",
      "explanation": "Allocation has remained in In Progress status across the full parliamentary term."
    }
  ],
  "peer_comparables": [
    {
      "source_record_id": "LS17_0045",
      "mp_name": "Peer MP A",
      "constituency": "Peer Constituency A",
      "sanctioned_cost": 11.20,
      "expenditure": 9.80,
      "financial_utilization": 87.5,
      "total_score": 12.0,
      "risk_level": "Low"
    }
  ],
  "disclaimer": "Risk indicators are analytical signals intended to support review. They do not constitute proof of wrongdoing."
}
```

---

### 2.4 `GET /api/anomalies`
Prioritized review queue of all allocations flagged with Medium, High, or Critical risk.

**Query Parameters**:
- `min_score` (float, default: 25.0)
- `risk_level` (string, optional: `Medium`, `High`, `Critical`)
- `flag_type` (string, optional: `FINANCIAL`, `TIMELINE`, `DATA_QUALITY`, `GEOGRAPHIC`)
- `page` (int, default: 1)
- `limit` (int, default: 20)

**Response (200 OK)**: Standard pagination envelope of flagged allocations with top reason summaries.

---

### 2.5 `GET /api/analytics/by-category`
Returns aggregated financial and risk metrics grouped by civic sector category.

**Response (200 OK)**:
```json
[
  {
    "category": "Infrastructure & Public Amenities",
    "total_allocations": 572,
    "total_sanctioned_crore": 8420.10,
    "total_expenditure_crore": 7580.40,
    "avg_utilization": 90.03,
    "flagged_count": 22,
    "flagged_percentage": 3.85
  }
]
```

---

### 2.6 `GET /api/analytics/by-district`
Returns top aggregated districts ranked by allocation volume and risk concentration.

**Response (200 OK)**: Array of district summaries with total allocations, expenditures, and flagged counts.

---

### 2.7 `GET /api/locations`
Geographic centroid layer for Leaflet mapping.

**Response (200 OK)**:
```json
[
  {
    "district_id": 1,
    "district_name": "Andaman And Nicobar Islands",
    "state": "National / Multi-State",
    "latitude": 11.7401,
    "longitude": 92.6586,
    "total_allocations": 3,
    "total_expenditure_crore": 35.40,
    "flagged_allocations": 1,
    "dominant_risk_level": "Medium"
  }
]
```

---

### 2.8 `GET /api/methodology`
Returns scoring formulas, component weights, threshold parameters, and transparency disclosures.

**Response (200 OK)**: Structured mathematical definitions and cohort parameters.

---

### 2.9 `GET /api/reports/risk-summary.csv`
Streams a formatted CSV export of all allocations ranked by risk score with reasons.

**Response (200 OK)**: Content-Type `text/csv; charset=utf-8` with attachment header.
