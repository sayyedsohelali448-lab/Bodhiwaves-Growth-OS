# Bodhiwaves Growth OS — Enterprise Agency ERP

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.3+-61DAFB.svg?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5+-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18.3-4169E1.svg?logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![MongoDB Atlas](https://img.shields.io/badge/MongoDB%20Atlas-Integrated-47A248.svg?logo=mongodb&logoColor=white)](https://www.mongodb.com/atlas)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-v4-38B2AC.svg?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)

**Bodhiwaves Growth OS** is a commercial enterprise SaaS ERP system built specifically for creative, digital growth, and media agencies. It provides an integrated, multi-tenant capable operating system replacing fragmented tooling across sales, workforce, project delivery, financial billing, and client communication.

---

## 1. Core Modules & Capabilities

1. **Executive Command Center:** Real-time agency health dashboard, live revenue velocity, pipeline status, and workforce deployment.
2. **CRM & Sales Pipeline:** Lead tracking with stages (`new`, `contacted`, `qualified`, `proposal_sent`, `negotiation`, `won`, `lost`), deal valuation, and activity logging.
3. **Clients Management:** Business entity directory, contact profiles, project assignments, and lifecycle tagging (`lead`, `onboarding`, `active`, `archived`).
4. **Agency Departments:** Operational division management, cost centers, and department leadership.
5. **Workforce & HRMS:** Employee enrollment, attendance check-in/out, work-hour calculation, leave requests, and manager review workflows.
6. **Live Workforce Tracking:** Transparent employee presence (`online`, `working`, `break`, `away`, `offline`), active task binding, and work sessions.
7. **Tasks & Sprints:** Agile sprint deliverables, time logging, priority levels, deadlines, and manager deliverable approval/revision loops.
8. **Projects & Campaigns:** Scope, budget tracking, client linkage, team assignment, and automatic progress calculation derived from child tasks.
9. **WhatsApp Business Inbox:** Meta WhatsApp Cloud API integration architecture with incoming webhooks, conversation threads, and template messaging.
10. **Finance & Invoices:** Tax invoice issuance, line items, payment tracking with partial/full settlements, and expense categorization.
11. **Analytics & Reports:** Aggregated SQL analytics across cash flow, team utilization, and conversion metrics.
12. **Settings & Security:** User profile management, bcrypt password updates, audit logging, and role-based permissions.
13. **Authentication & RBAC:** JWT access tokens, refresh token rotation, login history, and strict multi-role authorization.

---

## 2. Technical Architecture

```
                    ┌────────────────────────────────────────┐
                    │      React 18 + Vite + TypeScript      │
                    │   (Tailwind CSS, Lucide Icons, Router) │
                    └───────────────────┬────────────────────┘
                                        │ HTTPS / WSS
                                        ▼
                    ┌────────────────────────────────────────┐
                    │             FastAPI Backend            │
                    │       (Pydantic v2, Python 3.11+)      │
                    └───────────┬────────────────┬───────────┘
                                │                │
              SQLAlchemy Async  │                │ PyMongo Async
                                ▼                ▼
            ┌───────────────────────┐  ┌───────────────────────┐
            │     PostgreSQL 18     │  │     MongoDB Atlas     │
            │   Primary ACID Store  │  │   Secondary Datastore │
            │      (24 Tables)      │  │ (Async Client / Ping) │
            └───────────────────────┘  └───────────────────────┘
```

---

## 3. Getting Started

### Prerequisites
- **Python**: 3.11+
- **Node.js**: v20+ / npm v10+
- **PostgreSQL**: 15+ (Running locally or hosted)

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Copy the environment configuration template:
   ```bash
   cp .env.example .env
   ```
   *(Configure your local `DATABASE_URL` and optional `MONGODB_URL` in `.env`)*

3. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Run database migrations:
   ```bash
   python -m alembic upgrade head
   ```

5. (Optional) Bootstrap Super Admin and seed standard agency departments:
   ```bash
   python -m app.cli.bootstrap_admin --email admin@bodhiwaves.com --password "AdminPassword@2026!" --name "Agency Admin"
   python -m app.cli.seed_departments
   ```

6. Start the FastAPI development server:
   ```bash
   python run_server.py
   ```
   - API Server: `http://localhost:8000`
   - Interactive Swagger Docs: `http://localhost:8000/docs`
   - Health Check: `http://localhost:8000/api/v1/health`

### Frontend Setup

1. In a separate terminal, navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   - Application URL: `http://localhost:5173`

4. Build production bundle:
   ```bash
   npm run build
   ```

---

## 4. Running Automated Tests

To run the complete automated test suite (including Authentication, RBAC, Projects, Tasks, Clients, CRM, Finance, Analytics, and MongoDB Atlas connectivity):

```bash
cd backend
python -m pytest -v
```

---

## 5. Security & Commercial Integrity Policy

- **No Fake Business Data**: Zero mock metrics or fabricated records are pre-populated. All figures reflect live database state.
- **Strict Credential Protection**: Environment files (`.env`), database connection strings, passwords, and private tokens are excluded from version control via `.gitignore`.
- **Role-Based Access Control**: All operations enforce strict backend dependency checks based on user roles (`super_admin`, `admin`, `department_manager`, `team_leader`, `employee`, `client`).

---

## 6. License & Ownership

Proprietary commercial software developed for Bodhiwaves Media. All rights reserved.
