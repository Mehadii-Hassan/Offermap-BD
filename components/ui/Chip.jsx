"use client";

// Chip primitive: a pill toggle/button. `active` fills it with the gradient.
export default function Chip({ active = false, className = "", children, ...props }) {
  return (
    <button
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 ${
        active
          ? "border-transparent text-white shadow"
          : "border-white/15 bg-white/5 text-white/70 hover:bg-white/10"
      } ${className}`}
      style={active ? { backgroundImage: "var(--gradient)" } : undefined}
      aria-pressed={active}
      {...props}
    >
      {children}
    </button>
  );
}