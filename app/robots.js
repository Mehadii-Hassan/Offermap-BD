import { APP_BASE } from "@/lib/meta";

export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/"],
      },
    ],
    sitemap: `${APP_BASE}/sitemap.xml`,
  };
}