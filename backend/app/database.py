"""Database session and connection management for FastAPI backend (T08)."""

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DEFAULT_DB_PATH = os.path.join(PROJECT_ROOT, "data", "processed", "mplads.db")

DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DEFAULT_DB_PATH}")

# Create engine with thread-safe settings for SQLite
connect_args = {"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args, echo=False)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def ensure_db_schema():
    """Safely adds missing evidence columns to existing SQLite database if needed."""
    try:
        from backend.app.models import Base
        Base.metadata.create_all(bind=engine)
        with engine.connect() as conn:
            from sqlalchemy import text
            res = conn.execute(text("PRAGMA table_info(complaint_evidence);")).fetchall()
            existing_cols = {row[1] for row in res}
            if existing_cols:
                if "timestamp_review_status" not in existing_cols:
                    conn.execute(text("ALTER TABLE complaint_evidence ADD COLUMN timestamp_review_status VARCHAR(64) DEFAULT 'TIMESTAMP_UNAVAILABLE';"))
                if "location_review_details" not in existing_cols:
                    conn.execute(text("ALTER TABLE complaint_evidence ADD COLUMN location_review_details TEXT;"))
                if "timestamp_review_details" not in existing_cols:
                    conn.execute(text("ALTER TABLE complaint_evidence ADD COLUMN timestamp_review_details TEXT;"))
                conn.commit()
    except Exception:
        pass


# Run safe schema check on module load
ensure_db_schema()


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency for database session lifecycle."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
