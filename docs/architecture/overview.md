# Architecture Overview — RMS Careers Platform

## 1. System Mission & Context

RMS Careers is an institutional technical education and placement-readiness platform designed specifically for B.Tech engineering students. The business model is college-led (B2B), partnering directly with engineering colleges, universities, and academic departments through institutional MoUs.

The platform architecture bridges the gap between academic curricula and industry hiring expectations by combining:
- Algorithmic foundations and pattern-based problem-solving
- Production-grade multi-tier project engineering
- Resume optimization, technical mock interviews, and aptitude preparation
- Institutional cohort administration and verifiable progress analytics

---

## 2. Monorepo Structure

The repository is configured as a `pnpm` monorepo containing multiple independent Next.js applications and shared workspace packages:

```text
RMS-Careers/
├── apps/
│   ├── web/                     # Public Corporate Portal & Freemium Practice (@rms/web)
│   └── admin/                   # Administrative Control Plane & Institutional Portal (@rms/admin)
├── packages/
│   ├── db/                      # Shared Drizzle ORM schema, Neon connection, migrations (@rms/db)
│   └── auth/                    # Shared Password verification, token hashing, RBAC guards (@rms/auth)
└── docs/                        # Technical documentation & engineering architecture
```

---

## 3. Four Dedicated Platform Surfaces

| Surface | Application Path | Canonical Domain | Access Model | Primary User Persona |
| :--- | :--- | :--- | :--- | :--- |
| **Corporate Website** | `apps/web` | `https://www.rms-careers.com` | Public (Unauthenticated) | Prospective Colleges, TPOs, Engineering Students |
| **Student Portal** | `apps/student` *(Planned Phase 3)* | `https://student.rms-careers.com` | Authenticated (`student`) | Enrolled College Cohort Students |
| **Tutor Portal** | `apps/tutor` *(Planned Phase 4)* | `https://tutor.rms-careers.com` | Authenticated (`tutor`) | Instructors, Evaluators, Technical Mentors |
| **Admin Control Plane** | `apps/admin` | `https://admin.rms-careers.com` | Authenticated (`admin`, `super_admin`) | RMS Leadership, Operations, College Admins |

---

## 4. Key Architectural Invariants

1. **Independent Portal Isolation**: Each portal operates as an autonomous web application with its own session lifecycle. Wildcard session cookies across `.rms-careers.com` are strictly rejected.
2. **Anonymous DSA Storage**: Guest learners on `www.rms-careers.com` practice DSA problems using purely browser-local `localStorage`. No database writes or account sessions are created for guest practice.
3. **Database Single-Source-of-Truth**: All persistent data models reside centrally in `packages/db`, using Drizzle ORM connected to Neon serverless PostgreSQL over HTTP.
4. **Institutional B2B Commercial Model**: No individual retail course checkout or pricing selector exists. Institutional engagement flows through the Partner With RMS inquiry funnel.
