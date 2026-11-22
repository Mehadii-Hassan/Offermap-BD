import PageShell from "@/components/PageShell";
import { pageMeta } from "@/lib/meta";

const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "";
const FACEBOOK_URL = process.env.NEXT_PUBLIC_FACEBOOK_URL || "";

export const metadata = pageMeta({
  title: "Contact Us",
  description:
    "Get in touch with the OfferMap BD team. Send us offers, report an issue, or partner with us to feature your business in Bangladesh.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <PageShell>
      <main className="mx-auto max-w-3xl px-4 py-12 pb-24 md:pb-12">
        <h1 className="mb-2 text-3xl font-black sm:text-4xl">
          <span className="text-gradient">Contact Us</span>
        </h1>
        <p className="mb-8 text-white/50">
          We&apos;d love to hear from you — whether it&apos;s a great offer,
          a bug, or a partnership idea.
        </p>

        {CONTACT_EMAIL ? (
          <div className="space-y-6">
            <form
              action={`mailto:${CONTACT_EMAIL}`}
              method="post"
              encType="text/plain"
              className="glass space-y-4 rounded-2xl p-6"
            >
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-white/70">
                  Your name
                </span>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="e.g. Rahim"
                  className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder-white/30 focus:border-accent-purple"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-white/70">
                  Your email
                </span>
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder-white/30 focus:border-accent-purple"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-white/70">
                  Message
                </span>
                <textarea
                  name="message"
                  required
                  rows={5}
                  placeholder="Tell us what's on your mind..."
                  className="w-full resize-none rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder-white/30 focus:border-accent-purple"
                />
              </label>

              <button
                type="submit"
                className="w-full rounded-xl bg-gradient-to-tr from-accent-orange to-accent-pink px-5 py-3.5 font-bold text-white shadow-lg shadow-accent-pink/30 hover:opacity-90 transition sm:w-auto sm:px-8"
              >
                Send message
              </button>
            </form>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="glass rounded-2xl p-5">
                <h3 className="font-bold text-white">Business / offers</h3>
                <p className="mt-1 text-sm text-white/50">
                  Want to feature your business? Send your offer details and we
                  will review and add it.
                </p>
              </div>
              <div className="glass rounded-2xl p-5">
                <h3 className="font-bold text-white">General</h3>
                <p className="mt-1 text-sm text-white/50">
                  {CONTACT_EMAIL} — we reply within 2 business days.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="glass rounded-2xl p-6 text-center text-white/70">
            <p>Contact email is not configured. Please check back later.</p>
          </div>
        )}
      </main>
    </PageShell>
  );
}