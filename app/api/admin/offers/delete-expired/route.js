// Admin action: delete all offers with valid_till < today (expired offers).

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { hasAdminEnv, adminGetAllOffers, adminDeleteOffer } from "@/lib/supabaseAdmin";

export async function POST() {
  if (!requireAdmin()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasAdminEnv()) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  try {
    const today = new Date().toISOString().slice(0, 10);
    const all = await adminGetAllOffers(1000);
    const expired = all.filter((o) => o.validTill && o.validTill < today);
    let deleted = 0;
    for (const o of expired) {
      try {
        await adminDeleteOffer(o.id);
        deleted += 1;
      } catch (e) {
        console.error(`Delete failed for ${o.id}:`, e.message);
      }
    }
    return NextResponse.json({ ok: true, deleted, totalExpired: expired.length });
  } catch (e) {
    return NextResponse.json(
      { error: "Delete-expired failed", detail: e.message },
      { status: 500 }
    );
  }
}