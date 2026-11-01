import sys
import os
from sqlalchemy.orm import Session

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from app.database.session import SessionLocal
from app.models.departments import Department

INITIAL_DEPARTMENTS = [
    {"name": "Sales & Business Development", "code": "SBD", "description": "Lead generation, sales pipeline, client acquisition"},
    {"name": "Digital Marketing", "code": "DM", "description": "Paid ads, PPC, Meta & Google campaigns, SEO"},
    {"name": "Social Media Management", "code": "SMM", "description": "Organic social strategy, content calendars, community"},
    {"name": "Graphic Design", "code": "GD", "description": "Visual branding, ad creatives, presentation assets"},
    {"name": "Video Editing", "code": "VE", "description": "Reels, YouTube video editing, motion graphics"},
    {"name": "Web Development", "code": "DEV", "description": "Web design, full-stack ERP, client web portals"},
    {"name": "AI & Automation", "code": "AI", "description": "Workflow automations, AI agents, WhatsApp bots"},
    {"name": "Client Success", "code": "CS", "description": "Client retention, onboarding, satisfaction reviews"},
    {"name": "Finance & Accounts", "code": "FIN", "description": "Invoicing, payment collections, payroll & expense tracking"},
    {"name": "HR & Administration", "code": "HR", "description": "Talent management, attendance, employee operations"}
]


def seed_departments():
    db: Session = SessionLocal()
    try:
        count = 0
        for dept_data in INITIAL_DEPARTMENTS:
            existing = db.query(Department).filter(Department.code == dept_data["code"]).first()
            if not existing:
                dept = Department(
                    name=dept_data["name"],
                    code=dept_data["code"],
                    description=dept_data["description"],
                    is_active=True
                )
                db.add(dept)
                count += 1
        db.commit()
        print(f"Successfully seeded {count} initial departments.")
    except Exception as e:
        db.rollback()
        print(f"Error seeding departments: {e}")
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    seed_departments()
