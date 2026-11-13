export const APP_BASE = "https://offermap-bd.example.com";

export function pageMeta({
  title,
  description,
  path,
  image,
}) {
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${APP_BASE}${path || "/"}`,
      type: "website",
      siteName: "OfferMap BD",
      images: image
        ? [{ url: image, width: 1200, height: 630 }]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    alternates: { canonical: `${APP_BASE}${path || "/"}` },
  };
}