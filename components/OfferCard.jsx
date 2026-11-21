"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
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
import { formatDistance, nearestOutlet } from "@/lib/offers";
import Countdown, { timeLeft } from "./Countdown";
import OfferImage from "./OfferImage";
import PrecisionBadge from "./PrecisionBadge";
import { getPrecision } from "@/lib/precision";
import { getSavedIds, toggleSavedId } from "@/lib/storage";

export function isEndingSoon(offer) {
  if (offer.isOngoing) return false;
  const diff = new Date(offer.validTill).getTime() - Date.now();
  return diff > 0 && diff < 4 * 86400000; // within 4 days
}

// Hydration-safe wrapper: returns false on the server and the first client
// render, then the real value after mount (Date.now() differs between the two
// renders, which would otherwise flip the badge and cause a mismatch).
function useEndingSoon(offer) {
  const [ending, setEnding] = useState(false);
  useEffect(() => {
    setEnding(isEndingSoon(offer));
  }, [offer]);
  return ending;
}

// Under 24 hours left -> the time chip turns urgent.
function useUrgent(offer) {
  const [urgent, setUrgent] = useState(false);
  useEffect(() => {
    if (offer.isOngoing) {
      setUrgent(false);
      return;
    }
    setUrgent(timeLeft(offer.validTill) < 86400000);
  }, [offer]);
  return urgent;
}

export default function OfferCard({
  offer,
  index = 0,
  distanceKm,
  userCoords,
  onFirstSave = () => {},
}) {
  const { t } = useApp();
  const reduce = useReducedMotion();
  const outlets = Array.isArray(offer.outlets) ? offer.outlets : [];
  const nearest =
    userCoords && outlets.length
      ? nearestOutlet(offer, userCoords.lat, userCoords.lng)
      : null;
  const areaLabel = (o) => {
    if (getPrecision(o) === "district" && o.district) return `${t.precisionDistrict}: ${o.district}`;
    if (o.area && o.area !== "Bangladesh") return o.area;
    if (o.district) return o.district;
    return o.division || "Bangladesh";
  };
  const [saved, setSaved] = useState(
    () => typeof window !== "undefined" && getSavedIds().includes(String(offer.id))
  );
  const ending = useEndingSoon(offer);
  const urgent = useUrgent(offer);
  const showingHeartPop = saved;

  function handleSave(e) {
    e.preventDefault();
    e.stopPropagation();
    const wasSaved = saved;
    toggleSavedId(offer.id);
    setSaved(!wasSaved);
    if (!wasSaved) onFirstSave(offer);
  }

  // Source badge: scraper -> "Auto-collected", else "Submitted by community"
  const isScraped = offer.source === "scraper";
  const sourceLabel = isScraped ? t.autoCollected : t.submittedByCommunity;
  const SourceIcon = isScraped ? Globe : Users;

  return (
    <Link href={`/offer/${offer.id}`} data-mouse="true" className="block h-full">
      <motion.article
        initial={reduce ? false : { opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={
          reduce
            ? { duration: 0 }
            : { delay: Math.min(index * 0.05, 0.6), duration: 0.4 }
        }
        whileHover={reduce ? undefined : { y: -6 }}
        className="offer-card group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md glow-hover"
      >
        {/* Image */}
        <div className="relative w-full">
          <OfferImage offer={offer} placeholderClassName="h-full w-full" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />

          {/* Discount badge on the image */}
          <div className="absolute left-3 top-3">
            <span className="rounded-xl bg-gradient-to-tr from-accent-orange to-accent-pink px-3 py-1.5 text-sm font-extrabold text-white shadow-lg shadow-accent-pink/40">
              {offer.discountText}
            </span>
          </div>

          {/* Save button with a spring heart */}
          <button
            onClick={handleSave}
            aria-label={saved ? t.saved : t.save}
            className="absolute right-2.5 top-2.5 grid h-11 w-11 place-items-center rounded-full bg-black/40 backdrop-blur transition hover:bg-black/60 active:scale-90"
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
                  saved ? "fill-accent-pink text-accent-pink" : "text-white/80"
                }
              />
            </motion.span>
          </button>

          {/* Time-left / Ongoing chip */}
          <div className="absolute bottom-3 left-3 flex flex-wrap items-center gap-1.5">
            {offer.isOngoing ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-purple-500/85 px-2 py-1 text-[11px] font-bold text-white">
                <Clock size={11} /> {t.ongoing}
              </span>
            ) : ending ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-red-500/90 px-2 py-1 text-[11px] font-bold text-white">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                {t.endingSoonBadge}
              </span>
            ) : (
              <span
                className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-bold ${
                  urgent
                    ? "bg-red-500/90 text-white"
                    : "bg-black/55 text-white backdrop-blur"
                }`}
              >
                <Clock size={11} />
                <Countdown validTill={offer.validTill} compact />
              </span>
            )}
          </div>

          {/* Source badge chip (kept, smaller and tidier) */}
          <div className="absolute bottom-3 right-3">
            <span className="inline-flex items-center gap-1 rounded-md bg-black/55 px-1.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white backdrop-blur">
              <SourceIcon size={10} /> {sourceLabel}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col gap-1.5 p-4">
          <h3 className="line-clamp-2 text-[15px] font-bold leading-snug text-white">
            {offer.shopName}
          </h3>

          <div className="flex min-w-0 items-center gap-1 text-xs text-white/50">
            <MapPin size={13} className="shrink-0" />
            <span className="truncate">{areaLabel(offer)}</span>
            {distanceKm != null && (
              <>
                <span className="shrink-0">·</span>
                <span className="shrink-0 font-semibold text-white/70">
                  {formatDistance(distanceKm)}
                </span>
              </>
            )}
          </div>

          {outlets.length > 0 && nearest && (
            <div className="flex items-center gap-1 text-[11px] text-emerald-300/90">
              <MapPin size={11} className="shrink-0" />
              <span className="truncate">
                {t.nearestOutlet}: {nearest.area || t.outlet} · {formatDistance(nearest.distanceKm)}
              </span>
              <span className="ml-auto shrink-0 rounded-md bg-emerald-500/15 px-1.5 py-0.5 font-semibold text-emerald-200">
                {outlets.length} {t.outlets}
              </span>
            </div>
          )}
          {outlets.length > 0 && !nearest && (
            <div className="flex items-center gap-1 text-[11px] text-emerald-300/90">
              <MapPin size={11} className="shrink-0" />
              <span className="truncate">{t.outlets}</span>
              <span className="ml-auto shrink-0 rounded-md bg-emerald-500/15 px-1.5 py-0.5 font-semibold text-emerald-200">
                {outlets.length}
              </span>
            </div>
          )}

          <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
            <PrecisionBadge offer={offer} />
            {offer.viewsToday != null && (
              <span className="inline-flex items-center gap-1 text-[11px] text-white/40">
                <Flame size={11} className="text-accent-orange" />
                {offer.viewsToday}
              </span>
            )}
            <span className="text-gradient ml-auto text-sm font-extrabold">
              {t.open}
            </span>
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