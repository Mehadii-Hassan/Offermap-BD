"use client";

// Button primitive: primary (signature gradient), secondary (glass), ghost.
export default function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}) {
  const base =
    "inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:opacity-50 disabled:pointer-events-none";
  const variants = {
    primary: "text-white shadow-lg shadow-accent-pink/30 hover:opacity-90",
    secondary: "bg-white/5 text-white/80 border border-white/15 hover:bg-white/10",
    ghost: "text-white/70 hover:text-white hover:bg-white/5",
  };
  const style =
    variant === "primary"
      ? { backgroundImage: "var(--gradient)" }
      : undefined;
  return (
    <button
      className={`${base} ${variants[variant] || variants.primary} ${className}`}
      style={style}
      {...props}
    >
      {children}
    </button>
  );
}