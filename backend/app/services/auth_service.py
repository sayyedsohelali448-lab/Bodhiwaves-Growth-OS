import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
from fastapi import Request
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import (
    verify_password, get_password_hash,
    create_access_token, create_refresh_token
)
from app.models.users import User, RefreshToken, LoginHistory, PasswordResetToken


class AuthService:
    @staticmethod
    def _hash_token(raw_token: str) -> str:
        return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()

    @classmethod
    def authenticate_user(
        cls,
        db: Session,
        email: str,
        password: str,
        request: Optional[Request] = None
    ) -> Tuple[Optional[User], Optional[str]]:
        """
        Authenticate user with credential verification, failed attempt tracking, 
        account lockout protection, and comprehensive audit history.
        """
        ip = request.client.host if request and request.client else "127.0.0.1"
        user_agent = request.headers.get("user-agent", "Unknown") if request else "Unknown"

        user = db.query(User).filter(User.email == email.lower().strip()).first()

        if not user:
            # Record failed login with unknown email
            history = LoginHistory(
                email=email,
                ip_address=ip,
                user_agent=user_agent,
                status="failed",
                failure_reason="User not found"
            )
            db.add(history)
            db.commit()
            return None, "Invalid email or password"

        # Check account lockout
        now = datetime.now(timezone.utc)
        if user.locked_until and user.locked_until > now:
            history = LoginHistory(
                user_id=user.id,
                email=user.email,
                ip_address=ip,
                user_agent=user_agent,
                status="locked",
                failure_reason="Account temporarily locked"
            )
            db.add(history)
            db.commit()
            return None, "Account temporarily locked due to multiple failed login attempts. Try again later."

        # Check if inactive
        if not user.is_active:
            history = LoginHistory(
                user_id=user.id,
                email=user.email,
                ip_address=ip,
                user_agent=user_agent,
                status="failed",
                failure_reason="Account deactivated"
            )
            db.add(history)
            db.commit()
            return None, "Account is deactivated. Contact an administrator."

        # Verify password
        if not verify_password(password, user.hashed_password):
            user.failed_login_attempts += 1
            if user.failed_login_attempts >= 5:
                # Lock account for 15 minutes
                user.locked_until = now + timedelta(minutes=15)
                failure_reason = "Password incorrect. Account locked for 15 minutes."
            else:
                failure_reason = f"Password incorrect. ({user.failed_login_attempts}/5 attempts)"

            history = LoginHistory(
                user_id=user.id,
                email=user.email,
                ip_address=ip,
                user_agent=user_agent,
                status="failed",
                failure_reason=failure_reason
            )
            db.add(history)
            db.commit()
            return None, "Invalid email or password"

        # Password is correct: reset failed attempts & record success
        user.failed_login_attempts = 0
        user.locked_until = None
        history = LoginHistory(
            user_id=user.id,
            email=user.email,
            ip_address=ip,
            user_agent=user_agent,
            status="success"
        )
        db.add(history)
        db.commit()
        db.refresh(user)
        return user, None

    @classmethod
    def create_user_tokens(
        cls,
        db: Session,
        user: User,
        request: Optional[Request] = None
    ) -> Tuple[str, str]:
        """Generate JWT access token and store rotating refresh token."""
        ip = request.client.host if request and request.client else "127.0.0.1"
        user_agent = request.headers.get("user-agent", "Unknown") if request else "Unknown"

        access_token = create_access_token(
            subject=user.id,
            role=user.role,
            expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        )

        raw_refresh_token = create_refresh_token()
        token_hash = cls._hash_token(raw_refresh_token)

        refresh_record = RefreshToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
            revoked=False,
            user_agent=user_agent,
            ip_address=ip
        )
        db.add(refresh_record)
        db.commit()
        return access_token, raw_refresh_token

    @classmethod
    def rotate_refresh_token(
        cls,
        db: Session,
        raw_refresh_token: str,
        request: Optional[Request] = None
    ) -> Tuple[Optional[str], Optional[str], Optional[User]]:
        """
        Validate incoming refresh token, revoke it immediately (rotation), 
        and return a new access token, new refresh token, and user.
        """
        token_hash = cls._hash_token(raw_refresh_token)
        stored_token = db.query(RefreshToken).filter(
            RefreshToken.token_hash == token_hash,
            RefreshToken.revoked == False
        ).first()

        if not stored_token:
            return None, None, None

        now = datetime.now(timezone.utc)
        if stored_token.expires_at < now:
            stored_token.revoked = True
            db.commit()
            return None, None, None

        user = db.query(User).filter(User.id == stored_token.user_id).first()
        if not user or not user.is_active:
            stored_token.revoked = True
            db.commit()
            return None, None, None

        # Revoke used token (rotation)
        stored_token.revoked = True

        # Generate new token pair
        new_access_token, new_refresh_token = cls.create_user_tokens(db, user, request)
        return new_access_token, new_refresh_token, user

    @classmethod
    def revoke_refresh_token(cls, db: Session, raw_refresh_token: str) -> bool:
        """Revoke a refresh token on logout."""
        token_hash = cls._hash_token(raw_refresh_token)
        stored_token = db.query(RefreshToken).filter(
            RefreshToken.token_hash == token_hash
        ).first()
        if stored_token:
            stored_token.revoked = True
            db.commit()
            return True
        return False
