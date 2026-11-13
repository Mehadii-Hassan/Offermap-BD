"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const COLORS = ["#ff7a18", "#ff3d77", "#a855f7", "#facc15", "#34d399", "#38bdf8"];

function makePieces(count = 60) {
  return Array.from({ length: count }).map((_, i) => ({
    id: i,
    x: 20 + Math.random() * 60,
    delay: Math.random() * 0.2,
    rotate: Math.random() * 360,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    size: 6 + Math.random() * 8,
    duration: 1.4 + Math.random() * 1,
  }));
}

export default function Confetti({ fire }) {
  const [pieces, setPieces] = useState([]);

  useEffect(() => {
    if (fire) {
      setPieces(makePieces());
      const id = setTimeout(() => setPieces([]), 2600);
      return () => clearTimeout(id);
    }
    return undefined;
  }, [fire]);

  if (!fire || pieces.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          initial={{ x: `${p.x}vw`, y: "-5vh", opacity: 1, rotate: 0 }}
          animate={{ y: "110vh", opacity: 0.9, rotate: p.rotate * 3 }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: "linear",
          }}
          style={{
            position: "absolute",
            width: p.size,
            height: p.size * 0.6,
            backgroundColor: p.color,
            borderRadius: 2,
          }}
        />
      ))}
    </div>
  );
}