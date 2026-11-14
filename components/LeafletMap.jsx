"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Link from "next/link";
import { useApp } from "@/lib/app-context";
import { formatDistance } from "@/lib/offers";
import { isEndingSoon } from "./OfferCard";

// Fix default marker icon path resolution in bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

function makeIcon(selected, featured) {
  const color = featured ? "#a855f7" : selected ? "#ff3d77" : "#ff7a18";
  return L.divIcon({
    className: "",
    html: `<div style="
      width:${selected ? 40 : 32}px;height:${selected ? 40 : 32}px;
      background:${color};border-radius:50% 50% 50% 0;transform:rotate(-45deg);
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 4px 14px rgba(0,0,0,0.45);">
      <div style="width:${selected ? 20 : 15}px;height:${selected ? 20 : 15}px;
        background:white;border-radius:50%;transform:rotate(45deg);"></div>
    </div>`,
    iconSize: [selected ? 40 : 32, selected ? 40 : 32],
    iconAnchor: [selected ? 20 : 16, selected ? 40 : 32],
  });
}

export default function LeafletMap({ offers, userCoords, selectedId, onSelect }) {
  const { t } = useApp();
  const center = userCoords || { lat: 23.8103, lng: 90.4125 };

  return (
    <MapContainer
      center={center}
      zoom={userCoords ? 13 : 12}
      scrollWheelZoom
      className="h-full min-h-[60vh] w-full rounded-2xl z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {offers.map((offer) => (
        <Marker
          key={offer.id}
          position={[offer.lat, offer.lng]}
          icon={makeIcon(String(offer.id) === String(selectedId), offer.isFeatured)}
          eventHandlers={{ click: () => onSelect(offer.id) }}
        >
          <Popup>
            <div className="min-w-[180px]">
              <div className="mb-1 text-xs text-gray-600">
                {offer.shopName} · {offer.area}
              </div>
              <div className="text-sm font-bold">{offer.title}</div>
              <div className="mt-1 text-xs font-bold text-pink-600">
                {offer.discountText}
              </div>
              {userCoords && (
                <div className="mt-1 text-[11px] text-gray-500">
                  {formatDistance(
                    Math.hypot(
                      offer.lat - userCoords.lat,
                      offer.lng - userCoords.lng
                    ) * 111
                  )}
                </div>
              )}
              {offer.isOngoing ? (
                <div className="mt-1 text-[11px] font-bold uppercase text-purple-500">
                  {t.ongoing} · {t.endDateNotConfirmed}
                </div>
              ) : isEndingSoon(offer) ? (
                <div className="text-[11px] font-bold uppercase text-red-500">
                  {t.endingSoonBadge}
                </div>
              ) : null}
              <Link
                href={`/offer/${offer.id}`}
                className="mt-2 inline-block rounded-lg bg-gradient-to-tr from-pink-500 to-purple-600 px-3 py-1.5 text-xs font-bold text-white"
              >
                {t.open} →
              </Link>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}