# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

This document is the authoritative engineering instruction guide for **Claude Code** working inside the **RMS Careers** repository.

---

## 1. Project Overview

**RMS Careers** (Rising Minds Solutions) is an enterprise-grade technical career-readiness, curriculum delivery, and campus placement platform engineered for B.Tech engineering students across disciplines and academic years.

The institutional business model is college-led (B2B partnerships / MoUs). The platform bridges academic theory and industry engineering hiring standards through pattern-based problem solving, production-grade project development, and structured placement preparation.

---

## 2. Architecture & Application Boundaries

The repository is structured as a **pnpm monorepo** with strict surface separation:

```text
RMS-Careers/
├── apps/
│   ├── web/        # Public Corporate Website (www.rms-careers.com, port 3001; deployed to Cloudflare via OpenNext)
│   ├── student/    # Authenticated Student Learning Portal (student.rms-careers.com, port 3002)
│   └── admin/      # Institutional Control Plane & Admin Portal (admin.rms-careers.com, port 3000)
├── packages/
│   ├── db/         # @rms/db — Drizzle ORM schema, Neon PostgreSQL client, migrations
│   └── auth/       # @rms/auth — Password hashing (bcrypt), token hashing (SHA-256), RBAC guards
└── docs/           # Architecture specifications, roadmaps, guardrails, and conventions
```

### Future Planned Surfaces:
- `apps/tutor`: Authenticated Tutor Evaluation Workbench (`tutor.rms-careers.com`)

### Canonical Domain Architecture:
- **Corporate Website**: `https://www.rms-careers.com` (canonical public identity; apex `rms-careers.com` redirects to `www`)
- **Student Portal**: `https://student.rms-careers.com`
- **Tutor Portal**: `https://tutor.rms-careers.com`
- **Admin Portal**: `https://admin.rms-careers.com`
- **CRITICAL**: The hyphenated domain (`rms-careers.com`) is mandatory. Never introduce `rmscareers.com`.
- **Surface Isolation**: Wildcard domain cookies (`.rms-careers.com`) and shared authentication across portals are **strictly prohibited**. Each application maintains independent session boundaries.

### Cross-App Data Flow
- All apps share one Neon database through `@rms/db` (`packages/db/src/schema.ts` is the single schema; `index.ts` exports `db` plus tables). Admin writes the institutional data (colleges, batches, students, content, assessments); the student portal reads it and writes student activity.
- Each app imports `@rms/db` / `@rms/auth` directly as workspace packages and uses an `@/` path alias rooted at the app directory.

### Student Portal (`apps/student`) Structure
- **Auth**: Its own Auth.js instance (`lib/auth.ts` + edge-safe `lib/auth/config.ts`), credentials-only, `role: 'student'`, with a dedicated `AUTH_SECRET` that must never be shared with admin/tutor. `middleware.ts` protects everything except `api`, `login`, `activate`, `forgot-password`, `reset-password`, `resend-activation` — update the matcher when adding public routes.
- **Layering**: `lib/actions/*` (Server Actions) → `lib/services/*` (cross-cutting logic, e.g. activity rewards, resume learning) → `lib/db/queries/*` (server-only Drizzle queries). Shared shapes live in `lib/types/*`.
- **Multi-batch / cohort model**: A student can belong to several batches. The active cohort is persisted in the `rms_active_cohort` cookie (`lib/constants/cohort.ts`) and resolved server-side; leaderboards, deadlines, overview, and progress are scoped to batch-attributed activity. See `docs/specs/phase-4-multi-batch-alignment.md`.
- **Domain events**: `lib/events/dispatcher.ts` fans domain events out to consumers (notifications rows, optional email; email reports `provider_not_configured` rather than failing when unset).

---

## 3. Development Commands

Always use `pnpm` (version 9.15.4+). On Windows, invoke `pnpm` or `pnpm.cmd`.

### Workspace Execution
```bash
# Install dependencies
pnpm install

# Start development servers
pnpm dev:admin            # Runs @rms/admin on http://localhost:3000 (Turbopack)
pnpm dev:web              # Runs @rms/web on http://localhost:3001
pnpm dev:student          # Runs @rms/student on http://localhost:3002

# Execute tests across all packages
pnpm test                 # Unit tier only: Vitest in every workspace (web, admin, student, auth, db); cannot open a DB connection
pnpm test:int             # Integration tier (*.int.test.ts); requires TEST_DATABASE_URL + TEST_DATABASE_ENDPOINT (RMS-Careers-NonProd/test), aborts otherwise

# Run TypeScript type checking
pnpm typecheck            # Runs tsc --noEmit across all workspaces

# Production builds
pnpm build                # Builds all apps in apps/* via Next.js

# Database administration
pnpm admin:seed           # Seeds initial Super Administrator into the DEVELOPMENT db (rms_dev*); production is rejected
pnpm student:seed         # Seeds demo student data into the DEVELOPMENT db (apps/student/scripts/seed-student.ts)
pnpm admin:seed:test / student:seed:test   # Same, against TEST_DATABASE_URL
pnpm test:db:bootstrap    # Migrate + sentinel for the empty NonProd test database
# Database safety: see docs/development/testing.md. Tests/seeds never read .env.local; production is never a seed/test target.
```

### Scoped Package Commands
```bash
# Package-specific tests
pnpm --filter @rms/admin test
pnpm --filter @rms/web test
pnpm --filter @rms/auth test
pnpm --filter @rms/student test

# Single test file / single test (Vitest; tests live in lib/__tests__/*.test.ts)
pnpm --filter @rms/student exec vitest run lib/__tests__/cohort.test.ts
pnpm --filter @rms/admin exec vitest run -t "test name substring"

# Package-specific type checking
pnpm --filter @rms/admin typecheck
pnpm --filter @rms/web typecheck
pnpm --filter @rms/student typecheck
pnpm --filter @rms/db typecheck

# Database migrations & tools (packages/db)
pnpm --filter @rms/db db:generate    # Generate migration from schema changes
pnpm --filter @rms/db db:migrate     # Apply migrations to database
pnpm --filter @rms/db db:studio      # Open Drizzle Studio visual editor
pnpm --filter @rms/db db:push        # Push schema directly (avoid for shared DBs; prefer generate + migrate)

# Cloudflare (apps/web only, via @opennextjs/cloudflare + wrangler.jsonc)
pnpm --filter @rms/web preview       # Build with OpenNext and preview locally in workerd
pnpm --filter @rms/web deploy        # Build and deploy to Cloudflare (outward-facing — confirm first)
```

`packages/db/drizzle.config.ts` loads `POSTGRES_URL` from `packages/db/.env.local`, then falls back to `apps/admin/.env.local`, then `.env`.

---

## 4. Engineering Conventions

### 4.1 Tech Stack
- **Framework**: Next.js 15 (App Router, React 19, Server Components & Server Actions)
- **Styling**: Tailwind CSS + Vanilla CSS variables for dark/light themes. `clsx` and `tailwind-merge` for class composition.
- **ORM & Database**: Drizzle ORM (`drizzle-orm/neon-http`) with `@neondatabase/serverless` PostgreSQL.
- **Authentication**: Auth.js (`next-auth` v5 beta) — database credentials and GitHub OAuth in `@rms/admin`; credentials-only in `@rms/student`.
- **Validation**: Zod v3 (`zod` and `drizzle-zod`).
- **Icons**: `lucide-react`.
- **Testing**: Vitest v2.

### 4.2 File & Component Conventions
- **Naming**: `kebab-case.tsx` or `kebab-case.ts` for all files. PascalCase for React component exports.
- **Server Components by Default**: Place `'use client'` strictly at the top of files that require client state, browser APIs, or event handlers.
- **Data & Presentation Separation**: Marketing copy, headlines, features, and roadmaps must live in structured data files (e.g. `apps/web/lib/data/homepage-content.ts`), not hardcoded directly into JSX.
- **Database Access**: Direct database operations (`db.query.*`, `db.insert.*`) must only occur in Server Components, Server Actions (`actions.ts`), or server query files (`lib/db/queries/*.ts`). Mark server-only files with `import 'server-only';`.
- **Anonymous DSA Model**: Guest learning (`apps/web/lib/client/anonymous-progress.ts`) operates exclusively in client-side `localStorage`. It must never attempt database writes or require user login.

### 4.3 Error Handling & Status Responses
- Server Actions must return structured objects `{ success: boolean, message?: string, error?: string, data?: T }` rather than throwing uncaught exceptions to the client.
- Always validate input with Zod schemas before database queries or mutations.
- Database queries should handle missing environment variables gracefully (e.g. returning empty arrays or `null` if `POSTGRES_URL` is unset during static builds).

---

## 5. Architectural Guardrails (Do NOT Touch Casually)

1. **Authentication Architecture**: Do NOT modify `@rms/auth` or `apps/admin/lib/auth.config.ts` without approval. Session isolation between portals must be preserved.
2. **Database Schema & Migrations**: Do NOT modify `packages/db/src/schema.ts` or migration files casually. Enums in PostgreSQL must never be used in transactional DDL within the same transaction that creates them.
3. **Admin Application (`apps/admin`)**: The Admin application has already undergone security, schema, and Auth.js recovery. Treat it as a protected working surface.
4. **No Price Disclosures**: The public website must NEVER display retail pricing or e-commerce checkout carts for the Career Readiness Program. Commercial engagement is strictly institutional consultation / MoU.
5. **No Fake Claims**: Never fabricate student counts, placement percentages, partner college logos, or testimonials.
6. **No Speculative Rewrites**: Do not refactor functioning code merely for aesthetic preference.

---

## 6. Claude Code Operating Workflow

When addressing any task in this codebase, follow this strict sequence:

```text
1. Inspect    → Read current files and verify actual implementation.
2. Understand → Check constraints, dependencies, and architectural boundaries.
3. Plan       → Formulate a minimal, non-destructive implementation plan.
4. Implement  → Make focused, high-precision code modifications.
5. Test       → Run typecheck, unit tests, and build to verify correctness.
6. Review     → Check git diff to ensure no unintended modifications.
7. Report     → Summarize exact changes, tests run, and residual recommendations.
```

If a proposed change impacts database schemas, authentication boundaries, or multi-app routing, explain the rationale and confirm before proceeding.
