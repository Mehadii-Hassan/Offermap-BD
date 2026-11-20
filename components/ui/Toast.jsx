"use client";

// Toast primitive: a transient status message.
export default function Toast({ message, show = false }) {
  if (!show || !message) return null;
  return (
    <div
      className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-white/10 bg-surface-2 px-4 py-2 text-sm text-white shadow-lg"
      role="status"
    >
      {message}
    </div>
  );
}