"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Search, LocateFixed, MapPin, ChevronDown, Plus, LocateOff } from "lucide-react";
import { useApp } from "@/lib/app-context";
import { DIVISIONS } from "@/lib/offers";

export default function Hero({ onSearch, onNearMe, placeLabel, nearbyCount }) {
  const { t } = useApp();
  const [query, setQuery] = useState("");
  const [locating, setLocating] = useState(false);
  const [status, setStatus] = useState(null); // "success" | "denied"
  const [statusMsg, setStatusMsg] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [pickDivision, setPickDivision] = useState("Dhaka");
  const [pickDistrict, setPickDistrict] = useState("Dhaka");
  const dropdownRef = useRef(null);

  const districts =
    DIVISIONS.find((d) => d.name === pickDivision)?.districts || [];

  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

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

  return (
    <section className="relative overflow-hidden">
      {/* Subtle animated gradient-mesh background (CSS only, GPU-cheap). */}
      <div className="hero-mesh" aria-hidden />

      <div className="relative mx-auto max-w-3xl px-4 pb-8 pt-10 text-center sm:pt-14">
        <motion.h1
          id="hero-title"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-3xl text-balance text-[2rem] font-black leading-[1.08] tracking-tight sm:text-5xl md:text-6xl"
        >
          {t.heroTitle1}{" "}
          <span className="text-gradient">{t.heroTitle2}</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mx-auto mt-3 max-w-xl text-pretty text-sm text-white/60 sm:text-base"
        >
          {t.heroSubtitle}
        </motion.p>

        {/* Search field */}
        <motion.form
          onSubmit={submit}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
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
            <span className="hidden sm:inline">{t.open.replace(/ →$/, "")}</span>
          </button>
        </motion.form>

        {/* Location pill + live nearby count */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mx-auto mt-4 flex flex-col items-center gap-3"
        >
          <button
            type="button"
            onClick={() => setShowPicker((s) => !s)}
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
          transition={{ duration: 0.5, delay: 0.25 }}
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
          <div className="relative mx-auto mt-2 w-full max-w-sm" ref={dropdownRef}>
            <p className="mb-2 text-xs text-amber-300/90">{t.nearMeDenied}</p>
            <button
              onClick={() => setShowPicker((s) => !s)}
              className="flex w-full items-center justify-between rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/15"
            >
              <span className="inline-flex items-center gap-2">
                <MapPin size={15} /> {t.allDivisions}
              </span>
              <ChevronDown size={18} className={showPicker ? "rotate-180" : ""} />
            </button>
            {showPicker && (
              <motion.ul
                initial={{ opacity: 0, scaleY: 0.95 }}
                animate={{ opacity: 1, scaleY: 1 }}
                className="absolute z-30 mt-2 max-h-56 w-full overflow-auto rounded-xl border border-white/15 bg-base py-1 shadow-2xl"
              >
                {DIVISIONS.map((div) => (
                  <li key={div.name}>
                    <button
                      onClick={() => {
                        setPickDivision(div.name);
                        setShowPicker(false);
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-white/80 transition hover:bg-white/10 hover:text-white"
                    >
                      <MapPin size={14} className="text-accent-orange" />
                      <span>{div.name}</span>
                      <span className="ml-auto text-xs text-white/50">{div.bn}</span>
                    </button>
                  </li>
                ))}
              </motion.ul>
            )}
          </div>
        )}
      </div>
    </section>
  );
}