# Testing Strategy & Execution

This document details the automated test suites, frameworks, and execution commands across the monorepo.

---

## 1. Testing Framework

- **Test Runner**: Vitest v2.0.0
- **Environment**: Node.js / edge-compatible simulated environments
- **Assertion Library**: Chai/Jest-compatible Vitest matchers

---

## 2. Test Execution Commands

```bash
# Run tests across all workspace packages
pnpm test

# Run tests in watch mode
pnpm --filter @rms/admin test:watch
pnpm --filter @rms/web test:watch

# Run coverage reports (admin)
pnpm --filter @rms/admin test:coverage
```

---

## 3. Test Suites Inventory

Currently, **22 test files containing 275 passing tests** are active:

### `apps/admin` (15 test files, 218 tests)
- `admin-auth.test.ts`: Password authentication, status checks, role verification.
- `bulk-import-actions.test.ts`: Server action processing, bulk student creation, deduplication.
- `csv-parser.test.ts`: CSV parsing, header validation, malformed row detection.
- `excel-parser.test.ts`: Multi-sheet Excel workbook parsing and buffer safety.
- `email.test.ts`: Resend payload construction, mock dispatch, missing key resilience.
- `enrollment-lifecycle.test.ts`: State machine transitions (`pending` → `confirmed` → `active`).
- `student-institution.test.ts`: Student-college linkages and roll number uniqueness.
- `tokens-service.test.ts`: SHA-256 token hashing and single-use expiration.
- `batches.test.ts`, `colleges.test.ts`, `programs.test.ts`: Drizzle queries and mutations.

### `packages/auth` (3 test files, 39 tests)
- `passwords.test.ts`: Bcrypt hashing, verification, password complexity constraints.
- `tokens.test.ts`: Cryptographic random byte generation, SHA-256 digest determinism.
- `rbac.test.ts`: Role normalization, `hasRole`, `hasAdminPrivileges`, `assertRole`.

### `apps/web` (4 test files, 18 tests)
- `seo-and-sitemap.test.ts`: Canonical domain validation (`www.rms-careers.com`), sitemap generation, robots.txt directives.
- `anonymous-progress.test.ts`: Local storage problem completion, corruption tolerance, state isolation.
- `curriculum-and-dsa.test.ts`: DSA sheet metadata integrity, pattern indexing.
- `public-queries.test.ts`: Fallback behavior when `POSTGRES_URL` is omitted.
