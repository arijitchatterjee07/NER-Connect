CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS postgis;

  RAISE NOTICE 'PostGIS is available and enabled.';

EXCEPTION
  WHEN SQLSTATE '0A000' THEN
    RAISE NOTICE 'PostGIS is not installed. Continuing without spatial geometry.';
END $$;

CREATE TABLE IF NOT EXISTS vehicles (
  id TEXT PRIMARY KEY,
  vehicle_number TEXT NOT NULL UNIQUE,
  cargo TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('MOVING','DELAYED','AT RISK','REROUTED','IDLE')),
  priority TEXT NOT NULL DEFAULT 'Standard',
  route_id TEXT,
  route_name TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  eta_minutes INTEGER NOT NULL DEFAULT 0,
  vehicle_weight_tons DOUBLE PRECISION DEFAULT 10,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS roads (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  district TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACCESSIBLE' CHECK (status IN ('ACCESSIBLE','MODERATE','HIGH RISK','BLOCKED')),
  condition_score DOUBLE PRECISION NOT NULL DEFAULT 20,
  traffic_score DOUBLE PRECISION NOT NULL DEFAULT 20,
  historical_risk DOUBLE PRECISION NOT NULL DEFAULT 20,
  bridge_weight_limit_tons DOUBLE PRECISION,
  surface_type TEXT NOT NULL DEFAULT 'Asphalt',
  distance_km DOUBLE PRECISION,
  base_eta_minutes INTEGER,
  coords_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  details TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('LANDSLIDE','FLOOD','BLOCKADE','BRIDGE_DOWN','WEATHER')),
  severity TEXT NOT NULL CHECK (severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  road_id TEXT REFERENCES roads(id) ON DELETE SET NULL,
  district TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  reporter_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS field_reports (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  location TEXT,
  details TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  status TEXT NOT NULL DEFAULT 'SYNCED' CHECK (status IN ('QUEUED','SYNCED','REJECTED')),
  reporter_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS weather_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  district TEXT NOT NULL,
  rainfall DOUBLE PRECISION NOT NULL DEFAULT 0,
  flood_risk DOUBLE PRECISION NOT NULL DEFAULT 0,
  landslide_risk DOUBLE PRECISION NOT NULL DEFAULT 0,
  temperature DOUBLE PRECISION,
  label TEXT,
  observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deliveries (
  id TEXT PRIMARY KEY,
  commodity TEXT NOT NULL,
  quantity TEXT NOT NULL,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  vehicle_id TEXT REFERENCES vehicles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'IN TRANSIT',
  priority TEXT NOT NULL DEFAULT 'Standard',
  eta_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_incidents_road ON incidents(road_id);
CREATE INDEX IF NOT EXISTS idx_incidents_active ON incidents(resolved, severity);
CREATE INDEX IF NOT EXISTS idx_field_reports_status ON field_reports(status);
CREATE INDEX IF NOT EXISTS idx_weather_district ON weather_observations(district);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') THEN
    BEGIN
      ALTER TABLE roads ADD COLUMN IF NOT EXISTS geometry geometry(LineString,4326);
      CREATE INDEX IF NOT EXISTS idx_roads_geometry ON roads USING GIST (geometry);
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not create PostGIS geometry column: %', SQLERRM;
    END;
  END IF;
END $$;
