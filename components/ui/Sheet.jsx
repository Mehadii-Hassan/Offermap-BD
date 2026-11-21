"use client";

import { useEffect, useRef } from "react";

// Sheet primitive: a bottom sheet. Closes on Esc or backdrop click; keeps
// focus trapped inside while open, locks body scroll, uses safe-area padding
// and restores focus on close (K3).
export default function Sheet({ open, onClose, title, children }) {
  const dialogRef = useRef(null);
  const prevFocus = useRef(null);

  useEffect(() => {
    if (!open) return;
    prevFocus.current = document.activeElement;
    const dialog = dialogRef.current;
    if (dialog) dialog.focus();

    const onKey = (e) => {
      if (e.key === "Escape" && onClose) onClose();
      if (e.key === "Tab" && dialog) {
        const focusables = dialog.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement;
        if (e.shiftKey) {
          if (active === first || active === dialog) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (active === last || active === dialog) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      if (prevFocus.current && typeof prevFocus.current.focus === "function") {
        prevFocus.current.focus();
      }
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      role="dialog"
      aria-modal="true"
      ref={dialogRef}
      tabIndex={-1}
    >
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className="relative w-full max-w-lg rounded-t-3xl border border-white/10 bg-surface p-4 pb-[max(6px,env(safe-area-inset-bottom))] focus:outline-none"
        style={{ boxShadow: "var(--shadow-lg)" }}
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-white/20" />
        {title ? <h2 className="mb-2 text-base font-bold text-white">{title}</h2> : null}
        {children}
      </div>
    </div>
  );
}
