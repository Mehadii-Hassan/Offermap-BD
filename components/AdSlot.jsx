// AdSlot renders NOTHING unless ads are explicitly enabled via
// NEXT_PUBLIC_ADS_ENABLED === "true" and NEXT_PUBLIC_ADSENSE_CLIENT is set.
// The AdSense script is injected only in that case.
"use client";

import { useEffect, useState } from "react";

const ADSENSE_ENABLED = process.env.NEXT_PUBLIC_ADS_ENABLED === "true";
const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT || "";

export default function AdSlot({ variant = "banner", className = "" }) {
  const [scriptReady, setScriptReady] = useState(false);

  useEffect(() => {
    if (!ADSENSE_ENABLED || !ADSENSE_CLIENT) return;
    if (document.getElementById("offermap-adsense")) {
      setScriptReady(true);
      return;
    }
    const script = document.createElement("script");
    script.id = "offermap-adsense";
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
    script.async = true;
    script.onload = () => setScriptReady(true);
    document.head.appendChild(script);
    return () => {
      const el = document.getElementById("offermap-adsense");
      if (el) el.remove();
    };
  }, []);

  if (!ADSENSE_ENABLED || !ADSENSE_CLIENT) return null;

  return (
    <div
      data-ad-slot={variant}
      className={`flex items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/5 py-5 text-xs tracking-widest text-white/40 ${className}`}
      aria-hidden="true"
    >
      <ins className="adsbygoogle" style={{ display: "block" }} />
    </div>
  );
}
