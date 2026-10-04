# Deployment Architecture & Domain Infrastructure

This document details the deployment targets, domain mapping, routing rules, and environment configurations for RMS Careers.

---

## 1. Canonical Domain Model

The platform enforces a standardized domain hierarchy:

```text
                  https://rms-careers.com (Apex)
                                │
                                ▼ (Conceptually redirects to www)
              ┌───────────────────────────────────┐
              │     https://www.rms-careers.com   │
              │     (Corporate Website / Public)  │
              └─────────────────┬─────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
https://student.rms-careers.com  https://tutor.rms-careers.com  https://admin.rms-careers.com
  (Student Learning Portal)      (Tutor Academic Console)       (Admin Control Plane)
```

- **Domain Naming**: The hyphenated domain `rms-careers.com` is mandatory.
- **Apex Redirection**: `https://rms-careers.com` redirects to `https://www.rms-careers.com`.
- **Portal Separation**: Each subdomain points to its dedicated application deployment.

---

## 2. Target Deployment Architecture

- **Hosting Environment**: Cloudflare (Workers / Pages) or Vercel Next.js edge runtime.
- **Database**: Neon Serverless PostgreSQL over HTTP.
- **Object Storage**: Cloudflare R2 (for PDFs, slide decks, submission attachments).
- **Email**: Resend API over HTTPS.

---

## 3. Environment Variable Configuration

### `apps/admin`
| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `POSTGRES_URL` | Neon PostgreSQL connection string | `postgres://user:pass@ep-xyz.neon.tech/neondb?sslmode=require` |
| `NEXTAUTH_URL` | Application base URL | `http://localhost:3000` or `https://admin.rms-careers.com` |
| `AUTH_SECRET` | NextAuth session signing key | Random 32+ char secret |
| `AUTH_TRUST_HOST` | Trust request host header | `true` |
| `AUTH_GITHUB_ID` | Optional GitHub OAuth Client ID | `client_id` |
| `AUTH_GITHUB_SECRET` | Optional GitHub OAuth Client Secret | `client_secret` |
| `RESEND_API_KEY` | Resend API key for emails | `re_...` |
| `EMAIL_FROM` | Sender email address | `RMS Careers <noreply@rms-careers.com>` |
| `EMAIL_LOGO_URL` | Public logo URL for email templates | `https://www.rms-careers.com/rms-logo.jpg` |

### `apps/web`
| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `POSTGRES_URL` | Neon PostgreSQL connection string | Optional (falls back gracefully to static state if omitted) |
