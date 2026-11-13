import { notFound } from "next/navigation";
import PageShell from "@/components/PageShell";
import OfferDetailClient from "@/components/OfferDetailClient";
import { getAllOffers, getOfferById } from "@/lib/offers";
import { pageMeta } from "@/lib/meta";

export function generateStaticParams() {
  return getAllOffers().map((o) => ({ id: String(o.id) }));
}

export async function generateMetadata({ params }) {
  const offer = getOfferById(params.id);
  if (!offer) return pageMeta({ title: "Offer Not Found", description: "This offer could not be found." });
  return pageMeta({
    title: `${offer.title} at ${offer.shopName}`,
    description: `${offer.discountText} at ${offer.shopName}, ${offer.area}. ${offer.description}`,
    path: `/offer/${offer.id}`,
    image: offer.image,
  });
}

export default function OfferPage({ params }) {
  const offer = getOfferById(params.id);
  if (!offer) notFound();

  return (
    <PageShell>
      <OfferDetailClient offer={offer} />
    </PageShell>
  );
}