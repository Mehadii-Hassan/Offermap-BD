import { NextResponse } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { logEvent } from "@/lib/activity";

// Third-party / extension noise to ignore.
const NOISE_RE =
  /chrome-extension|browser-extension|webstore|googleapis|gstatic|facebook\.net|doubleclick|googletagmanager|googlesyndication|analytics\.js|gtm\.js|\.css|\.png|\.jpg|\.jpeg|\.svg|\.woff|\.woff2|\.ttf|\.ico/i;

export async function POST(req) {
  const ip = getClientIp(req);
  // Rate limit: max 20 client-error reports per IP per hour.
  if (!rateLimit(`client-error:${ip}`, 20, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many reports" }, { status: 429 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  let { message, path, uaClass } = body || {};
  if (typeof message !== "string") message = "";
  if (typeof path !== "string") path = "";
  if (typeof uaClass !== "string") uaClass = "unknown";

  // Sanitize: max 200 chars.
  message = String(message).slice(0, 200);
  path = String(path).slice(0, 200);

  // Ignore extensions and third-party noise.
  if (NOISE_RE.test(message) || NOISE_RE.test(path)) {
    return NextResponse.json({ ok: true, ignored: "noise" });
  }

  await logEvent({
    event: "client_error",
    source: "client",
    detail: `${path} | ${uaClass} | ${message}`,
  });

  return NextResponse.json({ ok: true });
}
