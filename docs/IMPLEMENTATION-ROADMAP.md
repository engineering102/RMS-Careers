# RMS Careers — Future Implementation Roadmap

This document establishes the structured engineering roadmap for subsequent development phases by Claude Code and the RMS engineering team.

---

## Priority Classifications

- **P0 — Critical**: Architectural preconditions or defects that must be resolved prior to expanding user-facing features.
- **P1 — High Priority**: Structural improvements that significantly enhance reliability, security, or maintainability.
- **P2 — Medium Priority**: Feature increments and workflow optimizations.
- **P3 — Polish**: Visual, ergonomics, or documentation enhancements.

---

## P0 — Critical (Immediate Pre-requisites)

### Item 0.1: Remove Legacy Enrollment Route in Admin
- **Problem**: `apps/admin/app/(public)/enroll/[programCode]` is a leftover route from the single-app prototype that exposes public enrollment inside the Admin codebase.
- **Current State**: Route exists under `apps/admin/app/(public)/enroll`, introducing unnecessary public surface area to the Admin application.
- **Proposed Solution**: Deprecate and remove `apps/admin/app/(public)/enroll`. Direct all public curriculum viewers to `apps/web`.
- **Affected Applications/Files**: `apps/admin/app/(public)/enroll/`, `apps/admin/middleware.ts`
- **Dependencies**: None
- **Risk**: Low (public website already handles public program inquiries)
- **Estimated Complexity**: Low (1-2 hours)
- **Recommended Order**: 1

### Item 0.2: Clarify Historical Documentation Domain References
- **Problem**: `docs/RMS_CAREERS_PLATFORM_ARCHITECTURE.md` and `docs/RMS_CAREERS_IMPLEMENTATION_ROADMAP.md` still contain early non-hyphenated `rmscareers.com` references.
- **Current State**: Creates potential confusion for engineers or agents reading early architectural drafts.
- **Proposed Solution**: Update historical architecture docs to reflect the finalized canonical hyphenated domains (`www.rms-careers.com`, `admin.rms-careers.com`).
- **Affected Applications/Files**: `docs/RMS_CAREERS_PLATFORM_ARCHITECTURE.md`, `docs/RMS_CAREERS_IMPLEMENTATION_ROADMAP.md`
- **Dependencies**: None
- **Risk**: Zero
- **Estimated Complexity**: Low (1 hour)
- **Recommended Order**: 2

---

## P1 — High Priority (Security, Architecture & Core Portals)

### Item 1.1: Implement Student Portal (`apps/student`) — Phase 3
- **Problem**: Enrolled students currently have no dedicated application surface to access their program coursework, submit assignments, and view cohort analytics.
- **Current State**: Student authentication and student app are not yet initialized; only guest DSA practice exists on `apps/web`.
- **Proposed Solution**: Initialize `apps/student` with Next.js 15, consuming `@rms/db` and `@rms/auth`. Implement invitation token activation (`/activate?token=...`), student login, assigned batch dashboard, and campus leaderboard.
- **Affected Applications/Files**: `apps/student/` (new), `packages/auth`, `packages/db`
- **Dependencies**: Phase 1 database schema (already applied)
- **Risk**: Medium (must ensure session isolation from Admin portal)
- **Estimated Complexity**: High (2-3 weeks)
- **Recommended Order**: 3

### Item 1.2: Persistent Institutional Lead Pipeline
- **Problem**: The corporate homepage `#partner` form currently confirms inquiries on the client without persisting them to a dedicated database leads table.
- **Current State**: Submissions trigger a client-side success confirmation state.
- **Proposed Solution**: Add an `institutional_leads` table to `@rms/db`, create a secure Server Action or API endpoint in `apps/web` to persist lead records, and trigger Resend email notifications to the RMS partnerships desk.
- **Affected Applications/Files**: `packages/db/src/schema.ts`, `apps/web/components/homepage/partnership-section.tsx`
- **Dependencies**: Migration generation in `@rms/db`
- **Risk**: Low
- **Estimated Complexity**: Medium (1-2 days)
- **Recommended Order**: 4

### Item 1.3: Continuous Integration (CI) Workflow Pipeline
- **Problem**: Tests and builds must currently be executed manually on local machines.
- **Current State**: No `.github/workflows/ci.yml` exists in the repository.
- **Proposed Solution**: Implement a GitHub Actions workflow executing `pnpm install`, `pnpm typecheck`, `pnpm test`, and `pnpm build` on pull requests.
- **Affected Applications/Files**: `.github/workflows/ci.yml` (new)
- **Dependencies**: None
- **Risk**: Low
- **Estimated Complexity**: Low (2-3 hours)
- **Recommended Order**: 5

---

## P2 — Medium Priority (Feature Expansion)

### Item 2.1: Implement Tutor Portal (`apps/tutor`) — Phase 4
- **Problem**: Instructors and evaluators lack a dedicated academic console to review student submissions, provide rubric feedback, and conduct mock interviews.
- **Current State**: Tutor role is modeled in schema and `@rms/auth`, but no frontend application exists.
- **Proposed Solution**: Initialize `apps/tutor` with Next.js 15. Build assigned cohort data grids, submission review queue, and mock interview scorecard logging.
- **Affected Applications/Files**: `apps/tutor/` (new), `packages/db`, `packages/auth`
- **Dependencies**: Student portal submission pipeline
- **Risk**: Medium
- **Estimated Complexity**: High (2-3 weeks)
- **Recommended Order**: 6

### Item 2.2: Cloudflare R2 Object Storage Integration
- **Problem**: Lecture slides, assignment attachments, and resume PDFs cannot be safely stored in relational database rows.
- **Current State**: No object storage adapter exists.
- **Proposed Solution**: Create a provider-neutral storage package (`packages/storage`) implementing S3-compatible pre-signed upload and download URLs targeting Cloudflare R2.
- **Affected Applications/Files**: `packages/storage/` (new)
- **Dependencies**: Cloudflare R2 bucket provisioning
- **Risk**: Low
- **Estimated Complexity**: Medium (3-5 days)
- **Recommended Order**: 7

---

## P3 — Polish (Ergonomics & Documentation)

### Item 3.1: Replace Classroom Photography Placeholders
- **Problem**: Hero educator card, founder credibility section, and gallery use modular placeholder slots.
- **Current State**: Placeholders clearly demarcate image slots without layout shift.
- **Proposed Solution**: Supply authentic, high-resolution photography from partner campus workshops and classroom sessions.
- **Affected Applications/Files**: `apps/web/public/`, `apps/web/components/homepage/`
- **Dependencies**: Authentic institutional photography
- **Risk**: Zero
- **Estimated Complexity**: Low (1 day)
- **Recommended Order**: 8

### Item 3.2: Wire Verified Social Links
- **Problem**: Footer social links are currently placeholders.
- **Current State**: Footer shows clean navigation links without external dead social links.
- **Proposed Solution**: Add verified corporate LinkedIn, YouTube, and GitHub URLs to `homepage-content.ts` once created.
- **Affected Applications/Files**: `apps/web/lib/data/homepage-content.ts`, `apps/web/components/footer.tsx`
- **Dependencies**: Corporate social accounts
- **Risk**: Zero
- **Estimated Complexity**: Low (1 hour)
- **Recommended Order**: 9
