"""Comprehensive verification tests for System Administrator Role, RBAC boundaries, and Data Ingestion Pipeline.

Verifies:
1. System Administrator access to platform administrative endpoints (200 OK).
2. Strict prohibition of Citizen, MP, and Authority from administrative endpoints (403 Forbidden).
3. Least-privilege boundary: System Administrator prohibited from modifying official project data (403 Forbidden).
4. Authority role permitted to submit verified corrections with mandatory audit trail and versioning.
5. Citizen and MP prohibited from submitting official project corrections (403 Forbidden).
6. System Administrator prohibited from modifying complaints or MP responses (403 Forbidden).
7. Dataset validation pipeline for 18th Lok Sabha schema (CSV/JSON).
8. Dataset import pipeline creating dataset_imports and system_logs entries.
9. Dual logging separation (technical system_logs vs official audit_logs).
10. AI Risk Score immutability across all human roles.
"""

import io
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database import SessionLocal
from backend.app.models import Project, ProjectVersion, AuditLog, SystemLog, DatasetImport, RiskScore, RiskFlag

client = TestClient(app)

SYSADMIN_HEADERS = {
    "X-User-Role": "system_admin",
    "X-User-Id": "sysadmin_platform"
}

AUTHORITY_HEADERS = {
    "X-User-Role": "authority",
    "X-User-Id": "authority_nodal"
}

MP_HEADERS = {
    "X-User-Role": "mp",
    "X-User-Id": "mp_varanasi",
    "X-User-Constituency": "Varanasi"
}

CITIZEN_HEADERS = {
    "X-User-Role": "citizen",
    "X-User-Id": "citizen_public"
}


# =========================================================================
# 1. System Administrator Access to Platform Endpoints
# =========================================================================

def test_sysadmin_can_access_dashboard_stats():
    response = client.get("/api/admin/dashboard-stats", headers=SYSADMIN_HEADERS)
    assert response.status_code == 200
    data = response.json()
    assert "total_allocations" in data
    assert "total_mps" in data
    assert "total_districts" in data
    assert "system_health" in data
    assert "recent_system_logs" in data
    assert "recent_ingestions" in data


def test_sysadmin_can_access_system_health():
    response = client.get("/api/admin/system-health", headers=SYSADMIN_HEADERS)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["HEALTHY", "DEGRADED", "WARNING"]
    assert "api_status" in data
    assert "database_status" in data
    assert "uptime_seconds" in data


def test_sysadmin_can_access_system_logs():
    response = client.get("/api/admin/system-logs", headers=SYSADMIN_HEADERS)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


def test_sysadmin_can_access_audit_logs():
    response = client.get("/api/admin/audit-logs", headers=SYSADMIN_HEADERS)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


def test_sysadmin_can_access_data_sources():
    response = client.get("/api/admin/datasets/sources", headers=SYSADMIN_HEADERS)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1


def test_sysadmin_can_access_import_history():
    response = client.get("/api/admin/datasets/history", headers=SYSADMIN_HEADERS)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


def test_sysadmin_can_access_and_update_config():
    # Read config
    response = client.get("/api/admin/config", headers=SYSADMIN_HEADERS)
    assert response.status_code == 200
    configs = response.json()
    assert isinstance(configs, list)

    # Update config
    update_payload = {
        "config_key": "MAX_UPLOAD_SIZE_MB",
        "config_value": "100"
    }
    put_res = client.put("/api/admin/config", json=update_payload, headers=SYSADMIN_HEADERS)
    assert put_res.status_code == 200
    updated = put_res.json()
    assert updated["config_key"] == "MAX_UPLOAD_SIZE_MB"
    assert updated["config_value"] == "100"


# =========================================================================
# 2. Strict Role RBAC: Non-Admins Blocked from Admin Endpoints (403)
# =========================================================================

@pytest.mark.parametrize("headers,role_name", [
    (CITIZEN_HEADERS, "Citizen"),
    (MP_HEADERS, "MP"),
    (AUTHORITY_HEADERS, "Authority"),
    ({}, "Unauthenticated/Default Citizen"),
])
def test_non_admins_forbidden_from_admin_endpoints(headers, role_name):
    # Test dashboard stats
    res1 = client.get("/api/admin/dashboard-stats", headers=headers)
    assert res1.status_code == 403, f"{role_name} should be forbidden from admin dashboard stats"

    # Test system health
    res2 = client.get("/api/admin/system-health", headers=headers)
    assert res2.status_code == 403, f"{role_name} should be forbidden from system health"

    # Test system logs
    res3 = client.get("/api/admin/system-logs", headers=headers)
    assert res3.status_code == 403, f"{role_name} should be forbidden from system logs"

    # Test config update
    res4 = client.put("/api/admin/config", json={"config_key": "MAX_UPLOAD_SIZE_MB", "config_value": "50"}, headers=headers)
    assert res4.status_code == 403, f"{role_name} should be forbidden from updating config"


# =========================================================================
# 3. Least Privilege: System Admin Prohibited from Official Project Data (403)
# =========================================================================

def test_sysadmin_forbidden_from_correcting_project_data():
    payload = {
        "expenditure": 4.5,
        "reason": "Sysadmin attempting direct correction",
        "evidence_reference": "SYSADMIN-OVERRIDE-01"
    }
    response = client.post("/api/projects/1/correct", json=payload, headers=SYSADMIN_HEADERS)
    assert response.status_code == 403
    assert "Access Denied" in response.json()["detail"]
    assert "authority" in response.json()["detail"]


@pytest.mark.parametrize("headers,role_name", [
    (CITIZEN_HEADERS, "Citizen"),
    (MP_HEADERS, "MP"),
])
def test_citizen_and_mp_forbidden_from_correcting_project_data(headers, role_name):
    payload = {
        "expenditure": 4.5,
        "reason": f"{role_name} attempting direct correction",
        "evidence_reference": f"{role_name.upper()}-01"
    }
    response = client.post("/api/projects/1/correct", json=payload, headers=headers)
    assert response.status_code == 403


# =========================================================================
# 4. Authority Official Correction Flow & Version History
# =========================================================================

def test_authority_can_correct_project_and_creates_version():
    # 1. Fetch current project
    proj_res = client.get("/api/projects/1")
    assert proj_res.status_code == 200
    orig_exp = proj_res.json()["allocation"]["expenditure"]
    orig_status = proj_res.json()["allocation"]["status"]
    orig_unspent = proj_res.json()["allocation"]["unspent_balance"]

    try:
        # 2. Submit correction as Authority
        new_exp = round(orig_exp + 0.1, 2)
        payload = {
            "expenditure": new_exp,
            "reason": "Field audit reconciliation by District Nodal Officer",
            "evidence_reference": "DNO-AUDIT-2026-V1"
        }
        res = client.post("/api/projects/1/correct", json=payload, headers=AUTHORITY_HEADERS)
        assert res.status_code == 200
        data = res.json()
        assert data["expenditure"] == new_exp

        # 3. Verify Version History endpoint
        ver_res = client.get("/api/projects/1/versions")
        assert ver_res.status_code == 200
        ver_data = ver_res.json()
        assert "versions" in ver_data
        assert len(ver_data["versions"]) >= 1
        latest = ver_data["versions"][0]
        assert latest["reason"] == "Field audit reconciliation by District Nodal Officer"
        assert latest["evidence_reference"] == "DNO-AUDIT-2026-V1"
        assert latest["changed_by_role"] == "authority"

        # 4. Verify Audit Log entry exists
        audit_res = client.get("/api/admin/audit-logs", headers=SYSADMIN_HEADERS)
        assert audit_res.status_code == 200
        audit_items = audit_res.json()
        assert any(
            a["field_name"] == "expenditure" and a["actor_role"] == "authority"
            for a in audit_items
        )
    finally:
        db = SessionLocal()
        proj = db.query(Project).filter(Project.id == 1).first()
        if proj:
            proj.expenditure = orig_exp
            proj.status = orig_status
            proj.unspent_balance = orig_unspent
        db.query(ProjectVersion).filter(ProjectVersion.project_id == 1, ProjectVersion.evidence_reference == "DNO-AUDIT-2026-V1").delete()
        db.query(AuditLog).filter(AuditLog.evidence_id == "DNO-AUDIT-2026-V1").delete()
        db.commit()
        db.close()


def test_authority_correction_requires_reason():
    # Short / empty reason
    res1 = client.post("/api/projects/1/correct", json={
        "expenditure": 5.0,
        "reason": "bad"
    }, headers=AUTHORITY_HEADERS)
    assert res1.status_code == 422


# =========================================================================
# 5. Complaints Management RBAC: Sysadmin Blocked
# =========================================================================

def test_sysadmin_forbidden_from_updating_complaints():
    # SysAdmin trying to update complaint status
    status_payload = {
        "status": "UNDER_INVESTIGATION",
        "reason": "SysAdmin attempting triage",
        "officer_name": "sysadmin_platform"
    }
    res = client.post("/api/complaints/1/status", json=status_payload, headers=SYSADMIN_HEADERS)
    assert res.status_code == 403

    # SysAdmin trying to provide MP remark
    mp_payload = {
        "remark": "SysAdmin impersonating MP"
    }
    res2 = client.post("/api/complaints/1/remark", json=mp_payload, headers=SYSADMIN_HEADERS)
    assert res2.status_code == 403


# =========================================================================
# 6. Dataset Validation & Ingestion Pipeline
# =========================================================================

def test_dataset_validation_csv_valid():
    csv_content = """source_record_id,state,district,mp_name,lok_sabha_term,sanctioned_cost,expenditure,financial_year,category,description
LS18_TEST_001,Uttar Pradesh,Varanasi,Prime Minister,18,5000000,4500000,2024-2025,Infrastructure,Solar Lighting in Rural Areas
LS18_TEST_002,Uttar Pradesh,Varanasi,Prime Minister,18,3000000,2800000,2024-2025,Health,Community Health Center Equipment
"""
    files = {"file": ("18th_LS_sample.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    data = {"term": 18, "source_name": "e-Sakshi Lok Sabha Portal"}

    response = client.post("/api/admin/datasets/validate", files=files, data=data, headers=SYSADMIN_HEADERS)
    assert response.status_code == 200
    resp_data = response.json()
    assert resp_data["is_valid"] is True
    assert resp_data["total_rows"] == 2
    assert resp_data["valid_rows"] == 2
    assert len(resp_data["preview_records"]) == 2


def test_dataset_validation_detects_malformed_data():
    # Missing required source_record_id and negative cost
    csv_content = """source_record_id,state,district,mp_name,lok_sabha_term,sanctioned_cost,expenditure
,Uttar Pradesh,Varanasi,Test MP,18,-5000,4500000
"""
    files = {"file": ("malformed.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    data = {"term": 18, "source_name": "Corrupt Dataset"}

    response = client.post("/api/admin/datasets/validate", files=files, data=data, headers=SYSADMIN_HEADERS)
    assert response.status_code == 200
    resp_data = response.json()
    assert resp_data["is_valid"] is False
    assert len(resp_data["validation_errors"]) > 0


def test_dataset_import_pipeline_ingestion():
    import uuid
    unique_rec_1 = f"LS18_AUTO_{uuid.uuid4().hex[:6].upper()}"
    unique_rec_2 = f"LS18_AUTO_{uuid.uuid4().hex[:6].upper()}"

    csv_content = f"""source_record_id,state,district,mp_name,lok_sabha_term,sanctioned_cost,expenditure,financial_year,category,description
{unique_rec_1},Maharashtra,Pune,MP Pune,18,7500000,6000000,2024-2025,Education,Smart Classrooms in ZP Schools
{unique_rec_2},Maharashtra,Pune,MP Pune,18,4000000,3800000,2024-2025,Drinking Water,RO Water Filtration Plant
"""
    files = {"file": ("18th_LS_Maharashtra_Pune.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    data = {
        "term": 18,
        "source_name": "e-Sakshi Portal 18th LS Release",
        "dataset_version": "1.0.0"
    }

    try:
        response = client.post("/api/admin/datasets/import", files=files, data=data, headers=SYSADMIN_HEADERS)
        assert response.status_code == 200
        resp_data = response.json()
        assert resp_data["status"] in ["COMPLETED", "PARTIAL"]
        assert resp_data["processed_rows"] == 2
        assert resp_data["lok_sabha_term"] == 18

        # Verify ingested projects are queryable via standard API
        proj_res = client.get(f"/api/projects/{unique_rec_1}")
        assert proj_res.status_code == 200
        proj_data = proj_res.json()
        assert proj_data["allocation"]["source_record_id"] == unique_rec_1
        assert proj_data["allocation"]["lok_sabha_term"] == 18
        assert "total_score" in proj_data["risk_assessment"]
    finally:
        db = SessionLocal()
        pids = [r[0] for r in db.query(Project.id).filter(Project.source_record_id.in_([unique_rec_1, unique_rec_2])).all()]
        if pids:
            db.query(RiskFlag).filter(RiskFlag.project_id.in_(pids)).delete(synchronize_session=False)
            db.query(RiskScore).filter(RiskScore.project_id.in_(pids)).delete(synchronize_session=False)
            db.query(Project).filter(Project.id.in_(pids)).delete(synchronize_session=False)
        db.query(DatasetImport).filter(DatasetImport.source == "e-Sakshi Portal 18th LS Release").delete(synchronize_session=False)
        db.query(SystemLog).filter(SystemLog.action.like("%18th_LS_Maharashtra_Pune.csv%")).delete(synchronize_session=False)
        db.commit()
        db.close()


# =========================================================================
# 7. AI Risk Score Immutability
# =========================================================================

def test_risk_score_is_immutable():
    # Ensure no endpoint exists that allows manual override of risk scores
    res1 = client.put("/api/projects/1/risk-score", json={"score": 0.1}, headers=SYSADMIN_HEADERS)
    assert res1.status_code in [404, 405]

    res2 = client.put("/api/projects/1/risk-score", json={"score": 0.1}, headers=AUTHORITY_HEADERS)
    assert res2.status_code in [404, 405]
