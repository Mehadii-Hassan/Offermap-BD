-- 001_foundation.sql  (idempotent)
-- Tables for analytics/activity and scraper run history.

CREATE TABLE IF NOT EXISTS activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event text,
  offer_id uuid,
  source text,
  detail text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS site_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id text,
  path text,
  referrer text,
  device text,
  country text,
  region text,
  city text,
  is_new_visitor boolean,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scrape_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz DEFAULT now(),
  queries int,
  pages int,
  found int,
  inserted int,
  skipped int,
  duplicates int,
  errors int,
  tavily_credits int,
  gemini_calls int,
  mode text
);

-- Indexes
CREATE INDEX IF NOT EXISTS activity_log_created_at_idx ON activity_log (created_at);
CREATE INDEX IF NOT EXISTS activity_log_event_created_at_idx ON activity_log (event, created_at);
CREATE INDEX IF NOT EXISTS site_visits_visitor_id_idx ON site_visits (visitor_id);
CREATE INDEX IF NOT EXISTS site_visits_created_at_idx ON site_visits (created_at);

-- RLS enabled with no public policies (server-only access).
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrape_runs ENABLE ROW LEVEL SECURITY;

-- Add columns to offers if they are missing.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'offers' AND column_name = 'location_precision') THEN
    ALTER TABLE offers ADD COLUMN location_precision text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'offers' AND column_name = 'phone') THEN
    ALTER TABLE offers ADD COLUMN phone text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'offers' AND column_name = 'source_image_url') THEN
    ALTER TABLE offers ADD COLUMN source_image_url text;
  END IF;
END $$;