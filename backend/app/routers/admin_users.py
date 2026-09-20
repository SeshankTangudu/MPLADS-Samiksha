"""System Administrator — User & Access Management Router.

Enforces role-based access control, account lifecycle management,
credential resets, and server-side jurisdiction scoping.
"""

import math
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, func

from backend.app.database import get_db
from backend.app.models import (
    User,
    MPProfile,
    AuthorityProfile,
    CitizenProfile,
    SystemLog,
)
from backend.app.schemas import (
    UserRoleEnum,
    UserStatusEnum,
    UserContextSchema,
    UserListItemSchema,
    UserListResponseSchema,
    UserDetailSchema,
    UserCreateSchema,
    UserStatusUpdateSchema,
    UserResetPasswordSchema,
    UserScopeUpdateSchema,
    UserRoleUpdateSchema,
    AccessHistoryItemSchema,
)
from backend.app.auth import (
    get_current_user,
    require_role,
    hash_password,
    log_system_event,
    EVENT_ACCOUNT_CREATED,
    EVENT_ACCOUNT_SUSPENDED,
    EVENT_ACCOUNT_REACTIVATED,
    EVENT_ACCOUNT_DISABLED,
    EVENT_PASSWORD_RESET,
    EVENT_ROLE_CHANGED,
    EVENT_SCOPE_CHANGED,
)

router = APIRouter(prefix="/admin/users", tags=["System Administration - User Management"])


def generate_display_id(db: Session, role: str) -> str:
    """Generates unique sequential display identifiers for accounts (e.g. AUTH-002, MP-002, CIT-002)."""
    prefix_map = {
        UserRoleEnum.AUTHORITY.value: "AUTH",
        UserRoleEnum.MP.value: "MP",
        UserRoleEnum.CITIZEN.value: "CIT",
        UserRoleEnum.SYSTEM_ADMIN.value: "SYS",
    }
    prefix = prefix_map.get(role, "USR")

    # Count how many existing users have this prefix
    count = db.query(User).filter(User.display_id.like(f"{prefix}-%")).count()
    return f"{prefix}-{count + 1:03d}"


@router.get("", response_model=UserListResponseSchema)
def list_users(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search by username, full name, or display ID"),
    role: Optional[str] = Query(None, description="Filter by role (citizen, mp, authority, system_admin)"),
    status: Optional[str] = Query(None, description="Filter by status (ACTIVE, SUSPENDED, DISABLED)"),
    current_user: UserContextSchema = Depends(require_role([UserRoleEnum.SYSTEM_ADMIN.value])),
    db: Session = Depends(get_db),
):
    """Lists platform user accounts with server-side pagination, multi-filtering, and summary metrics."""
    # Summary KPI counts across all users
    total_users = db.query(User).count()
    active_count = db.query(User).filter(User.status == "ACTIVE").count()
    suspended_count = db.query(User).filter(User.status == "SUSPENDED").count()
    disabled_count = db.query(User).filter(User.status == "DISABLED").count()

    query = db.query(User)

    if role:
        clean_role = role.strip().lower()
        query = query.filter(User.role == clean_role)

    if status:
        clean_status = status.strip().upper()
        query = query.filter(User.status == clean_status)

    if search:
        search_pattern = f"%{search.strip().lower()}%"
        query = query.filter(
            or_(
                func.lower(User.username).like(search_pattern),
                func.lower(User.full_name).like(search_pattern),
                func.lower(User.display_id).like(search_pattern),
                func.lower(User.constituency).like(search_pattern),
                func.lower(User.district).like(search_pattern),
                func.lower(User.email).like(search_pattern),
            )
        )

    total_filtered = query.count()
    total_pages = max(1, math.ceil(total_filtered / page_size))
    offset = (page - 1) * page_size

    users = query.order_by(User.id.asc()).offset(offset).limit(page_size).all()

    return UserListResponseSchema(
        total=total_filtered,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        total_users=total_users,
        active_count=active_count,
        suspended_count=suspended_count,
        disabled_count=disabled_count,
        items=[UserListItemSchema.model_validate(u) for u in users],
    )


@router.post("", response_model=UserDetailSchema, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreateSchema,
    current_user: UserContextSchema = Depends(require_role([UserRoleEnum.SYSTEM_ADMIN.value])),
    db: Session = Depends(get_db),
):
    """Creates a new managed account (Authority, MP, or Citizen) with cryptographic credentials and linked profile."""
    # Disallow casual creation of system_admin
    clean_role = payload.role.strip().lower()
    if clean_role == UserRoleEnum.SYSTEM_ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="System Administrator accounts cannot be created via standard user registration. Platform infrastructure roles must be provisioned via operations management.",
        )

    # Check for duplicate username
    clean_username = payload.username.strip().lower()
    existing = db.query(User).filter(User.username == clean_username).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"An account with username '{clean_username}' already exists.",
        )

    now_iso = datetime.now(timezone.utc).isoformat()
    display_id = generate_display_id(db, clean_role)
    pwd_hash = hash_password(payload.password)

    # Resolve geographic / administrative coordinates
    district = (payload.district.strip() if payload.district else None)
    constituency = (payload.constituency.strip() if payload.constituency else None)
    state = (payload.state.strip() if payload.state else None)

    # For MP, constituency is mandatory
    if clean_role == UserRoleEnum.MP.value and not constituency:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Parliamentary constituency is mandatory when provisioning an MP account.",
        )

    # For Authority, district is mandatory
    if clean_role == UserRoleEnum.AUTHORITY.value and not district:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="District jurisdiction is mandatory when provisioning a District Authority account.",
        )

    new_user = User(
        display_id=display_id,
        username=clean_username,
        full_name=payload.full_name.strip(),
        role=clean_role,
        status=payload.status.upper() if payload.status else "ACTIVE",
        password_hash=pwd_hash,
        constituency=constituency,
        district=district,
        state=state,
        email=payload.email.strip() if payload.email else None,
        created_at=now_iso,
        updated_at=now_iso,
        is_active=1 if (payload.status or "ACTIVE").upper() == "ACTIVE" else 0,
    )
    db.add(new_user)
    db.flush()

    # Create associated profile record
    if clean_role == UserRoleEnum.AUTHORITY.value:
        profile = AuthorityProfile(
            user_id=new_user.id,
            authority_type=payload.authority_type or "District Authority",
            office_name=payload.office_name or f"Office of District Authority, {district}",
            state=state or "",
            district=district or "",
            jurisdiction=payload.jurisdiction or f"{district} District Administration",
            created_at=now_iso,
            updated_at=now_iso,
        )
        db.add(profile)
    elif clean_role == UserRoleEnum.MP.value:
        profile = MPProfile(
            user_id=new_user.id,
            constituency_id=f"PC-{constituency.upper()}",
            constituency_name=constituency,
            state=state or "",
            lok_sabha_term=payload.lok_sabha_term or 18,
            created_at=now_iso,
            updated_at=now_iso,
        )
        db.add(profile)
    elif clean_role == UserRoleEnum.CITIZEN.value:
        profile = CitizenProfile(
            user_id=new_user.id,
            phone=payload.phone.strip() if payload.phone else None,
            district=district,
            state=state,
            created_at=now_iso,
            updated_at=now_iso,
        )
        db.add(profile)

    log_system_event(
        db=db,
        event_type=EVENT_ACCOUNT_CREATED,
        severity="INFO",
        module="USER_MGMT",
        action="CREATE_ACCOUNT",
        detail=f"Created {clean_role} account {display_id} ('{clean_username}'). Scope: {district or constituency or 'Public'}.",
        user_id=current_user.username,
        user_role=current_user.role,
    )

    db.commit()
    db.refresh(new_user)
    return UserDetailSchema.model_validate(new_user)


@router.get("/{user_id}", response_model=UserDetailSchema)
def get_user_details(
    user_id: int,
    current_user: UserContextSchema = Depends(require_role([UserRoleEnum.SYSTEM_ADMIN.value])),
    db: Session = Depends(get_db),
):
    """Retrieves full account specification and linked profile coordinates."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} was not found.",
        )
    return UserDetailSchema.model_validate(user)


@router.put("/{user_id}/status", response_model=UserDetailSchema)
def update_user_status(
    user_id: int,
    payload: UserStatusUpdateSchema,
    current_user: UserContextSchema = Depends(require_role([UserRoleEnum.SYSTEM_ADMIN.value])),
    db: Session = Depends(get_db),
):
    """Transitions user account status (ACTIVE, SUSPENDED, DISABLED) with mandatory justification reason."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} was not found.",
        )

    # Protect root platform admin from accidental lockouts
    if user.username == "sysadmin_platform" and payload.status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The root platform system administrator account cannot be suspended or disabled.",
        )

    old_status = user.status
    new_status = payload.status.upper()

    user.status = new_status
    user.is_active = 1 if new_status == "ACTIVE" else 0
    now_iso = datetime.now(timezone.utc).isoformat()
    user.updated_at = now_iso

    event_map = {
        "ACTIVE": EVENT_ACCOUNT_REACTIVATED,
        "SUSPENDED": EVENT_ACCOUNT_SUSPENDED,
        "DISABLED": EVENT_ACCOUNT_DISABLED,
    }
    event_type = event_map.get(new_status, "ACCOUNT_STATUS_CHANGED")
    severity = "INFO" if new_status == "ACTIVE" else "WARNING"

    log_system_event(
        db=db,
        event_type=event_type,
        severity=severity,
        module="USER_MGMT",
        action="UPDATE_STATUS",
        detail=f"Account status of '{user.username}' changed from {old_status} to {new_status}. Reason: {payload.reason}",
        user_id=current_user.username,
        user_role=current_user.role,
    )

    db.commit()
    db.refresh(user)
    return UserDetailSchema.model_validate(user)


@router.put("/{user_id}/reset-password")
def reset_user_password(
    user_id: int,
    payload: UserResetPasswordSchema,
    current_user: UserContextSchema = Depends(require_role([UserRoleEnum.SYSTEM_ADMIN.value])),
    db: Session = Depends(get_db),
):
    """Securely updates password hash. Plaintext password is never logged or stored."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} was not found.",
        )

    new_hash = hash_password(payload.new_password)
    user.password_hash = new_hash
    now_iso = datetime.now(timezone.utc).isoformat()
    user.updated_at = now_iso

    log_system_event(
        db=db,
        event_type=EVENT_PASSWORD_RESET,
        severity="WARNING",
        module="USER_MGMT",
        action="RESET_PASSWORD",
        detail=f"Administrative password reset performed for user '{user.username}'. Reason: {payload.reason}",
        user_id=current_user.username,
        user_role=current_user.role,
    )

    db.commit()
    return {"status": "ok", "message": f"Password reset successfully for user '{user.username}'."}


@router.put("/{user_id}/scope", response_model=UserDetailSchema)
def update_user_scope(
    user_id: int,
    payload: UserScopeUpdateSchema,
    current_user: UserContextSchema = Depends(require_role([UserRoleEnum.SYSTEM_ADMIN.value])),
    db: Session = Depends(get_db),
):
    """Reassigns parliamentary constituency or administrative district scope with mandatory justification."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} was not found.",
        )

    now_iso = datetime.now(timezone.utc).isoformat()

    if payload.state:
        user.state = payload.state.strip()
    if payload.district is not None:
        user.district = payload.district.strip() if payload.district else None
    if payload.constituency is not None:
        user.constituency = payload.constituency.strip() if payload.constituency else None

    user.updated_at = now_iso

    # Update related profile coordinates
    if user.role == UserRoleEnum.MP.value and user.mp_profile:
        if payload.constituency:
            user.mp_profile.constituency_name = payload.constituency.strip()
            user.mp_profile.constituency_id = f"PC-{payload.constituency.upper().strip()}"
        if payload.state:
            user.mp_profile.state = payload.state.strip()
        if payload.lok_sabha_term:
            user.mp_profile.lok_sabha_term = payload.lok_sabha_term
        user.mp_profile.updated_at = now_iso
    elif user.role == UserRoleEnum.AUTHORITY.value and user.authority_profile:
        if payload.district:
            user.authority_profile.district = payload.district.strip()
        if payload.state:
            user.authority_profile.state = payload.state.strip()
        if payload.authority_type:
            user.authority_profile.authority_type = payload.authority_type.strip()
        if payload.office_name:
            user.authority_profile.office_name = payload.office_name.strip()
        user.authority_profile.updated_at = now_iso
    elif user.role == UserRoleEnum.CITIZEN.value and user.citizen_profile:
        if payload.district:
            user.citizen_profile.district = payload.district.strip()
        if payload.state:
            user.citizen_profile.state = payload.state.strip()
        user.citizen_profile.updated_at = now_iso

    log_system_event(
        db=db,
        event_type=EVENT_SCOPE_CHANGED,
        severity="INFO",
        module="USER_MGMT",
        action="UPDATE_SCOPE",
        detail=f"Jurisdiction scope reassigned for '{user.username}'. Reason: {payload.reason}",
        user_id=current_user.username,
        user_role=current_user.role,
    )

    db.commit()
    db.refresh(user)
    return UserDetailSchema.model_validate(user)


@router.put("/{user_id}/role", response_model=UserDetailSchema)
def update_user_role(
    user_id: int,
    payload: UserRoleUpdateSchema,
    current_user: UserContextSchema = Depends(require_role([UserRoleEnum.SYSTEM_ADMIN.value])),
    db: Session = Depends(get_db),
):
    """Changes user platform role with mandatory reason."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} was not found.",
        )

    if user.username == "sysadmin_platform":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The root platform system administrator role cannot be altered.",
        )

    clean_new_role = payload.role.strip().lower()
    if clean_new_role not in [r.value for r in UserRoleEnum]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid target role '{clean_new_role}'.",
        )

    old_role = user.role
    user.role = clean_new_role
    now_iso = datetime.now(timezone.utc).isoformat()
    user.updated_at = now_iso

    log_system_event(
        db=db,
        event_type=EVENT_ROLE_CHANGED,
        severity="WARNING",
        module="USER_MGMT",
        action="CHANGE_ROLE",
        detail=f"Role for user '{user.username}' changed from {old_role} to {clean_new_role}. Reason: {payload.reason}",
        user_id=current_user.username,
        user_role=current_user.role,
    )

    db.commit()
    db.refresh(user)
    return UserDetailSchema.model_validate(user)


@router.get("/{user_id}/access-history", response_model=List[AccessHistoryItemSchema])
def get_user_access_history(
    user_id: int,
    limit: int = Query(50, ge=1, le=200),
    current_user: UserContextSchema = Depends(require_role([UserRoleEnum.SYSTEM_ADMIN.value])),
    db: Session = Depends(get_db),
):
    """Retrieves telemetry, login, and audit events associated with this specific account."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} was not found.",
        )

    # Find logs where user_id is the username, display_id, or mentioned in detail
    logs = (
        db.query(SystemLog)
        .filter(
            or_(
                SystemLog.user_id == user.username,
                SystemLog.user_id == user.display_id,
                SystemLog.detail.like(f"%'{user.username}'%"),
            )
        )
        .order_by(SystemLog.id.desc())
        .limit(limit)
        .all()
    )

    return [AccessHistoryItemSchema.model_validate(log) for log in logs]
