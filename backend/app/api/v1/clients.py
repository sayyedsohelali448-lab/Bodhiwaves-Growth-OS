from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc

from app.database.session import get_db
from app.models.clients_projects import Client, Project
from app.models.finance import Invoice
from app.models.users import User
from app.schemas.clients import ClientCreate, ClientUpdate, ClientOut
from app.schemas.projects import ProjectOut
from app.api.deps import get_current_user, get_current_admin, get_current_manager_or_higher

router = APIRouter(prefix="/clients", tags=["Clients Management"])


def _format_client_out(c: Client) -> ClientOut:
    active_projects = sum(1 for p in (c.projects or []) if p.status in ["planning", "in_progress", "in_review"])
    return ClientOut(
        id=c.id,
        business_name=c.business_name,
        industry=c.industry,
        contact_person=c.contact_person,
        email=c.email,
        phone=c.phone,
        address=c.address,
        status=c.status,
        account_manager_id=c.account_manager_id,
        account_manager_name=c.account_manager.full_name if c.account_manager else None,
        active_projects_count=active_projects,
        total_invoiced=0.0,
        created_at=c.created_at,
        updated_at=c.updated_at
    )


@router.get("", response_model=List[ClientOut])
def list_clients(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    status_filter: Optional[str] = Query(None, alias="status"),
    industry: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100)
):
    """
    List actual clients from PostgreSQL with optional filtering and search.
    """
    query = db.query(Client)

    if status_filter and status_filter != "all":
        query = query.filter(Client.status == status_filter)

    if industry and industry != "all":
        query = query.filter(Client.industry == industry)

    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Client.business_name.ilike(s),
                Client.contact_person.ilike(s),
                Client.email.ilike(s),
                Client.phone.ilike(s)
            )
        )

    clients = query.order_by(desc(Client.created_at)).offset(skip).limit(limit).all()
    return [_format_client_out(c) for c in clients]


@router.post("", response_model=ClientOut, status_code=status.HTTP_201_CREATED)
def create_client(
    payload: ClientCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_manager_or_higher)
):
    """
    Create a new client profile in PostgreSQL.
    """
    # Check for duplicate business name
    existing_name = db.query(Client).filter(Client.business_name.ilike(payload.business_name.strip())).first()
    if existing_name:
        raise HTTPException(status_code=400, detail="A client with this business name already exists")

    # Check for duplicate email
    existing_email = db.query(Client).filter(Client.email.ilike(payload.email.strip())).first()
    if existing_email:
        raise HTTPException(status_code=400, detail="A client with this email already exists")

    # Validate account manager if provided
    if payload.account_manager_id:
        mgr = db.query(User).filter(User.id == payload.account_manager_id).first()
        if not mgr:
            raise HTTPException(status_code=400, detail="Specified account manager does not exist")

    client = Client(
        business_name=payload.business_name.strip(),
        industry=payload.industry.strip(),
        contact_person=payload.contact_person.strip(),
        email=payload.email.strip().lower(),
        phone=payload.phone.strip() if payload.phone else None,
        address=payload.address.strip() if payload.address else None,
        status=payload.status,
        account_manager_id=payload.account_manager_id or current_user.id
    )
    db.add(client)
    db.commit()
    db.refresh(client)
    return _format_client_out(client)


@router.get("/{client_id}", response_model=ClientOut)
def get_client(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve single client details.
    """
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return _format_client_out(client)


@router.put("/{client_id}", response_model=ClientOut)
def update_client(
    client_id: int,
    payload: ClientUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_manager_or_higher)
):
    """
    Update client details.
    """
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    update_data = payload.model_dump(exclude_unset=True)

    if "business_name" in update_data and update_data["business_name"]:
        existing = db.query(Client).filter(
            Client.business_name.ilike(update_data["business_name"].strip()),
            Client.id != client_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Another client with this business name exists")
        client.business_name = update_data["business_name"].strip()

    if "email" in update_data and update_data["email"]:
        existing = db.query(Client).filter(
            Client.email.ilike(update_data["email"].strip()),
            Client.id != client_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Another client with this email exists")
        client.email = update_data["email"].strip().lower()

    if "contact_person" in update_data and update_data["contact_person"]:
        client.contact_person = update_data["contact_person"].strip()
    if "industry" in update_data and update_data["industry"]:
        client.industry = update_data["industry"].strip()
    if "phone" in update_data:
        client.phone = update_data["phone"].strip() if update_data["phone"] else None
    if "address" in update_data:
        client.address = update_data["address"].strip() if update_data["address"] else None
    if "status" in update_data and update_data["status"]:
        client.status = update_data["status"]
    if "account_manager_id" in update_data:
        client.account_manager_id = update_data["account_manager_id"]

    client.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(client)
    return _format_client_out(client)


@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_client(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """
    Delete client (admin only).
    """
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    db.delete(client)
    db.commit()
    return None
