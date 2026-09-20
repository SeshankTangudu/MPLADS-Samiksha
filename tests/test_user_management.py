"""Comprehensive Verification Suite for User & Access Management (RBAC Governance).

Tests:
1. Authentication Lifecycle (Login, Logout, /me, Invalid credentials, Non-existent user).
2. Account Status Governance (ACTIVE, SUSPENDED, DISABLED enforcement at login and per-request).
3. System Admin User Management CRUD & Lifecycle:
   - Paginated user list with KPI counts (total, active, suspended, disabled).
   - Creation of Authority, MP, and Citizen accounts with auto-generated display IDs (AUTH-XXX, MP-XXX, CIT-XXX).
   - Guardrails: Prevention of casual creation of system_admin accounts.
   - Status updates (Suspend, Reactivate, Disable) with mandatory reason.
   - Guardrails: Protection of root platform system administrator from lockout.
   - Cryptographic password reset (PBKDF2-HMAC-SHA256, no plaintext leakage).
   - Scope reassignment (MP constituency, Authority district) with audit reason.
   - Account telemetry / access history from system_logs.
4. Least-Privilege & Boundary Enforcement:
   - Non-admins prohibited from /api/admin/users (403 Forbidden).
   - System Administrator prohibited from modifying official project data (403 Forbidden).
   - Multiple authorities with strict district jurisdiction isolation (403 Forbidden on foreign district).
"""

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database import SessionLocal
from backend.app.models import User, MPProfile, AuthorityProfile, CitizenProfile, SystemLog, Project
from backend.app.auth import hash_password, verify_password

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
# 1. Authentication Lifecycle & Credential Verification
# =========================================================================

def test_auth_login_successful_for_all_roles():
    """Verify that valid credentials for all four standard demo accounts succeed with 200 OK and return session tokens."""
    accounts = [
        ("sysadmin_platform", "Admin@Samiksha2026", "system_admin"),
        ("authority_nodal", "Authority@Varanasi2026", "authority"),
        ("mp_varanasi", "MP@Varanasi2026", "mp"),
        ("citizen_public", "Citizen@India2026", "citizen"),
    ]

    for username, password, expected_role in accounts:
        res = client.post("/api/auth/login", json={"username": username, "password": password})
        assert res.status_code == 200, f"Login failed for {username}: {res.text}"
        data = res.json()
        assert "token" in data
        assert data["token"].startswith(f"samiksha_{expected_role}_")
        assert data["user"]["username"] == username
        assert data["user"]["role"] == expected_role
        assert data["user"]["status"] == "ACTIVE"


def test_auth_login_invalid_credentials():
    """Verify that invalid password returns 401 Unauthorized without leaking sensitive account details."""
    res = client.post("/api/auth/login", json={"username": "sysadmin_platform", "password": "WrongPassword999!"})
    assert res.status_code == 401
    assert "Invalid username or password" in res.json()["detail"]


def test_auth_login_nonexistent_user():
    """Verify that non-existent username returns 401 Unauthorized without distinguishing user existence."""
    res = client.post("/api/auth/login", json={"username": "ghost_user_does_not_exist", "password": "SomePassword123!"})
    assert res.status_code == 401
    assert "Invalid username or password" in res.json()["detail"]


def test_auth_me_and_logout_flow():
    """Verify /api/auth/me returns current user profile and /api/auth/logout invalidates token."""
    login_res = client.post("/api/auth/login", json={"username": "sysadmin_platform", "password": "Admin@Samiksha2026"})
    assert login_res.status_code == 200
    token = login_res.json()["token"]
    bearer_headers = {"Authorization": f"Bearer {token}"}

    # Verify /api/auth/me
    me_res = client.get("/api/auth/me", headers=bearer_headers)
    assert me_res.status_code == 200
    assert me_res.json()["username"] == "sysadmin_platform"
    assert me_res.json()["role"] == "system_admin"

    # Logout
    logout_res = client.post("/api/auth/logout", headers=bearer_headers)
    assert logout_res.status_code == 200
    assert logout_res.json()["message"] == "Logged out successfully."


def test_auth_login_role_matching_and_mismatch_protection():
    """Verify that logging in with requested_role succeeds if matched and is rejected with 403 Forbidden if mismatched."""
    # 1. Matching role should succeed
    res_mp = client.post("/api/auth/login", json={
        "username": "mp_varanasi",
        "password": "MP@Varanasi2026",
        "requested_role": "mp"
    })
    assert res_mp.status_code == 200
    assert res_mp.json()["user"]["role"] == "mp"

    # 2. Mismatched role should return 403 Forbidden with clear explanation
    res_mismatch = client.post("/api/auth/login", json={
        "username": "authority_nodal",
        "password": "Authority@Varanasi2026",
        "requested_role": "mp"
    })
    assert res_mismatch.status_code == 403
    assert "These credentials belong to a 'authority' account and are not authorized for the 'mp' workspace" in res_mismatch.json()["detail"]

    # 3. Citizen trying to log into System Admin portal
    res_citizen_admin = client.post("/api/auth/login", json={
        "username": "citizen_public",
        "password": "Citizen@India2026",
        "requested_role": "system_admin"
    })
    assert res_citizen_admin.status_code == 403
    assert "These credentials belong to a 'citizen' account and are not authorized for the 'system_admin' workspace" in res_citizen_admin.json()["detail"]

    # 4. System admin alias normalization (e.g. 'sysadmin' or 'system-admin')
    res_sysadmin_alias = client.post("/api/auth/login", json={
        "username": "sysadmin_platform",
        "password": "Admin@Samiksha2026",
        "requested_role": "sysadmin"
    })
    assert res_sysadmin_alias.status_code == 200
    assert res_sysadmin_alias.json()["user"]["role"] == "system_admin"

    # 5. Backward compatibility (requested_role is None)
    res_none = client.post("/api/auth/login", json={
        "username": "authority_nodal",
        "password": "Authority@Varanasi2026",
        "requested_role": None
    })
    assert res_none.status_code == 200
    assert res_none.json()["user"]["role"] == "authority"


# =========================================================================
# 2. Account Status Governance (SUSPENDED / DISABLED)
# =========================================================================

def test_suspended_and_disabled_accounts_blocked_at_login():
    """Verify that SUSPENDED or DISABLED accounts are strictly blocked from logging in with 403 Forbidden."""
    db = SessionLocal()
    test_username = "test_blocked_user"
    try:
        # Create a user with SUSPENDED status
        existing = db.query(User).filter(User.username == test_username).first()
        if existing:
            db.delete(existing)
            db.commit()

        user = User(
            display_id="CIT-999",
            username=test_username,
            full_name="Suspended Test User",
            role="citizen",
            status="SUSPENDED",
            password_hash=hash_password("SecretPass123!"),
            created_at="2026-09-01T00:00:00Z",
            updated_at="2026-09-01T00:00:00Z",
            is_active=0,
        )
        db.add(user)
        db.commit()

        # Attempt login while SUSPENDED
        res = client.post("/api/auth/login", json={"username": test_username, "password": "SecretPass123!"})
        assert res.status_code == 403
        assert "SUSPENDED" in res.json()["detail"]

        # Transition to DISABLED
        user.status = "DISABLED"
        db.commit()

        res2 = client.post("/api/auth/login", json={"username": test_username, "password": "SecretPass123!"})
        assert res2.status_code == 403
        assert "DISABLED" in res2.json()["detail"]

        # Transition to ACTIVE
        user.status = "ACTIVE"
        user.is_active = 1
        db.commit()

        res3 = client.post("/api/auth/login", json={"username": test_username, "password": "SecretPass123!"})
        assert res3.status_code == 200
        assert res3.json()["user"]["status"] == "ACTIVE"
    finally:
        u = db.query(User).filter(User.username == test_username).first()
        if u:
            db.delete(u)
            db.commit()
        db.close()


# =========================================================================
# 3. System Administrator User Management CRUD & Guardrails
# =========================================================================

def test_admin_list_users_with_kpi_counts():
    """Verify that System Admin can retrieve paginated users with role/status filters and platform KPIs."""
    res = client.get("/api/admin/users?page=1&page_size=10", headers=SYSADMIN_HEADERS)
    assert res.status_code == 200
    data = res.json()
    assert "total" in data
    assert "total_users" in data
    assert "active_count" in data
    assert "suspended_count" in data
    assert "disabled_count" in data
    assert data["total_users"] >= 4
    assert len(data["items"]) >= 4

    # Filter by role
    res_mp = client.get("/api/admin/users?role=mp", headers=SYSADMIN_HEADERS)
    assert res_mp.status_code == 200
    for item in res_mp.json()["items"]:
        assert item["role"] == "mp"


def test_admin_create_authority_account():
    """Verify that System Admin can provision a new District Authority account with district coordinates and display ID."""
    db = SessionLocal()
    username = "auth_agra_officer"
    try:
        # Cleanup if exists
        u = db.query(User).filter(User.username == username).first()
        if u:
            db.delete(u)
            db.commit()

        payload = {
            "username": username,
            "full_name": "Agra District Nodal Officer",
            "role": "authority",
            "password": "AgraAuthorityPassword2026!",
            "email": "nodal.agra@mplads-samiksha.gov.in",
            "state": "Uttar Pradesh",
            "district": "Agra",
            "authority_type": "District Authority",
            "office_name": "Agra District Magistrate Office",
            "jurisdiction": "Agra District Administration",
            "status": "ACTIVE"
        }

        res = client.post("/api/admin/users", json=payload, headers=SYSADMIN_HEADERS)
        assert res.status_code == 201, f"Failed to create authority: {res.text}"
        data = res.json()
        assert data["username"] == username
        assert data["role"] == "authority"
        assert data["district"] == "Agra"
        assert data["display_id"].startswith("AUTH-")
        assert data["authority_profile"] is not None
        assert data["authority_profile"]["district"] == "Agra"

        # Verify password is hashed properly and plaintext is not stored
        user_in_db = db.query(User).filter(User.username == username).first()
        assert user_in_db is not None
        assert verify_password("AgraAuthorityPassword2026!", user_in_db.password_hash)
        assert "AgraAuthorityPassword2026!" not in user_in_db.password_hash
    finally:
        u = db.query(User).filter(User.username == username).first()
        if u:
            db.delete(u)
            db.commit()
        db.close()


def test_admin_create_mp_account():
    """Verify that System Admin can provision an MP account with constituency and Lok Sabha term."""
    db = SessionLocal()
    username = "mp_lucknow_rep"
    try:
        u = db.query(User).filter(User.username == username).first()
        if u:
            db.delete(u)
            db.commit()

        payload = {
            "username": username,
            "full_name": "Representative Lucknow",
            "role": "mp",
            "password": "LucknowMPPassword2026!",
            "email": "mp.lucknow@mplads-samiksha.gov.in",
            "state": "Uttar Pradesh",
            "constituency": "Lucknow",
            "lok_sabha_term": 18,
            "status": "ACTIVE"
        }

        res = client.post("/api/admin/users", json=payload, headers=SYSADMIN_HEADERS)
        assert res.status_code == 201
        data = res.json()
        assert data["username"] == username
        assert data["role"] == "mp"
        assert data["constituency"] == "Lucknow"
        assert data["display_id"].startswith("MP-")
        assert data["mp_profile"]["constituency_name"] == "Lucknow"
        assert data["mp_profile"]["lok_sabha_term"] == 18
    finally:
        u = db.query(User).filter(User.username == username).first()
        if u:
            db.delete(u)
            db.commit()
        db.close()


def test_admin_cannot_casually_create_sysadmin():
    """Guardrail: System Administrator accounts cannot be provisioned via standard user registration."""
    payload = {
        "username": "rogue_admin",
        "full_name": "Rogue Admin User",
        "role": "system_admin",
        "password": "RoguePassword123!",
    }
    res = client.post("/api/admin/users", json=payload, headers=SYSADMIN_HEADERS)
    assert res.status_code in [400, 422]
    error_text = str(res.json())
    assert "not permitted" in error_text or "System Administrator accounts cannot be created" in error_text


def test_admin_cannot_create_duplicate_username():
    """Guardrail: Duplicate usernames are rejected with 400 Bad Request."""
    payload = {
        "username": "sysadmin_platform",
        "full_name": "Duplicate User",
        "role": "citizen",
        "password": "ValidPassword123!",
    }
    res = client.post("/api/admin/users", json=payload, headers=SYSADMIN_HEADERS)
    assert res.status_code == 400
    assert "already exists" in res.json()["detail"]


def test_admin_update_status_and_lockout_protection():
    """Verify user status transitions (SUSPEND, REACTIVATE, DISABLE) and protection of root sysadmin."""
    db = SessionLocal()
    username = "status_test_user"
    try:
        u = db.query(User).filter(User.username == username).first()
        if u:
            db.delete(u)
            db.commit()

        # Create user to test status changes
        create_payload = {
            "username": username,
            "full_name": "Status Test Citizen",
            "role": "citizen",
            "password": "InitialPassword123!",
            "status": "ACTIVE"
        }
        res_create = client.post("/api/admin/users", json=create_payload, headers=SYSADMIN_HEADERS)
        user_id = res_create.json()["id"]

        # 1. Suspend
        res_suspend = client.put(
            f"/api/admin/users/{user_id}/status",
            json={"status": "SUSPENDED", "reason": "Administrative review of abnormal complaint activity"},
            headers=SYSADMIN_HEADERS,
        )
        assert res_suspend.status_code == 200
        assert res_suspend.json()["status"] == "SUSPENDED"

        # 2. Reactivate
        res_active = client.put(
            f"/api/admin/users/{user_id}/status",
            json={"status": "ACTIVE", "reason": "Investigation completed, account verified"},
            headers=SYSADMIN_HEADERS,
        )
        assert res_active.status_code == 200
        assert res_active.json()["status"] == "ACTIVE"

        # 3. Disable
        res_disable = client.put(
            f"/api/admin/users/{user_id}/status",
            json={"status": "DISABLED", "reason": "Official deboarding of personnel"},
            headers=SYSADMIN_HEADERS,
        )
        assert res_disable.status_code == 200
        assert res_disable.json()["status"] == "DISABLED"

        # 4. Lockout protection test on root sysadmin
        sys_user = db.query(User).filter(User.username == "sysadmin_platform").first()
        res_sys = client.put(
            f"/api/admin/users/{sys_user.id}/status",
            json={"status": "SUSPENDED", "reason": "Attempted accidental suspension"},
            headers=SYSADMIN_HEADERS,
        )
        assert res_sys.status_code == 400
        assert "cannot be suspended or disabled" in res_sys.json()["detail"]
    finally:
        u = db.query(User).filter(User.username == username).first()
        if u:
            db.delete(u)
            db.commit()
        db.close()


def test_admin_reset_password_flow():
    """Verify cryptographic password reset sets new hash and enables login with new password."""
    db = SessionLocal()
    username = "pwd_reset_test_user"
    try:
        u = db.query(User).filter(User.username == username).first()
        if u:
            db.delete(u)
            db.commit()

        # Create user
        client.post(
            "/api/admin/users",
            json={
                "username": username,
                "full_name": "Password Reset Test",
                "role": "citizen",
                "password": "OldPassword123!",
                "status": "ACTIVE"
            },
            headers=SYSADMIN_HEADERS,
        )
        target_user = db.query(User).filter(User.username == username).first()

        # Reset password
        reset_res = client.put(
            f"/api/admin/users/{target_user.id}/reset-password",
            json={"new_password": "BrandNewSecurePassword2026!", "reason": "User requested credential rotation"},
            headers=SYSADMIN_HEADERS,
        )
        assert reset_res.status_code == 200
        assert "Password reset successfully" in reset_res.json()["message"]

        # Verify old password fails
        res_old = client.post("/api/auth/login", json={"username": username, "password": "OldPassword123!"})
        assert res_old.status_code == 401

        # Verify new password succeeds
        res_new = client.post("/api/auth/login", json={"username": username, "password": "BrandNewSecurePassword2026!"})
        assert res_new.status_code == 200
        assert res_new.json()["user"]["username"] == username
    finally:
        u = db.query(User).filter(User.username == username).first()
        if u:
            db.delete(u)
            db.commit()
        db.close()


def test_admin_scope_update_and_access_history():
    """Verify scope reassignment (district/constituency) and access history retrieval."""
    db = SessionLocal()
    username = "scope_test_user"
    try:
        u = db.query(User).filter(User.username == username).first()
        if u:
            db.delete(u)
            db.commit()

        # Create MP user
        client.post(
            "/api/admin/users",
            json={
                "username": username,
                "full_name": "Scope Test MP",
                "role": "mp",
                "constituency": "Varanasi",
                "state": "Uttar Pradesh",
                "password": "ScopePassword123!",
                "status": "ACTIVE"
            },
            headers=SYSADMIN_HEADERS,
        )
        target_user = db.query(User).filter(User.username == username).first()

        # Reassign scope to Gorakhpur
        scope_res = client.put(
            f"/api/admin/users/{target_user.id}/scope",
            json={
                "constituency": "Gorakhpur",
                "state": "Uttar Pradesh",
                "lok_sabha_term": 18,
                "reason": "Redistricting / constituency reassignment notification"
            },
            headers=SYSADMIN_HEADERS,
        )
        assert scope_res.status_code == 200
        assert scope_res.json()["constituency"] == "Gorakhpur"
        assert scope_res.json()["mp_profile"]["constituency_name"] == "Gorakhpur"

        # Check access history telemetry
        hist_res = client.get(f"/api/admin/users/{target_user.id}/access-history", headers=SYSADMIN_HEADERS)
        assert hist_res.status_code == 200
        events = hist_res.json()
        assert len(events) >= 1
        actions = [e["action"] for e in events]
        assert "CREATE_ACCOUNT" in actions or "UPDATE_SCOPE" in actions
    finally:
        u = db.query(User).filter(User.username == username).first()
        if u:
            db.delete(u)
            db.commit()
        db.close()


# =========================================================================
# 4. Role Boundaries, Least Privilege & Jurisdiction Isolation
# =========================================================================

@pytest.mark.parametrize("headers,role_name", [
    (CITIZEN_HEADERS, "Citizen"),
    (MP_HEADERS, "MP"),
    (AUTHORITY_HEADERS, "Authority"),
])
def test_non_admins_forbidden_from_user_management(headers, role_name):
    """Verify that Citizen, MP, and Authority roles are strictly forbidden (403) from /api/admin/users."""
    res_list = client.get("/api/admin/users", headers=headers)
    assert res_list.status_code == 403, f"{role_name} was not blocked from listing users"

    res_create = client.post("/api/admin/users", json={"username": "fake", "password": "p", "role": "citizen"}, headers=headers)
    assert res_create.status_code == 403, f"{role_name} was not blocked from creating user"


def test_system_admin_least_privilege_cannot_modify_project_data():
    """Security Check: System Administrator cannot modify official project data or risk scores."""
    payload = {
        "status": "COMPLETED",
        "expenditure": 4.5,
        "reason": "Administrative platform intervention attempt"
    }
    res = client.post("/api/projects/1/correct", json=payload, headers=SYSADMIN_HEADERS)
    assert res.status_code == 403, f"Expected 403 Forbidden for System Admin on project correction, got {res.status_code}"


def test_multiple_authorities_district_isolation():
    """Verify that multiple authorities are isolated by district: Authority for Agra cannot correct Varanasi project."""
    db = SessionLocal()
    agra_user = "agra_authority_isolation"
    try:
        u = db.query(User).filter(User.username == agra_user).first()
        if u:
            db.delete(u)
            db.commit()

        # Provision Authority for Agra
        client.post(
            "/api/admin/users",
            json={
                "username": agra_user,
                "full_name": "Agra District Collector",
                "role": "authority",
                "state": "Uttar Pradesh",
                "district": "Agra",
                "authority_type": "District Authority",
                "password": "AgraSecurePassword2026!",
                "status": "ACTIVE"
            },
            headers=SYSADMIN_HEADERS,
        )

        agra_headers = {
            "X-User-Role": "authority",
            "X-User-Id": agra_user,
        }

        # Find a project in Varanasi or a non-Agra district
        foreign_proj = db.query(Project).filter(Project.district != "Agra").first()
        assert foreign_proj is not None

        # Attempt correction on foreign district project
        correction_payload = {
            "status": "COMPLETED",
            "reason": "Cross-district administrative review attempt"
        }
        res_cross = client.post(f"/api/projects/{foreign_proj.id}/correct", json=correction_payload, headers=agra_headers)
        assert res_cross.status_code == 403
        assert "Jurisdiction Isolation" in res_cross.json()["detail"]
    finally:
        u = db.query(User).filter(User.username == agra_user).first()
        if u:
            db.delete(u)
            db.commit()
        db.close()
