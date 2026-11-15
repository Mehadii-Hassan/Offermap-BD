"use client";

import { useEffect, useState, useRef } from "react";
import { getCategory } from "@/lib/categories";

// Target aspect ratio for cards (16:10).
const TARGET = 16 / 10;

// Reusable offer image.
// - Wraps in a fixed aspect ratio box (default 16:10) so cards don't cause
//   layout shift when the image loads.
// - Shows a category-gradient placeholder while loading and on missing/broken
//   images.
// - object-cover by default; if the loaded image's natural ratio does not match
//   the box by more than ~8%, it draws object-contain over a blurred zoomed copy
//   so nothing is cropped and the letterbox area is filled.
export default function OfferImage({
  offer,
  ratioClass = "aspect-[16/10]",
  urlClassName = "",
  placeholderClassName = "",
  alt = "",
  eager = false,
  hoverScale = true,
}) {
  const cat = getCategory(offer.category);
  const Icon = cat.icon;
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [odd, setOdd] = useState(false);
  const imgRef = useRef(null);

  // Reset state if the offer's image changes (e.g. list re-renders).
  useEffect(() => {
    setFailed(false);
    setLoaded(false);
    setOdd(false);
  }, [offer.image]);

  const showImage = Boolean(offer.image) && !failed;

  // If an image never finishes loading (server hangs) fall back to the
  // placeholder so a broken image never lingers.
  useEffect(() => {
    if (!showImage || loaded) return;
    const t = setTimeout(() => {
      if (imgRef.current && !imgRef.current.complete) setFailed(true);
    }, 8000);
    return () => clearTimeout(t);
  }, [showImage, loaded]);

  function handleLoad() {
    const el = imgRef.current;
    if (el && el.naturalWidth) {
      const ratio = el.naturalWidth / el.naturalHeight;
      setOdd(Math.abs(ratio - TARGET) / TARGET > 0.08);
    }
    setLoaded(true);
  }

  const hover = hoverScale ? " transition-transform duration-500 group-hover:scale-105" : "";

  if (!showImage) {
    return (
      <div
        className={`grid place-items-center bg-gradient-to-tr from-accent-orange via-accent-pink to-accent-purple relative overflow-hidden ${ratioClass} ${placeholderClassName}`}
      >
        <Icon size={40} className="text-white/80" />
      </div>
    );
  }

  const imgClass = `h-full w-full ${odd ? "object-contain" : "object-cover"}${hover} ${urlClassName}`;

  return (
    <div className={`relative overflow-hidden ${ratioClass} ${placeholderClassName}`}>
      {odd && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={offer.image}
          alt=""
          aria-hidden
          referrerPolicy="no-referrer"
          className="absolute inset-0 h-full w-full scale-110 object-cover opacity-90 blur-xl"
        />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={offer.image}
        alt={alt || `${offer.title} at ${offer.shopName}`}
        referrerPolicy="no-referrer"
        loading={eager ? "eager" : "lazy"}
        onLoad={handleLoad}
        onError={() => setFailed(true)}
        className={`relative ${imgClass}`}
      />
      {/* loading/bottom gradient: readable text while the image settles */}
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent transition-opacity duration-300 ${
          loaded ? "opacity-0" : "opacity-100"
        }`}
      />
    </div>
  );
}