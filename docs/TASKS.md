# OfferMap BD task list
Done already: Phase 1 foundation (migrate, activity_log, site_visits, scrape_runs, cleanup-expired, e2e smoke tests), precision classifier, MY PLACES bar, error pages.

## LOCATION
- [x] L1 RECOMMENDATION SECTIONS: for the chosen place show sections in order: "Very close (within 2 km)", "In your area (within 5 km)", "In your city (within 25 km)", "Nationwide & online". Sort by distance then hotScore, show counts, hide empty sections, "Load more" on long lists. Never auto-widen beyond 25 km; only a "Show more 50/100 km" button. Category chips and filters apply to all sections. An offer from Rangpur never shows for a user in Dhaka unless radius "Any" or a district filter is chosen.
- [x] L2 AREA LABELS: cards and pages show a specific place + distance ("Uttara Sector 10, Dhaka · 850 m away"), never just "Bangladesh" or a district. District-precision offers show "District-wide: <district>" plus an "Exact address not available" badge.
- [x] L3 /add FORM: exact map pin and address required; show the detected area live under the map ("📍 Uttara Sector 10, Dhaka"); address editable.
- [x] L4 SCRAPER PRECISION (scripts/scrape.js): Gemini extracts shop address and area (sector/road/neighbourhood) when the page has it; geocode shop name + address bounded to the district; set location_precision; non-nationwide district-precision offers never appear in near-me lists below 25 km.
- [x] L5 e2e LOCATION TEST: geolocation Uttara (lat 23.8759, lng 90.3795): section order correct, no far-away offers (e.g. Rangpur); saved place in Sylhet and switching works; share link ?lat&lng&place opens the same view; no console errors.

## IMAGES
- [x] I1 IMAGE PIPELINE (lib/image-pipeline.js, used by scraper and backfill): candidates in order: og:image/twitter:image of the source page, the largest content <img> (check up to 8), optional Unsplash category photo if UNSPLASH_ACCESS_KEY exists (with credit), else none. Rules: https, status 200, content-type image/*, max 5 MB, use "probe-image-size" to require width>=800 and height>=450 (og:image>=600 wide), aspect ratio 1:1 to 2.4:1; reject URLs containing logo, icon, favicon, avatar, sprite, placeholder; reject square images under 800px.
- [x] I2 STORAGE: save accepted images as webp (max 1200px wide, "sharp", quality ~80) in public Supabase bucket "offer-images" at offers/<id>.webp; offers.image = public URL, source_image_url = original; delete stored image when an offer is deleted (cleanup script and admin delete); show "Image: <source domain>" on detail page.
- [x] I3 CARD UI: all cards one fixed 16:10 ratio, object-cover, gradient while loading, bottom gradient for readable text, rounded-2xl; odd ratios use object-contain over a blurred copy; missing/broken image falls back to the category placeholder (gradient + icon); no layout shift; detail page large hero.
- [x] I4 BACKFILL: scripts/backfill-images.js reprocesses ALL existing offers with these rules (max 100 per run, 1 request/s, resumable, replaces low-quality images). Run it repeatedly until all are processed.
- [x] I5 e2e IMAGE TESTS: no broken <img> (naturalWidth>0) on home and 3 detail pages; no horizontal overflow or layout shift at 390px width.

## ADMIN
- [x] A1 VISIT TRACKING: <VisitTracker /> in root layout sends {path, referrer} to /api/track (sendBeacon/fetch); visitor_id = random UUID in localStorage; server route (service role key) sets is_new_visitor, reads Vercel headers x-vercel-ip-country/-country-region/-city, user-agent -> device, ignores bots, /admin and /api, light rate limit; add one honest line about anonymous visit statistics to the Privacy page.
- [x] A2 SQL FUNCTIONS: migration 002 with RPC functions aggregating dashboard numbers in Bangladesh time (UTC+6); run npm run migrate.
- [x] A3 STATS API: cookie-protected /api/admin/stats returning all dashboard data.
- [ ] A4 DASHBOARD UI: /admin opens on a "Dashboard" tab (keep Pending/Approved/Rejected/Scraped), mobile friendly. OFFERS: added today/yesterday/7 days (user vs scraped), deleted today/yesterday/7 days (auto-expired vs admin-deleted), live now, pending, expiring in 3 days, real image vs placeholder, precision breakdown, top categories and divisions. VISITORS: unique today/yesterday/7/30 days, page views, new vs returning, top 10 pages (offer titles), top referrers, devices, top cities, 14-day charts (visitors, offers added vs deleted). ACTIVITY: latest 20 events, last 10 scrape_runs with a red flag if a run failed or inserted 0. Buttons "Delete expired now" and "Refresh".
- [ ] A5 e2e ADMIN TEST: /api/track stores a visit; admin login (ADMIN_PASSWORD from .env.local, never print it) and the dashboard shows numbers.

## FINAL
- [ ] F1 FINAL CHECK: build + e2e pass; DRY_RUN=true MAX_QUERIES_PER_RUN=3 npm run scrape works and writes nothing; .env.local not tracked; final report in max 10 lines (offers live scraped/user/samples, real image vs placeholder, precision counts, anything manual).