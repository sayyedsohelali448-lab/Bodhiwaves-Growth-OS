from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, EmailStr, ConfigDict


class ClientBase(BaseModel):
    business_name: str = Field(..., min_length=2, max_length=255)
    industry: str = Field("General", max_length=100)
    contact_person: str = Field(..., min_length=2, max_length=255)
    email: EmailStr
    phone: Optional[str] = None
    address: Optional[str] = None
    status: str = Field("active", pattern="^(active|onboarding|paused|churned)$")
    account_manager_id: Optional[int] = None


class ClientCreate(ClientBase):
    pass


class ClientUpdate(BaseModel):
    business_name: Optional[str] = None
    industry: Optional[str] = None
    contact_person: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    status: Optional[str] = None
    account_manager_id: Optional[int] = None


class ClientOut(ClientBase):
    id: int
    created_at: datetime
    updated_at: datetime
    account_manager_name: Optional[str] = None
    active_projects_count: int = 0
    total_invoiced: float = 0.0

    model_config = ConfigDict(from_attributes=True)
