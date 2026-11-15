-- 004_outlets.sql  (idempotent)
-- BATCH H1: offer_outlets table — nearby sections fill with real chain
-- outlets. Public read policy only for outlets whose offer is approved.

CREATE TABLE IF NOT EXISTS offer_outlets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid REFERENCES offers(id) ON DELETE CASCADE,
  name text,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  address text,
  area text,
  source text DEFAULT 'osm',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS offer_outlets_offer_id_idx ON offer_outlets (offer_id);
CREATE INDEX IF NOT EXISTS offer_outlets_lat_lng_idx ON offer_outlets (lat, lng);

ALTER TABLE offer_outlets ENABLE ROW LEVEL SECURITY;

-- Public read only for outlets whose offer is approved (and valid).
-- Dropped first so this stays idempotent across edits.
DROP POLICY IF EXISTS offer_outlets_public_read ON offer_outlets;
CREATE POLICY offer_outlets_public_read
  ON offer_outlets
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM offers o
      WHERE o.id = offer_outlets.offer_id
        AND o.status = 'approved'
    )
  );