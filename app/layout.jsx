import "./globals.css";
import { AppProvider } from "@/lib/app-context";

export const metadata = {
  title: {
    default: "OfferMap BD — Discover Offers Near You",
    template: "%s | OfferMap BD",
  },
  description:
    "Discover discounts, deals and hot offers near your location across Bangladesh. Search by category, division, district and payment method across restaurants, fashion, electronics and more.",
  keywords:
    "offers, discounts, deals, Bangladesh, Dhaka, BOGO, cashback, restaurant offers, fashion deals",
  openGraph: {
    title: "OfferMap BD — Discover Offers Near You",
    description:
      "The fastest way to find discounts, deals and hot offers around your neighbourhood across Bangladesh.",
    type: "website",
    locale: "en_US",
    siteName: "OfferMap BD",
  },
  twitter: {
    card: "summary_large_image",
    title: "OfferMap BD — Discover Offers Near You",
    description:
      "Find discounts, deals and hot offers around your neighbourhood across Bangladesh.",
  },
  robots: {
    index: true,
    follow: true,
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}