// Server-only helpers for writing analytics/activity rows via the service key.
import { supabaseAdmin, hasAdminEnv } from "./supabaseAdmin";

export async function logEvent({ event, offerId = null, source = null, detail = null }) {
  if (!hasAdminEnv()) return;
  try {
    await supabaseAdmin.from("activity_log").insert({
      event,
      offer_id: offerId,
      source,
      detail,
    });
  } catch (e) {
    // Activity logging should never break the main action.
    console.error("logEvent failed:", e.message);
  }
}

export async function logScrapeRun(stats) {
  if (!hasAdminEnv()) return;
  try {
    await supabaseAdmin.from("scrape_runs").insert(stats);
  } catch (e) {
    console.error("logScrapeRun failed:", e.message);
  }
}