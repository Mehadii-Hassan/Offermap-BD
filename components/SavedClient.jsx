"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Heart, ArrowRight } from "lucide-react";
import OfferCard from "./OfferCard";
import { useApp } from "@/lib/app-context";
import { getAllOffers } from "@/lib/offers";
import { getSavedIds } from "@/lib/storage";
import { GridSkeleton } from "./Skeletons";

export default function SavedClient() {
  const { t } = useApp();
  const [loading, setLoading] = useState(true);
  const [savedOffers, setSavedOffers] = useState([]);

  useEffect(() => {
    let active = true;
    const ids = typeof window !== "undefined" ? getSavedIds() : [];
    getAllOffers()
      .then((offers) => {
        if (!active) return;
        setSavedOffers(offers.filter((o) => ids.includes(String(o.id))));
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 pb-24 md:pb-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex items-center gap-3"
      >
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-tr from-accent-pink to-accent-purple">
          <Heart size={22} className="fill-white text-white" />
        </span>
        <div>
          <h1 className="text-2xl font-black">{t.savedTitle}</h1>
          <p className="text-sm text-white/50">
            {savedOffers.length} {t.results}
          </p>
        </div>
      </motion.div>

      {loading ? (
        <GridSkeleton count={3} />
      ) : savedOffers.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-white/15 bg-white/5 px-6 py-20 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-tr from-accent-pink/30 to-accent-purple/30">
            <Heart size={30} className="text-white/50" />
          </div>
          <h2 className="text-xl font-bold">{t.savedEmptyTitle}</h2>
          <p className="max-w-md text-sm text-white/50">{t.savedEmptyText}</p>
          <Link
            href="/"
            className="mt-2 inline-flex items-center gap-2 rounded-xl bg-gradient-to-tr from-accent-orange to-accent-pink px-5 py-3 font-bold text-white shadow-lg shadow-accent-pink/30 hover:opacity-90 transition"
          >
            {t.browseOffers} <ArrowRight size={16} />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {savedOffers.map((o, i) => (
            <OfferCard key={o.id} offer={o} index={i} />
          ))}
        </div>
      )}
    </main>
  );
}