"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { List, Map as MapIcon, X } from "lucide-react";
import Hero from "./Hero";
import FilterBar from "./FilterBar";
import SectionHeading from "./SectionHeading";
import OfferCard from "./OfferCard";
import MapView from "./MapView";
import Confetti from "./Confetti";
import { GridSkeleton } from "./Skeletons";
import EmptyState from "./EmptyState";
import OfferImage from "./OfferImage";
import AdSlot from "./AdSlot";
import { useApp } from "@/lib/app-context";
import {
  getAllOffers,
  distanceToOffer,
  discountValue,
} from "@/lib/offers";
import { getGeo, setGeo, wasAsked, markAsked } from "@/lib/geo";
import { DIVISIONS, districtNames, districtInfo } from "@/lib/bd-locations";

const CategoryChips = dynamic(() => import("./CategoryChips"), {
  ssr: false,
  loading: () => (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 py-1">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="h-10 w-24 animate-pulse rounded-2xl bg-white/10" />
      ))}
    </div>
  ),
});

export default function HomeClient() {
  const { t } = useApp();
  const [loading, setLoading] = useState(true);
  const [allOffers, setAllOffers] = useState([]);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [view, setView] = useState("list");
  const [userCoords, setUserCoords] = useState(null);
  const [fireConfetti, setFireConfetti] = useState(false);
  const [selectedMapId, setSelectedMapId] = useState(null);
  const [visibleCount, setVisibleCount] = useState(24);
  const [manualDiv, setManualDiv] = useState("Dhaka");
  const [manualDist, setManualDist] = useState("");
  const [locName, setLocName] = useState("");
  const [showLocPicker, setShowLocPicker] = useState(false);
  const sentinelRef = useRef(null);

  const [filters, setFilters] = useState({
    category: "All",
    division: "All",
    district: "All",
    payment: "Any",
    radius: "25",
    sort: "nearest",
  });

  // Load approved offers from Supabase (via lib/offers.js) once.
  useEffect(() => {
    let active = true;
    getAllOffers()
      .then((offers) => {
        if (!active) return;
        setAllOffers(offers);
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

  // Effective radius: default 25 km, auto-widen to 50/100/200 when fewer than
  // 10 offers fall inside the current radius (nationwide offers excluded).
  const radiusInfo = useMemo(() => {
    if (userCoords == null) return { radius: null, note: null };
    const base = filters.radius === "Any" ? null : Number(filters.radius);
    let radius = base != null ? base : 25;
    const local = allOffers.filter((o) => !o.nationwide);
    const countIn = (r) =>
      local.filter(
        (o) => (distanceToOffer(o, userCoords.lat, userCoords.lng) ?? Infinity) <= r
      ).length;
    if (countIn(radius) < 10) {
      for (const r of [50, 100, 200]) {
        if (countIn(r) >= 10 || r === 200) {
          radius = r;
          break;
        }
      }
    }
    const note = base != null && radius !== base ? radius : base == null ? radius : null;
    return { radius, note };
  }, [userCoords, allOffers, filters.radius]);

  const searchRes = useMemo(() => {
    if (!query.trim()) return null;
    const norm = query.trim().toLowerCase();
    return allOffers.filter(
      (o) =>
        (o.title || "").toLowerCase().includes(norm) ||
        (o.shopName || "").toLowerCase().includes(norm) ||
        (o.category || "").toLowerCase().includes(norm) ||
        (o.district || "").toLowerCase().includes(norm) ||
        (o.division || "").toLowerCase().includes(norm) ||
        (o.area || "").toLowerCase().includes(norm) ||
        (o.address || "").toLowerCase().includes(norm)
    );
  }, [query, allOffers]);

  const baseList = searchRes != null ? searchRes : allOffers;

  const filteredList = useMemo(() => {
    let list = baseList;
    if (activeCategory !== "All")
      list = list.filter((o) => o.category === activeCategory);
    if (filters.division !== "All")
      list = list.filter((o) => o.nationwide === true || o.division === filters.division);
    if (filters.district !== "All")
      list = list.filter((o) => o.nationwide === true || o.district === filters.district);
    if (filters.payment !== "Any")
      list = list.filter((o) => o.paymentMethod === filters.payment);

    const withDist = list.map((o) => ({
      ...o,
      distanceKm:
        userCoords != null ? distanceToOffer(o, userCoords.lat, userCoords.lng) : null,
    }));

    if (userCoords != null) {
      // Nearby (within radius, nearest first), then nationwide offers last.
      const nearby = [];
      const nationwide = [];
      for (const o of withDist) {
        if (o.nationwide === true) {
          nationwide.push(o);
          continue;
        }
        const d = o.distanceKm ?? Infinity;
        if (filters.radius !== "Any" && d > radiusInfo.radius) continue;
        nearby.push(o);
      }
      nearby.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
      list = [...nearby, ...nationwide];
    } else {
      list = withDist;
      switch (filters.sort) {
        case "ending":
          list.sort((a, b) => new Date(a.validTill) - new Date(b.validTill));
          break;
        case "discount":
          list.sort((a, b) => discountValue(b) - discountValue(a));
          break;
        case "nearest":
        default:
          list.sort((a, b) => b.isFeatured - a.isFeatured || b.hotScore - a.hotScore);
      }
    }
    return list;
  }, [baseList, filters, userCoords, activeCategory, radiusInfo.radius]);

  // Derive the curated sections from the single fetched list.
  // Offer count per category (normalized) for the chips.
const categoryCounts = useMemo(() => {
  const m = {};
  const inRadius = (o) => {
    if (o.nationwide === true) return true;
    if (userCoords == null || radiusInfo.radius == null) return true;
    return (distanceToOffer(o, userCoords.lat, userCoords.lng) ?? Infinity) <= radiusInfo.radius;
  };
  for (const o of allOffers) {
    if (!inRadius(o)) continue;
    const k = o.category || "Other";
    m[k] = (m[k] || 0) + 1;
  }
  return m;
}, [allOffers, userCoords, radiusInfo.radius]);

// A category filter reused by all sections + lists.
const appliesCategory = (o) =>
  activeCategory === "All" || o.category === activeCategory;

const hot = useMemo(
  () => [...allOffers].filter(appliesCategory).sort((a, b) => b.hotScore - a.hotScore).slice(0, 8),
  [allOffers, activeCategory]
);
const ending = useMemo(
  () =>
    [...allOffers]
      .filter((o) => {
        if (!appliesCategory(o)) return false;
        return !o.isOngoing;
      })
      .sort((a, b) => new Date(a.validTill) - new Date(b.validTill))
      .slice(0, 8),
  [allOffers, activeCategory]
);
const topFive = useMemo(
  () =>
    [...allOffers]
      .filter(appliesCategory)
      .sort((a, b) => (b.viewsToday ?? 0) - (a.viewsToday ?? 0))
      .slice(0, 5),
  [allOffers, activeCategory]
);
const featured = useMemo(
  () => allOffers.filter((o) => o.isFeatured && appliesCategory(o)).slice(0, 3),
  [allOffers, activeCategory]
);

const nearOffers = useMemo(() => {
  if (!userCoords) return [];
  return [...allOffers]
    .filter(appliesCategory)
    .map((o) => ({
      ...o,
      distanceKm: distanceToOffer(o, userCoords.lat, userCoords.lng),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 8);
}, [userCoords, allOffers, activeCategory]);

  function handleNearMe(coords) {
    setUserCoords(coords);
    setGeo(coords);
    setLocName("");
    setShowLocPicker(false);
    setView("list");
    setSelectedMapId(null);
    document.getElementById("near-you")?.scrollIntoView({ behavior: "smooth" });
  }

  // Manual Division -> District selection (used when GPS is denied/absent).
  function applyManualLocation() {
    const info = districtInfo(manualDist || manualDiv);
    if (!info) return;
    setUserCoords({ lat: info.lat, lng: info.lng });
    setGeo({ lat: info.lat, lng: info.lng });
    setLocName(manualDist || manualDiv);
    setShowLocPicker(false);
    setView("list");
    setSelectedMapId(null);
  }

  // Ask for the user's location automatically once (per browser), and reuse
  // a previously saved location if we have one.
  useEffect(() => {
    const saved = getGeo();
    if (saved && saved.lat != null) {
      setUserCoords(saved);
    }
    if (!wasAsked() && typeof navigator !== "undefined" && "geolocation" in navigator) {
      markAsked();
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserCoords(coords);
          setGeo(coords);
        },
        () => {
          // denied or error — allow manual division/district selection
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  }, []);

  function handleFirstSave() {
    setFireConfetti(true);
    setTimeout(() => setFireConfetti(false), 3000);
  }

  // Keep the selected category in the URL so a refresh survives.
  function syncUrl(category) {
    const url = new URL(window.location.href);
    if (category && category !== "All") url.searchParams.set("category", category);
    else url.searchParams.delete("category");
    window.history.replaceState({}, "", url.pathname + url.search);
  }

  function handleCategorySelect(value) {
    // Clicking the active chip (or "All") deselects the filter.
    const next = value !== "All" && value === activeCategory ? "All" : value;
    setActiveCategory(next);
    setFilters((f) => ({ ...f, category: next === "All" ? "All" : next }));
    syncUrl(next);
    setQuery("");
  }

  const hasActiveFilters =
    activeCategory !== "All" ||
    filters.division !== "All" ||
    filters.district !== "All" ||
    filters.payment !== "Any" ||
    filters.radius !== "Any";

  const defaultFilters = {
    category: "All",
    division: "All",
    district: "All",
    payment: "Any",
    radius: "25",
    sort: "nearest",
  };

  function clearFilters() {
    setActiveCategory("All");
    setFilters(defaultFilters);
    setQuery("");
    syncUrl(null);
  }

  // Read the ?category= param once on mount so refreshing keeps the selection.
  useEffect(() => {
    try {
      const cat = new URL(window.location.href).searchParams.get("category");
      if (cat && cat !== "All") setActiveCategory(cat);
    } catch (e) {
      /* ignore */
    }
  }, []);

  // Paginate the list 24 at a time; reset when filters/location change.
  useEffect(() => {
    setVisibleCount(24);
  }, [userCoords, filters, activeCategory, searchRes != null]);

  const visibleList = filteredList.slice(0, visibleCount);

  // Infinite scroll: when the sentinel enters the view, reveal 24 more.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < filteredList.length) {
          setVisibleCount((n) => n + 24);
        }
      },
      { rootMargin: "300px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [visibleCount, filteredList.length]);

  return (
    <>
      <Hero onSearch={setQuery} onNearMe={handleNearMe} />

      {/* Location bar */}
      <div className="mx-auto max-w-6xl px-4 pt-3">
        {!showLocPicker ? (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/70">
            <span>📍</span>
            <span>
              {userCoords != null ? `${t.yourLocation}: ${locName || t.nearYouDerived}` : `${t.setYourLocation}`}
            </span>
            <button
              onClick={() => setShowLocPicker(true)}
              className="ml-auto rounded-lg border border-white/15 px-2.5 py-1 text-xs font-semibold text-white/70 hover:bg-white/10 transition"
            >
              {t.change}
            </button>
          </div>
        ) : (
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
            <div className="mb-2 font-semibold text-white/80">{t.chooseLocation}</div>
            <div className="flex flex-wrap items-end gap-2">
              <select
                value={manualDiv}
                onChange={(e) => { setManualDiv(e.target.value); setManualDist(""); }}
                className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none"
              >
                {DIVISIONS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              <select
                value={manualDist}
                onChange={(e) => setManualDist(e.target.value)}
                className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none"
              >
                <option value="">{t.chooseDistrict}</option>
                {districtNames(manualDiv).map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              <button
                onClick={applyManualLocation}
                disabled={!manualDist}
                className="rounded-lg bg-gradient-to-tr from-accent-orange to-accent-pink px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                {t.applyLocation}
              </button>
              {userCoords != null && (
                <button
                  onClick={() => setShowLocPicker(false)}
                  className="rounded-lg border border-white/15 px-3 py-2 text-sm text-white/70 hover:bg-white/10"
                >
                  {t.cancel}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Category chips */}
      <div className="mx-auto max-w-6xl px-4 py-3">
        <CategoryChips
          active={activeCategory}
          onSelect={handleCategorySelect}
          counts={categoryCounts}
          total={allOffers.length}
        />
        {hasActiveFilters && (
          <div className="mt-3 flex">
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/70 hover:bg-white/10 hover:text-white transition"
            >
              <X size={13} /> {t.clearFilters}
            </button>
          </div>
        )}
      </div>

      <main className="mx-auto max-w-6xl px-4 pb-24 md:pb-10">
        {/* List/Map toggle */}
        {!searchRes && (
          <div className="mt-6 flex items-center justify-end">
            <div className="inline-flex rounded-xl glass p-1">
              <button
                onClick={() => setView("list")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  view === "list"
                    ? "bg-gradient-to-tr from-accent-pink to-accent-purple text-white"
                    : "text-white/60 hover:text-white"
                }`}
              >
                <List size={15} /> {t.viewList}
              </button>
              <button
                onClick={() => setView("map")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  view === "map"
                    ? "bg-gradient-to-tr from-accent-pink to-accent-purple text-white"
                    : "text-white/60 hover:text-white"
                }`}
              >
                <MapIcon size={15} /> {t.viewMap}
              </button>
            </div>
          </div>
        )}

        {/* Filters (hidden when searching) */}
        {!searchRes && (
          <FilterBar
            filters={filters}
            onChange={(f) => {
              setFilters(f);
              if (f.category !== activeCategory) {
                setActiveCategory(f.category);
                syncUrl(f.category);
              }
            }}
          />
        )}

        {/* Search results */}
        {searchRes && (
          <div className="mb-8">
            <SectionHeading
              emoji="🔎"
              title={`${searchRes.length} ${t.results}`}
            />
            {searchRes.length === 0 ? (
              <EmptyState message={t.noResults} />
            ) : (
              renderGrid(searchRes, loading, handleFirstSave)
            )}
          </div>
        )}

        {/* Search-only section: when searching we don't show feature sections */}
        {!searchRes && (
          <>
            {/* Map view */}
            {view === "map" ? (
              <div className="mb-10 rounded-2xl overflow-hidden border border-white/10">
                <MapView
                  offers={filteredList}
                  userCoords={userCoords}
                  selectedId={selectedMapId}
                  onSelect={setSelectedMapId}
                />
              </div>
            ) : (
              <>
                {/* Today's top 5 strip */}
                <div className="mb-10">
                  <SectionHeading emoji="🏆" title={t.todaysTop} />
                  <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4">
                    {topFive.map((o, i) => (
                      <TopStrip key={o.id} offer={o} rank={i + 1} />
                    ))}
                  </div>
                </div>

                {/* Hot right now */}
                <div className="mb-10">
                  <SectionHeading emoji="🔥" title={t.hotNow} />
                  {loading ? (
                    <GridSkeleton />
                  ) : (
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                      {hot.map((o, i) => (
                        <OfferCard
                          key={o.id}
                          offer={o}
                          index={i}
                          onFirstSave={handleFirstSave}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <AdSlot variant="banner" className="mb-10 mt-2" />

                {/* Ending soon */}
                <div className="mb-10">
                  <SectionHeading emoji="⏰" title={t.endingSoon} />
                  {loading ? (
                    <GridSkeleton />
                  ) : (
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                      {ending.map((o, i) => (
                        <OfferCard
                          key={o.id}
                          offer={o}
                          index={i}
                          onFirstSave={handleFirstSave}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Near you */}
                <div id="near-you" className="mb-10 scroll-mt-28">
                  <SectionHeading emoji="📍" title={t.nearYou} />
                  {userCoords == null ? (
                    <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-8 text-center">
                      <p className="text-sm text-white/50">
                        {t.nearMe} → {t.nearMeDenied}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                      {nearOffers.map((o, i) => (
                        <OfferCard
                          key={o.id}
                          offer={o}
                          index={i}
                          distanceKm={o.distanceKm}
                          onFirstSave={handleFirstSave}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Filtered results / all deals */}
                <div className="mb-10">
                  <SectionHeading
                    emoji="✨"
                    title={
                      userCoords != null && radiusInfo.radius != null
                        ? `${filteredList.length} ${t.results} · ${filteredList.filter((o) => !o.nationwide).length} ${t.within} ${radiusInfo.radius} ${t.kmAway}`
                        : `${filteredList.length} ${t.results}`
                    }
                  />
                  {radiusInfo.note != null && (
                    <p className="mb-4 text-sm font-semibold text-amber-300">
                      {t.showingWithin} {radiusInfo.radius} {t.kmAway}
                    </p>
                  )}
                  {loading ? (
                    <GridSkeleton />
                  ) : visibleList.length === 0 ? (
                    <EmptyState />
                  ) : (
                    <>
                      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {visibleList.map((o, i) => (
                          <OfferCard
                            key={o.id}
                            offer={o}
                            index={i}
                            distanceKm={o.distanceKm}
                            onFirstSave={handleFirstSave}
                          />
                        ))}
                      </div>
                      {visibleCount < filteredList.length && (
                        <div ref={sentinelRef} className="mt-8 flex justify-center">
                          <button
                            onClick={() => setVisibleCount((n) => n + 24)}
                            className="rounded-xl border border-white/15 bg-white/5 px-6 py-3 text-sm font-bold text-white/80 hover:bg-white/10 transition"
                          >
                            {t.loadMore}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </>
            )}
          </>
        )}

        {/* Banner for featured / quick area quick links */}
        {!searchRes && view === "list" && (
          <AdSlot variant="banner" />
        )}
      </main>

      <Confetti fire={fireConfetti} />

      {/* eslint-disable-next-line react/no-unescaped-entities */}
      <FeaturedStrip featured={featured} handleFirstSave={handleFirstSave} />
    </>
  );
}

function renderGrid(list, loading, onFirstSave) {
  if (loading) return <GridSkeleton />;
  if (list.length === 0) return <EmptyState />;
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {list.map((o, i) => (
        <OfferCard key={o.id} offer={o} index={i} onFirstSave={onFirstSave} />
      ))}
    </div>
  );
}

function TopStrip({ offer, rank }) {
  const medals = ["🥇", "🥈", "🥉", "🧡", "💜"];
  return (
    <div className="flex min-w-[230px]">
      <a href={`/offer/${offer.id}`} className="contents">
        <motion.div
          whileHover={{ y: -4 }}
          className="flex h-full w-full items-center gap-3 rounded-2xl glass p-3 glow-hover"
        >
          <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-xl">
            <OfferImage
              offer={offer}
              urlClassName="h-full w-full object-cover"
              placeholderClassName="h-full w-full"
            />
            <span className="absolute -left-1 -top-1">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-gradient-to-tr from-accent-orange to-accent-pink text-xs font-bold">
                {rank}
              </span>
            </span>
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-white">{offer.shopName}</div>
            <div className="text-xs font-extrabold text-accent-pink">
              {offer.discountText}
            </div>
            <div className="mt-0.5 text-[11px] text-white/50">
              {offer.viewsToday} {offer.viewsToday && `${""}`}{" "}
            </div>
            <div className="text-[11px] text-white/50">{medals[rank - 1]} {offer.area}</div>
          </div>
        </motion.div>
      </a>
    </div>
  );
}

function FeaturedStrip({ featured, handleFirstSave }) {
  const { t } = useApp();
  if (!featured.length) return null;
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <SectionHeading emoji="🌟" title={`${t.featured} ✨`} />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {featured.map((o, i) => (
          <OfferCard key={o.id} offer={o} index={i} onFirstSave={handleFirstSave} />
        ))}
      </div>
    </div>
  );
}