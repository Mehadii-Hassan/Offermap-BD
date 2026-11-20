-- 007_dashboard_exclude_e2e.sql  (idempotent)
-- E2E test offers (source = 'e2e') must never appear in the admin dashboard
-- numbers. Recreates dashboard_offer_stats() with the same return shape as
-- 005_dashboard_outlets.sql, excluding source = 'e2e' from every offer count.

DROP FUNCTION IF EXISTS dashboard_offer_stats();
CREATE OR REPLACE FUNCTION dashboard_offer_stats()
RETURNS TABLE (
  added_today int, added_yesterday int, added_7d int,
  added_user_today int, added_scraper_today int,
  added_user_7d int, added_scraper_7d int,
  deleted_today int, deleted_yesterday int, deleted_7d int,
  deleted_auto_today int, deleted_admin_today int,
  live_now int, pending int, expiring_3d int,
  real_image int, placeholder int,
  precision_exact int, precision_area int, precision_district int,
  top_categories json, top_divisions json,
  added_by_day json, deleted_by_day json, visitors_by_day json
)
LANGUAGE sql STABLE AS $$
  WITH outlet_offers AS (
    SELECT DISTINCT offer_id FROM offer_outlets
  )
  SELECT
    (SELECT count(*) FROM offers WHERE source IS DISTINCT FROM 'e2e' AND created_at >= bd_start_of_day(0))::int AS added_today,
    (SELECT count(*) FROM offers WHERE source IS DISTINCT FROM 'e2e' AND created_at >= bd_start_of_day(1) AND created_at < bd_start_of_day(0))::int AS added_yesterday,
    (SELECT count(*) FROM offers WHERE source IS DISTINCT FROM 'e2e' AND created_at >= bd_start_of_day(6))::int AS added_7d,
    (SELECT count(*) FROM offers WHERE source IS DISTINCT FROM 'e2e' AND created_at >= bd_start_of_day(0) AND source <> 'scraper')::int AS added_user_today,
    (SELECT count(*) FROM offers WHERE source IS DISTINCT FROM 'e2e' AND created_at >= bd_start_of_day(0) AND source = 'scraper')::int AS added_scraper_today,
    (SELECT count(*) FROM offers WHERE source IS DISTINCT FROM 'e2e' AND created_at >= bd_start_of_day(6) AND source <> 'scraper')::int AS added_user_7d,
    (SELECT count(*) FROM offers WHERE source IS DISTINCT FROM 'e2e' AND created_at >= bd_start_of_day(6) AND source = 'scraper')::int AS added_scraper_7d,
    (SELECT count(*) FROM activity_log WHERE event IN ('admin_deleted','expired_deleted') AND created_at >= bd_start_of_day(0))::int AS deleted_today,
    (SELECT count(*) FROM activity_log WHERE event IN ('admin_deleted','expired_deleted') AND created_at >= bd_start_of_day(1) AND created_at < bd_start_of_day(0))::int AS deleted_yesterday,
    (SELECT count(*) FROM activity_log WHERE event IN ('admin_deleted','expired_deleted') AND created_at >= bd_start_of_day(6))::int AS deleted_7d,
    (SELECT count(*) FROM activity_log WHERE event = 'expired_deleted' AND created_at >= bd_start_of_day(0))::int AS deleted_auto_today,
    (SELECT count(*) FROM activity_log WHERE event = 'admin_deleted' AND created_at >= bd_start_of_day(0))::int AS deleted_admin_today,
    (SELECT count(*) FROM offers WHERE source IS DISTINCT FROM 'e2e' AND status = 'approved' AND (is_ongoing OR valid_till IS NULL OR valid_till >= current_date))::int AS live_now,
    (SELECT count(*) FROM offers WHERE source IS DISTINCT FROM 'e2e' AND status = 'pending')::int AS pending,
    (SELECT count(*) FROM offers WHERE source IS DISTINCT FROM 'e2e' AND valid_till >= current_date AND valid_till <= current_date + 3)::int AS expiring_3d,
    (SELECT count(*) FROM offers WHERE source IS DISTINCT FROM 'e2e' AND image IS NOT NULL AND image <> '')::int AS real_image,
    (SELECT count(*) FROM offers WHERE source IS DISTINCT FROM 'e2e' AND (image IS NULL OR image = ''))::int AS placeholder,
    (SELECT count(*) FROM offers WHERE source IS DISTINCT FROM 'e2e' AND (location_precision IN ('exact','area') OR id IN (SELECT offer_id FROM outlet_offers)))::int AS precision_exact,
    (SELECT count(*) FROM offers WHERE source IS DISTINCT FROM 'e2e' AND location_precision = 'area' AND id NOT IN (SELECT offer_id FROM outlet_offers))::int AS precision_area,
    (SELECT count(*) FROM offers WHERE source IS DISTINCT FROM 'e2e' AND location_precision = 'district' AND id NOT IN (SELECT offer_id FROM outlet_offers))::int AS precision_district,
    (SELECT coalesce(json_agg(t) FILTER (WHERE t.c > 0), '[]'::json) FROM
       (SELECT category AS k, count(*) AS c FROM offers WHERE source IS DISTINCT FROM 'e2e' GROUP BY category ORDER BY c DESC LIMIT 10) t) AS top_categories,
    (SELECT coalesce(json_agg(t) FILTER (WHERE t.c > 0), '[]'::json) FROM
       (SELECT division AS k, count(*) AS c FROM offers WHERE source IS DISTINCT FROM 'e2e' AND division IS NOT NULL GROUP BY division ORDER BY c DESC LIMIT 10) t) AS top_divisions,
    (SELECT coalesce(json_agg(d) FILTER (WHERE d.c > 0), '[]'::json) FROM
       (SELECT to_char(created_at AT TIME ZONE 'Asia/Dhaka', 'YYYY-MM-DD') AS d,
               count(*) AS c FROM offers WHERE source IS DISTINCT FROM 'e2e' GROUP BY d) d) AS added_by_day,
    (SELECT coalesce(json_agg(o) FILTER (WHERE o.c > 0), '[]'::json) FROM
       (SELECT to_char(created_at AT TIME ZONE 'Asia/Dhaka', 'YYYY-MM-DD') AS d,
               count(*) AS c FROM activity_log WHERE event IN ('admin_deleted','expired_deleted') GROUP BY d) o) AS deleted_by_day,
    (SELECT coalesce(json_agg(v) FILTER (WHERE v.c > 0), '[]'::json) FROM
       (SELECT to_char(created_at AT TIME ZONE 'Asia/Dhaka', 'YYYY-MM-DD') AS d,
               count(*) AS c FROM site_visits GROUP BY d) v) AS visitors_by_day;
$$;