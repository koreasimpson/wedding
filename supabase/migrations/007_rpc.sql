CREATE OR REPLACE FUNCTION search_properties_in_bounds(
  sw_lat NUMERIC, sw_lng NUMERIC, ne_lat NUMERIC, ne_lng NUMERIC,
  p_type TEXT DEFAULT NULL,
  p_price_min BIGINT DEFAULT NULL, p_price_max BIGINT DEFAULT NULL,
  p_area_min NUMERIC DEFAULT NULL, p_area_max NUMERIC DEFAULT NULL,
  p_limit INTEGER DEFAULT 100
)
RETURNS SETOF properties
LANGUAGE sql STABLE
AS $$
  SELECT * FROM properties
  WHERE is_active = true
    AND lat BETWEEN sw_lat AND ne_lat
    AND lng BETWEEN sw_lng AND ne_lng
    AND (p_type IS NULL OR property_type = p_type)
    AND (p_price_min IS NULL OR asking_price >= p_price_min)
    AND (p_price_max IS NULL OR asking_price <= p_price_max)
    AND (p_area_min IS NULL OR area_sqm >= p_area_min)
    AND (p_area_max IS NULL OR area_sqm <= p_area_max)
  ORDER BY asking_price ASC
  LIMIT p_limit;
$$;

CREATE OR REPLACE FUNCTION search_properties_nearby(
  p_lat NUMERIC, p_lng NUMERIC,
  p_radius_m INTEGER DEFAULT 3000,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  property properties,
  distance_m NUMERIC
)
LANGUAGE sql STABLE
AS $$
  SELECT p.*,
    ROUND(ST_Distance(
      p.location,
      ST_SetSRID(ST_MakePoint(p_lng::float, p_lat::float), 4326)::geography
    )::numeric, 0) AS distance_m
  FROM properties p
  WHERE p.is_active = true
    AND ST_DWithin(
      p.location,
      ST_SetSRID(ST_MakePoint(p_lng::float, p_lat::float), 4326)::geography,
      p_radius_m
    )
  ORDER BY distance_m ASC
  LIMIT p_limit;
$$;

CREATE OR REPLACE FUNCTION search_properties_by_text(
  query TEXT, p_limit INTEGER DEFAULT 20
)
RETURNS SETOF properties
LANGUAGE sql STABLE
AS $$
  SELECT * FROM properties
  WHERE is_active = true
    AND (name ILIKE '%' || query || '%' OR address ILIKE '%' || query || '%')
  ORDER BY
    CASE
      WHEN name ILIKE query || '%' THEN 0
      WHEN name ILIKE '%' || query || '%' THEN 1
      ELSE 2
    END,
    asking_price ASC
  LIMIT p_limit;
$$;
