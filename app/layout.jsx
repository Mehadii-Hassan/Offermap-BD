import "./globals.css";
import { Plus_Jakarta_Sans, Hind_Siliguri } from "next/font/google";
import { AppProvider } from "@/lib/app-context";
import VisitTracker from "@/components/VisitTracker";
import ErrorMonitor from "@/components/ErrorMonitor";
import { APP_BASE, DEFAULT_OG_IMAGE, websiteJsonLd } from "@/lib/meta";

// Self-hosted (next/font) Latin + Bangla fonts. The Latin font is first in the
// font-family fallback; Bengali glyphs render in Hind Siliguri. When the toggle
// is বাংলা, globals.css puts Hind Siliguri first.
const latin = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-latin",
  display: "swap",
});

const bangla = Hind_Siliguri({
  subsets: ["bengali", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-bangla",
  display: "swap",
});

const gsc = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;

export const metadata = {
  metadataBase: new URL(APP_BASE),
  title: {
    default: "OfferMap BD — Discover Offers Near You",
    template: "%s | OfferMap BD",
  },
  description:
    "Discover discounts, deals and hot offers near your location across Bangladesh. Search by category, division, district and payment method across restaurants, fashion, electronics and more.",
  keywords:
    "offers, discounts, deals, Bangladesh, Dhaka, BOGO, cashback, restaurant offers, fashion deals, অফার, ডিসকাউন্ট, ডিল, বাংলাদেশ, ঢাকা, ক্যাশব্যাক, রেস্টুরেন্ট অফার, ফ্যাশন ডিল",
  openGraph: {
    title: "OfferMap BD — Discover Offers Near You",
    description:
      "The fastest way to find discounts, deals and hot offers around your neighbourhood across Bangladesh.",
    type: "website",
    locale: "en_US",
    url: APP_BASE,
    siteName: "OfferMap BD",
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "OfferMap BD — Discover Offers Near You",
    description:
      "Find discounts, deals and hot offers around your neighbourhood across Bangladesh.",
    image: DEFAULT_OG_IMAGE,
  },
  robots: {
    index: true,
    follow: true,
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon.svg",
    apple: "/icons/icon-180.png",
  },
  verification: gsc ? { google: gsc } : undefined,
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`dark ${latin.variable} ${bangla.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd()) }}
        />
      </head>
      <body>
        <AppProvider>{children}</AppProvider>
        <VisitTracker />
        <ErrorMonitor />
      </body>
    </html>
  );
}