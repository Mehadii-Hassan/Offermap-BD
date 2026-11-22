import PageShell from "@/components/PageShell";
import { pageMeta } from "@/lib/meta";

export const metadata = pageMeta({
  title: "Terms of Use — OfferMap BD",
  description:
    "Terms of use for OfferMap BD. Offers are collected from public sources and should be confirmed with the shop before visiting. Learn about anonymous visit statistics, localStorage, location and Gemini photo scan.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <PageShell>
      <main className="mx-auto max-w-3xl px-4 py-12 pb-24 md:pb-12">
        <h1 className="mb-2 text-3xl font-black sm:text-4xl">
          <span className="text-gradient">Terms of Use</span>
        </h1>
        <p className="mb-8 text-sm text-white/40">
          Last updated: November 2026
        </p>
        <div className="space-y-6 leading-relaxed text-white/70">
          <p>
            Welcome to OfferMap BD. These terms describe what the site does and
            how to use it. By using OfferMap BD you agree to these terms.
          </p>

          <section>
            <h2 className="mb-1.5 text-lg font-bold text-white">1. What we show</h2>
            <p>
              Offers and discounts are collected from public sources such as
              storefronts, social media and shop submissions. Offers may change
              or expire without notice. Always confirm the details with the shop
              before going. If you spot a wrong offer, use the "Report wrong
              offer" action on the offer page.
            </p>
          </section>

          <section>
            <h2 className="mb-1.5 text-lg font-bold text-white">2. Your data</h2>
            <ul className="list-disc pl-5 space-y-2 text-white/70">
              <li>
                <strong>Anonymous visit statistics:</strong> we count anonymous
                page views using a random visitor ID stored in your browser. We
                send only the page you visited, the referrer and an approximate
                country/city derived from your connection. We do not identify
                you.
              </li>
              <li>
                <strong>Saved places and favourites:</strong> saved offers and
                named places are kept in your browser's localStorage on your
                device. They are not sent to our servers.
              </li>
              <li>
                <strong>Location:</strong> your device location is used only in
                your browser to sort offers by distance. It is never stored on
                our servers. You can decline and pick a district manually.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-1.5 text-lg font-bold text-white">3. Maps and photos</h2>
            <ul className="list-disc pl-5 space-y-2 text-white/70">
              <li>
                Maps use OpenStreetMap and Nominatim lookups. These services
                have their own terms and privacy policies.
              </li>
              <li>
                If you upload a photo of an offer, the image is sent to
                Google's Gemini API to extract the discount and shop details.
                Do not upload photos containing personal data.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-1.5 text-lg font-bold text-white">4. Submissions and removals</h2>
            <p>
              Shop owners can submit offers via /add. Submitted offers go live
              after review. If you are a shop owner and want an offer removed or
              corrected, use the "Report wrong offer" action on the offer page
              or contact us via /contact.
            </p>
          </section>

          <section>
            <h2 className="mb-1.5 text-lg font-bold text-white">5. Contact</h2>
            <p>
              Questions or removal requests? Reach us via{" "}
              <a href="/contact" className="text-accent-pink underline">
                /contact
              </a>
              .
            </p>
          </section>
        </div>
      </main>
    </PageShell>
  );
}
