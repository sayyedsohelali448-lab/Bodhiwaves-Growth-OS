from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from pydantic import BaseModel, Field

from app.database.session import get_db
from app.core.security import verify_password, get_password_hash
from app.models.users import User
from app.models.audit import AuditLog
from app.api.deps import get_current_user, get_current_admin

router = APIRouter(prefix="/settings", tags=["Agency Settings & Audit"])


class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2)
    phone: Optional[str] = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6)


@router.get("/profile")
def get_user_profile(
    current_user: User = Depends(get_current_user)
):
    """
    Get current logged in user's full settings profile.
    """
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "phone": current_user.phone,
        "avatar_initials": current_user.avatar_initials,
        "is_active": current_user.is_active,
        "created_at": current_user.created_at
    }


@router.put("/profile")
def update_user_profile(
    payload: UpdateProfileRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update personal user profile details.
    """
    if payload.full_name:
        current_user.full_name = payload.full_name.strip()
        parts = current_user.full_name.split()
        current_user.avatar_initials = (
            f"{parts[0][0]}{parts[-1][0]}".upper() if len(parts) >= 2 else current_user.full_name[:2].upper()
        )
    if payload.phone is not None:
        current_user.phone = payload.phone.strip() if payload.phone else None

    current_user.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(current_user)

    return {
        "success": True,
        "message": "Profile updated successfully",
        "full_name": current_user.full_name,
        "phone": current_user.phone,
        "avatar_initials": current_user.avatar_initials
    }


@router.put("/password")
def change_password(
    payload: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Change current user password with verification.
    """
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    current_user.hashed_password = get_password_hash(payload.new_password)
    current_user.updated_at = datetime.now(timezone.utc)
    db.commit()

    return {"success": True, "message": "Password changed successfully"}


@router.get("/audit-logs")
def list_audit_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
    limit: int = Query(50, ge=1, le=200)
):
    """
    Review real security and operational audit trail from PostgreSQL (Admin only).
    """
    logs = db.query(AuditLog).order_by(desc(AuditLog.created_at)).limit(limit).all()
    return [
        {
            "id": l.id,
            "action": l.action,
            "entity_name": l.entity_name,
            "entity_id": l.entity_id,
            "user_email": l.user.email if l.user else "System",
            "details": l.details,
            "ip_address": l.ip_address,
            "created_at": l.created_at
        }
        for l in logs
    ]
