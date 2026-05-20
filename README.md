# Adeyemi Brand Platform

Personal brand platform built with Astro Content Collections and server APIs for analytics, feedback moderation, newsletter, polls, and reactions.

## Stack

- Astro 5 (server output)
- Astro Content Collections (MDX)
- Tailwind CSS 4
- Drizzle ORM + PostgreSQL (Neon-friendly)
- Node mailer integration for newsletter flows

## Core Routes

- `/` Home
- `/work` Work and experience
- `/about` About profile
- `/garden` Article archive
- `/garden/[slug]` Article detail, polls, reactions, feedback
- `/publish` Publishing workflow cockpit
- `/admin` Admin hub
- `/admin/insights` Moderation + diagnostics + analytics

## PWA Support

The site ships with a web app manifest and service worker:

- Installable home-screen app metadata lives at `/manifest.webmanifest`.
- `/sw.js` caches public pages and static assets for offline reading.
- API routes are intentionally excluded from service-worker caching so analytics, newsletter, polls, comments, and admin actions stay live.

## Local Development

```bash
npm install
npm run dev
```

Build check:

```bash
npm run astro -- check
npm run build
```

## Database Commands

```bash
npm run db:generate
npm run db:migrate
npm run db:push
```

## Production Setup

Use [BACKEND_GIT_SETUP.md](BACKEND_GIT_SETUP.md) for:

- Required environment variables
- environment and deployment setup
- SMTP setup
- Database migration steps
- Launch verification checklist
- Recommended Git workflow for weekly delivery

## Reliability Model

When DB is not reachable, several APIs can degrade to runtime storage to keep UX usable:

- Polls
- Newsletter subscriptions
- Reviews (feedback)
- Reactions

Runtime fallback is not durable across restarts. Production should always provide a healthy `DATABASE_URL`.
