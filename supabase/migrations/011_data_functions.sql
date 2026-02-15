CREATE OR REPLACE FUNCTION get_nearby_trades(
  p_lat NUMERIC, p_lng NUMERIC,
  p_radius_m INTEGER DEFAULT 3000,
  p_months INTEGER DEFAULT 12
)
RETURNS TABLE (
  deal_date TEXT, price BIGINT, area_sqm NUMERIC,
  floor INTEGER, apt_name TEXT, distance_m NUMERIC
)
LANGUAGE sql STABLE
AS $$
  SELECT
    to_char(p.created_at, 'YYYY-MM-DD'), p.asking_price, p.area_sqm,
    p.floor, p.name,
    ROUND(ST_Distance(p.location,
      ST_SetSRID(ST_MakePoint(p_lng::float, p_lat::float), 4326)::geography
    )::numeric, 0)
  FROM properties p
  WHERE p.source = 'molit_apt_trade'
    AND p.created_at > now() - (p_months || ' months')::interval
    AND ST_DWithin(p.location,
      ST_SetSRID(ST_MakePoint(p_lng::float, p_lat::float), 4326)::geography,
      p_radius_m)
  ORDER BY p.created_at DESC LIMIT 100;
$$;

CREATE OR REPLACE FUNCTION get_nearby_infrastructure(
  p_lat NUMERIC, p_lng NUMERIC,
  p_type TEXT,
  p_radius_m INTEGER DEFAULT 3000
)
RETURNS TABLE (
  type TEXT, sub_type TEXT, name TEXT,
  distance_m NUMERIC, details JSONB
)
LANGUAGE sql STABLE
AS $$
  SELECT i.type, i.sub_type, i.name,
    ROUND(ST_Distance(i.location,
      ST_SetSRID(ST_MakePoint(p_lng::float, p_lat::float), 4326)::geography
    )::numeric, 0),
    i.details
  FROM infrastructure i
  WHERE i.type = p_type
    AND ST_DWithin(i.location,
      ST_SetSRID(ST_MakePoint(p_lng::float, p_lat::float), 4326)::geography,
      p_radius_m)
  ORDER BY distance_m ASC LIMIT 20;
$$;
