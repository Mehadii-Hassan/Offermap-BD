"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Search, LocateFixed, MapPin, ChevronDown, Plus } from "lucide-react";
import { useApp } from "@/lib/app-context";
import { AREAS } from "@/lib/offers";

function areaCoords(area) {
  const map = {
    Dhanmondi: { lat: 23.7461, lng: 90.3762 },
    Gulshan: { lat: 23.7925, lng: 90.4064 },
    Banani: { lat: 23.7937, lng: 90.4066 },
    Uttara: { lat: 23.8759, lng: 90.3795 },
    Mirpur: { lat: 23.8101, lng: 90.3559 },
    Mohammadpur: { lat: 23.7657, lng: 90.3567 },
    "Old Dhaka": { lat: 23.7100, lng: 90.4100 },
  };
  return map[area];
}

export default function Hero({ onSearch, onNearMe }) {
  const { t } = useApp();
  const [query, setQuery] = useState("");
  const [locating, setLocating] = useState(false);
  const [status, setStatus] = useState(null); // "success" | "denied"
  const [showAreas, setShowAreas] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowAreas(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function submit(e) {
    e.preventDefault();
    onSearch(query);
  }

  function handleNearMe() {
    setLocating(true);
    setStatus(null);
    if (!("geolocation" in navigator)) {
      setLocating(false);
      setStatus("denied");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        setStatus("success");
        onNearMe({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        setLocating(false);
        setStatus("denied");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  return (
    <section className="relative">
      <div className="mx-auto max-w-6xl px-4 pb-6 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-3xl text-4xl font-black leading-tight tracking-tight sm:text-5xl md:text-6xl"
        >
          {t.heroTitle1}{" "}
          <span className="text-gradient">{t.heroTitle2}</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mx-auto mt-4 max-w-xl text-sm text-white/60 sm:text-base"
        >
          {t.heroSubtitle}
        </motion.p>

        {/* Search bar */}
        <motion.form
          onSubmit={submit}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mx-auto mt-8 flex max-w-xl items-center gap-2 rounded-2xl glass p-2"
        >
          <button
            type="submit"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-tr from-accent-orange to-accent-pink text-white shadow-lg shadow-accent-pink/30 hover:scale-105 transition"
            aria-label="Search"
          >
            <Search size={18} />
          </button>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full bg-transparent px-2 text-sm text-white placeholder-white/40 outline-none"
          />
        </motion.form>

        {/* Near Me + area fallback */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mx-auto mt-4 flex flex-col items-center gap-3"
        >
          <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={handleNearMe}
            disabled={locating}
            className="inline-flex items-center gap-2 rounded-xl bg-white/10 border border-white/15 px-5 py-3 text-sm font-bold text-white hover:bg-white/15 transition active:scale-95 disabled:opacity-60"
          >
            <LocateFixed size={17} className={locating ? "animate-spin" : ""} />
            {locating ? "…" : `📍 ${t.nearMe}`}
          </button>

          <Link
            href="/add"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-tr from-accent-orange to-accent-pink px-5 py-3 text-sm font-bold text-white shadow-lg shadow-accent-pink/30 hover:opacity-90 transition active:scale-95"
          >
            <Plus size={17} strokeWidth={3} /> {t.addOffer}
          </Link>
          </div>

          {status === "success" && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs font-medium text-emerald-300"
            >
              ✓ {t.nearMeSuccess}
            </motion.p>
          )}

          {status === "denied" && (
            <div className="relative w-full max-w-sm" ref={dropdownRef}>
              <p className="mb-2 text-xs text-amber-300/90">{t.nearMeDenied}</p>
              <button
                onClick={() => setShowAreas((s) => !s)}
                className="flex w-full items-center justify-between rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-medium text-white hover:bg-white/15 transition"
              >
                <span className="inline-flex items-center gap-2">
                  <MapPin size={15} /> {t.allAreas}
                </span>
                <ChevronDown size={18} className={showAreas ? "rotate-180" : ""} />
              </button>
              {showAreas && (
                <motion.ul
                  initial={{ opacity: 0, scaleY: 0.95 }}
                  animate={{ opacity: 1, scaleY: 1 }}
                  className="absolute z-30 mt-2 max-h-56 w-full overflow-auto rounded-xl border border-white/15 bg-base py-1 shadow-2xl"
                >
                  {AREAS.map((area) => (
                    <li key={area}>
                      <button
                        onClick={() => {
                          onNearMe(areaCoords(area));
                          setShowAreas(false);
                          setStatus("success");
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-white/80 hover:bg-white/10 hover:text-white transition"
                      >
                        <MapPin size={14} className="text-accent-orange" />
                        {area}
                      </button>
                    </li>
                  ))}
                </motion.ul>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
}