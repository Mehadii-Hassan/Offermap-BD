# OfferMap BD 🇧🇩

Discover discounts, deals and hot offers **near your location** in Dhaka. Mobile-first, vibrant, dark/light themed, and free to use.

**Phase 1** is complete: a full local-data prototype with 30 realistic offers across 7 Dhaka areas, ready for future ad integration and a real database.

## ✨ Features

- **Hero + search** with a `📍 Near Me` button (browser geolocation) that falls back to an area dropdown when denied.
- **Category chips** with animated active state across 7 categories.
- **🔥 Hot Right Now**, **⏰ Ending Soon** (live countdown timers), **📍 Near You** (sorted by distance), and a **Today's Top 5** strip.
- **Featured** offers with a glowing badge, listed first.
- **Filters**: category, area, payment method (Any / City Bank Card / bKash), and sort (nearest / ending soon / highest discount).
- **List ⇄ Map toggle**: Leaflet + OpenStreetMap map with custom pins; clicking a pin shows a mini offer card.
- **Offer details**: countdown, payment, description, Get Directions (Google Maps link), WhatsApp + Messenger share, and **Worked ✅ / Didn't work ❌** vote buttons (saved to localStorage with counts).
- **Saved page**: heart-save offers to localStorage; **confetti** fires on your first save.
- **English / বাংলা** language toggle for all main UI text.
- **Dark / light** theme toggle with glassmorphism, gradient blobs, hover glow.
- **SEO**: per-page metadata, Open Graph tags, `sitemap.xml`, `robots.txt`, semantic HTML.
- **Ad slots**: a clearly-commented `<AdSlot />` placeholder between sections, ready for Google AdSense (no real ad code yet).

## ▶️ How to run

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

For a production build:

```bash
npm run build
npm run start
```

## 📁 Folder structure

```
offermap-bd/
├─ app/                    # Next.js App Router pages
│  ├─ layout.jsx           # Root layout, fonts, metadata
│  ├─ page.jsx             # Home (/)
│  ├─ globals.css          # Tailwind + theme styles
│  ├─ sitemap.js           # Auto-generated sitemap
│  ├─ robots.js            # robots.txt
│  ├─ icon.svg             # App icon (favicon)
│  ├─ not-found.jsx        # Custom 404
│  ├─ about/               # About page
│  ├─ privacy/             # Privacy Policy
│  ├─ contact/             # Contact page
│  ├─ saved/               # Saved offers (/saved)
│  └─ offer/[id]/page.jsx  # Offer detail (/offer/1)
├─ components/             # Reusable UI components
│  ├─ Navbar.jsx, Footer.jsx, BottomNav.jsx, PageShell.jsx
│  ├─ Hero.jsx, CategoryChips.jsx, FilterBar.jsx, SectionHeading.jsx
│  ├─ OfferCard.jsx, MapView.jsx, Countdown.jsx
│  ├─ Skeletons.jsx, EmptyState.jsx, Confetti.jsx
│  ├─ OfferDetailClient.jsx, SavedClient.jsx, HomeClient.jsx
│  └─ AdSlot.jsx           # Placeholder for future ads
├─ data/
│  └─ offers.json          # ✅ All offer data lives here (Phase 1)
├─ lib/                    # Logic + data access
│  ├─ offers.js            # ⭐ ONE place that reads offer data
│  ├─ app-context.jsx      # Theme + language provider
│  ├─ text.js              # English / বাংলা translations
│  ├─ storage.js           # localStorage helpers (saved/votes)
│  └─ meta.js              # Metadata helper
├─ public/manifest.webmanifest
├─ next.config.js          # Next.js config
├─ postcss.config.js        # PostCSS config
├─ tailwind.config.js       # Tailwind theme
└─ package.json
```

## ➕ How to add a new offer

Add a new object to the array in **`data/offers.json`** using a unique `id`:

```jsonc
{
  "id": "31",                       // unique number as a string
  "title": "Buy 1 Get 1 on Coffee", // headline shown on the card
  "shopName": "Brew & Bean",        // shop/brand name
  "category": "Restaurant",          // one of the 7 categories
  "area": "Dhanmondi",               // one of the 7 areas
  "lat": 23.7461,                   // decimal latitude
  "lng": 90.3762,                   // decimal longitude
  "discountText": "BOGO FREE",       // e.g. "30% OFF", "৳200 OFF"
  "description": "Get a second coffee free with any large cup.",
  "validTill": "2026-12-31",         // ISO date — countdown auto-computes
  "paymentMethod": "Any",            // "Any" | "City Bank Card" | "bKash"
  "isFeatured": false,               // true adds a glowing Featured badge
  "hotScore": 60,                    // 0–100, drives "Hot Right Now"
  "viewsToday": 125,                 // displayed as "🔥 X people viewed today"
  "image": "https://images.unsplash.com/..." // an image URL
}
```

That&apos;s it. The home page, filters, map, search and detail page all update automatically — the ONLY place that reads offer data is **`lib/offers.js`**, so later you can swap `offers.json` for a database without touching the UI.

### Categories (exact values)
`Restaurant` · `Fashion & Clothing` · `Bank Card Offers` · `Electronics` · `Salon & Beauty` · `Grocery` · `Entertainment`

### Areas (exact values)
`Dhanmondi` · `Gulshan` · `Banani` · `Uttara` · `Mirpur` · `Mohammadpur` · `Old Dhaka`

## 🛠 Tech stack

- **Next.js 14** (App Router) + **Tailwind CSS**
- **Framer Motion** — animations
- **Leaflet + react-leaflet + OpenStreetMap** — maps (free, no API keys)
- **lucide-react** — icons
- All free, no paid services, no API keys.

## 🗺 Roadmap (future phases)

- Move `offers.json` → a real database (Postgres/Supabase) behind `lib/offers.js`
- Real discount search + verified offer submissions
- Google AdSense integration inside the existing `<AdSlot />` placeholders
- City offer alert notifications