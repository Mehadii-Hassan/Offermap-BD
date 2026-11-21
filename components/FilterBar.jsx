"use client";

import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { useApp } from "@/lib/app-context";
import { countOffers } from "@/lib/filters";
import { CATEGORIES, PAYMENT_METHODS, DIVISIONS } from "@/lib/offers";

const RADII = ["5", "10", "25", "50", "100"];

export default function FilterBar({ filters, onChange, offers = [] }) {
  const { t } = useApp();
  const [open, setOpen] = useState(false);

  const set = (key, val) => onChange({ ...filters, [key]: val });

  // Live count of offers matching the current filter selections (BATCH K6).
  const applyCount = offers
    ? countOffers(offers, {
        category: filters.category,
        division: filters.division,
        district: filters.district,
        payment: filters.payment,
      })
    : 0;

  const selectCls =
    "w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-accent-purple";

  const selectedDivision = DIVISIONS.find((d) => d.name === filters.division);
  const districts = selectedDivision ? selectedDivision.districts : [];

  function clear() {
    onChange({
      category: "All",
      division: "All",
      district: "All",
      payment: "Any",
      radius: "Any",
      sort: "nearest",
    });
  }

  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setOpen((o) => !o)}
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/80 hover:bg-white/10 transition"
          >
            <SlidersHorizontal size={16} />
            {t.filter}
            {open && <X size={14} />}
          </button>
          <button
            onClick={() => setOpen(false)}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-tr from-accent-orange to-accent-pink px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-accent-pink/30 hover:opacity-90 transition"
          >
            {t.applyFilters} ({applyCount})
          </button>
        </div>

        <p className="text-xs text-white/40">{t.results}</p>
      </div>

      {open && (
        <div className="mt-4 grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 sm:grid-cols-2 lg:grid-cols-3">
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
              {t.filterDivision}
            </span>
            <select
              value={filters.division}
              onChange={(e) =>
                onChange({
                  ...filters,
                  division: e.target.value,
                  district: "All",
                })
              }
              className={selectCls}
            >
              <option value="All" className="bg-base">
                {t.allDivisions}
              </option>
              {DIVISIONS.map((d) => (
                <option key={d.name} value={d.name} className="bg-base">
                  {d.name} · {d.bn}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-white/50">
              {t.filterDistrict}
            </span>
            <select
              value={filters.district}
              onChange={(e) => set("district", e.target.value)}
              disabled={!selectedDivision}
              className={`${selectCls} disabled:opacity-50`}
            >
              <option value="All" className="bg-base">
                {t.allDistricts}
              </option>
              {districts.map((d) => (
                <option key={d.name} value={d.name} className="bg-base">
                  {d.name} · {d.bn}
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
              {t.filterRadius}
            </span>
            <select
              value={filters.radius}
              onChange={(e) => set("radius", e.target.value)}
              className={selectCls}
            >
              <option value="Any" className="bg-base">
                {t.radiusAny}
              </option>
              {RADII.map((r) => (
                <option key={r} value={r} className="bg-base">
                  {r} km
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

          <div className="flex items-end">
            <button
              onClick={clear}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/70 hover:bg-white/10 transition"
            >
              <X size={14} /> {t.clearFilters}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}