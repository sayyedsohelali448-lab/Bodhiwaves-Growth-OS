from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc

from app.database.session import get_db
from app.models.clients_projects import Project, Client
from app.models.tasks import Task
from app.models.departments import Department
from app.models.users import User
from app.schemas.projects import (
    ProjectCreate,
    ProjectUpdate,
    ProjectOut,
    ProjectDetailOut,
    TaskCreate,
    TaskOut
)
from app.api.deps import get_current_user, get_current_admin, get_current_manager_or_higher

router = APIRouter(prefix="/projects", tags=["Project Management"])


def _format_project_out(p: Project) -> ProjectOut:
    tasks = p.tasks or []
    completed = sum(1 for t in tasks if t.status == "completed")
    return ProjectOut(
        id=p.id,
        title=p.title,
        description=p.description,
        client_id=p.client_id,
        manager_id=p.manager_id,
        department_id=p.department_id,
        budget=p.budget,
        start_date=p.start_date,
        deadline=p.deadline,
        progress_percent=p.progress_percent,
        status=p.status,
        created_at=p.created_at,
        updated_at=p.updated_at,
        client_name=p.client.business_name if p.client else None,
        manager_name=p.manager.full_name if p.manager else None,
        department_name=p.department.name if p.department else None,
        tasks_count=len(tasks),
        completed_tasks_count=completed
    )


def _format_task_out(t: Task) -> TaskOut:
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


@router.get("", response_model=List[ProjectOut])
def list_projects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    status_filter: Optional[str] = Query(None, alias="status"),
    department_id: Optional[int] = Query(None),
    client_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100)
):
    """
    List actual projects from PostgreSQL with optional filtering.
    """
    query = db.query(Project)

    if status_filter:
        query = query.filter(Project.status == status_filter)
    if department_id:
        query = query.filter(Project.department_id == department_id)
    if client_id:
        query = query.filter(Project.client_id == client_id)
    if search:
        query = query.filter(
            or_(
                Project.title.ilike(f"%{search}%"),
                Project.description.ilike(f"%{search}%")
            )
        )

    projects = query.order_by(desc(Project.created_at)).offset(skip).limit(limit).all()
    return [_format_project_out(p) for p in projects]


@router.post("", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
def create_project(
    payload: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_manager_or_higher)
):
    """
    Create a new project in PostgreSQL.
    """
    # Validate client if provided
    if payload.client_id:
        client = db.query(Client).filter(Client.id == payload.client_id).first()
        if not client:
            raise HTTPException(status_code=400, detail="Specified client does not exist")

    # Validate department if provided
    if payload.department_id:
        dept = db.query(Department).filter(Department.id == payload.department_id).first()
        if not dept:
            raise HTTPException(status_code=400, detail="Specified department does not exist")

    # If manager_id not provided, assign to current user
    manager_id = payload.manager_id or current_user.id

    project = Project(
        title=payload.title,
        description=payload.description,
        client_id=payload.client_id,
        manager_id=manager_id,
        department_id=payload.department_id,
        budget=payload.budget,
        start_date=payload.start_date,
        deadline=payload.deadline,
        progress_percent=payload.progress_percent,
        status=payload.status,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return _format_project_out(project)


@router.get("/{project_id}", response_model=ProjectDetailOut)
def get_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get detailed project by ID including its actual tasks.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    base_out = _format_project_out(project)
    task_outs = [_format_task_out(t) for t in (project.tasks or [])]

    return ProjectDetailOut(
        **base_out.model_dump(),
        tasks=task_outs
    )


@router.put("/{project_id}", response_model=ProjectOut)
def update_project(
    project_id: int,
    payload: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_manager_or_higher)
):
    """
    Update project details, deadlines, budget, or progress percent.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(project, field, val)

    project.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(project)
    return _format_project_out(project)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """
    Delete a project from PostgreSQL (Restricted to Admins).
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    db.delete(project)
    db.commit()
    return None


@router.get("/{project_id}/tasks", response_model=List[TaskOut])
def list_project_tasks(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List actual tasks for a specific project.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    tasks = db.query(Task).filter(Task.project_id == project_id).order_by(desc(Task.created_at)).all()
    return [_format_task_out(t) for t in tasks]


@router.post("/{project_id}/tasks", response_model=TaskOut, status_code=status.HTTP_201_CREATED)
def create_project_task(
    project_id: int,
    payload: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_manager_or_higher)
):
    """
    Create a new task under a project.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    task = Task(
        title=payload.title,
        description=payload.description,
        department_id=payload.department_id or project.department_id,
        project_id=project_id,
        created_by_id=current_user.id,
        assigned_to_id=payload.assigned_to_id,
        priority=payload.priority,
        status=payload.status,
        start_date=payload.start_date,
        deadline=payload.deadline,
        estimated_hours=payload.estimated_hours,
        actual_hours=payload.actual_hours,
        progress_percent=payload.progress_percent,
        manager_approval_status=payload.manager_approval_status
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    # Recalculate project progress percent based on tasks
    all_tasks = db.query(Task).filter(Task.project_id == project_id).all()
    if all_tasks:
        avg_progress = int(sum(t.progress_percent for t in all_tasks) / len(all_tasks))
        project.progress_percent = avg_progress
        db.commit()

    return _format_task_out(task)
