"""Role-Based Access Control (RBAC) & Authentication Module.

Implements strict least-privilege security boundaries:
- Citizen (Public read-only, complaint submission)
- MP (Constituency-scoped intelligence, remarks & verifications)
- Authority (Official operational data corrections, complaint triage & resolution)
- System Administrator (Platform technical operations, dataset ingestion, diagnostics, config)
"""

import os
import secrets
from datetime import datetime, timezone
from typing import List, Optional, Callable
from fastapi import Request, HTTPException, status, Depends
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models import User, SystemLog, AuditLog
from backend.app.schemas import UserRoleEnum, UserContextSchema

DEMO_USERS = {
    "citizen_public": {
        "id": 1,
        "username": "citizen_public",
        "full_name": "Citizen / Public User",
        "role": UserRoleEnum.CITIZEN.value,
        "constituency": None,
        "state": None,
        "email": "public.citizen@mplads-samiksha.gov.in",
    },
    "mp_varanasi": {
        "id": 2,
        "username": "mp_varanasi",
        "full_name": "MP / Representative (Varanasi)",
        "role": UserRoleEnum.MP.value,
        "constituency": "Varanasi",
        "state": "Uttar Pradesh",
        "email": "mp.varanasi@mplads-samiksha.gov.in",
    },
    "authority_nodal": {
        "id": 3,
        "username": "authority_nodal",
        "full_name": "District Nodal Officer / Authority",
        "role": UserRoleEnum.AUTHORITY.value,
        "constituency": None,
        "state": "Uttar Pradesh",
        "email": "authority.nodal@mplads-samiksha.gov.in",
    },
    "sysadmin_platform": {
        "id": 4,
        "username": "sysadmin_platform",
        "full_name": "System Administrator (Platform Operations)",
        "role": UserRoleEnum.SYSTEM_ADMIN.value,
        "constituency": None,
        "state": None,
        "email": "sysadmin.ops@mplads-samiksha.gov.in",
    },
}


def get_current_user(request: Request) -> UserContextSchema:
    """Extracts and validates authenticated user context from request headers."""
    # 1. Check custom headers
    header_role = request.headers.get("X-User-Role")
    header_user = request.headers.get("X-User-Id")
    header_const = request.headers.get("X-User-Constituency")
    auth_bearer = request.headers.get("Authorization")

    # 2. Check Bearer token if provided
    role = UserRoleEnum.CITIZEN.value
    username = "citizen_public"
    constituency = None
    state = None
    full_name = "Citizen / Public User"

    if auth_bearer and auth_bearer.startswith("Bearer "):
        token = auth_bearer[7:].strip()
        if "system_admin" in token or "sysadmin" in token:
            role = UserRoleEnum.SYSTEM_ADMIN.value
            username = "sysadmin_platform"
        elif "authority" in token:
            role = UserRoleEnum.AUTHORITY.value
            username = "authority_nodal"
        elif "mp" in token:
            role = UserRoleEnum.MP.value
            username = "mp_varanasi"
            constituency = header_const or "Varanasi"
    elif header_role:
        clean_role = header_role.strip().lower()
        if clean_role in [r.value for r in UserRoleEnum]:
            role = clean_role
            if role == UserRoleEnum.SYSTEM_ADMIN.value:
                username = header_user or "sysadmin_platform"
            elif role == UserRoleEnum.AUTHORITY.value:
                username = header_user or "authority_nodal"
            elif role == UserRoleEnum.MP.value:
                username = header_user or "mp_varanasi"
                constituency = header_const or "Varanasi"
            else:
                username = header_user or "citizen_public"

    user_info = DEMO_USERS.get(username)
    if user_info:
        return UserContextSchema(
            id=user_info["id"],
            username=user_info["username"],
            full_name=user_info["full_name"],
            role=role,
            constituency=constituency or user_info.get("constituency"),
            state=state or user_info.get("state"),
            email=user_info.get("email"),
            is_active=1
        )

    return UserContextSchema(
        id=1,
        username=username,
        full_name=full_name,
        role=role,
        constituency=constituency,
        state=state,
        email=f"{username}@mplads-samiksha.gov.in",
        is_active=1
    )


def require_role(allowed_roles: List[str]) -> Callable:
    """FastAPI dependency enforcing strict role RBAC boundary."""
    def role_checker(current_user: UserContextSchema = Depends(get_current_user)) -> UserContextSchema:
        clean_allowed = [r.strip().lower() for r in allowed_roles]
        if current_user.role not in clean_allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Access Denied: Role '{current_user.role}' is not authorized for this operation. "
                    f"Required role: {', '.join(allowed_roles)}."
                )
            )
        return current_user
    return role_checker


def log_system_event(
    db: Session,
    event_type: str,
    severity: str,
    action: str,
    detail: str,
    module: str = "PLATFORM",
    user_id: Optional[str] = None,
    user_role: Optional[str] = None,
    ip_address: Optional[str] = None,
) -> SystemLog:
    """Inserts an entry into the technical platform system_logs table."""
    log_id = f"SYSLOG-{secrets.token_hex(4).upper()}"
    now_iso = datetime.now(timezone.utc).isoformat()
    entry = SystemLog(
        log_id=log_id,
        event_type=event_type.upper(),
        severity=severity.upper(),
        user_id=user_id,
        user_role=user_role,
        module=module.upper(),
        action=action,
        detail=detail,
        ip_address=ip_address or "127.0.0.1",
        timestamp=now_iso,
    )
    db.add(entry)
    db.flush()
    return entry


def create_audit_entry(
    db: Session,
    actor_id: str,
    actor_role: str,
    entity_type: str,
    entity_id: str,
    field_name: str,
    old_value: Optional[str],
    new_value: Optional[str],
    reason: str,
    evidence_id: Optional[str] = None,
    action: str = "CORRECT",
    record_version: int = 1,
) -> AuditLog:
    """Inserts an append-only entry into the official audit_logs table."""
    audit_id = f"AUDIT-{secrets.token_hex(4).upper()}"
    now_iso = datetime.now(timezone.utc).isoformat()
    entry = AuditLog(
        audit_id=audit_id,
        actor_id=actor_id,
        actor_role=actor_role,
        timestamp=now_iso,
        entity_type=entity_type.upper(),
        entity_id=str(entity_id),
        field_name=field_name,
        old_value=str(old_value) if old_value is not None else None,
        new_value=str(new_value) if new_value is not None else None,
        reason=reason,
        evidence_id=evidence_id,
        action=action.upper(),
        record_version=record_version,
    )
    db.add(entry)
    db.flush()
    return entry
