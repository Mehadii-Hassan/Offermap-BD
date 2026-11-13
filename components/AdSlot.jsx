// PLACEHOLDER for future ad placements.
// To integrate Google AdSense later, render your ad unit inside this component
// (e.g. <ins className="adsbygoogle" .../>) and follow Google's policy.
// No real ad code is included yet.
export default function AdSlot({ variant = "banner", className = "" }) {
  return (
    <div
      data-ad-slot={variant}
      className={`flex items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/5 py-5 text-xs tracking-widest text-white/40 ${className}`}
      aria-hidden="true"
    >
      {/* FUTURE AD CODE PLACED HERE */}
      AD SLOT · {variant}
    </div>
  );
}