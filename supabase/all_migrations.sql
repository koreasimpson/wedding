-- Combined Migration Script

-- ========== 001_extensions.sql ==========
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ========== 002_properties.sql ==========
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

-- ========== 003_profiles.sql ==========
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  nickname TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nickname)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nickname', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ========== 004_favorites.sql ==========
CREATE TABLE favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  memo TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, property_id)
);

CREATE INDEX idx_favorites_user ON favorites (user_id);

-- ========== 005_analysis.sql ==========
CREATE TABLE analysis_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  analysis_types TEXT[] NOT NULL DEFAULT '{market,location,investment,regulation,risk}',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  completed_count INTEGER DEFAULT 0,
  total_count INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  error_message TEXT
);

CREATE INDEX idx_analysis_requests_user ON analysis_requests (user_id, created_at DESC);
CREATE INDEX idx_analysis_requests_property ON analysis_requests (property_id);
CREATE INDEX idx_analysis_requests_status ON analysis_requests (status) WHERE status IN ('pending', 'processing');

CREATE TABLE analysis_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID REFERENCES analysis_requests(id) ON DELETE CASCADE NOT NULL,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  analysis_type TEXT NOT NULL
    CHECK (analysis_type IN ('market', 'location', 'investment', 'regulation', 'risk')),
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  grade TEXT NOT NULL,
  summary TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  strengths TEXT[] DEFAULT '{}',
  weaknesses TEXT[] DEFAULT '{}',
  recommendations TEXT[] DEFAULT '{}',
  data_sources TEXT[] DEFAULT '{}',
  confidence INTEGER DEFAULT 80 CHECK (confidence >= 0 AND confidence <= 100),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (request_id, analysis_type)
);

CREATE INDEX idx_analysis_reports_property ON analysis_reports (property_id, analysis_type);
CREATE INDEX idx_analysis_reports_request ON analysis_reports (request_id);

CREATE OR REPLACE FUNCTION update_request_on_report()
RETURNS TRIGGER AS $$
DECLARE
  total INTEGER;
  completed INTEGER;
BEGIN
  SELECT total_count INTO total
  FROM analysis_requests WHERE id = NEW.request_id;

  SELECT COUNT(*) INTO completed
  FROM analysis_reports WHERE request_id = NEW.request_id;

  UPDATE analysis_requests
  SET
    completed_count = completed,
    status = CASE WHEN completed >= total THEN 'completed' ELSE 'processing' END,
    completed_at = CASE WHEN completed >= total THEN now() ELSE NULL END
  WHERE id = NEW.request_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_report_created
  AFTER INSERT ON analysis_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_request_on_report();

-- ========== 006_rls.sql ==========
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "properties_select_all" ON properties
  FOR SELECT USING (is_active = true);

CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "favorites_select_own" ON favorites
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "favorites_insert_own" ON favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "favorites_delete_own" ON favorites
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "analysis_requests_select_own" ON analysis_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "analysis_requests_insert_auth" ON analysis_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "analysis_reports_select_own" ON analysis_reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM analysis_requests
      WHERE analysis_requests.id = analysis_reports.request_id
      AND analysis_requests.user_id = auth.uid()
    )
  );

-- ========== 007_rpc.sql ==========
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

-- ========== 008_infrastructure.sql ==========
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

-- ========== 009_collection_logs.sql ==========
CREATE TABLE collection_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,
  deal_ymd TEXT,
  inserted INTEGER DEFAULT 0,
  updated INTEGER DEFAULT 0,
  errors INTEGER DEFAULT 0,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_collection_logs_type ON collection_logs (type, created_at DESC);

-- ========== 010_geocoding_cache.sql ==========
CREATE TABLE geocoding_cache (
  address TEXT PRIMARY KEY,
  lat NUMERIC(10,7),
  lng NUMERIC(10,7),
  accuracy TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ========== 011_data_functions.sql ==========
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

-- ========== 012_pg_cron.sql ==========
-- pg_cron extension (requires Supabase Pro plan)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily apt trade collection at 06:00 KST (21:00 UTC)
-- SELECT cron.schedule('collect-apt-trade-daily', '0 21 * * *', $$
--   SELECT net.http_post(
--     url := current_setting('app.settings.supabase_url') || '/functions/v1/collect-apt-trade',
--     headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'), 'Content-Type', 'application/json'),
--     body := '{}'::jsonb
--   );
-- $$);

-- Weekly cleanup of inactive properties
-- SELECT cron.schedule('cleanup-inactive-properties', '0 18 * * 0', $$
--   UPDATE properties SET is_active = false WHERE updated_at < now() - INTERVAL '30 days' AND is_active = true;
-- $$);

-- Monthly cleanup of old collection logs
-- SELECT cron.schedule('cleanup-collection-logs', '0 0 1 * *', $$
--   DELETE FROM collection_logs WHERE created_at < now() - INTERVAL '90 days';
-- $$);

-- Note: Uncomment the above when pg_cron extension is available (Supabase Pro plan)

-- ========== 013_schema_v2.sql ==========
-- 개인용 전환: RLS 비활성화 및 새 기능 추가
-- Migration 013: Schema V2

-- 1. RLS 비활성화
ALTER TABLE IF EXISTS properties DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS favorites DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS analysis_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS analysis_reports DISABLE ROW LEVEL SECURITY;

-- 2. RLS 정책 삭제 (006_rls.sql에서 생성된 것들)
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- 3. properties 테이블에 새 컬럼 추가
ALTER TABLE properties ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'none' CHECK (status IN ('none', 'interested', 'visit_planned', 'visited', 'candidate', 'rejected'));
ALTER TABLE properties ADD COLUMN IF NOT EXISTS memo TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS naver_link TEXT;

-- 4. favorites 테이블 user_id 기본값 설정 (개인용으로 전환)
ALTER TABLE favorites ALTER COLUMN user_id SET DEFAULT 'personal';
ALTER TABLE favorites ALTER COLUMN user_id DROP NOT NULL;

-- 5. analysis_requests 테이블 user_id 기본값 설정
ALTER TABLE analysis_requests ALTER COLUMN user_id SET DEFAULT 'personal';
ALTER TABLE analysis_requests ALTER COLUMN user_id DROP NOT NULL;

-- 6. user_preferences 테이블 (내 조건 설정)
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 가격
  budget_min BIGINT,
  budget_max BIGINT,
  deal_type TEXT DEFAULT 'sale' CHECK (deal_type IN ('sale', 'jeonse', 'monthly')),
  -- 매물 유형
  property_types TEXT[] DEFAULT ARRAY['apt'],
  -- 면적
  area_min NUMERIC,
  area_max NUMERIC,
  -- 위치
  preferred_regions TEXT[], -- ['서울 강남구', '서울 서초구']
  -- 기타 조건
  min_floor INT,
  max_floor INT,
  min_rooms INT,
  min_bathrooms INT,
  min_built_year INT,
  -- 메타
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. property_news 테이블 (매물 관련 뉴스)
CREATE TABLE IF NOT EXISTS property_news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  source TEXT, -- '네이버뉴스', '매일경제' 등
  summary TEXT,
  thumbnail_url TEXT,
  published_at TIMESTAMPTZ,
  crawled_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_property_news_property_id ON property_news(property_id);
CREATE INDEX IF NOT EXISTS idx_property_news_crawled_at ON property_news(crawled_at DESC);
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);

-- 9. trigram 확장 (텍스트 유사 검색) - 이미 001_extensions.sql에 있을 수 있음
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 10. properties 테이블 trigram 인덱스 (텍스트 검색 성능 향상)
CREATE INDEX IF NOT EXISTS idx_properties_name_trgm ON properties USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_properties_address_trgm ON properties USING gin (address gin_trgm_ops);

-- 11. user_preferences 업데이트 트리거
CREATE OR REPLACE FUNCTION update_user_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_user_preferences_updated_at();

-- ========== 014_search_rpc.sql ==========
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

-- ========== 015_news_cron.sql ==========
-- Add pg_cron schedule for news crawling
-- Requires pg_cron extension (Supabase Pro plan)

-- Schedule daily news crawling at 09:00 KST (00:00 UTC)
-- SELECT cron.schedule(
--   'crawl-property-news',
--   '0 0 * * *',
--   $$
--   SELECT net.http_post(
--     url := current_setting('app.settings.supabase_url') || '/functions/v1/crawl-news',
--     headers := jsonb_build_object(
--       'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
--       'Content-Type', 'application/json'
--     ),
--     body := '{}'::jsonb
--   );
--   $$
-- );

-- Add index on property_news for efficient queries
CREATE INDEX IF NOT EXISTS idx_property_news_property_id ON property_news(property_id);
CREATE INDEX IF NOT EXISTS idx_property_news_published_at ON property_news(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_property_news_url ON property_news(url);

-- Add unique constraint on url to prevent duplicates
ALTER TABLE property_news ADD CONSTRAINT IF NOT EXISTS unique_news_url UNIQUE (url);

-- Note: Uncomment the cron.schedule when pg_cron extension is available (Supabase Pro plan)
