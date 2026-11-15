// Cookie-protected admin stats endpoint. Returns all dashboard data from the
// dashboard_overview() RPC (offers + visitors + activity aggregations).

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { hasAdminEnv, adminDashboard } from "@/lib/supabaseAdmin";

export async function GET() {
  if (!requireAdmin()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasAdminEnv()) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }
  try {
    const data = await adminDashboard();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { error: "Stats failed", detail: e.message },
      { status: 500 }
    );
  }
}