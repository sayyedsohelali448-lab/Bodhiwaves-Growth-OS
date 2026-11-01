from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, EmailStr, ConfigDict


# ==========================================
# Attendance Schemas
# ==========================================

class AttendanceOut(BaseModel):
    id: int
    employee_id: int
    employee_name: Optional[str] = None
    employee_code: Optional[str] = None
    date: str
    check_in_time: Optional[datetime] = None
    check_out_time: Optional[datetime] = None
    total_working_hours: float = 0.0
    status: str
    notes: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CheckInRequest(BaseModel):
    notes: Optional[str] = None


class CheckOutRequest(BaseModel):
    notes: Optional[str] = None


# ==========================================
# Leave Request Schemas
# ==========================================

class LeaveRequestCreate(BaseModel):
    leave_type: str = Field("casual", pattern="^(casual|sick|earned|unpaid)$")
    start_date: str = Field(..., min_length=4)
    end_date: str = Field(..., min_length=4)
    reason: str = Field(..., min_length=3)


class LeaveRequestReview(BaseModel):
    status: str = Field(..., pattern="^(approved|rejected)$")
    review_notes: Optional[str] = None


class LeaveRequestOut(BaseModel):
    id: int
    employee_id: int
    employee_name: Optional[str] = None
    employee_code: Optional[str] = None
    leave_type: str
    start_date: str
    end_date: str
    reason: str
    status: str
    reviewed_by_id: Optional[int] = None
    reviewed_by_name: Optional[str] = None
    review_notes: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# Employee Enrollment Schemas
# ==========================================

class EmployeeEnrollRequest(BaseModel):
    full_name: str = Field(..., min_length=2)
    email: EmailStr
    password: str = Field(..., min_length=6)
    role: str = Field("employee", pattern="^(department_manager|team_leader|employee)$")
    designation: str = Field(..., min_length=2)
    department_id: Optional[int] = None
    employee_code: str = Field(..., min_length=2)
    phone: Optional[str] = None
    joining_date: Optional[str] = None
