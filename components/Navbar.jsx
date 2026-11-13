"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, MapPin, Sun, Moon, Home as HomeIcon, Map as MapIcon, Info } from "lucide-react";
import { useApp } from "@/lib/app-context";
import { motion } from "framer-motion";

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 group">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-tr from-accent-orange via-accent-pink to-accent-purple shadow-lg shadow-accent-pink/30 group-hover:scale-110 transition-transform">
        <MapPin size={18} className="text-white" />
      </span>
      <span className="text-lg font-extrabold tracking-tight">
        OfferMap<span className="text-gradient"> BD</span>
      </span>
    </Link>
  );
}

function navLinks(t, pathname) {
  const items = [
    { href: "/", label: t.navHome, icon: HomeIcon },
    { href: "/#map", label: t.navMap, icon: MapIcon, anchor: true },
    { href: "/saved", label: t.navSaved, icon: Heart },
    { href: "/about", label: t.navAbout, icon: Info },
  ];
  return items.map((item) => ({
    ...item,
    active: pathname === item.href && !item.anchor && !item.hash,
  }));
}

export default function Navbar() {
  const { theme, t, toggleTheme, toggleLang, lang } = useApp();
  const pathname = usePathname() || "/";

  return (
    <header className="sticky top-0 z-40 w-full">
      <div className="glass border-x-0 border-t-0 border-b lg:border-b-0">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Logo />

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {navLinks(t, pathname).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`relative rounded-lg px-3.5 py-2 text-sm font-medium transition ${
                  item.active ? "text-white" : "text-white/60 hover:text-white"
                }`}
              >
                {item.active && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-lg bg-gradient-to-tr from-accent-orange/25 to-accent-purple/25"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative">{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleLang}
              className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10 transition"
              aria-label="Toggle language"
            >
              {lang === "en" ? "বাংলা" : "English"}
            </button>
            <button
              onClick={toggleTheme}
              className="grid h-9 w-9 place-items-center rounded-lg border border-white/15 bg-white/5 text-white/80 hover:bg-white/10 transition"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}