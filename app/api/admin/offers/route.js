import { NextResponse } from "next/server";
import { hasAdminEnv, adminGetAllOffers } from "@/lib/supabaseAdmin";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET() {
  if (!requireAdmin()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasAdminEnv()) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }
  try {
    const offers = await adminGetAllOffers();
    return NextResponse.json({ offers });
  } catch (e) {
    return NextResponse.json(
      { error: "Could not load offers", detail: e.message },
      { status: 500 }
    );
  }
}