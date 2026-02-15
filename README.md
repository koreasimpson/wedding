# 부동산 매물 분석 서비스

지도 기반 부동산 매물 검색과 AI 5개 관점(시세, 입지, 투자, 규제, 리스크) 종합 분석 리포트를 제공하는 웹 서비스입니다.

## 기술 스택

| 분류 | 기술 |
|------|------|
| 프레임워크 | Next.js 16, React 19 |
| 백엔드/DB | Supabase (PostgreSQL, Edge Functions, Auth, Realtime) |
| 지도 | 카카오맵 SDK |
| 상태 관리 | TanStack Query v5, Zustand v5 |
| 스타일링 | Tailwind CSS v4 |
| 차트 | Recharts v3 |
| 애니메이션 | Framer Motion v12 |
| URL 상태 | nuqs |
| 아이콘 | Lucide React |

## 주요 기능

- **지도 기반 매물 검색**: 카카오맵 위에서 매물을 마커/클러스터로 탐색하고 필터(유형, 가격, 면적)로 조건 검색
- **AI 5개 관점 분석**: 시세, 입지, 투자, 규제, 리스크 관점의 종합 분석 리포트 생성
- **실시간 분석 진행 상태**: Supabase Realtime을 통해 분석 진행률을 실시간 표시
- **반응형 레이아웃**: 데스크톱(사이드 패널)과 모바일(바텀 시트) 분기 처리
- **관심 매물 관리**: 로그인 사용자의 관심 매물 저장 및 조회
- **관심 매물 뉴스 크롤링**: 네이버 뉴스 API를 통해 관심 매물 관련 뉴스 자동 수집 (매일 09:00 KST)
- **사용자 인증**: Supabase Auth 기반 회원가입, 로그인, 콜백 처리

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경변수 설정

```bash
cp .env.example .env.local
```

`.env.local` 파일을 열어 실제 키 값을 입력합니다. 각 키 발급 방법은 [설정 가이드](docs/SETUP_GUIDE.md)를 참고하세요.

### 3. 데이터베이스 마이그레이션

Supabase 대시보드의 SQL Editor에서 `supabase/migrations/` 디렉토리의 SQL 파일을 번호 순서대로 실행합니다.

| 순서 | 파일 | 설명 |
|------|------|------|
| 1 | `001_extensions.sql` | PostGIS, pg_trgm 확장 |
| 2 | `002_properties.sql` | 매물 테이블 |
| 3 | `003_profiles.sql` | 프로필 테이블 |
| 4 | `004_favorites.sql` | 관심 매물 테이블 |
| 5 | `005_analysis.sql` | 분석 요청/결과 테이블 |
| 6 | `006_rls.sql` | Row Level Security 정책 |
| 7 | `007_rpc.sql` | 공간 검색 함수 |
| 8 | `008_infrastructure.sql` | 인프라 테이블 |
| 9 | `009_collection_logs.sql` | 수집 로그 테이블 |
| 10 | `010_geocoding_cache.sql` | Geocoding 캐시 |
| 11 | `011_data_functions.sql` | 데이터 처리 함수 |
| 12 | `012_pg_cron.sql` | 스케줄 작업 |
| 13 | `013_schema_v2.sql` | 스키마 v2 업데이트 |
| 14 | `014_search_rpc.sql` | 검색 RPC 함수 |
| 15 | `015_news_cron.sql` | 뉴스 크롤링 스케줄 |

### 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)으로 접속합니다.

## 프로젝트 구조

```
src/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # 루트 레이아웃
│   ├── page.tsx                  # 랜딩 페이지
│   ├── providers.tsx             # TanStack Query 등 Provider
│   ├── search/page.tsx           # 지도 검색 페이지
│   ├── property/[id]/
│   │   ├── page.tsx              # 매물 상세 페이지
│   │   └── analysis/page.tsx     # 분석 리포트 페이지
│   ├── auth/
│   │   ├── login/page.tsx        # 로그인
│   │   ├── signup/page.tsx       # 회원가입
│   │   └── callback/route.ts    # OAuth 콜백
│   └── mypage/
│       ├── page.tsx              # 마이페이지
│       └── favorites/page.tsx    # 관심 매물 목록
├── components/
│   ├── ui/                       # 공용 UI (Button, Card, Badge, Input 등)
│   ├── map/                      # 카카오맵 관련 (KakaoMap, PropertyMarker, MarkerCluster)
│   ├── property/                 # 매물 관련 (PropertyList, PropertyCard, PropertyFilter)
│   ├── analysis/                 # 분석 관련 (AnalysisRadar, AnalysisSection, TrendChart, ScoreBadge)
│   └── layout/                   # 레이아웃 (Header, SidePanel, BottomSheet, SearchLayout)
├── hooks/                        # 커스텀 훅 (useProperties, useAnalysis, useFavorites 등)
├── stores/                       # Zustand 스토어 (useMapStore, useUIStore)
├── lib/
│   ├── supabase/                 # Supabase 클라이언트 (client.ts, server.ts)
│   └── utils/                    # 유틸리티 (cn, format, score)
├── types/                        # TypeScript 타입 (property, analysis, supabase)
└── middleware.ts                  # 인증 미들웨어

supabase/
├── migrations/                   # DB 마이그레이션 SQL (001~015)
└── functions/                    # Edge Functions
    ├── search-properties/        # 매물 검색 API
    ├── analysis-request/         # 분석 요청 처리
    ├── collect-apt-trade/        # 아파트 실거래 데이터 수집
    ├── collect-schools/          # 학교 데이터 수집
    ├── crawl-news/               # 관심 매물 뉴스 크롤링
    └── proxy/                    # 외부 API 프록시
```

## 스크립트

| 명령어 | 설명 |
|--------|------|
| `npm run dev` | 개발 서버 실행 |
| `npm run build` | 프로덕션 빌드 |
| `npm run start` | 프로덕션 서버 실행 |
| `npm run lint` | ESLint 검사 |

## 참고 문서

- [설정 가이드](docs/SETUP_GUIDE.md) - API 키 발급, 환경변수 설정, 마이그레이션 안내
- [Edge Functions 가이드](docs/EDGE_FUNCTIONS.md) - Edge Functions 개발, 배포, 스케줄링 가이드
- [PRD](docs/prd/PRD.md) - 제품 요구사항 정의서
