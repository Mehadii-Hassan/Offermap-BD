import Link from "next/link";
import { getAllOffers } from "@/lib/offers";
import { DISTRICTS } from "@/lib/bd-locations";
import { CATEGORY_KEYS, getCategory } from "@/lib/categories";

export function districtSlug(name) {
  return String(name || "").toLowerCase().replace(/\s+/g, "-");
}

const CATEGORY_LINK = {
  "bank card offers": "bank-card-offers",
  "fashion & clothing": "fashion-clothing",
  "salon & beauty": "salon-beauty",
  "mobile & gadgets": "mobile-gadgets",
  "travel & hotels": "travel-hotels",
  "health & fitness": "health-fitness",
  "online shopping": "online-shopping",
  "cashback & wallet": "cashback-wallet",
  "education & courses": "education-courses",
  electronics: "electronics",
  restaurant: "restaurant",
  grocery: "grocery",
  entertainment: "entertainment",
  other: "other",
};

export function categoryHref(catKey) {
  return CATEGORY_LINK[String(catKey).toLowerCase()] || String(catKey).toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

export function findDistrict(slug) {
  return DISTRICTS.find((d) => String(d.name).toLowerCase() === slug) || null;
}

export function findCategoryKey(slug) {
  const entry = Object.entries(CATEGORY_LINK).find(([, v]) => v === slug);
  return entry ? getCategory(entry[0]).key : null;
}

// Server-rendered offer list for landing pages.
function LandingList({ offers }) {
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {offers.map((o) => (
        <li key={o.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <Link href={`/offer/${o.id}`} className="block">
            <div className="text-sm font-extrabold text-accent-pink">{o.discountText}</div>
            <div className="mt-1 font-bold">{o.title}</div>
            <div className="text-xs text-white/50">{o.shopName}</div>
            <div className="mt-2 text-xs text-white/60">{o.area}</div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default async function DistrictOffersView({ districtSlugValue, categoryKey }) {
  const d = findDistrict(districtSlugValue);
  const offers = await getAllOffers();
  if (!d || Array.isArray(districtSlugValue)) return null;

  const cat = categoryKey ? getCategory(categoryKey) : null;
  const areaOffers = offers.filter((o) => String(o.district || "").toLowerCase() === String(d.name).toLowerCase());
  const list = categoryKey ? areaOffers.filter((o) => o.category === categoryKey) : areaOffers;
  const title = `${cat ? `${cat.en} ` : ""}offers in ${d.name}`;
  const intro = `${cat ? `${cat.bn} ` : ""}offers and discounts in ${d.name}, ${d.division}.`;
  const nearbyDistricts = DISTRICTS.filter((x) => x.division === d.division && x.name !== d.name).slice(0, 6);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 pb-24 md:pb-10">
      <nav className="mb-4 text-xs text-white/50">
        <Link href="/" className="hover:text-white">Home</Link> ›{" "}
        <span className="text-white/70">{title}</span>
      </nav>
      <h1 className="text-3xl font-black">{title}</h1>
      <p className="mt-2 text-sm text-white/60">{intro}</p>

      {/* Category links */}
      <div className="mt-6 flex flex-wrap gap-2">
        <Link href={`/offers/${districtSlugValue}`} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${!categoryKey ? "bg-gradient-to-tr from-accent-orange to-accent-pink text-white" : "border border-white/15 text-white/70 hover:bg-white/10"}`}>
          All
        </Link>
        {CATEGORY_KEYS.map((k) => (
          <Link key={k} href={`/offers/${districtSlugValue}/${categoryHref(k)}`} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${k === categoryKey ? "bg-gradient-to-tr from-accent-orange to-accent-pink text-white" : "border border-white/15 text-white/70 hover:bg-white/10"}`}>
            {k}
          </Link>
        ))}
      </div>

      {list.length === 0 ? (
        <p className="mt-8 text-sm text-white/50">No {cat ? cat.en.toLowerCase() : "matching"} offers in {d.name} right now.</p>
      ) : (
        <div className="mt-8">
          <LandingList offers={list} />
        </div>
      )}

      {/* Nearby districts */}
      <div className="mt-10">
        <h2 className="text-lg font-bold">Nearby districts</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {nearbyDistricts.map((nd) => (
            <Link key={nd.name} href={`/offers/${districtSlug(nd.name)}`} className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10 transition">
              {nd.name}
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}