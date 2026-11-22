import { NextResponse } from "next/server";
import { ADMIN_COOKIE, signToken } from "@/lib/admin-auth";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

const FAILED = new Map();

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const ip = getClientIp(req);
  const fails = FAILED.get(ip) || 0;
  if (fails >= 5) {
    return NextResponse.json(
      { error: "Too many failed login attempts, try later." },
      { status: 429 }
    );
  }

  const password = typeof body.password === "string" ? body.password : "";
  const expected = process.env.ADMIN_PASSWORD || "";

  if (!expected) {
    return NextResponse.json(
      { error: "ADMIN_PASSWORD is not configured" },
      { status: 500 }
    );
  }

  if (password !== expected) {
    FAILED.set(ip, fails + 1);
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  }

  FAILED.delete(ip);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, signToken(), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12, // 12 hours
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, "", {
    httpOnly: true,
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
  return res;
}