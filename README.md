# MPLADS Samiksha — Risk Intelligence & Review Support Platform

> **An Explainable Decision Support & Statistical Anomaly Review Layer for the Member of Parliament Local Area Development Scheme (MPLADS)**  
> Built for the Smart India Hackathon (SIH) 2024 / Parliamentary Open Data Governance.

[![Test Suite](https://img.shields.io/badge/pytest-201%2F201%20passed-brightgreen.svg)]()
[![Frontend Build](https://img.shields.io/badge/vite-production%20ready-blue.svg)]()
[![Database](https://img.shields.io/badge/sqlite-1%2C675%20verified%20records-success.svg)]()
[![Responsible AI](https://img.shields.io/badge/responsible%20AI-non--accusatory-orange.svg)]()

---

## 🏛️ Executive Summary

**MPLADS Samiksha** is an open-governance intelligence platform designed to support administrative oversight, parliamentary research, and citizen transparency. By applying statistical cohort quantile baselines and deterministic linear additive risk scoring, the platform flags anomalous spending patterns, administrative retention, and compliance delays without making unverified accusatory claims.

### Key Highlights
- **1,675 Authentic Records**: Covers constituency-level parliamentary allocations across the **15th (2009–2014), 16th (2014–2019), and 17th (2019–2024) Lok Sabha** terms.
- **1,547 Member of Parliament Profiles** & **1,015 District Reference Centroids** (100% matched geographic reference).
- **100% Deterministic & Explainable**: Pure mathematical formulation with transparent ReasonCards (Observed vs Baseline vs Threshold).
- **Responsible AI Guardrails**: Strict non-accusatory terminology. Analytical review signals prioritize inspection without claiming fraud or wrongdoing.

---

## ⚠️ Data Scope & Integrity Disclosures (DEC-004 / DEC-005)

To ensure scientific accuracy and prevent misrepresentation:
1. **Unit of Observation**: The dataset represents **"Constituency-Level Parliamentary Term Work & Fund Allocations"** rather than granular physical construction work-sites.
2. **Record Identifiers**: `source_record_id` is a dataset index key assigned during ingestion, not a verified government-issued work/tender ID.
3. **Financial Utilization Proxy**: Financial utilization is calculated strictly as `(Reported Expenditure / Sanctioned Cost) × 100`. It serves as a financial disbursement proxy and **MUST NOT** be construed as physical civil construction completion.
4. **Geographic Centroids**: Map coordinates represent verified administrative **district reference centroids**, not exact physical project GPS locations or construction site tracking.
5. **Unavailable Data**: Vendor ledgers, itemized invoices, subcontractor records, and physical engineering progress are not present in public MPLADS releases and are never fabricated.

---

## 📊 Analytical Risk Scoring Framework (Model A)

The composite risk score is evaluated on a theoretical **0–100 scale** using a pure linear additive formulation:

$$\text{Composite Score} = \min(100.0, S_{\text{FIN}} + S_{\text{TIM}} + S_{\text{DQ}} + S_{\text{GEO}} + S_{\text{DUP}})$$

| Dimension | Max Weight | Basis / Trigger Condition |
| :--- | :---: | :--- |
| **Financial Deviation ($S_{\text{FIN}}$)** | **35 pts** | Cost anomaly triggered when $\text{exp} > \text{Cohort P90}$ AND $\text{exp} / \text{Cohort P50} \ge 1.30$. |
| **Timeline Stagnation ($S_{\text{TIM}}$)** | **25 pts** | Multi-year active retention without expenditure (25 pts active zero exp, 18 pts 16th LS, 22 pts 15th LS). |
| **Data Quality & Compliance ($S_{\text{DQ}}$)** | **20 pts** | Official audit certificate notes, pending MPRs, zero sanctioned budget, or negative accounting balance. |
| **Geographic Concentration ($S_{\text{GEO}}$)** | **10 pts** | District allocation density factor across verified administrative centroids (inactive baseline). |
| **Duplicate Allocation ($S_{\text{DUP}}$)** | **10 pts** | Duplicate allocation detection (decoupled review candidate intelligence). |

### Standard Risk Tiers & Empirical Distribution (N=1,675)
- 🟢 **Low Risk (0.0 – 24.9)**: 1,166 allocations (**69.61%**) — Normal statistical cohort parameters.
- 🟡 **Medium Risk (25.0 – 49.9)**: 413 allocations (**24.66%**) — Moderate single-dimension deviation or documentation item.
- 🟠 **High Risk (50.0 – 74.9)**: 96 allocations (**5.73%**) — Compounding multi-signal outlier or significant financial deviation.
- 🔴 **Critical Risk (75.0 – 100.0)**: 0 allocations (**0.00%**) — Severe multi-dimensional compounding anomaly (Active mathematical ceiling: 72.0).

---

## 🛠️ System Architecture & Technology Stack

- **Backend API**: Python 3.11+, FastAPI, SQLAlchemy ORM, SQLite 3, Pydantic v2 schemas.
- **Frontend UI**: React 18, Vite, Tailwind CSS (Government Palette `#1B3A5C`), Recharts, Leaflet OpenStreetMap, Lucide Icons.
- **AI/ML Engine**: Pure deterministic Python scoring engine (`ml/risk_engine.py`) and precomputed statistical cohort quantiles (`ml/cohort_baselines.json`).

---

## 🚀 Quickstart & Local Setup

> **Full step-by-step setup guide for fresh teammate clones is available in [SETUP.md](SETUP.md).**

### 1. Clone & Activate Python Environment
```bash
git clone https://github.com/SeshankTangudu/MPLADS-Samiksha.git
cd MPLADS-Samiksha

python -m venv .venv
# On Windows PowerShell:
.\.venv\Scripts\Activate.ps1
# On macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
```

### 2. Build Database & Execute Batch Scoring
```bash
python scripts/build_db.py
python ml/batch_scoring.py
```

### 3. Start Backend & Frontend
```bash
# Terminal 1 (Backend API):
uvicorn backend.app.main:app --reload --port 8000

# Terminal 2 (Frontend UI):
cd frontend
npm install
npm run dev
```
Open **`http://localhost:5173`** in your browser. Interactive OpenAPI documentation is available at **`http://127.0.0.1:8000/docs`**.

---

## 🧪 Automated Verification & Testing

The repository contains 201 comprehensive automated test cases:
```bash
pytest tests/
```
```text
============================ 201 passed in 33.39s =============================
```
```

---

## 📜 Mandatory Responsible AI Principle

> **"Risk indicators are analytical signals intended to support review. They do not constitute proof of wrongdoing."**

---

## 📄 Documentation Sitemap

- [Deployment Runbook](file:///f:/MPLADS-Samiksha/docs/deployment_runbook.md)
- [Architecture Design Document](file:///f:/MPLADS-Samiksha/docs/architecture.md)
- [User Guide & Feature Walkthrough](file:///f:/MPLADS-Samiksha/docs/user_guide.md)
- [Methodology & Transparency Framework](file:///f:/MPLADS-Samiksha/docs/methodology.md)
- [Demonstration Script & Presentation Guide](file:///f:/MPLADS-Samiksha/docs/DEMO_SCRIPT.md)
