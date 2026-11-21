"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { duration } from "@/lib/motion";
import { Search, LocateFixed, MapPin, Plus } from "lucide-react";
import { useApp } from "@/lib/app-context";
import { DIVISIONS } from "@/lib/offers";
import LocationSheet from "./LocationSheet";

export default function Hero({ onSearch, onNearMe, onManualLocation, placeLabel, nearbyCount }) {
  const { t } = useApp();
  const [query, setQuery] = useState("");
  const [locating, setLocating] = useState(false);
  const [status, setStatus] = useState(null); // "success" | "denied"
  const [statusMsg, setStatusMsg] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);

  function submit(e) {
    e.preventDefault();
    onSearch(query);
  }

  function askPosition(opts) {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, opts);
    });
  }

  function showDeniedMessage() {
    const ua = navigator.userAgent || "";
    let steps = t.permissionDeniedSteps;
    if (/Android/i.test(ua)) steps = t.permissionDeniedStepsAndroid;
    else if (/iPhone|iPad|iOS/i.test(ua)) steps = t.permissionDeniedStepsIOS;
    else if (!/Mobi/i.test(ua)) steps = t.permissionDeniedStepsDesktop;
    setStatus("denied");
    setStatusMsg(`${t.permissionDenied}\n${steps.map((s) => "• " + s).join("\n")}`);
  }

  async function handleNearMe() {
    setLocating(true);
    setStatus(null);
    setStatusMsg("");
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setLocating(false);
      setStatus("denied");
      setStatusMsg(t.positionUnavailable);
      return;
    }
    // If permission is already denied, never call again — show steps + fallbacks.
    try {
      if ("permissions" in navigator) {
        const perm = await navigator.permissions.query({ name: "geolocation" });
        if (perm.state === "denied") {
          setLocating(false);
          showDeniedMessage();
          return;
        }
      }
    } catch (e) { /* permissions.query not supported — proceed */ }

    try {
      // 1st attempt: coarse accuracy, fast.
      let pos;
      try {
        pos = await askPosition({ enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 });
      } catch (e) {
        // 2nd attempt: high accuracy, longer timeout.
        pos = await askPosition({ enableHighAccuracy: true, timeout: 15000 });
      }
      setLocating(false);
      setStatus("success");
      setStatusMsg("");
      onNearMe({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    } catch (e) {
      setLocating(false);
      const code = e && e.code;
      if (code === 1) {
        showDeniedMessage();
      } else {
        setStatus("denied");
        setStatusMsg(code === 2 ? t.positionUnavailable : t.timeout);
      }
    }
  }

  // K1: approximate location from the network via /api/geo (Vercel headers).
  async function handleApproximate() {
    setLocating(true);
    setStatus(null);
    setStatusMsg("");
    try {
      const res = await fetch("/api/geo");
      const data = await res.json();
      if (data && data.lat != null && data.lng != null) {
        setLocating(false);
        setStatus("success");
        onNearMe({ lat: data.lat, lng: data.lng });
      } else {
        setLocating(false);
        setStatus("denied");
        setStatusMsg(t.approximateLocation);
      }
    } catch {
      setLocating(false);
      setStatus("denied");
      setStatusMsg(t.approximateLocation);
    }
  }

  // K1: pick a place by name (Nominatim, Bangladesh-bounded).
  function handlePickPlace(coords) {
    if (coords && coords.lat != null) onNearMe(coords);
  }

  // K1: Division > District picker that really applies the location.
  function handlePickDivision(divName, distName) {
    const div = DIVISIONS.find((d) => d.name === divName);
    const dist = div?.districts?.find((d) => d.name === distName) || div?.districts?.[0];
    if (!dist) return;
    onManualLocation?.({ lat: dist.lat, lng: dist.lng, name: distName });
  }

  return (
    <section className="relative overflow-hidden">
      {/* Subtle animated gradient-mesh background (CSS only, GPU-cheap). */}
      <div className="hero-mesh" aria-hidden />

      <div className="relative mx-auto max-w-3xl px-4 pb-8 pt-10 text-center sm:pt-14">
        <motion.h1
          id="hero-title"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: duration.base }}
          className="mx-auto max-w-3xl text-balance text-[2rem] font-black leading-[1.08] tracking-tight sm:text-5xl md:text-6xl"
        >
          {t.heroTitle1}{" "}
          <span className="text-gradient">{t.heroTitle2}</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: duration.base, delay: 0.1 }}
          className="mx-auto mt-3 max-w-xl text-pretty text-sm text-white/60 sm:text-base"
        >
          {t.heroSubtitle}
        </motion.p>

        {/* Search field */}
        <motion.form
          onSubmit={submit}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: duration.base, delay: 0.15 }}
          className="mx-auto mt-7 flex max-w-xl items-center gap-2 rounded-2xl glass p-2 shadow-float"
          role="search"
        >
          <Search
            size={18}
            className="ml-2 shrink-0 text-white/40"
            aria-hidden
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            aria-label={t.searchPlaceholder}
            className="h-11 w-full min-w-0 bg-transparent px-1 text-sm text-white placeholder-white/40 outline-none"
          />
          <button
            type="submit"
            className="grid h-11 shrink-0 place-items-center rounded-xl bg-gradient-to-tr from-accent-orange to-accent-pink px-4 text-sm font-bold text-white shadow-lg shadow-accent-pink/30 transition hover:opacity-90 active:scale-95"
            aria-label="Search"
          >
            <Search size={17} className="sm:hidden" />
            <span className="hidden sm:inline">{t.search}</span>
          </button>
        </motion.form>

        {/* Location pill + live nearby count */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: duration.base, delay: 0.2 }}
          className="mx-auto mt-4 flex flex-col items-center gap-3"
        >
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            aria-label={t.changeLocation}
            className="inline-flex min-h-[44px] max-w-full items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white/90 backdrop-blur transition hover:bg-white/15 active:scale-95"
          >
            <MapPin size={15} className="shrink-0 text-accent-orange" />
            <span className="truncate">{placeLabel || t.setYourLocation}</span>
            <span className="shrink-0 text-white/50">·</span>
            <span className="shrink-0 text-accent-pink">{t.change}</span>
          </button>

          {typeof nearbyCount === "number" && nearbyCount > 0 && (
            <p className="inline-flex items-center gap-2 text-xs font-medium text-white/50">
              <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 text-emerald-400" />
              <span>
                <span className="font-bold text-white/80">{nearbyCount}</span>{" "}
                {t.nearOffersLine}
              </span>
            </p>
          )}
        </motion.div>

        {/* Quick actions (kept from the original hero) */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: duration.base, delay: 0.25 }}
          className="mt-5 flex flex-wrap items-center justify-center gap-3"
        >
          <button
            onClick={handleNearMe}
            disabled={locating}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-white/15 active:scale-95 disabled:opacity-60"
          >
            <LocateFixed size={17} className={locating ? "animate-spin" : ""} />
            {locating ? "…" : `📍 ${t.nearMe}`}
          </button>

          <Link
            href="/add"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-gradient-to-tr from-accent-orange to-accent-pink px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-accent-pink/30 transition hover:opacity-90 active:scale-95"
          >
            <Plus size={17} strokeWidth={3} /> {t.addOffer}
          </Link>
        </motion.div>

        {status === "success" && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-2 text-xs font-medium text-emerald-300"
          >
            ✓ {t.nearMeSuccess}
          </motion.p>
        )}

        {locating && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-2 text-xs font-medium text-sky-300"
          >
            {t.locating}
          </motion.p>
        )}

        {status === "denied" && statusMsg && (
          <p className="mx-auto mt-2 max-w-md whitespace-pre-line text-center text-xs text-amber-300/90">
            {statusMsg}
          </p>
        )}

        {status === "denied" && (
          <div className="relative mx-auto mt-2 w-full max-w-sm">
            <p className="mb-2 text-xs text-amber-300/90">{statusMsg || t.nearMeDenied}</p>
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className="flex w-full items-center justify-between rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/15"
            >
              <span className="inline-flex items-center gap-2">
                <MapPin size={15} /> {t.approximateLocation}
              </span>
            </button>
          </div>
        )}
      </div>

      <LocationSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onUseCurrent={handleNearMe}
        onApproximate={handleApproximate}
        onPickPlace={handlePickPlace}
        onPickPin={() => setSheetOpen(false)}
        onPickDivision={handlePickDivision}
      />
    </section>
  );
}