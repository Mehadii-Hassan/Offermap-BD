# PROGRESS

- Phase 1 (FOUNDATION): DONE. `pg` + `@playwright/test`; `scripts/migrate.js` + `npm run migrate` (applied 001_foundation.sql); activity logging (`added`/`admin_deleted`/`rejected`/`expired_deleted`) + `scrape_runs` row; `scripts/cleanup-expired.js` + `.github/workflows/cleanup.yml`; Playwright smoke e2e (13 pass) + `npm run test:e2e`; updated auto-push rule. Commit `8177b7b`.
- Phase 2 (LOCATION): PARTIAL. Commits so far: `60c771a` (precision clf), `ef98e2e` (precision badges + district near-me rule), `2c88e1b` (backfill-areas complete + cap auto-widen 25km + Show-more 50/100 buttons). Loads `?lat&lng&place` shareable link on mount. Build passes. LEFT: full MY PLACES (save/switch/rename/delete/search + link bar); the 4 recommendation sections (2/5/25km + nationwide, counts, load-more); /add area display + stricter pin/address; scraper area/precision extraction; Phase 2 geolocation e2e tests.
- STEP: continue from Phase 2 remaining items.- Commit 77c5b7e: committed app/error.js + app/global-error.js (build passes).
- Part1 #1 MY PLACES committed 9d559b6 (saved named places in localStorage, bar + add/switch/rename/remove).

## G1 AUDIT (batch G)
- ✅ (a) data/sources.json exists (44 sources); direct-crawl `scripts/crawl-direct.js` added (15/day rotation, robots.txt, 1 req/s, up to 5 pagination pages, DRY_RUN-safe, stops on Gemini 429). Verified via DRY_RUN (14 offers from rokomari).
- ✅ (b) "Upload offer photo / screenshot (AI fills the form)" on /add + `/api/scan-offer` (Gemini vision, max 3MB, rate limited, prefills form).
- ✅ (c) `/api/submit` Gemini spam check — publishes as approved if ok + all fields valid, else pending.
- ✅ (d) `/for-shops` page exists (bilingual via t.*, linked in footer).
- ✅ (e) `.github/workflows/scrape.yml` runs twice a day (02:00 & 14:00 UTC) with `MAX_PAGES_PER_RUN=120`.
