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
          Helping you never overpay for the things you love in Dhaka.
        </p>

        <div className="space-y-6 leading-relaxed text-white/70">
          <section>
            <h2 className="mb-2 text-xl font-bold text-white">Our mission</h2>
            <p>
              Discover data shows most shoppers in Dhaka miss out on genuine
              savings because offers are scattered across social media,
              billboards and storefronts. OfferMap BD brings every discount,
              deal and hot offer into one beautiful, location-aware place — so
              you can find the best value around your neighbourhood in seconds.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-bold text-white">How it works</h2>
            <p>
              We curate and verify offers from across Dhaka — restaurants,
              fashion, electronics, salons, grocers and entertainment. Every
              listing includes the discount, validity, area and how to pay. Use
              your location to see what&apos;s nearest, save your favourites,
              and tap working or not working to help the community.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-bold text-white">What we promise</h2>
            <ul className="list-inside space-y-2">
              <li>• Deals that are real, current and clearly described.</li>
              <li>• Transparent payment methods and validity dates.</li>
              <li>• A fast, friendly, phone-first experience.</li>
              <li>• Your data stays private and on your device.</li>
            </ul>
          </section>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat value="30+" label="Live offers" />
          <Stat value="7" label="Areas in Dhaka" />
          <Stat value="7" label="Categories" />
          <Stat value="100%" label="Free to use" />
        </div>
      </main>
    </PageShell>
  );
}