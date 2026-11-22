"use client";

import { useEffect } from "react";

// Client-side error monitor: sends sanitized window errors and unhandled
// rejections to /api/client-error, stored in activity_log as 'client_error'.
export default function ErrorMonitor() {
  useEffect(() => {
    let lastSend = 0;
    const MIN_INTERVAL = 10 * 1000; // 10s client-side rate limit

    const send = (message, path, uaClass) => {
      const now = Date.now();
      if (now - lastSend < MIN_INTERVAL) return;
      lastSend = now;
      const msg = String(message || "").slice(0, 200);
      const p = String(path || window.location.pathname || "").slice(0, 200);
      const noise = /chrome-extension|browser-extension|webstore|googleapis|gstatic|facebook\.net|doubleclick|googletagmanager|googlesyndication|analytics\.js|gtm\.js|\.css|\.png|\.jpg|\.jpeg|\.svg|\.woff|\.woff2|\.ttf|\.ico/i;
      if (noise.test(msg) || noise.test(p)) return;
      try {
        if (typeof fetch !== "undefined") {
          fetch("/api/client-error", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: msg, path: p, uaClass }),
          }).catch(() => {});
        }
      } catch {}
    };

    const uaClass = (() => {
      const ua = navigator.userAgent || "";
      if (/iphone|ipod|ipad|android.*mobile|mobi/i.test(ua)) return "mobile";
      if (/tablet|ipad|silk|kindle/i.test(ua)) return "tablet";
      return "desktop";
    })();

    const onError = (msg, url, line, col, error) => {
      send(String(msg), url, uaClass);
      return false;
    };

    const onUnhandledRejection = (event) => {
      let reason = "";
      try {
        reason = event && event.reason ? String(event.reason) : String(event);
      } catch {}
      send(reason, window.location.pathname, uaClass);
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return null;
}
