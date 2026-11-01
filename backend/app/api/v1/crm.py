from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc

from app.database.session import get_db
from app.models.crm import Lead, LeadActivity
from app.models.users import User
from app.schemas.crm import (
    LeadCreate,
    LeadUpdate,
    LeadStageUpdate,
    LeadOut,
    LeadDetailOut,
    LeadActivityCreate,
    LeadActivityOut
)
from app.api.deps import get_current_user, get_current_admin, get_current_manager_or_higher

router = APIRouter(prefix="/crm", tags=["CRM & Sales Pipeline"])


def _format_activity(a: LeadActivity) -> LeadActivityOut:
    return LeadActivityOut(
        id=a.id,
        lead_id=a.lead_id,
        activity_type=a.activity_type,
        description=a.description,
        performed_by_id=a.performed_by_id,
        performed_by_name=a.performed_by.full_name if a.performed_by else None,
        created_at=a.created_at
    )


def _format_lead(lead: Lead) -> LeadOut:
    activities = lead.activities or []
    return LeadOut(
        id=lead.id,
        company_name=lead.company_name,
        contact_person=lead.contact_person,
        email=lead.email,
        phone=lead.phone,
        industry=lead.industry,
        source=lead.source,
        stage=lead.stage,
        estimated_value=lead.estimated_value,
        assigned_sales_id=lead.assigned_sales_id,
        follow_up_date=lead.follow_up_date,
        notes=lead.notes,
        created_at=lead.created_at,
        updated_at=lead.updated_at,
        assigned_sales_name=lead.assigned_sales.full_name if lead.assigned_sales else None,
        activities_count=len(activities)
    )


@router.get("/leads", response_model=List[LeadOut])
def list_leads(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    stage: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    assigned_sales_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100)
):
    """
    List sales leads from PostgreSQL with stage and source filters.
    """
    query = db.query(Lead)

    if stage and stage != "all":
        query = query.filter(Lead.stage == stage)

    if source and source != "all":
        query = query.filter(Lead.source == source)

    if assigned_sales_id:
        query = query.filter(Lead.assigned_sales_id == assigned_sales_id)

    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Lead.company_name.ilike(s),
                Lead.contact_person.ilike(s),
                Lead.email.ilike(s),
                Lead.phone.ilike(s)
            )
        )

    leads = query.order_by(desc(Lead.created_at)).offset(skip).limit(limit).all()
    return [_format_lead(l) for l in leads]


@router.post("/leads", response_model=LeadOut, status_code=status.HTTP_201_CREATED)
def create_lead(
    payload: LeadCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new sales lead.
    """
    if payload.assigned_sales_id:
        sales_user = db.query(User).filter(User.id == payload.assigned_sales_id).first()
        if not sales_user:
            raise HTTPException(status_code=400, detail="Assigned sales user does not exist")

    lead = Lead(
        company_name=payload.company_name.strip(),
        contact_person=payload.contact_person.strip(),
        email=payload.email.strip().lower() if payload.email else None,
        phone=payload.phone.strip() if payload.phone else None,
        industry=payload.industry.strip(),
        source=payload.source,
        stage=payload.stage,
        estimated_value=payload.estimated_value,
        assigned_sales_id=payload.assigned_sales_id or current_user.id,
        follow_up_date=payload.follow_up_date,
        notes=payload.notes.strip() if payload.notes else None
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)

    # Automatically add creation activity
    initial_act = LeadActivity(
        lead_id=lead.id,
        activity_type="note",
        description=f"Lead created via {payload.source} source by {current_user.full_name}",
        performed_by_id=current_user.id
    )
    db.add(initial_act)
    db.commit()

    return _format_lead(lead)


@router.get("/leads/{lead_id}", response_model=LeadDetailOut)
def get_lead(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get full lead profile including activity history.
    """
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    lead_out = _format_lead(lead)
    activities = sorted(lead.activities or [], key=lambda a: a.created_at, reverse=True)
    return LeadDetailOut(
        **lead_out.model_dump(),
        activities=[_format_activity(a) for a in activities]
    )


@router.put("/leads/{lead_id}", response_model=LeadOut)
def update_lead(
    lead_id: int,
    payload: LeadUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update lead details.
    """
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        if val is not None:
            setattr(lead, field, val)

    lead.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(lead)
    return _format_lead(lead)


@router.put("/leads/{lead_id}/stage", response_model=LeadOut)
def update_lead_stage(
    lead_id: int,
    payload: LeadStageUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update lead stage and record a stage change activity log.
    """
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    old_stage = lead.stage
    lead.stage = payload.stage
    lead.updated_at = datetime.now(timezone.utc)

    desc_text = f"Stage changed from '{old_stage}' to '{payload.stage}' by {current_user.full_name}"
    if payload.notes:
        desc_text += f". Notes: {payload.notes.strip()}"

    activity = LeadActivity(
        lead_id=lead.id,
        activity_type="stage_change",
        description=desc_text,
        performed_by_id=current_user.id
    )
    db.add(activity)
    db.commit()
    db.refresh(lead)
    return _format_lead(lead)


@router.post("/leads/{lead_id}/activities", response_model=LeadActivityOut, status_code=status.HTTP_201_CREATED)
def add_lead_activity(
    lead_id: int,
    payload: LeadActivityCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Add a follow-up note, call summary, or meeting log to a lead.
    """
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    activity = LeadActivity(
        lead_id=lead_id,
        activity_type=payload.activity_type,
        description=payload.description.strip(),
        performed_by_id=current_user.id
    )
    db.add(activity)
    db.commit()
    db.refresh(activity)
    return _format_activity(activity)


@router.delete("/leads/{lead_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lead(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """
    Delete a lead (admin only).
    """
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    db.delete(lead)
    db.commit()
    return None
