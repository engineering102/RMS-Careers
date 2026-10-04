# RMS Careers — Admin

Administration console for the RMS Careers placement preparation platform.
Manages student enrollments, programs, and content for the student-facing application.

---

## Purpose

The Admin application is an internal tool used to:

- Create and manage placement preparation programs
- Enroll students individually or via bulk CSV/Excel import
- Monitor enrollment status and email delivery
- Publish articles, PDFs, and resources for students to consume
- Manage DSA sheets and questions (upcoming)

This application is **admin-only**. Students have a separate application.

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js 15](https://nextjs.org) (App Router, Turbopack in dev) |
| Language | [TypeScript 5.7](https://www.typescriptlang.org) (strict mode) |
| Database | [Neon](https://neon.tech) serverless PostgreSQL |
| ORM | [Drizzle ORM](https://orm.drizzle.team) with `drizzle-zod` for validation |
| Authentication | [Auth.js v5](https://authjs.dev) (beta.25) — Credentials + GitHub OAuth |
| Email | [Resend](https://resend.com) for transactional email |
| Styling | [Tailwind CSS v3](https://tailwindcss.com) |
| UI Components | [shadcn/ui](https://ui.shadcn.com) on Radix UI primitives |
| CSV/Excel | [PapaParse](https://www.papaparse.com) + [SheetJS (xlsx)](https://sheetjs.com) |
| Toasts | [Sonner](https://sonner.emilkowal.ski) |
| Testing | [Vitest 2](https://vitest.dev) |
| Package Manager | [pnpm](https://pnpm.io) (workspace package: `@rms/admin`) |

---

## Prerequisites

- Node.js 20+
- A [Neon](https://neon.tech) PostgreSQL database
- A [Resend](https://resend.com) API key (for email)
- (Optional) GitHub OAuth application credentials

---

## Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in the following variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `POSTGRES_URL` | ✅ | Neon database connection string |
| `AUTH_SECRET` | ✅ | Random secret for Auth.js sessions (generate with `openssl rand -base64 32`) |
| `RESEND_API_KEY` | Optional | Resend API key for enrollment confirmation emails |
| `EMAIL_FROM` | Optional | Sender address, e.g. `noreply@rms-careers.com` |
| `AUTH_GITHUB_ID` | Optional | GitHub OAuth App Client ID (must match an active admin user's email in DB) |
| `AUTH_GITHUB_SECRET` | Optional | GitHub OAuth App Client Secret |
| `NEXTAUTH_URL` | Optional | Base URL of the application (required in production) |

> **Security note:** Never commit `.env.local` or any file containing secrets to version control.

---

## Administrator Account Provisioning

Admin credentials are stored securely in PostgreSQL as salted bcrypt hashes (work factor 12).
To bootstrap the initial administrator account, run:

```bash
pnpm admin:seed <email> <password> [name]
```

Example:

```bash
pnpm admin:seed admin@rmscareers.com "SecurePassword#2026" "Platform Administrator"
```

The script will hash the password, insert the user with `status = 'active'`, and assign the `super_admin` role.

---

## Database Setup

The database schema uses [Drizzle Kit](https://orm.drizzle.team/kit-docs/overview).

### First-time setup

Apply the schema to the database:

```bash
pnpm exec drizzle-kit push
```

This creates the following tables:

- `users` — authentication identities, password hashes, and account statuses
- `user_roles` — role-based access control assignments
- `programs` — enrollment programs
- `students` — student records
- `enrollments` — student ↔ program join table with status and email tracking

### Schema location

```
lib/db/schema.ts     — table definitions and Drizzle relations
lib/db/index.ts      — Neon connection and Drizzle instance
lib/db/queries/      — domain query modules
  ├── users.ts
  ├── programs.ts
  ├── students.ts
  └── enrollments.ts
```

---

## Local Development

```bash
# From repository root
pnpm install
pnpm dev
# or: pnpm --filter @rms/admin dev
```

The application starts at [http://localhost:3000](http://localhost:3000).

The development server uses [Turbopack](https://turbo.build/pack) for fast refresh.

> **Note:** `POSTGRES_URL` must be set. The application falls back to a placeholder connection string if unset, which prevents DB errors during build but disables all data functionality.

---

## Authentication

### Credentials login

Sign in at `/login` using the email address and password provisioned in the database via `pnpm admin:seed`.

Plaintext environment variables (`ADMIN_USERNAME` / `ADMIN_PASSWORD`) and default credentials have been completely eliminated. All passwords are verified against bcrypt salted hashes stored in the `users` table.

### GitHub OAuth (optional)

If `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET` are set, the login page shows a "Sign in with GitHub" button.
When an administrator signs in via GitHub, their email address must exist in the database with an active account status and an assigned `admin` or `super_admin` role. Unauthorized GitHub accounts are rejected automatically.

### Session

Auth.js v5 is used with JWT sessions. Sessions are stored as HTTP-only cookies.

---

## Available Admin Functionality

### Programs

- `/programs` — list all programs with enrollment counts
- Create a program (name, code, description, capacity, start/end date, status)
- Update program status: `draft` → `active` → `archived`

### Enrollments

- `/enrollments` — list, search, and filter all enrollments
- Filter by program, status, academic year, and email delivery status
- Update individual or bulk enrollment status (pending / confirmed / waitlisted / cancelled)
- Resend individual or bulk confirmation emails
- Export filtered or selected enrollments as CSV

### Student Self-Enrollment (Public)

- `/enroll/[programCode]` — a public-facing registration form
- Students can self-enroll in an `active` program
- Capacity is enforced server-side
- Duplicate enrollment is prevented
- Confirmation email is sent on successful registration

### Bulk Import

- `/enrollments/import` — multi-step import wizard
- Accepts `.csv`, `.xlsx`, or `.xls` files (up to 10 MB)
- Normalizes common column name variants (e.g. `Mobile` → `Phone Number`)
- Validates all rows before committing
- Shows per-row status: valid, invalid, in-file duplicate, already enrolled
- Reports capacity warning if import would exceed program limit
- Optionally sends confirmation emails during import
- Downloads error report CSV for failed rows

---

## Email System

Enrollment confirmation emails are sent via [Resend](https://resend.com).

The email template is in:
```
lib/email/templates/enrollment-confirmation.ts
```

Email delivery is **best-effort** — a failed email does not roll back a valid enrollment.
The `confirmation_sent_at` timestamp is set on the enrollment record when email delivery succeeds.

### Testing email

Set `RESEND_API_KEY` and `EMAIL_FROM` in `.env.local`, then trigger an enrollment or use the resend action in the admin panel.

---

## CSV Import Format

The bulk import accepts files with the following columns (column names are normalized — aliases accepted):

| Standard Name | Accepted Aliases |
|---------------|-----------------|
| Full Name | Name, Student Name |
| Email | Mail |
| Phone Number | Mobile, Contact |
| College Roll Number | Registration Number, ID Number |
| Branch | Department, Stream |
| Academic Year | Year, Class |

Year values accepted: `1`, `1st`, `1st Year`, `First`, `2`, `2nd`, …, `4th Year`, `Fourth`

Download the template CSV from the import page.

---

## Testing

```bash
npm test              # run all tests once
npm run test:watch    # watch mode
npm run test:coverage # with coverage report
```

Tests are in `lib/__tests__/`:

| File | Coverage |
|------|---------|
| `csv-validator.test.ts` | `lib/csv/validator.ts` — all validation paths, duplicates, boundary cases |
| `csv-parser.test.ts` | `lib/csv/parser.ts` — header normalization, column detection, file formats |
| `format-date.test.ts` | `lib/utils/format-date.ts` — formatting, null/invalid handling, IST timezone |

---

## Project Structure

```
admin/
├── app/
│   ├── (admin)/                   # Protected admin routes (requires session)
│   │   ├── enrollments/           # Enrollment management + bulk import
│   │   └── programs/              # Program management
│   ├── (public)/
│   │   └── enroll/[programCode]/  # Public student self-enrollment form
│   ├── api/
│   │   └── auth/[...nextauth]/    # Auth.js API handler
│   └── login/                     # Admin login page
├── components/
│   ├── admin/                     # Admin-specific components (EmptyState, etc.)
│   └── ui/                        # shadcn/ui primitives
├── lib/
│   ├── auth.ts                    # Auth.js configuration
│   ├── db/
│   │   ├── index.ts               # Neon connection + Drizzle instance
│   │   ├── schema.ts              # Table definitions (source of truth)
│   │   └── queries/               # Domain query modules
│   │       ├── programs.ts
│   │       ├── students.ts
│   │       └── enrollments.ts
│   ├── csv/
│   │   ├── parser.ts              # CSV/Excel parsing + header normalization
│   │   ├── validator.ts           # Row validation + duplicate detection
│   │   └── template.ts            # Template CSV and error report generation
│   ├── email/
│   │   ├── index.ts               # Resend email dispatcher
│   │   └── templates/             # HTML email templates
│   └── utils/
│       └── format-date.ts         # IST-aware date formatter
├── __tests__/                     # Vitest test suites
├── middleware.ts                  # Next.js middleware (auth guard)
├── vitest.config.ts               # Vitest configuration
└── docs/                          # Architecture and planning documents
```

---

## Deployment

The application is configured for deployment on [Vercel](https://vercel.com).

Set all required environment variables in the Vercel project dashboard before deploying.

```bash
npm run build     # production build
npm start         # start production server
```

---

## Git

The project is in its own repository. The original git remote (Vercel starter template) should be updated to the project's actual repository before any structural changes:

```bash
git remote set-url origin https://github.com/[org]/rms-careers.git
```

---

## Architecture Documentation

See `docs/` for the full architecture documentation:

- [`RMS_CAREERS_IMPLEMENTATION_PLAN.md`](../docs/RMS_CAREERS_IMPLEMENTATION_PLAN.md) — original implementation plan
- [`RMS_CAREERS_ARCHITECTURE_REVIEW.md`](../docs/RMS_CAREERS_ARCHITECTURE_REVIEW.md) — architecture review and decisions
