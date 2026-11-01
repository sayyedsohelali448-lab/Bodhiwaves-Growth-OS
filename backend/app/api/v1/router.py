from fastapi import APIRouter
from app.api.v1 import (
    auth,
    users,
    departments,
    employees,
    health,
    projects,
    tasks,
    clients,
    crm,
    hrms,
    tracking,
    finance,
    whatsapp,
    analytics,
    settings
)

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(departments.router)
api_router.include_router(employees.router)
api_router.include_router(projects.router)
api_router.include_router(tasks.router)
api_router.include_router(clients.router)
api_router.include_router(crm.router)
api_router.include_router(hrms.router)
api_router.include_router(tracking.router)
api_router.include_router(finance.router)
api_router.include_router(whatsapp.router)
api_router.include_router(analytics.router)
api_router.include_router(settings.router)
