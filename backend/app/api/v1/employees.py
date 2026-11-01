from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.employees import Employee
from app.models.users import User
from app.schemas.employees import EmployeeCreate, EmployeeUpdate, EmployeeOut
from app.schemas.common import APIResponse, PaginatedResponse
from app.api.deps import get_current_user, get_current_admin, get_current_manager_or_higher
from app.websockets.connection_manager import ws_manager

router = APIRouter(prefix="/employees", tags=["Employees & Workforce"])


@router.get("", response_model=PaginatedResponse[EmployeeOut])
def list_employees(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    department_id: Optional[int] = None,
    live_status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all agency employees with live status and department filters."""
    query = db.query(Employee)

    if department_id:
        query = query.filter(Employee.department_id == department_id)
    if live_status:
        query = query.filter(Employee.live_status == live_status)

    total = query.count()
    employees = query.order_by(Employee.created_at.desc()).offset((page - 1) * size).limit(size).all()

    return PaginatedResponse(
        total=total,
        page=page,
        size=size,
        items=employees
    )


@router.post("", response_model=APIResponse[EmployeeOut], status_code=status.HTTP_201_CREATED)
def create_employee_profile(
    emp_in: EmployeeCreate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_manager_or_higher)
):
    """Assign an existing user account to an employee profile."""
    user = db.query(User).filter(User.id == emp_in.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    existing = db.query(Employee).filter(
        (Employee.user_id == emp_in.user_id) | (Employee.employee_code == emp_in.employee_code)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Employee profile or code already exists")

    new_emp = Employee(
        user_id=emp_in.user_id,
        employee_code=emp_in.employee_code.strip(),
        department_id=emp_in.department_id,
        reporting_manager_id=emp_in.reporting_manager_id,
        designation=emp_in.designation.strip(),
        joining_date=emp_in.joining_date,
        employment_status=emp_in.employment_status,
        live_status="offline",
        skills=emp_in.skills,
        emergency_contact=emp_in.emergency_contact
    )
    db.add(new_emp)
    db.commit()
    db.refresh(new_emp)
    return APIResponse(success=True, message="Employee profile created successfully", data=new_emp)


@router.get("/{emp_id}", response_model=APIResponse[EmployeeOut])
def get_employee(
    emp_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    emp = db.query(Employee).filter(Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    return APIResponse(success=True, data=emp)


@router.put("/{emp_id}", response_model=APIResponse[EmployeeOut])
def update_employee(
    emp_id: int,
    emp_in: EmployeeUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_manager_or_higher)
):
    emp = db.query(Employee).filter(Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    if emp_in.department_id is not None:
        emp.department_id = emp_in.department_id
    if emp_in.reporting_manager_id is not None:
        emp.reporting_manager_id = emp_in.reporting_manager_id
    if emp_in.designation is not None:
        emp.designation = emp_in.designation
    if emp_in.employment_status is not None:
        emp.employment_status = emp_in.employment_status
    if emp_in.live_status is not None:
        emp.live_status = emp_in.live_status
    if emp_in.skills is not None:
        emp.skills = emp_in.skills
    if emp_in.emergency_contact is not None:
        emp.emergency_contact = emp_in.emergency_contact

    db.commit()
    db.refresh(emp)
    return APIResponse(success=True, message="Employee updated successfully", data=emp)


@router.post("/{emp_id}/live-status", response_model=APIResponse[EmployeeOut])
async def update_live_status(
    emp_id: int,
    status_value: str = Query(..., pattern="^(online|working|break|away|offline)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Transparent workforce tracking: update live status (online/working/break/away/offline) 
    and broadcast instantly to the Command Center via WebSockets.
    """
    emp = db.query(Employee).filter(Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Only self or managers can update status
    if current_user.id != emp.user_id and current_user.role not in ["super_admin", "admin", "department_manager"]:
        raise HTTPException(status_code=403, detail="Cannot update another employee's status")

    emp.live_status = status_value
    emp.last_active_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(emp)

    # Broadcast status change to connected admin dashboards via WebSocket
    await ws_manager.broadcast({
        "event": "EMPLOYEE_STATUS_CHANGED",
        "employee_id": emp.id,
        "employee_code": emp.employee_code,
        "new_status": emp.live_status,
        "timestamp": emp.last_active_at.isoformat()
    })

    return APIResponse(success=True, message=f"Status updated to {status_value}", data=emp)
