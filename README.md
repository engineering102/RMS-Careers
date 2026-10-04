# RMS Careers Monorepo

RMS Careers (Rising Minds Solutions) is an institutional career-readiness and placement preparation platform.

This repository is structured as a `pnpm` workspace monorepo.

---

## Workspace Structure

```text
RMS-Careers/
├── apps/
│   └── admin/               # Administration & institutional management console (@rms/admin)
├── packages/                # Shared libraries & packages (reserved for @rms/db, @rms/auth, etc.)
├── docs/                    # Architecture blueprints & implementation roadmaps
├── package.json             # Root workspace manifest with filtered execution scripts
├── pnpm-workspace.yaml      # Monorepo workspace configuration
└── pnpm-lock.yaml           # Consolidated workspace dependency lockfile
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- `pnpm` 9+ (`corepack enable pnpm` or `npm install -g pnpm`)
- PostgreSQL database (Neon)
- Resend API key (for transactional emails)

### Installation

From the repository root:

```bash
pnpm install
```

### Environment Configuration

Configure environment variables in the admin application:

```bash
cp apps/admin/.env.example apps/admin/.env.local
```

Populate the required secrets in `apps/admin/.env.local`:
- `POSTGRES_URL` (Neon PostgreSQL connection string)
- `AUTH_SECRET` (Session signing secret)
- `RESEND_API_KEY` (Optional, for transactional email)

---

## Workspace Commands

All operations can be run directly from the repository root using `pnpm`:

### Development

Start the Admin development server:

```bash
pnpm dev
# or: pnpm --filter @rms/admin dev
```

### Automated Testing

Run the full regression test suite (200+ unit & integration tests):

```bash
pnpm test
# or: pnpm --filter @rms/admin test
```

### Type Checking

Run TypeScript strict type checking:

```bash
pnpm typecheck
# or: pnpm --filter @rms/admin typecheck
```

### Production Build

Create an optimized Next.js production build:

```bash
pnpm build
# or: pnpm --filter @rms/admin build
```

### Database Seeding & Administration

Seed the initial database-backed Super Administrator account:

```bash
pnpm admin:seed
# or: pnpm --filter @rms/admin admin:seed
```
