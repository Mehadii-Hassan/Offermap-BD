import PageShell from "@/components/PageShell";
import { pageMeta } from "@/lib/meta";

export const metadata = pageMeta({
  title: "Privacy Policy",
  description:
    "Read the OfferMap BD privacy policy to understand how we handle your data. We respect your privacy and keep things simple, transparent and on your device.",
  path: "/privacy",
});

const ADS_ENABLED =
  process.env.NEXT_PUBLIC_ADS_ENABLED === "true" &&
  Boolean(process.env.NEXT_PUBLIC_ADSENSE_CLIENT);

const sections = [
  {
    title: "1. Information we collect",
    body: "OfferMap BD is designed to be privacy-friendly. We do not require an account and we do not sell your personal data. Depending on how you use the app, we may process the following: your rough location (with your permission, used only to sort offers by distance), and content you save on your own device such as saved offers, language and theme preferences.",
  },
  {
    title: "2. Location data",
    body: "When you press the 'Near Me' button, we request your device's location purely to sort offers by how close they are to you. Your location is processed in your browser and is never stored on our servers. If you decline, you can always choose a division and district manually.",
  },
  {
    title: "3. Local storage",
    body: "Saved offers, votes and preferences are stored in your browser's local storage on your device. This data stays with you and can be cleared at any time through your browser settings.",
  },
  {
    title: "4. Third-party services",
    body: "We display OpenStreetMap maps and Unsplash image placeholders. 'Get Directions' opens your default maps app. Share buttons open WhatsApp or Messenger directly on your device. These services have their own privacy policies.",
  },
  {
    title: "4.1 Anonymous visit statistics",
    body: "We count anonymous page views to understand which offers are popular. This uses a random visitor ID stored in your browser and sends only the page you visited, the page you came from, and an approximate country/city derived from your connection. It does not identify you, and we never combine it with your location or any saved content.",
  },
  ...(ADS_ENABLED
    ? [
        {
          title: "5. Advertising",
          body: "We display advertising to keep OfferMap BD free. Ads may set and read cookies to personalise and measure ads. Ad networks follow their own privacy policies. You can control cookies through your browser settings. This policy will be updated to clearly describe ad partners if and when they are added.",
        },
      ]
    : []),
  {
    title: "6. Children's privacy",
    body: "OfferMap BD is not directed at children under 13. We do not knowingly collect personal information from children.",
  },
  {
    title: "7. Changes to this policy",
    body: "We may update this policy from time to time. The latest version will always be available on this page, and we will indicate the date at the top.",
  },
];

export default function PrivacyPage() {
  return (
    <PageShell>
      <main className="mx-auto max-w-3xl px-4 py-12 pb-24 md:pb-12">
        <h1 className="mb-2 text-3xl font-black sm:text-4xl">
          <span className="text-gradient">Privacy Policy</span>
        </h1>
        <p className="mb-8 text-sm text-white/40">
          Last updated: November 2026
        </p>
        <div className="space-y-6 leading-relaxed text-white/70">
          <p>
            Your privacy matters to us. This policy explains, in plain
            language, what we collect, why, and how we keep it simple and safe.
          </p>
          {sections.map((s) => (
            <section key={s.title}>
              <h2 className="mb-1.5 text-lg font-bold text-white">
                {s.title}
              </h2>
              <p>{s.body}</p>
            </section>
          ))}
          <p>
            Questions? Reach us through our{" "}
            <a href="/contact" className="text-accent-pink underline">
              contact page
            </a>
            .
          </p>
        </div>
      </main>
    </PageShell>
  );
}