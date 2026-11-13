"use client";

import { motion } from "framer-motion";

export function CardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5">
      <motion.div
        className="h-44 w-full bg-white/5"
        animate={{ opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 1.4, repeat: Infinity }}
      />
      <div className="space-y-3 p-4">
        <div className="h-3 w-24 rounded bg-white/10" />
        <motion.div
          className="h-4 w-4/5 rounded bg-white/10"
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 1.4, repeat: Infinity }}
        />
        <div className="h-3 w-1/2 rounded bg-white/5" />
        <div className="h-8 w-full rounded-xl bg-white/5" />
      </div>
    </div>
  );
}

export function GridSkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}