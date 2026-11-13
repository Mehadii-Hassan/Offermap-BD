// Admin action route: approve, reject, feature, edit, delete, delete-expired.
// All actions require the admin cookie.

import { NextResponse } from "next/server";
import { hasAdminEnv, adminUpdateOffer, adminDeleteOffer, adminGetAllOffers } from "@/lib/supabaseAdmin";
import { requireAdmin } from "@/lib/admin-auth";

export async function PATCH(req, { params }) {
  if (!requireAdmin()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasAdminEnv()) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }
  const id = params.id;

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const updates = {};
  switch (body.action) {
    case "approve":
      updates.status = "approved";
      break;
    case "reject":
      updates.status = "rejected";
      break;
    case "feature":
      if (typeof body.is_featured !== "boolean")
        return NextResponse.json({ error: "is_featured required" }, { status: 400 });
      updates.is_featured = body.is_featured;
      break;
    case "edit":
      if (body.title) updates.title = String(body.title).slice(0, 160);
      if (body.discount_text) updates.discount_text = String(body.discount_text).slice(0, 60);
      if (body.valid_till) updates.valid_till = body.valid_till;
      if (body.shop_name) updates.shop_name = String(body.shop_name).slice(0, 120);
      if (body.description) updates.description = String(body.description).slice(0, 2000);
      break;
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No changes" }, { status: 400 });
  }

  try {
    await adminUpdateOffer(id, updates);
  } catch (e) {
    return NextResponse.json(
      { error: "Update failed", detail: e.message },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req, { params }) {
  if (!requireAdmin()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasAdminEnv()) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }
  try {
    await adminDeleteOffer(params.id);
  } catch (e) {
    return NextResponse.json(
      { error: "Delete failed", detail: e.message },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true });
}