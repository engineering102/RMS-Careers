# Troubleshooting & Common Issues

This guide documents diagnostic patterns and solutions for common development hurdles in RMS Careers.

---

## 1. Auth.js / NextAuth Issues

### Issue: `UntrustedHost` error on localhost
- **Cause**: Auth.js requires explicit confirmation that localhost or proxy host headers can be trusted.
- **Solution**: Ensure `trustHost: true` is configured in `apps/admin/lib/auth.config.ts` and `AUTH_TRUST_HOST=true` is set in `.env.local`.

---

## 2. Database & Neon PostgreSQL Issues

### Issue: `55P04: unsafe use of new value of enum type`
- **Cause**: In PostgreSQL, adding a new enum value (`ALTER TYPE ... ADD VALUE '...'`) cannot be used inside the same transaction where the enum was altered.
- **Solution**: Separate the `ALTER TYPE` statement and any statements referencing that value (e.g. `CREATE INDEX ... WHERE status IN ('active')`) into separate migration files or commit transactions before indexing.

### Issue: Build fails during static page collection with `DATABASE_URL` missing
- **Cause**: Next.js App Router attempts to pre-render routes at build time.
- **Solution**: In `@rms/db/src/index.ts` and query modules, provide defensive fallbacks:
  ```typescript
  if (!process.env.POSTGRES_URL) return [];
  ```

---

## 3. Port Conflicts

### Issue: `listen EADDRINUSE: address already in use :::3000` or `:::3001`
- **Cause**: A background dev server instance is already running.
- **Solution**: Check running processes on Windows:
  ```powershell
  Get-Process node -ErrorAction SilentlyContinue
  ```
  Terminate dangling dev server tasks before launching a new instance.

---

## 4. Windows Script Execution Policy

### Issue: `pnpm.ps1 cannot be loaded because running scripts is disabled`
- **Cause**: PowerShell execution policy prevents executing `.ps1` wrapper scripts.
- **Solution**: Invoke `pnpm.cmd` directly:
  ```powershell
  pnpm.cmd dev:web
  ```
