"use client";

import { motion } from "framer-motion";

export default function SectionHeading({ emoji, title, action }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="mb-4 flex items-end justify-between gap-3"
    >
      <h2 className="flex items-center gap-2 text-xl font-extrabold tracking-tight sm:text-2xl">
        <span
          className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-tr from-accent-orange/30 to-accent-purple/30 text-lg"
          aria-hidden
        >
          {emoji}
        </span>
        {title}
      </h2>
      {action}
    </motion.div>
  );
}