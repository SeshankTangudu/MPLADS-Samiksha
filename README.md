# MPLADS Samiksha — Risk Intelligence & Anomaly Detection Platform

MPLADS Samiksha provides a read-only intelligence layer over project-level Member of Parliament Local Area Development Scheme (MPLADS) data.

> **Standing Disclaimer**: Risk indicators are analytical signals intended to support review. They do not constitute proof of wrongdoing.

---

## Repository Structure

```text
mplads-samiksha/
├── .agy/                   # AGY execution state, task queue, blockers, decisions, checkpoints
├── backend/
│   └── app/                # FastAPI application, routers, schemas, models (T07-T09)
├── data/
│   ├── raw/                # Immutable source datasets + PROVENANCE.md (T03)
│   ├── processed/          # Cleaned CSV and SQLite database (T04, T06)
│   └── reference/          # Reference tables e.g. district centroids (T05)
├── docs/
│   └── contracts/          # Frozen DB & API contracts (T06, T08)
├── frontend/               # React + Vite application (T14-T19)
├── ml/                     # Cohort statistics & deterministic risk engine (T10-T12)
├── notebooks/              # Exploratory data analysis & validation notebooks
├── scripts/                # Data acquisition, cleaning, and DB build scripts (T03-T06)
├── tests/                  # Backend unit, contract, and integration tests (T21)
├── .env.example            # Environment configuration template
├── .gitignore              # Version control ignore rules
└── README.md               # Project documentation
```

---

## Setup & Execution (Roadmap)

1. **Environment Setup (T02)**: Python 3.13+ virtualenv and Node.js dependencies.
2. **Data Pipeline (T03–T05)**: Snapshot download, cleaning, validation, and district georeferencing.
3. **Database & Backend (T06–T09, T13)**: SQLite schema build, FastAPI REST service.
4. **Anomaly Engine (T10–T12)**: Deterministic cohort-based risk scoring.
5. **Frontend (T14–T19)**: React + Vite responsive UI with Tailwind tokens, Recharts, and Leaflet.
