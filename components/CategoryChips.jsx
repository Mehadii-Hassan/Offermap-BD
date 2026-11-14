"use client";

import { motion } from "framer-motion";
import { useApp } from "@/lib/app-context";
import { ACTIVE_CATEGORIES, getCategory, fallbackIcon } from "@/lib/categories";

// Never render an undefined component: if a category carries no usable lucide
// icon, fall back to the "Other" icon, then to a generic Sparkles icon.
function safeIcon(c) {
  const icon = (c && c.icon) || (c && getCategory(c.key).icon) || fallbackIcon();
  return typeof icon === "function" ? icon : fallbackIcon();
}

export default function CategoryChips({ active, onSelect, counts = {}, total = 0 }) {
  const { t } = useApp();

  // "All" chip first (always shown), then each category that has at least one
  // offer. Categories with 0 offers are hidden.
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
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 py-1">
      {items.map((item, i) => {
        const Icon = item.icon;
        const isActive = active === item.value;
        return (
          <motion.button
            key={item.value}
            type="button"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            onClick={() => onSelect(item.value)}
            aria-pressed={isActive}
            className={`relative flex shrink-0 items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition ${
              isActive
                ? "border-transparent text-white"
                : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
            }`}
          >
            {isActive && (
              <motion.span
                layoutId="chip-active"
                className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-accent-orange via-accent-pink to-accent-purple"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <Icon size={16} className="relative shrink-0" />
            <span className="relative whitespace-nowrap">{item.label}</span>
            {typeof item.count === "number" && (
              <span
                className={`relative rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
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