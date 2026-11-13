"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home as HomeIcon, Map as MapIcon, Heart, Info } from "lucide-react";
import { useApp } from "@/lib/app-context";
import { motion } from "framer-motion";

export default function BottomNav() {
  const { t } = useApp();
  const pathname = usePathname() || "/";

  const items = [
    { href: "/", label: t.navHome, icon: HomeIcon },
    { href: "/#map", label: t.navMap, icon: MapIcon },
    { href: "/saved", label: t.navSaved, icon: Heart },
    { href: "/about", label: t.navAbout, icon: Info },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 md:hidden">
      <div className="glass border-b-0 rounded-t-2xl">
        <div className="mx-auto grid max-w-md grid-cols-4 gap-1 px-2 py-1.5 pb-[max(6px,env(safe-area-inset-bottom))]">
          {items.map((item) => {
            const active =
              pathname === item.href || pathname === item.href.replace("/#map", "");
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`relative flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-[11px] font-medium transition ${
                  active ? "text-white" : "text-white/50 hover:text-white/80"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="bottom-nav-pill"
                    className="absolute inset-0 rounded-xl bg-gradient-to-tr from-accent-orange/30 to-accent-purple/30"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon className="relative" size={19} strokeWidth={active ? 2.4 : 1.8} />
                <span className="relative">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}