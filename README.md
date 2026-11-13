# OfferMap BD 🇧🇩

Discover discounts, deals and hot offers **near your location** in Dhaka. Mobile-first, vibrant, dark/light themed, and free to use.

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

`scripts/scrape.js` finds fresh offers from the web and loads them as `pending`:
- **Tavily** web search returns the top hits per query.
- **Gemini** (`gemini-1.5-flash`) extracts structured offers (title, shop, discount, category, location, description).
- **Nominatim** reverse-geocodes any coordinates and fills the address/area.
- Offers are **upserted** into Supabase by **`dedupe_key`** (unique constraint required) so re-runs don't create duplicates.
- **Query rotation**: a stable pool of queries is consumed round-robin (`SCRAPE_QUERY_START`) so each run covers new ground.
- **`SCRAPE_DRY_RUN=true`** writes nothing — it only builds the report.
- A JSON report is written to `/tmp/scrape-report.json` (uploaded as a GitHub Actions artifact).

Run locally:
```bash
SCRAPE_DRY_RUN=true node scripts/scrape.js      # dry run
node scripts/scrape.js                           # live run
```

The GitHub Action (`.github/workflows/scrape.yml`) runs it daily at **02:00 UTC**, plus manual dispatch. Set these repo secrets for it to work: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD`, `TAVILY_API_KEY`, `GEMINI_API_KEY`, `CRON_SECRET`. New scraped offers land as `pending` and need approval in `/admin`.

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