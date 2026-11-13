"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { List, Map as MapIcon } from "lucide-react";
import Hero from "./Hero";
import CategoryChips from "./CategoryChips";
import FilterBar from "./FilterBar";
import SectionHeading from "./SectionHeading";
import OfferCard from "./OfferCard";
import MapView from "./MapView";
import Confetti from "./Confetti";
import { GridSkeleton } from "./Skeletons";
import EmptyState from "./EmptyState";
import AdSlot from "./AdSlot";
import { useApp } from "@/lib/app-context";
import {
  getAllOffers,
  getHotOffers,
  getEndingSoon,
  getTodayTopFive,
  getNearbyOffers,
  distanceToOffer,
  discountValue,
} from "@/lib/offers";

const TOP_AREAS = [
  { name: "Dhanmondi", lat: 23.7461, lng: 90.3762 },
  { name: "Gulshan", lat: 23.7925, lng: 90.4064 },
  { name: "Banani", lat: 23.7937, lng: 90.4066 },
  { name: "Uttara", lat: 23.8759, lng: 90.3795 },
  { name: "Mirpur", lat: 23.8101, lng: 90.3559 },
  { name: "Mohammadpur", lat: 23.7657, lng: 90.3567 },
  { name: "Old Dhaka", lat: 23.7100, lng: 90.4100 },
];

export default function HomeClient() {
  const { t } = useApp();
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [view, setView] = useState("list");
  const [userCoords, setUserCoords] = useState(null);
  const [fireConfetti, setFireConfetti] = useState(false);
  const [selectedMapId, setSelectedMapId] = useState(null);

  const [filters, setFilters] = useState({
    category: "All",
    area: "All",
    payment: "Any",
    sort: "nearest",
  });

  // simulate a short loading to showcase skeletons
  useEffect(() => {
    const id = setTimeout(() => setLoading(false), 700);
    return () => clearTimeout(id);
  }, []);

  const searchRes = useMemo(() => {
    if (!query.trim()) return null;
    const norm = query.trim().toLowerCase();
    return getAllOffers().filter(
      (o) =>
        o.title.toLowerCase().includes(norm) ||
        o.shopName.toLowerCase().includes(norm) ||
        o.category.toLowerCase().includes(norm) ||
        o.area.toLowerCase().includes(norm)
    );
  }, [query]);

  const baseList = searchRes != null ? searchRes : getAllOffers();

  const filteredList = useMemo(() => {
    let list = baseList;
    if (filters.category !== "All")
      list = list.filter((o) => o.category === filters.category);
    if (filters.area !== "All") list = list.filter((o) => o.area === filters.area);
    if (filters.payment !== "Any")
      list = list.filter((o) => o.paymentMethod === filters.payment);

    const withDist = list.map((o) => ({
      ...o,
      distanceKm:
        userCoords != null ? distanceToOffer(o, userCoords.lat, userCoords.lng) : null,
    }));

    switch (filters.sort) {
      case "ending":
        withDist.sort(
          (a, b) => new Date(a.validTill) - new Date(b.validTill)
        );
        break;
      case "discount":
        withDist.sort((a, b) => discountValue(b) - discountValue(a));
        break;
      case "nearest":
      default:
        withDist.sort((a, b) => {
          if (a.distanceKm != null && b.distanceKm != null)
            return a.distanceKm - b.distanceKm;
          return b.isFeatured - a.isFeatured || b.hotScore - a.hotScore;
        });
    }
    return withDist;
  }, [baseList, filters, userCoords]);

  const hot = getHotOffers(8);
  const ending = getEndingSoon(8);
  const topFive = getTodayTopFive();
  const featured = getAllOffers().filter((o) => o.isFeatured).slice(0, 3);

  const nearOffers = useMemo(() => {
    if (!userCoords) return [];
    return getNearbyOffers(userCoords.lat, userCoords.lng, 8);
  }, [userCoords]);

  function handleNearMe(coords) {
    setUserCoords(coords);
    setView("list");
    setSelectedMapId(null);
    document.getElementById("near-you")?.scrollIntoView({ behavior: "smooth" });
  }

  function handleFirstSave() {
    setFireConfetti(true);
    setTimeout(() => setFireConfetti(false), 3000);
  }

  return (
    <>
      <Hero onSearch={setQuery} onNearMe={handleNearMe} />

      {/* Category chips */}
      <div className="mx-auto max-w-6xl px-4 py-3">
        <CategoryChips active={activeCategory} onSelect={setActiveCategory} />
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
              setActiveCategory(f.category);
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
                  offers={baseList}
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
                  <SectionHeading emoji="✨" title={`${filteredList.length} ${t.results}`} />
                  {loading ? (
                    <GridSkeleton />
                  ) : filteredList.length === 0 ? (
                    <EmptyState />
                  ) : (
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                      {filteredList.map((o, i) => (
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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={offer.image}
              alt={offer.title}
              loading="lazy"
              className="h-full w-full object-cover"
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