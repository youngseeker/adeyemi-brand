# Production Deployment Checklist

## Phase 1: Secret Rotation (Required Before Deployment)

### Database Credentials Rotation
1. **Go to Neon Console** (https://console.neon.tech)
   - Navigate to your project
   - Go to SQL Editor
   - Create new database role with:
     - Name: `neondb_owner_prod` (or similar)
     - Grant all privileges to `neondb` database
   - Copy the new connection string (includes new password)

2. **Update `.env` with new credentials:**
   - Replace `DATABASE_URL` with new connection string from step 1
   - Keep format: `postgresql://username:password@endpoint/dbname?sslmode=require&channel_binding=require`

### Application Keys Rotation
3. **Generate new admin credentials:**
   - For `REVIEW_ADMIN_KEY`: Generate a strong random string
     ```bash
     openssl rand -hex 32
     ```
   - For `ADMIN_PAGE_PASSWORD`: Generate another strong random string
     ```bash
     openssl rand -hex 16
     ```
   - Update both in `.env`

4. **Store rotated secrets securely:**
   - Save new credentials in your password manager
   - Do NOT commit to git
   - Consider using secrets management (Vercel Environment Variables, GitHub Secrets, etc.)

---

## Phase 2: Database Migration (Run Before App Deploy)

### In Production Environment
```bash
# After updating .env with new DATABASE_URL
npm run db:migrate
```

**What this does:**
- Creates `app_meta` table (key/value store)
- Creates `page_views` and `page_view_events` tables (analytics)
- Creates `reviews` table (feedback system)
- Creates `newsletter_subscribers` table (newsletter persistence)
- Safely applies migration (idempotent—safe to run multiple times)

**Verify migration succeeded:**
```bash
# In Neon console or psql:
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

Expected tables:
- `app_meta`
- `page_views`
- `page_view_events`
- `reviews`
- `newsletter_subscribers`
- `article_reactions` (already exists)

---

## Phase 3: Application Deployment

### Pre-deployment Verification
- [ ] All secrets rotated in `.env`
- [ ] `.env` file NOT committed to git (check `.gitignore` includes `.env`)
- [ ] Database migration completed successfully
- [ ] Production `.env` file ready (with rotated secrets)

### Deploy Steps (Platform-Specific)

**If using Vercel:**
1. Add production environment variables in Vercel project settings:
   - `DATABASE_URL` (new rotated value)
   - `REVIEW_ADMIN_KEY` (new rotated value)
   - `ADMIN_PAGE_PASSWORD` (new rotated value)
   - `PUBLIC_CONTACT_EMAIL` (unchanged)
   - `PUBLIC_EXTERNAL_FEED_SOURCE` (unchanged)
   - `PUBLIC_GISCUS_*` (unchanged)

2. Deploy:
   ```bash
   git push main
   ```
   (Vercel will auto-deploy on push)

**If using traditional server/Docker:**
1. Copy new `.env` to production server
2. Run: `npm run build`
3. Start/restart application

---

## Phase 4: Smoke Testing (Post-Deployment)

### Verify Core Features
- [ ] **Homepage loads** - Newsletter signup section visible
- [ ] **Newsletter signup works** - Submit email, verify email in admin panel
- [ ] **Admin panel accessible** - Login at `/admin` with correct password
- [ ] **Newsletter admin section loads** - List shows any test subscribers
- [ ] **Draft posts hidden** - Create draft post, verify it doesn't appear on public pages
- [ ] **Scheduled posts work** - Schedule a post, verify hidden until scheduled time
- [ ] **Article reactions work** - Like/unlike button on article detail page responds
- [ ] **Status endpoint healthy** - Visit `/api/status.json`, expect uptime metrics

### Verify Security
- [ ] **Security headers present** - Check response headers (DevTools Network tab)
  - Should see: `x-content-type-options`, `x-frame-options`, `permissions-policy`
- [ ] **Admin key gating works** - Access `/api/newsletter` without key, verify 403 Forbidden

---

## Phase 5: Cleanup & Documentation

- [ ] Remove old exposed secrets from git history (if needed):
  ```bash
  git filter-branch --tree-filter 'rm -f .env' HEAD
  # OR use: git-secret, BFG Repo-Cleaner, etc.
  ```

- [ ] Rotate any non-production secrets exposed in commits

- [ ] Document production secret storage location (password manager, secrets service)

- [ ] Archive this checklist with completion dates for audit trail

---

## Rollback Plan (If Issues)

1. **Database issues** - Point-in-time restore in Neon console
2. **Code issues** - Redeploy previous working commit
3. **Credential compromised** - Immediately rotate in Neon + restart app

---

## Quick Reference: New vs Old Structure

| Component | Current (Dev) | Production |
|-----------|---------------|-----------|
| `DATABASE_URL` | Exposed in .env | New rotated value in env vars only |
| `REVIEW_ADMIN_KEY` | `adeyemi-super-secret-key` | New random 64-char hex |
| `ADMIN_PAGE_PASSWORD` | `sefocod@n8870` | New random 32-char hex |
| `.env` tracking | In repo (exposed) | In .gitignore, secrets manager only |
| Database tables | Auto-created on use | Pre-created by `db:migrate` |

---

**Next Step:** Start with Phase 1 (Secret Rotation). Let me know when you've rotated credentials and I'll help verify the migration.
