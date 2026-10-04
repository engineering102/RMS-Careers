# Architecture Decision Records (ADRs)

This directory records foundational architecture decisions governing the RMS Careers codebase.

---

## Index of Locked Architecture Decisions

### ADR 001: Pnpm Monorepo Workspace Structure
- **Decision**: Organize the platform into `apps/*` and `packages/*` using pnpm workspaces.
- **Rationale**: Isolates independent Next.js applications while sharing database schemas (`@rms/db`) and authentication helpers (`@rms/auth`) without duplicate code.

### ADR 002: Portal Session Isolation
- **Decision**: Enforce distinct session cookies for Admin, Student, and Tutor portals. Revert and reject any wildcard `.rms-careers.com` shared cookies.
- **Rationale**: Prevents cross-portal privilege escalation and CSRF token cross-contamination across security boundaries.

### ADR 003: Serverless PostgreSQL over HTTP via Neon
- **Decision**: Use `@neondatabase/serverless` with Drizzle ORM over stateless HTTP.
- **Rationale**: Eliminates traditional TCP connection pooling limits, socket leaks, and cold-start connection timeouts in serverless execution environments.

### ADR 004: Anonymous DSA Local Storage
- **Decision**: Keep guest problem-solving on `www.rms-careers.com` entirely in browser `localStorage`.
- **Rationale**: Zero sign-up friction for prospective students, zero bot-driven spam database writes, and zero cookie privacy compliance friction.

### ADR 005: Canonical Domain Hierarchy
- **Decision**: Enforce `www.rms-careers.com` as canonical public corporate domain, with `rms-careers.com` redirecting to `www`.
- **Rationale**: Establishes a singular authoritative SEO identity while preventing competing search index entries.
