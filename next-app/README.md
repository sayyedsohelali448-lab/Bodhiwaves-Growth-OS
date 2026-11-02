# Bodhiwaves Growth OS — Next.js application

This is the new Option B application, isolated from the existing FastAPI + React/Vite implementation.

## Stack
- Next.js App Router, React and TypeScript
- Tailwind CSS v4
- shadcn/ui-compatible component setup
- PostgreSQL + Prisma ORM 7 stable line (database work starts in Phase 1)
- Zod validation

## Requirements
- Node.js 22 LTS
- npm 10+

## Local setup

```bash
cd next-app
cp .env.example .env.local
npm install
npm run dev
```

Open http://localhost:3000.

## Quality commands

```bash
npm run lint
npm run typecheck
npm run build
```

## Phase boundary
This Phase 0 application contains the responsive app shell, design tokens, theme switcher, and UI primitives only. Authentication, database schema/migrations, permissions, and business modules are not implemented yet.

Do not use the placeholder dashboard as a source of operational data. Empty values are intentional until live data is implemented.
