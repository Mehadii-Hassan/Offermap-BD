import PageShell from "@/components/PageShell";
import ForShopsClient from "@/components/ForShopsClient";
import { pageMeta } from "@/lib/meta";

export const metadata = pageMeta({
  title: "For Shops — List Your Offer Free | OfferMap BD",
  description:
    "Reach deal-loving customers across Bangladesh. List your offer on OfferMap BD for free and get discovered on the map.",
  path: "/for-shops",
});

export default function ForShopsPage() {
  return (
    <PageShell>
      <ForShopsClient />
    </PageShell>
  );
}