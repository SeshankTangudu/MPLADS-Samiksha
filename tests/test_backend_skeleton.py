"""Automated verification tests for T07 FastAPI Skeleton & Error Handlers."""

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["version"] == "2.0.0"
    assert "timestamp" in data

def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "name" in data
    assert "disclaimer" in data
    assert "/docs" in data["docs"]

def test_404_structured_error_handler():
    response = client.get("/api/non-existent-endpoint-test")
    assert response.status_code == 404
    data = response.json()
    assert data["code"] == "HTTP_404"
    assert "detail" in data
    assert "timestamp" in data

def test_cors_headers():
    response = client.get("/health", headers={"Origin": "http://localhost:5173"})
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:5173"
