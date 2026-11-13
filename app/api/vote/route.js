import { NextResponse } from "next/server";
import { hasAdminEnv } from "@/lib/supabaseAdmin";
import { adminIncrementVote } from "@/lib/supabaseAdmin";

export async function POST(req) {
  if (!hasAdminEnv()) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const id = typeof body.id === "string" ? body.id : "";
  const type = body.type; // "worked" | "didntWork"

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  if (type !== "worked" && type !== "didntWork") {
    return NextResponse.json({ error: "Invalid vote type" }, { status: 400 });
  }

  const column = type === "worked" ? "worked_count" : "not_worked_count";

  try {
    await adminIncrementVote(id, column);
  } catch (e) {
    return NextResponse.json(
      { error: "Could not save vote", detail: e.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}