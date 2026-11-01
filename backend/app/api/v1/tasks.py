from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database.session import get_db
from app.models.tasks import Task
from app.models.clients_projects import Project
from app.models.users import User
from app.schemas.projects import TaskCreate, TaskUpdate, TaskOut
from app.api.deps import get_current_user, get_current_admin, get_current_manager_or_higher

router = APIRouter(prefix="/tasks", tags=["Task Management"])


def _format_task(t: Task) -> TaskOut:
    return TaskOut(
        id=t.id,
        title=t.title,
        description=t.description,
        department_id=t.department_id,
        project_id=t.project_id,
        created_by_id=t.created_by_id,
        assigned_to_id=t.assigned_to_id,
        priority=t.priority,
        status=t.status,
        start_date=t.start_date,
        deadline=t.deadline,
        estimated_hours=t.estimated_hours,
        actual_hours=t.actual_hours,
        progress_percent=t.progress_percent,
        manager_approval_status=t.manager_approval_status,
        created_at=t.created_at,
        updated_at=t.updated_at,
        project_title=t.project.title if t.project else None,
        department_name=t.department.name if t.department else None,
        assigned_to_name=t.assigned_to.user.full_name if t.assigned_to and t.assigned_to.user else None
    )


@router.get("", response_model=List[TaskOut])
def list_tasks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    project_id: Optional[int] = Query(None),
    assigned_to_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    priority: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100)
):
    """
    List actual tasks from PostgreSQL with filters.
    """
    query = db.query(Task)
    if project_id:
        query = query.filter(Task.project_id == project_id)
    if assigned_to_id:
        query = query.filter(Task.assigned_to_id == assigned_to_id)
    if status_filter:
        query = query.filter(Task.status == status_filter)
    if priority:
        query = query.filter(Task.priority == priority)

    tasks = query.order_by(desc(Task.created_at)).offset(skip).limit(limit).all()
    return [_format_task(t) for t in tasks]


@router.get("/{task_id}", response_model=TaskOut)
def get_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get detailed task by ID.
    """
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return _format_task(task)


@router.put("/{task_id}", response_model=TaskOut)
def update_task(
    task_id: int,
    payload: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update task progress, status, or actual hours.
    """
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(task, field, val)

    task.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(task)

    # Recalculate parent project progress if project_id exists
    if task.project_id:
        all_tasks = db.query(Task).filter(Task.project_id == task.project_id).all()
        if all_tasks:
            avg_progress = int(sum(t.progress_percent for t in all_tasks) / len(all_tasks))
            project = db.query(Project).filter(Project.id == task.project_id).first()
            if project:
                project.progress_percent = avg_progress
                db.commit()

    return _format_task(task)


@router.put("/{task_id}/approval", response_model=TaskOut)
def update_task_approval(
    task_id: int,
    approval_status: str = Query(..., pattern="^(approved|rejected|pending)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_manager_or_higher)
):
    """
    Manager approval workflow for completed/reviewed tasks.
    """
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    task.manager_approval_status = approval_status
    if approval_status == "approved":
        task.status = "completed"
        task.progress_percent = 100
    elif approval_status == "rejected":
        task.status = "revision_required"

    task.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(task)
    return _format_task(task)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_manager_or_higher)
):
    """
    Delete a task from PostgreSQL.
    """
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    db.delete(task)
    db.commit()
    return None
