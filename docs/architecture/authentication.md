# Authentication Architecture

This document outlines the authentication strategy, session handling, token mechanics, and security controls across RMS Careers.

---

## 1. Multi-Portal Authentication Strategy

RMS Careers operates four distinct application surfaces. Each authenticated portal enforces an independent session boundary:

- **Admin Portal (`admin.rms-careers.com`)**: NextAuth / Auth.js v5 beta. Credentials provider (database verification) and optional GitHub OAuth.
- **Student Portal (`student.rms-careers.com`)**: Planned token-based activation and email credentials login with `student` role.
- **Tutor Portal (`tutor.rms-careers.com`)**: Planned email credentials login with `tutor` role.
- **Public Website (`www.rms-careers.com`)**: Completely unauthenticated. Guest DSA practice uses client-side `localStorage`.

---

## 2. Password Security (`@rms/auth/passwords`)

- **Algorithm**: `bcryptjs` with a cost factor of 12 rounds.
- **Password Constraints**:
  - Minimum 8 characters.
  - At least one uppercase letter (`[A-Z]`).
  - At least one lowercase letter (`[a-z]`).
  - At least one digit (`[0-9]`).
  - At least one special symbol.
- **API**:
  - `hashPassword(plainText: string): Promise<string>`
  - `verifyPassword(plainText: string, hash: string): Promise<boolean>`

---

## 3. Account Tokens (`@rms/auth/tokens`)

Used for activation invitations and password reset flows:
- **Raw Token**: 32 cryptographically secure random bytes generated via `crypto.randomBytes(32)` encoded as a 64-character hexadecimal string.
- **Storage**: Only the SHA-256 hash of the token (`token_hash`) is persisted in the `account_tokens` table.
- **Expirations**:
  - Activation tokens: 7 days.
  - Password reset tokens: 1 hour.
- **Single-Use Enforcement**: When consumed, `consumed_at` is stamped. Any subsequent attempt to consume the token is rejected.

---

## 4. Session Configuration in Admin

In `apps/admin/lib/auth.config.ts` and `apps/admin/lib/auth.ts`:
- `trustHost: true` allows Auth.js to trust the request host on local and production domains without throwing `UntrustedHost`.
- Session tokens use JWT strategy with user ID and role encoded in the token.
- `authorized` callback in middleware validates that unauthenticated users are redirected to `/login`, and non-admins are rejected.
