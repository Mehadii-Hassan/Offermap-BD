"use client";

import { useState } from "react";
import { getCategory } from "@/lib/categories";

// Reusable offer image with a category-gradient placeholder fallback.
// - If the offer has a validated image URL, render a plain <img> that hotlink
//   protects via referrerPolicy="no-referrer" and lazily loads; onError swaps
//   to the placeholder so a blocked image never shows a broken icon.
// - If there is no image, render the gradient + category icon placeholder.
export default function OfferImage({
  offer,
  imgClassName = "",
  urlClassName = "h-full w-full object-cover",
  placeholderClassName = "",
  alt = "",
  eager = false,
}) {
  const cat = getCategory(offer.category);
  const Icon = cat.icon;
  const [failed, setFailed] = useState(false);

  if (offer.image && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={offer.image}
        alt={alt || `${offer.title} at ${offer.shopName}`}
        referrerPolicy="no-referrer"
        loading={eager ? "eager" : "lazy"}
        onError={() => setFailed(true)}
        className={`${urlClassName} ${imgClassName}`}
      />
    );
  }

  return (
    <div
      className={`grid place-items-center bg-gradient-to-tr from-accent-orange via-accent-pink to-accent-purple ${placeholderClassName} ${imgClassName}`}
    >
      <Icon size={40} className="text-white/80" />
    </div>
  );
}