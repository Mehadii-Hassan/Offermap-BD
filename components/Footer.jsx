"use client";

import Link from "next/link";
import { MapPin, Mail, Share2 } from "lucide-react";
import { useApp } from "@/lib/app-context";

const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "";
const FACEBOOK_URL = process.env.NEXT_PUBLIC_FACEBOOK_URL || "";

export default function Footer() {
  const { t } = useApp();

  const links = [
    { href: "/", label: t.navHome },
    { href: "/saved", label: t.navSaved },
    { href: "/about", label: t.navAbout },
    { href: "/contact", label: t.contactTitle },
    { href: "/for-shops", label: t.forShops },
  ];
  const legal = [
    { href: "/privacy", label: t.privacyTitle },
    { href: "/about", label: t.aboutTitle },
    { href: "/terms", label: t.termsTitle },
  ];
  const contact = [];
  if (CONTACT_EMAIL) contact.push({ href: `mailto:${CONTACT_EMAIL}`, label: CONTACT_EMAIL, icon: <Mail size={16} /> });
  if (FACEBOOK_URL) contact.push({ href: FACEBOOK_URL, label: t.facebookPage, icon: <Share2 size={16} /> });
  const locations = [
    { href: "/offers/dhaka", label: "Dhaka" },
    { href: "/offers/chattogram", label: "Chattogram" },
    { href: "/offers/sylhet", label: "Sylhet" },
    { href: "/offers/khulna", label: "Khulna" },
    { href: "/offers/rajshahi", label: "Rajshahi" },
    { href: "/offers/dhaka/restaurant", label: "Restaurant" },
  ];

  return (
    <footer className="mt-10 border-t border-white/10 py-10 pb-24 md:pb-10">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-tr from-accent-orange via-accent-pink to-accent-purple">
              <MapPin size={18} className="text-white" />
            </span>
            <span className="text-lg font-extrabold">
              OfferMap<span className="text-gradient"> BD</span>
            </span>
          </div>
          <p className="mt-3 max-w-sm text-sm text-white/50">{t.tagline}</p>
        </div>

        <div>
          <h4 className="font-semibold text-white/80">{t.links}</h4>
          <ul className="mt-3 space-y-2 text-sm text-white/50">
            {links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="hover:text-white transition">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-white/80">{t.legal}</h4>
          <ul className="mt-3 space-y-2 text-sm text-white/50">
            {legal.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="hover:text-white transition">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-xs text-white/30">{t.madeIn} 🇧🇩</p>
        </div>

        <div>
          <h4 className="font-semibold text-white/80">Offers</h4>
          <ul className="mt-3 space-y-2 text-sm text-white/50">
            {locations.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="hover:text-white transition">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {contact.length > 0 && (
          <div>
            <h4 className="font-semibold text-white/80">{t.contact}</h4>
            <ul className="mt-3 space-y-2 text-sm text-white/50">
              {contact.map((c) => (
                <li key={c.href} className="flex items-center gap-2">
                  {c.icon}
                  <Link
                    href={c.href}
                    target={c.href.startsWith("http") ? "_blank" : undefined}
                    rel="noopener noreferrer"
                    className="hover:text-white transition"
                  >
                    {c.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div className="mx-auto mt-8 max-w-6xl border-t border-white/5 px-4 pt-6 text-center text-xs text-white/30">
        © {new Date().getFullYear()} OfferMap BD. {t.rights}
      </div>
    </footer>
  );
}