CREATE TABLE infrastructure (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,
  sub_type TEXT,
  name TEXT NOT NULL,
  address TEXT,
  lat NUMERIC(10,7) NOT NULL,
  lng NUMERIC(10,7) NOT NULL,
  location GEOGRAPHY(POINT, 4326)
    GENERATED ALWAYS AS (
      ST_SetSRID(ST_MakePoint(lng::float, lat::float), 4326)::geography
    ) STORED,
  details JSONB DEFAULT '{}',
  external_id TEXT,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (external_id, source)
);

CREATE INDEX idx_infrastructure_location ON infrastructure USING GIST (location);
CREATE INDEX idx_infrastructure_type ON infrastructure (type);
