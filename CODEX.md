# CODEX.md — RMS Careers Engineering Instructions

This document is the authoritative engineering instruction guide for **Codex** working inside the **RMS Careers** repository.

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
│   ├── web/        # Public Corporate Website (www.rms-careers.com, port 3001)
│   └── admin/      # Institutional Control Plane & Admin Portal (admin.rms-careers.com, port 3000)
├── packages/
│   ├── db/         # @rms/db — Drizzle ORM schema, Neon PostgreSQL client, migrations
│   └── auth/       # @rms/auth — Password hashing (bcrypt), token hashing (SHA-256), RBAC guards
└── docs/           # Complete architectural documentation, roadmaps, guardrails & reuse map
```

### Future Planned Surfaces:
- `apps/student`: Authenticated Student Learning Portal (`student.rms-careers.com`)
- `apps/tutor`: Authenticated Tutor Evaluation Workbench (`tutor.rms-careers.com`)

### Canonical Domain Architecture:
- **Corporate Website**: `https://www.rms-careers.com` (canonical public identity; apex `rms-careers.com` redirects to `www`)
- **Student Portal**: `https://student.rms-careers.com`
- **Tutor Portal**: `https://tutor.rms-careers.com`
- **Admin Portal**: `https://admin.rms-careers.com`
- **CRITICAL**: The hyphenated domain (`rms-careers.com`) is mandatory. Never introduce `rmscareers.com`.
- **Surface Isolation**: Wildcard domain cookies (`.rms-careers.com`) and shared authentication across portals are **strictly prohibited**. Each application maintains independent session boundaries.

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

# Execute tests across all packages
pnpm test                 # Runs Vitest across apps/web, apps/admin, packages/auth

# Run TypeScript type checking
pnpm typecheck            # Runs tsc --noEmit across all workspaces

# Production builds
pnpm build                # Builds all apps in apps/* via Next.js

# Database administration
pnpm admin:seed           # Seeds initial Super Administrator account into PostgreSQL
```

### Scoped Package Commands
```bash
# Package-specific tests
pnpm --filter @rms/admin test
pnpm --filter @rms/web test
pnpm --filter @rms/auth test

# Package-specific type checking
pnpm --filter @rms/admin typecheck
pnpm --filter @rms/web typecheck
pnpm --filter @rms/db typecheck

# Database migrations & tools (packages/db)
pnpm --filter @rms/db db:generate    # Generate migration from schema changes
pnpm --filter @rms/db db:migrate     # Apply migrations to database
pnpm --filter @rms/db db:studio      # Open Drizzle Studio visual editor
```

---

## 4. Engineering Conventions

### 4.1 Tech Stack
- **Framework**: Next.js 15 (App Router, React 19, Server Components & Server Actions)
- **Styling**: Tailwind CSS + Vanilla CSS variables for dark/light themes. `clsx` and `tailwind-merge` for class composition.
- **ORM & Database**: Drizzle ORM (`drizzle-orm/neon-http`) with `@neondatabase/serverless` PostgreSQL.
- **Authentication**: Auth.js (`next-auth` v5 beta) with database credentials and GitHub OAuth in `@rms/admin`.
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

For in-depth explanations, read [`docs/ENGINEERING-GUARDRAILS.md`](file:///c:/Users/Mohith/myprojects/RMS-Careers/docs/ENGINEERING-GUARDRAILS.md).

1. **Authentication Architecture**: Do NOT modify `@rms/auth` or `apps/admin/lib/auth.config.ts` without approval. Session isolation between portals must be preserved.
2. **Database Schema & Migrations**: Do NOT modify `packages/db/src/schema.ts` or migration files casually. Enums in PostgreSQL must never be used in transactional DDL within the same transaction that creates them.
3. **Admin Application (`apps/admin`)**: The Admin application has already undergone security, schema, and Auth.js recovery. Treat it as a protected working surface.
4. **No Price Disclosures**: The public website must NEVER display retail pricing or e-commerce checkout carts for the Career Readiness Program. Commercial engagement is strictly institutional consultation / MoU.
5. **No Fake Claims**: Never fabricate student counts, placement percentages, partner college logos, or testimonials.
6. **No Speculative Rewrites**: Do not refactor functioning code merely for aesthetic preference.

---

## 6. Code Reuse & Documentation Reference

Before implementing any new component, hook, schema, or query, check the existing utilities inventory:
- [`docs/REUSE-MAP.md`](file:///c:/Users/Mohith/myprojects/RMS-Careers/docs/REUSE-MAP.md): Inventory of existing schemas, types, Radix UI primitives, queries, and auth utilities.
- [`docs/IMPLEMENTATION-ROADMAP.md`](file:///c:/Users/Mohith/myprojects/RMS-Careers/docs/IMPLEMENTATION-ROADMAP.md): Prioritized implementation sequence (P0–P3).
- [`docs/architecture/`](file:///c:/Users/Mohith/myprojects/RMS-Careers/docs/architecture/): Deep architectural breakdowns (Overview, Applications, Frontend, Backend, Database, Authentication, Authorization, Deployment).

---

## 7. Codex Operating Workflow

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
