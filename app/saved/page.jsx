import PageShell from "@/components/PageShell";
import SavedClient from "@/components/SavedClient";
import { pageMeta } from "@/lib/meta";

export const metadata = pageMeta({
  title: "Saved Offers",
  description:
    "View the offers you saved for later on OfferMap BD. Keep your favourite deals in Dhaka close at hand.",
  path: "/saved",
});

export default function SavedPage() {
  return (
    <PageShell>
      <SavedClient />
    </PageShell>
  );
}