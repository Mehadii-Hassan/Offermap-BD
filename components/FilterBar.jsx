"use client";

import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { useApp } from "@/lib/app-context";
import { CATEGORIES, AREAS, PAYMENT_METHODS } from "@/lib/offers";

export default function FilterBar({ filters, onChange }) {
  const { t } = useApp();
  const [open, setOpen] = useState(false);

  const set = (key, val) => onChange({ ...filters, [key]: val });

  const selectCls =
    "w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-accent-purple";

  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => setOpen((o) => !o)}
          className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/80 hover:bg-white/10 transition"
        >
          <SlidersHorizontal size={16} />
          {t.filter}
          {open && <X size={14} />}
        </button>

        <p className="text-xs text-white/40">{t.results}</p>
      </div>

      {open && (
        <div className="mt-4 grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-white/50">
              {t.filterCategory}
            </span>
            <select
              value={filters.category}
              onChange={(e) => set("category", e.target.value)}
              className={selectCls}
            >
              <option value="All" className="bg-base">
                {t.categoryAll}
              </option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c} className="bg-base">
                  {c}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-white/50">
              {t.filterArea}
            </span>
            <select
              value={filters.area}
              onChange={(e) => set("area", e.target.value)}
              className={selectCls}
            >
              <option value="All" className="bg-base">
                {t.allAreas}
              </option>
              {AREAS.map((a) => (
                <option key={a} value={a} className="bg-base">
                  {a}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-white/50">
              {t.filterPayment}
            </span>
            <select
              value={filters.payment}
              onChange={(e) => set("payment", e.target.value)}
              className={selectCls}
            >
              {PAYMENT_METHODS.map((p) => (
                <option key={p} value={p} className="bg-base">
                  {p}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-white/50">
              {t.sortBy}
            </span>
            <select
              value={filters.sort}
              onChange={(e) => set("sort", e.target.value)}
              className={selectCls}
            >
              <option value="nearest" className="bg-base">
                {t.sortNearest}
              </option>
              <option value="ending" className="bg-base">
                {t.sortEnding}
              </option>
              <option value="discount" className="bg-base">
                {t.sortDiscount}
              </option>
            </select>
          </label>

          <button
            onClick={() =>
              onChange({ category: "All", area: "All", payment: "Any", sort: "nearest" })
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/70 hover:bg-white/10 transition !h-fit !mt-1 sm:!mt-0"
          >
            <X size={14} /> {t.clearFilters}
          </button>
        </div>
      )}
    </div>
  );
}