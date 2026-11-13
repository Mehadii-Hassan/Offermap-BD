# OfferMap BD 🇧🇩

Discover discounts, deals and hot offers **near your location** across Bangladesh. Mobile-first, vibrant, dark/light themed, and free to use.

**Phase 1** delivered the full UI (hero search, Near Me, filters, list/map, saved, English/বাংলা, dark/light).
**Phase 2** moved all data to **Supabase**, added a public offer submission form (`/add`), and a mobile-friendly **admin approval panel** (`/admin`).
**Phase 3** added a map-based submission flow with address search, an automated web scraper (Tavily + Gemini + Nominatim), and source badges plus reporting.

## ✨ Features

- **Hero + search** with a `📍 Near Me` button (browser geolocation) that falls back to an area dropdown when denied.
- **Category chips**, **🔥 Hot Right Now**, **⏰ Ending Soon** (live countdown), **📍 Near You**, **Today's Top 5**, and **Featured** badges.
- **Filters**: category, division/district, area, payment method, sort (nearest / ending soon / highest discount).
- **List ⇄ Map toggle** (Leaflet + OpenStreetMap).
- **Offer details**: countdown, payment, directions, WhatsApp/Messenger share, **Worked ✅ / Didn't work ❌** (guarded per-browser via localStorage), and **Report offer**.
- **Source badges** on each card: `Auto-collected` (scraper) vs `Submitted by community`.
- **Saved page** with heart-save + confetti.
- **Add Offer (`/add`)**: public submission form with honeypot + rate limit (max 5/IP/hour). Choose division → district, drop a pin on the map (or use current location), search/address via Nominatim (Bangladesh-bounded), and upload a photo (max 3MB). Photos upload to `offer-images`; coordinates + address are stored directly.
- **Automated scraper** (`scripts/scrape.js`): Tavily web search → Gemini offer extraction → Nominatim geocoding → Supabase upsert by `dedupe_key`, with query rotation, `DRY_RUN`, and a run report. Runs daily via `.github/workflows/scrape.yml`.
- **Admin (`/admin`)**: password login (httpOnly cookie), tabs for Pending / Approved / Rejected / Scraped, Approve / Reject / Delete / Toggle-Featured / inline-Edit, and **Delete Expired** (bulk-removes offers past `valid_till`).
- **English / বাংলা** toggle, **dark/light** toggle, glassmorphism, gradient blobs, glow hover.
- **SEO**: per-page metadata, Open Graph, Supabase-driven `sitemap.xml`, `robots.txt`.
- **Ad slots**: `<AdSlot />` placeholder ready for Google AdSense.

## ▶️ How to run

1. **Set up Supabase**
   - Create a Supabase project.
   - Create the `offers` table with these columns:
     `id (uuid, default gen_random_uuid()), title, shop_name, category, division, district, area, address, lat, lng, discount_text, description, valid_till (date), payment_method, image, is_featured (bool), hot_score (int), status (text: 'pending'/'approved'/'rejected'), source, source_url, dedupe_key, worked_count (int), not_worked_count (int), created_at (timestamptz, default now())`.
   - Add a **unique constraint on `dedupe_key`** so the scraper upserts by it.
   - Create the `scrape_log` table: `id (uuid, default gen_random_uuid()), url (text, unique, not null), scraped_at (timestamptz, default now())`.
   - Create a public storage bucket named `offer-images`.
   - Enable RLS: allow public **read** only where `status = 'approved'`. Grant the anon role select on `offers`.

2. **Configure env** — create `.env.local` in the project root:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key   # server-side only, never exposed
   ADMIN_PASSWORD=your-admin-password
   TAVILY_API_KEY=your-tavily-key                    # scraper (optional for scraping)
   GEMINI_API_KEY=your-gemini-key                    # scraper (optional for scraping)
   CRON_SECRET=your-cron-secret                      # optional
   ```
   > `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD`, and the scraper keys are used **only** in server-side
   > code and API routes. They never reach the browser. `.env.local` is git-ignored.

3. **Install & seed the database**
   ```bash
   npm install
   npm run seed      # inserts the 30 sample offers from data/offers.json as 'approved'
   ```
   > To remove just those 30 sample offers later (and leave user/scraped ones alone):
   > ```bash
   > npm run clean-samples
   > ```

4. **Run**
   ```bash
   npm run dev       # http://localhost:3000
   # or production:
   npm run build && npm run start
   ```

## 🗄 How the data layer works

All data access lives in **`lib/offers.js`** (the single place that reads offers).
- It reads from Supabase via `lib/supabase.js`, which exposes a **public client** (`supabase`, anon key, RLS-restricted to approved + valid) and an **admin client** (`supabaseAdmin`, service role key, server-side only).
- The public API only returns offers with `status = 'approved'` and `valid_till >= today`.
- Supabase rows (snake_case) are mapped to the camelCase shapes the existing UI already uses.

## 📁 Folder structure

```
offermap-bd/
├─ app/                         # Next.js App Router
│  ├─ page.jsx                  # Home (/)
│  ├─ add/page.jsx              # Public offer submission (/add) — "Offer Add Koro"
│  ├─ admin/page.jsx            # Admin panel (/admin)
│  ├─ offer/[id]/page.jsx       # Offer detail (/offer/:id) — dynamic, loads from Supabase
│  ├─ saved/, about/, privacy/, contact/, not-found.jsx
│  ├─ api/
│  │  ├─ submit/route.js        # POST — validate, upload photo, insert as pending
│  │  ├─ vote/route.js          # POST — increment worked_count / not_worked_count
│  │  ├─ report/route.js        # POST — report an (expired/fake) offer
│  │  └─ admin/
│  │     ├─ login/route.js      # POST login (httpOnly cookie), DELETE logout
│  │     ├─ offers/route.js     # GET list (cookie-protected)
│  │     ├─ offers/[id]/route.js# PATCH approve/reject/feature/edit, DELETE
│  │     └─ offers/delete-expired/route.js  # POST — bulk-delete expired offers
│  ├─ sitemap.js                # Offer URLs from Supabase
│  └─ robots.js                 # Disallows /admin and /api/
├─ .github/workflows/scrape.yml # Daily scraper (02:00 UTC) + manual dispatch
├─ components/
│  ├─ HomeClient, OfferCard, MapView (leaflet dynamic import), Countdown,
│  │  Hero, CategoryChips, FilterBar, SectionHeading, Skeletons, EmptyState,
│  │  Confetti, Navbar, Footer, BottomNav, PageShell
│  ├─ AddOfferClient.jsx        # /add form (map picker, address search) + thank-you screen
│  ├─ LocationPickerMap.jsx     # Leaflet map used by /add (dynamic import, ssr:false)
│  └─ AdminClient.jsx           # login + tabs (incl. Scraped) + actions
├─ data/
│  └─ offers.json               # Backup of the 30 sample offers (seeded via npm run seed)
├─ scripts/
│  ├─ seed.js                   # Reads offers.json → inserts as approved
│  └─ scrape.js                 # Tavily + Gemini + Nominatim scraper → pending offers
├─ lib/
│  ├─ offers.js                 # ⭐ ONLY place that reads offer data
│  ├─ supabase.js               # public + admin clients, row mapping
│  ├─ bd-locations.js           # Divisions, districts, areas, BD bounds, geocoding fallback
│  ├─ distance.js               # Haversine distance helpers
│  ├─ geo.js                    # Browser geolocation helpers
│  ├─ admin-auth.js             # httpOnly cookie verification
│  ├─ rate-limit.js             # in-memory rate limiting + honeypot helper
│  ├─ app-context.jsx           # theme + language provider
│  ├─ text.js                   # English / বাংলা translations
│  ├─ storage.js                # localStorage (saved, voted)
│  └─ meta.js                   # metadata helper
├─ .env.local                   # 👈 your secrets (git-ignored)
└─ package.json
```

## ➕ Adding an offer

**Public route (recommended):** visit `/add`, fill the form, and it lands as `pending` in Supabase. Approve it in `/admin` and it appears immediately on the home page.

**Seed/backup route:** add an object to `data/offers.json` then run `npm run seed`. Fields:

```jsonc
{
  "title": "Buy 1 Get 1 on Coffee",
  "shopName": "Brew & Bean",
  "category": "Restaurant",          // one of the 13 categories below
  "division": "Dhaka",
  "district": "Dhaka",
  "area": "Dhanmondi",               // neighbourhood / area
  "address": "3/2 Dhanmondi Rd, Dhaka 1205",
  "lat": 23.7461, "lng": 90.3762,    // from the /add map picker or area center
  "discountText": "BOGO FREE",
  "description": "Get a second coffee free with any large cup.",
  "validTill": "2026-12-31",
  "paymentMethod": "Any",            // "Any" | "City Bank Card" | "bKash" | "Nagad" | "Rocket"
  "source": "community",             // "community" | "scraper"
  "isFeatured": false,
  "hotScore": 60,
  "image": "https://images.unsplash.com/..."
}
```

### Categories
`Restaurant` · `Fashion & Clothing` · `Bank Card Offers` · `Electronics` · `Salon & Beauty` · `Grocery` · `Entertainment` · `Travel & Hotels` · `Mobile & Gadgets` · `Health` · `Education & Courses` · `Online Shopping` · `Mobile Wallet Cashback`

### Areas
Division → District dropdowns cover all of Bangladesh (8 divisions, 64 districts). Within Dhaka city you can type a specific area such as `Dhanmondi`, `Gulshan`, `Banani`, `Uttara`, `Mirpur`, or set an exact pin on the map.

## 🛠 How the Admin panel works

1. Open `/admin` and enter the `ADMIN_PASSWORD` from `.env.local`.
2. On success, an httpOnly cookie is set. Every `/api/admin/*` request verifies that cookie (401 otherwise).
3. Tabs: **Pending / Approved / Rejected / Scraped**. Top row shows counts (pending / approved / total).
4. Each offer card has: **Approve**, **Reject**, **Delete**, **Make Featured / Remove Featured**, and **Edit** (inline edit of title, discount text, valid until). The **Delete Expired** button bulk-removes offers past `valid_till`.
5. Approving flips `status = 'approved'`, which makes the offer visible to everyone on the home page.

## 🤖 Web scraping pipeline

`scripts/scrape.js` finds fresh offers from the web and **auto-publishes** them directly as `approved` (no manual review):
- **Tavily** web search returns the top hits per query.
- **Gemini** (`gemini-flash-lite-latest`) extracts structured offers (title, shop, category, division, district, address, discount, description, valid_till, payment, image, source). Gemini **never** provides coordinates — any `lat`/`lng` in its response is stripped.
- **Location resolution** (Nominatim, max 1 req/sec, proper User-Agent, Bangladesh-bounds checked): first `<shop_name>, <address>, <district>, Bangladesh`; then just `<address>, <district>, Bangladesh`; then the **district center** from `/lib/bd-locations.js` with `(approximate location)` appended to the address. If the district is unknown, the offer is **skipped**.
- **Strict validation**: an offer is published **only** if `title`, `shop_name`, `discount_text`, a `valid_till` that is today or later, and valid `lat`/`lng` (inside Bangladesh) are all present. The bounds check is kept as a final safety net but almost never skips now. Anything missing is **skipped** and listed in the report.
- **`scrape_log`** table stores every processed `url`, so URLs already handled are skipped on later runs (unique constraint on `url` required).
- Offers are **upserted** into Supabase by **`dedupe_key`** (unique constraint required) via `onConflict: 'dedupe_key'`, so re-runs don't create duplicates.
- **Query rotation**: a query pool (English + Bengali, built programmatically from 13 categories × 30 locations = ~780 queries, shuffled with a fixed seed) **auto-advances daily** with no DB table and no required env — `dayNumber * MAX_QUERIES_PER_RUN % poolLength`, wrapping at the end. `SCRAPE_QUERY_START` is an optional manual override if set.
- **Free-tier safety**: `MAX_QUERIES_PER_RUN` defaults to **30** (set `3` for a quick test), `MAX_PAGES_PER_RUN` defaults to **60** to cap Gemini calls, and a small delay runs between Gemini calls. If Gemini returns **429**, the script stops Gemini work for that run, saves what's already done, and prints a clear warning instead of crashing.
- **Report** includes pool total, queries run today, days for a full rotation, Tavily searches and Gemini calls used, offers found / inserted / skipped with per-reason breakdown, and how many used an exact location vs the district center. The console prints the first 5 offers.
- **`SCRAPE_DRY_RUN=true`** writes nothing — it only builds the report.
- A JSON report is written to the OS temp dir (e.g. `%TEMP%\scrape-report.json` on Windows, `/tmp/scrape-report.json` on Linux; uploaded as a GitHub Actions artifact).

Run locally:
```bash
SCRAPE_DRY_RUN=true node scripts/scrape.js      # dry run (no DB writes)
node scripts/scrape.js                           # live run (auto-publishes)
```

The GitHub Action (`.github/workflows/scrape.yml`) runs it daily at **02:00 UTC** as a real run (auto-publishes), plus manual dispatch with an optional `dry_run` toggle. Set these repo secrets for it to work: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD`, `TAVILY_API_KEY`, `GEMINI_API_KEY`, `CRON_SECRET`.

The `offers` table needs a **unique constraint on `dedupe_key`**, and a separate **`scrape_log`** table with columns `id (uuid)`, `url (text, unique)`, `scraped_at (timestamptz)` — i.e. exactly `scrape_log(id uuid, url text unique, scraped_at timestamptz)`. The script selects by `url`, upserts `{ url, scraped_at }` with `onConflict: 'url'`, and needs **no other columns** on the `scrape_log` table.

## 🛠 Tech stack

- **Next.js 14** (App Router) + **Tailwind CSS**
- **Supabase** (Postgres + Storage + RLS)
- **Framer Motion** — animations
- **Leaflet + react-leaflet + OpenStreetMap** — maps
- **Nominatim (OSM)** — forward + reverse geocoding (address search)
- **Tavily + Gemini** — automated offer scraping pipeline
- **lucide-react** — icons
- Free tier friendly; API keys are optional and only used by the scraper.

## 🗺 Roadmap

- Email verification for submitters.
- Google AdSense inside the existing `<AdSlot />` placeholders.
- City-wide offer alert notifications.