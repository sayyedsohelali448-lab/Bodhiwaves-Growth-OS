from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database.session import get_db
from app.models.clients_projects import Project, Client
from app.models.crm import Lead
from app.models.finance import Invoice, Payment, Expense
from app.models.departments import Department
from app.models.employees import Employee
from app.models.tasks import Task
from app.models.users import User
from app.api.deps import get_current_user

router = APIRouter(prefix="/analytics", tags=["Analytics & Reports"])


@router.get("/overview")
def get_analytics_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get aggregated commercial metrics computed strictly from PostgreSQL records.
    """
    # 1. Financial metrics
    invoices = db.query(Invoice).all()
    expenses = db.query(Expense).all()
    total_revenue = sum(i.paid_amount for i in invoices)
    total_invoiced = sum(i.total_amount for i in invoices)
    outstanding_invoices = sum(i.balance_amount for i in invoices)
    total_expenses = sum(e.amount for e in expenses)

    # 2. Leads & Pipeline
    leads = db.query(Lead).all()
    pipeline_value = sum(l.estimated_value for l in leads if l.stage not in ["lost"])
    leads_by_stage: Dict[str, int] = {}
    for l in leads:
        leads_by_stage[l.stage] = leads_by_stage.get(l.stage, 0) + 1

    # 3. Projects & Deliverables
    projects = db.query(Project).all()
    tasks = db.query(Task).all()
    active_projects = sum(1 for p in projects if p.status in ["planning", "in_progress", "in_review"])
    completed_projects = sum(1 for p in projects if p.status == "completed")
    completed_tasks = sum(1 for t in tasks if t.status == "completed")

    # 4. Clients
    clients_count = db.query(Client).count()

    # 5. Workforce
    employees = db.query(Employee).all()
    departments = db.query(Department).all()

    workforce_by_dept: List[Dict[str, Any]] = []
    for d in departments:
        count = sum(1 for e in employees if e.department_id == d.id)
        workforce_by_dept.append({
            "department_id": d.id,
            "department_name": d.name,
            "department_code": d.code,
            "employee_count": count
        })

    return {
        "finance": {
            "total_revenue": total_revenue,
            "total_invoiced": total_invoiced,
            "outstanding_invoices": outstanding_invoices,
            "total_expenses": total_expenses,
            "net_margin": total_revenue - total_expenses,
            "invoices_count": len(invoices)
        },
        "pipeline": {
            "total_leads": len(leads),
            "pipeline_value": pipeline_value,
            "stages": leads_by_stage
        },
        "projects": {
            "total_projects": len(projects),
            "active_projects": active_projects,
            "completed_projects": completed_projects,
            "total_tasks": len(tasks),
            "completed_tasks": completed_tasks
        },
        "clients": {
            "total_clients": clients_count
        },
        "workforce": {
            "total_employees": len(employees),
            "total_departments": len(departments),
            "by_department": workforce_by_dept
        }
    }
