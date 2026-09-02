# MPLADS Samiksha — Deployment & Operational Runbook

**Version**: 2.0.0  
**Target Environment**: Localhost (Primary Supported Mode) | Optional Cloud (FastAPI + Vercel)  
**Classification**: Government Public Intelligence & Analytical Review Support Layer  

---

## 1. System Architecture Overview

MPLADS Samiksha operates as a high-performance, containerless local and cloud-ready intelligence architecture:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                            FRONTEND CLIENT LAYER                             │
│       React 18 + Vite + Tailwind CSS + Recharts + Leaflet OpenStreetMap      │
│                     (Port 5173 / Production dist/)                          │
└──────────────────────────────────────▲───────────────────────────────────────┘
                                       │ HTTP / REST JSON
┌──────────────────────────────────────▼───────────────────────────────────────┐
│                             BACKEND API LAYER                                │
│          FastAPI (Python 3.11+) + Pydantic v2 + SQLAlchemy ORM Layer         │
│                              (Port 8000 / ASGI)                              │
└──────────────────────────────────────▲───────────────────────────────────────┘
                                       │ SQL Queries & Indexes
┌──────────────────────────────────────▼───────────────────────────────────────┐
│                             DATA STORAGE LAYER                               │
│        SQLite 3 (`data/processed/mplads.db` - 1,675 Allocation Records)      │
│          Tables: mps, districts, projects, risk_scores, risk_flags           │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Prerequisites & Local Environment

Ensure the following runtimes are installed on the host operating system (Windows / macOS / Linux):
- **Python**: Version `3.10` or higher (`python --version`)
- **Node.js**: Version `18.0.0` or higher (`node --version`)
- **npm**: Version `9.0.0` or higher (`npm --version`)
- **Git**: (`git --version`)

---

## 3. Local Setup & Startup (Primary Supported Path)

### Step 3.1: Repository Setup
Clone the repository and enter the workspace:
```bash
git clone https://github.com/example/mplads-samiksha.git
cd mplads-samiksha
```

### Step 3.2: Python Virtual Environment & Backend Setup
```bash
# 1. Create and activate Python virtual environment
python -m venv .venv

# On Windows (PowerShell):
.\.venv\Scripts\Activate.ps1
# On Linux/macOS:
source .venv/bin/activate

# 2. Install backend dependencies
pip install --upgrade pip
pip install -r backend/requirements.txt
```

### Step 3.3: Database Build & Offline Batch Scoring
The SQLite database (`data/processed/mplads.db`) is generated locally from clean source datasets and is excluded from git version control:
```bash
# 1. Build database schema and load verified records (1,675 allocations)
python scripts/build_db.py

# 2. Compute cohort statistical baselines (74 Category + State cohorts)
python ml/cohort_stats.py

# 3. Execute deterministic batch risk scoring pipeline
python ml/batch_scoring.py
```

### Step 3.4: Frontend Installation & Build
```bash
cd frontend
npm install
npm run build
cd ..
```

---

## 4. Starting the Application

To run the complete full-stack platform locally:

### Terminal 1: Backend ASGI Server
```bash
# From workspace root with activated venv:
uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
*Backend API available at*: `http://127.0.0.1:8000`  
*Interactive OpenAPI Docs*: `http://127.0.0.1:8000/docs`  
*Health Check Endpoint*: `http://127.0.0.1:8000/health`  

### Terminal 2: Frontend Development Server
```bash
# From frontend directory:
cd frontend
npm run dev
```
*Frontend UI available at*: `http://localhost:5173` (or `http://127.0.0.1:5173`)

---

## 5. Configuration & Environment Variables

The application operates out-of-the-box with secure defaults. Optional environment variables may be configured:

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `DATABASE_URL` | `sqlite:///data/processed/mplads.db` | SQLAlchemy SQLite database connection URI |
| `ALLOWED_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | Comma-separated CORS origins permitted by FastAPI |
| `PORT` | `8000` | Backend listening port |
| `VITE_API_URL` | `/api` | Frontend proxy base URL to backend API |

---

## 6. Offline / Batch Risk Scoring Workflow

The scoring engine is completely offline, deterministic, and idempotent:
1. When new official MoSPI records are ingested, clean data into `data/processed/projects_clean.csv`.
2. Run `python ml/cohort_stats.py` to update quantile baselines in `ml/cohort_baselines.json`.
3. Run `python ml/batch_scoring.py` to purge and repopulate `risk_scores` and `risk_flags` in `mplads.db`.
4. Run `pytest tests/test_batch_scoring.py` to verify score bounds, 1:1 foreign keys, and idempotency.

---

## 7. Optional Cloud Deployment (Secondary)

> **Note**: Localhost execution is the primary verified delivery mode. The configurations below are provided as optional cloud deployment templates.

### Optional Backend Deployment (Render / Railway / VM)
- **Runtime**: Python 3.11+
- **Build Command**: `pip install -r backend/requirements.txt && python scripts/build_db.py && python ml/batch_scoring.py`
- **Start Command**: `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`

### Optional Frontend Deployment (Vercel / Netlify / Cloudflare Pages)
- **Framework Preset**: Vite
- **Root Directory**: `frontend`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Environment Variable**: `VITE_API_URL=https://<your-backend-domain>/api`

---

## 8. Troubleshooting & Verification

| Symptom / Issue | Root Cause | Resolution |
| :--- | :--- | :--- |
| `sqlite3.OperationalError: no such table` | `mplads.db` has not been initialized. | Run `python scripts/build_db.py` followed by `python ml/batch_scoring.py`. |
| CORS Network Error in Frontend | Frontend port not in `ALLOWED_ORIGINS`. | Ensure frontend is running on port `5173` or update `ALLOWED_ORIGINS` in backend environment. |
| Port `8000` or `5173` already in use | Stale background process running. | Terminate existing process on port or launch with `--port 8001` / `npm run dev -- --port 5174`. |
| Re-run batch scoring created duplicates | N/A (Idempotency protection). | `ml/batch_scoring.py` automatically purges prior run before repopulating within a single transaction. |

---

## 9. Automated Test Suite

To verify system integrity across all 66 test cases:
```bash
pytest -v tests/
```
All tests should pass with `66 passed in < 10s`.
