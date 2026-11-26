---
type: notes
title: "W25 · S2 · Deployment and CI: Live URL, Demo Data and Logs"
slug: w25-s2-deployment-ci-monitoring
topic: Deployment & Monitoring
subject: dev-tools
minutes: 35
description: Deploy the capstone to production-like hosting with environment variables and migrations, load safe demo data, smoke-test the live URL, and use logs and a health check to find problems quickly.
---
# Deployment and CI: live URL, demo data and logs

A capstone that only runs on a laptop is hard to show to a recruiter. This session gets your app onto a **public URL**
that works on Demo Day and keeps working after it.

## A typical deployment layout

You used this layout for MP3. Each part goes where it runs best:

| Part | Typical hosts | What you configure |
|---|---|---|
| React front end (static build) | Vercel, Netlify | build command, output folder, `VITE_API_URL` |
| Express / FastAPI back end | Render or a similar service | start command, `DATABASE_URL`, `JWT_SECRET`, `CLIENT_ORIGIN` |
| PostgreSQL / MongoDB | Neon, Supabase, MongoDB Atlas | a separate production database and user |
| Streamlit data or AI app | Streamlit Community Cloud, Hugging Face Spaces | `requirements.txt`, secrets in the platform's settings |

Free plans change and some pause idle services, so the first request after a quiet period can be slow. Read the
current limits on each provider's site, and open your app a few minutes before any demo.

## Step by step

### 1. Make the app configurable

Everything that differs between your laptop and production comes from environment variables:

```text
# .env.example (committed)    real values live only in the host's settings
DATABASE_URL=postgres://user:password@host:5432/dbname
JWT_SECRET=change-me
CLIENT_ORIGIN=http://localhost:5173
PORT=4000
```

```js
const port = process.env.PORT || 4000;   // most hosts set PORT for you
```

Check for missing configuration **at start-up**, so a deploy fails loudly instead of half-working:

```js
for (const name of ['DATABASE_URL', 'JWT_SECRET', 'CLIENT_ORIGIN']) {
  if (!process.env[name]) {
    console.error(`Missing environment variable: ${name}`);
    process.exit(1);
  }
}
```

### 2. Create the production database

Use a **separate** database from development. Run your migrations or schema script against it, then load demo data
(next section). Never point your laptop's development server at the production database "just to test something".

### 3. Deploy the back end, then the front end

1. Connect the host to your GitHub repository, choose the `server/` folder, set the build and start commands
   (`npm ci` and `node index.js`) and add the environment variables.
2. Open `https://<your-api>/api/health`. You should see `{"status":"ok"}`.
3. Deploy the front end with `VITE_API_URL` set to the API's URL. Vite reads `VITE_` variables **at build time**, so
   changing one later needs a rebuild.
4. Set the API's `CLIENT_ORIGIN` to the front end's live URL so CORS allows it.

### 4. Single-page app routing

If refreshing `/drives/3` on the live site gives a 404, the host is looking for a file that does not exist. Configure
the host to serve `index.html` for unknown paths (a rewrite rule; see your host's documentation for single-page apps).

## CI and deployment together

Your CI from Week 23 runs tests on every PR. Most hosts can **auto-deploy when `main` changes**. Together that gives a
simple, safe pipeline:

```text
feature branch → PR → CI tests pass → review → merge to main → host builds and deploys → smoke test
```

Because `main` is protected and tested, a deploy should never surprise you. If one does break production, **revert the
merge commit** on `main` (`git revert -m 1 <merge-commit>`), let it redeploy, then fix the problem on a branch.

## Seed and demo data

The evaluation panel needs to see the app full of realistic data:

- Write or reuse the **seed script** from Week 24; run it once against the production database.
- Use synthetic data only: invented names, `@example.com` email addresses, made-up companies.
- Create **demo accounts** for each role and list them in the README (for example `coordinator@example.com`) with a
  demo-only password. Never reuse a password you use anywhere else.
- Make sure every interesting state exists: some drives open, some closed, applications in each status, a low-stock
  product, an at-risk student, a document with a known answer.

## Monitoring basics: logs and health

When something goes wrong on the live site, logs are your eyes. Every host shows your server's console output in its
dashboard.

**Log what helps you debug; never log secrets or personal data:**

| Log | Do not log |
|---|---|
| Method, path, status code, duration | Passwords, tokens, API keys |
| Unexpected errors with stack traces (server side only) | Full request bodies with personal data |
| Start-up messages ("connected to database") | LLM prompts containing user documents |

A tiny request logger in Express:

```js
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`);
  });
  next();
});
```

In Python, use the standard `logging` module instead of `print`:

```python
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("capstone")
log.info("Indexed %d documents", 12)
```

The **health endpoint** (`/api/health`) gives you and any uptime checker a quick yes/no. A stronger version also runs
`SELECT 1` against the database, so it reports when the database is unreachable.

## Smoke test after every deploy

A smoke test is a five-minute check that the most important things work on the live URL:

- [ ] Home page loads over HTTPS without console errors
- [ ] `/api/health` returns ok
- [ ] Log in as each demo role
- [ ] Complete the main journey once (create → view → update)
- [ ] Refresh an inner page (no 404)
- [ ] Open the site on a phone

## Lab: live URL

1. Deploy the database, back end and front end; record the URLs in the README.
2. Load demo data and create demo accounts for each role.
3. Add start-up configuration checks, the request logger and the health endpoint.
4. Run the smoke test and fix anything that fails.
5. Check the host's logs while a teammate clicks through the app.

## Check yourself

1. You changed `VITE_API_URL` in the host's settings, but the live site still calls the old API. Why?
2. Name three things your logs should never contain.
3. A merge to `main` broke the live site ten minutes before a review. What is the fastest safe recovery?
