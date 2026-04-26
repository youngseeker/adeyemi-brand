# Backend + Git Setup Checklist

This project can run with graceful fallbacks, but production reliability depends on setting the backend pieces below.

## 1) Required Environment Variables

Set these in your hosting platform and local `.env`:

- `DATABASE_URL`: Neon/Postgres connection string.
- `ADMIN_PAGE_PASSWORD`: Password for `/admin/login`.
- `REVIEW_ADMIN_KEY`: Optional admin API key for external tools.
- `PUBLIC_CONTACT_EMAIL`: Public support/contact email.

For Keystatic GitHub write access in production:

- `KEYSTATIC_GITHUB_REPO` (format: `owner/repo`)
- `KEYSTATIC_SECRET` (minimum 32 chars)
- `KEYSTATIC_GITHUB_CLIENT_ID`
- `KEYSTATIC_GITHUB_CLIENT_SECRET`

For email/newsletter dispatch:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASSWORD`
- `SMTP_FROM_EMAIL`
- `SMTP_FROM_NAME` (optional)
- `SMTP_SECURE` (`true` or `false`)

Optional comments system (Giscus):

- `PUBLIC_GISCUS_ENABLED=true`
- `PUBLIC_GISCUS_REPO`
- `PUBLIC_GISCUS_REPO_ID`
- `PUBLIC_GISCUS_CATEGORY`
- `PUBLIC_GISCUS_CATEGORY_ID`

## 2) Database Setup

Run from project root:

```bash
npm install
npm run db:migrate
```

If this is first setup and you need to sync from schema state:

```bash
npm run db:push
```

## 3) Verify Core Health Before Launch

1. Open `/publish` and run **CMS Health Check**.
2. Open `/qa` and complete the checklist.
3. Open `/admin/insights` and confirm analytics/poll/newsletter sections load.
4. Open one article page and test:
- Poll voting
- Like reaction
- Review submission

## 4) Git Workflow (Start This Week)

Use this minimum safe flow:

```bash
git checkout -b feat/your-change-name
# make changes
git add .
git commit -m "feat: short clear summary"
git push -u origin feat/your-change-name
```

Then open a Pull Request into `main`.

Recommended branch naming:

- `feat/...` for new features
- `fix/...` for bug fixes
- `chore/...` for maintenance/docs

## 5) Release Workflow

1. Merge PR into `main`.
2. Wait for deploy.
3. Re-run `/publish` CMS health check.
4. Re-run `/qa` checklist.
5. Validate one live article path and one admin path.

## 6) Known Fallback Behavior

If DB is unavailable, some features now degrade to in-memory runtime storage (non-durable):

- Reviews
- Reactions
- Polls
- Newsletter subscriptions (already supported)

This keeps UX functional, but data is not permanent across restarts until DB is fixed.
