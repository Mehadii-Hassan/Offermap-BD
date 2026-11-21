# Progress — OfferMap BD

This file tracks the real state of the build. Old notes were removed.

## Batch H — chain outlets and data growth (DONE)

- H1–H3: outlet expansion from Overpass + page-sourced merchant outlets (geocoded, resumable).
- H5: UI shows nearest outlet + distance; detail page lists outlets, mini map, directions.
- H6: empty-state card with add/share when < 5 offers within 5 km.
- H7: e2e for the Uttara geolocation case.

## Batch J — location fix + premium redesign (DONE as of 2026-11-21)

- J1: permission header, /api/geo route, in-app browser banner, retry logic, bilingual messages implemented; auto-ask effect still pending removal (handled by K1).
- J2: design tokens, fonts, UI primitives, glass, hero mesh, reduced-motion.
- J3: premium home + offer card redesign implemented (hero, category rail, today's best, OfferCard, skeletons); polish item pending (K2).

## Batch K — finish the redesign (PLAN)

- K0–K12 items live in `docs/TASKS.md`. K0 baseline: build + full e2e green on 2026-11-21.

## Final state

- Stack: Next.js 14 App Router, Tailwind, Framer Motion, Supabase, Leaflet + Nominatim + Tavily/Gemini.
- Live: https://offermap-bd.vercel.app
- Checks: `npm run build`, `npm run test:e2e`, `npm run verify`, `npm run scrape`, etc.
