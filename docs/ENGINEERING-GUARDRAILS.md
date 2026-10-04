# Engineering Guardrails — "Do Not Touch Casually"

This document establishes critical safety rules and architectural boundaries that all developers and AI coding agents (including Claude Code) must treat with extreme caution.

---

## 1. Authentication & Session Isolation

### Guardrail:
Do NOT introduce shared parent-domain cookies (`Domain=.rms-careers.com`), single sign-on (SSO) redirects, or unified cookie names across portals.

### Why It Matters:
The four RMS Careers surfaces (`www`, `admin`, `student`, `tutor`) have fundamentally different security profiles. Admin credentials must never be accessible or verifiable from student or tutor domains. Shared session cookies introduce severe horizontal and vertical privilege escalation hazards, CSRF attack vectors, and cross-subdomain token leakage.

---

## 2. Role-Based Access Control (RBAC)

### Guardrail:
Do NOT bypass `@rms/auth` role assertions (`assertRole`, `hasAdminPrivileges`) or perform raw user role checks directly in client components.

### Why It Matters:
Client-side role checks are cosmetic only. All authorization decisions must execute server-side in Server Actions or API handlers. Failing to assert roles on the server allows unauthorized users to trigger administrative mutations simply by making direct HTTP requests.

---

## 3. Database Schema & Migration Hazards

### Guardrail:
- Do NOT alter existing column types or constraints in `packages/db/src/schema.ts` without assessing compatibility with existing data.
- NEVER combine PostgreSQL enum modifications (`ALTER TYPE ... ADD VALUE '...'`) and index/table creation that references the new enum value within the same transactional DDL block.

### Why It Matters:
PostgreSQL will fail with error `55P04 (unsafe use of new value of enum type)` if a new enum value is referenced in a query or index before the transaction that created it commits. Uncoordinated schema modifications risk breaking live database connections and failing deployments.

---

## 4. Production Domain Hierarchy

### Guardrail:
- NEVER introduce non-hyphenated domain variants (`rmscareers.com`).
- ALWAYS use `https://www.rms-careers.com` as the canonical public corporate identity.
- Conceptually redirect apex `https://rms-careers.com` to `https://www.rms-careers.com`.

### Why It Matters:
Inconsistent domain references fragment SEO search equity, create CORS failures, break OAuth callback registrations, and trigger cookie domain mismatches.

---

## 5. Commercial Positioning & Public Pricing

### Guardrail:
Do NOT display internal pricing, course purchase buttons, shopping carts, or individual checkout flows on the public corporate website.

### Why It Matters:
RMS Careers operates on an institutional B2B college partnership model (MoUs). Displaying retail pricing devalues the institutional offering, confuses college decision-makers, and misrepresents RMS Careers as an individual consumer course marketplace.

---

## 6. Truth in Marketing Claims

### Guardrail:
Do NOT fabricate placement statistics, partner college logos, student counts, testimonials, or classroom photographs.

### Why It Matters:
RMS Careers is positioned as a rigorous, high-integrity technical academy. Unsubstantiated claims damage institutional credibility with college deans and principals and violate platform compliance policies.

---

## 7. Shared Package Contracts (`packages/db`, `packages/auth`)

### Guardrail:
Do NOT introduce frontend or framework-specific dependencies (such as React, DOM APIs, or Next.js client hooks) into `@rms/db` or `@rms/auth`.

### Why It Matters:
Shared packages must remain universal, provider-neutral, and portable across Server Components, Server Actions, edge runtimes, migration scripts, and background workers.
