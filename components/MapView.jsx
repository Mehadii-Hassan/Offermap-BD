"use client";

import dynamic from "next/dynamic";

// Leaflet touches `window` at module load, so it must never be server-rendered.
const LeafletMap = dynamic(
  () => import("./LeafletMap"),
  { ssr: false, loading: () => <MapFallback /> }
);

function MapFallback() {
  return (
    <div
      className="grid h-[60vh] w-full place-items-center rounded-2xl border border-white/10 bg-white/5 text-sm text-white/40"
      aria-busy="true"
    >
      Loading map…
    </div>
  );
}

export default function MapView(props) {
  return <LeafletMap {...props} />;
}