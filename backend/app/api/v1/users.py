from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.core.security import get_password_hash
from app.models.users import User
from app.schemas.users import UserCreate, UserUpdate, UserOut
from app.schemas.common import APIResponse, PaginatedResponse
from app.api.deps import get_current_admin, get_current_super_admin
from app.services.audit_service import AuditService

router = APIRouter(prefix="/users", tags=["Users Management"])


def generate_initials(name: str) -> str:
    parts = name.strip().split()
    if len(parts) >= 2:
        return f"{parts[0][0]}{parts[-1][0]}".upper()
    elif len(parts) == 1 and len(parts[0]) > 0:
        return parts[0][:2].upper()
    return "BW"


@router.get("", response_model=PaginatedResponse[UserOut])
def list_users(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    role: Optional[str] = None,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """List all agency users with role filtering, search, and pagination."""
    query = db.query(User)

    if search:
        s = f"%{search.strip()}%"
        query = query.filter((User.full_name.ilike(s)) | (User.email.ilike(s)))

    if role:
        query = query.filter(User.role == role)

    total = query.count()
    users = query.order_by(User.created_at.desc()).offset((page - 1) * size).limit(size).all()

    return PaginatedResponse(
        total=total,
        page=page,
        size=size,
        items=users
    )


@router.post("", response_model=APIResponse[UserOut], status_code=status.HTTP_201_CREATED)
def create_user(
    user_in: UserCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """Admin creates a new user account (public employee registration is strictly prohibited)."""
    # Check duplicate email
    existing = db.query(User).filter(User.email == user_in.email.lower().strip()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists"
        )

    # Only Super Admin can create another Super Admin
    if user_in.role == "super_admin" and current_admin.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only a Super Admin can create another Super Admin account"
        )

    new_user = User(
        email=user_in.email.lower().strip(),
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name.strip(),
        role=user_in.role,
        phone=user_in.phone,
        avatar_initials=generate_initials(user_in.full_name),
        is_active=user_in.is_active,
        is_verified=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    AuditService.log(
        db=db,
        action="CREATE_USER",
        entity_name="User",
        entity_id=str(new_user.id),
        user_id=current_admin.id,
        details={"email": new_user.email, "role": new_user.role},
        request=request
    )

    return APIResponse(success=True, message="User created successfully", data=new_user)


@router.get("/{user_id}", response_model=APIResponse[UserOut])
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return APIResponse(success=True, data=user)


@router.put("/{user_id}", response_model=APIResponse[UserOut])
def update_user(
    user_id: int,
    user_in: UserUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user_in.full_name is not None:
        user.full_name = user_in.full_name.strip()
        user.avatar_initials = generate_initials(user.full_name)
    if user_in.phone is not None:
        user.phone = user_in.phone
    if user_in.role is not None:
        if user_in.role == "super_admin" and current_admin.role != "super_admin":
            raise HTTPException(status_code=403, detail="Only Super Admin can assign super_admin role")
        user.role = user_in.role
    if user_in.is_active is not None:
        user.is_active = user_in.is_active
    if user_in.password:
        user.hashed_password = get_password_hash(user_in.password)

    db.commit()
    db.refresh(user)

    AuditService.log(
        db=db,
        action="UPDATE_USER",
        entity_name="User",
        entity_id=str(user.id),
        user_id=current_admin.id,
        details={"email": user.email, "role": user.role, "is_active": user.is_active},
        request=request
    )

    return APIResponse(success=True, message="User updated successfully", data=user)


@router.post("/{user_id}/toggle-status", response_model=APIResponse[UserOut])
def toggle_user_active_status(
    user_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """Toggle user active/deactive status."""
    if user_id == current_admin.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_active = not user.is_active
    db.commit()
    db.refresh(user)

    action = "ACTIVATE_USER" if user.is_active else "DEACTIVATE_USER"
    AuditService.log(
        db=db,
        action=action,
        entity_name="User",
        entity_id=str(user.id),
        user_id=current_admin.id,
        details={"email": user.email, "new_status": user.is_active},
        request=request
    )

    return APIResponse(
        success=True,
        message=f"User {'activated' if user.is_active else 'deactivated'} successfully",
        data=user
    )
