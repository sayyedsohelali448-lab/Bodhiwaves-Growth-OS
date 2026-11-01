from typing import List, Optional
from datetime import datetime, timezone, date
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database.session import get_db
from app.core.security import get_password_hash
from app.models.users import User
from app.models.employees import Employee
from app.models.departments import Department
from app.models.attendance import Attendance, LeaveRequest
from app.schemas.hrms import (
    AttendanceOut,
    CheckInRequest,
    CheckOutRequest,
    LeaveRequestCreate,
    LeaveRequestReview,
    LeaveRequestOut,
    EmployeeEnrollRequest
)
from app.schemas.employees import EmployeeOut
from app.api.deps import get_current_user, get_current_admin, get_current_manager_or_higher

router = APIRouter(prefix="/hrms", tags=["Workforce & HRMS"])


def _format_attendance(att: Attendance) -> AttendanceOut:
    emp = att.employee
    user = emp.user if emp else None
    return AttendanceOut(
        id=att.id,
        employee_id=att.employee_id,
        employee_name=user.full_name if user else None,
        employee_code=emp.employee_code if emp else None,
        date=att.date,
        check_in_time=att.check_in_time,
        check_out_time=att.check_out_time,
        total_working_hours=att.total_working_hours,
        status=att.status,
        notes=att.notes,
        created_at=att.created_at
    )


def _format_leave(lv: LeaveRequest) -> LeaveRequestOut:
    emp = lv.employee
    user = emp.user if emp else None
    reviewer = lv.reviewed_by
    return LeaveRequestOut(
        id=lv.id,
        employee_id=lv.employee_id,
        employee_name=user.full_name if user else None,
        employee_code=emp.employee_code if emp else None,
        leave_type=lv.leave_type,
        start_date=lv.start_date,
        end_date=lv.end_date,
        reason=lv.reason,
        status=lv.status,
        reviewed_by_id=lv.reviewed_by_id,
        reviewed_by_name=reviewer.full_name if reviewer else None,
        review_notes=lv.review_notes,
        created_at=lv.created_at
    )


# ==========================================
# Attendance Endpoints
# ==========================================

@router.get("/attendance", response_model=List[AttendanceOut])
def list_attendance(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    date_query: Optional[str] = Query(None, alias="date"),
    employee_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status")
):
    """
    List attendance records from PostgreSQL.
    """
    query = db.query(Attendance)

    if date_query:
        query = query.filter(Attendance.date == date_query)
    if employee_id:
        query = query.filter(Attendance.employee_id == employee_id)
    if status_filter and status_filter != "all":
        query = query.filter(Attendance.status == status_filter)

    records = query.order_by(desc(Attendance.created_at)).limit(100).all()
    return [_format_attendance(a) for a in records]


@router.get("/attendance/today", response_model=Optional[AttendanceOut])
def get_today_attendance(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get current logged-in employee's attendance status for today.
    """
    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if not emp:
        return None

    today_str = date.today().isoformat()
    record = db.query(Attendance).filter(
        Attendance.employee_id == emp.id,
        Attendance.date == today_str
    ).first()

    return _format_attendance(record) if record else None


@router.post("/attendance/check-in", response_model=AttendanceOut)
def check_in(
    payload: CheckInRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Check-in for today's workday.
    """
    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if not emp:
        raise HTTPException(status_code=400, detail="User does not have an employee profile")

    today_str = date.today().isoformat()
    existing = db.query(Attendance).filter(
        Attendance.employee_id == emp.id,
        Attendance.date == today_str
    ).first()

    if existing and existing.check_in_time:
        raise HTTPException(status_code=400, detail="Already checked in for today")

    now = datetime.now(timezone.utc)
    if not existing:
        record = Attendance(
            employee_id=emp.id,
            date=today_str,
            check_in_time=now,
            status="present",
            notes=payload.notes
        )
        db.add(record)
    else:
        existing.check_in_time = now
        existing.status = "present"
        if payload.notes:
            existing.notes = payload.notes
        record = existing

    # Update employee live status
    emp.live_status = "working"
    emp.last_active_at = now

    db.commit()
    db.refresh(record)
    return _format_attendance(record)


@router.post("/attendance/check-out", response_model=AttendanceOut)
def check_out(
    payload: CheckOutRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Check-out from today's workday and compute actual hours.
    """
    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if not emp:
        raise HTTPException(status_code=400, detail="User does not have an employee profile")

    today_str = date.today().isoformat()
    record = db.query(Attendance).filter(
        Attendance.employee_id == emp.id,
        Attendance.date == today_str
    ).first()

    if not record or not record.check_in_time:
        raise HTTPException(status_code=400, detail="Cannot check out without checking in first")

    now = datetime.now(timezone.utc)
    record.check_out_time = now

    # Calculate hours
    check_in_dt = record.check_in_time
    if check_in_dt.tzinfo is None:
        check_in_dt = check_in_dt.replace(tzinfo=timezone.utc)
    diff = (now - check_in_dt).total_seconds() / 3600.0
    record.total_working_hours = round(max(0.0, diff), 2)

    if payload.notes:
        record.notes = (record.notes or "") + f" | Out: {payload.notes}"

    # Update employee live status
    emp.live_status = "offline"
    emp.last_active_at = now

    db.commit()
    db.refresh(record)
    return _format_attendance(record)


# ==========================================
# Leave Endpoints
# ==========================================

@router.get("/leaves", response_model=List[LeaveRequestOut])
def list_leaves(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    status_filter: Optional[str] = Query(None, alias="status")
):
    """
    List leave requests from PostgreSQL.
    """
    query = db.query(LeaveRequest)

    # Regular employees see their own leaves; managers and admins see all
    is_mgr = current_user.role in ["super_admin", "admin", "department_manager", "team_leader"]
    if not is_mgr:
        emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
        if not emp:
            return []
        query = query.filter(LeaveRequest.employee_id == emp.id)

    if status_filter and status_filter != "all":
        query = query.filter(LeaveRequest.status == status_filter)

    leaves = query.order_by(desc(LeaveRequest.created_at)).all()
    return [_format_leave(l) for l in leaves]


@router.post("/leaves", response_model=LeaveRequestOut, status_code=status.HTTP_201_CREATED)
def apply_leave(
    payload: LeaveRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Submit a formal leave application.
    """
    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if not emp:
        raise HTTPException(status_code=400, detail="User does not have an employee profile")

    leave = LeaveRequest(
        employee_id=emp.id,
        leave_type=payload.leave_type,
        start_date=payload.start_date,
        end_date=payload.end_date,
        reason=payload.reason.strip(),
        status="pending"
    )
    db.add(leave)
    db.commit()
    db.refresh(leave)
    return _format_leave(leave)


@router.put("/leaves/{leave_id}/review", response_model=LeaveRequestOut)
def review_leave(
    leave_id: int,
    payload: LeaveRequestReview,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_manager_or_higher)
):
    """
    Approve or reject a leave request (Manager or Admin).
    """
    leave = db.query(LeaveRequest).filter(LeaveRequest.id == leave_id).first()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave request not found")

    leave.status = payload.status
    leave.reviewed_by_id = current_user.id
    leave.review_notes = payload.review_notes.strip() if payload.review_notes else None

    db.commit()
    db.refresh(leave)
    return _format_leave(leave)


# ==========================================
# Employee Enrollment Endpoint
# ==========================================

@router.post("/enroll", status_code=status.HTTP_201_CREATED)
def enroll_employee(
    payload: EmployeeEnrollRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_manager_or_higher)
):
    """
    Enroll a new employee with user account and designation.
    """
    # Check if email exists
    existing = db.query(User).filter(User.email == payload.email.strip().lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="A user with this email already exists")

    # Check if employee code exists
    existing_code = db.query(Employee).filter(Employee.employee_code == payload.employee_code.strip()).first()
    if existing_code:
        raise HTTPException(status_code=400, detail="Employee code already in use")

    # Validate department if provided
    if payload.department_id:
        dept = db.query(Department).filter(Department.id == payload.department_id).first()
        if not dept:
            raise HTTPException(status_code=400, detail="Specified department does not exist")

    # Generate initials
    name_parts = payload.full_name.strip().split()
    initials = f"{name_parts[0][0]}{name_parts[-1][0]}".upper() if len(name_parts) >= 2 else payload.full_name[:2].upper()

    # 1. Create User
    new_user = User(
        email=payload.email.strip().lower(),
        hashed_password=get_password_hash(payload.password),
        full_name=payload.full_name.strip(),
        role=payload.role,
        phone=payload.phone.strip() if payload.phone else None,
        avatar_initials=initials,
        is_active=True,
        is_verified=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # 2. Create Employee profile
    new_emp = Employee(
        user_id=new_user.id,
        employee_code=payload.employee_code.strip(),
        department_id=payload.department_id,
        designation=payload.designation.strip(),
        joining_date=payload.joining_date or date.today().isoformat(),
        employment_status="active",
        live_status="offline"
    )
    db.add(new_emp)
    db.commit()
    db.refresh(new_emp)

    return {
        "success": True,
        "message": f"Employee {new_user.full_name} enrolled successfully",
        "user_id": new_user.id,
        "employee_id": new_emp.id,
        "employee_code": new_emp.employee_code
    }
