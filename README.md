# OfferMap BD 🇧🇩

Discover discounts, deals and hot offers **near your location** in Dhaka. Mobile-first, vibrant, dark/light themed, and free to use.

**Phase 1** delivered the full UI (hero search, Near Me, filters, list/map, saved, English/বাংলা, dark/light).
**Phase 2** moved all data to **Supabase**, added a public offer submission form (`/add`), and a mobile-friendly **admin approval panel** (`/admin`).

## ✨ Features

- **Hero + search** with a `📍 Near Me` button (browser geolocation) that falls back to an area dropdown when denied.
- **Category chips**, **🔥 Hot Right Now**, **⏰ Ending Soon** (live countdown), **📍 Near You**, **Today's Top 5**, and **Featured** badges.
- **Filters**: category, area, payment method, sort (nearest / ending soon / highest discount).
- **List ⇄ Map toggle** (Leaflet + OpenStreetMap).
- **Offer details**: countdown, payment, directions, WhatsApp/Messenger share, and **Worked ✅ / Didn't work ❌** — counts live in Supabase, guarded per-browser via localStorage.
- **Saved page** with heart-save + confetti.
- **Add Offer (`/add`)**: public submission form with honeypot + rate limit (max 5/IP/hour). Photos upload to the `offer-images` bucket; lat/lng auto-filled from area centers. New offers are stored as `pending`.
- **Admin (`/admin`)**: password login (httpOnly cookie), tabs for Pending / Approved / Rejected, Approve / Reject / Delete / Toggle-Featured / inline-Edit — mobile friendly. `noindex` + `Disallow: /admin`.
- **English / বাংলা** toggle, **dark/light** toggle, glassmorphism, gradient blobs, glow hover.
- **SEO**: per-page metadata, Open Graph, Supabase-driven `sitemap.xml`, `robots.txt`.
- **Ad slots**: `<AdSlot />` placeholder ready for Google AdSense.

## ▶️ How to run

1. **Set up Supabase**
   - Create a Supabase project.
   - Create the `offers` table with these columns:
     `id (uuid, default gen_random_uuid()), title, shop_name, category, area, lat, lng, discount_text, description, valid_till (date), payment_method, image, is_featured (bool), hot_score (int), status (text: 'pending'/'approved'/'rejected'), worked_count (int), not_worked_count (int), created_at (timestamptz, default now())`.
   - Create a public storage bucket named `offer-images`.
   - Enable RLS: allow public **read** only where `status = 'approved'`. Grant the anon role select on `offers`.

2. **Configure env** — create `.env.local` in the project root:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key   # server-side only, never exposed
   ADMIN_PASSWORD=your-admin-password
   ```
   > `SUPABASE_SERVICE_ROLE_KEY` and `ADMIN_PASSWORD` are used **only** in server-side code and API routes. They never reach the browser. `.env.local` is git-ignored.

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
│  │  └─ admin/
│  │     ├─ login/route.js      # POST login (httpOnly cookie), DELETE logout
│  │     ├─ offers/route.js     # GET list (cookie-protected)
│  │     └─ offers/[id]/route.js# PATCH approve/reject/feature/edit, DELETE
│  ├─ sitemap.js                # Offer URLs from Supabase
│  └─ robots.js                 # Disallows /admin and /api/
├─ components/
│  ├─ HomeClient, OfferCard, MapView (leaflet dynamic import), Countdown,
│  │  Hero, CategoryChips, FilterBar, SectionHeading, Skeletons, EmptyState,
│  │  Confetti, Navbar, Footer, BottomNav, PageShell
│  ├─ AddOfferClient.jsx        # /add form + thank-you screen
│  └─ AdminClient.jsx           # login + tabs + actions
├─ data/
│  └─ offers.json               # Backup of the 30 sample offers (seeded via npm run seed)
├─ scripts/
│  └─ seed.js                   # Reads offers.json → inserts as approved
├─ lib/
│  ├─ offers.js                 # ⭐ ONLY place that reads offer data
│  ├─ supabase.js               # public + admin clients, row mapping
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
  "category": "Restaurant",          // one of 7 categories
  "area": "Dhanmondi",               // one of 7 Dhaka areas
  "lat": 23.7461, "lng": 90.3762,    // auto-filled on /add from area
  "discountText": "BOGO FREE",
  "description": "Get a second coffee free with any large cup.",
  "validTill": "2026-12-31",
  "paymentMethod": "Any",            // "Any" | "City Bank Card" | "bKash"
  "isFeatured": false,
  "hotScore": 60,
  "image": "https://images.unsplash.com/..."
}
```

### Categories
`Restaurant` · `Fashion & Clothing` · `Bank Card Offers` · `Electronics` · `Salon & Beauty` · `Grocery` · `Entertainment`

### Areas
`Dhanmondi` · `Gulshan` · `Banani` · `Uttara` · `Mirpur` · `Mohammadpur` · `Old Dhaka`

## 🛠 How the Admin panel works

1. Open `/admin` and enter the `ADMIN_PASSWORD` from `.env.local`.
2. On success, an httpOnly cookie is set. Every `/api/admin/*` request verifies that cookie (401 otherwise).
3. Tabs: **Pending / Approved / Rejected**. Top row shows counts (pending / approved / total).
4. Each offer card has: **Approve**, **Reject**, **Delete**, **Make Featured / Remove Featured**, and **Edit** (inline edit of title, discount text, valid until).
5. Approving flips `status = 'approved'`, which makes the offer visible to everyone on the home page.

## 🛠 Tech stack

- **Next.js 14** (App Router) + **Tailwind CSS**
- **Supabase** (Postgres + Storage + RLS)
- **Framer Motion** — animations
- **Leaflet + react-leaflet + OpenStreetMap** — maps
- **lucide-react** — icons
- Free stack, no paid services, no API keys.

## 🗺 Roadmap

- Schedule: auto-expire offers when `valid_till` passes.
- Email verification for submitters.
- Google AdSense inside the existing `<AdSlot />` placeholders.
- City-wide offer alert notifications.