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
