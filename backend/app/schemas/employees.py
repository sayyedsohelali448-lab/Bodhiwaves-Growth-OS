from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class EmployeeBase(BaseModel):
    employee_code: str
    department_id: Optional[int] = None
    reporting_manager_id: Optional[int] = None
    designation: str
    joining_date: Optional[str] = None
    employment_status: str = "active"
    skills: Optional[str] = None
    emergency_contact: Optional[str] = None


class EmployeeCreate(EmployeeBase):
    user_id: int


class EmployeeUpdate(BaseModel):
    department_id: Optional[int] = None
    reporting_manager_id: Optional[int] = None
    designation: Optional[str] = None
    employment_status: Optional[str] = None
    live_status: Optional[str] = None
    skills: Optional[str] = None
    emergency_contact: Optional[str] = None


class EmployeeOut(EmployeeBase):
    id: int
    user_id: int
    live_status: str
    last_active_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
