# PROGRESS

- Phase 1 (FOUNDATION): DONE. Installed `pg` + `@playwright/test`; added `scripts/migrate.js` + `npm run migrate` (applied `supabase/migrations/001_foundation.sql`); event logging (`added` user/scraper/admin, `admin_deleted`, `rejected`, `expired_deleted`) + `scrape_runs` row; `scripts/cleanup-expired.js` + `.github/workflows/cleanup.yml`; Playwright smoke e2e (13 tests, all pass) + `npm run test:e2e`; updated auto-push rule. LEFT: Phases 2-5.
- Phase 1 commit: build passes, `npm run migrate` ok, 13/13 e2e pass.