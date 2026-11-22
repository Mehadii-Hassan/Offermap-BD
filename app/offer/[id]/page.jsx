import { notFound } from "next/navigation";
import PageShell from "@/components/PageShell";
import OfferDetailClient from "@/components/OfferDetailClient";
import { getOfferById } from "@/lib/offers";
import { pageMeta, offerJsonLd } from "@/lib/meta";

// Fetch the latest data for every visit so newly approved offers appear.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  let offer = null;
  try {
    offer = await getOfferById(params.id);
  } catch (e) {
    console.error(e);
  }
  if (!offer) return pageMeta({ title: "Offer Not Found", description: "This offer could not be found." });
  const title = `${offer.discountText} at ${offer.shopName} - ${offer.area}, ${offer.district || ""}`;
  const description = `${offer.discountText} at ${offer.shopName}, ${offer.area}, ${offer.district || "Bangladesh"}. ${offer.description}`.slice(0, 160);
  const ogUrl = new URL("/og/image", APP_BASE);
  ogUrl.searchParams.set("title", title);
  if (offer.shopName) ogUrl.searchParams.set("shop", offer.shopName);
  if (offer.area) ogUrl.searchParams.set("area", offer.area);
  if (offer.discountText) ogUrl.searchParams.set("discount", offer.discountText);
  return pageMeta({
    title,
    description,
    path: `/offer/${offer.id}`,
    image: ogUrl.toString(),
  });
}

export default async function OfferPage({ params }) {
  let offer = null;
  try {
    offer = await getOfferById(params.id);
  } catch (e) {
    console.error(e);
  }
  // Expired/unknown offers return a 404 (noindex is unnecessary for a 404).
  if (!offer) notFound();
  const jsonLd = offerJsonLd(offer);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PageShell>
        <OfferDetailClient offer={offer} />
      </PageShell>
    </>
  );
}