"use client";

import Link from "next/link";
import { Check, Plus } from "lucide-react";
import { useApp } from "@/lib/app-context";

export default function ForShopsClient() {
  const { t } = useApp();
  const steps = [t.forShopsStep1, t.forShopsStep2, t.forShopsStep3];
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <div className="text-center">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-tr from-accent-orange via-accent-pink to-accent-purple">
          <Plus size={30} className="text-white" />
        </div>
        <h1 className="text-3xl font-black sm:text-4xl">{t.forShopsTitle}</h1>
        <p className="mx-auto mt-3 max-w-xl text-white/60">{t.forShopsTagline}</p>
        <p className="mt-2 text-sm font-semibold text-emerald-300">{t.forShopsFree}</p>
      </div>

      <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="mb-4 text-lg font-bold">{t.forShopsHow}</h2>
        <ol className="space-y-3">
          {steps.map((s, i) => (
            <li key={i} className="flex items-center gap-3 text-white/70">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-tr from-accent-orange to-accent-purple text-xs font-bold text-white">
                {i + 1}
              </span>
              {s}
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Link
          href="/add"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-tr from-accent-orange to-accent-pink px-6 py-3 font-bold text-white shadow-lg shadow-accent-pink/30 hover:opacity-90 transition"
        >
          <Plus size={18} /> {t.forShopsCta}
        </Link>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(
            "Found some great offers on OfferMap BD — check it out! https://offermap-bd.example.com"
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-6 py-3 font-bold text-emerald-200 hover:bg-emerald-500/25 transition"
        >
          <Check size={18} /> {t.forShopsShare}
        </a>
      </div>
    </main>
  );
}