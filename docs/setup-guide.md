# 부동산 매물 분석 서비스 - 배포 가이드

> FE 개발자를 위한 단계별 가이드입니다.
> 각 단계를 순서대로 따라하시면 됩니다.

---

## 목차

1. [DB 마이그레이션 실행](#1-db-마이그레이션-실행)
2. [API 키 발급](#2-api-키-발급)
3. [Supabase에 환경변수 등록](#3-supabase에-환경변수-등록)
4. [Edge Functions 배포](#4-edge-functions-배포)
5. [동작 확인](#5-동작-확인)

---

## 1. DB 마이그레이션 실행

새로 추가한 `property_reviews` 테이블과 수정된 RPC 함수를 Supabase DB에 적용해야 합니다.

### 방법 A: Supabase Dashboard에서 직접 실행 (가장 쉬움)

1. [Supabase Dashboard](https://supabase.com/dashboard) 접속
2. 프로젝트 선택
3. 왼쪽 메뉴에서 **SQL Editor** 클릭 (데이터베이스 아이콘 아래)
4. **New Query** 클릭
5. `supabase/migrations/016_reviews_and_fixes.sql` 파일의 내용을 복사해서 붙여넣기
6. **Run** 버튼 클릭
7. "Success. No rows returned" 같은 메시지가 나오면 성공

### 방법 B: Supabase CLI 사용

```bash
# Supabase CLI 설치 (아직 없다면)
brew install supabase/tap/supabase

# 프로젝트 연결 (최초 1회)
supabase link --project-ref <your-project-ref>
# project-ref는 Supabase Dashboard URL에서 확인:
# https://supabase.com/dashboard/project/<여기가-project-ref>

# 마이그레이션 실행
supabase db push
```

### 확인 방법

Supabase Dashboard > **Table Editor** 에서:
- `property_reviews` 테이블이 새로 생겼는지 확인
- 컬럼: id, property_id, title, url, source, summary, author, published_at, crawled_at

---

## 2. API 키 발급

총 4개 서비스에서 API 키를 발급받아야 합니다. 모두 **무료**입니다.

### 2-1. 네이버 개발자센터 (뉴스/블로그 검색)

> 뉴스 수집, 임장 후기 수집에 사용됩니다.

1. [네이버 개발자센터](https://developers.naver.com) 접속
2. 상단 **Application** > **애플리케이션 등록** 클릭
3. 애플리케이션 이름: `부동산분석` (자유롭게)
4. **사용 API** 에서 **검색** 선택
5. **비로그인 오픈 API 서비스 환경** 에서:
   - **WEB 설정** 선택
   - 서비스 URL: 본인 Supabase URL (예: `https://xxxxx.supabase.co`)
6. **등록** 클릭
7. 발급된 **Client ID**와 **Client Secret** 메모

```
NAVER_CLIENT_ID = xxxxxxxxxx     ← "Client ID" 값
NAVER_CLIENT_SECRET = xxxxxxxxxx ← "Client Secret" 값
```

**일일 호출 한도**: 25,000회 (넉넉합니다)

---

### 2-2. 공공데이터포털 (아파트 실거래가)

> 최신 추천 매물 검색에 사용됩니다.

1. [공공데이터포털](https://www.data.go.kr) 접속, 회원가입/로그인
2. 검색창에 **"아파트매매 실거래 상세 자료"** 검색
3. **국토교통부_아파트매매 실거래 상세 자료** 클릭
4. **활용신청** 버튼 클릭
5. 활용 목적: `개인 학습용` (자유롭게)
6. **신청** 완료
7. **마이페이지** > **활용신청 현황** 에서 **일반 인증키 (Encoding)** 복사

```
API_KEY_MOLIT_APT_TRADE = xxxxxxxxxx ← 인증키 (Encoding) 값
```

**주의**: 신청 후 **1~2시간** 후에 키가 활성화됩니다. 바로 안 되면 기다리세요.

---

### 2-3. 카카오 개발자센터 (주소 → 좌표 변환)

> 매물 추가 시 주소를 지도 좌표로 변환하는 데 사용됩니다.

1. [카카오 개발자센터](https://developers.kakao.com) 접속, 로그인
2. **내 애플리케이션** > **애플리케이션 추가하기** 클릭
3. 앱 이름: `부동산분석`, 사업자명: 본인 이름
4. 생성된 앱 클릭 > **앱 키** 탭
5. **REST API 키** 복사

```
KAKAO_REST_API_KEY = xxxxxxxxxx ← "REST API 키" 값
```

6. (선택) **플랫폼** 탭 > **Web** > 사이트 도메인에 `http://localhost:3000` 추가

---

### 2-4. Anthropic Console (AI 분석)

> Claude API를 이용한 매물 AI 분석에 사용됩니다.

1. [Anthropic Console](https://console.anthropic.com) 접속, 계정 생성/로그인
2. **API Keys** 메뉴 클릭
3. **Create Key** 클릭, 이름: `property-analysis`
4. 생성된 키 복사 (sk-ant-... 형태)

```
ANTHROPIC_API_KEY = sk-ant-xxxxxxxxxx ← API 키 값
```

**비용 안내**:
- 무료 크레딧 $5 제공 (신규 가입 시)
- 분석 1건당 약 $0.01~0.05 (매우 저렴)
- Claude API 키가 없어도 앱은 동작합니다 (Mock 데이터로 fallback)

---

## 3. Supabase에 환경변수 등록

Edge Functions에서 사용할 API 키를 Supabase에 등록합니다.

### 방법 A: Supabase Dashboard (가장 쉬움)

1. [Supabase Dashboard](https://supabase.com/dashboard) 접속
2. 프로젝트 선택
3. 왼쪽 메뉴 **Edge Functions** 클릭 (번개 아이콘)
4. 상단 **Secrets** 탭 클릭
5. 아래 5개 키를 하나씩 추가:

| Name | Value |
|------|-------|
| `NAVER_CLIENT_ID` | 네이버에서 발급받은 Client ID |
| `NAVER_CLIENT_SECRET` | 네이버에서 발급받은 Client Secret |
| `API_KEY_MOLIT_APT_TRADE` | 공공데이터포털 인증키 (Encoding) |
| `KAKAO_REST_API_KEY` | 카카오 REST API 키 |
| `ANTHROPIC_API_KEY` | Anthropic API 키 (sk-ant-...) |

각 키마다 **Add new secret** 클릭 > Name과 Value 입력 > **Save**

### 방법 B: Supabase CLI

```bash
supabase secrets set NAVER_CLIENT_ID=값 NAVER_CLIENT_SECRET=값 API_KEY_MOLIT_APT_TRADE=값 KAKAO_REST_API_KEY=값 ANTHROPIC_API_KEY=값
```

---

## 4. Edge Functions 배포

코드에서 작성한 Edge Functions를 Supabase 서버에 배포합니다.

### 방법: Supabase CLI

```bash
# 프로젝트 디렉토리에서 실행
cd /Users/kimchanho/wedding

# 모든 Edge Functions 한 번에 배포
supabase functions deploy crawl-news
supabase functions deploy crawl-reviews
supabase functions deploy parse-naver-property
supabase functions deploy collect-apt-trade
supabase functions deploy analysis-request

# 기존 함수들도 함께 배포 (변경 없어도 괜찮음)
supabase functions deploy search-properties
supabase functions deploy proxy
supabase functions deploy collect-schools
```

**배포 시 에러가 나면?**
- `supabase link` 먼저 했는지 확인
- `supabase login` 으로 로그인 상태 확인

### 배포 확인

Supabase Dashboard > **Edge Functions** 에서:
- `crawl-news`, `crawl-reviews`, `parse-naver-property`, `collect-apt-trade`, `analysis-request` 5개가 보이면 성공
- 각 함수 클릭하면 Logs(로그) 탭에서 호출 내역 확인 가능

---

## 5. 동작 확인

### 5-1. 매물 추가 테스트

1. 앱 실행: `npm run dev`
2. 헤더의 **"매물 추가"** 버튼 클릭
3. 네이버 부동산 URL 입력 (예: `https://new.land.naver.com/complexes/12345`)
4. **"파싱"** 클릭
5. 성공하면 매물이 DB에 저장됨
6. 실패하면 수동 입력 폼이 나타남 → 직접 정보 입력 후 추가

### 5-2. 뉴스/후기 수집 테스트

1. 매물 상세 페이지 접속 (`/property/[id]`)
2. **"뉴스 수집"** 버튼 클릭 → 관련 뉴스가 로딩됨
3. **"후기 수집"** 버튼 클릭 → 블로그 임장 후기가 로딩됨

### 5-3. 최신 매물 검색 테스트

1. 대시보드 페이지 (`/`)
2. **"최신 추천 매물 검색"** 버튼 클릭
3. 로딩 → 국토교통부 실거래 데이터 수집 → 새 매물 표시

### 5-4. AI 분석 테스트

1. 매물 상세 페이지에서 **"리포트 생성하기"** 클릭
2. ANTHROPIC_API_KEY가 설정되어 있으면 Claude AI가 분석
3. 설정되어 있지 않으면 Mock 데이터로 자동 fallback (앱은 정상 동작)

---

## 트러블슈팅

### "Naver API credentials not configured" 에러
→ Supabase Secrets에 `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET` 등록했는지 확인

### 매물 수집이 안 됨 (collect-apt-trade)
→ 공공데이터포털 키가 활성화됐는지 확인 (신청 후 1~2시간 소요)
→ Supabase Dashboard > Edge Functions > `collect-apt-trade` > Logs 확인

### 네이버 부동산 파싱 실패
→ 네이버가 API 차단하는 경우가 있음. 수동 입력 폼으로 대체하면 됨

### AI 분석이 Mock 데이터로만 나옴
→ `ANTHROPIC_API_KEY`가 등록되어 있는지 확인
→ 크레딧이 남아있는지 [Anthropic Console](https://console.anthropic.com) 에서 확인

### Edge Function 배포 실패
```bash
# CLI 로그인 상태 확인
supabase login

# 프로젝트 연결 확인
supabase link --project-ref <project-ref>

# 다시 배포
supabase functions deploy <function-name>
```
