-- Migration 014: 새로운 검색 RPC 함수
-- 텍스트 검색 + 필터 + 추천 매물

-- 1. 텍스트 검색 + 필터 RPC
CREATE OR REPLACE FUNCTION search_properties_filtered(
  p_query TEXT DEFAULT NULL,
  p_type TEXT DEFAULT NULL,
  p_price_min BIGINT DEFAULT NULL,
  p_price_max BIGINT DEFAULT NULL,
  p_area_min NUMERIC DEFAULT NULL,
  p_area_max NUMERIC DEFAULT NULL,
  p_min_floor INT DEFAULT NULL,
  p_max_floor INT DEFAULT NULL,
  p_min_rooms INT DEFAULT NULL,
  p_min_bathrooms INT DEFAULT NULL,
  p_min_built_year INT DEFAULT NULL,
  p_region TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS SETOF properties
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM properties
  WHERE is_active = true
    AND (p_query IS NULL OR name ILIKE '%' || p_query || '%' OR address ILIKE '%' || p_query || '%')
    AND (p_type IS NULL OR property_type = p_type)
    AND (p_price_min IS NULL OR asking_price >= p_price_min)
    AND (p_price_max IS NULL OR asking_price <= p_price_max)
    AND (p_area_min IS NULL OR area_sqm >= p_area_min)
    AND (p_area_max IS NULL OR area_sqm <= p_area_max)
    AND (p_min_floor IS NULL OR floor >= p_min_floor)
    AND (p_max_floor IS NULL OR floor <= p_max_floor)
    AND (p_min_rooms IS NULL OR rooms >= p_min_rooms)
    AND (p_min_bathrooms IS NULL OR bathrooms >= p_min_bathrooms)
    AND (p_min_built_year IS NULL OR built_year >= p_min_built_year)
    AND (p_region IS NULL OR address ILIKE '%' || p_region || '%')
    AND (p_status IS NULL OR status = p_status)
  ORDER BY created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- 2. 추천 매물 RPC (user_preferences 기반)
CREATE OR REPLACE FUNCTION get_recommended_properties(p_limit INT DEFAULT 20)
RETURNS SETOF properties
LANGUAGE plpgsql
AS $$
DECLARE
  pref RECORD;
BEGIN
  -- 가장 최근 업데이트된 사용자 선호도 가져오기
  SELECT * INTO pref FROM user_preferences ORDER BY updated_at DESC LIMIT 1;

  -- 선호도가 없으면 최신 매물 반환
  IF pref IS NULL THEN
    RETURN QUERY SELECT * FROM properties WHERE is_active = true ORDER BY created_at DESC LIMIT p_limit;
    RETURN;
  END IF;

  -- 선호도 기반 필터링
  RETURN QUERY
  SELECT p.*
  FROM properties p
  WHERE p.is_active = true
    AND (pref.budget_min IS NULL OR p.asking_price >= pref.budget_min)
    AND (pref.budget_max IS NULL OR p.asking_price <= pref.budget_max)
    AND (pref.property_types IS NULL OR p.property_type = ANY(pref.property_types))
    AND (pref.area_min IS NULL OR p.area_sqm >= pref.area_min)
    AND (pref.area_max IS NULL OR p.area_sqm <= pref.area_max)
    AND (pref.min_floor IS NULL OR p.floor >= pref.min_floor)
    AND (pref.min_rooms IS NULL OR p.rooms >= pref.min_rooms)
    AND (pref.min_bathrooms IS NULL OR p.bathrooms >= pref.min_bathrooms)
    AND (pref.min_built_year IS NULL OR p.built_year >= pref.min_built_year)
    AND (pref.preferred_regions IS NULL OR EXISTS (
      SELECT 1 FROM unnest(pref.preferred_regions) AS region WHERE p.address ILIKE '%' || region || '%'
    ))
  ORDER BY p.created_at DESC
  LIMIT p_limit;
END;
$$;

-- 3. 매물 상태 업데이트 헬퍼 함수
CREATE OR REPLACE FUNCTION update_property_status(
  p_property_id UUID,
  p_status TEXT,
  p_memo TEXT DEFAULT NULL
)
RETURNS properties
LANGUAGE plpgsql
AS $$
DECLARE
  result properties;
BEGIN
  UPDATE properties
  SET
    status = p_status,
    memo = COALESCE(p_memo, memo),
    updated_at = NOW()
  WHERE id = p_property_id
  RETURNING * INTO result;

  RETURN result;
END;
$$;

-- 4. 매물별 뉴스 조회 함수
CREATE OR REPLACE FUNCTION get_property_news(
  p_property_id UUID,
  p_limit INT DEFAULT 10
)
RETURNS SETOF property_news
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM property_news
  WHERE property_id = p_property_id
  ORDER BY published_at DESC NULLS LAST, crawled_at DESC
  LIMIT p_limit;
END;
$$;
