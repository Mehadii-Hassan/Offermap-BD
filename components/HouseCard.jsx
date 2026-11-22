"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useApp } from "@/lib/app-context";

// Single tasteful house card shown once per page in the offer feed,
// inviting shop owners to list a free offer. Links to /add.
export default function HouseCard() {
  const { t } = useApp();
  return (
    <Link
      href="/add"
      className="offer-card group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/10 backdrop-blur-md"
    >
      <div className="flex flex-col items-center justify-center p-8 text-center gap-3">
        <Plus size={20} className="text-white/40" />
        <h3 className="text-base font-bold text-white leading-snug">
          {t.houseCardTitle}
        </h3>
        <p className="text-sm text-white/50">{t.houseCardBody}</p>
      </div>
      <div className="mt-auto inline-flex items-center gap-1 rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm font-bold text-white/80 hover:bg-white/10 transition">
        <Plus size={14} /> {t.houseCardCta}
      </div>
    </Link>
  );
}
