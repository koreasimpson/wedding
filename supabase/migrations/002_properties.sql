CREATE TABLE properties (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  address_detail TEXT,
  property_type TEXT NOT NULL
    CHECK (property_type IN ('apt', 'villa', 'officetel', 'house')),
  asking_price BIGINT NOT NULL,
  deposit BIGINT,
  monthly_rent INTEGER,
  maintenance_fee INTEGER,
  area_sqm NUMERIC(6,2) NOT NULL,
  supply_area_sqm NUMERIC(6,2),
  floor INTEGER,
  total_floors INTEGER,
  rooms INTEGER,
  bathrooms INTEGER,
  direction TEXT,
  built_year INTEGER,
  lat NUMERIC(10,7) NOT NULL,
  lng NUMERIC(10,7) NOT NULL,
  location GEOGRAPHY(POINT, 4326)
    GENERATED ALWAYS AS (
      ST_SetSRID(ST_MakePoint(lng::float, lat::float), 4326)::geography
    ) STORED,
  images TEXT[] DEFAULT '{}',
  description TEXT,
  source TEXT,
  external_id TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (external_id, source)
);

CREATE INDEX idx_properties_location ON properties USING GIST (location);
CREATE INDEX idx_properties_type_price ON properties (property_type, asking_price) WHERE is_active = true;
CREATE INDEX idx_properties_area ON properties (area_sqm) WHERE is_active = true;
CREATE INDEX idx_properties_name_trgm ON properties USING GIN (name gin_trgm_ops);
CREATE INDEX idx_properties_address_trgm ON properties USING GIN (address gin_trgm_ops);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER properties_updated_at
  BEFORE UPDATE ON properties
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
