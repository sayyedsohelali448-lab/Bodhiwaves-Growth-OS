from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy import String, Boolean, DateTime, Integer, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base


class Employee(Base):
    __tablename__ = "employees"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True, nullable=False)
    employee_code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    department_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("departments.id", ondelete="SET NULL"), nullable=True, index=True)
    reporting_manager_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    designation: Mapped[str] = mapped_column(String(100), nullable=False)
    joining_date: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    employment_status: Mapped[str] = mapped_column(String(50), default="active", index=True)  # active, probation, notice, terminated, leave
    live_status: Mapped[str] = mapped_column(String(50), default="offline", index=True)  # online, working, break, away, offline
    skills: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON or comma-separated
    emergency_contact: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    last_active_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship("User", back_populates="employee_profile", foreign_keys=[user_id])
    department = relationship("Department", back_populates="employees", foreign_keys=[department_id])
    reporting_manager = relationship("User", foreign_keys=[reporting_manager_id])
    attendance_records = relationship("Attendance", back_populates="employee", cascade="all, delete-orphan")
    work_sessions = relationship("WorkSession", back_populates="employee", cascade="all, delete-orphan")
