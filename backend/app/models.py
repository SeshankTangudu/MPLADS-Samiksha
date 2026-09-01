"""SQLAlchemy Database Models for MPLADS Samiksha (Frozen Contract).

Implements the 6 tables specified in docs/contracts/db_contract.md:
- mps
- districts
- projects (Constituency Allocations)
- risk_scores
- risk_flags
- analytics_cache
"""

from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    Integer,
    Float,
    String,
    Text,
    ForeignKey,
    Index,
    DateTime
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


class MP(Base):
    """Member of Parliament profile entity."""
    __tablename__ = "mps"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(128), nullable=False)
    house = Column(String(32), nullable=False, default="Lok Sabha")
    state = Column(String(64), nullable=False)
    constituency = Column(String(64), nullable=False)
    total_allocations = Column(Integer, nullable=False, default=0)
    total_sanctioned = Column(Float, nullable=False, default=0.0)
    total_expenditure = Column(Float, nullable=False, default=0.0)

    # Relationships
    projects = relationship("Project", back_populates="mp", cascade="all, delete-orphan")


class District(Base):
    """District administrative and geographic centroid entity."""
    __tablename__ = "districts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    state = Column(String(64), nullable=False)
    district_name = Column(String(64), nullable=False)
    clean_district_name = Column(String(64), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    total_allocations = Column(Integer, nullable=False, default=0)
    flagged_allocations = Column(Integer, nullable=False, default=0)

    # Relationships
    projects = relationship("Project", back_populates="district_rel", cascade="all, delete-orphan")


class Project(Base):
    """Constituency-Level Parliamentary Term Work & Fund Allocation Record."""
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, autoincrement=True)
    source_record_id = Column(String(32), unique=True, nullable=False, index=True)
    source_dataset = Column(String(64), nullable=False)
    mp_id = Column(Integer, ForeignKey("mps.id"), nullable=False, index=True)
    district_id = Column(Integer, ForeignKey("districts.id"), nullable=False, index=True)
    house = Column(String(32), nullable=False, default="Lok Sabha")
    lok_sabha_term = Column(Integer, nullable=False)
    mp_name = Column(String(128), nullable=False)
    state = Column(String(64), nullable=False, index=True)
    district = Column(String(64), nullable=False)
    constituency = Column(String(64), nullable=False)
    category = Column(String(64), nullable=False)
    description = Column(Text, nullable=False)
    sanction_date = Column(String(10), nullable=False)
    completion_date = Column(String(10), nullable=False, default="")
    sanctioned_cost = Column(Float, nullable=False, default=0.0)
    expenditure = Column(Float, nullable=False, default=0.0)
    entitlement = Column(Float, nullable=False, default=0.0)
    released_amount = Column(Float, nullable=False, default=0.0)
    unspent_balance = Column(Float, nullable=False, default=0.0)
    status = Column(String(32), nullable=False)
    pending_reason = Column(Text, nullable=False, default="")
    has_reasons_flag = Column(Integer, nullable=False, default=0)

    # Relationships
    mp = relationship("MP", back_populates="projects")
    district_rel = relationship("District", back_populates="projects")
    risk_score = relationship("RiskScore", back_populates="project", uselist=False, cascade="all, delete-orphan")
    risk_flags = relationship("RiskFlag", back_populates="project", cascade="all, delete-orphan")


class RiskScore(Base):
    """Offline calculated composite risk score (1:1 with Project)."""
    __tablename__ = "risk_scores"

    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(Integer, ForeignKey("projects.id"), unique=True, nullable=False, index=True)
    total_score = Column(Float, nullable=False)
    risk_level = Column(String(16), nullable=False, index=True)
    financial_score = Column(Float, nullable=False, default=0.0)
    timeline_score = Column(Float, nullable=False, default=0.0)
    data_quality_score = Column(Float, nullable=False, default=0.0)
    geographic_score = Column(Float, nullable=False, default=0.0)
    computed_at = Column(String(32), nullable=False)

    # Relationships
    project = relationship("Project", back_populates="risk_score")


class RiskFlag(Base):
    """Explainable anomaly signal reason item (1:N with Project)."""
    __tablename__ = "risk_flags"

    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    flag_type = Column(String(32), nullable=False)
    severity = Column(String(16), nullable=False)
    title = Column(String(128), nullable=False)
    observed_value = Column(String(64), nullable=False)
    baseline_value = Column(String(64), nullable=False)
    threshold_value = Column(String(64), nullable=False)
    explanation = Column(Text, nullable=False)

    # Relationships
    project = relationship("Project", back_populates="risk_flags")


class AnalyticsCache(Base):
    """Pre-aggregated JSON analytics view cache."""
    __tablename__ = "analytics_cache"

    id = Column(Integer, primary_key=True, autoincrement=True)
    cache_key = Column(String(64), unique=True, nullable=False, index=True)
    payload_json = Column(Text, nullable=False)
    updated_at = Column(String(32), nullable=False)


# Compound & Additional Indexes per Frozen Contract §3
Index("idx_projects_category_status", Project.category, Project.status)
Index("idx_risk_scores_total_score", RiskScore.total_score.desc())
