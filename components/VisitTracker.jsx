"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const VKEY = "om-visitor-id";

function getVisitorId() {
  if (typeof window === "undefined") return "";
  try {
    let id = localStorage.getItem(VKEY);
    if (!id) {
      id = "v-" + crypto.randomUUID();
      localStorage.setItem(VKEY, id);
    }
    return id;
  } catch (e) {
    // localStorage unavailable; fall back to a random id per session
    return "v-" + Date.now().toString(36);
  }
}

// Sends an anonymous visit event to /api/track on each page view. Uses
// sendBeacon when available (fires during unload/background), else fetch.
export default function VisitTracker() {
  const pathname = usePathname();
  const ref = useRef({ last: null });

  useEffect(() => {
    if (ref.current.last === pathname) return;
    ref.current.last = pathname;
    const visitor_id = getVisitorId();
    const payload = {
      path: pathname || "/",
      referrer: document.referrer || "",
      visitor_id,
    };
    const blob = new Blob([JSON.stringify(payload)], {
      type: "application/json",
    });
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/track", blob);
    } else {
      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {});
    }
  }, [pathname]);

  return null;
}