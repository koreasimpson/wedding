# 설정 가이드

이 문서는 부동산 매물 분석 서비스의 로컬 개발 환경을 구성하는 방법을 안내합니다.

## 1. 사전 준비

- Node.js 20 이상
- npm 10 이상
- Supabase 계정
- 카카오 개발자 계정

## 2. API 키 발급

### 2.1 Supabase 프로젝트 생성

1. [supabase.com](https://supabase.com) 접속 후 로그인
2. 대시보드에서 "New Project" 클릭
3. 프로젝트 이름, 데이터베이스 비밀번호, 리전(Northeast Asia - ap-northeast-2 권장)을 설정하고 생성
4. 프로젝트가 생성되면 Settings > API 페이지에서 다음 값을 확인:
   - **Project URL**: `NEXT_PUBLIC_SUPABASE_URL`에 사용
   - **anon public key**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`에 사용

### 2.2 카카오맵 API 키 발급

1. [developers.kakao.com](https://developers.kakao.com) 접속 후 로그인
2. "내 애플리케이션" > "애플리케이션 추가하기" 클릭
3. 앱 이름 입력 후 저장
4. 생성된 앱의 "앱 설정" > "플랫폼"에서 Web 플랫폼 등록
   - 사이트 도메인: `http://localhost:3000` (개발용)
5. "앱 키" 메뉴에서 **JavaScript 키**를 확인: `NEXT_PUBLIC_KAKAO_JS_KEY`에 사용

### 2.3 공공데이터 API 키 발급 (선택)

데이터 수집 Edge Functions를 사용하려면 다음 API 키가 필요합니다.

1. [data.go.kr](https://data.go.kr) 접속 후 회원가입
2. 다음 API를 각각 활용 신청:
   - **국토교통부 아파트매매 실거래자료**: `MOLIT_API_KEY`
   - **학교정보 공개 서비스**: `SCHOOLINFO_API_KEY`
   - **한국환경공단 에어코리아 대기오염정보**: `AIRKOREA_API_KEY`
3. 승인 후 발급된 인증키를 Supabase Edge Functions 환경변수로 설정:

```bash
supabase secrets set MOLIT_API_KEY="발급받은키"
supabase secrets set SCHOOLINFO_API_KEY="발급받은키"
supabase secrets set AIRKOREA_API_KEY="발급받은키"
```

### 2.4 네이버 뉴스 검색 API 키 발급 (선택)

관심 매물의 뉴스 크롤링 기능을 사용하려면 네이버 API 키가 필요합니다.

1. [developers.naver.com](https://developers.naver.com) 접속 후 로그인
2. "Application" > "애플리케이션 등록" 클릭
3. 애플리케이션 정보 입력:
   - 애플리케이션 이름: 원하는 이름 입력
   - 사용 API: "검색" 선택
   - 비로그인 오픈API 서비스 환경: "WEB 설정" 추가 (http://localhost 등록)
4. 등록 후 **Client ID**와 **Client Secret** 확인
5. Supabase Edge Functions 환경변수로 설정:

```bash
supabase secrets set NAVER_CLIENT_ID="발급받은ID"
supabase secrets set NAVER_CLIENT_SECRET="발급받은Secret"
```

## 3. 환경변수 설정

프로젝트 루트에서 `.env.example`을 복사하여 `.env.local`을 생성합니다.

```bash
cp .env.example .env.local
```

`.env.local` 파일을 열어 2단계에서 발급받은 실제 키 값을 입력합니다.

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...

# 카카오맵
NEXT_PUBLIC_KAKAO_JS_KEY=abc123def456

# 공공 API (Edge Functions - 선택)
MOLIT_API_KEY=your-molit-api-key
SCHOOLINFO_API_KEY=your-schoolinfo-api-key
AIRKOREA_API_KEY=your-airkorea-api-key

# 네이버 뉴스 검색 API (Edge Functions - 선택)
NAVER_CLIENT_ID=your-naver-client-id
NAVER_CLIENT_SECRET=your-naver-client-secret
```

주의: `.env.local` 파일은 `.gitignore`에 포함되어 있으므로 Git에 커밋되지 않습니다.

## 4. 데이터베이스 마이그레이션

Supabase 대시보드의 SQL Editor에서 `supabase/migrations/` 디렉토리의 SQL 파일을 아래 순서대로 실행합니다.

1. `001_extensions.sql` - PostGIS, pg_trgm 확장 활성화
2. `002_properties.sql` - 매물 테이블 생성
3. `003_profiles.sql` - 사용자 프로필 테이블 생성
4. `004_favorites.sql` - 관심 매물 테이블 생성
5. `005_analysis.sql` - 분석 요청/결과 테이블 생성
6. `006_rls.sql` - Row Level Security 정책 적용
7. `007_rpc.sql` - 공간 검색 RPC 함수 생성
8. `008_infrastructure.sql` - 인프라 데이터 테이블 생성
9. `009_collection_logs.sql` - 데이터 수집 로그 테이블 생성
10. `010_geocoding_cache.sql` - Geocoding 캐시 테이블 생성
11. `011_data_functions.sql` - 데이터 처리 함수 생성
12. `012_pg_cron.sql` - 스케줄 작업 설정
13. `013_schema_v2.sql` - 스키마 v2 업데이트
14. `014_search_rpc.sql` - 검색 RPC 함수 업데이트
15. `015_news_cron.sql` - 뉴스 크롤링 스케줄 및 인덱스

또는 Supabase CLI를 사용하는 경우:

```bash
# Supabase CLI 설치 (이미 설치되어 있다면 생략)
npm install -g supabase

# 로컬 Supabase 시작
supabase start

# 마이그레이션 적용
supabase db push
```

## 5. 개발 서버 실행

```bash
# 의존성 설치
npm install

# 개발 서버 시작
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)으로 접속하여 동작을 확인합니다.

## 6. 빌드 및 배포

```bash
# 프로덕션 빌드
npm run build

# 빌드 결과 로컬 실행
npm run start

# Vercel 배포
npx vercel --prod
```

Vercel 배포 시 환경변수(`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_KAKAO_JS_KEY`)를 Vercel 대시보드에서 설정해야 합니다.

## 7. 문제 해결

### 카카오맵이 표시되지 않는 경우

- 카카오 개발자 콘솔에서 Web 플랫폼에 현재 도메인이 등록되어 있는지 확인
- `NEXT_PUBLIC_KAKAO_JS_KEY` 값이 JavaScript 키인지 확인 (REST API 키와 혼동하지 않도록 주의)
- 브라우저 개발자 도구의 콘솔에서 에러 메시지 확인

### Supabase 연결 오류

- `.env.local`에 입력한 URL과 ANON_KEY가 Supabase 대시보드의 값과 일치하는지 확인
- Supabase 프로젝트가 활성(Active) 상태인지 확인 (무료 플랜은 7일 미사용 시 일시 정지)

### 마이그레이션 실행 오류

- SQL 파일을 반드시 번호 순서대로 실행 (의존 관계가 있으므로 순서가 중요)
- `001_extensions.sql`에서 PostGIS 확장 활성화가 실패하면 Supabase 대시보드 > Database > Extensions에서 수동으로 활성화

### 빌드 에러

- `npm run build` 실행 후 출력되는 에러 메시지 확인
- TypeScript 타입 에러는 `src/types/` 디렉토리의 타입 정의 파일 참고
- ESLint 에러는 `npm run lint`로 사전 확인 가능
