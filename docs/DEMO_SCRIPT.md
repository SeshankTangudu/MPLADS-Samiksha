# MPLADS Samiksha — Demonstration Script & Presentation Guide

**Target Duration**: 5 to 7 Minutes  
**Presenter Persona**: Lead Technical Architect & AI Governance Lead  
**Audience**: Smart India Hackathon (SIH) Evaluators, MoSPI Stakeholders, Parliamentary Observers  
**Primary Goal**: Demonstrate an explainable, deterministic, data-compatible decision support system for parliamentary fund review with zero fabricated claims and strict Responsible AI compliance.

---

## 🎯 Pre-Demo Technical Checklist (T-Minus 2 Minutes)

1. Ensure Backend is running: `http://127.0.0.1:8000/health` returns `{"status": "ok"}`.
2. Ensure Frontend is running: `http://localhost:5173` is loaded.
3. Keep OpenAPI Docs open in secondary tab: `http://127.0.0.1:8000/docs`.
4. Keep terminal open with automated test suite ready: `pytest -v tests/` (66/66 green).

---

## ⏱️ Step-by-Step Presentation Timeline

### Step 1: Context & Responsible AI Foundation (0:00 – 0:45)
- **Action**: Navigate to `http://localhost:5173/` (Overview Page). Point to the standing amber disclaimer banner.
- **Spoken Script**:
  > *"Respected evaluators, the Member of Parliament Local Area Development Scheme (MPLADS) handles thousands of crores of public funds across hundreds of parliamentary terms. However, oversight bodies face a critical challenge: public datasets provide macro-level allocations rather than itemized invoices. Today, we present **MPLADS Samiksha**—a 100% deterministic, explainable risk intelligence layer built directly over 1,675 authentic records from the 15th, 16th, and 17th Lok Sabha.*  
  > *Before we begin, our core operating principle is explicit: **Risk indicators are analytical signals intended to support review. They do not constitute proof of wrongdoing.**"*
- **What NOT to claim**: Do NOT claim the system detects fraud, corruption, or illegal activity.

---

### Step 2: Macro Overview & Interactive Dashboard (0:45 – 1:30)
- **Action**: Highlight the 4 KPI cards on `/`, then navigate to `/dashboard`.
- **Key Metrics to Highlight**:
  * Total Allocations: **1,675**
  * Sanctioned Works Budget: **₹6,464.21 Cr**
  * Cumulative Reported Spent: **₹4,772.37 Cr**
  * Overall Financial Utilization Proxy: **73.83%**
  * Risk Tier Distribution: **1,166 Low Risk (69.6%)**, **413 Medium Risk (24.7%)**, **96 High Risk (5.73%)**, **0 Critical**.
- **Spoken Script**:
  > *"Our dashboard provides instantaneous macro portfolio visibility backed by live SQLite queries. Notice that our high-risk review tier represents exactly 5.73% of allocations—strictly adhering to standard oversight anomaly targeting bands. All financial progress is explicitly defined as a Financial Utilization Proxy."*
- **What NOT to claim**: Do NOT describe financial utilization as physical construction progress.

---

### Step 3: Allocation Explorer & Dynamic Filtering (1:30 – 2:30)
- **Action**: Click **Explorer** in Navbar (`/projects`).
  1. Type `"Varanasi"` or `"Delhi"` in the search bar (demonstrating debounced search).
  2. Select Civic Category: `"Infrastructure & Public Amenities"`.
  3. Select Term: `"17th LS"`.
  4. Change Sort By: `"Reported Expenditure"` (Descending).
- **Spoken Script**:
  > *"The Allocation Explorer allows auditors to seamlessly navigate 1,675 records with sub-10ms response times. We can filter across civic sectors, parliamentary terms, and lifecycle statuses while viewing financial utilization meters and dataset record identifiers."*
- **What NOT to claim**: Do NOT claim `source_record_id` is a government work/tender ID.

---

### Step 4: Anomaly Intelligence Center & CSV Export (2:30 – 3:30)
- **Action**: Click **Anomalies** in Navbar (`/anomalies`).
  1. Toggle Risk Tier chips: Click `"High Risk (Score 50–74)"` (filters to 96 records).
  2. Filter by Signal Type: Select `"Financial Deviation (P90)"`.
  3. Click `"Export Risk CSV"` (downloads `mplads_risk_summary.csv`).
- **Spoken Script**:
  > *"For oversight teams, the Anomaly Center prioritizes allocations exhibiting statistical outlier behavior. Rather than inspecting 1,675 rows manually, reviewers can focus on prioritized allocations with dual P90 financial triggers or multi-year administrative retention. The complete dataset can be exported directly to CSV for administrative audit files."*

---

### Step 5: Deep Allocation Investigation & Reason Decomposition (3:30 – 4:45)
- **Action**: Click **Investigate** on any High Risk record (e.g., `/projects/LS17_0001` or `/projects/1`).
  1. Show the **Composite Risk Score Gauge** (e.g. 53.0 / 100).
  2. Walk through the 4-dimension decomposition bars: Financial (35), Timeline (25), Data Quality (20), Geographic (10).
  3. Inspect the **Explainable ReasonCards**: Point out *Observed Value*, *Peer Cohort Baseline*, *Trigger Threshold*, and the contextual explanation.
  4. Scroll to **Peer Cohort Comparables**: Show the 3 peer allocations from the same category with similar budgets.
- **Spoken Script**:
  > *"This is the core innovation of MPLADS Samiksha: complete explainability. For this allocation, the score is not a black-box AI number. It is decomposed mathematically into its peer deviation, term lifecycle status, and official administrative remarks like 'Audit Certificate Pending'. Reviewers can immediately compare it with peer allocations in the same civic sector."*
- **What NOT to claim**: Do NOT claim the MP or constituency is guilty of wrongdoing.

---

### Step 6: District GIS Map & Centroid Reference (4:45 – 5:30)
- **Action**: Click **GIS Map** in Navbar (`/map`).
  1. Show the interactive Leaflet map of India.
  2. Filter by State: Select `"Uttar Pradesh"` or `"Maharashtra"`.
  3. Click a red/amber centroid circle to open the popup displaying District Name, Allocations, Expenditure, and Risk Tier.
- **Spoken Script**:
  > *"Our geospatial layer maps allocations across 1,015 verified administrative district centroids. Circle radius scales with allocation volume, and color indicates risk density. We explicitly disclose that these represent district reference centroids rather than exact project GPS coordinates."*
- **What NOT to claim**: Do NOT claim points represent exact construction site GPS locations.

---

### Step 7: Sector Analytics & Transparency Framework (5:30 – 6:15)
- **Action**: Click **Analytics** (`/analytics`) to show Recharts comparative financial bars, then click **Methodology** (`/methodology`).
- **Spoken Script**:
  > *"In the Sector Analytics view, we compare fund utilization and risk signal density across civic categories. Finally, our Methodology page publishes our exact mathematical equations, Model A weights, and quantile fallback hierarchy for complete institutional transparency."*

---

### Step 8: Conclusion & Q&A Readiness (6:15 – 6:30)
- **Action**: Return to Overview Page.
- **Spoken Script**:
  > *"MPLADS Samiksha bridges the gap between raw government open data and actionable oversight decision support—combining high performance, scientific integrity, and responsible AI governance. We are ready for questions."*

---

## 🛡️ Failover & Emergency Backup Plan

| Failure Scenario | Fallback Procedure |
| :--- | :--- |
| Network or Port Conflict | Launch backend on port `8001` (`uvicorn backend.app.main:app --port 8001`) and frontend on `5174`. |
| Database Lock / Reset Needed | Run `python scripts/build_db.py && python ml/batch_scoring.py` (executes in 3 seconds). |
| Offline / No Internet Map Fallback | Leaflet map gracefully displays cached/local tiles and centroid overlays. |
| Judge asks for test verification | Run `pytest -v tests/` in terminal to demonstrate 66/66 automated tests passing in ~6 seconds. |
