"use client";

import { MapPin } from "lucide-react";
import { useApp } from "@/lib/app-context";
import { getPrecision } from "@/lib/precision";

export default function PrecisionBadge({ offer, className = "" }) {
  const { t } = useApp();
  const p = getPrecision(offer);
  let label;
  if (p === "exact") label = t.precisionExact;
  else if (p === "area") label = t.precisionArea;
  else label = offer.district ? `${t.precisionDistrict}: ${offer.district}` : t.precisionDistrict;

  const cls =
    p === "exact"
      ? "bg-emerald-500/15 text-emerald-300"
      : p === "area"
        ? "bg-sky-500/15 text-sky-300"
        : "bg-white/10 text-white/60";

  return (
    <span
      title={p === "district" ? t.precisionUnavailable : ""}
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${cls} ${className}`}
    >
      <MapPin size={10} />
      {label}
    </span>
  );
}