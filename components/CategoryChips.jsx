"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useApp } from "@/lib/app-context";
import { CATEGORIES, getCategory } from "@/lib/categories";

const FALLBACK_ICON = Sparkles;

// Never render an undefined component: if a category carries no usable lucide
// icon, fall back to the "Other" icon, then to a generic Sparkles icon.
function safeIcon(c) {
  const icon = (c && c.icon) || (c && getCategory(c.key).icon);
  return typeof icon === "function" ? icon : FALLBACK_ICON;
}

export default function CategoryChips({ active, onSelect }) {
  const { t } = useApp();
  const items = [
    { label: t.categoryAll, value: "All", icon: FALLBACK_ICON },
    ...CATEGORIES.filter((c) => c.key !== "Other").map((c) => ({
      label: c.en,
      value: c.key,
      icon: safeIcon(c),
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
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            onClick={() => onSelect(item.value)}
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
          </motion.button>
        );
      })}
    </div>
  );
}