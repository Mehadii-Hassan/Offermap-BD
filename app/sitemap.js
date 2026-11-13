import { getAllOffers } from "@/lib/offers";
import { APP_BASE } from "@/lib/meta";

export default function sitemap() {
  const staticPages = [
    "",
    "/saved",
    "/about",
    "/privacy",
    "/contact",
  ];

  const staticEntries = staticPages.map((slug) => ({
    url: `${APP_BASE}${slug}`,
    lastModified: new Date(),
    changeFrequency: slug === "" ? "daily" : "monthly",
    priority: slug === "" ? 1 : 0.6,
  }));

  const offerEntries = getAllOffers().map((o) => ({
    url: `${APP_BASE}/offer/${o.id}`,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 0.8,
  }));

  return [...staticEntries, ...offerEntries];
}