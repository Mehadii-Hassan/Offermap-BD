"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useApp } from "@/lib/app-context";
import { ACTIVE_CATEGORIES, getCategory, fallbackIcon } from "@/lib/categories";

// Never render an undefined component: if a category carries no usable lucide
// icon, fall back to the "Other" icon, then to a generic Sparkles icon.
function safeIcon(c) {
  const icon = (c && c.icon) || (c && getCategory(c.key).icon) || fallbackIcon();
  return typeof icon === "function" ? icon : fallbackIcon();
}

// Horizontal category rail: large icon tiles with the offer count. Snap
// scrolling, active state, and the active tile deselects on a second tap
// (handled by the parent's onSelect). The rail keeps the `.no-scrollbar` class
// so existing e2e selectors and scroll behaviour keep working.
export default function CategoryRail({ active, onSelect, counts = {}, total = 0 }) {
  const { t } = useApp();
  const reduce = useReducedMotion();

  const items = [
    { label: t.categoryAll, value: "All", icon: safeIcon({ key: "All" }), count: total },
    ...ACTIVE_CATEGORIES.filter((c) => (counts[c.key] || 0) > 0).map((c) => ({
      label: c.en,
      value: c.key,
      icon: safeIcon(c),
      count: counts[c.key] || 0,
    })),
  ];

  return (
    <div
      className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 py-2"
      role="group"
      aria-label={t.filterCategory}
    >
      {items.map((item, i) => {
        const Icon = item.icon;
        const isActive = active === item.value;
        return (
          <motion.button
            key={item.value}
            type="button"
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: reduce ? 0 : i * 0.03 }}
            onClick={() => onSelect(item.value)}
            aria-pressed={isActive}
            className={`relative flex w-[76px] shrink-0 snap-start flex-col items-center gap-1.5 rounded-2xl border px-2 py-3 transition ${
              isActive
                ? "border-transparent text-white"
                : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
            }`}
          >
            {isActive && (
              <motion.span
                layoutId="chip-active"
                className="absolute inset-0 rounded-2xl"
                style={{ backgroundImage: "var(--gradient)" }}
                transition={
                  reduce
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 400, damping: 30 }
                }
              />
            )}
            <Icon size={22} className="relative shrink-0" />
            <span className="relative line-clamp-1 w-full text-center text-[11px] font-semibold leading-tight">
              {item.label}
            </span>
            {typeof item.count === "number" && (
              <span
                className={`relative rounded-full px-1.5 text-[10px] font-bold ${
                  isActive ? "bg-white/25 text-white" : "bg-white/10 text-white/70"
                }`}
              >
                {item.count}
              </span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}