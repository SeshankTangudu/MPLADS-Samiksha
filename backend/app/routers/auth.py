"""Authentication & Session Lifecycle Router for MPLADS Samiksha.

Provides secure login, logout, and authenticated user identity resolution.
"""

from datetime import datetime, timezone
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models import User, MPProfile, AuthorityProfile, CitizenProfile
from backend.app.schemas import (
    LoginRequestSchema,
    LoginResponseSchema,
    UserDetailSchema,
    UserContextSchema,
)
from backend.app.auth import (
    verify_password,
    create_session_token,
    revoke_session_token,
    get_current_user,
    log_system_event,
    EVENT_LOGIN_SUCCESS,
    EVENT_LOGIN_FAILURE,
    EVENT_LOGOUT,
)

router = APIRouter(prefix="/auth", tags=["Authentication & Identity"])


@router.post("/login", response_model=LoginResponseSchema)
def login(payload: LoginRequestSchema, request: Request, db: Session = Depends(get_db)):
    """Authenticates credentials against stored PBKDF2 hash, verifies account status, and issues session token."""
    username = payload.username.strip().lower()
    user = db.query(User).filter(User.username == username).first()

    client_ip = request.client.host if request.client else "127.0.0.1"

    if not user:
        log_system_event(
            db=db,
            event_type=EVENT_LOGIN_FAILURE,
            severity="WARNING",
            module="AUTH",
            action="LOGIN_ATTEMPT",
            detail=f"Login attempt failed: user '{username}' does not exist.",
            user_id=username,
            ip_address=client_ip,
        )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password.",
        )

    # Check account status
    user_status = getattr(user, "status", "ACTIVE")
    if user_status in ["SUSPENDED", "DISABLED"] or getattr(user, "is_active", 1) == 0:
        log_system_event(
            db=db,
            event_type=EVENT_LOGIN_FAILURE,
            severity="WARNING",
            module="AUTH",
            action="LOGIN_BLOCKED",
            detail=f"Login rejected: user '{username}' account is {user_status}.",
            user_id=username,
            user_role=user.role,
            ip_address=client_ip,
        )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access Denied: Your account '{username}' is {user_status}. Please contact the System Administrator.",
        )

    # Verify PBKDF2 password hash
    if not verify_password(payload.password, user.password_hash):
        log_system_event(
            db=db,
            event_type=EVENT_LOGIN_FAILURE,
            severity="WARNING",
            module="AUTH",
            action="INVALID_CREDENTIALS",
            detail=f"Login attempt failed: invalid password supplied for user '{username}'.",
            user_id=username,
            user_role=user.role,
            ip_address=client_ip,
        )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password.",
        )

    # Update last login timestamp
    now_iso = datetime.now(timezone.utc).isoformat()
    user.last_login = now_iso
    db.flush()

    token = create_session_token(user.id, user.username, user.role)

    log_system_event(
        db=db,
        event_type=EVENT_LOGIN_SUCCESS,
        severity="INFO",
        module="AUTH",
        action="LOGIN_SUCCESS",
        detail=f"User '{username}' ({user.role}) successfully authenticated.",
        user_id=username,
        user_role=user.role,
        ip_address=client_ip,
    )
    db.commit()

    return LoginResponseSchema(
        token=token,
        user=UserDetailSchema.model_validate(user),
        message="Authentication successful.",
    )


@router.post("/logout")
def logout(request: Request, current_user: UserContextSchema = Depends(get_current_user), db: Session = Depends(get_db)):
    """Terminates active user session and invalidates bearer token."""
    auth_bearer = request.headers.get("Authorization")
    client_ip = request.client.host if request.client else "127.0.0.1"

    if auth_bearer and auth_bearer.startswith("Bearer "):
        token = auth_bearer[7:].strip()
        revoke_session_token(token)

    log_system_event(
        db=db,
        event_type=EVENT_LOGOUT,
        severity="INFO",
        module="AUTH",
        action="USER_LOGOUT",
        detail=f"User '{current_user.username}' signed out.",
        user_id=current_user.username,
        user_role=current_user.role,
        ip_address=client_ip,
    )
    db.commit()

    return {"status": "ok", "message": "Logged out successfully."}


@router.get("/me", response_model=UserDetailSchema)
def get_current_user_profile(
    current_user: UserContextSchema = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Returns full profile and active scope coordinates for authenticated user."""
    user = db.query(User).filter(User.username == current_user.username).first()
    if not user:
        # Construct ephemeral detail if running in lightweight mock test mode
        return UserDetailSchema(
            id=current_user.id,
            display_id=current_user.display_id or f"USR-{current_user.id:03d}",
            username=current_user.username,
            full_name=current_user.full_name,
            role=current_user.role,
            status=current_user.status,
            email=current_user.email,
            constituency=current_user.constituency,
            district=current_user.district,
            state=current_user.state,
            created_at="2026-09-01T00:00:00Z",
            updated_at="2026-09-01T00:00:00Z",
            last_login=current_user.last_login,
            is_active=current_user.is_active,
        )

    return UserDetailSchema.model_validate(user)
