#!/usr/bin/env bash
# MPLADS Samiksha - Backend Runner (Unix / Linux / macOS)
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$ROOT_DIR"

if [ -d ".venv" ]; then
    source .venv/bin/activate
fi

echo "Starting MPLADS Samiksha Backend API on http://127.0.0.1:8000 ..."
uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
