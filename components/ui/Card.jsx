"use client";

// Card primitive: a layered surface with soft border and shadow.
export default function Card({ className = "", children }) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md ${className}`}
      style={{ boxShadow: "var(--shadow-md)" }}
    >
      {children}
    </div>
  );
}