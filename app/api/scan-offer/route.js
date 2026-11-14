import { NextResponse } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { ACTIVE_CATEGORIES } from "@/lib/categories";
import { isInsideBangladesh } from "@/lib/bd-locations";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 3 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const CATS = ACTIVE_CATEGORIES.map((c) => c.key);

function jsonFromGemini(text) {
  const cleaned = String(text || "").replace(/```json/gi, "").replace(/```/g, "").trim();
  try {
    const p = JSON.parse(cleaned);
    return p && typeof p === "object" ? p : null;
  } catch {
    return null;
  }
}

export async function POST(req) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: "AI not configured" }, { status: 500 });
  }
  const ip = getClientIp(req);
  if (!rateLimit(`scan:${ip}`, 6, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many requests, try later." }, { status: 429 });
  }

  let form;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const file = form.get("image");
  if (!file || file.size === 0) {
    return NextResponse.json({ error: "No image" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image must be under 3MB" }, { status: 400 });
  }
  if (!IMAGE_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Only image files allowed" }, { status: 400 });
  }
  const buf = Buffer.from(await file.arrayBuffer());
  const b64 = buf.toString("base64");

  const prompt = `You are a helpful assistant for OfferMap BD (Bangladesh offers/deals).
Read the attached image (a photo or screenshot of an offer/discount) and return ONLY a JSON object with these exact keys:
- title: short offer title
- shopName: business name
- discountText: e.g. "30% OFF" or "Buy 1 Get 1 Free"
- category: ONE of exactly: ${CATS.join(", ")} (or "Other")
- division: "" or a Bangladesh division name
- district: "" or a Bangladesh district name
- area: neighbourhood if obvious, else ""
- address: street/area address if visible, else ""
- paymentMethod: "" or one of City Bank Card, bKash, Nagad, Rocket
- validTill: end date as YYYY-MM-DD if visible, else null
- description: one short sentence
- valid: true only if this is a real, current offer in Bangladesh (not spam, not a foreign/global promotion)
Respond with valid JSON only.`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              { inline_data: { mime_type: file.type, data: b64 } },
            ],
          },
        ],
        generationConfig: { temperature: 0.1, maxOutputTokens: 2048 },
      }),
    }
  );
  if (!res.ok) {
    const body = await res.text();
    return NextResponse.json(
      { error: "AI call failed", detail: body.slice(0, 200) },
      { status: 502 }
    );
  }
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const parsed = jsonFromGemini(text);
  if (!parsed) {
    return NextResponse.json({ error: "Could not read image" }, { status: 422 });
  }
  // Basic sanitization of returned fields.
  const category = CATS.includes(parsed.category) ? parsed.category : "Other";
  const lat = parseFloat(parsed.lat);
  const lng = parseFloat(parsed.lng);
  return NextResponse.json({
    ok: true,
    fields: {
      title: String(parsed.title || "").slice(0, 160),
      shopName: String(parsed.shopName || "").slice(0, 120),
      discountText: String(parsed.discountText || "").slice(0, 60),
      category,
      division: String(parsed.division || "").slice(0, 40),
      district: String(parsed.district || "").slice(0, 40),
      area: String(parsed.area || "").slice(0, 80),
      address: String(parsed.address || "").slice(0, 300),
      paymentMethod:
        ["City Bank Card", "bKash", "Nagad", "Rocket"].includes(parsed.paymentMethod)
          ? parsed.paymentMethod
          : "Any",
      validTill: /^\d{4}-\d{2}-\d{2}$/.test(String(parsed.validTill)) ? parsed.validTill : "",
      description: String(parsed.description || "").slice(0, 500),
      lat: Number.isFinite(lat) && isInsideBangladesh(lat, lng) ? lat : null,
      lng: Number.isFinite(lng) && isInsideBangladesh(lat, lng) ? lng : null,
    },
  });
}