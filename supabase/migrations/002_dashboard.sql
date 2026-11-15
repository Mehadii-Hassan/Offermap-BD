-- 002_dashboard.sql  (idempotent)
-- RPC functions aggregating dashboard numbers in Bangladesh time (UTC+6).
-- Created via npm run migrate.

-- Bangladesh "today" boundary in UTC (start of the BD calendar day), N days ago.
CREATE OR REPLACE FUNCTION bd_start_of_day(days_ago int DEFAULT 0)
RETURNS timestamptz LANGUAGE sql IMMUTABLE AS $$
  SELECT (date_trunc('day', timezone('Asia/Dhaka', now())) - (days_ago || ' days')::interval)
         AT TIME ZONE 'Asia/Dhaka';
$$;

-- ---------------------------------------------------------------------------
-- Offers aggregation: added/deleted windows, live/pending/expiring counts,
-- real image vs placeholder, precision breakdown, top categories & divisions.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS dashboard_offer_stats();
CREATE OR REPLACE FUNCTION dashboard_offer_stats()
RETURNS TABLE (
  added_today int, added_yesterday int, added_7d int,
  added_user_today int, added_scraper_today int,
  tested_added_user_7d int, tested_added_scraper_7d int,
  live_now int, pending int, expiring_3d int,
  real_image int, placeholder int,
  precision_exact int, precision_area int, precision_district int,
  top_categories json, top_divisions json,
  added_by_day json, deleted_by_day json, visitors_by_day json
)
LANGUAGE sql STABLE AS $$
  SELECT
    (SELECT count(*) FROM offers WHERE created_at >= bd_start_of_day(0))::int AS added_today,
    (SELECT count(*) FROM offers WHERE created_at >= bd_start_of_day(1) AND created_at < bd_start_of_day(0))::int AS added_yesterday,
    (SELECT count(*) FROM offers WHERE created_at >= bd_start_of_day(6))::int AS added_7d,
    (SELECT count(*) FROM offers WHERE created_at >= bd_start_of_day(0) AND source <> 'scraper')::int AS added_user_today,
    (SELECT count(*) FROM offers WHERE created_at >= bd_start_of_day(0) AND source = 'scraper')::int AS added_scraper_today,
    (SELECT count(*) FROM offers WHERE created_at >= bd_start_of_day(6) AND source <> 'scraper')::int AS tested_added_user_7d,
    (SELECT count(*) FROM offers WHERE created_at >= bd_start_of_day(6) AND source = 'scraper')::int AS tested_added_scraper_7d,
    (SELECT count(*) FROM offers WHERE status = 'approved' AND (is_ongoing OR valid_till IS NULL OR valid_till >= current_date))::int AS live_now,
    (SELECT count(*) FROM offers WHERE status = 'pending')::int AS pending,
    (SELECT count(*) FROM offers WHERE valid_till >= current_date AND valid_till <= current_date + 3)::int AS expiring_3d,
    (SELECT count(*) FROM offers WHERE image IS NOT NULL AND image <> '')::int AS real_image,
    (SELECT count(*) FROM offers WHERE image IS NULL OR image = '')::int AS placeholder,
    (SELECT count(*) FROM offers WHERE location_precision = 'exact')::int AS precision_exact,
    (SELECT count(*) FROM offers WHERE location_precision = 'area')::int AS precision_area,
    (SELECT count(*) FROM offers WHERE location_precision = 'district')::int AS precision_district,
    (SELECT coalesce(json_agg(t) FILTER (WHERE t.c > 0), '[]'::json) FROM
       (SELECT category AS k, count(*) AS c FROM offers GROUP BY category ORDER BY c DESC LIMIT 10) t) AS top_categories,
    (SELECT coalesce(json_agg(t) FILTER (WHERE t.c > 0), '[]'::json) FROM
       (SELECT division AS k, count(*) AS c FROM offers WHERE division IS NOT NULL GROUP BY division ORDER BY c DESC LIMIT 10) t) AS top_divisions,
    (SELECT coalesce(json_agg(d) FILTER (WHERE d.c > 0), '[]'::json) FROM
       (SELECT to_char(created_at AT TIME ZONE 'Asia/Dhaka', 'YYYY-MM-DD') AS d,
               count(*) AS c FROM offers GROUP BY d) d) AS added_by_day,
    (SELECT coalesce(json_agg(o) FILTER (WHERE o.c > 0), '[]'::json) FROM
       (SELECT to_char(created_at AT TIME ZONE 'Asia/Dhaka', 'YYYY-MM-DD') AS d,
               count(*) AS c FROM activity_log WHERE event IN ('admin_deleted','expired_deleted') GROUP BY d) o) AS deleted_by_day,
    (SELECT coalesce(json_agg(v) FILTER (WHERE v.c > 0), '[]'::json) FROM
       (SELECT to_char(created_at AT TIME ZONE 'Asia/Dhaka', 'YYYY-MM-DD') AS d,
               count(*) AS c FROM site_visits GROUP BY d) v) AS visitors_by_day;
$$;

-- ---------------------------------------------------------------------------
-- Visitors aggregation: unique/new/returning, page views, top pages/referrers/
-- devices/cities, windows by day.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS dashboard_visitor_stats();
CREATE OR REPLACE FUNCTION dashboard_visitor_stats()
RETURNS TABLE (
  unique_today int, unique_yesterday int, unique_7d int, unique_30d int,
  page_views int, new_visitors int, returning_visitors int,
  total_visitors int, top_pages json, top_referrers json,
  top_devices json, top_cities json
)
LANGUAGE sql STABLE AS $$
  SELECT
    (SELECT count(DISTINCT visitor_id) FROM site_visits WHERE visitor_id IS NOT NULL AND created_at >= bd_start_of_day(0))::int AS unique_today,
    (SELECT count(DISTINCT visitor_id) FROM site_visits WHERE visitor_id IS NOT NULL AND created_at >= bd_start_of_day(1) AND created_at < bd_start_of_day(0))::int AS unique_yesterday,
    (SELECT count(DISTINCT visitor_id) FROM site_visits WHERE visitor_id IS NOT NULL AND created_at >= bd_start_of_day(6))::int AS unique_7d,
    (SELECT count(DISTINCT visitor_id) FROM site_visits WHERE visitor_id IS NOT NULL AND created_at >= bd_start_of_day(29))::int AS unique_30d,
    (SELECT count(*) FROM site_visits WHERE created_at >= bd_start_of_day(0))::int AS page_views,
    (SELECT count(*) FROM site_visits WHERE created_at >= bd_start_of_day(29) AND is_new_visitor = true)::int AS new_visitors,
    (SELECT count(*) FROM site_visits WHERE created_at >= bd_start_of_day(29) AND is_new_visitor = false)::int AS returning_visitors,
    (SELECT count(*) FROM site_visits WHERE created_at >= bd_start_of_day(29))::int AS total_visitors,
    (SELECT coalesce(json_agg(t) FILTER (WHERE t.c > 0), '[]'::json) FROM
       (SELECT path AS k, count(*) AS c FROM site_visits WHERE created_at >= bd_start_of_day(29) GROUP BY path ORDER BY c DESC LIMIT 10) t) AS top_pages,
    (SELECT coalesce(json_agg(t) FILTER (WHERE t.c > 0), '[]'::json) FROM
       (SELECT coalesce(referrer, '(direct)') AS k, count(*) AS c FROM site_visits WHERE created_at >= bd_start_of_day(29) GROUP BY k ORDER BY c DESC LIMIT 10) t) AS top_referrers,
    (SELECT coalesce(json_agg(t) FILTER (WHERE t.c > 0), '[]'::json) FROM
       (SELECT device AS k, count(*) AS c FROM site_visits WHERE created_at >= bd_start_of_day(29) GROUP BY device ORDER BY c DESC LIMIT 10) t) AS top_devices,
    (SELECT coalesce(json_agg(t) FILTER (WHERE t.c > 0), '[]'::json) FROM
       (SELECT coalesce(city, 'Unknown') AS k, count(*) AS c FROM site_visits WHERE created_at >= bd_start_of_day(29) GROUP BY k ORDER BY c DESC LIMIT 10) t) AS top_cities;
$$;

-- ---------------------------------------------------------------------------
-- Activity: latest 20 events and last 10 scrape_runs.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS dashboard_activity();
CREATE OR REPLACE FUNCTION dashboard_activity()
RETURNS TABLE (
  events json,
  scrape_runs json
)
LANGUAGE sql STABLE AS $$
  SELECT
    (SELECT coalesce(json_agg(row_to_json(t) ORDER BY t.created_at DESC), '[]'::json) FROM
       (SELECT id, event, offer_id, source, detail, created_at FROM activity_log ORDER BY created_at DESC LIMIT 20) t) AS events,
    (SELECT coalesce(json_agg(row_to_json(s) ORDER BY s.started_at DESC), '[]'::json) FROM
       (SELECT id, started_at, queries, pages, found, inserted, skipped, duplicates, errors, mode
          FROM scrape_runs ORDER BY started_at DESC LIMIT 10) s) AS scrape_runs;
$$;

-- ---------------------------------------------------------------------------
-- Combined dashboard overview (single call).
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS dashboard_overview();
CREATE OR REPLACE FUNCTION dashboard_overview()
RETURNS json LANGUAGE plpgsql STABLE AS $$
DECLARE
  o json;
  v json;
  a json;
BEGIN
  o := (SELECT to_json(t) FROM dashboard_offer_stats() t);
  v := (SELECT to_json(t) FROM dashboard_visitor_stats() t);
  a := (SELECT to_json(t) FROM dashboard_activity() t);
  RETURN json_build_object(
    'bdToday', to_char(timezone('Asia/Dhaka', now()), 'YYYY-MM-DD'),
    'offers', o,
    'visitors', v,
    'activity', a
  );
END;
$$;