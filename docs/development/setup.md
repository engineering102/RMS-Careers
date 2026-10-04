# Local Development Environment Setup

This guide provides instructions for setting up and running the RMS Careers monorepo locally.

---

## 1. Prerequisites

- **Node.js**: Version 20.x or higher (LTS recommended).
- **pnpm**: Version 9.15.4 or higher (`corepack enable pnpm` or `npm install -g pnpm`).
- **PostgreSQL**: Neon database instance (or local PostgreSQL 16+ instance).

---

## 2. Initial Setup

1. **Clone the repository**:
   ```bash
   git clone <repo-url> RMS-Careers
   cd RMS-Careers
   ```

2. **Install workspace dependencies**:
   ```bash
   pnpm install
   ```

3. **Configure Environment Variables**:
   In `apps/admin/`:
   ```bash
   cp apps/admin/.env.example apps/admin/.env.local
   ```
   Populate the following secrets in `apps/admin/.env.local`:
   ```env
   POSTGRES_URL=postgresql://user:password@ep-xyz.neon.tech/neondb?sslmode=require
   NEXTAUTH_URL=http://localhost:3000
   AUTH_SECRET=your-random-32-char-secret
   AUTH_TRUST_HOST=true
   ```

---

## 3. Running Applications

Start the development servers from the monorepo root:

```bash
# Run Admin Portal (port 3000)
pnpm dev:admin

# Run Corporate Website (port 3001)
pnpm dev:web
```

Access points:
- **Admin Portal**: `http://localhost:3000`
- **Corporate Website**: `http://localhost:3001`
- **Guest Learning**: `http://localhost:3001/learn`
- **DSA Sheets**: `http://localhost:3001/learn/dsa`

---

## 4. Seeding Initial Administrator

To create or update the initial Super Administrator account in your database:

```bash
pnpm admin:seed [email] [password] [fullName]
# Or using environment variables:
ADMIN_INITIAL_EMAIL=admin@rms-careers.com ADMIN_INITIAL_PASSWORD=Password123! pnpm admin:seed
```
