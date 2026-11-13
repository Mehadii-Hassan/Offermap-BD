import { NextResponse } from "next/server";
import { unmapOffer } from "@/lib/supabase";
import { supabaseAdmin, hasAdminEnv } from "@/lib/supabaseAdmin";
import { CATEGORIES, AREAS, AREA_COORDS, PAYMENT_METHODS } from "@/lib/offers";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // 3MB
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function POST(req) {
  if (!hasAdminEnv()) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 500 }
    );
  }

  const ip = getClientIp(req);
  // Simple rate limit: max 5 submissions per IP per hour.
  if (!rateLimit(`submit:${ip}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many submissions, please try again later." },
      { status: 429 }
    );
  }

  let form;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  // Honeypot: if a human filled the hidden field, silently reject.
  if (form.get("company_website")) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const str = (v) => (typeof v === "string" ? v.trim() : "");

  const title = str(form.get("title"));
  const shopName = str(form.get("shop_name"));
  const discountText = str(form.get("discount_text"));
  const category = str(form.get("category"));
  const area = str(form.get("area"));
  const paymentMethod = str(form.get("payment_method"));
  const validTill = str(form.get("valid_till"));
  const description = str(form.get("description"));

  // Validate required fields
  const missing = [];
  if (!title) missing.push("title");
  if (!shopName) missing.push("shop_name");
  if (!discountText) missing.push("discount_text");
  if (!category || !CATEGORIES.includes(category)) missing.push("category");
  if (!area || !AREAS.includes(area)) missing.push("area");
  if (!paymentMethod || !PAYMENT_METHODS.includes(paymentMethod)) missing.push("payment_method");
  if (!validTill) missing.push("valid_till");
  if (missing.length) {
    return NextResponse.json(
      { error: "Missing or invalid fields", fields: missing },
      { status: 400 }
    );
  }

  if (title.length > 160 || shopName.length > 120 || description.length > 2000) {
    return NextResponse.json({ error: "Field too long" }, { status: 400 });
  }

  // Auto-fill lat/lng from the area center.
  const coords = AREA_COORDS[area];

  // Optional photo upload
  let image = null;
  const file = form.get("image");
  if (file && file.size > 0) {
    if (file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: "Image must be under 3MB" }, { status: 400 });
    }
    if (!IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Only image files allowed" }, { status: 400 });
    }
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: upErr } = await supabaseAdmin.storage
      .from("offer-images")
      .upload(filename, file.stream(), {
        contentType: file.type,
        upsert: false,
      });
    if (upErr) {
      return NextResponse.json(
        { error: "Image upload failed", detail: upErr.message },
        { status: 500 }
      );
    }
    const { data: pubData } = supabaseAdmin.storage
      .from("offer-images")
      .getPublicUrl(filename);
    image = pubData.publicUrl;
  }

  const row = unmapOffer({
    title,
    shopName,
    discountText,
    category,
    area,
    paymentMethod,
    validTill,
    description,
    lat: coords.lat,
    lng: coords.lng,
    image: image || null,
    isFeatured: false,
    hotScore: 0,
  });

  const { data, error } = await supabaseAdmin
    .from("offers")
    .insert({ ...row, status: "pending" })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Could not save offer", detail: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, id: data.id });
}