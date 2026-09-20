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
    """Safely creates all database tables and populates default platform metadata if needed."""
    try:
        from backend.app.models import Base, DataSource, User, SystemConfig, Project
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

        # Seed initial data sources and configuration if not yet populated
        db = SessionLocal()
        try:
            now_iso = "2026-09-01T00:00:00Z"
            total_proj = db.query(Project).count()

            # 1. Data Sources
            if db.query(DataSource).count() == 0:
                sources = [
                    DataSource(
                        source_name="eSAKSHI Official Portal",
                        dataset_name="17th Lok Sabha Works & Allocations",
                        source_type="CSV / MoSPI Official",
                        source_url="https://esakshi.mospi.gov.in",
                        last_update="2024-05-30T12:00:00Z",
                        last_ingestion="2026-09-01T23:14:00Z",
                        record_count=total_proj or 1675,
                        dataset_version="1.0.0",
                        status="ACTIVE",
                        description="Validated official MPLADS works and allocations for 15th, 16th and 17th Lok Sabha.",
                    ),
                    DataSource(
                        source_name="MPLADS Historical Archive",
                        dataset_name="15th & 16th Lok Sabha Longitudinal Archive",
                        source_type="CSV",
                        source_url="https://mplads.gov.in",
                        last_update="2019-05-23T12:00:00Z",
                        last_ingestion="2026-09-01T23:14:00Z",
                        record_count=total_proj or 1675,
                        dataset_version="1.0.0",
                        status="ACTIVE",
                        description="Historical parliamentary term reference works for multi-signal empirical trajectory analysis.",
                    ),
                    DataSource(
                        source_name="18th Lok Sabha Ingestion Pipeline",
                        dataset_name="18th Lok Sabha Recommended Works (eSAKSHI Feed)",
                        source_type="CSV / Ingestion Service",
                        source_url="https://esakshi.mospi.gov.in",
                        last_update=now_iso,
                        last_ingestion=None,
                        record_count=0,
                        dataset_version="2.0.0",
                        status="ACTIVE",
                        description="Active dataset target pipeline configured for continuous ingestion of 18th Lok Sabha works.",
                    ),
                ]
                for s in sources:
                    db.add(s)

            # 2. System Configurations
            if db.query(SystemConfig).count() == 0:
                configs = [
                    SystemConfig(config_key="ingestion.batch_size", config_value="5000", category="INGESTION", description="Max batch size for file ingestion transactions", updated_at=now_iso, updated_by="system"),
                    SystemConfig(config_key="platform.maintenance_mode", config_value="false", category="PLATFORM", description="Toggle public maintenance mode window", updated_at=now_iso, updated_by="system"),
                    SystemConfig(config_key="security.enforce_constituency_isolation", config_value="true", category="SECURITY", description="Enforce strict MP constituency write boundaries", updated_at=now_iso, updated_by="system"),
                    SystemConfig(config_key="diagnostics.log_retention_days", config_value="90", category="LOGGING", description="Technical system logs retention period in days", updated_at=now_iso, updated_by="system"),
                    SystemConfig(config_key="features.18th_lok_sabha_ready", config_value="true", category="FEATURES", description="Enable 18th Lok Sabha schema mapping & ingestion engine", updated_at=now_iso, updated_by="system"),
                ]
                for c in configs:
                    db.add(c)

            # 3. Demo Users
            if db.query(User).count() == 0:
                from backend.app.auth import DEMO_USERS
                for u in DEMO_USERS.values():
                    db.add(
                        User(
                            id=u["id"],
                            username=u["username"],
                            full_name=u["full_name"],
                            role=u["role"],
                            constituency=u.get("constituency"),
                            state=u.get("state"),
                            email=u.get("email"),
                            created_at=now_iso,
                            is_active=1,
                        )
                    )

            db.commit()
        except Exception:
            db.rollback()
        finally:
            db.close()
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
