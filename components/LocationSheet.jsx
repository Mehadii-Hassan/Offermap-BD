"use client";

import { useState } from "react";
import { MapPin, Navigation, Search, LocateFixed } from "lucide-react";
import { useApp } from "@/lib/app-context";
import Sheet from "./ui/Sheet";
import { DIVISIONS } from "@/lib/offers";

// K1: shared location bottom sheet. Opened from the Hero pill; replaces the
// dead Hero division dropdown and the duplicate location bars. Always-available
// fallbacks: GPS, approximate network location, place search, drop pin, and a
// Division > District picker that actually applies a location.
export default function LocationSheet({
  open,
  onClose,
  onUseCurrent,
  onApproximate,
  onPickPlace,
  onPickPin,
  onPickDivision,
}) {
  const { t } = useApp();
  const [placeQuery, setPlaceQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [placeMsg, setPlaceMsg] = useState("");

  async function searchPlace() {
    const q = (placeQuery || "").trim();
    if (!q) return;
    setSearching(true);
    setPlaceMsg("");
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&countryCodes=bd&q=${encodeURIComponent(q)}`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      const data = await res.json();
      const first = Array.isArray(data) ? data[0] : null;
      if (first) {
        onPickPlace({ lat: parseFloat(first.lat), lng: parseFloat(first.lon), name: first.display_name });
      } else {
        setPlaceMsg(t.noResults);
      }
    } catch {
      setPlaceMsg(t.noResults);
    }
    setSearching(false);
  }

  function pickDivision(name) {
    const div = DIVISIONS.find((d) => d.name === name);
    if (!div) return;
    onPickDivision(div.name, div.districts?.[0]?.name || "");
  }

  return (
    <Sheet open={open} onClose={onClose} title={t.chooseLocation}>
      <div className="space-y-2">
        <button
          onClick={() => {
            onClose();
            onUseCurrent();
          }}
          className="flex w-full items-center gap-3 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-left text-sm font-semibold text-white transition hover:bg-white/15"
        >
          <LocateFixed size={18} className="shrink-0 text-accent-orange" />
          {t.useCurrent}
        </button>

        <button
          onClick={() => {
            onClose();
            onApproximate();
          }}
          className="flex w-full items-center gap-3 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-left text-sm font-semibold text-white transition hover:bg-white/15"
        >
          <Navigation size={18} className="shrink-0 text-accent-pink" />
          {t.approximateLocation}
        </button>

        <div className="flex items-center gap-2 pt-1">
          <div className="flex h-11 flex-1 items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3">
            <Search size={16} className="shrink-0 text-white/40" />
            <input
              value={placeQuery}
              onChange={(e) => setPlaceQuery(e.target.value)}
              placeholder={t.placeName || "Place name"}
              className="h-full w-full bg-transparent text-sm text-white placeholder-white/40 outline-none"
            />
          </div>
          <button
            onClick={searchPlace}
            disabled={searching || !placeQuery.trim()}
            className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-gradient-to-tr from-accent-orange to-accent-pink px-4 text-sm font-bold text-white disabled:opacity-50"
          >
            {searching ? "…" : t.search}
          </button>
        </div>
        {placeMsg ? <p className="text-xs text-white/50">{placeMsg}</p> : null}

        {onPickPin ? (
          <button
            onClick={() => {
              onClose();
              onPickPin();
            }}
            className="flex w-full items-center gap-3 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-left text-sm font-semibold text-white transition hover:bg-white/15"
          >
            <MapPin size={18} className="shrink-0 text-emerald-300" />
            {t.dropPin}
          </button>
        ) : null}

        {onPickDivision ? (
          <div className="pt-2">
            <p className="mb-1 text-xs font-semibold text-white/60">{t.chooseDistrict}</p>
            <div className="max-h-48 overflow-auto rounded-xl border border-white/15 bg-base">
              {DIVISIONS.map((d) => (
                <button
                  key={d.name}
                  onClick={() => {
                    onClose();
                    onPickDivision(d.name, d.districts?.[0]?.name || "");
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-white/80 transition hover:bg-white/10 hover:text-white"
                >
                  <MapPin size={14} className="text-accent-orange" />
                  <span>{d.name}</span>
                  <span className="ml-auto text-xs text-white/50">{d.bn}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </Sheet>
  );
}
