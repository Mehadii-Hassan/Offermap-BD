import { notFound } from "next/navigation";
import PageShell from "@/components/PageShell";
import DistrictOffersView, { findDistrict } from "@/components/DistrictOffers";
import { getAllOffers } from "@/lib/offers";
import { pageMeta, APP_BASE } from "@/lib/meta";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { district } = params || {};
  const d = findDistrict(district);
  if (!d) return pageMeta({ title: "Offers | OfferMap BD", description: "Offers on OfferMap BD" });
  let count = 0;
  try {
    const offers = await getAllOffers();
    count = offers.filter((o) => String(o.district || "").toLowerCase() === String(d.name).toLowerCase()).length;
  } catch (e) { /* keep 0 */ }
  const title = `offers in ${d.name}`;
  const description = `Offers and discounts in ${d.name}, ${d.division}, Bangladesh.`;
  const ogUrl = new URL("/og/image", APP_BASE);
  ogUrl.searchParams.set("title", title);
  ogUrl.searchParams.set("area", d.name);
  return pageMeta({
    title,
    description,
    path: `/offers/${district}`,
    image: ogUrl.toString(),
    robots: count >= 3 ? { index: true, follow: true } : { index: false, follow: true },
  });
}

export default async function DistrictPage({ params }) {
  const { district } = params || {};
  if (!findDistrict(district)) notFound();
  return (
    <PageShell>
      <DistrictOffersView districtSlugValue={district} categoryKey={null} />
    </PageShell>
  );
}