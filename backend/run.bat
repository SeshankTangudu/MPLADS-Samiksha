@echo off
REM MPLADS Samiksha - Backend Runner (Windows)
echo Starting MPLADS Samiksha Backend API on http://127.0.0.1:8000 ...
cd /d "%~dp0\.."
if exist .venv\Scripts\activate.bat (
    call .venv\Scripts\activate.bat
)
uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
