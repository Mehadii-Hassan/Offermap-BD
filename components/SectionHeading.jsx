"use client";

import { motion } from "framer-motion";

export default function SectionHeading({ emoji, title, count, action }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="mb-4 flex items-end justify-between gap-3"
    >
      <h2 className="flex min-w-0 items-center gap-2 text-lg font-extrabold tracking-tight sm:text-2xl">
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-tr from-accent-orange/30 to-accent-purple/30 text-lg"
          aria-hidden
        >
          {emoji}
        </span>
        <span className="truncate">{title}</span>
        {count != null && (
          <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-xs font-bold text-white/70">
            {count}
          </span>
        )}
      </h2>
      {action}
    </motion.div>
  );
}