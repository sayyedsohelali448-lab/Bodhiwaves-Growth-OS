from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database.session import get_db
from app.models.users import User
from app.models.employees import Employee
from app.models.tasks import Task, WorkLog
from app.models.attendance import WorkSession
from app.api.deps import get_current_user

router = APIRouter(prefix="/tracking", tags=["Live Workforce Tracking"])


@router.get("/team")
def get_team_presence(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get live presence of all agency staff (no fake surveillance, honest database statuses).
    """
    employees = db.query(Employee).all()
    results = []

    for emp in employees:
        user = emp.user
        dept = emp.department

        # Check for active open work session
        active_session = db.query(WorkSession).filter(
            WorkSession.employee_id == emp.id,
            WorkSession.end_time == None
        ).order_by(desc(WorkSession.start_time)).first()

        task_title = None
        if active_session and active_session.task_id:
            t = db.query(Task).filter(Task.id == active_session.task_id).first()
            if t:
                task_title = t.title

        results.append({
            "employee_id": emp.id,
            "employee_code": emp.employee_code,
            "full_name": user.full_name if user else "Unknown",
            "avatar_initials": user.avatar_initials if user else "BW",
            "department_name": dept.name if dept else None,
            "designation": emp.designation,
            "live_status": emp.live_status,
            "last_active_at": emp.last_active_at,
            "current_task": task_title,
            "session_type": active_session.session_type if active_session else None,
            "session_started_at": active_session.start_time if active_session else None
        })

    return results


@router.get("/my-session")
def get_my_active_session(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get current logged in user's active work session.
    """
    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if not emp:
        return None

    active_session = db.query(WorkSession).filter(
        WorkSession.employee_id == emp.id,
        WorkSession.end_time == None
    ).order_by(desc(WorkSession.start_time)).first()

    if not active_session:
        return None

    task_title = None
    if active_session.task_id:
        t = db.query(Task).filter(Task.id == active_session.task_id).first()
        if t:
            task_title = t.title

    return {
        "session_id": active_session.id,
        "session_type": active_session.session_type,
        "task_id": active_session.task_id,
        "task_title": task_title,
        "start_time": active_session.start_time,
        "last_heartbeat": active_session.last_heartbeat,
        "notes": active_session.notes
    }


@router.post("/session/start")
def start_session(
    session_type: str = Query("working", pattern="^(working|break)$"),
    task_id: Optional[int] = Query(None),
    notes: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Start an active work or break session.
    """
    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if not emp:
        raise HTTPException(status_code=400, detail="User does not have an employee profile")

    now = datetime.now(timezone.utc)

    # Close any existing open session first
    open_sessions = db.query(WorkSession).filter(
        WorkSession.employee_id == emp.id,
        WorkSession.end_time == None
    ).all()

    for s in open_sessions:
        s.end_time = now
        start = s.start_time
        if start.tzinfo is None:
            start = start.replace(tzinfo=timezone.utc)
        s.duration_minutes = round((now - start).total_seconds() / 60.0, 1)

    # Create new session
    new_session = WorkSession(
        employee_id=emp.id,
        task_id=task_id,
        session_type=session_type,
        start_time=now,
        last_heartbeat=now,
        notes=notes
    )
    db.add(new_session)

    # Update employee live status
    emp.live_status = "working" if session_type == "working" else "break"
    emp.last_active_at = now

    db.commit()
    db.refresh(new_session)

    return {
        "success": True,
        "session_id": new_session.id,
        "session_type": new_session.session_type,
        "start_time": new_session.start_time
    }


@router.post("/session/stop")
def stop_session(
    notes: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Stop current active work session.
    """
    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if not emp:
        raise HTTPException(status_code=400, detail="User does not have an employee profile")

    active_session = db.query(WorkSession).filter(
        WorkSession.employee_id == emp.id,
        WorkSession.end_time == None
    ).order_by(desc(WorkSession.start_time)).first()

    if not active_session:
        raise HTTPException(status_code=400, detail="No active session found to stop")

    now = datetime.now(timezone.utc)
    active_session.end_time = now
    start = active_session.start_time
    if start.tzinfo is None:
        start = start.replace(tzinfo=timezone.utc)
    active_session.duration_minutes = round((now - start).total_seconds() / 60.0, 1)

    if notes:
        active_session.notes = (active_session.notes or "") + f" | End: {notes}"

    # If linked to a task, record a work log
    if active_session.task_id and active_session.session_type == "working":
        hours = round(active_session.duration_minutes / 60.0, 2)
        if hours > 0:
            log = WorkLog(
                task_id=active_session.task_id,
                employee_id=emp.id,
                log_date=now.date().isoformat(),
                hours_spent=hours,
                description=notes or "Completed tracked work session"
            )
            db.add(log)

            # Update task actual hours
            task = db.query(Task).filter(Task.id == active_session.task_id).first()
            if task:
                task.actual_hours = (task.actual_hours or 0.0) + hours

    emp.live_status = "offline"
    emp.last_active_at = now

    db.commit()

    return {
        "success": True,
        "duration_minutes": active_session.duration_minutes,
        "stopped_at": now
    }
