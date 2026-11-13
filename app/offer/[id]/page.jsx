import { notFound } from "next/navigation";
import PageShell from "@/components/PageShell";
import OfferDetailClient from "@/components/OfferDetailClient";
import { getOfferById } from "@/lib/offers";
import { pageMeta } from "@/lib/meta";

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
  return pageMeta({
    title: `${offer.title} at ${offer.shopName}`,
    description: `${offer.discountText} at ${offer.shopName}, ${offer.area}. ${offer.description}`,
    path: `/offer/${offer.id}`,
    image: offer.image,
  });
}

export default async function OfferPage({ params }) {
  let offer = null;
  try {
    offer = await getOfferById(params.id);
  } catch (e) {
    console.error(e);
  }
  if (!offer) notFound();

  return (
    <PageShell>
      <OfferDetailClient offer={offer} />
    </PageShell>
  );
}