import PageShell from "@/components/PageShell";
import AddOfferClient from "@/components/AddOfferClient";
import { pageMeta } from "@/lib/meta";

export const metadata = pageMeta({
  title: "Add Offer — Offer Add Koro",
  description:
    "Have a great deal across Bangladesh? Submit your offer to OfferMap BD and it will go live after a quick review.",
  path: "/add",
});

export default function AddOfferPage() {
  return (
    <PageShell>
      <AddOfferClient />
    </PageShell>
  );
}