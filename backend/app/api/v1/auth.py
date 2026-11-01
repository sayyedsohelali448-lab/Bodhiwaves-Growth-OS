from datetime import datetime, timedelta, timezone
import secrets
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.core.config import settings
from app.core.security import get_password_hash
from app.models.users import User, PasswordResetToken
from app.schemas.auth import (
    LoginRequest, TokenResponse, RefreshTokenRequest,
    ForgotPasswordRequest, ResetPasswordRequest, ChangePasswordRequest,
    UserProfileResponse
)
from app.schemas.users import LoginHistoryOut
from app.schemas.common import APIResponse
from app.services.auth_service import AuthService
from app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse)
def login(login_data: LoginRequest, request: Request, db: Session = Depends(get_db)):
    """
    Authenticate user with email and password.
    Returns short-lived JWT access token and rotating refresh token.
    Tracks login history and enforces account lockout after repeated failures.
    """
    user, error_message = AuthService.authenticate_user(
        db=db,
        email=login_data.email,
        password=login_data.password,
        request=request
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=error_message or "Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token, raw_refresh_token = AuthService.create_user_tokens(
        db=db,
        user=user,
        request=request
    )

    return TokenResponse(
        access_token=access_token,
        refresh_token=raw_refresh_token,
        token_type="bearer",
        user_id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        avatar_initials=user.avatar_initials
    )


@router.post("/refresh", response_model=TokenResponse)
def refresh_token(payload: RefreshTokenRequest, request: Request, db: Session = Depends(get_db)):
    """
    Exchange valid refresh token for a fresh access token and rotated refresh token.
    Previous refresh token is revoked immediately.
    """
    new_access_token, new_refresh_token, user = AuthService.rotate_refresh_token(
        db=db,
        raw_refresh_token=payload.refresh_token,
        request=request
    )

    if not new_access_token or not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return TokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        user_id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        avatar_initials=user.avatar_initials
    )


@router.post("/logout", response_model=APIResponse[bool])
def logout(payload: RefreshTokenRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Revoke refresh token and invalidate the user session.
    """
    AuthService.revoke_refresh_token(db=db, raw_refresh_token=payload.refresh_token)
    return APIResponse(success=True, message="Successfully logged out", data=True)


@router.get("/me", response_model=UserProfileResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """
    Retrieve authenticated user profile and roles.
    """
    return current_user


@router.post("/forgot-password", response_model=APIResponse[str])
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """
    Initiate secure password reset. Creates a one-time reset token.
    """
    user = db.query(User).filter(User.email == payload.email.lower().strip()).first()
    # Always return success message to avoid user enumeration attacks
    if not user:
        return APIResponse(
            success=True,
            message="If an account matches that email, a password reset token has been generated.",
            data="Reset instructions initiated"
        )

    # Invalidate existing unused tokens
    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.used == False
    ).update({"used": True})

    token_str = secrets.token_urlsafe(32)
    reset_record = PasswordResetToken(
        user_id=user.id,
        token=token_str,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
        used=False
    )
    db.add(reset_record)
    db.commit()

    return APIResponse(
        success=True,
        message="If an account matches that email, a password reset token has been generated.",
        data=token_str if settings.ENVIRONMENT == "development" else "Sent to email"
    )


@router.post("/reset-password", response_model=APIResponse[bool])
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    """
    Reset user password using valid one-time reset token.
    """
    token_record = db.query(PasswordResetToken).filter(
        PasswordResetToken.token == payload.token,
        PasswordResetToken.used == False
    ).first()

    now = datetime.now(timezone.utc)
    if not token_record or token_record.expires_at < now:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )

    user = db.query(User).filter(User.id == token_record.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.hashed_password = get_password_hash(payload.new_password)
    user.failed_login_attempts = 0
    user.locked_until = None
    token_record.used = True
    db.commit()

    return APIResponse(success=True, message="Password reset successfully. You can now log in.", data=True)


@router.get("/login-history", response_model=APIResponse[list[LoginHistoryOut]])
def get_my_login_history(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Returns the last 15 login attempts for the active user.
    """
    history = db.query(LoginHistoryOut).filter(
        LoginHistoryOut.email == current_user.email
    ).order_by(LoginHistoryOut.created_at.desc()).limit(15).all()

    return APIResponse(success=True, message="Login history retrieved", data=history)
