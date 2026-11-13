"use client";

import { useEffect } from "react";
import { Navigation } from "lucide-react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useApp } from "@/lib/app-context";

// Leaflet touches `window` at module load, so this module must only ever be
// loaded in the browser (via dynamic import with ssr:false).

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

function pinIcon() {
  return L.divIcon({
    className: "",
    html: `<div style="
      width:36px;height:36px;
      background:#ff3d77;border-radius:50% 50% 50% 0;transform:rotate(-45deg);
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 4px 14px rgba(0,0,0,0.45);">
      <div style="width:16px;height:16px;background:white;border-radius:50%;transform:rotate(45deg);"></div>
    </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
  });
}

function MapClickHandler({ onMapClick }) {
  const map = useMap();
  useEffect(() => {
    map.on("click", onMapClick);
    return () => {
      map.off("click", onMapClick);
    };
  }, [map, onMapClick]);
  return null;
}

export default function LocationPickerMap({
  center,
  zoom,
  markerLat,
  markerLng,
  onMapClick,
  onCurrentLocation,
  markerLabel = "",
  markerAddress = "",
}) {
  const { t } = useApp();
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10">
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom
        className="h-[320px] w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickHandler onMapClick={onMapClick} />
        <Marker position={[markerLat, markerLng]} icon={pinIcon()}>
          <Popup>
            <div className="min-w-[180px]">
              <div className="text-xs text-gray-600">{markerLabel}</div>
              <div className="text-sm font-bold">
                {markerLat.toFixed(4)}, {markerLng.toFixed(4)}
              </div>
              {markerAddress && (
                <div className="mt-1 text-xs text-gray-500">{markerAddress}</div>
              )}
            </div>
          </Popup>
        </Marker>
      </MapContainer>
      <button
        type="button"
        onClick={onCurrentLocation}
        className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full bg-purple-600 px-3 py-2 text-xs font-semibold text-white hover:bg-purple-500 transition"
      >
        <Navigation className="w-3 h-3" />
        {t.useCurrentLocation}
      </button>
    </div>
  );
}