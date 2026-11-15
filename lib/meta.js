export const APP_BASE = "https://offermap-bd.example.com";
export const DEFAULT_OG_IMAGE = `${APP_BASE}/icon.svg`;

export function pageMeta({
  title,
  description,
  path,
  image,
  robots,
}) {
  const url = `${APP_BASE}${path || "/"}`;
  const images = [{ url: image || DEFAULT_OG_IMAGE, width: 1200, height: 630 }];
  return {
    title,
    description,
    robots,
    openGraph: {
      title,
      description,
      url,
      type: "website",
      siteName: "OfferMap BD",
      locale: "en_US",
      images,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      image: image || DEFAULT_OG_IMAGE,
    },
    alternates: { canonical: url },
    metadataBase: new URL(APP_BASE),
  };
}

// JSON-LD structured data for a single offer.
export function offerJsonLd(offer) {
  const url = `${APP_BASE}/offer/${offer.id}`;
  return {
    "@context": "https://schema.org",
    "@type": "Offer",
    name: `${offer.discountText} at ${offer.shopName}`,
    description: offer.description,
    url,
    image: offer.image || DEFAULT_OG_IMAGE,
    price: "0",
    priceCurrency: "BDT",
    priceValidUntil: offer.validTill || undefined,
    availability: "https://schema.org/InStock",
    seller: { "@type": "Organization", name: offer.shopName },
    areaServed: offer.area ? { "@type": "Place", name: offer.area } : { "@type": "Country", name: "Bangladesh" },
  };
}

// JSON-LD WebSite with a site search action.
export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "OfferMap BD",
    url: APP_BASE,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${APP_BASE}/?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}