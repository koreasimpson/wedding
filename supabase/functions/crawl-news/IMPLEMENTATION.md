# 뉴스 크롤링 Edge Function 구현 완료

## 구현 개요

관심 등록한 매물(status가 'interested', 'visit_planned', 'candidate')의 관련 뉴스를 자동으로 크롤링하여 property_news 테이블에 저장하는 Edge Function을 구현했습니다.

## 구현 파일

### 1. Edge Function
- **파일**: `/Users/kimchanho/wedding/supabase/functions/crawl-news/index.ts`
- **기능**: 네이버 뉴스 검색 API를 활용한 뉴스 크롤링
- **핵심 로직**:
  ```typescript
  1. status가 'interested', 'visit_planned', 'candidate'인 매물 조회
  2. 각 매물명으로 네이버 뉴스 검색 API 호출 (display=5, sort=date)
  3. HTML 태그 제거 후 property_news 테이블에 저장
  4. URL 중복 방지 (UNIQUE 제약조건)
  5. Rate limiting: 각 API 호출 사이 100ms 딜레이
  6. 에러 처리: 개별 매물 실패 시 다음 매물 계속 처리
  ```

### 2. 데이터베이스 마이그레이션
- **파일**: `/Users/kimchanho/wedding/supabase/migrations/015_news_cron.sql`
- **내용**:
  - pg_cron 스케줄 등록 (매일 09:00 KST)
  - property_news 테이블 인덱스 추가:
    - `idx_property_news_property_id` (property_id)
    - `idx_property_news_published_at` (published_at DESC)
    - `idx_property_news_url` (url)
  - URL UNIQUE 제약조건 추가 (중복 방지)

### 3. 환경변수
- **파일**: `/Users/kimchanho/wedding/.env.example`
- **추가된 환경변수**:
  ```bash
  NAVER_CLIENT_ID=your-naver-client-id
  NAVER_CLIENT_SECRET=your-naver-client-secret
  ```

### 4. 문서
- **README**: `/Users/kimchanho/wedding/supabase/functions/crawl-news/README.md`
  - API 사용법, 환경변수 설정, 스케줄링, 에러 처리 등 상세 설명
- **테스트 스크립트**: `/Users/kimchanho/wedding/supabase/functions/crawl-news/test.ts`
  - 로컬 테스트용 Deno 스크립트
- **Edge Functions 가이드**: `/Users/kimchanho/wedding/docs/EDGE_FUNCTIONS.md`
  - 전체 Edge Functions 개요 및 가이드
- **설정 가이드 업데이트**: `/Users/kimchanho/wedding/docs/SETUP_GUIDE.md`
  - 네이버 API 키 발급 방법 추가

## 네이버 뉴스 검색 API

### 엔드포인트
```
GET https://openapi.naver.com/v1/search/news.json
```

### 요청 헤더
```
X-Naver-Client-Id: {발급받은 ID}
X-Naver-Client-Secret: {발급받은 Secret}
```

### 요청 파라미터
- `query`: 검색어 (매물명)
- `display`: 검색 결과 개수 (5개)
- `sort`: 정렬 기준 (date: 최신순)

### 응답 구조
```json
{
  "items": [
    {
      "title": "뉴스 제목 (<b>태그 포함)</b>",
      "originallink": "원본 링크",
      "link": "네이버 뉴스 링크",
      "description": "요약 (<b>태그 포함</b>)",
      "pubDate": "발행일 (RFC 1123 형식)",
      "source": "출처"
    }
  ]
}
```

## 데이터 흐름

```
1. pg_cron 스케줄러 (매일 09:00 KST)
   ↓
2. crawl-news Edge Function 호출
   ↓
3. properties 테이블 조회 (status IN ['interested', 'visit_planned', 'candidate'])
   ↓
4. 각 매물별 네이버 뉴스 검색 API 호출
   ↓
5. HTML 태그 제거 후 property_news 테이블에 INSERT
   ↓
6. 중복 체크 (url UNIQUE) → 이미 존재하면 skip
   ↓
7. 결과 반환 (total_properties, crawled, failed, errors)
```

## 배포 가이드

### 1. 네이버 API 키 발급
1. [developers.naver.com](https://developers.naver.com) 접속
2. 애플리케이션 등록
3. 사용 API: "검색" 선택
4. Client ID와 Client Secret 확인

### 2. Supabase Secrets 설정
```bash
supabase secrets set NAVER_CLIENT_ID="your-client-id"
supabase secrets set NAVER_CLIENT_SECRET="your-client-secret"
```

### 3. Edge Function 배포
```bash
supabase functions deploy crawl-news
```

### 4. 마이그레이션 실행
Supabase Dashboard > SQL Editor에서 `015_news_cron.sql` 실행:
```sql
-- 인덱스 및 제약조건 생성
CREATE INDEX IF NOT EXISTS idx_property_news_property_id ON property_news(property_id);
CREATE INDEX IF NOT EXISTS idx_property_news_published_at ON property_news(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_property_news_url ON property_news(url);
ALTER TABLE property_news ADD CONSTRAINT IF NOT EXISTS unique_news_url UNIQUE (url);

-- pg_cron 스케줄 등록 (Pro 플랜 이상)
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

### 5. 수동 실행 테스트
```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/crawl-news \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

## 로컬 개발

### 1. 환경변수 설정
`supabase/functions/.env` 파일 생성:
```bash
NAVER_CLIENT_ID=your-client-id
NAVER_CLIENT_SECRET=your-client-secret
```

### 2. Edge Function 시작
```bash
supabase functions serve crawl-news --env-file supabase/functions/.env
```

### 3. 테스트
```bash
# curl로 테스트
curl -X POST http://localhost:54321/functions/v1/crawl-news \
  -H "Authorization: Bearer YOUR_ANON_KEY"

# 또는 Deno 스크립트
cd supabase/functions/crawl-news
deno run --allow-net test.ts
```

## 주요 기능

### 1. HTML 태그 제거
네이버 API는 `<b>` 태그를 포함한 HTML을 반환하므로 stripHtml 함수로 제거:
```typescript
function stripHtml(html: string): string {
  return html.replace(/<\/?[^>]+(>|$)/g, '').trim();
}
```

### 2. 중복 방지
URL 기준 UNIQUE 제약조건으로 중복 뉴스 자동 필터링:
```sql
ALTER TABLE property_news ADD CONSTRAINT unique_news_url UNIQUE (url);
```

### 3. Rate Limiting
네이버 API 호출 제한 준수를 위해 각 호출 사이 100ms 딜레이:
```typescript
await new Promise(resolve => setTimeout(resolve, 100));
```

### 4. 에러 처리
개별 매물 크롤링 실패 시 다음 매물 계속 처리:
```typescript
try {
  // 크롤링 로직
} catch (error) {
  totalFailed++;
  errors.push(errorMsg);
  continue; // 다음 매물 계속 처리
}
```

## 응답 형식

### 성공
```json
{
  "success": true,
  "total_properties": 10,
  "crawled": 8,
  "failed": 2,
  "errors": [
    "Failed to crawl news for 래미안 강남: API rate limit exceeded"
  ]
}
```

### 에러
```json
{
  "error": "Naver API credentials not configured"
}
```

## 모니터링

### Supabase Dashboard
1. Edge Functions 메뉴 이동
2. crawl-news 함수 선택
3. Logs 탭에서 실시간 로그 확인

### pg_cron 실행 이력
```sql
-- 스케줄 목록
SELECT * FROM cron.job WHERE jobname = 'crawl-property-news';

-- 실행 이력 (최근 10개)
SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'crawl-property-news')
ORDER BY start_time DESC
LIMIT 10;
```

## 문제 해결

### 뉴스가 저장되지 않음
1. 환경변수 확인: `supabase secrets list`
2. 매물 status 확인: 'interested', 'visit_planned', 'candidate' 중 하나여야 함
3. 네이버 API 할당량 확인 (일일 호출 제한)

### 중복 뉴스 계속 쌓임
1. UNIQUE 제약조건 확인:
   ```sql
   SELECT constraint_name FROM information_schema.table_constraints
   WHERE table_name = 'property_news' AND constraint_type = 'UNIQUE';
   ```
2. 마이그레이션 실행 여부 확인 (`015_news_cron.sql`)

### pg_cron이 작동하지 않음
1. Supabase 플랜 확인 (Pro 플랜 이상 필요)
2. 스케줄 등록 확인:
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'crawl-property-news';
   ```
3. 주석 해제 확인 (마이그레이션 파일에서 `--` 제거)

## 다음 단계

### 1. 프론트엔드 통합
- property_news 테이블 조회 hook 생성 (usePropertyNews)
- 매물 상세 페이지에 뉴스 섹션 추가
- 뉴스 카드 컴포넌트 구현 (제목, 출처, 발행일, 요약, 링크)

### 2. 고급 기능
- 뉴스 감성 분석 (긍정/부정/중립)
- 키워드 추출 및 하이라이팅
- 뉴스 알림 (새 뉴스 발생 시 사용자 알림)
- 뉴스 아카이빙 (일정 기간 경과 후 자동 삭제)

### 3. 성능 최적화
- 뉴스 크롤링 결과 캐싱
- 매물별 마지막 크롤링 시간 저장 (중복 호출 방지)
- 배치 처리 (한 번에 여러 매물 검색 후 일괄 저장)

## 참고 자료

- [네이버 뉴스 검색 API 문서](https://developers.naver.com/docs/serviceapi/search/news/news.md)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [pg_cron 문서](https://supabase.com/docs/guides/database/extensions/pg_cron)
- [Deno Manual](https://deno.land/manual)

## 체크리스트

- [x] Edge Function 구현 (index.ts)
- [x] 마이그레이션 생성 (015_news_cron.sql)
- [x] 환경변수 문서화 (.env.example)
- [x] README 작성 (crawl-news/README.md)
- [x] 테스트 스크립트 작성 (test.ts)
- [x] Edge Functions 가이드 업데이트
- [x] 설정 가이드 업데이트
- [x] 프로젝트 README 업데이트
- [ ] 네이버 API 키 발급 (개발자가 직접)
- [ ] Supabase Secrets 설정 (개발자가 직접)
- [ ] Edge Function 배포 (개발자가 직접)
- [ ] 마이그레이션 실행 (개발자가 직접)
- [ ] 수동 실행 테스트 (개발자가 직접)
- [ ] 프론트엔드 통합 (향후 작업)
