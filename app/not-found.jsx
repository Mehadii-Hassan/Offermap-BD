import Link from "next/link";
import PageShell from "@/components/PageShell";
import { pageMeta } from "@/lib/meta";

export const metadata = pageMeta({
  title: "Page Not Found",
  description:
    "The page you are looking for could not be found. Explore live offers across Dhaka on OfferMap BD instead.",
  path: "/404",
});

export default function NotFound() {
  return (
    <PageShell>
      <main className="mx-auto flex max-w-3xl flex-col items-center justify-center px-4 py-24 text-center">
        <div className="text-gradient text-7xl font-black sm:text-8xl">404</div>
        <h1 className="mt-4 text-2xl font-bold sm:text-3xl">
          Oops! This deal got away.
        </h1>
        <p className="mt-3 max-w-md text-white/50">
          The page you&apos;re looking for doesn&apos;t exist or may have
          expired. No worries — plenty more great offers await in Dhaka.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex items-center rounded-xl bg-gradient-to-tr from-accent-orange to-accent-pink px-6 py-3.5 font-bold text-white shadow-lg shadow-accent-pink/30 hover:opacity-90 transition"
        >
          ← Back to all deals
        </Link>
      </main>
    </PageShell>
  );
}