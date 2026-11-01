from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict


class LeadActivityBase(BaseModel):
    activity_type: str = Field("note", pattern="^(call|email|meeting|note|stage_change)$")
    description: str = Field(..., min_length=2)


class LeadActivityCreate(LeadActivityBase):
    pass


class LeadActivityOut(LeadActivityBase):
    id: int
    lead_id: int
    performed_by_id: Optional[int] = None
    performed_by_name: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LeadBase(BaseModel):
    company_name: str = Field(..., min_length=2, max_length=255)
    contact_person: str = Field(..., min_length=2, max_length=255)
    email: Optional[str] = None
    phone: Optional[str] = None
    industry: str = Field("General", max_length=100)
    source: str = Field("manual", pattern="^(website|whatsapp|referral|meta_ads|manual)$")
    stage: str = Field("new", pattern="^(new|contacted|qualified|proposal_sent|negotiation|won|lost)$")
    estimated_value: float = Field(0.0, ge=0.0)
    assigned_sales_id: Optional[int] = None
    follow_up_date: Optional[str] = None
    notes: Optional[str] = None


class LeadCreate(LeadBase):
    pass


class LeadUpdate(BaseModel):
    company_name: Optional[str] = None
    contact_person: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    industry: Optional[str] = None
    source: Optional[str] = None
    stage: Optional[str] = None
    estimated_value: Optional[float] = None
    assigned_sales_id: Optional[int] = None
    follow_up_date: Optional[str] = None
    notes: Optional[str] = None


class LeadStageUpdate(BaseModel):
    stage: str = Field(..., pattern="^(new|contacted|qualified|proposal_sent|negotiation|won|lost)$")
    notes: Optional[str] = None


class LeadOut(LeadBase):
    id: int
    created_at: datetime
    updated_at: datetime
    assigned_sales_name: Optional[str] = None
    activities_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class LeadDetailOut(LeadOut):
    activities: List[LeadActivityOut] = []
