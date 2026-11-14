"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Heart,
  MapPin,
  Clock,
  Flame,
  Check,
  Globe,
  Users,
} from "lucide-react";
import { useApp } from "@/lib/app-context";
import { formatDistance } from "@/lib/offers";
import Countdown from "./Countdown";
import OfferImage from "./OfferImage";
import { getSavedIds, toggleSavedId } from "@/lib/storage";

export function isEndingSoon(offer) {
  if (offer.isOngoing) return false;
  const diff = new Date(offer.validTill).getTime() - Date.now();
  return diff > 0 && diff < 4 * 86400000; // within 4 days
}

export default function OfferCard({
  offer,
  index = 0,
  distanceKm,
  onFirstSave = () => {},
}) {
  const { t } = useApp();
  const [saved, setSaved] = useState(
    () => typeof window !== "undefined" && getSavedIds().includes(String(offer.id))
  );
  const ending = isEndingSoon(offer);
  const showingHeartPop = saved;

  function handleSave(e) {
    e.preventDefault();
    e.stopPropagation();
    const wasSaved = saved;
    toggleSavedId(offer.id);
    setSaved(!wasSaved);
    if (!wasSaved) onFirstSave(offer);
  }

  // Source badge: scraper → "Auto-collected", else "Submitted by community"
  const isScraped = offer.source === "scraper";
  const sourceLabel = isScraped ? t.autoCollected : t.submittedByCommunity;
  const SourceIcon = isScraped ? Globe : Users;

  return (
    <Link href={`/offer/${offer.id}`} data-mouse="true">
      <motion.article
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: Math.min(index * 0.05, 0.6), duration: 0.4 }}
        whileHover={{ y: -6 }}
        className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md glow-hover"
      >
        {/* Image */}
        <div className="relative h-44 w-full overflow-hidden">
          <OfferImage
            offer={offer}
            urlClassName="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            placeholderClassName="h-full w-full"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

          {/* Discount badge */}
          <div className="absolute left-3 top-3">
            <span className="rounded-xl bg-gradient-to-tr from-accent-orange to-accent-pink px-3 py-1.5 text-sm font-extrabold text-white shadow-lg shadow-accent-pink/40">
              {offer.discountText}
            </span>
          </div>

          {/* Save button */}
          <button
            onClick={handleSave}
            aria-label={saved ? t.saved : t.save}
            className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-black/40 backdrop-blur transition hover:bg-black/60"
          >
            <motion.span
              key={saved ? "saved" : "unsaved"}
              initial={showingHeartPop ? { scale: 0.5 } : false}
              animate={{ scale: 1.15 }}
              transition={{ type: "spring", stiffness: 500, damping: 15 }}
            >
              <Heart
                size={18}
                className={
                  saved
                    ? "fill-accent-pink text-accent-pink"
                    : "text-white/80"
                }
              />
            </motion.span>
          </button>

          {/* Ending soon chip / Ongoing badge */}
          {offer.isOngoing ? (
            <div className="absolute bottom-3 left-3">
              <span className="inline-flex items-center gap-1 rounded-md bg-purple-500/80 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
                {t.ongoing}
              </span>
            </div>
          ) : ending ? (
            <div className="absolute bottom-3 left-3">
              <span className="inline-flex items-center gap-1 rounded-md bg-red-500/80 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                {t.endingSoonBadge}
              </span>
            </div>
          ) : null}

          {/* Source badge chip */}
          <div className="absolute bottom-3 right-3">
            <span className="inline-flex items-center gap-1 rounded-md bg-black/50 backdrop-blur px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
              <SourceIcon size={11} /> {sourceLabel}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col gap-2 p-4">
          <div className="flex items-center gap-1.5 text-xs text-white/50">
            <MapPin size={13} />
            <span>{offer.area}</span>
            {distanceKm != null && (
              <>
                <span>·</span>
                <span className="font-semibold text-white/70">
                  {formatDistance(distanceKm)}
                </span>
              </>
            )}
          </div>

          <h3 className="line-clamp-2 font-bold leading-snug text-white group-hover:text-white/90">
            {offer.title}
          </h3>

          <p className="text-xs text-white/40">{offer.shopName}</p>

          <div className="mt-auto flex items-center justify-between pt-2">
            <div className="flex items-center gap-2 text-xs">
              {offer.isOngoing ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-purple-500/20 px-2 py-1 font-semibold text-purple-200" title={t.endDateNotConfirmed}>
                  <Clock size={12} />
                  {t.ongoing}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/20 px-2 py-1 font-semibold text-emerald-200">
                  <Clock size={12} />
                  <Countdown validTill={offer.validTill} compact />
                </span>
              )}
              {offer.viewsToday != null && (
                <span className="inline-flex items-center gap-1 text-white/40">
                  <Flame size={12} className="text-accent-orange" />
                  {offer.viewsToday}
                </span>
              )}
            </div>
            <span className="text-gradient text-sm font-extrabold">{t.open} →</span>
          </div>
        </div>

        {/* Featured glowing badge strip */}
        {offer.isFeatured && (
          <div className="absolute right-0 top-0 rounded-bl-xl bg-gradient-to-l from-accent-purple to-accent-pink px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-lg shadow-accent-purple/50">
            <span className="inline-flex items-center gap-1">
              <Check size={11} /> {t.featured}
            </span>
          </div>
        )}
      </motion.article>
    </Link>
  );
}