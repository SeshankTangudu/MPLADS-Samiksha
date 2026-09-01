# Database Schema Contract (FROZEN)

- **Version**: 1.0.0 (FROZEN)
- **Status**: **FROZEN & AUTHORITATIVE**
- **Effective Date**: 2026-09-01
- **Architect**: Architect Agent
- **Target Engine**: SQLite 3 (PostgreSQL-ready ANSI SQL types)
- **Target File**: `data/processed/mplads.db`
- **Unit of Observation**: Constituency-Level Parliamentary Term Work & Fund Allocations (15th, 16th, 17th Lok Sabha)

---

## 1. Schema Overview & Relational Architecture

The database implements six normalized tables designed for offline batch scoring and sub-50ms read-only query performance.

```text
┌──────────────┐           ┌────────────────────────────────┐           ┌──────────────────┐
│     mps      │ 1       N │   projects (Allocations)       │ 1      1  │   risk_scores    │
│──────────────│───────────│────────────────────────────────│───────────│──────────────────│
│ id (PK)      │           │ id (PK)                        │           │ id (PK)          │
│ name         │           │ source_record_id (UQ, INDEX)   │           │ project_id (FK)  │
│ house        │           │ mp_id (FK -> mps.id)           │           │ total_score (IDX)│
│ state        │           │ district_id (FK -> districts)  │           │ risk_level       │
│ constituency │           │ state                          │           │ financial_score  │
└──────────────┘           │ district (INDEX)               │           │ timeline_score   │
                           │ constituency                   │           │ data_quality_score
┌──────────────┐           │ category (INDEX)               │           │ geographic_score │
│  districts   │ 1       N │ status (INDEX)                 │           └──────────────────┘
│──────────────│───────────│ sanctioned_cost                │
│ id (PK)      │           │ expenditure                    │           ┌──────────────────┐
│ state        │           │ unspent_balance                │ 1       N │    risk_flags    │
│ district_name│           │ pending_reason                 │───────────│──────────────────│
│ latitude     │           └────────────────────────────────┘           │ id (PK)          │
│ longitude    │                                                        │ project_id (FK)  │
└──────────────┘           ┌────────────────────────────────┐           │ flag_type        │
                           │       analytics_cache          │           │ severity         │
                           │────────────────────────────────│           │ title            │
                           │ id (PK)                        │           │ observed_value   │
                           │ cache_key (UQ, INDEX)          │           │ baseline_value   │
                           │ payload_json (TEXT)            │           │ threshold_value  │
                           │ updated_at                     │           │ explanation      │
                           └────────────────────────────────┘           └──────────────────┘
```

---

## 2. Detailed Table Specifications

### 2.1 `mps` (Parliamentary Representatives)
Stores distinct Member of Parliament profiles aggregated across terms.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `INTEGER` | `PRIMARY KEY AUTOINCREMENT` | Internal synthetic primary key |
| `name` | `VARCHAR(128)` | `NOT NULL` | Normalized MP Name (Title Case) |
| `house` | `VARCHAR(32)` | `NOT NULL DEFAULT 'Lok Sabha'` | House designation (Lok Sabha / Rajya Sabha) |
| `state` | `VARCHAR(64)` | `NOT NULL` | State or UT represented |
| `constituency` | `VARCHAR(64)` | `NOT NULL` | Parliamentary Constituency represented |
| `total_allocations` | `INTEGER` | `DEFAULT 0` | Total allocation records associated |
| `total_sanctioned` | `FLOAT` | `DEFAULT 0.0` | Cumulative sanctioned works amount (₹ Cr) |
| `total_expenditure` | `FLOAT` | `DEFAULT 0.0` | Cumulative reported expenditure (₹ Cr) |

### 2.2 `districts` (Geographic & Administrative Units)
Stores normalized district centroid coordinates and spatial aggregation totals.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `INTEGER` | `PRIMARY KEY AUTOINCREMENT` | Internal synthetic primary key |
| `state` | `VARCHAR(64)` | `NOT NULL` | State or Union Territory |
| `district_name` | `VARCHAR(64)` | `NOT NULL` | Normalized District Name |
| `clean_district_name` | `VARCHAR(64)` | `NOT NULL` | Sanitized alphanumeric district name |
| `latitude` | `FLOAT` | `NOT NULL` | District centroid latitude (WGS84) |
| `longitude` | `FLOAT` | `NOT NULL` | District centroid longitude (WGS84) |
| `total_allocations` | `INTEGER` | `DEFAULT 0` | Total constituency allocations in district |
| `flagged_allocations` | `INTEGER` | `DEFAULT 0` | Count of allocations with High/Critical risk |

### 2.3 `projects` (Constituency-Level Allocation Records)
Authoritative repository of all 1,675 cleaned constituency allocation records.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `INTEGER` | `PRIMARY KEY AUTOINCREMENT` | Internal synthetic primary key |
| `source_record_id` | `VARCHAR(32)` | `UNIQUE NOT NULL` | Source record index key (`LS<term>_<index>`) |
| `source_dataset` | `VARCHAR(64)` | `NOT NULL` | Source dataset release title |
| `mp_id` | `INTEGER` | `FOREIGN KEY REFERENCES mps(id)` | Foreign key to MP record |
| `district_id` | `INTEGER` | `FOREIGN KEY REFERENCES districts(id)`| Foreign key to District record |
| `house` | `VARCHAR(32)` | `NOT NULL DEFAULT 'Lok Sabha'` | Legislative house |
| `lok_sabha_term` | `INTEGER` | `NOT NULL` | Parliamentary term (15, 16, 17) |
| `mp_name` | `VARCHAR(128)` | `NOT NULL` | MP Name for rapid indexing |
| `state` | `VARCHAR(64)` | `NOT NULL` | State / Union Territory |
| `district` | `VARCHAR(64)` | `NOT NULL` | District Name |
| `constituency` | `VARCHAR(64)` | `NOT NULL` | Parliamentary Constituency |
| `category` | `VARCHAR(64)` | `NOT NULL` | Broad civic sector category |
| `description` | `TEXT` | `NOT NULL` | Contextual allocation title & description |
| `sanction_date` | `VARCHAR(10)` | `NOT NULL` | Milestone or term start date (ISO-8601) |
| `completion_date` | `VARCHAR(10)` | `DEFAULT ''` | Term close date for completed records |
| `sanctioned_cost` | `FLOAT` | `NOT NULL DEFAULT 0.0` | Sanctioned works budget (₹ Crores) |
| `expenditure` | `FLOAT` | `NOT NULL DEFAULT 0.0` | Reported expenditure incurred (₹ Crores) |
| `entitlement` | `FLOAT` | `NOT NULL DEFAULT 0.0` | Guideline entitlement (₹ Crores) |
| `released_amount` | `FLOAT` | `NOT NULL DEFAULT 0.0` | Cumulative released funds (₹ Crores) |
| `unspent_balance` | `FLOAT` | `NOT NULL DEFAULT 0.0` | Remaining unutilized balance (₹ Crores) |
| `status` | `VARCHAR(32)` | `NOT NULL` | Financial lifecycle state |
| `pending_reason` | `TEXT` | `DEFAULT ''` | Administrative delay / audit remarks |
| `has_reasons_flag` | `INTEGER` | `NOT NULL DEFAULT 0` | 1 if administrative delay remarks present, else 0 |

### 2.4 `risk_scores` (Batch Analytical Risk Scores)
1:1 relation with `projects`. Computed offline at build time.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `INTEGER` | `PRIMARY KEY AUTOINCREMENT` | Primary key |
| `project_id` | `INTEGER` | `UNIQUE NOT NULL, FK -> projects(id)` | Foreign key to allocation record |
| `total_score` | `FLOAT` | `NOT NULL` | Composite risk score (0–100) |
| `risk_level` | `VARCHAR(16)` | `NOT NULL` | Tier: Low (0-24), Medium (25-49), High (50-74), Critical (75-100) |
| `financial_score` | `FLOAT` | `NOT NULL DEFAULT 0.0` | Financial anomaly component (weight 35) |
| `timeline_score` | `FLOAT` | `NOT NULL DEFAULT 0.0` | Timeline stagnation component (weight 25) |
| `data_quality_score`| `FLOAT` | `NOT NULL DEFAULT 0.0` | Documentation review component (weight 20) |
| `geographic_score` | `FLOAT` | `NOT NULL DEFAULT 0.0` | Spatial concentration component (weight 10) |
| `computed_at` | `VARCHAR(32)` | `NOT NULL` | ISO-8601 computation timestamp |

### 2.5 `risk_flags` (Explainable Anomaly Signals)
1:N relation with `projects`. Stores ordered reasons with observed vs baseline vs threshold.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `INTEGER` | `PRIMARY KEY AUTOINCREMENT` | Primary key |
| `project_id` | `INTEGER` | `NOT NULL, FK -> projects(id)` | Foreign key to allocation record |
| `flag_type` | `VARCHAR(32)` | `NOT NULL` | Family: `FINANCIAL`, `TIMELINE`, `DATA_QUALITY`, `GEOGRAPHIC` |
| `severity` | `VARCHAR(16)` | `NOT NULL` | `INFO`, `WARNING`, `CRITICAL` |
| `title` | `VARCHAR(128)` | `NOT NULL` | Human-readable signal headline |
| `observed_value` | `VARCHAR(64)` | `NOT NULL` | Observed allocation metric value |
| `baseline_value` | `VARCHAR(64)` | `NOT NULL` | Peer cohort baseline (Median) |
| `threshold_value` | `VARCHAR(64)` | `NOT NULL` | Activation trigger threshold (P90) |
| `explanation` | `TEXT` | `NOT NULL` | Clear, non-accusatory analytical explanation |

### 2.6 `analytics_cache` (Pre-Aggregated JSON View Cache)
High-performance key-value store for dashboard aggregations and distribution histograms.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `INTEGER` | `PRIMARY KEY AUTOINCREMENT` | Primary key |
| `cache_key` | `VARCHAR(64)` | `UNIQUE NOT NULL` | Cache key identifier (`overview_stats`, `by_category`, `by_district`) |
| `payload_json` | `TEXT` | `NOT NULL` | Pre-serialized JSON payload |
| `updated_at` | `VARCHAR(32)` | `NOT NULL` | Last cache update timestamp |

---

## 3. Database Indexes (Mandatory for Performance)

```sql
CREATE INDEX idx_projects_category_status ON projects(category, status);
CREATE INDEX idx_projects_district_id ON projects(district_id);
CREATE INDEX idx_projects_mp_id ON projects(mp_id);
CREATE INDEX idx_projects_state ON projects(state);
CREATE INDEX idx_risk_scores_total_score ON risk_scores(total_score DESC);
CREATE INDEX idx_risk_scores_risk_level ON risk_scores(risk_level);
CREATE INDEX idx_risk_flags_project_id ON risk_flags(project_id);
CREATE INDEX idx_analytics_cache_key ON analytics_cache(cache_key);
```
