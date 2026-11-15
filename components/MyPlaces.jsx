"use client";

import { useState } from "react";
import { MapPin, Plus, Locate, Trash2 } from "lucide-react";
import { useApp } from "@/lib/app-context";

// Top bar: "📍 Offers near: [place]" + saved-place switcher + actions.
export default function MyPlaces({ places, active, onSelect, onGps, onAdd, onRename, onRemove }) {
  const { t } = useApp();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [renaming, setRenaming] = useState(null);

  const current = places.find((p) => p.id === active);
  const label = current ? current.name : t.nearYouDerived;

  return (
    <div className="mx-auto max-w-6xl px-4 pt-3">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/70">
        <MapPin size={14} className="text-accent-orange" />
        <span className="font-semibold text-white/85">
          {t.yourLocation}: {label}
        </span>
        <button onClick={onGps} className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-2 py-1 text-xs font-semibold text-white/70 hover:bg-white/10 transition">
          <Locate size={12} /> {t.useCurrent}
        </button>
        <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-2 py-1 text-xs font-semibold text-white/70 hover:bg-white/10 transition">
          <Plus size={12} /> {t.savePlace}
        </button>
        <button onClick={() => onSelect(null)} className="ml-auto rounded-lg border border-white/15 px-2 py-1 text-xs text-white/60 hover:bg-white/10 transition">
          {t.clearLocation}
        </button>
      </div>

      {places.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {places.map((p) => (
            <span
              key={p.id}
              onClick={() => onSelect(p)}
              className={`inline-flex items-center gap-1.5 cursor-pointer rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                p.id === active ? "bg-accent-purple/30 text-white" : "bg-white/5 text-white/60 hover:bg-white/10"
              }`}
            >
              {p.name}
            </span>
          ))}
        </div>
      )}

      {adding && (
        <div className="mt-2 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.placeName}
            className="min-w-0 flex-1 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none"
          />
          <button
            onClick={() => { onAdd(name || "My place"); setName(""); setAdding(false); }}
            disabled={!name}
            className="rounded-lg bg-gradient-to-tr from-accent-orange to-accent-pink px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
          >
            {t.addPlaceBtn}
          </button>
          <button onClick={() => setAdding(false)} className="rounded-lg border border-white/15 px-2 py-2 text-xs text-white/60">{t.cancel}</button>
        </div>
      )}

      {renaming && (
        <div className="mt-2 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none"
          />
          <button
            onClick={() => { onRename(renaming, name); setRenaming(null); }}
            disabled={!name}
            className="rounded-lg bg-accent-purple/30 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
          >
            {t.saveBtn}
          </button>
          <button onClick={() => onRemove(renaming) && setRenaming(null)} className="rounded-lg border border-red-500/40 px-2 py-2 text-xs text-red-300">
            <Trash2 size={14} />
          </button>
          <button onClick={() => setRenaming(null)} className="rounded-lg border border-white/15 px-2 py-2 text-xs text-white/60">{t.cancel}</button>
        </div>
      )}
    </div>
  );
}