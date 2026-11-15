import { notFound } from "next/navigation";
import PageShell from "@/components/PageShell";
import DistrictOffersView, { findDistrict, findCategoryKey } from "@/components/DistrictOffers";
import { getAllOffers } from "@/lib/offers";
import { getCategory } from "@/lib/categories";
import { pageMeta } from "@/lib/meta";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { district, category } = params || {};
  const d = findDistrict(district);
  if (!d) return pageMeta({ title: "Offers | OfferMap BD", description: "Offers on OfferMap BD" });
  const categoryKey = findCategoryKey(category);
  if (!categoryKey) return pageMeta({ title: "Offers | OfferMap BD", description: "Offers on OfferMap BD" });
  const cat = getCategory(categoryKey);
  let count = 0;
  try {
    const offers = await getAllOffers();
    count = offers.filter((o) => String(o.district || "").toLowerCase() === String(d.name).toLowerCase() && o.category === categoryKey).length;
  } catch (e) { /* keep 0 */ }
  const title = `${cat.en} offers in ${d.name}`;
  const description = `${cat.bn} offers and discounts in ${d.name}, ${d.division}.`;
  // noindex when fewer than 3 real offers.
  return pageMeta({
    title,
    description,
    path: `/offers/${district}/${category}`,
    robots: count >= 3 ? { index: true, follow: true } : { index: false, follow: true },
  });
}

export default async function DistrictCategoryPage({ params }) {
  const { district, category } = params || {};
  const catKey = findCategoryKey(category);
  if (!findDistrict(district) || !catKey) notFound();
  return (
    <PageShell>
      <DistrictOffersView districtSlugValue={district} categoryKey={catKey} />
    </PageShell>
  );
}