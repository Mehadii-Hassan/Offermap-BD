import { NextResponse } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { logEvent } from "@/lib/activity";

const REPORT_REASONS = [
  { value: "not_working", label: "Not working" },
  { value: "fake", label: "Fake / not real" },
  { value: "expired", label: "Expired" },
  { value: "shop_request", label: "Shop owner: remove or correct" },
];

export async function POST(req) {
  const ip = getClientIp(req);
  // Rate limit: max 10 reports per IP per hour.
  if (!rateLimit(`report:${ip}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many reports, please try again later." }, { status: 429 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const { offer_id, reason, contact } = body || {};
  if (!offer_id) {
    return NextResponse.json({ error: "offer_id required" }, { status: 400 });
  }
  if (!REPORT_REASONS.some((r) => r.value === reason)) {
    return NextResponse.json({ error: "Invalid reason" }, { status: 400 });
  }
  if (contact != null && typeof contact !== "string") {
    return NextResponse.json({ error: "Invalid contact" }, { status: 400 });
  }
  if (contact && contact.length > 200) {
    return NextResponse.json({ error: "Contact too long" }, { status: 400 });
  }

  await logEvent({
    event: "report",
    offerId: offer_id,
    source: "user",
    detail: `${reason}${contact ? ` | contact: ${contact}` : ""}`,
  });

  return NextResponse.json({ ok: true, reason });
}
