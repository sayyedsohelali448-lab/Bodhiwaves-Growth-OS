from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.departments import Department
from app.schemas.departments import DepartmentCreate, DepartmentUpdate, DepartmentOut
from app.schemas.common import APIResponse
from app.api.deps import get_current_user, get_current_admin

router = APIRouter(prefix="/departments", tags=["Departments"])


@router.get("", response_model=APIResponse[List[DepartmentOut]])
def list_departments(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """List all agency departments."""
    depts = db.query(Department).order_by(Department.name.asc()).all()
    return APIResponse(success=True, data=depts)


@router.post("", response_model=APIResponse[DepartmentOut], status_code=status.HTTP_201_CREATED)
def create_department(
    dept_in: DepartmentCreate,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Admin creates a new department."""
    existing = db.query(Department).filter(
        (Department.name.ilike(dept_in.name)) | (Department.code.ilike(dept_in.code))
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Department with this name or code already exists")

    dept = Department(
        name=dept_in.name.strip(),
        code=dept_in.code.strip().upper(),
        description=dept_in.description,
        head_id=dept_in.head_id,
        is_active=dept_in.is_active
    )
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return APIResponse(success=True, message="Department created successfully", data=dept)


@router.get("/{dept_id}", response_model=APIResponse[DepartmentOut])
def get_department(
    dept_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    return APIResponse(success=True, data=dept)


@router.put("/{dept_id}", response_model=APIResponse[DepartmentOut])
def update_department(
    dept_id: int,
    dept_in: DepartmentUpdate,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    if dept_in.name is not None:
        dept.name = dept_in.name.strip()
    if dept_in.code is not None:
        dept.code = dept_in.code.strip().upper()
    if dept_in.description is not None:
        dept.description = dept_in.description
    if dept_in.head_id is not None:
        dept.head_id = dept_in.head_id
    if dept_in.is_active is not None:
        dept.is_active = dept_in.is_active

    db.commit()
    db.refresh(dept)
    return APIResponse(success=True, message="Department updated successfully", data=dept)
