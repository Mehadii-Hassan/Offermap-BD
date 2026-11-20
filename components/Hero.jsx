"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Search, LocateFixed, MapPin, ChevronDown, Plus, LocateOff } from "lucide-react";
import { useApp } from "@/lib/app-context";
import { DIVISIONS } from "@/lib/offers";

export default function Hero({ onSearch, onNearMe }) {
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

          {locating && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs font-medium text-sky-300"
            >
              {t.locating}
            </motion.p>
          )}

          {status === "denied" && statusMsg && (
            <p className="mx-auto mt-1 max-w-md whitespace-pre-line text-center text-xs text-amber-300/90">
              {statusMsg}
            </p>
          )}

          {status === "denied" && (
            <div className="relative w-full max-w-sm" ref={dropdownRef}>
              <p className="mb-2 text-xs text-amber-300/90">{t.nearMeDenied}</p>
              <div className="grid gap-2">
                <button
                  onClick={() => setShowPicker((s) => !s)}
                  className="flex w-full items-center justify-between rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-medium text-white hover:bg-white/15 transition"
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
                          className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-white/80 hover:bg-white/10 hover:text-white transition"
                        >
                          <MapPin size={14} className="text-accent-orange" />
                          <span>{div.name}</span>
                          <span className="text-white/50 text-xs ml-auto">{div.bn}</span>
                        </button>
                      </li>
                    ))}
                  </motion.ul>
                )}
              </div>

              {pickDivision && (
                <div className="mt-2 grid gap-2">
                  <button
                    onClick={() => setShowPicker(false)}
                    className="flex w-full items-center justify-between rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-medium text-white hover:bg-white/15 transition"
                  >
                    <span className="inline-flex items-center gap-2">
                      <MapPin size={15} /> {t.allDistricts}
                    </span>
                    <ChevronDown size={18} className={showPicker ? "rotate-180" : ""} />
                  </button>
                  {showPicker && (
                    <motion.ul
                      initial={{ opacity: 0, scaleY: 0.95 }}
                      animate={{ opacity: 1, scaleY: 1 }}
                      className="absolute z-30 mt-2 max-h-56 w-full overflow-auto rounded-xl border border-white/15 bg-base py-1 shadow-2xl"
                    >
{DIVISIONS.find((d) => d.name === pickDivision)?.districts.map((dist) => (
                      <li key={dist.name}>
                        <button
                          onClick={() => {
                            onNearMe({ lat: dist.lat, lng: dist.lng });
                            setShowPicker(false);
                            setStatus("success");
                          }}
                          className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-white/80 hover:bg-white/10 hover:text-white transition"
                        >
                          <MapPin size={14} className="text-accent-orange" />
                          <span>{dist.name}</span>
                          <span className="text-white/50 text-xs ml-auto">{dist.bn}</span>
                        </button>
                      </li>
                    ))}
                    </motion.ul>
                  )}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
}