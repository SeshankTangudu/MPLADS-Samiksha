"""MPLADS Samiksha FastAPI Backend Foundation (T07).

Provides CORS middleware, structured error handlers, health check,
and Swagger documentation.
"""

import os
from datetime import datetime, timezone
from typing import Any, Dict
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")

app = FastAPI(
    title="MPLADS Samiksha Risk Intelligence API",
    description="Read-only intelligence layer over Member of Parliament Local Area Development Scheme data.",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in ALLOWED_ORIGINS if origin.strip()],
    allow_credentials=True,
    allow_methods=["GET", "OPTIONS"],
    allow_headers=["*"],
)

from starlette.exceptions import HTTPException as StarletteHTTPException

# Structured Error Handlers (without leaking internal stack traces)
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.detail,
            "code": f"HTTP_{exc.status_code}",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    )

@app.exception_handler(HTTPException)
async def custom_http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.detail,
            "code": f"HTTP_{exc.status_code}",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": "Invalid request parameters or payload structure.",
            "code": "VALIDATION_ERROR",
            "errors": exc.errors(),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    )

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "An internal server error occurred while processing the request.",
            "code": "INTERNAL_SERVER_ERROR",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    )

@app.get("/health", tags=["System"])
async def health_check() -> Dict[str, Any]:
    """System health check endpoint."""
    return {
        "status": "ok",
        "service": "mplads-samiksha-backend",
        "version": "2.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

@app.get("/", tags=["System"])
async def root() -> Dict[str, Any]:
    """API root endpoint providing system metadata."""
    return {
        "name": "MPLADS Samiksha Risk Intelligence Platform",
        "version": "2.0.0",
        "docs": "/docs",
        "health": "/health",
        "disclaimer": "Risk indicators are analytical signals intended to support review. They do not constitute proof of wrongdoing."
    }
