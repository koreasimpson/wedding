CREATE TABLE geocoding_cache (
  address TEXT PRIMARY KEY,
  lat NUMERIC(10,7),
  lng NUMERIC(10,7),
  accuracy TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
