import { ImageResponse } from "next/og";

// Dynamic Open Graph image: brand gradient, discount, shop and area text.
// Bilingual-safe: uses self-hosted Next fonts (Latin + Hind Siliguri for Bangla).
export const config = { runtime: "edge" };

export default function Image({ searchParams }: { searchParams: { [key: string]: string } }) {
  const title = searchParams.title || "OfferMap BD";
  const shop = searchParams.shop || "";
  const area = searchParams.area || "";
  const discount = searchParams.discount || "";

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: "linear-gradient(135deg, #0b0812 0%, #1a142a 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "#ffffff",
          fontFamily: '"Plus Jakarta Sans", "Hind Siliguri", sans-serif',
          padding: 40,
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #ff6b35, #8b5cf6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 24,
          }}
        >
          <span style={{ fontSize: 56, lineHeight: 1 }}>O</span>
        </div>
        {discount ? (
          <div
            style={{
              fontSize: 64,
              fontWeight: 800,
              color: "#ff6b35",
              marginBottom: 8,
              textAlign: "center",
            }}
          >
            {discount}
          </div>
        ) : null}
        <div style={{ fontSize: 40, fontWeight: 700, marginBottom: 12, textAlign: "center" }}>
          {title}
        </div>
        {shop ? (
          <div style={{ fontSize: 28, color: "#e5e7eb", marginBottom: 4, textAlign: "center" }}>
            {shop}
          </div>
        ) : null}
        {area ? (
          <div style={{ fontSize: 24, color: "#9ca3af", textAlign: "center" }}>
            {area}
          </div>
        ) : null}
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
