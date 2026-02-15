# Edge Functions 가이드

Supabase Edge Functions는 Deno 기반 서버리스 함수로, 백엔드 로직을 실행하고 외부 API와 통신합니다.

## 개요

| Function | 목적 | 스케줄 |
|----------|------|--------|
| **search-properties** | 매물 검색 API | 수동 |
| **proxy** | 공공 API CORS 우회 | 수동 |
| **collect-apt-trade** | 아파트 실거래 수집 | 매일 06:00 KST |
| **collect-schools** | 학교 정보 수집 | 수동 |
| **analysis-request** | 분석 요청 생성 | 수동 |
| **crawl-news** | 관심 매물 뉴스 크롤링 | 매일 09:00 KST |

## 공통 패턴

### 기본 구조
```typescript
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // 로직 구현

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
```

### 환경변수 접근
```typescript
// Supabase 자동 제공
Deno.env.get('SUPABASE_URL')
Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
Deno.env.get('SUPABASE_ANON_KEY')

// 사용자 정의
Deno.env.get('MOLIT_API_KEY')
Deno.env.get('NAVER_CLIENT_ID')
```

### 에러 처리
```typescript
try {
  // 로직
} catch (error) {
  return new Response(
    JSON.stringify({ error: (error as Error).message }),
    {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}
```

## 각 Function 상세

### 1. search-properties
매물 검색 및 필터링 API.

**엔드포인트**: `POST /functions/v1/search-properties`

**파라미터**:
- `bounds`: { sw_lat, sw_lng, ne_lat, ne_lng }
- `filters`: { type, price_min, price_max, area_min, area_max }

**사용 예시**:
```typescript
const { data } = await supabase.functions.invoke('search-properties', {
  body: {
    bounds: { sw_lat: 37.5, sw_lng: 127.0, ne_lat: 37.6, ne_lng: 127.1 },
    filters: { type: 'apt', price_min: 500000000 }
  }
});
```

### 2. proxy
공공 API CORS 우회 프록시.

**엔드포인트**: `GET /functions/v1/proxy?api=molit-apt-trade&param1=value1`

**허용 API**:
- `molit-apt-trade`: 국토교통부 아파트 실거래
- `schoolinfo`: 학교정보
- `airkorea`: 대기오염정보

**보안**:
- 화이트리스트 방식 (ALLOWED_APIS)
- API 키는 서버 환경변수에서 로드
- 클라이언트에서 직접 API 키 노출 방지

### 3. collect-apt-trade
국토교통부 아파트 실거래 데이터 수집.

**스케줄**: 매일 06:00 KST (pg_cron)

**동작**:
1. 서울/경기 25개 구 반복
2. 당월 실거래 데이터 조회
3. 카카오 API로 좌표 변환
4. properties 테이블에 upsert

**환경변수**:
- `API_KEY_MOLIT_APT_TRADE`
- `KAKAO_REST_API_KEY`

### 4. collect-schools
학교 정보 수집.

**엔드포인트**: `POST /functions/v1/collect-schools`

**동작**:
1. 교육청별 학교정보 API 호출
2. infrastructure 테이블에 저장 (type='school')
3. 좌표, 학교급(초/중/고) 포함

### 5. analysis-request
분석 요청 생성.

**엔드포인트**: `POST /functions/v1/analysis-request`

**파라미터**:
```json
{
  "property_id": "uuid",
  "analysis_types": ["market", "location", "investment"]
}
```

**인증**: 필수 (auth.users)

**RLS**: 본인 요청만 조회 가능

### 6. crawl-news (NEW)
관심 매물의 뉴스 자동 크롤링.

**스케줄**: 매일 09:00 KST (pg_cron)

**동작**:
1. status가 'interested', 'visit_planned', 'candidate'인 매물 조회
2. 각 매물명으로 네이버 뉴스 검색 API 호출
3. property_news 테이블에 저장
4. 중복 방지 (url UNIQUE)

**환경변수**:
- `NAVER_CLIENT_ID`
- `NAVER_CLIENT_SECRET`

**Rate Limiting**: 각 API 호출 사이 100ms 딜레이

**에러 처리**: 개별 매물 실패 시 다음 매물 계속 처리

## 로컬 개발

### 1. Edge Function 시작
```bash
# 모든 함수 시작
supabase functions serve

# 특정 함수만 시작
supabase functions serve crawl-news

# 환경변수 파일 지정
supabase functions serve --env-file supabase/functions/.env
```

### 2. 테스트
```bash
# curl로 테스트
curl -X POST http://localhost:54321/functions/v1/crawl-news \
  -H "Authorization: Bearer YOUR_ANON_KEY"

# Deno 스크립트로 테스트
cd supabase/functions/crawl-news
deno run --allow-net test.ts
```

### 3. 로그 확인
```bash
# 실시간 로그
supabase functions logs crawl-news --follow
```

## 배포

### 1. 환경변수 설정
```bash
supabase secrets set NAVER_CLIENT_ID="your-id"
supabase secrets set NAVER_CLIENT_SECRET="your-secret"
```

### 2. 함수 배포
```bash
# 모든 함수 배포
supabase functions deploy

# 특정 함수만 배포
supabase functions deploy crawl-news
```

### 3. 배포 확인
```bash
# 함수 목록
supabase functions list

# 로그 확인
supabase functions logs crawl-news
```

## pg_cron 스케줄링

### 스케줄 등록
```sql
SELECT cron.schedule(
  'crawl-property-news',
  '0 0 * * *', -- 매일 00:00 UTC (09:00 KST)
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/crawl-news',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

### 스케줄 관리
```sql
-- 스케줄 목록
SELECT * FROM cron.job;

-- 스케줄 삭제
SELECT cron.unschedule('crawl-property-news');

-- 실행 이력
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
```

**주의**: pg_cron은 Supabase Pro 플랜 이상에서만 사용 가능합니다.

## 보안

### Service Role Key
- RLS를 우회하여 모든 데이터 접근 가능
- Edge Function 내부에서만 사용
- 절대 클라이언트에 노출 금지

### ANON Key
- RLS 적용됨
- 클라이언트에서 사용 가능
- 환경변수로 관리하지만 노출되어도 RLS로 보호

### API 키 관리
- 모든 외부 API 키는 Supabase Secrets로 관리
- 코드에 하드코딩 금지
- 로컬 개발: `supabase/functions/.env`
- 배포: `supabase secrets set`

## 모니터링

### Supabase Dashboard
1. **Edge Functions** 메뉴 이동
2. 함수별 호출 횟수, 에러율, 평균 응답 시간 확인
3. **Logs** 탭에서 실시간 로그 확인

### 수동 실행
```bash
# 로컬
curl -X POST http://localhost:54321/functions/v1/crawl-news \
  -H "Authorization: Bearer ANON_KEY"

# 배포
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/crawl-news \
  -H "Authorization: Bearer ANON_KEY"
```

## 문제 해결

### Function이 실행되지 않음
1. 환경변수 확인: `supabase secrets list`
2. 함수 배포 확인: `supabase functions list`
3. 로그 확인: `supabase functions logs crawl-news`

### CORS 에러
1. `corsHeaders`가 Response에 포함되었는지 확인
2. OPTIONS 메서드 핸들러가 있는지 확인

### 환경변수가 undefined
1. 로컬: `supabase/functions/.env` 파일 존재 여부
2. 배포: `supabase secrets list`로 등록 여부 확인
3. 함수 재배포: `supabase functions deploy crawl-news`

### pg_cron이 작동하지 않음
1. Supabase 플랜 확인 (Pro 이상 필요)
2. `SELECT * FROM cron.job;`로 스케줄 등록 확인
3. `SELECT * FROM cron.job_run_details;`로 실행 이력 확인

## 참고 자료

- [Supabase Edge Functions 문서](https://supabase.com/docs/guides/functions)
- [Deno 문서](https://deno.land/manual)
- [pg_cron 문서](https://supabase.com/docs/guides/database/extensions/pg_cron)
- [네이버 검색 API](https://developers.naver.com/docs/serviceapi/search/news/news.md)
