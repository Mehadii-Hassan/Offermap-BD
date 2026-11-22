// Anonymous visit tracking. Called from the client VisitTracker via beacon/fetch.
// Records {path, referrer} against a visitor_id kept in localStorage. Uses the
// visitor's agent + Vercel geographic headers. Ignores bots and admin/api pages.
// This is anonymous aggregate analytics only — no personal data.

import { NextResponse } from "next/server";
import { supabaseAdmin, hasAdminEnv } from "@/lib/supabaseAdmin";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

const BOT_RE =
  /bot|spider|crawl|slurp|curl|wget|headless|preview|monitor|facebookexternalhit|python-requests|google-http/i;

// Numeric device detection from the user-agent.
function detectDevice(ua = "") {
  if (!ua) return "unknown";
  if (/phone|iphone|ipad|android.*mobile|mobi/i.test(ua)) {
    if (/iphone|ipod|ipad/i.test(ua)) return "iOS";
    return "Android";
  }
  if (/ipad|tablet|silk|kindle/i.test(ua)) return "tablet";
  if (/windows|macintosh|linux|ubuntu|x11|crOS/i.test(ua)) return "desktop";
  return "unknown";
}

function clean(s, max) {
  return typeof s === "string" ? s.slice(0, max) : "";
}

export async function POST(req) {
  if (!hasAdminEnv()) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const ua = req.headers.get("user-agent") || "";
  // Ignore QA traffic so it does not pollute analytics.
  if (ua.endsWith(" OfferMapQA")) {
    return NextResponse.json({ ok: true, ignored: "qa" });
  }
  if (BOT_RE.test(ua)) {
    return NextResponse.json({ ok: true, ignored: "bot" });
  }

  // Rate limit per IP (light): max 240 requests / minute (kept high enough to
  // not break multi-tab usage or automated e2e suites running from one IP).
  const ip = getClientIp(req);
  if (!rateLimit("track:" + ip, 240, 60000)) {
    return NextResponse.json({ ok: true, ignored: "rate" });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const path = clean(body.path, 500) || "/";
  const referrer = clean(body.referrer, 500);
  const visitorId = clean(body.visitor_id, 200);

  // Never track admin or internal api pages.
  if (/^\/admin|^\/api\//.test(path)) {
    return NextResponse.json({ ok: true, ignored: "internal" });
  }

  const country = clean(req.headers.get("x-vercel-ip-country"), 64);
  const region = clean(req.headers.get("x-vercel-ip-country-region"), 64);
  const city = clean(req.headers.get("x-vercel-ip-city"), 128);

  let isNew = false;
  if (visitorId) {
    const { data, error } = await supabaseAdmin
      .from("site_visits")
      .select("id")
      .eq("visitor_id", visitorId)
      .limit(1);
    if (!error) isNew = !data || data.length === 0;
  }

  const { error: insErr } = await supabaseAdmin.from("site_visits").insert({
    visitor_id: visitorId || null,
    path,
    referrer: referrer || null,
    device: detectDevice(ua),
    country: country || null,
    region: region || null,
    city: city || null,
    is_new_visitor: visitorId ? isNew : null,
  });
  if (insErr) {
    return NextResponse.json(
      { error: "Could not save visit, try again.", message: "ভিজিট সংরক্ষণ করা যায়নি, পরে চেষ্টা করুন।" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}