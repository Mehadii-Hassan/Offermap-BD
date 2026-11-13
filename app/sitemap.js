import { getAllOffers } from "@/lib/offers";
import { APP_BASE } from "@/lib/meta";

export default async function sitemap() {
  const staticPages = ["", "/saved", "/add", "/about", "/privacy", "/contact"];

  const staticEntries = staticPages.map((slug) => ({
    url: `${APP_BASE}${slug}`,
    lastModified: new Date(),
    changeFrequency: slug === "" ? "daily" : "monthly",
    priority: slug === "" ? 1 : 0.6,
  }));

  let offerEntries = [];
  try {
    const offers = await getAllOffers();
    offerEntries = offers.map((o) => ({
      url: `${APP_BASE}/offer/${o.id}`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    }));
  } catch (e) {
    // If Supabase is unreachable, still serve the static entries.
    console.error("sitemap: could not fetch offers", e.message);
  }

  return [...staticEntries, ...offerEntries];
}