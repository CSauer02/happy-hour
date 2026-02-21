-- ATL Happy Hour - Supabase Schema
-- Run this in the Supabase SQL Editor to set up the database

-- Venues table (matches CSV structure)
CREATE TABLE IF NOT EXISTS venues (
  id SERIAL PRIMARY KEY,
  restaurant_name TEXT NOT NULL,
  deal TEXT NOT NULL,
  neighborhood TEXT NOT NULL DEFAULT 'Other',
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  restaurant_url TEXT,
  maps_url TEXT,
  mon BOOLEAN NOT NULL DEFAULT FALSE,
  tue BOOLEAN NOT NULL DEFAULT FALSE,
  wed BOOLEAN NOT NULL DEFAULT FALSE,
  thu BOOLEAN NOT NULL DEFAULT FALSE,
  fri BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for neighborhood-based queries
CREATE INDEX IF NOT EXISTS idx_venues_neighborhood ON venues (neighborhood);

-- Index for day-based filtering
CREATE INDEX IF NOT EXISTS idx_venues_mon ON venues (mon) WHERE mon = TRUE;
CREATE INDEX IF NOT EXISTS idx_venues_tue ON venues (tue) WHERE tue = TRUE;
CREATE INDEX IF NOT EXISTS idx_venues_wed ON venues (wed) WHERE wed = TRUE;
CREATE INDEX IF NOT EXISTS idx_venues_thu ON venues (thu) WHERE thu = TRUE;
CREATE INDEX IF NOT EXISTS idx_venues_fri ON venues (fri) WHERE fri = TRUE;

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER venues_updated_at
  BEFORE UPDATE ON venues
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Row-level security: public read, authenticated write
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;

-- Anyone can read venues
CREATE POLICY "venues_public_read" ON venues
  FOR SELECT USING (true);

-- Only authenticated users can insert/update/delete
CREATE POLICY "venues_auth_write" ON venues
  FOR ALL USING (auth.role() = 'authenticated');
