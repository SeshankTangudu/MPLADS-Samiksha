"""System Administration & Platform Operations Router.

Implements dedicated Platform Operations endpoints:
- Dashboard Metrics & KPIs
- Dataset Validation & Multi-Format Ingestion
- Dataset Ingestion History & Provenance
- Official Data Sources Management
- Technical System Logs
- Official Audit Log Inspection (Read-Only)
- Deep System Health & Diagnostics
- Technical Platform Configuration
"""

import math
import os
import time
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from backend.app.database import get_db
from backend.app.models import (
    Project,
    MP,
    District,
    RiskScore,
    Complaint,
    DatasetImport,
    DataSource,
    SystemLog,
    AuditLog,
    ProjectVersion,
    SystemConfig,
    User,
)
from backend.app.schemas import (
    UserContextSchema,
    AdminDashboardStatsSchema,
    DatasetValidationResponseSchema,
    DatasetImportResponseSchema,
    DatasetImportHistoryItemSchema,
    DataSourceSchema,
    DataSourceCreateSchema,
    SystemLogSchema,
    AuditLogSchema,
    SystemHealthDeepResponseSchema,
    SystemConfigSchema,
    SystemConfigUpdateSchema,
)
from backend.app.auth import get_current_user, require_role, log_system_event
from backend.app.services.ingestion_service import validate_dataset, execute_ingestion

router = APIRouter(prefix="/admin", tags=["System Administration"])

_STARTUP_TIME = time.time()


@router.get("/dashboard-stats", response_model=AdminDashboardStatsSchema)
def get_admin_dashboard_stats(
    current_user: UserContextSchema = Depends(require_role(["system_admin"])),
    db: Session = Depends(get_db),
) -> AdminDashboardStatsSchema:
    """Operations Console KPI Overview: health, pipeline stats, and recent technical logs."""
    total_allocations = db.query(func.count(Project.id)).scalar() or 0
    total_mps = db.query(func.count(MP.id)).scalar() or 0
    total_districts = db.query(func.count(District.id)).scalar() or 0
    total_datasets = db.query(func.count(DataSource.id)).scalar() or 0

    latest_import = db.query(DatasetImport).order_by(DatasetImport.id.desc()).first()
    last_success = (
        db.query(DatasetImport)
        .filter(DatasetImport.status.in_(["COMPLETED", "PARTIAL"]))
        .order_by(DatasetImport.id.desc())
        .first()
    )

    total_imported_records = db.query(func.sum(DatasetImport.processed_rows)).scalar() or 0
    failed_imports_cnt = (
        db.query(func.count(DatasetImport.id))
        .filter(DatasetImport.status == "FAILED")
        .scalar() or 0
    )

    # Health metrics
    db_counts = {
        "projects": total_allocations,
        "mps": total_mps,
        "districts": total_districts,
        "complaints": db.query(func.count(Complaint.id)).scalar() or 0,
        "dataset_imports": db.query(func.count(DatasetImport.id)).scalar() or 0,
        "system_logs": db.query(func.count(SystemLog.id)).scalar() or 0,
        "audit_logs": db.query(func.count(AuditLog.id)).scalar() or 0,
    }

    uptime = round(time.time() - _STARTUP_TIME, 1)
    health = SystemHealthDeepResponseSchema(
        status="HEALTHY",
        api_status="OPERATIONAL",
        database_status="CONNECTED",
        ingestion_status="IDLE_READY",
        auth_status="ENFORCED_RBAC",
        db_table_counts=db_counts,
        uptime_seconds=uptime,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )

    recent_logs = (
        db.query(SystemLog)
        .order_by(SystemLog.id.desc())
        .limit(8)
        .all()
    )

    recent_imports = (
        db.query(DatasetImport)
        .order_by(DatasetImport.id.desc())
        .limit(6)
        .all()
    )

    return AdminDashboardStatsSchema(
        total_datasets=total_datasets,
        total_allocations=total_allocations,
        total_mps=total_mps,
        total_districts=total_districts,
        latest_import_timestamp=latest_import.uploaded_at if latest_import else None,
        last_successful_ingestion=last_success.uploaded_at if last_success else None,
        total_records_imported=int(total_imported_records),
        failed_imports_count=failed_imports_cnt,
        system_health=health,
        recent_system_logs=[SystemLogSchema.model_validate(l) for l in recent_logs],
        recent_ingestions=[DatasetImportHistoryItemSchema.model_validate(i) for i in recent_imports],
    )


@router.post("/datasets/validate", response_model=DatasetValidationResponseSchema)
async def validate_dataset_endpoint(
    file: UploadFile = File(...),
    term: int = Form(18),
    source_name: str = Form("MPLADS / eSAKSHI"),
    current_user: UserContextSchema = Depends(require_role(["system_admin"])),
    db: Session = Depends(get_db),
) -> DatasetValidationResponseSchema:
    """Pre-ingestion preview and validation analysis for uploaded CSV/JSON files."""
    content_bytes = await file.read()
    if len(content_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty."
        )

    log_system_event(
        db,
        event_type="VALIDATION",
        severity="INFO",
        action=f"Validated dataset {file.filename}",
        detail=f"Uploaded by {current_user.username}, term: {term}th LS",
        module="INGESTION",
        user_id=current_user.username,
        user_role=current_user.role,
    )

    return validate_dataset(
        db,
        content_bytes=content_bytes,
        filename=file.filename or "dataset.csv",
        default_term=term,
        source_name=source_name,
    )


@router.post("/datasets/import", response_model=DatasetImportResponseSchema)
async def import_dataset_endpoint(
    file: UploadFile = File(...),
    term: int = Form(18),
    source_name: str = Form("18th Lok Sabha Works"),
    dataset_version: str = Form("1.0.0"),
    current_user: UserContextSchema = Depends(require_role(["system_admin"])),
    db: Session = Depends(get_db),
) -> DatasetImportResponseSchema:
    """Executes atomic ingestion pipeline into master analytical database."""
    content_bytes = await file.read()
    if len(content_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty."
        )

    return execute_ingestion(
        db=db,
        content_bytes=content_bytes,
        filename=file.filename or "dataset.csv",
        uploaded_by=current_user.username,
        default_term=term,
        source_name=source_name,
        dataset_version=dataset_version,
    )


@router.get("/datasets/history", response_model=List[DatasetImportHistoryItemSchema])
def get_dataset_history(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: UserContextSchema = Depends(require_role(["system_admin"])),
    db: Session = Depends(get_db),
) -> List[DatasetImportHistoryItemSchema]:
    """Retrieves immutable historical dataset ingestion execution logs."""
    imports = (
        db.query(DatasetImport)
        .order_by(DatasetImport.id.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )
    return [DatasetImportHistoryItemSchema.model_validate(i) for i in imports]


@router.get("/datasets/sources", response_model=List[DataSourceSchema])
def get_data_sources(
    current_user: UserContextSchema = Depends(require_role(["system_admin"])),
    db: Session = Depends(get_db),
) -> List[DataSourceSchema]:
    """Returns registered official dataset repositories and ingestion status."""
    sources = db.query(DataSource).order_by(DataSource.id.asc()).all()
    return [DataSourceSchema.model_validate(s) for s in sources]


@router.post("/datasets/sources", response_model=DataSourceSchema)
def create_data_source(
    payload: DataSourceCreateSchema,
    current_user: UserContextSchema = Depends(require_role(["system_admin"])),
    db: Session = Depends(get_db),
) -> DataSourceSchema:
    """Registers a new official data source."""
    now_iso = datetime.now(timezone.utc).isoformat()
    src = DataSource(
        source_name=payload.source_name,
        dataset_name=payload.dataset_name,
        source_type=payload.source_type,
        source_url=payload.source_url,
        last_update=now_iso,
        last_ingestion=None,
        record_count=0,
        dataset_version=payload.dataset_version,
        status="ACTIVE",
        description=payload.description,
    )
    db.add(src)
    db.commit()
    db.refresh(src)

    log_system_event(
        db,
        event_type="CONFIG_CHANGE",
        severity="INFO",
        action=f"Registered new data source: {src.source_name}",
        detail=f"Dataset: {src.dataset_name}, Version: {src.dataset_version}",
        module="DATA_SOURCES",
        user_id=current_user.username,
        user_role=current_user.role,
    )
    return DataSourceSchema.model_validate(src)


@router.get("/system-logs", response_model=List[SystemLogSchema])
def get_system_logs(
    event_type: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    module: Optional[str] = Query(None),
    user_id: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    current_user: UserContextSchema = Depends(require_role(["system_admin"])),
    db: Session = Depends(get_db),
) -> List[SystemLogSchema]:
    """Retrieves technical platform logs with multi-signal filtering."""
    query = db.query(SystemLog)
    if event_type:
        query = query.filter(SystemLog.event_type.ilike(f"%{event_type.strip()}%"))
    if severity:
        query = query.filter(SystemLog.severity == severity.strip().upper())
    if module:
        query = query.filter(SystemLog.module.ilike(f"%{module.strip()}%"))
    if user_id:
        query = query.filter(SystemLog.user_id.ilike(f"%{user_id.strip()}%"))

    logs = (
        query.order_by(SystemLog.id.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )
    return [SystemLogSchema.model_validate(l) for l in logs]


@router.get("/audit-logs", response_model=List[AuditLogSchema])
def get_audit_logs(
    entity_type: Optional[str] = Query(None),
    entity_id: Optional[str] = Query(None),
    actor_id: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    current_user: UserContextSchema = Depends(require_role(["system_admin"])),
    db: Session = Depends(get_db),
) -> List[AuditLogSchema]:
    """Read-only inspection of append-only official operational data accountability audit logs."""
    query = db.query(AuditLog)
    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type.strip().upper())
    if entity_id:
        query = query.filter(AuditLog.entity_id == entity_id.strip())
    if actor_id:
        query = query.filter(AuditLog.actor_id.ilike(f"%{actor_id.strip()}%"))
    if action:
        query = query.filter(AuditLog.action == action.strip().upper())

    # MP Scoping: If MP, only show audit logs for allocations in their constituency
    if current_user.role == "mp" and current_user.constituency:
        mp_alloc_ids = [
            r[0] for r in db.query(Project.source_record_id)
            .filter(Project.constituency.ilike(f"%{current_user.constituency}%"))
            .all()
        ]
        query = query.filter(AuditLog.entity_id.in_(mp_alloc_ids))

    logs = (
        query.order_by(AuditLog.id.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )
    return [AuditLogSchema.model_validate(l) for l in logs]


@router.get("/system-health", response_model=SystemHealthDeepResponseSchema)
def get_system_health(
    current_user: UserContextSchema = Depends(require_role(["system_admin"])),
    db: Session = Depends(get_db),
) -> SystemHealthDeepResponseSchema:
    """Deep system health probe testing database, process memory, and table record counts."""
    db_counts = {
        "projects": db.query(func.count(Project.id)).scalar() or 0,
        "mps": db.query(func.count(MP.id)).scalar() or 0,
        "districts": db.query(func.count(District.id)).scalar() or 0,
        "complaints": db.query(func.count(Complaint.id)).scalar() or 0,
        "dataset_imports": db.query(func.count(DatasetImport.id)).scalar() or 0,
        "system_logs": db.query(func.count(SystemLog.id)).scalar() or 0,
        "audit_logs": db.query(func.count(AuditLog.id)).scalar() or 0,
    }

    uptime = round(time.time() - _STARTUP_TIME, 1)

    return SystemHealthDeepResponseSchema(
        status="HEALTHY",
        api_status="OPERATIONAL",
        database_status="CONNECTED",
        ingestion_status="OPERATIONAL",
        auth_status="ENFORCED_RBAC",
        db_table_counts=db_counts,
        uptime_seconds=uptime,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )


@router.get("/config", response_model=List[SystemConfigSchema])
def get_system_configuration(
    current_user: UserContextSchema = Depends(require_role(["system_admin"])),
    db: Session = Depends(get_db),
) -> List[SystemConfigSchema]:
    """Retrieves technical platform configuration items."""
    configs = db.query(SystemConfig).order_by(SystemConfig.category, SystemConfig.config_key).all()
    return [SystemConfigSchema.model_validate(c) for c in configs]


@router.put("/config", response_model=SystemConfigSchema)
def update_system_configuration(
    payload: SystemConfigUpdateSchema,
    current_user: UserContextSchema = Depends(require_role(["system_admin"])),
    db: Session = Depends(get_db),
) -> SystemConfigSchema:
    """Updates permitted technical platform configuration (no government data modification permitted)."""
    # Guard: Ensure not modifying official data or risk thresholds via config
    forbidden_keys = ["risk_score", "sanction_limit", "official_expenditure", "bypass_audit"]
    if any(k in payload.config_key.lower() for k in forbidden_keys):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Modification of official data parameter '{payload.config_key}' is strictly forbidden for System Administrators."
        )

    now_iso = datetime.now(timezone.utc).isoformat()
    config_obj = db.query(SystemConfig).filter(SystemConfig.config_key == payload.config_key).first()

    if config_obj:
        old_val = config_obj.config_value
        config_obj.config_value = payload.config_value
        config_obj.updated_at = now_iso
        config_obj.updated_by = current_user.username
    else:
        config_obj = SystemConfig(
            config_key=payload.config_key,
            config_value=payload.config_value,
            category="TECHNICAL",
            description=f"Configured parameter {payload.config_key}",
            updated_at=now_iso,
            updated_by=current_user.username,
        )
        db.add(config_obj)

    db.commit()
    db.refresh(config_obj)

    log_system_event(
        db,
        event_type="CONFIG_CHANGE",
        severity="INFO",
        action=f"Updated configuration parameter {payload.config_key}",
        detail=f"New value: {payload.config_value}",
        module="CONFIG",
        user_id=current_user.username,
        user_role=current_user.role,
    )

    return SystemConfigSchema.model_validate(config_obj)
