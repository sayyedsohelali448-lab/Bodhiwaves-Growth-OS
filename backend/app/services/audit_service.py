import json
from typing import Any, Optional
from fastapi import Request
from sqlalchemy.orm import Session
from app.models.audit import AuditLog


class AuditService:
    @staticmethod
    def log(
        db: Session,
        action: str,
        entity_name: str,
        entity_id: Optional[str] = None,
        user_id: Optional[int] = None,
        details: Optional[Any] = None,
        request: Optional[Request] = None
    ) -> AuditLog:
        """Create a persistent immutable audit log entry."""
        ip = request.client.host if request and request.client else "127.0.0.1"
        details_str = json.dumps(details) if isinstance(details, (dict, list)) else str(details or "")

        log_entry = AuditLog(
            user_id=user_id,
            action=action.upper(),
            entity_name=entity_name,
            entity_id=str(entity_id) if entity_id else None,
            details=details_str,
            ip_address=ip
        )
        db.add(log_entry)
        db.commit()
        db.refresh(log_entry)
        return log_entry
