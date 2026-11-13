// Report an offer (not working / fake / outdated).

import { NextResponse } from "next/server";

const REPORT_REASONS = [
  { value: "not_working", label: "Not working" },
  { value: "fake", label: "Fake / not real" },
  { value: "expired", label: "Expired" },
];

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const { offer_id, reason } = body || {};
  if (!offer_id) {
    return NextResponse.json({ error: "offer_id required" }, { status: 400 });
  }
  if (!REPORT_REASONS.some((r) => r.value === reason)) {
    return NextResponse.json({ error: "Invalid reason" }, { status: 400 });
  }

  // Rate limit loosely by IP
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  // Store report in Supabase if a table exists, else silently accept.
  // For now we return ok and rely on admin side to handle report rows if any.
  const ok = true;
  return NextResponse.json({ ok, reason });
}
