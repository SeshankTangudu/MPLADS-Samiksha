"""Dataset Ingestion & Validation Pipeline Service.

Supports multi-format ingestion (CSV, JSON) for MPLADS datasets,
including 15th, 16th, 17th, and future 18th Lok Sabha allocations.
Performs schema mapping, duplicate detection, numeric validation,
and automatic baseline ML risk scoring.
"""

import os
import io
import csv
import json
import time
import secrets
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple
import pandas as pd
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.models import (
    Project,
    MP,
    District,
    RiskScore,
    RiskFlag,
    DatasetImport,
    DataSource,
    SystemLog,
)
from backend.app.schemas import (
    DatasetValidationResponseSchema,
    DatasetValidationItemError,
    DatasetImportResponseSchema,
)
from ml.risk_engine import evaluate_allocation, load_baselines

# Standard expected schema fields
REQUIRED_FIELDS = ["source_record_id", "sanctioned_cost", "state", "district"]

# Column mapping dictionary for varied government naming conventions
COLUMN_ALIASES = {
    "source_record_id": ["source_record_id", "record_id", "project_id", "work_id", "work_code", "id", "allocation_id"],
    "mp_name": ["mp_name", "mp", "member_name", "representative_name", "hon_mp_name", "mp_name_clean"],
    "house": ["house", "parliament_house", "chamber"],
    "lok_sabha_term": ["lok_sabha_term", "term", "ls_term", "session", "lok_sabha"],
    "state": ["state", "state_name", "st_name", "state_ut"],
    "district": ["district", "district_name", "dist_name", "nodal_district"],
    "constituency": ["constituency", "constituency_name", "const_name", "pc_name", "parliamentary_constituency"],
    "category": ["category", "sector", "work_category", "scheme_sector", "category_name"],
    "description": ["description", "work_description", "project_title", "title", "work_name", "nature_of_work"],
    "sanction_date": ["sanction_date", "sanctioned_date", "date_of_sanction", "approval_date"],
    "completion_date": ["completion_date", "completed_date", "date_of_completion", "actual_completion_date"],
    "sanctioned_cost": ["sanctioned_cost", "sanctioned_amount", "sanction_cost", "cost_crore", "amount_sanctioned", "cost"],
    "expenditure": ["expenditure", "expenditure_crore", "amount_spent", "actual_expenditure", "expenditure_amount", "spent"],
    "entitlement": ["entitlement", "annual_entitlement", "entitled_amount"],
    "released_amount": ["released_amount", "amount_released", "released_fund"],
    "unspent_balance": ["unspent_balance", "unspent_fund", "balance_amount"],
    "status": ["status", "work_status", "project_status", "implementation_status"],
    "pending_reason": ["pending_reason", "delay_reason", "reasons_for_delay", "remarks"],
}

_BASELINES_CACHE = None


def get_cached_baselines():
    global _BASELINES_CACHE
    if _BASELINES_CACHE is None:
        try:
            _BASELINES_CACHE = load_baselines()
        except Exception:
            _BASELINES_CACHE = {"cohorts": {}, "categories": {}, "global": {}}
    return _BASELINES_CACHE


def _normalize_column_name(col: str) -> str:
    return str(col).strip().lower().replace(" ", "_").replace("-", "_").replace(".", "_")


def detect_column_mappings(columns: List[str]) -> Tuple[Dict[str, str], List[str]]:
    """Maps detected columns from input file to standard internal schema fields."""
    normalized_input = {_normalize_column_name(c): c for c in columns}
    mapping = {}

    for standard_field, aliases in COLUMN_ALIASES.items():
        for alias in aliases:
            clean_alias = _normalize_column_name(alias)
            if clean_alias in normalized_input:
                mapping[standard_field] = normalized_input[clean_alias]
                break

    detected_standard = list(mapping.keys())
    return mapping, detected_standard


def parse_raw_dataset(content_bytes: bytes, filename: str) -> List[Dict[str, Any]]:
    """Parses uploaded file bytes into a list of row dictionaries."""
    fn_lower = filename.lower()
    if fn_lower.endswith(".json"):
        text = content_bytes.decode("utf-8-sig", errors="replace")
        data = json.loads(text)
        if isinstance(data, list):
            return data
        elif isinstance(data, dict) and "records" in data:
            return data["records"]
        elif isinstance(data, dict) and "data" in data:
            return data["data"]
        else:
            return [data]
    else:
        # Default CSV parser
        try:
            df = pd.read_csv(io.BytesIO(content_bytes), encoding="utf-8-sig", dtype=str)
        except UnicodeDecodeError:
            df = pd.read_csv(io.BytesIO(content_bytes), encoding="latin1", dtype=str)
        return df.to_dict(orient="records")


def validate_dataset(
    db: Session,
    content_bytes: bytes,
    filename: str,
    default_term: int = 18,
    source_name: str = "MPLADS / eSAKSHI",
) -> DatasetValidationResponseSchema:
    """Performs pre-ingestion structural and data integrity validation on uploaded dataset."""
    try:
        raw_rows = parse_raw_dataset(content_bytes, filename)
    except Exception as e:
        return DatasetValidationResponseSchema(
            is_valid=False,
            total_rows=0,
            valid_rows=0,
            rejected_rows=0,
            duplicate_rows=0,
            missing_required_fields_count=0,
            detected_columns=[],
            column_mapping={},
            preview_records=[],
            validation_errors=[
                DatasetValidationItemError(
                    row_number=0,
                    field="file",
                    rejected_value=filename,
                    error_type="PARSE_ERROR",
                    message=f"Failed to parse file: {str(e)}"
                )
            ],
            summary_message=f"File parse error: {str(e)}"
        )

    if not raw_rows:
        return DatasetValidationResponseSchema(
            is_valid=False,
            total_rows=0,
            valid_rows=0,
            rejected_rows=0,
            duplicate_rows=0,
            missing_required_fields_count=0,
            detected_columns=[],
            column_mapping={},
            preview_records=[],
            validation_errors=[
                DatasetValidationItemError(
                    row_number=0,
                    field="file",
                    rejected_value=filename,
                    error_type="EMPTY_DATASET",
                    message="Uploaded dataset contains no data rows."
                )
            ],
            summary_message="Uploaded dataset is empty."
        )

    detected_cols = list(raw_rows[0].keys())
    mapping, detected_standard = detect_column_mappings(detected_cols)

    # Check for missing critical mapping fields
    missing_critical = [rf for rf in REQUIRED_FIELDS if rf not in mapping]
    if missing_critical:
        return DatasetValidationResponseSchema(
            is_valid=False,
            total_rows=len(raw_rows),
            valid_rows=0,
            rejected_rows=len(raw_rows),
            duplicate_rows=0,
            missing_required_fields_count=len(raw_rows),
            detected_columns=detected_cols,
            column_mapping=mapping,
            preview_records=[],
            validation_errors=[
                DatasetValidationItemError(
                    row_number=0,
                    field=f,
                    rejected_value=None,
                    error_type="MISSING_COLUMN",
                    message=f"Required standard column '{f}' could not be identified from uploaded headers."
                )
                for f in missing_critical
            ],
            summary_message=f"Missing critical schema columns: {', '.join(missing_critical)}."
        )

    # Fetch existing IDs in database for duplicate detection
    existing_ids = set(r[0] for r in db.query(Project.source_record_id).all())

    seen_in_batch = set()
    errors: List[DatasetValidationItemError] = []
    valid_count = 0
    rejected_count = 0
    duplicate_count = 0
    missing_fields_count = 0
    preview_records: List[Dict[str, Any]] = []

    for idx, row in enumerate(raw_rows, start=1):
        row_errors = []

        # Extract mapped values
        src_id_col = mapping.get("source_record_id")
        src_id = str(row.get(src_id_col, "")).strip() if src_id_col else ""

        if not src_id or src_id.lower() in ["nan", "none", "null"]:
            row_errors.append(
                DatasetValidationItemError(
                    row_number=idx,
                    field="source_record_id",
                    rejected_value=src_id,
                    error_type="MISSING_REQUIRED_FIELD",
                    message="Allocation identifier (source_record_id) is empty or missing."
                )
            )
            missing_fields_count += 1
        else:
            if src_id in seen_in_batch or src_id in existing_ids:
                row_errors.append(
                    DatasetValidationItemError(
                        row_number=idx,
                        field="source_record_id",
                        rejected_value=src_id,
                        error_type="DUPLICATE_IDENTIFIER",
                        message=f"Duplicate allocation identifier '{src_id}' detected."
                    )
                )
                duplicate_count += 1
            else:
                seen_in_batch.add(src_id)

        # Validate sanctioned cost
        sc_col = mapping.get("sanctioned_cost")
        sc_raw = row.get(sc_col, 0)
        try:
            sc_val = float(sc_raw) if pd.notnull(sc_raw) and str(sc_raw).strip() != "" else 0.0
            if sc_val < 0.0:
                row_errors.append(
                    DatasetValidationItemError(
                        row_number=idx,
                        field="sanctioned_cost",
                        rejected_value=str(sc_raw),
                        error_type="NEGATIVE_FINANCIAL_VALUE",
                        message="Sanctioned cost cannot be negative."
                    )
                )
        except (ValueError, TypeError):
            row_errors.append(
                DatasetValidationItemError(
                    row_number=idx,
                    field="sanctioned_cost",
                    rejected_value=str(sc_raw),
                    error_type="INVALID_DATA_TYPE",
                    message=f"Invalid numeric format for sanctioned cost: '{sc_raw}'."
                )
            )

        # Validate expenditure
        exp_col = mapping.get("expenditure")
        exp_raw = row.get(exp_col, 0)
        if exp_col and pd.notnull(exp_raw) and str(exp_raw).strip() != "":
            try:
                exp_val = float(exp_raw)
                if exp_val < 0.0:
                    row_errors.append(
                        DatasetValidationItemError(
                            row_number=idx,
                            field="expenditure",
                            rejected_value=str(exp_raw),
                            error_type="NEGATIVE_FINANCIAL_VALUE",
                            message="Expenditure amount cannot be negative."
                        )
                    )
            except (ValueError, TypeError):
                row_errors.append(
                    DatasetValidationItemError(
                        row_number=idx,
                        field="expenditure",
                        rejected_value=str(exp_raw),
                        error_type="INVALID_DATA_TYPE",
                        message=f"Invalid numeric format for expenditure: '{exp_raw}'."
                    )
                )

        # Validate state and district
        st_col = mapping.get("state")
        st_val = str(row.get(st_col, "")).strip() if st_col else ""
        if not st_val or st_val.lower() in ["nan", "none", "null"]:
            row_errors.append(
                DatasetValidationItemError(
                    row_number=idx,
                    field="state",
                    rejected_value=st_val,
                    error_type="MISSING_REQUIRED_FIELD",
                    message="State name is required."
                )
            )
            missing_fields_count += 1

        dist_col = mapping.get("district")
        dist_val = str(row.get(dist_col, "")).strip() if dist_col else ""
        if not dist_val or dist_val.lower() in ["nan", "none", "null"]:
            row_errors.append(
                DatasetValidationItemError(
                    row_number=idx,
                    field="district",
                    rejected_value=dist_val,
                    error_type="MISSING_REQUIRED_FIELD",
                    message="District name is required."
                )
            )
            missing_fields_count += 1

        if row_errors:
            rejected_count += 1
            errors.extend(row_errors)
        else:
            valid_count += 1
            if len(preview_records) < 5:
                # Build preview dict
                preview_records.append({
                    "source_record_id": src_id,
                    "mp_name": str(row.get(mapping.get("mp_name", ""), "Unknown MP")).strip(),
                    "constituency": str(row.get(mapping.get("constituency", ""), "")).strip(),
                    "state": st_val,
                    "district": dist_val,
                    "category": str(row.get(mapping.get("category", ""), "Infrastructure & Public Amenities")).strip(),
                    "sanctioned_cost": sc_raw,
                    "expenditure": exp_raw,
                    "status": str(row.get(mapping.get("status", ""), "In Progress")).strip(),
                    "lok_sabha_term": default_term,
                })

    is_valid = (valid_count > 0 and len(errors) == 0)

    summary_msg = (
        f"Validation Complete: {len(raw_rows)} total rows examined. "
        f"{valid_count} valid, {rejected_count} rejected "
        f"({duplicate_count} duplicate IDs, {missing_fields_count} missing required fields)."
    )

    return DatasetValidationResponseSchema(
        is_valid=is_valid,
        total_rows=len(raw_rows),
        valid_rows=valid_count,
        rejected_rows=rejected_count,
        duplicate_rows=duplicate_count,
        missing_required_fields_count=missing_fields_count,
        detected_columns=detected_cols,
        column_mapping=mapping,
        preview_records=preview_records,
        validation_errors=errors[:100],  # Return up to first 100 errors for UI display
        summary_message=summary_msg
    )


def execute_ingestion(
    db: Session,
    content_bytes: bytes,
    filename: str,
    uploaded_by: str,
    default_term: int = 18,
    source_name: str = "MPLADS / eSAKSHI",
    dataset_version: str = "1.0.0",
) -> DatasetImportResponseSchema:
    """Executes atomic dataset ingestion pipeline with automatic baseline risk evaluation."""
    start_time = time.time()
    import_id = f"IMP-{default_term}LS-{secrets.token_hex(4).upper()}"
    now_iso = datetime.now(timezone.utc).isoformat()

    validation = validate_dataset(db, content_bytes, filename, default_term=default_term, source_name=source_name)

    if validation.valid_rows == 0:
        duration = round(time.time() - start_time, 3)
        imp_log = DatasetImport(
            import_id=import_id,
            dataset_name=f"{source_name} ({default_term}th Lok Sabha)",
            source=source_name,
            source_url="https://mplads.gov.in",
            filename=filename,
            uploaded_by=uploaded_by,
            uploaded_at=now_iso,
            total_rows=validation.total_rows,
            processed_rows=0,
            rejected_rows=validation.rejected_rows,
            duplicate_rows=validation.duplicate_rows,
            validation_errors_json=json.dumps([e.model_dump() for e in validation.validation_errors[:20]]),
            duration_seconds=duration,
            status="FAILED",
            dataset_version=dataset_version,
            lok_sabha_term=default_term,
        )
        db.add(imp_log)
        db.commit()
        return DatasetImportResponseSchema(
            import_id=import_id,
            dataset_name=imp_log.dataset_name,
            status="FAILED",
            total_rows=validation.total_rows,
            processed_rows=0,
            rejected_rows=validation.rejected_rows,
            duplicate_rows=validation.duplicate_rows,
            duration_seconds=duration,
            dataset_version=dataset_version,
            lok_sabha_term=default_term,
            created_at=now_iso,
            message=f"Ingestion rejected: {validation.summary_message}"
        )

    raw_rows = parse_raw_dataset(content_bytes, filename)
    mapping = validation.column_mapping
    baselines = get_cached_baselines()

    # Pre-cache MPs and Districts for fast lookup/creation
    existing_mps = {
        (m.name.strip().lower(), (m.constituency or "").strip().lower()): m.id
        for m in db.query(MP).all()
    }
    existing_districts = {
        (d.state.strip().lower(), d.district_name.strip().lower()): d.id
        for d in db.query(District).all()
    }
    existing_ids = set(r[0] for r in db.query(Project.source_record_id).all())

    inserted_count = 0
    rejected_count = 0
    duplicate_count = 0
    batch_seen_ids = set()

    mp_stats_delta = {}  # mp_id -> [alloc_count, sanctioned, expenditure]
    district_stats_delta = {}  # district_id -> alloc_count

    for row in raw_rows:
        src_id_col = mapping.get("source_record_id")
        src_id = str(row.get(src_id_col, "")).strip() if src_id_col else ""

        if not src_id or src_id in existing_ids or src_id in batch_seen_ids:
            if src_id in existing_ids or src_id in batch_seen_ids:
                duplicate_count += 1
            rejected_count += 1
            continue

        st_col = mapping.get("state")
        st_val = str(row.get(st_col, "")).strip() if st_col else ""

        dist_col = mapping.get("district")
        dist_val = str(row.get(dist_col, "")).strip() if dist_col else ""

        if not st_val or not dist_val:
            rejected_count += 1
            continue

        try:
            sc_val = float(row.get(mapping.get("sanctioned_cost", ""), 0) or 0.0)
            exp_val = float(row.get(mapping.get("expenditure", ""), 0) or 0.0)
            if sc_val < 0 or exp_val < 0:
                rejected_count += 1
                continue
        except (ValueError, TypeError):
            rejected_count += 1
            continue

        batch_seen_ids.add(src_id)

        mp_name_val = str(row.get(mapping.get("mp_name", ""), "Honorable Member")).strip()
        const_val = str(row.get(mapping.get("constituency", ""), "")).strip()
        house_val = str(row.get(mapping.get("house", ""), "Lok Sabha")).strip()
        category_val = str(row.get(mapping.get("category", ""), "Infrastructure & Public Amenities")).strip()
        desc_val = str(row.get(mapping.get("description", ""), f"MPLADS Allocation {src_id}")).strip()
        sanction_date_val = str(row.get(mapping.get("sanction_date", ""), "2024-06-01")).strip()
        comp_date_val = str(row.get(mapping.get("completion_date", ""), "")).strip()
        status_val = str(row.get(mapping.get("status", ""), "In Progress")).strip()
        pending_reason_val = str(row.get(mapping.get("pending_reason", ""), "")).strip()

        unspent_val = round(max(0.0, sc_val - exp_val), 2)
        has_reasons_flag = 1 if (status_val.upper() in ["DELAYED", "PENDING", "STALLED"] or pending_reason_val) else 0

        # Resolve MP
        mp_key = (mp_name_val.lower(), const_val.lower())
        mp_id = existing_mps.get(mp_key)
        if not mp_id:
            new_mp = MP(
                name=mp_name_val,
                house=house_val,
                state=st_val,
                constituency=const_val,
                total_allocations=0,
                total_sanctioned=0.0,
                total_expenditure=0.0,
            )
            db.add(new_mp)
            db.flush()
            mp_id = new_mp.id
            existing_mps[mp_key] = mp_id

        # Resolve District
        dist_key = (st_val.lower(), dist_val.lower())
        dist_id = existing_districts.get(dist_key)
        if not dist_id:
            new_dist = District(
                state=st_val,
                district_name=dist_val,
                clean_district_name=dist_val,
                latitude=20.5937,
                longitude=78.9629,
                total_allocations=0,
                flagged_allocations=0,
            )
            db.add(new_dist)
            db.flush()
            dist_id = new_dist.id
            existing_districts[dist_key] = dist_id

        # Track aggregation deltas
        if mp_id not in mp_stats_delta:
            mp_stats_delta[mp_id] = [0, 0.0, 0.0]
        mp_stats_delta[mp_id][0] += 1
        mp_stats_delta[mp_id][1] += sc_val
        mp_stats_delta[mp_id][2] += exp_val

        district_stats_delta[dist_id] = district_stats_delta.get(dist_id, 0) + 1

        # Instantiate Project
        proj = Project(
            source_record_id=src_id,
            source_dataset=f"{source_name} ({default_term}th Lok Sabha)",
            mp_id=mp_id,
            district_id=dist_id,
            house=house_val,
            lok_sabha_term=default_term,
            mp_name=mp_name_val,
            state=st_val,
            district=dist_val,
            constituency=const_val,
            category=category_val,
            description=desc_val,
            sanction_date=sanction_date_val,
            completion_date=comp_date_val,
            sanctioned_cost=sc_val,
            expenditure=exp_val,
            entitlement=sc_val,
            released_amount=sc_val,
            unspent_balance=unspent_val,
            status=status_val,
            pending_reason=pending_reason_val,
            has_reasons_flag=has_reasons_flag,
        )
        db.add(proj)
        db.flush()

        # Compute baseline ML risk score deterministically
        rec_dict = {
            "category": category_val,
            "state": st_val,
            "expenditure": exp_val,
            "sanctioned_cost": sc_val,
            "unspent_balance": unspent_val,
            "status": status_val,
            "lok_sabha_term": default_term,
            "pending_reason": pending_reason_val,
        }
        eval_res = evaluate_allocation(rec_dict, baselines)

        r_score = RiskScore(
            project_id=proj.id,
            total_score=eval_res["total_score"],
            risk_level=eval_res["risk_level"],
            financial_score=eval_res["financial_score"],
            timeline_score=eval_res["timeline_score"],
            data_quality_score=eval_res["data_quality_score"],
            geographic_score=eval_res["geographic_score"],
            computed_at=now_iso,
        )
        db.add(r_score)

        for flag in eval_res["flags"]:
            r_flag = RiskFlag(
                project_id=proj.id,
                flag_type=flag["flag_type"],
                severity=flag["severity"],
                title=flag["title"],
                observed_value=str(flag["observed_value"]),
                baseline_value=str(flag["baseline_value"]),
                threshold_value=str(flag["threshold_value"]),
                explanation=flag["explanation"],
            )
            db.add(r_flag)

        inserted_count += 1

    # Update MP and District aggregate totals
    for m_id, deltas in mp_stats_delta.items():
        mp_obj = db.query(MP).filter(MP.id == m_id).first()
        if mp_obj:
            mp_obj.total_allocations += deltas[0]
            mp_obj.total_sanctioned = round(mp_obj.total_sanctioned + deltas[1], 2)
            mp_obj.total_expenditure = round(mp_obj.total_expenditure + deltas[2], 2)

    for d_id, delta_count in district_stats_delta.items():
        dist_obj = db.query(District).filter(District.id == d_id).first()
        if dist_obj:
            dist_obj.total_allocations += delta_count

    duration = round(time.time() - start_time, 3)
    final_status = "COMPLETED" if rejected_count == 0 else ("PARTIAL" if inserted_count > 0 else "FAILED")

    # Ingestion Log Entry
    imp_log = DatasetImport(
        import_id=import_id,
        dataset_name=f"{source_name} ({default_term}th Lok Sabha)",
        source=source_name,
        source_url="https://mplads.gov.in",
        filename=filename,
        uploaded_by=uploaded_by,
        uploaded_at=now_iso,
        total_rows=len(raw_rows),
        processed_rows=inserted_count,
        rejected_rows=rejected_count,
        duplicate_rows=duplicate_count,
        validation_errors_json=json.dumps([e.model_dump() for e in validation.validation_errors[:20]]),
        duration_seconds=duration,
        status=final_status,
        dataset_version=dataset_version,
        lok_sabha_term=default_term,
    )
    db.add(imp_log)

    # Technical System Log Entry
    sys_log = SystemLog(
        log_id=f"SYSLOG-{secrets.token_hex(4).upper()}",
        event_type="IMPORT_COMPLETED" if final_status == "COMPLETED" else "IMPORT_PARTIAL",
        severity="INFO" if final_status == "COMPLETED" else "WARNING",
        user_id=uploaded_by,
        user_role="system_admin",
        module="INGESTION",
        action=f"Ingested {inserted_count} allocation records from {filename}",
        detail=f"Import ID: {import_id}, Term: {default_term}th LS, Duration: {duration}s, Rejected: {rejected_count}",
        ip_address="127.0.0.1",
        timestamp=now_iso,
    )
    db.add(sys_log)

    # Update or add DataSource record
    data_src = db.query(DataSource).filter(
        DataSource.source_name == source_name,
        DataSource.dataset_name.ilike(f"%{default_term}th Lok Sabha%")
    ).first()
    if data_src:
        data_src.last_ingestion = now_iso
        data_src.record_count += inserted_count
        data_src.dataset_version = dataset_version
    else:
        new_src = DataSource(
            source_name=source_name,
            dataset_name=f"{source_name} {default_term}th Lok Sabha",
            source_type="CSV",
            source_url="https://mplads.gov.in",
            last_update=now_iso,
            last_ingestion=now_iso,
            record_count=inserted_count,
            dataset_version=dataset_version,
            status="ACTIVE",
            description=f"Official MPLADS works dataset for {default_term}th Lok Sabha parliamentary session.",
        )
        db.add(new_src)

    db.commit()

    return DatasetImportResponseSchema(
        import_id=import_id,
        dataset_name=imp_log.dataset_name,
        status=final_status,
        total_rows=len(raw_rows),
        processed_rows=inserted_count,
        rejected_rows=rejected_count,
        duplicate_rows=duplicate_count,
        duration_seconds=duration,
        dataset_version=dataset_version,
        lok_sabha_term=default_term,
        created_at=now_iso,
        message=(
            f"Successfully processed {inserted_count} allocation records "
            f"for the {default_term}th Lok Sabha into the master analytical database."
        )
    )
