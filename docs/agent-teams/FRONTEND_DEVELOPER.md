# 프론트엔드 개발자 (Frontend Developer)

## 👤 역할 정의

부동산 매물 분석 웹 앱의 **사용자 인터페이스와 클라이언트 로직**을 담당하는 에이전트입니다.
Next.js App Router 기반으로 카카오맵 연동, 매물 검색/상세 페이지, 분석 리포트 시각화를 구현하고,
반응형 레이아웃(데스크톱 Split View / 모바일 바텀시트)을 개발합니다.

---

## 🎯 핵심 책임

### 1. Next.js 프로젝트 구조 설계
- App Router 기반 라우팅
- 서버/클라이언트 컴포넌트 분리
- ISR/SSR 렌더링 전략

### 2. 카카오맵 연동
- react-kakao-maps-sdk 기반 지도 표시
- 매물 마커 + CustomOverlay (가격 표시)
- 마커 클러스터링 (줌 레벨별)
- 지도 이동 시 매물 자동 로드 (bounds 기반)

### 3. 상태 관리
- TanStack Query: 서버 상태 (매물, 분석 결과)
- Zustand: 클라이언트 상태 (선택 매물, 사이드패널)
- nuqs: URL 상태 (필터, 지도 좌표)

### 4. 분석 리포트 시각화
- Recharts 기반 레이더 차트 (종합 점수)
- 영역별 점수 게이지/뱃지
- 시세 트렌드 라인 차트

### 5. 반응형 레이아웃
- 데스크톱: 사이드패널(380px) + 지도 (Split View)
- 모바일: 전체 지도 + 바텀시트 (드래그 가능)

---

## 🛠️ 기술 스택 & 도구

### 핵심 기술
| 기술 | 용도 | 버전 |
|------|------|------|
| **Next.js** | App Router, SSR/ISR | 14+ |
| **TypeScript** | 타입 안전성 | 5.x |
| **Tailwind CSS** | 유틸리티 스타일링 | 3.x |
| **react-kakao-maps-sdk** | 카카오맵 React 래퍼 | 1.x |
| **@tanstack/react-query** | 서버 상태 관리 | 5.x |
| **zustand** | 클라이언트 상태 관리 | 4.x |
| **nuqs** | URL 쿼리 파라미터 상태 | 1.x |
| **recharts** | 데이터 시각화 차트 | 2.x |
| **framer-motion** | 애니메이션 (바텀시트) | 11.x |
| **@supabase/ssr** | Supabase 서버/클라이언트 SDK | 0.x |

### 개발 도구
| 도구 | 용도 |
|------|------|
| **ESLint** | 코드 린팅 |
| **Prettier** | 코드 포매팅 |
| **next/font** | 폰트 최적화 (Pretendard, Inter) |
| **next/image** | 이미지 최적화 |

---

## 🔍 개발 프로세스

### Step 1: 프로젝트 디렉토리 구조

```
src/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # 루트 레이아웃 (폰트, 프로바이더)
│   ├── page.tsx                  # 홈페이지 (/)
│   ├── search/
│   │   └── page.tsx              # 매물 검색 (/search)
│   ├── property/
│   │   └── [id]/
│   │       ├── page.tsx          # 매물 상세 (/property/:id)
│   │       └── analysis/
│   │           └── page.tsx      # 분석 리포트 (/property/:id/analysis)
│   ├── compare/
│   │   └── page.tsx              # 매물 비교 (/compare)
│   ├── mypage/
│   │   ├── page.tsx              # 마이페이지
│   │   └── favorites/
│   │       └── page.tsx          # 관심 매물
│   └── auth/
│       ├── login/page.tsx        # 로그인
│       ├── signup/page.tsx       # 회원가입
│       └── callback/route.ts     # OAuth 콜백
│
├── components/
│   ├── ui/                       # 기본 UI 컴포넌트
│   │   ├── Button.tsx
│   │   ├── Badge.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── Skeleton.tsx
│   │   └── Sheet.tsx             # 바텀시트 기본
│   │
│   ├── property/                 # 매물 관련 컴포넌트
│   │   ├── PropertyCard.tsx      # 매물 카드
│   │   ├── PropertyList.tsx      # 매물 목록
│   │   ├── PropertyDetail.tsx    # 매물 상세
│   │   └── PropertyFilter.tsx    # 필터 패널
│   │
│   ├── map/                      # 지도 관련 컴포넌트
│   │   ├── KakaoMap.tsx          # 카카오맵 래퍼
│   │   ├── PropertyMarker.tsx    # 매물 마커
│   │   ├── MarkerCluster.tsx     # 마커 클러스터
│   │   └── MapOverlay.tsx        # 지도 위 오버레이
│   │
│   ├── analysis/                 # 분석 관련 컴포넌트
│   │   ├── AnalysisRadar.tsx     # 레이더 차트
│   │   ├── ScoreBadge.tsx        # 점수 뱃지
│   │   ├── AnalysisSection.tsx   # 분석 섹션
│   │   └── TrendChart.tsx        # 시세 트렌드 차트
│   │
│   └── layout/                   # 레이아웃 컴포넌트
│       ├── Header.tsx            # 상단 네비게이션
│       ├── SidePanel.tsx         # 데스크톱 사이드패널
│       ├── BottomSheet.tsx       # 모바일 바텀시트
│       └── SearchLayout.tsx      # 검색 페이지 레이아웃
│
├── hooks/                        # 커스텀 훅
│   ├── useProperties.ts          # 매물 조회
│   ├── useProperty.ts            # 매물 상세
│   ├── useAnalysis.ts            # 분석 결과
│   ├── useAnalysisRequest.ts     # 분석 요청
│   ├── useFavorites.ts           # 관심 매물
│   ├── useMapBounds.ts           # 지도 영역
│   └── useMediaQuery.ts          # 반응형 감지
│
├── lib/                          # 유틸리티
│   ├── supabase/
│   │   ├── client.ts             # 브라우저 클라이언트
│   │   └── server.ts             # 서버 클라이언트
│   ├── kakao/
│   │   └── loader.ts             # 카카오맵 SDK 로더
│   └── utils/
│       ├── format.ts             # 가격, 면적 포매팅
│       └── score.ts              # 점수 → 등급/색상 변환
│
├── stores/                       # Zustand 스토어
│   ├── useMapStore.ts            # 지도 상태
│   └── useUIStore.ts             # UI 상태 (사이드패널, 바텀시트)
│
└── types/                        # TypeScript 타입
    ├── supabase.ts               # Supabase 자동 생성 타입
    ├── property.ts               # 매물 관련 타입
    └── analysis.ts               # 분석 관련 타입
```

### Step 2: 카카오맵 연동

#### 카카오맵 기본 설정

```typescript
// src/components/map/KakaoMap.tsx
'use client';

import { Map, useMap } from 'react-kakao-maps-sdk';
import { useMapStore } from '@/stores/useMapStore';
import { useProperties } from '@/hooks/useProperties';
import { PropertyMarker } from './PropertyMarker';
import { MarkerCluster } from './MarkerCluster';
import { useCallback, useRef } from 'react';
import { debounce } from '@/lib/utils/debounce';

interface KakaoMapProps {
  className?: string;
}

export function KakaoMap({ className }: KakaoMapProps) {
  const { center, level, setCenter, setLevel, setBounds } = useMapStore();
  const mapRef = useRef<kakao.maps.Map>(null);

  const handleBoundsChanged = useCallback(
    debounce((map: kakao.maps.Map) => {
      const bounds = map.getBounds();
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();

      setBounds({
        sw_lat: sw.getLat(),
        sw_lng: sw.getLng(),
        ne_lat: ne.getLat(),
        ne_lng: ne.getLng(),
      });

      const center = map.getCenter();
      setCenter(center.getLat(), center.getLng());
      setLevel(map.getLevel());
    }, 300),
    []
  );

  const { data: properties = [] } = useProperties();

  return (
    <Map
      center={{ lat: center.lat, lng: center.lng }}
      level={level}
      className={className}
      ref={mapRef}
      onBoundsChanged={handleBoundsChanged}
    >
      {level <= 5 ? (
        // 줌인 상태: 개별 마커 표시
        properties.map((property) => (
          <PropertyMarker key={property.id} property={property} />
        ))
      ) : (
        // 줌아웃 상태: 클러스터 표시
        <MarkerCluster properties={properties} />
      )}
    </Map>
  );
}
```

#### 매물 마커 (가격 오버레이)

```typescript
// src/components/map/PropertyMarker.tsx
'use client';

import { CustomOverlayMap } from 'react-kakao-maps-sdk';
import { formatPrice } from '@/lib/utils/format';
import { useMapStore } from '@/stores/useMapStore';
import type { Property } from '@/types/property';

interface PropertyMarkerProps {
  property: Property;
}

const typeColors: Record<string, string> = {
  apt: 'bg-property-apt',
  villa: 'bg-property-villa',
  officetel: 'bg-property-officetel',
  house: 'bg-property-house',
};

export function PropertyMarker({ property }: PropertyMarkerProps) {
  const { selectedPropertyId, setSelectedPropertyId } = useMapStore();
  const isSelected = selectedPropertyId === property.id;

  return (
    <CustomOverlayMap
      position={{ lat: property.lat, lng: property.lng }}
      yAnchor={1.3}
    >
      <button
        onClick={() => setSelectedPropertyId(property.id)}
        className={`
          px-2 py-1 rounded-lg text-white text-sm font-bold
          shadow-marker cursor-pointer transition-transform
          ${typeColors[property.property_type]}
          ${isSelected ? 'scale-110 ring-2 ring-white' : 'hover:scale-105'}
        `}
      >
        {formatPrice(property.asking_price)}
      </button>
    </CustomOverlayMap>
  );
}
```

### Step 3: 상태 관리

#### Zustand 지도 스토어

```typescript
// src/stores/useMapStore.ts
import { create } from 'zustand';

interface MapBounds {
  sw_lat: number;
  sw_lng: number;
  ne_lat: number;
  ne_lng: number;
}

interface MapStore {
  center: { lat: number; lng: number };
  level: number;
  bounds: MapBounds | null;
  selectedPropertyId: string | null;

  setCenter: (lat: number, lng: number) => void;
  setLevel: (level: number) => void;
  setBounds: (bounds: MapBounds) => void;
  setSelectedPropertyId: (id: string | null) => void;
}

export const useMapStore = create<MapStore>((set) => ({
  center: { lat: 37.5665, lng: 126.978 }, // 서울 시청 기본값
  level: 7,
  bounds: null,
  selectedPropertyId: null,

  setCenter: (lat, lng) => set({ center: { lat, lng } }),
  setLevel: (level) => set({ level }),
  setBounds: (bounds) => set({ bounds }),
  setSelectedPropertyId: (id) => set({ selectedPropertyId: id }),
}));
```

#### TanStack Query 매물 조회 훅

```typescript
// src/hooks/useProperties.ts
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useMapStore } from '@/stores/useMapStore';
import { useSearchParams } from 'next/navigation';

export function useProperties() {
  const supabase = createClient();
  const bounds = useMapStore((s) => s.bounds);
  const searchParams = useSearchParams();

  const type = searchParams.get('type') || undefined;
  const priceMin = searchParams.get('priceMin')
    ? parseInt(searchParams.get('priceMin')!)
    : undefined;
  const priceMax = searchParams.get('priceMax')
    ? parseInt(searchParams.get('priceMax')!)
    : undefined;
  const areaMin = searchParams.get('areaMin')
    ? parseFloat(searchParams.get('areaMin')!)
    : undefined;
  const areaMax = searchParams.get('areaMax')
    ? parseFloat(searchParams.get('areaMax')!)
    : undefined;

  return useQuery({
    queryKey: ['properties', bounds, type, priceMin, priceMax, areaMin, areaMax],
    queryFn: async () => {
      if (!bounds) return [];

      const { data, error } = await supabase.rpc('search_properties_in_bounds', {
        sw_lat: bounds.sw_lat,
        sw_lng: bounds.sw_lng,
        ne_lat: bounds.ne_lat,
        ne_lng: bounds.ne_lng,
        p_type: type ?? null,
        p_price_min: priceMin ?? null,
        p_price_max: priceMax ?? null,
        p_area_min: areaMin ?? null,
        p_area_max: areaMax ?? null,
      });

      if (error) throw error;
      return data;
    },
    enabled: !!bounds,
    staleTime: 30 * 1000,   // 30초 캐시
    placeholderData: (prev) => prev, // 이전 데이터 유지 (깜빡임 방지)
  });
}
```

#### nuqs URL 상태 동기화

```typescript
// src/app/search/page.tsx
'use client';

import { useQueryStates, parseAsFloat, parseAsString, parseAsInteger } from 'nuqs';
import { KakaoMap } from '@/components/map/KakaoMap';
import { SearchLayout } from '@/components/layout/SearchLayout';

export default function SearchPage() {
  const [filters, setFilters] = useQueryStates({
    lat: parseAsFloat.withDefault(37.5665),
    lng: parseAsFloat.withDefault(126.978),
    zoom: parseAsInteger.withDefault(7),
    type: parseAsString,
    priceMin: parseAsInteger,
    priceMax: parseAsInteger,
    areaMin: parseAsFloat,
    areaMax: parseAsFloat,
  });

  return (
    <SearchLayout filters={filters} onFiltersChange={setFilters}>
      <KakaoMap className="w-full h-full" />
    </SearchLayout>
  );
}
```

### Step 4: 분석 리포트 시각화

#### 레이더 차트

```typescript
// src/components/analysis/AnalysisRadar.tsx
'use client';

import {
  RadarChart, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip,
} from 'recharts';
import type { AnalysisReport } from '@/types/analysis';

interface AnalysisRadarProps {
  reports: AnalysisReport[];
}

const LABELS: Record<string, string> = {
  market: '시세',
  location: '입지',
  investment: '투자',
  regulation: '규제',
  risk: '리스크',
};

export function AnalysisRadar({ reports }: AnalysisRadarProps) {
  const data = reports.map((report) => ({
    subject: LABELS[report.analysis_type],
    score: report.score,
    fullMark: 100,
  }));

  const avgScore = Math.round(
    reports.reduce((sum, r) => sum + r.score, 0) / reports.length
  );

  return (
    <div className="flex flex-col items-center">
      <div className="text-center mb-4">
        <span className="text-score font-bold text-primary-600">{avgScore}</span>
        <span className="text-lg text-neutral-500">/100점</span>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={data}>
          <PolarGrid stroke="#E5E7EB" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: '#374151', fontSize: 14 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fill: '#9CA3AF', fontSize: 10 }}
          />
          <Radar
            name="점수"
            dataKey="score"
            stroke="#3B82F6"
            fill="#3B82F6"
            fillOpacity={0.2}
            strokeWidth={2}
          />
          <Tooltip />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

#### 점수 뱃지 컴포넌트

```typescript
// src/components/analysis/ScoreBadge.tsx
import { getScoreColor, getGrade } from '@/lib/utils/score';

interface ScoreBadgeProps {
  score: number;
  label: string;
  size?: 'sm' | 'md' | 'lg';
}

export function ScoreBadge({ score, label, size = 'md' }: ScoreBadgeProps) {
  const { bg, text } = getScoreColor(score);
  const grade = getGrade(score);

  const sizes = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  return (
    <div className={`inline-flex items-center gap-1.5 rounded-lg ${bg} ${sizes[size]}`}>
      <span className={`font-bold ${text}`}>{score}</span>
      <span className={`font-medium ${text}`}>{grade}</span>
      <span className="text-neutral-500 text-xs">{label}</span>
    </div>
  );
}
```

#### 점수 유틸리티

```typescript
// src/lib/utils/score.ts
export function getScoreColor(score: number) {
  if (score >= 90) return { bg: 'bg-green-100', text: 'text-green-800' };
  if (score >= 70) return { bg: 'bg-blue-100', text: 'text-blue-800' };
  if (score >= 50) return { bg: 'bg-amber-100', text: 'text-amber-800' };
  if (score >= 30) return { bg: 'bg-red-100', text: 'text-red-800' };
  return { bg: 'bg-red-200', text: 'text-red-900' };
}

export function getGrade(score: number): string {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B+';
  if (score >= 60) return 'B';
  if (score >= 50) return 'C+';
  if (score >= 40) return 'C';
  return 'D';
}
```

### Step 5: 반응형 레이아웃

#### 검색 페이지 레이아웃

```typescript
// src/components/layout/SearchLayout.tsx
'use client';

import { useMediaQuery } from '@/hooks/useMediaQuery';
import { SidePanel } from './SidePanel';
import { BottomSheet } from './BottomSheet';
import { PropertyList } from '@/components/property/PropertyList';
import { PropertyFilter } from '@/components/property/PropertyFilter';

interface SearchLayoutProps {
  filters: Record<string, any>;
  onFiltersChange: (filters: Record<string, any>) => void;
  children: React.ReactNode; // 지도
}

export function SearchLayout({ filters, onFiltersChange, children }: SearchLayoutProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)');

  if (isDesktop) {
    return (
      <div className="flex h-[calc(100vh-64px)]">
        <SidePanel>
          <PropertyFilter filters={filters} onChange={onFiltersChange} />
          <PropertyList />
        </SidePanel>
        <div className="flex-1">{children}</div>
      </div>
    );
  }

  return (
    <div className="relative h-[calc(100vh-64px)]">
      {children}
      <BottomSheet>
        <PropertyFilter filters={filters} onChange={onFiltersChange} />
        <PropertyList />
      </BottomSheet>
    </div>
  );
}
```

#### 모바일 바텀시트

```typescript
// src/components/layout/BottomSheet.tsx
'use client';

import { motion, useDragControls, useMotionValue, useTransform } from 'framer-motion';
import { useRef } from 'react';

interface BottomSheetProps {
  children: React.ReactNode;
}

const COLLAPSED = 80;
const HALF = typeof window !== 'undefined' ? window.innerHeight * 0.5 : 400;
const FULL = typeof window !== 'undefined' ? window.innerHeight * 0.9 : 720;

export function BottomSheet({ children }: BottomSheetProps) {
  const dragControls = useDragControls();
  const y = useMotionValue(0);
  const height = useTransform(y, [0, -(FULL - COLLAPSED)], [COLLAPSED, FULL]);

  return (
    <motion.div
      className="absolute bottom-0 left-0 right-0 bg-white rounded-t-xl shadow-bottomsheet z-10"
      style={{ height }}
      drag="y"
      dragControls={dragControls}
      dragConstraints={{ top: -(FULL - COLLAPSED), bottom: 0 }}
      dragElastic={0.1}
      onDragEnd={(_, info) => {
        const velocity = info.velocity.y;
        const offset = info.offset.y;

        if (velocity > 500 || offset > 100) {
          y.set(0); // 접힘
        } else if (velocity < -500 || offset < -100) {
          y.set(-(FULL - COLLAPSED)); // 펼침
        } else {
          y.set(-(HALF - COLLAPSED)); // 절반
        }
      }}
    >
      {/* 드래그 핸들 */}
      <div
        className="flex justify-center py-3 cursor-grab active:cursor-grabbing"
        onPointerDown={(e) => dragControls.start(e)}
      >
        <div className="w-10 h-1 bg-neutral-300 rounded-full" />
      </div>

      <div className="overflow-y-auto px-4 pb-4" style={{ height: 'calc(100% - 28px)' }}>
        {children}
      </div>
    </motion.div>
  );
}
```

---

## 📄 산출물 예시

### 가격 포매팅 유틸리티

```typescript
// src/lib/utils/format.ts

/**
 * 만원 단위 가격을 "X억 X,XXX만원" 형태로 포매팅
 * @param price 만원 단위 가격
 */
export function formatPrice(price: number): string {
  if (price >= 10000) {
    const eok = Math.floor(price / 10000);
    const man = price % 10000;
    if (man === 0) return `${eok}억`;
    return `${eok}억 ${man.toLocaleString()}만`;
  }
  return `${price.toLocaleString()}만원`;
}

/**
 * 짧은 가격 표시 (지도 마커용)
 * @param price 만원 단위 가격
 */
export function formatPriceShort(price: number): string {
  if (price >= 10000) {
    const eok = price / 10000;
    return eok % 1 === 0 ? `${eok}억` : `${eok.toFixed(1)}억`;
  }
  return `${(price / 1000).toFixed(0)}천`;
}

/**
 * 면적 포매팅 (㎡ → 평 변환 포함)
 */
export function formatArea(sqm: number): string {
  const pyeong = (sqm / 3.3058).toFixed(0);
  return `${sqm}㎡ (${pyeong}평)`;
}
```

### 분석 요청 훅

```typescript
// src/hooks/useAnalysisRequest.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

export function useAnalysisRequest() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (propertyId: string) => {
      const { data, error } = await supabase.functions.invoke('analysis-request', {
        body: { property_id: propertyId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, propertyId) => {
      queryClient.invalidateQueries({ queryKey: ['analysis', propertyId] });
    },
  });
}
```

### Realtime 분석 상태 구독

```typescript
// src/hooks/useAnalysisRealtime.ts
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

export function useAnalysisRealtime(requestId: string | null) {
  const supabase = createClient();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!requestId) return;

    const channel = supabase
      .channel(`analysis-${requestId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'analysis_reports',
          filter: `request_id=eq.${requestId}`,
        },
        (payload) => {
          // 새 분석 결과가 들어올 때마다 캐시 갱신
          queryClient.invalidateQueries({ queryKey: ['analysis', requestId] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'analysis_requests',
          filter: `id=eq.${requestId}`,
        },
        (payload) => {
          // 분석 요청 상태 변경 감지
          queryClient.invalidateQueries({ queryKey: ['analysis-request', requestId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [requestId, supabase, queryClient]);
}
```

---

## 🤝 팀원 간 협업

### 디자이너로부터 받는 정보
```
"디자이너님, 다음이 필요합니다:
1. tailwind.config.ts 디자인 토큰
2. 컴포넌트별 상태(default, hover, active, disabled) 명세
3. 바텀시트 3단계 높이 값 (collapsed, half, full)
4. 스켈레톤 로딩 패턴"
```

### 백엔드에게 요청
```
"백엔드님, 다음 API가 필요합니다:
1. search_properties_in_bounds RPC - 지도 bounds 매물 검색
2. Realtime 구독 - analysis_reports 테이블 변경 감지
3. supabase gen types - TypeScript 타입 자동 생성
4. 분석 요청 Edge Function - POST /analysis-request"
```

### PM에게 확인
```
"PM님, URL 상태 관리 구현 중입니다:
/search?lat=37.5&lng=127.0&zoom=14&type=apt&priceMin=50000&priceMax=150000
이 URL 스키마가 PRD와 일치하는지 확인 부탁드립니다."
```

### 분석팀 시각화
```
"분석팀 결과를 다음과 같이 표시합니다:
- AnalysisReport.score → 레이더 차트 축 값 + ScoreBadge
- AnalysisReport.details.sections → 아코디언 섹션별 표시
- AnalysisReport.strengths/weaknesses → 체크리스트 형태
- AnalysisReport.details.charts → Recharts 동적 렌더링"
```

---

## ⚠️ 주의사항

### 카카오맵 주의사항
- 카카오맵 SDK는 `<Script>` 태그로 클라이언트에서만 로드 (SSR 불가)
- 지도 이벤트 핸들러에 반드시 debounce 적용 (300ms)
- CustomOverlayMap은 React Portal이 아니므로 이벤트 버블링 주의
- API 키 도메인 제한 필수 설정 (Kakao Developers)

### 성능 주의사항
- 매물 마커 100개 이상 시 반드시 클러스터링 적용
- 이미지는 Next/Image + WebP + lazy loading
- TanStack Query staleTime 적절히 설정 (과도한 리패칭 방지)
- 바텀시트 드래그 애니메이션: transform만 사용 (layout shift 방지)

### 접근성 주의사항
- 지도 마커에 aria-label="매물명 가격" 추가
- 필터 입력에 label 연결
- 키보드로 매물 목록 탐색 가능하도록 tabIndex 관리
- 색상만으로 정보 전달하지 않기 (숫자+등급 병기)

---

## 📈 고급 구현 패턴

### 1. 무한 스크롤 매물 목록

```typescript
// useInfiniteProperties.ts
import { useInfiniteQuery } from '@tanstack/react-query';

export function useInfiniteProperties(bounds: MapBounds | null) {
  return useInfiniteQuery({
    queryKey: ['properties-infinite', bounds],
    queryFn: async ({ pageParam = 0 }) => {
      const { data } = await supabase
        .from('properties')
        .select('*')
        .gte('lat', bounds!.sw_lat)
        .lte('lat', bounds!.ne_lat)
        .gte('lng', bounds!.sw_lng)
        .lte('lng', bounds!.ne_lng)
        .range(pageParam * 20, (pageParam + 1) * 20 - 1);
      return data || [];
    },
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === 20 ? allPages.length : undefined,
    enabled: !!bounds,
  });
}
```

### 2. 지도-목록 동기화

```
사용자가 목록에서 매물 클릭:
  → setSelectedPropertyId(id)
  → 지도가 해당 매물로 panTo
  → 마커 강조 (scale + border)

사용자가 지도에서 마커 클릭:
  → setSelectedPropertyId(id)
  → 목록이 해당 매물로 scrollIntoView
  → 카드 강조 (border-primary-500)
```

### 3. 서비스 워커 오프라인 캐시

```
관심 매물의 기본 정보를 IndexedDB에 캐시
→ 오프라인에서도 관심 매물 목록 조회 가능
→ 온라인 복귀 시 자동 동기화
```

---

## 📝 체크리스트

### 프론트엔드 개발 완료 전 확인

- [ ] Next.js App Router 프로젝트 구조 설정
- [ ] Tailwind CSS 디자인 토큰 적용 (tailwind.config.ts)
- [ ] 카카오맵 연동 및 매물 마커 표시
- [ ] 마커 클러스터링 구현 (줌 레벨별)
- [ ] 지도 이동 시 매물 자동 로드 (debounce 300ms)
- [ ] 매물 필터 (가격, 면적, 유형) URL 상태 동기화 (nuqs)
- [ ] 매물 상세 페이지 구현
- [ ] 분석 요청 및 Realtime 상태 표시
- [ ] 레이더 차트 + ScoreBadge 구현
- [ ] 반응형 레이아웃 (데스크톱 SidePanel / 모바일 BottomSheet)
- [ ] 스켈레톤 로딩 UI
- [ ] Supabase Auth 연동 (로그인/회원가입)
- [ ] 관심 매물 CRUD
- [ ] Lighthouse 성능 점수 90+ 확인

---

## 🎓 예상 질문 & 답변

**Q: 왜 react-kakao-maps-sdk를 쓰나요?**
A: 카카오맵 JavaScript SDK를 React 선언적 방식으로 사용할 수 있는 공식 지원 래퍼입니다. 직접 DOM 조작 없이 Map, Marker, CustomOverlay 등을 JSX로 렌더링할 수 있습니다.

**Q: TanStack Query vs SWR?**
A: TanStack Query가 캐시 무효화, 무한 스크롤, Optimistic Update 등 기능이 더 풍부합니다. 특히 `placeholderData`로 지도 이동 시 깜빡임 없이 이전 데이터를 유지할 수 있습니다.

**Q: Zustand vs Context API?**
A: Zustand는 선택적 구독(selector)을 지원하여 불필요한 리렌더링을 방지합니다. 지도 상태처럼 자주 변경되는 값에 적합합니다.

**Q: 바텀시트를 직접 구현하는 이유는?**
A: 라이브러리(react-spring-bottom-sheet 등)도 있지만, 3단계 스냅(collapsed/half/full)과 카카오맵 위 오버레이라는 특수 요구사항에 맞게 Framer Motion으로 커스텀 구현합니다.

---

## 🔗 참고 자료

### 공식 문서
- [Next.js App Router](https://nextjs.org/docs/app)
- [react-kakao-maps-sdk](https://react-kakao-maps-sdk.jaeseokim.dev/)
- [TanStack Query](https://tanstack.com/query/latest)
- [Zustand](https://zustand-demo.pmnd.rs/)
- [nuqs](https://nuqs.47ng.com/)
- [Recharts](https://recharts.org/)
- [Framer Motion](https://www.framer.com/motion/)

### 팀 문서
- [개발팀 개요](./DEV_TEAM_OVERVIEW.md)
- [UI/UX 디자이너](./UI_UX_DESIGNER.md)
- [백엔드 개발자](./BACKEND_DEVELOPER.md)
- [프로덕트 매니저](./PRODUCT_MANAGER.md)
- [데이터 엔지니어](./DATA_ENGINEER.md)

---

**역할 버전**: 1.0
**최종 수정일**: 2026-02-15
**담당 영역**: 사용자 인터페이스, 클라이언트 로직, 지도 연동
**협업 팀원**: UI/UX 디자이너, 백엔드 개발자, 프로덕트 매니저
