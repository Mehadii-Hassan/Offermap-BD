import PageShell from "@/components/PageShell";
import HomeClient from "@/components/HomeClient";
import { pageMeta, APP_BASE } from "@/lib/meta";

const homeOg = new URL("/og/image", APP_BASE);
homeOg.searchParams.set("title", "OfferMap BD — Discover Offers Near You");
homeOg.searchParams.set("discount", "Up to 70% OFF");

export const metadata = pageMeta({
  title: "OfferMap BD — Discover Offers Near You",
  description:
    "Discover discounts, deals and hot offers near your location across Bangladesh. Search by category, division, district and payment method across restaurants, fashion, electronics and more.",
  path: "/",
  image: homeOg.toString(),
});

export default function Home() {
  return (
    <PageShell>
      <HomeClient />
    </PageShell>
  );
}