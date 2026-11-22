import { getAllOffers } from "@/lib/offers";
import { DISTRICTS } from "@/lib/bd-locations";
import { CATEGORY_KEYS } from "@/lib/categories";
import { APP_BASE } from "@/lib/meta";
import { districtSlug, categoryHref } from "@/components/DistrictOffers";

export const dynamic = "force-dynamic";

export default async function sitemap() {
  const lastmod = new Date().toISOString();
  const staticPages = ["", "/saved", "/add", "/about", "/privacy", "/contact", "/terms"];

  const staticEntries = staticPages.map((slug) => ({
    url: `${APP_BASE}${slug}`,
    lastModified: lastmod,
    changeFrequency: slug === "" ? "daily" : "monthly",
    priority: slug === "" ? 1 : 0.6,
  }));

  let offerEntries = [];
  let districtEntries = [];
  try {
    const offers = await getAllOffers();

    offerEntries = offers.map((o) => ({
      url: `${APP_BASE}/offer/${o.id}`,
      lastModified: lastmod,
      changeFrequency: "daily",
      priority: 0.8,
    }));

    // Only indexable location landing pages (>= 3 real offers).
    const counts = {};
    for (const o of offers) {
      const d = String(o.district || "").toLowerCase();
      if (!d) continue;
      counts[d] = counts[d] || {};
      counts[d][o.category] = (counts[d][o.category] || 0) + 1;
      counts[d]._all = (counts[d]._all || 0) + 1;
    }
    for (const d of DISTRICTS) {
      const slug = districtSlug(d.name);
      const key = String(d.name).toLowerCase();
      const c = counts[key];
      if (!c || (c._all || 0) < 3) continue;
      districtEntries.push({
        url: `${APP_BASE}/offers/${slug}`,
        lastModified: lastmod,
        changeFrequency: "weekly",
        priority: 0.7,
      });
      for (const cat of CATEGORY_KEYS) {
        if ((c[cat] || 0) >= 3) {
          districtEntries.push({
            url: `${APP_BASE}/offers/${slug}/${categoryHref(cat)}`,
            lastModified: lastmod,
            changeFrequency: "weekly",
            priority: 0.6,
          });
        }
      }
    }
  } catch (e) {
    console.error("sitemap: could not fetch offers", e.message);
  }

  return [...staticEntries, ...offerEntries, ...districtEntries];
}