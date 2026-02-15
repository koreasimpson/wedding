# crawl-news Edge Function

## 목적
관심 등록한 매물(status가 'interested', 'visit_planned', 'candidate')의 관련 뉴스를 자동으로 크롤링하여 property_news 테이블에 저장합니다.

## 동작 흐름

1. **매물 조회**: status가 'interested', 'visit_planned', 'candidate' 중 하나이고 is_active=true인 매물을 조회
2. **뉴스 검색**: 각 매물의 name(단지명)으로 네이버 뉴스 검색 API 호출
3. **데이터 저장**: 검색 결과를 property_news 테이블에 저장
4. **중복 방지**: url 기준으로 중복 체크 (UNIQUE 제약조건)

## 네이버 뉴스 검색 API

### 엔드포인트
```
GET https://openapi.naver.com/v1/search/news.json
```

### 헤더
- `X-Naver-Client-Id`: 네이버 개발자 센터에서 발급받은 Client ID
- `X-Naver-Client-Secret`: 네이버 개발자 센터에서 발급받은 Client Secret

### 파라미터
- `query`: 검색어 (매물명)
- `display`: 검색 결과 개수 (기본 5개)
- `sort`: 정렬 기준 (date: 날짜순)

### 응답 구조
```json
{
  "items": [
    {
      "title": "뉴스 제목 (HTML 태그 포함)",
      "originallink": "원본 링크",
      "link": "네이버 뉴스 링크",
      "description": "요약 (HTML 태그 포함)",
      "pubDate": "발행일 (RFC 1123)",
      "source": "출처"
    }
  ]
}
```

## 환경변수

### Supabase 자동 제공
- `SUPABASE_URL`: Supabase 프로젝트 URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service Role Key (RLS 우회)

### 수동 설정 필요
- `NAVER_CLIENT_ID`: 네이버 개발자 센터에서 발급
- `NAVER_CLIENT_SECRET`: 네이버 개발자 센터에서 발급

## 환경변수 설정 방법

### 로컬 개발
```bash
# supabase/functions/.env
NAVER_CLIENT_ID=your-naver-client-id
NAVER_CLIENT_SECRET=your-naver-client-secret
```

### Supabase 배포
```bash
supabase secrets set NAVER_CLIENT_ID=your-naver-client-id
supabase secrets set NAVER_CLIENT_SECRET=your-naver-client-secret
```

## 스케줄링 (pg_cron)

매일 09:00 KST (00:00 UTC)에 자동 실행됩니다.

```sql
SELECT cron.schedule(
  'crawl-property-news',
  '0 0 * * *',
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

**참고**: pg_cron은 Supabase Pro 플랜 이상에서만 사용 가능합니다.

## 수동 실행

### 로컬
```bash
supabase functions serve crawl-news
curl -X POST http://localhost:54321/functions/v1/crawl-news \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

### 배포된 환경
```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/crawl-news \
  -H "Authorization: Bearer YOUR_ANON_KEY"
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

## 에러 처리

1. **API 인증 실패**: 네이버 API 키가 없거나 잘못된 경우
   - HTTP 500 반환
   - 메시지: "Naver API credentials not configured"

2. **개별 매물 크롤링 실패**:
   - 해당 매물을 건너뛰고 다음 매물 계속 처리
   - errors 배열에 에러 메시지 포함

3. **중복 뉴스**:
   - URL이 이미 존재하는 경우 자동으로 무시 (UNIQUE 제약조건)

## Rate Limiting

- 각 네이버 API 호출 사이에 100ms 딜레이 적용
- 네이버 API는 일일 호출 제한이 있으므로 주의

## 데이터베이스 스키마

### property_news 테이블
```sql
CREATE TABLE property_news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id),
  title TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  source TEXT,
  summary TEXT,
  thumbnail_url TEXT,
  published_at TIMESTAMPTZ,
  crawled_at TIMESTAMPTZ DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_property_news_property_id ON property_news(property_id);
CREATE INDEX idx_property_news_published_at ON property_news(published_at DESC);
CREATE INDEX idx_property_news_url ON property_news(url);
```

## HTML 태그 처리

네이버 뉴스 API는 `<b>` 태그를 포함한 HTML을 반환합니다. 이를 제거하기 위해 `stripHtml` 함수를 사용합니다.

```typescript
function stripHtml(html: string): string {
  return html.replace(/<\/?[^>]+(>|$)/g, '').trim();
}
```

## 보안

- Service Role Key는 Edge Function 내부에서만 사용 (RLS 우회)
- CORS 헤더 설정으로 브라우저에서 직접 호출 가능
- 네이버 API 키는 환경변수로 관리 (코드에 하드코딩 금지)

## 로그

- Supabase Dashboard > Edge Functions > Logs에서 확인
- 각 매물별 크롤링 성공/실패 로그 출력
- 에러 발생 시 상세 메시지 출력

## 문제 해결

### 뉴스가 저장되지 않는 경우
1. 환경변수 확인: `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`
2. 매물 status 확인: 'interested', 'visit_planned', 'candidate' 중 하나여야 함
3. 네이버 API 할당량 확인: 일일 호출 제한 초과 여부

### 중복 뉴스가 계속 쌓이는 경우
1. UNIQUE 제약조건 확인: `unique_news_url`
2. 마이그레이션 실행 확인: `015_news_cron.sql`

## 참고 자료

- [네이버 뉴스 검색 API 문서](https://developers.naver.com/docs/serviceapi/search/news/news.md)
- [Supabase Edge Functions 문서](https://supabase.com/docs/guides/functions)
- [pg_cron 문서](https://supabase.com/docs/guides/database/extensions/pg_cron)
