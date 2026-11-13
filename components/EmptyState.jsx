"use client";

import { motion } from "framer-motion";
import { SearchX } from "lucide-react";
import { useApp } from "@/lib/app-context";

export default function EmptyState({ title, message }) {
  const { t } = useApp();
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-white/15 bg-white/5 px-6 py-16 text-center"
    >
      <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-tr from-accent-orange/30 to-accent-purple/30">
        <SearchX size={30} className="text-white/60" />
      </div>
      <h3 className="font-bold text-white">{title || t.noResults}</h3>
      <p className="max-w-sm text-sm text-white/50">
        {message ||
          "Try removing some filters or choosing a different category or area."}
      </p>
    </motion.div>
  );
}