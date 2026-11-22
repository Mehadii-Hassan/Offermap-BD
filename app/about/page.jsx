import PageShell from "@/components/PageShell";
import { pageMeta } from "@/lib/meta";

export const metadata = pageMeta({
  title: "About OfferMap BD",
  description:
    "OfferMap BD helps people in Bangladesh discover the best discounts and offers near their location. Learn about our mission and how we choose the deals we show.",
  path: "/about",
});

function Stat({ value, label }) {
  return (
    <div className="glass rounded-2xl p-5 text-center">
      <div className="text-gradient text-3xl font-black">{value}</div>
      <div className="mt-1 text-sm text-white/50">{label}</div>
    </div>
  );
}

export default function AboutPage() {
  return (
    <PageShell>
      <main className="mx-auto max-w-3xl px-4 py-12 pb-24 md:pb-12">
        <h1 className="mb-2 text-3xl font-black sm:text-4xl">
          About <span className="text-gradient">OfferMap BD</span>
        </h1>
        <p className="mb-8 text-white/50">
          Helping you never overpay for the things you love in Bangladesh.
        </p>

        <div className="space-y-6 leading-relaxed text-white/70">
          <section>
            <h2 className="mb-2 text-xl font-bold text-white">Our mission</h2>
            <p>
              Shoppers in Bangladesh miss out on genuine savings because offers
              are scattered across social media, billboards and storefronts.
              OfferMap BD brings every discount, deal and hot offer into one
              location-aware place — so you can find the best value around your
              neighbourhood in seconds.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-bold text-white">How it works</h2>
            <p>
              Offers are collected from public sources and submitted by shops.
              Every listing includes the discount, validity, area and how to pay.
              Use your location to see what&apos;s nearest, save your favourites,
              and tap working or not working to help the community. Offers may
              change or expire — always confirm with the shop before going.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-bold text-white">Your data</h2>
            <p>
              We count anonymous page views to understand what&apos;s popular. We
              never identify you. Saved offers and places stay in your
              browser&apos;s localStorage on your device. Your location is used
              only in your browser to sort offers by distance — it is never
              stored on our servers. Maps use OpenStreetMap/Nominatim lookups,
              and offer photos may be sent to Google&apos;s Gemini API to
              extract discount details.
            </p>
          </section>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat value="100%" label="Free to use" />
        </div>
      </main>
    </PageShell>
  );
}