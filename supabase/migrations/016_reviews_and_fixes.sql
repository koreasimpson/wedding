-- 016_reviews_and_fixes.sql
-- property_reviews 테이블 생성 + get_recommended_properties 수정 + get_property_reviews RPC

-- 1. property_reviews 테이블
CREATE TABLE IF NOT EXISTS property_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  source TEXT DEFAULT 'naver_blog',
  summary TEXT,
  author TEXT,
  published_at TIMESTAMPTZ,
  crawled_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_property_reviews_property_id ON property_reviews(property_id);

ALTER TABLE property_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "property_reviews_select" ON property_reviews FOR SELECT USING (true);
CREATE POLICY "property_reviews_insert" ON property_reviews FOR INSERT WITH CHECK (true);

GRANT ALL ON property_reviews TO anon;

-- 2. get_recommended_properties 수정 (favorites 제외)
CREATE OR REPLACE FUNCTION get_recommended_properties(p_limit INT DEFAULT 10)
RETURNS SETOF properties
LANGUAGE sql
STABLE
AS $$
  SELECT p.*
  FROM properties p
  INNER JOIN user_preferences up ON true
  WHERE p.is_active = true
    AND p.status = 'none'
    AND (up.budget_min IS NULL OR p.asking_price >= up.budget_min)
    AND (up.budget_max IS NULL OR p.asking_price <= up.budget_max)
    AND (up.area_min IS NULL OR p.area_sqm >= up.area_min)
    AND (up.area_max IS NULL OR p.area_sqm <= up.area_max)
    AND (up.property_types IS NULL OR p.property_type = ANY(up.property_types))
    AND (up.min_floor IS NULL OR p.floor >= up.min_floor)
    AND (up.max_floor IS NULL OR p.floor <= up.max_floor)
    AND (up.min_rooms IS NULL OR p.rooms >= up.min_rooms)
    AND (up.min_bathrooms IS NULL OR p.bathrooms >= up.min_bathrooms)
    AND (up.min_built_year IS NULL OR p.built_year >= up.min_built_year)
    AND NOT EXISTS (SELECT 1 FROM favorites f WHERE f.property_id = p.id)
  ORDER BY p.created_at DESC
  LIMIT p_limit;
$$;

-- 3. get_property_reviews RPC
CREATE OR REPLACE FUNCTION get_property_reviews(p_property_id UUID, p_limit INT DEFAULT 20)
RETURNS SETOF property_reviews
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM property_reviews
  WHERE property_id = p_property_id
  ORDER BY published_at DESC NULLS LAST
  LIMIT p_limit;
$$;
