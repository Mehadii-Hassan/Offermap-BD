"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, MapPin, Sun, Moon, Plus, Home as HomeIcon, Map as MapIcon, Info } from "lucide-react";
import { useApp } from "@/lib/app-context";
import { motion } from "framer-motion";
import Chip from "@/components/ui/Chip";
import Button from "@/components/ui/Button";

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
  const [scrolled, setScrolled] = useState(false);

  // Glass bar: transparent at the top, denser once the page scrolls.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 w-full transition-colors duration-300 ${
        scrolled ? "glass-bar-solid" : "glass-bar"
      }`}
    >
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
            <Link
              href="/add"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-tr from-accent-orange to-accent-pink px-4 py-2 text-sm font-bold text-white shadow-lg shadow-accent-pink/30 hover:opacity-90 transition"
            >
              <Plus size={16} /> {t.addOffer}
            </Link>
            <Chip
              onClick={toggleLang}
              aria-label="Toggle language"
              className="rounded-lg px-3 py-2"
            >
              {lang === "en" ? "বাংলা" : "English"}
            </Chip>
            <Button
              variant="ghost"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="h-9 w-9 rounded-lg border border-white/15 bg-white/5 p-0 text-white/80 hover:bg-white/10"
            >
              {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
            </Button>
          </div>
      </div>
    </header>
  );
}