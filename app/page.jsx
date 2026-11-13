import PageShell from "@/components/PageShell";
import HomeClient from "@/components/HomeClient";
import { pageMeta } from "@/lib/meta";

export const metadata = pageMeta({
  title: "OfferMap BD — Discover Offers Near You in Dhaka",
  description:
    "Discover discounts, deals and hot offers near your location in Dhaka. Search by category, area and payment method across restaurants, fashion, electronics and more.",
  path: "/",
});

export default function Home() {
  return (
    <PageShell>
      <HomeClient />
    </PageShell>
  );
}