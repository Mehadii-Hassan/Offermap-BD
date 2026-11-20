"use client";

// Badge primitive: a small status/label pill.
export default function Badge({ tone = "accent", className = "", children }) {
  const tones = {
    accent: "bg-accent/15 text-accent",
    muted: "bg-white/10 text-white/70",
    success: "bg-emerald-500/15 text-emerald-300",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold ${tones[tone] || tones.accent} ${className}`}
    >
      {children}
    </span>
  );
}