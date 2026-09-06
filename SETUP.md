# MPLADS Samiksha — Fresh Clone Setup & Reproducibility Guide

This guide details the exact step-by-step procedure to set up, build, and run the **MPLADS Samiksha** platform on a fresh machine (Windows / macOS / Linux).

---

## 📋 Prerequisites

1. **Python**: Python 3.11, 3.12, or 3.13 (64-bit)
2. **Node.js & npm**: Node.js 18+ or 20+ LTS
3. **Git**: Installed and configured

---

## 🚀 Quick Setup (Windows PowerShell / Command Prompt)

### Step 1: Clone the Repository
```powershell
git clone https://github.com/SeshankTangudu/MPLADS-Samiksha.git
cd MPLADS-Samiksha
```

### Step 2: Set Up Python Virtual Environment
```powershell
# Create virtual environment
python -m venv .venv

# Activate virtual environment on Windows (PowerShell):
.\.venv\Scripts\Activate.ps1

# (If using Windows Command Prompt):
# .\.venv\Scripts\activate.bat

# (If using macOS/Linux):
# source .venv/bin/activate
```

### Step 3: Install Python Dependencies
```powershell
pip install --upgrade pip
pip install -r requirements.txt
```

> **Note**: `requirements.txt` includes FastAPI, Uvicorn, SQLAlchemy, Pandas, Scikit-Learn, Pillow, and Python-Multipart.

---

## 🗄️ Step 4: Build Database & Execute Batch Scoring

The SQLite production database (`data/processed/mplads.db`) is intentionally not committed to Git to preserve data provenance and clean version control.

Reconstruct the complete 1,675-record database deterministically using the committed processed data (`data/processed/projects_clean.csv`) and reference centroids (`data/reference/centroids.csv`):

```powershell
# 1. Build SQLite tables and populate 1,675 allocations & 1,015 districts:
python scripts/build_db.py

# 2. Run deterministic Model A batch scoring and reason flag generation:
python ml/batch_scoring.py
```

### Expected Output:
* `build_db.py` creates `data/processed/mplads.db` with:
  * 1,015 Districts
  * 1,547 MP profiles
  * 1,675 Parliamentary allocations
* `batch_scoring.py` evaluates all allocations:
  * 1,675 Risk scores
  * 1,067 Risk flags
  * Distribution: Low: 1,166 | Medium: 413 | High: 96 | Critical: 0 (Max score: 63.0)

---

## 📦 Step 5: Install Frontend Dependencies

Open a new terminal or navigate to the `frontend` folder:
```powershell
cd frontend
npm install
cd ..
```

---

## 🖥️ Step 6: Launch Backend & Frontend

### Terminal 1 — Start FastAPI Backend:
```powershell
# From project root:
.\.venv\Scripts\activate
uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
```
* **API Root:** `http://127.0.0.1:8000/`
* **Swagger Docs:** `http://127.0.0.1:8000/docs`
* **Health Check:** `http://127.0.0.1:8000/health`

### Terminal 2 — Start React/Vite Frontend:
```powershell
# From frontend folder:
cd frontend
npm run dev
```
* **Frontend Portal:** `http://localhost:5173`

---

## 🧪 Step 7: Verify Everything Works

### Run Full Backend Test Suite:
```powershell
# From project root:
pytest tests/
```
* **Expected Result:** `201 passed`

### Run Frontend Production Build:
```powershell
# In frontend folder:
npm run build
```
* **Expected Result:** `✓ built in ...` with zero errors.

---

## 🔧 Troubleshooting & FAQ

### 1. `ModuleNotFoundError: No module named 'PIL'`
* **Cause**: `Pillow` was missing from your virtual environment.
* **Fix**: Ensure your `.venv` is active and run `pip install -r requirements.txt`.

### 2. `Request failed with status code 500` / Empty Dashboards
* **Cause**: Backend is not running on port 8000, or the database was not constructed.
* **Fix**:
  1. Confirm `python scripts/build_db.py` and `python ml/batch_scoring.py` were run.
  2. Confirm backend terminal is running and shows `Application startup complete` on `http://127.0.0.1:8000`.
  3. Check `http://127.0.0.1:8000/api/stats/overview` in your browser.

### 3. Vite API Proxy Errors (`[vite] http proxy error: ... ECONNREFUSED`)
* **Cause**: The Vite development server cannot reach the FastAPI backend at `http://127.0.0.1:8000`.
* **Fix**: Start the backend in Terminal 1 using `uvicorn backend.app.main:app --reload --port 8000`.

### 4. Windows Execution Policy Error when Activating `.venv`
* **Cause**: Windows PowerShell restricts script execution by default.
* **Fix**: Run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` in PowerShell, then run `.\.venv\Scripts\Activate.ps1`.
