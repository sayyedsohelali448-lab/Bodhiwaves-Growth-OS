from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict


# ==========================================
# Task Schemas
# ==========================================

class TaskBase(BaseModel):
    title: str = Field(..., min_length=2, max_length=255)
    description: Optional[str] = None
    department_id: Optional[int] = None
    project_id: Optional[int] = None
    assigned_to_id: Optional[int] = None
    priority: str = Field("medium", pattern="^(low|medium|high|urgent)$")
    status: str = Field("assigned", pattern="^(assigned|accepted|in_progress|under_review|revision_required|completed)$")
    start_date: Optional[str] = None
    deadline: str = Field(..., min_length=4)
    estimated_hours: float = 0.0
    actual_hours: float = 0.0
    progress_percent: int = Field(0, ge=0, le=100)
    manager_approval_status: str = Field("pending", pattern="^(pending|approved|rejected)$")


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    department_id: Optional[int] = None
    project_id: Optional[int] = None
    assigned_to_id: Optional[int] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    start_date: Optional[str] = None
    deadline: Optional[str] = None
    estimated_hours: Optional[float] = None
    actual_hours: Optional[float] = None
    progress_percent: Optional[int] = None
    manager_approval_status: Optional[str] = None


class TaskOut(TaskBase):
    id: int
    created_by_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    project_title: Optional[str] = None
    department_name: Optional[str] = None
    assigned_to_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# Project Schemas
# ==========================================

class ProjectBase(BaseModel):
    title: str = Field(..., min_length=2, max_length=255)
    description: Optional[str] = None
    client_id: Optional[int] = None
    manager_id: Optional[int] = None
    department_id: Optional[int] = None
    budget: float = Field(0.0, ge=0.0)
    start_date: Optional[str] = None
    deadline: str = Field(..., min_length=4)
    progress_percent: int = Field(0, ge=0, le=100)
    status: str = Field("planning", pattern="^(planning|in_progress|in_review|completed|on_hold)$")


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    client_id: Optional[int] = None
    manager_id: Optional[int] = None
    department_id: Optional[int] = None
    budget: Optional[float] = None
    start_date: Optional[str] = None
    deadline: Optional[str] = None
    progress_percent: Optional[int] = None
    status: Optional[str] = None


class ProjectOut(ProjectBase):
    id: int
    created_at: datetime
    updated_at: datetime
    client_name: Optional[str] = None
    manager_name: Optional[str] = None
    department_name: Optional[str] = None
    tasks_count: int = 0
    completed_tasks_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class ProjectDetailOut(ProjectOut):
    tasks: List[TaskOut] = []
