# OfferMap BD

Mobile-first discount discovery for Bangladesh. Find offers near you, filter by category / area / payment method, explore on a map, save favourites, submit offers, and manage them from an admin panel.

## Stack

- Next.js 14 (App Router) + React 18 + Tailwind CSS + Framer Motion
- Supabase (Postgres + Storage + RLS) via `lib/supabase.js`
- Leaflet + OpenStreetMap + Nominatim + Overpass (outlets) + Tavily/Gemini (scraping)
- next/font: Plus Jakarta Sans + Hind Siliguri (EN/বাংলা)

## Commands

- `npm run dev` — local dev
- `npm run build` — production build
- `npm run start` — serve production build
- `npm run test:e2e` — Playwright e2e (production build, port 3100)
- `npm run verify` — build + e2e + per-item K behavioural checks + clean-tree + pushed + deploy check
- `npm run scrape` / `npm run crawl:direct` — scraping jobs (only when a task item says so)
- `npm run backfill-outlet-areas` — outlet area backfill (K12)

## Layout

- `app/` — routes (home, /offer/[id], /add, /saved, /about, /for-shops, /privacy, /contact, /offers/[district]/[category], /admin, /api/*)
- `components/` — UI (Hero, HomeClient, OfferCard, LeafletMap, FilterBar, BottomNav, AddOfferClient, ui/*)
- `lib/` — data, geo, categories, text, filters, motion, storage
- `tests/e2e/` — Playwright specs (J + K batches)
- `docs/TASKS.md` — authoritative task list
- `docs/screens/` — e2e screenshots
- `docs/lighthouse.json` — Lighthouse report

## Quality gates

Before every commit: `npm run build 2>&1 | tail -15` and the full e2e tests must pass; then commit and push (the Vercel deploy follows from the push).
