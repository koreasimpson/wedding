-- 017_ux_redesign.sql
-- UX 개편: 매물 상태 관리 강화 + AI 분석 타입 확장

-- 1. properties 테이블에 방문/메모 컬럼 추가
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS visit_date DATE,
ADD COLUMN IF NOT EXISTS visit_memo TEXT,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 2. analysis_reports: analysis_type 확장 (news_summary, review_summary 추가)
ALTER TABLE analysis_reports
DROP CONSTRAINT IF EXISTS analysis_reports_analysis_type_check;

ALTER TABLE analysis_reports
ADD CONSTRAINT analysis_reports_analysis_type_check
CHECK (analysis_type IN ('market', 'location', 'investment', 'regulation', 'risk', 'news_summary', 'review_summary'));

-- 3. analysis_requests: 기본값 확장 (7개 타입)
ALTER TABLE analysis_requests
ALTER COLUMN analysis_types SET DEFAULT '{market,location,investment,regulation,risk,news_summary,review_summary}';

ALTER TABLE analysis_requests
ALTER COLUMN total_count SET DEFAULT 7;

-- 4. favorites → properties.status 마이그레이션
UPDATE properties p
SET status = 'interested'
WHERE p.status = 'none'
AND EXISTS (
  SELECT 1 FROM favorites f WHERE f.property_id = p.id
);

-- 5. 매물 상태별 조회를 위한 RPC
CREATE OR REPLACE FUNCTION get_properties_by_status(
  p_status TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS SETOF properties
LANGUAGE sql STABLE
AS $$
  SELECT *
  FROM properties
  WHERE
    CASE
      WHEN p_status IS NULL THEN status != 'none'
      ELSE status = p_status
    END
    AND is_active = true
  ORDER BY updated_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;

-- 6. 상태별 매물 수 카운트 RPC
CREATE OR REPLACE FUNCTION get_property_status_counts()
RETURNS TABLE(status TEXT, count BIGINT)
LANGUAGE sql STABLE
AS $$
  SELECT p.status, COUNT(*)
  FROM properties p
  WHERE p.is_active = true AND p.status != 'none'
  GROUP BY p.status;
$$;

-- 7. 분석 안 된 관심 매물 조회 RPC
CREATE OR REPLACE FUNCTION get_unanalyzed_properties(p_limit INTEGER DEFAULT 5)
RETURNS SETOF properties
LANGUAGE sql STABLE
AS $$
  SELECT p.*
  FROM properties p
  WHERE p.status IN ('interested', 'visit_planned')
    AND p.is_active = true
    AND NOT EXISTS (
      SELECT 1 FROM analysis_requests ar
      WHERE ar.property_id = p.id AND ar.status = 'completed'
    )
  ORDER BY p.updated_at DESC
  LIMIT p_limit;
$$;

-- RPC에 anon 권한 부여
GRANT EXECUTE ON FUNCTION get_properties_by_status TO anon;
GRANT EXECUTE ON FUNCTION get_property_status_counts TO anon;
GRANT EXECUTE ON FUNCTION get_unanalyzed_properties TO anon;
