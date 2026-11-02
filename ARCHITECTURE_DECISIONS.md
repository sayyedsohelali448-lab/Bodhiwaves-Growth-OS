# Bodhiwaves Growth OS — Architecture Decisions

**Product:** Bodhiwaves Growth OS  
**Architecture track:** Option B — Next.js full-stack application  
**Status:** Accepted for Phase 0  
**Source of truth:** Complete Product Specification v1.0 supplied by the product owner

## 1. Non-negotiable product requirements

This implementation retains the product requirements already approved in the specification: the six roles (Admin, HR, Sales, Project Lead, Employee, Client); server-side permission enforcement; all 18 functional modules; security, auditability, responsive behavior, WhatsApp Cloud API, reporting, client portal, finance, and the phased delivery/acceptance gates. No module, permission, workflow, score weight, security control, or acceptance criterion is removed or silently redefined.

The detailed requirements remain the product source of truth. This architecture document describes the technical implementation, not a replacement specification.

## 2. Selected stack

| Layer | Decision |
|---|---|
| Web application | Next.js App Router, React, TypeScript |
| UI | Tailwind CSS v4, shadcn/ui component conventions, Lucide icons |
| Validation | Zod |
| Data store | PostgreSQL |
| ORM and migrations | Prisma ORM 7 stable line |
| Backend boundary | Next.js Server Components, Server Actions and Route Handlers |
| Realtime | WebSocket/SSE; select implementation during the relevant phase |
| Background jobs | Redis + BullMQ |
| Private file storage | AWS S3 or Cloudflare R2 with signed URLs |
| Email | Resend / SendGrid / AWS SES; provider selection remains open |
| WhatsApp | Official Meta WhatsApp Business Cloud API |
| Monitoring | Sentry |
| Runtime | Node.js 22 LTS |

Prisma 7 is selected for the initial production foundation because Prisma 8 is still a release candidate as of this architecture decision. Re-evaluate only with explicit product-owner approval and a compatibility review.

## 3. Application boundaries

- `next-app/` is the new Option B application and is isolated from the existing codebase.
- Existing `backend/`, `frontend/`, Alembic migrations, deployment configuration, and current production service are not migrated, deleted, or modified by Phase 0.
- The Next.js application owns future UI, server-side business logic, API routes, and Prisma data access.
- PostgreSQL is the system of record. No second database is introduced by this decision.
- Secrets remain server-side and are never exposed through public environment variables or client bundles.

## 4. Product domains

The following domains are retained from Product Specification v1.0:

1. Authentication and security
2. Users, departments and organization
3. CRM and sales
4. Clients
5. Services and packages
6. Projects and milestones
7. Tasks and time tracking
8. Attendance and shifts
9. Leave management
10. Performance management
11. Live dashboards
12. WhatsApp shared inbox and automation
13. Content calendar and campaigns
14. Finance and invoicing
15. Client portal
16. Notifications
17. Reports
18. Settings and administration

## 5. Role model

Admin, HR, Sales, Project Lead, Employee, and Client remain the approved roles. Resource scope and action permissions must be enforced on the server for every protected operation. Hiding a button or route in the UI is not authorization.

## 6. Phase 0 boundary

Phase 0 establishes the application skeleton and design system only:
- Next.js App Router and TypeScript foundation
- Responsive application shell and navigation structure
- Brand tokens, typography, spacing, color themes and reusable UI primitives
- Light/dark theme foundation
- Empty/loading/error presentation conventions
- Environment-variable example and developer documentation
- Lint, type-check and production-build scripts

Phase 0 does not implement authentication, database migrations, business CRUD, role enforcement, WhatsApp delivery, finance calculations, or real business metrics. Those belong to later approved phases.

## 7. Change control

Any change to a product requirement, role, permission, workflow, score formula, security rule, module, or acceptance criterion requires explicit approval from the product owner before implementation. Technical implementation details may be refined only when they preserve the approved behavior and are documented.

## 8. Existing repository safety

Phase 0 is delivered on branch `phase-0-nextjs-foundation` under `next-app/`. The existing `main` branch is left untouched. No production deployment or database mutation is part of this phase.
