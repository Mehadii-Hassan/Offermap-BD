import PageShell from "@/components/PageShell";
import AdminClient from "@/components/AdminClient";

export const metadata = {
  title: "Admin Panel | OfferMap BD",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminPage() {
  return (
    <PageShell>
      <AdminClient />
    </PageShell>
  );
}