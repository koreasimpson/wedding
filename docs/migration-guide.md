# DB 스키마 마이그레이션 가이드 (V2)

## 개요
개인용 집 구하기 도구로 전환하면서 인증/RLS 제거 및 새 기능(내 조건, 뉴스, 매물 상태) 추가

## 마이그레이션 파일

### 013_schema_v2.sql
- RLS 비활성화 및 정책 삭제
- properties 테이블에 status, memo, naver_link 컬럼 추가
- favorites, analysis_requests의 user_id를 nullable로 변경 (기본값: 'personal')
- user_preferences 테이블 생성 (사용자 선호도 설정)
- property_news 테이블 생성 (매물 관련 뉴스)
- 텍스트 검색용 trigram 인덱스 추가

### 014_search_rpc.sql
- search_properties_filtered: 텍스트 검색 + 필터링
- get_recommended_properties: user_preferences 기반 추천
- update_property_status: 매물 상태 업데이트 헬퍼
- get_property_news: 매물별 뉴스 조회

## 적용 방법

### 로컬 개발 환경

```bash
# Supabase 로컬 실행
npx supabase start

# 마이그레이션 적용
npx supabase db reset

# 또는 새 마이그레이션만 적용
npx supabase migration up
```

### 프로덕션 환경

```bash
# 마이그레이션 푸시
npx supabase db push

# 또는 Supabase 대시보드에서 SQL Editor로 직접 실행
# 1. 013_schema_v2.sql 복사 → 실행
# 2. 014_search_rpc.sql 복사 → 실행
```

## 타입 생성

```bash
# Supabase에서 TypeScript 타입 자동 생성
npx supabase gen types typescript --local > src/types/supabase.ts

# 또는 프로덕션에서
npx supabase gen types typescript --project-id <PROJECT_ID> > src/types/supabase.ts
```

## 변경 사항

### 1. properties 테이블
**새 컬럼:**
- `status`: 매물 상태 ('none', 'interested', 'visit_planned', 'visited', 'candidate', 'rejected')
- `memo`: 개인 메모
- `naver_link`: 네이버 부동산 링크

**사용 예시:**
```typescript
// 매물 상태 업데이트
const { data } = await supabase.rpc('update_property_status', {
  p_property_id: propertyId,
  p_status: 'interested',
  p_memo: '주말에 방문 예정'
});
```

### 2. user_preferences 테이블
**용도:** 개인 맞춤 검색 조건 저장

**사용 예시:**
```typescript
// 선호도 저장
await supabase.from('user_preferences').upsert({
  budget_min: 300000000,
  budget_max: 500000000,
  property_types: ['apt'],
  preferred_regions: ['서울 강남구', '서울 서초구'],
  min_floor: 5,
  min_rooms: 3,
});

// 추천 매물 조회
const { data } = await supabase.rpc('get_recommended_properties', {
  p_limit: 20
});
```

### 3. property_news 테이블
**용도:** 매물 관련 뉴스 크롤링 결과 저장

**사용 예시:**
```typescript
// 뉴스 저장
await supabase.from('property_news').insert({
  property_id: propertyId,
  title: '강남 아파트 시세 급등',
  url: 'https://news.example.com/...',
  source: '네이버뉴스',
  published_at: '2026-02-15T10:00:00Z',
});

// 매물별 뉴스 조회
const { data } = await supabase.rpc('get_property_news', {
  p_property_id: propertyId,
  p_limit: 10
});
```

### 4. 새 RPC 함수

#### search_properties_filtered
통합 검색 함수 (텍스트 + 필터 + 상태)

```typescript
const { data } = await supabase.rpc('search_properties_filtered', {
  p_query: '래미안',
  p_type: 'apt',
  p_price_min: 300000000,
  p_price_max: 500000000,
  p_status: 'interested',
  p_limit: 50,
});
```

#### get_recommended_properties
user_preferences 기반 자동 추천

```typescript
const { data } = await supabase.rpc('get_recommended_properties', {
  p_limit: 20
});
```

## RLS 제거 영향

- 모든 테이블에서 RLS 비활성화
- ANON_KEY로 모든 데이터 접근 가능 (개인용이므로 문제없음)
- 프로덕션 배포 시 네트워크 레벨 접근 제어 권장 (Supabase Auth 또는 IP 화이트리스트)

## 주의사항

1. **기존 데이터 유지**: properties 테이블의 기존 데이터는 유지되며, 새 컬럼은 기본값으로 채워짐
2. **user_id 마이그레이션**: favorites와 analysis_requests의 user_id가 nullable로 변경되었으나 기존 데이터는 유지
3. **RLS 정책**: 모든 RLS 정책이 삭제되므로, 인증 로직이 있다면 제거 필요
4. **인덱스**: trigram 인덱스 생성으로 텍스트 검색 성능 향상 (초기 생성 시간 소요 가능)

## 롤백

문제 발생 시 롤백:

```sql
-- 013_schema_v2.sql 롤백
DROP TABLE IF EXISTS property_news;
DROP TABLE IF EXISTS user_preferences;
ALTER TABLE properties DROP COLUMN IF EXISTS status;
ALTER TABLE properties DROP COLUMN IF EXISTS memo;
ALTER TABLE properties DROP COLUMN IF EXISTS naver_link;

-- 014_search_rpc.sql 롤백
DROP FUNCTION IF EXISTS search_properties_filtered;
DROP FUNCTION IF EXISTS get_recommended_properties;
DROP FUNCTION IF EXISTS update_property_status;
DROP FUNCTION IF EXISTS get_property_news;
```

## 다음 단계

1. 프론트엔드에서 새 타입 사용
2. 매물 상태 관리 UI 구현
3. 선호도 설정 페이지 구현
4. 뉴스 크롤링 스케줄러 구현 (Edge Functions + pg_cron)
