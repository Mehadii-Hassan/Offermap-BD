"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import { List, Map as MapIcon, X, Plus, MessageCircle, Share2 } from "lucide-react";
import Hero from "./Hero";
import FilterBar from "./FilterBar";
import SectionHeading from "./SectionHeading";
import OfferCard from "./OfferCard";
import MapView from "./MapView";
import Confetti from "./Confetti";
import { GridSkeleton } from "./Skeletons";
import EmptyState from "./EmptyState";
import AdSlot from "./AdSlot";
import CategoryRail from "./CategoryRail";
import { useApp } from "@/lib/app-context";
import {
  getAllOffers,
  distanceToOffer,
  discountValue,
} from "@/lib/offers";
import { getGeo, setGeo, wasAsked, markAsked } from "@/lib/geo";
import { DIVISIONS, districtNames, districtInfo } from "@/lib/bd-locations";
import { getPrecision } from "@/lib/precision";
import { loadPlaces, addPlace, renamePlace, removePlace, getActivePlaceId, setActivePlaceId } from "@/lib/places";
import MyPlaces from "./MyPlaces";

const CategoryChips = CategoryRail;

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
  const [places, setPlaces] = useState([]);
  const [activePlaceId, setActivePlaceIdState] = useState("");
  const sentinelRef = useRef(null);
  const [elsewhereExpanded, setElsewhereExpanded] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [copied, setCopied] = useState(false);
  const [inAppBrowser, setInAppBrowser] = useState(false);
  function handleShare(kind) {
    if (userCoords == null) return;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const link = `${origin}/?lat=${userCoords.lat}&lng=${userCoords.lng}&place=${encodeURIComponent(locName || "")}`;
    const en = t.shareLocationMsg.replace("{place}", locName || t.nearYouDerived);
    const bn = t.shareLocationMsgBn.replace("{place}", locName || t.nearYouDerived);
    const msg = `${en}\n${bn}\n${link}`;
    if (kind === "wa") window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
    else if (kind === "msg") window.open(`https://www.messenger.com/share/sharer.php?quote=${encodeURIComponent(msg)}`, "_blank");
    else if (kind === "copy") {
      navigator.clipboard?.writeText(link).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
    setShowShare(false);
  }

  // In-app browser detection (runs once on mount; never requests location here).
  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const ua = navigator.userAgent || "";
    if (/FBAN|FBAV|FB_IAB|Instagram|Line|TikTok/.test(ua)) {
      setInAppBrowser(true);
    }
  }, []);

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

  // Effective radius: default 25 km. NEVER auto-widen beyond 25 (the user
  // picks a wider radius or "Any" explicitly via "Show more"/"Any").
  const radiusInfo = useMemo(() => {
    if (userCoords == null) return { radius: null, note: null };
    const base = filters.radius === "Any" ? null : Number(filters.radius);
    let radius = base != null ? base : 25;
    if (radius > 200) radius = 200;
    const note = base != null ? null : radius;
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
      // An offer WITH real outlets is location-based: it sorts by nearest outlet
      // (BATCH H5) instead of being treated as a pure nationwide offer.
      const nearby = [];
      const nationwide = [];
      for (const o of withDist) {
        const hasOutlets = Array.isArray(o.outlets) && o.outlets.length > 0;
        if (o.nationwide === true && !hasOutlets) {
          nationwide.push(o);
          continue;
        }
        const d = o.distanceKm ?? Infinity;
        if (filters.radius !== "Any" && d > radiusInfo.radius) continue;
        // District-precision offers are not "near you": their pin is only the
        // district centre, so they are shown separately under "Elsewhere in".
        if (getPrecision(o) === "district") continue;
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

  // Recommendation sections for the chosen place (distance bands + nationwide).
  const recommendations = useMemo(() => {
    if (userCoords == null) return [];
    const byDistance = (a, b) =>
      (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity) || b.hotScore - a.hotScore;
    const inRadius = filteredList.filter((o) => !o.nationwide && o.distanceKm != null);
    const sections = [
      { key: "veryClose", title: t.veryClose, max: 2, list: inRadius.filter((o) => o.distanceKm <= 2).sort(byDistance) },
      { key: "inArea", title: t.inArea, max: 5, list: inRadius.filter((o) => o.distanceKm > 2 && o.distanceKm <= 5).sort(byDistance) },
      { key: "inCity", title: t.inCity, max: 25, list: inRadius.filter((o) => o.distanceKm > 5 && o.distanceKm <= 25).sort(byDistance) },
      { key: "nationwide", title: t.nationwideOnline, max: 200, list: filteredList.filter((o) => o.nationwide === true && !(Array.isArray(o.outlets) && o.outlets.length)).sort(byDistance) },
    ];
    return sections.map((s) => ({ ...s, list: s.list.filter((o) => o.distanceKm <= s.max) }));
  }, [filteredList, userCoords, t]);

  // BATCH H6: fewer than 5 offers within 5 km -> show the empty-state card.
  const near5Offers = useMemo(() => {
    if (userCoords == null) return [];
    return allOffers.filter(
      (o) =>
        !o.nationwide &&
        getPrecision(o) !== "district" &&
        (distanceToOffer(o, userCoords.lat, userCoords.lng) ?? Infinity) <= 5
    );
  }, [allOffers, userCoords]);
  const showEmptyStateCard = near5Offers.length < 5;

  // Live "N offers near you" counter (radius-aware, district pins excluded).
  const nearYouCount = useMemo(() => {
    if (userCoords == null) return 0;
    return allOffers.filter((o) => {
      if (o.nationwide === true) return true;
      if (getPrecision(o) === "district") return false;
      const d = distanceToOffer(o, userCoords.lat, userCoords.lng);
      if (d == null || radiusInfo.radius == null) return true;
      return d <= radiusInfo.radius;
    }).length;
  }, [allOffers, userCoords, radiusInfo.radius]);

  // Derive the curated sections from the single fetched list.
  // Offer count per category (normalized) for the chips.
const categoryCounts = useMemo(() => {
  const m = {};
  const inRadius = (o) => {
    if (o.nationwide === true) return true;
    if (userCoords != null && getPrecision(o) === "district") return false;
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

const offerMatchesFilters = (o) => {
    if (activeCategory !== "All" && o.category !== activeCategory) return false;
    if (filters.division !== "All" && o.nationwide !== true && o.division !== filters.division) return false;
    if (filters.district !== "All" && o.nationwide !== true && o.district !== filters.district) return false;
    if (filters.payment !== "Any" && o.paymentMethod !== filters.payment) return false;
    return true;
  };

  // Distinct offers (district-precision, not nationwide) shown in a collapsed
  // "Elsewhere in <district>" section below the nearby sections: their pin is
  // only the district centre, so they must not appear in any km-based count.
  const elsewhere = useMemo(() => {
    if (userCoords == null) return [];
    const groups = new Map();
    for (const o of allOffers) {
      if (o.nationwide === true) continue;
      if (getPrecision(o) !== "district") continue;
      if (!offerMatchesFilters(o)) continue;
      const d = distanceToOffer(o, userCoords.lat, userCoords.lng);
      if (filters.radius !== "Any" && (d ?? Infinity) > radiusInfo.radius) continue;
      const district = o.district || t.elsewhereIn;
      if (!groups.has(district)) groups.set(district, []);
      groups.get(district).push({ ...o, distanceKm: d });
    }
    return [...groups.entries()].map(([district, list]) => ({
      district,
      list: list.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity) || b.hotScore - a.hotScore),
    }));
  }, [allOffers, userCoords, filters, activeCategory, radiusInfo.radius, t.elsewhereIn]);

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

  const todayBest = useMemo(
    () =>
      allOffers
        .filter(appliesCategory)
        .sort((a, b) => b.hotScore - a.hotScore)
        .slice(0, 8),
    [allOffers, activeCategory]
  );

  const nearOffers = useMemo(() => {
  if (!userCoords) return [];
  return [...allOffers]
    .filter((o) => {
      if (!appliesCategory(o)) return false;
      // District-precision offers are not "near you" — district centre only.
      if (!o.nationwide && getPrecision(o) === "district") return false;
      return true;
    })
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
      const url = new URL(window.location.href);
      const cat = url.searchParams.get("category");
      if (cat && cat !== "All") setActiveCategory(cat);
      // Shareable location: ?lat=..&lng=..&place=..
      const lat = parseFloat(url.searchParams.get("lat"));
      const lng = parseFloat(url.searchParams.get("lng"));
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        setUserCoords({ lat, lng });
        setLocName(url.searchParams.get("place") || "");
        setView("list");
      }
    } catch (e) {
      /* ignore */
    }
  }, []);

  // Load saved places and restore the active one.
  useEffect(() => {
    try {
      setPlaces(loadPlaces());
      const active = getActivePlaceId();
      if (active) {
        const found = loadPlaces().find((p) => p.id === active);
        if (found) {
          setActivePlaceIdState(active);
          setUserCoords({ lat: found.lat, lng: found.lng });
          setLocName(found.name);
        }
      }
    } catch (e) {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- MY PLACES handlers ----
  function handlePlaceSelect(p) {
    setUserCoords({ lat: p.lat, lng: p.lng });
    setLocName(p.name);
    setActivePlaceIdState(p.id);
    setActivePlaceId(p.id);
    setView("list");
    setSelectedMapId(null);
  }
  function handleAddPlace(name) {
    const list = addPlace(name, userCoords || { lat: 23.8103, lng: 90.4125 });
    setPlaces(list);
  }
  function handleRename(id, name) {
    setPlaces(renamePlace(id, name));
  }
  function handleRemove(id) {
    setPlaces(removePlace(id));
    if (id === activePlaceId) {
      setActivePlaceIdState("");
      setActivePlaceId("");
      setLocName("");
    }
  }
  function handleGps() {
    if (typeof navigator !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserCoords(c);
          setGeo(c);
          setLocName("");
          setActivePlaceIdState("");
          setActivePlaceId("");
        },
        () => {}
      );
    }
  }
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
      {inAppBrowser && (
        <div className="sticky top-0 z-40 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-center text-xs font-medium text-amber-200">
          Location may not work here. Tap the menu (⋮) and choose{" "}
          <span className="font-bold">Open in Chrome/Safari</span>.
          {" "}
          <button
            onClick={() => {
              if (typeof navigator !== "undefined" && navigator.clipboard) {
                navigator.clipboard.writeText(window.location.href).then(() => setCopied(true));
              }
            }}
            className="underline underline-offset-2"
          >
            {copied ? "Link copied" : "Copy link"}
          </button>
        </div>
      )}
      <Hero
        onSearch={setQuery}
        onNearMe={handleNearMe}
        placeLabel={locName || ""}
        nearbyCount={nearYouCount}
      />

      <MyPlaces
        places={places}
        active={activePlaceId}
        onSelect={handlePlaceSelect}
        onGps={handleGps}
        onAdd={handleAddPlace}
        onRename={handleRename}
        onRemove={handleRemove}
      />

      {/* Location bar */}
      <div className="mx-auto max-w-6xl px-4 pt-3">
        {!showLocPicker ? (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/70">
            <span>📍</span>
            <span>
              {userCoords != null ? `${t.yourLocation}: ${locName || t.nearYouDerived}` : `${t.setYourLocation}`}
            </span>
            <div className="relative ml-auto flex flex-wrap items-center gap-2">
              {userCoords != null && (
                <>
                  <button
                    onClick={() => setShowShare((v) => !v)}
                    className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-2.5 py-1 text-xs font-semibold text-white/70 hover:bg-white/10 transition"
                  >
                    <Share2 size={12} /> {copied ? t.shareCopied : t.shareLocation}
                  </button>
                  {showShare && (
                    <div className="absolute right-0 top-8 z-30 flex min-w-[150px] flex-col gap-1 rounded-xl border border-white/10 bg-white/10 p-1.5 backdrop-blur-md">
                      <button onClick={() => handleShare("wa")} className="rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold text-white/80 hover:bg-white/10">
                        WhatsApp
                      </button>
                      <button onClick={() => handleShare("msg")} className="rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold text-white/80 hover:bg-white/10">
                        Messenger
                      </button>
                      <button onClick={() => handleShare("copy")} className="rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold text-white/80 hover:bg-white/10">
                        {t.shareCopied}
                      </button>
                    </div>
                  )}
                </>
              )}
              <button
                onClick={() => setShowLocPicker(true)}
                className="rounded-lg border border-white/15 px-2.5 py-1 text-xs font-semibold text-white/70 hover:bg-white/10 transition"
              >
                {t.change}
              </button>
            </div>
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
                {/* Today's best (featured carousel, snap scrolling) */}
                <div className="mb-10">
                  <SectionHeading
                    emoji="🔥"
                    title={t.todaysBest}
                    count={todayBest.length}
                  />
                  {loading ? (
                    <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4">
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className="h-[236px] w-[268px] shrink-0 animate-pulse rounded-2xl bg-white/5"
                        />
                      ))}
                    </div>
                  ) : todayBest.length > 0 ? (
                    <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-1">
                      {todayBest.map((o, i) => (
                        <div
                          key={o.id}
                          className="w-[268px] shrink-0 snap-start"
                        >
                          <OfferCard
                            offer={o}
                            index={i}
                            onFirstSave={handleFirstSave}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState />
                  )}
                </div>

                <AdSlot variant="banner" className="mb-10 mt-2" />

                {/* Hot right now */}
                <div className="mb-10">
                  <SectionHeading emoji="✨" title={t.hotNow} count={hot.length} />
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

                {/* Ending soon */}
                <div className="mb-10">
                  <SectionHeading
                    emoji="⏰"
                    title={t.endingSoon}
                    count={ending.length}
                  />
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
                  <SectionHeading
                    emoji="📍"
                    title={t.nearYou}
                    count={nearOffers.length}
                  />
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
                          userCoords={userCoords}
                          onFirstSave={handleFirstSave}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Recommendation sections for the chosen place */}
                {userCoords != null &&
                  recommendations.map((sec) => {
                    if (sec.list.length === 0) return null;
                    return (
                      <div key={sec.key} className="mb-10">
                        <SectionHeading
                          emoji="📍"
                          title={sec.title}
                          count={sec.list.length}
                        />
                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                          {sec.list.slice(0, 12).map((o, i) => (
                            <OfferCard
                              key={o.id}
                              offer={o}
                              index={i}
                              distanceKm={o.distanceKm}
                              userCoords={userCoords}
                              onFirstSave={handleFirstSave}
                            />
                          ))}
                        </div>
                        {sec.list.length > 12 && (
                          <p className="mt-4 text-center text-xs text-white/50">
                            {t.loadMore} → {sec.list.slice(12).length} more in the full list below
                          </p>
                        )}
                      </div>
                    );
                  })}

                {/* BATCH H6: empty state when very few offers are within 5 km */}
                {userCoords != null && showEmptyStateCard && (
                  <div className="mb-10 overflow-hidden rounded-2xl border border-dashed border-emerald-500/40 bg-emerald-500/10 p-5 text-center">
                    <div className="text-base font-bold text-emerald-200">
                      {t.emptyStateTitle.replace("{place}", locName || t.nearYouDerived)}
                    </div>
                    <div className="mt-1 text-sm text-emerald-200/70">{t.emptyStateBody}</div>
                    <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                      <Link
                        href={`/add?lat=${userCoords.lat}&lng=${userCoords.lng}&place=${encodeURIComponent(locName || "")}`}
                        className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-tr from-accent-orange to-accent-pink px-4 py-2.5 text-sm font-bold text-white transition"
                      >
                        <Plus size={15} /> {t.emptyStateAdd}
                      </Link>
                      <a
                        href={`https://wa.me/?text=${encodeURIComponent(`${t.emptyStateTitle.replace("{place}", locName || "")} ${window.location.origin}/?lat=${userCoords.lat}&lng=${userCoords.lng}&place=${encodeURIComponent(locName || "")}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-4 py-2.5 text-sm font-bold text-emerald-200 transition hover:bg-emerald-500/25"
                      >
                        <MessageCircle size={15} /> {t.emptyStateShare}
                      </a>
                      <a
                        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${window.location.origin}/?lat=${userCoords.lat}&lng=${userCoords.lng}&place=${encodeURIComponent(locName || "")}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-xl border border-blue-500/40 bg-blue-500/15 px-4 py-2.5 text-sm font-bold text-blue-200 transition hover:bg-blue-500/25"
                      >
                        <Share2 size={15} /> {t.emptyStateShare}
                      </a>
                    </div>
                  </div>
                )}

                {/* Elsewhere in <district> — district-precision offers only */}
                {userCoords != null && elsewhere.length > 0 && (
                  <div className="mb-10">
                    <button
                      onClick={() => setElsewhereExpanded((v) => !v)}
                      className="flex w-full items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm font-semibold text-white/80 hover:bg-white/10 transition"
                      aria-expanded={elsewhereExpanded}
                    >
                      <span>
                        {t.elsewhereIn} ({elsewhere.reduce((n, g) => n + g.list.length, 0)})
                      </span>
                      <span className="text-white/50">{elsewhereExpanded ? "▴" : "▾"}</span>
                    </button>
                    {elsewhereExpanded &&
                      elsewhere.map((group) => (
                        <div key={group.district} className="mt-4">
                          <SectionHeading emoji="📍" title={`${t.elsewhereIn} ${group.district} (${group.list.length})`} />
                          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                            {group.list.slice(0, 12).map((o, i) => (
                              <OfferCard
                                key={o.id}
                                offer={o}
                                index={i}
                                distanceKm={o.distanceKm}
                                userCoords={userCoords}
                                onFirstSave={handleFirstSave}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                  </div>
                )}

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
                  {radiusInfo.radius === 25 && visibleList.filter((o) => !o.nationwide).length < 12 && (
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                      <span className="text-xs text-white/50">{t.notEnoughNearby}</span>
                      {[50, 100].map((r) => (
                        <button
                          key={r}
                          onClick={() => setFilters((f) => ({ ...f, radius: String(r) }))}
                          className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold text-white/80 hover:bg-white/10 transition"
                        >
                          {t.showMoreWithin} {r} {t.kmAway}
                        </button>
                      ))}
                    </div>
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
                            userCoords={userCoords}
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

      </main>

      <Confetti fire={fireConfetti} />
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
