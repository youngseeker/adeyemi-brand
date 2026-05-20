# Release Notes - 2026-04-26

## Scope

High-standard stabilization and readiness pass across branding, resilience, responsiveness, accessibility, CMS operations, and deployment guidance.

## Delivered

- Replaced default favicon with AA monogram branding.
- Added favicon usage across major pages for consistent tab/app identity.
- Upgraded default layout metadata and theme-color.
- Improved mobile/tablet responsiveness on primary surfaces.
- Hardened feedback API with runtime fallback persistence and moderation support.
- Hardened reactions API with runtime fallback persistence.
- Added backend launch checklist in publishing workflow.
- Updated environment template with DATABASE_URL and launch-critical variables.
- Replaced starter README with project-specific operations guide.
- Added dedicated backend + Git setup playbook.
- Added accessibility improvements:
  - Skip-to-content navigation
  - Better mobile menu ARIA state handling
  - Command palette dialog semantics
  - Live-region status announcements
  - Form autocomplete and labeling improvements
- Added Vite manual chunk strategy for editor dependencies.
- Disabled prefetch for heavy editor entry links to avoid loading authoring assets during normal browsing.

## Validation

- Build status: PASS (`npm run build`)
- Diagnostics status: PASS on modified files
- Known warning remaining at the time: large editor chunk in client build.
- Editor route chunk reduced after split strategy.

## Remaining Risk / Next Batch

- Editor client chunk size remains high; optimize with route-level chunk strategy and manual chunking review.
- Authoring routes remain isolated from normal visitor navigation.
- Run a full visual QA sweep on real devices after deployment.

## Suggested Git Commit Plan

1. `feat: brand favicon and metadata hardening`
2. `feat: improve mobile and publish workflow UX`
3. `fix: add runtime fallback persistence for feedback and reactions`
4. `docs: add backend setup and release operation guides`
5. `feat: accessibility improvements for navigation and status feedback`
