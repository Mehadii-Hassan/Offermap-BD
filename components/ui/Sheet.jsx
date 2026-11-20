"use client";

import { useEffect } from "react";

// Sheet primitive: a bottom sheet. Closes on Esc or backdrop click.
export default function Sheet({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape" && onClose) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className="relative w-full max-w-lg rounded-t-3xl border border-white/10 bg-surface p-4 pb-6"
        style={{ boxShadow: "var(--shadow-lg)" }}
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-white/20" />
        {title ? <h2 className="mb-2 text-base font-bold text-white">{title}</h2> : null}
        {children}
      </div>
    </div>
  );
}