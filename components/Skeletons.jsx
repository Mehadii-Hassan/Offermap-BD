"use client";

import { motion } from "framer-motion";

export function CardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5">
      {/* Matches the card's 16:10 image so nothing shifts when it resolves. */}
      <motion.div
        className="aspect-[16/10] w-full bg-white/5"
        animate={{ opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 1.4, repeat: Infinity }}
      />
      <div className="space-y-2 p-4">
        <div className="h-4 w-3/4 rounded bg-white/10" />
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-white/10" />
          <div className="h-3 w-28 rounded bg-white/10" />
          <div className="h-3 w-10 rounded bg-white/5" />
        </div>
        <div className="flex items-center justify-between pt-1">
          <div className="h-5 w-16 rounded bg-white/10" />
          <div className="h-4 w-14 rounded bg-white/5" />
        </div>
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