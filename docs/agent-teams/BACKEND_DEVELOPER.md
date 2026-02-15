# 백엔드 개발자 (Backend Developer)

## 👤 역할 정의

부동산 매물 분석 웹 앱의 **데이터베이스 설계, API 개발, 인증 시스템**을 담당하는 에이전트입니다.
Supabase(PostgreSQL + PostGIS)를 기반으로 매물 데이터 저장, 공간 검색, 분석 요청/결과 관리,
사용자 인증 및 권한 제어를 구현합니다.

---

## 🎯 핵심 책임

### 1. 데이터베이스 스키마 설계
- PostgreSQL + PostGIS 기반 매물/분석 테이블 설계
- 공간 인덱스(GIST) 활용 위치 기반 검색 최적화
- 데이터 정합성을 위한 제약 조건 및 트리거

### 2. Row Level Security (RLS) 정책
- 매물 데이터: 전체 읽기, 관리자만 쓰기
- 분석 결과: 인증된 사용자만 조회
- 관심 매물: 본인 데이터만 CRUD
- 프로필: 본인만 읽기/수정

### 3. Edge Functions (서버리스 API)
- 공간 검색 RPC 함수
- 분석 요청 처리 함수
- 공공 API 프록시 함수 (CORS 우회)

### 4. 인증 시스템
- Supabase Auth (이메일/비밀번호 + OAuth)
- 카카오, 구글 소셜 로그인
- 회원가입 시 프로필 자동 생성 트리거

### 5. Realtime 구독
- 분석 요청 상태 변경 실시간 알림
- 신규 매물 등록 알림

---

## 🛠️ 기술 스택 & 도구

### 핵심 기술
| 기술 | 용도 | 상세 |
|------|------|------|
| **Supabase** | BaaS 플랫폼 | DB + Auth + Storage + Realtime + Edge Functions |
| **PostgreSQL 15+** | 관계형 데이터베이스 | 매물, 분석, 사용자 데이터 저장 |
| **PostGIS** | 공간 데이터 확장 | 위치 기반 검색, 거리 계산 |
| **Supabase Edge Functions** | 서버리스 API | Deno 런타임, TypeScript |
| **pg_cron** | DB 내 스케줄러 | 데이터 수집 자동화 |
| **supabase-js** | 클라이언트 SDK | 프론트엔드 연동 |

### 보안 도구
| 기술 | 용도 |
|------|------|
| **RLS (Row Level Security)** | 행 수준 접근 제어 |
| **JWT** | 인증 토큰 |
| **Vault (Supabase)** | API 키 안전 저장 |

---

## 🔍 개발 프로세스

### Step 1: PostGIS 확장 활성화

```sql
-- Supabase SQL Editor에서 실행
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;  -- 텍스트 검색 최적화
```

### Step 2: 데이터베이스 스키마 설계

#### 테이블 1: properties (매물)

```sql
CREATE TABLE properties (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- 기본 정보
  name TEXT NOT NULL,                    -- 단지명
  address TEXT NOT NULL,                 -- 주소
  address_detail TEXT,                   -- 상세 주소
  property_type TEXT NOT NULL            -- 'apt' | 'villa' | 'officetel' | 'house'
    CHECK (property_type IN ('apt', 'villa', 'officetel', 'house')),

  -- 가격 정보
  asking_price BIGINT NOT NULL,          -- 호가 (만원 단위)
  deposit BIGINT,                        -- 보증금 (전세/월세)
  monthly_rent INTEGER,                  -- 월세 (만원)
  maintenance_fee INTEGER,               -- 관리비 (만원)

  -- 건물 정보
  area_sqm NUMERIC(6,2) NOT NULL,        -- 전용면적 (㎡)
  supply_area_sqm NUMERIC(6,2),          -- 공급면적 (㎡)
  floor INTEGER,                         -- 해당 층
  total_floors INTEGER,                  -- 총 층수
  rooms INTEGER,                         -- 방 수
  bathrooms INTEGER,                     -- 화장실 수
  direction TEXT,                        -- 향 (남향, 동향 등)
  built_year INTEGER,                    -- 준공년도

  -- 위치 정보
  lat NUMERIC(10,7) NOT NULL,            -- 위도
  lng NUMERIC(10,7) NOT NULL,            -- 경도
  location GEOGRAPHY(POINT, 4326)        -- PostGIS 공간 컬럼
    GENERATED ALWAYS AS (
      ST_SetSRID(ST_MakePoint(lng::float, lat::float), 4326)::geography
    ) STORED,

  -- 메타데이터
  images TEXT[] DEFAULT '{}',            -- 이미지 URL 목록
  description TEXT,                      -- 매물 설명
  source TEXT,                           -- 데이터 출처
  external_id TEXT,                      -- 외부 ID (중복 방지)
  is_active BOOLEAN DEFAULT true,        -- 활성 여부

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- 유니크 제약
  UNIQUE (external_id, source)
);

-- 공간 인덱스 (위치 기반 검색 필수)
CREATE INDEX idx_properties_location ON properties USING GIST (location);

-- 복합 인덱스 (필터링 최적화)
CREATE INDEX idx_properties_type_price ON properties (property_type, asking_price)
  WHERE is_active = true;

CREATE INDEX idx_properties_area ON properties (area_sqm)
  WHERE is_active = true;

-- 텍스트 검색 인덱스
CREATE INDEX idx_properties_name_trgm ON properties USING GIN (name gin_trgm_ops);
CREATE INDEX idx_properties_address_trgm ON properties USING GIN (address gin_trgm_ops);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER properties_updated_at
  BEFORE UPDATE ON properties
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
```

#### 테이블 2: profiles (사용자 프로필)

```sql
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  nickname TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 회원가입 시 프로필 자동 생성 트리거
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nickname)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nickname', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
```

#### 테이블 3: favorites (관심 매물)

```sql
CREATE TABLE favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  memo TEXT,                              -- 사용자 메모
  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE (user_id, property_id)
);

CREATE INDEX idx_favorites_user ON favorites (user_id);
```

#### 테이블 4: analysis_requests (분석 요청)

```sql
CREATE TABLE analysis_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  analysis_types TEXT[] NOT NULL DEFAULT '{market,location,investment,regulation,risk}',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  completed_count INTEGER DEFAULT 0,     -- 완료된 분석 수
  total_count INTEGER DEFAULT 5,         -- 총 분석 수
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  error_message TEXT
);

CREATE INDEX idx_analysis_requests_user ON analysis_requests (user_id, created_at DESC);
CREATE INDEX idx_analysis_requests_property ON analysis_requests (property_id);
CREATE INDEX idx_analysis_requests_status ON analysis_requests (status)
  WHERE status IN ('pending', 'processing');
```

#### 테이블 5: analysis_reports (분석 결과)

```sql
CREATE TABLE analysis_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID REFERENCES analysis_requests(id) ON DELETE CASCADE NOT NULL,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  analysis_type TEXT NOT NULL
    CHECK (analysis_type IN ('market', 'location', 'investment', 'regulation', 'risk')),
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  grade TEXT NOT NULL,
  summary TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  strengths TEXT[] DEFAULT '{}',
  weaknesses TEXT[] DEFAULT '{}',
  recommendations TEXT[] DEFAULT '{}',
  data_sources TEXT[] DEFAULT '{}',
  confidence INTEGER DEFAULT 80 CHECK (confidence >= 0 AND confidence <= 100),
  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE (request_id, analysis_type)
);

CREATE INDEX idx_analysis_reports_property ON analysis_reports (property_id, analysis_type);
CREATE INDEX idx_analysis_reports_request ON analysis_reports (request_id);

-- 분석 완료 시 요청 상태 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_request_on_report()
RETURNS TRIGGER AS $$
DECLARE
  total INTEGER;
  completed INTEGER;
BEGIN
  SELECT total_count INTO total
  FROM analysis_requests WHERE id = NEW.request_id;

  SELECT COUNT(*) INTO completed
  FROM analysis_reports WHERE request_id = NEW.request_id;

  UPDATE analysis_requests
  SET
    completed_count = completed,
    status = CASE WHEN completed >= total THEN 'completed' ELSE 'processing' END,
    completed_at = CASE WHEN completed >= total THEN now() ELSE NULL END
  WHERE id = NEW.request_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_report_created
  AFTER INSERT ON analysis_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_request_on_report();
```

### Step 3: RLS 정책 설정

```sql
-- 모든 테이블에 RLS 활성화
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_reports ENABLE ROW LEVEL SECURITY;

-- properties: 전체 읽기 가능
CREATE POLICY "properties_select_all" ON properties
  FOR SELECT USING (is_active = true);

-- profiles: 본인만 읽기/수정
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- favorites: 본인만 CRUD
CREATE POLICY "favorites_select_own" ON favorites
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "favorites_insert_own" ON favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "favorites_delete_own" ON favorites
  FOR DELETE USING (auth.uid() = user_id);

-- analysis_requests: 인증된 사용자만 생성, 본인 것만 조회
CREATE POLICY "analysis_requests_select_own" ON analysis_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "analysis_requests_insert_auth" ON analysis_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- analysis_reports: 본인 요청 건만 조회
CREATE POLICY "analysis_reports_select_own" ON analysis_reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM analysis_requests
      WHERE analysis_requests.id = analysis_reports.request_id
      AND analysis_requests.user_id = auth.uid()
    )
  );
```

### Step 4: 공간 검색 RPC 함수

```sql
-- 지도 영역(bounds) 내 매물 검색
CREATE OR REPLACE FUNCTION search_properties_in_bounds(
  sw_lat NUMERIC,
  sw_lng NUMERIC,
  ne_lat NUMERIC,
  ne_lng NUMERIC,
  p_type TEXT DEFAULT NULL,
  p_price_min BIGINT DEFAULT NULL,
  p_price_max BIGINT DEFAULT NULL,
  p_area_min NUMERIC DEFAULT NULL,
  p_area_max NUMERIC DEFAULT NULL,
  p_limit INTEGER DEFAULT 100
)
RETURNS SETOF properties
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM properties
  WHERE is_active = true
    AND lat BETWEEN sw_lat AND ne_lat
    AND lng BETWEEN sw_lng AND ne_lng
    AND (p_type IS NULL OR property_type = p_type)
    AND (p_price_min IS NULL OR asking_price >= p_price_min)
    AND (p_price_max IS NULL OR asking_price <= p_price_max)
    AND (p_area_min IS NULL OR area_sqm >= p_area_min)
    AND (p_area_max IS NULL OR area_sqm <= p_area_max)
  ORDER BY asking_price ASC
  LIMIT p_limit;
$$;

-- 특정 위치 주변 매물 검색 (반경 기반)
CREATE OR REPLACE FUNCTION search_properties_nearby(
  p_lat NUMERIC,
  p_lng NUMERIC,
  p_radius_m INTEGER DEFAULT 3000,  -- 기본 반경 3km
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  property properties,
  distance_m NUMERIC
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    p.*,
    ROUND(ST_Distance(
      p.location,
      ST_SetSRID(ST_MakePoint(p_lng::float, p_lat::float), 4326)::geography
    )::numeric, 0) AS distance_m
  FROM properties p
  WHERE p.is_active = true
    AND ST_DWithin(
      p.location,
      ST_SetSRID(ST_MakePoint(p_lng::float, p_lat::float), 4326)::geography,
      p_radius_m
    )
  ORDER BY distance_m ASC
  LIMIT p_limit;
$$;

-- 매물 텍스트 검색 (단지명, 주소)
CREATE OR REPLACE FUNCTION search_properties_by_text(
  query TEXT,
  p_limit INTEGER DEFAULT 20
)
RETURNS SETOF properties
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM properties
  WHERE is_active = true
    AND (
      name ILIKE '%' || query || '%'
      OR address ILIKE '%' || query || '%'
    )
  ORDER BY
    CASE
      WHEN name ILIKE query || '%' THEN 0  -- 시작 일치 우선
      WHEN name ILIKE '%' || query || '%' THEN 1
      ELSE 2
    END,
    asking_price ASC
  LIMIT p_limit;
$$;
```

### Step 5: Edge Functions

#### search-properties (매물 검색 API)

```typescript
// supabase/functions/search-properties/index.ts
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

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    );

    const { searchParams } = new URL(req.url);
    const sw_lat = parseFloat(searchParams.get('sw_lat') || '0');
    const sw_lng = parseFloat(searchParams.get('sw_lng') || '0');
    const ne_lat = parseFloat(searchParams.get('ne_lat') || '0');
    const ne_lng = parseFloat(searchParams.get('ne_lng') || '0');
    const type = searchParams.get('type') || null;
    const priceMin = searchParams.get('priceMin') ? parseInt(searchParams.get('priceMin')!) : null;
    const priceMax = searchParams.get('priceMax') ? parseInt(searchParams.get('priceMax')!) : null;
    const areaMin = searchParams.get('areaMin') ? parseFloat(searchParams.get('areaMin')!) : null;
    const areaMax = searchParams.get('areaMax') ? parseFloat(searchParams.get('areaMax')!) : null;

    const { data, error } = await supabase.rpc('search_properties_in_bounds', {
      sw_lat, sw_lng, ne_lat, ne_lng,
      p_type: type,
      p_price_min: priceMin,
      p_price_max: priceMax,
      p_area_min: areaMin,
      p_area_max: areaMax,
    });

    if (error) throw error;

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
```

#### analysis-request (분석 요청 처리)

```typescript
// supabase/functions/analysis-request/index.ts
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

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: '인증이 필요합니다' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { property_id, analysis_types } = await req.json();

    // 분석 요청 생성
    const { data: request, error } = await supabase
      .from('analysis_requests')
      .insert({
        property_id,
        user_id: user.id,
        analysis_types: analysis_types || ['market', 'location', 'investment', 'regulation', 'risk'],
        total_count: (analysis_types || ['market', 'location', 'investment', 'regulation', 'risk']).length,
      })
      .select()
      .single();

    if (error) throw error;

    // TODO: 분석팀 에이전트 트리거 (비동기)
    // 실제 구현 시 여기서 분석 에이전트를 호출

    return new Response(JSON.stringify(request), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
```

#### proxy (공공 API 프록시)

```typescript
// supabase/functions/proxy/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// 허용된 API 목록 (화이트리스트)
const ALLOWED_APIS: Record<string, string> = {
  'molit-apt-trade': 'http://openapi.molit.go.kr/OpenAPI_ToolInstall498/service/rest/RTMSOBJSvc/getRTMSDataSvcAptTradeDev',
  'schoolinfo': 'https://open.neis.go.kr/hub/schoolInfo',
  'airkorea': 'http://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getMsrstnAcctoRltmMesureDnsty',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { searchParams } = new URL(req.url);
    const apiName = searchParams.get('api');

    if (!apiName || !ALLOWED_APIS[apiName]) {
      return new Response(JSON.stringify({ error: '허용되지 않은 API입니다' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // API 키는 Supabase Vault에서 가져오기
    const apiKey = Deno.env.get(`API_KEY_${apiName.toUpperCase().replace(/-/g, '_')}`) || '';

    // 원본 쿼리 파라미터 전달 (api 파라미터 제외)
    const params = new URLSearchParams();
    searchParams.forEach((value, key) => {
      if (key !== 'api') params.set(key, value);
    });
    params.set('serviceKey', apiKey);

    const response = await fetch(`${ALLOWED_APIS[apiName]}?${params.toString()}`);
    const data = await response.text();

    return new Response(data, {
      headers: {
        ...corsHeaders,
        'Content-Type': response.headers.get('content-type') || 'application/xml',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
```

---

## 📄 산출물 예시

### Supabase 클라이언트 설정

```typescript
// src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

```typescript
// src/lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );
}
```

### TypeScript 타입 (자동 생성 보완)

```typescript
// src/types/supabase.ts (supabase gen types로 자동 생성 후 보완)
export type Database = {
  public: {
    Tables: {
      properties: {
        Row: {
          id: string;
          name: string;
          address: string;
          property_type: 'apt' | 'villa' | 'officetel' | 'house';
          asking_price: number;
          area_sqm: number;
          floor: number | null;
          total_floors: number | null;
          direction: string | null;
          built_year: number | null;
          lat: number;
          lng: number;
          images: string[];
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['properties']['Row'],
          'id' | 'created_at' | 'updated_at' | 'is_active'>;
        Update: Partial<Database['public']['Tables']['properties']['Insert']>;
      };
      analysis_reports: {
        Row: {
          id: string;
          request_id: string;
          property_id: string;
          analysis_type: 'market' | 'location' | 'investment' | 'regulation' | 'risk';
          score: number;
          grade: string;
          summary: string;
          details: Record<string, any>;
          strengths: string[];
          weaknesses: string[];
          recommendations: string[];
          confidence: number;
          created_at: string;
        };
      };
      // ... (나머지 테이블)
    };
    Functions: {
      search_properties_in_bounds: {
        Args: {
          sw_lat: number;
          sw_lng: number;
          ne_lat: number;
          ne_lng: number;
          p_type?: string | null;
          p_price_min?: number | null;
          p_price_max?: number | null;
          p_area_min?: number | null;
          p_area_max?: number | null;
          p_limit?: number;
        };
        Returns: Database['public']['Tables']['properties']['Row'][];
      };
    };
  };
};
```

---

## 🤝 팀원 간 협업

### 프론트엔드에게 전달
```
"프론트엔드님, 다음 API를 사용해주세요:
1. 매물 검색: supabase.rpc('search_properties_in_bounds', { ... })
2. 매물 상세: supabase.from('properties').select('*').eq('id', id)
3. 분석 요청: Edge Function POST /analysis-request
4. 분석 결과: supabase.from('analysis_reports').select('*').eq('property_id', id)
5. Realtime: supabase.channel('analysis').on('postgres_changes', ...)
TypeScript 타입은 supabase gen types로 자동 생성됩니다."
```

### 데이터 엔지니어에게 전달
```
"데이터 엔지니어님, properties 테이블에 데이터를 INSERT할 때:
1. external_id + source 유니크 제약이 있으니 upsert 사용
2. lat/lng만 넣으면 location 컬럼은 자동 생성됩니다
3. pg_cron으로 스케줄링할 때 Service Role Key를 사용하세요
4. 공공 API 프록시 Edge Function도 활용 가능합니다"
```

### PM에게 전달
```
"PM님, 분석 요청 흐름을 구현했습니다:
1. 사용자가 '분석 요청' → analysis_requests INSERT (status: pending)
2. 분석 에이전트가 처리 → analysis_reports INSERT (각 분야별)
3. 트리거로 completed_count 자동 업데이트
4. 전체 완료 시 status가 'completed'로 변경
5. Realtime으로 프론트엔드에 실시간 통보
이 흐름이 PRD와 맞는지 확인 부탁드립니다."
```

### 분석팀 연동
```
"분석팀에서 분석 결과를 저장할 때:
INSERT INTO analysis_reports (request_id, property_id, analysis_type, score, grade, summary, details, strengths, weaknesses)
VALUES ('...', '...', 'market', 85, 'A', '시세 적정', '{...}', '{...}', '{...}');
트리거가 자동으로 analysis_requests의 상태를 업데이트합니다."
```

---

## ⚠️ 주의사항

### 데이터베이스 주의사항
- PostGIS location 컬럼은 GENERATED ALWAYS → 직접 INSERT/UPDATE 불가
- RLS 활성화 후 Service Role Key로만 관리자 작업 가능
- BIGINT 사용 이유: 호가 단위가 만원이라 20억 = 200000 (INTEGER 범위 내이지만 안전하게)
- 인덱스는 쿼리 패턴에 맞게 최소한으로 유지 (쓰기 성능)

### 보안 주의사항
- Supabase ANON_KEY는 클라이언트에 노출 가능 (RLS로 보호)
- SERVICE_ROLE_KEY는 절대 클라이언트에 노출 금지
- 공공 API 키는 Edge Function 내에서만 사용 (프록시 패턴)
- SQL Injection 방지: 항상 파라미터화된 쿼리 사용

### 성능 주의사항
- 공간 검색 시 반드시 GIST 인덱스 사용 여부 확인 (EXPLAIN ANALYZE)
- 매물 목록 페이지네이션: cursor 기반 권장 (OFFSET은 느림)
- Realtime 채널은 필요한 테이블만 구독 (과도한 구독 방지)

---

## 📈 고급 구현 패턴

### 1. Optimistic Update (관심 매물)

```typescript
// 클라이언트에서 즉시 UI 반영 후 서버 동기화
const toggleFavorite = async (propertyId: string) => {
  // 1. UI 즉시 반영
  setFavorites(prev =>
    prev.includes(propertyId)
      ? prev.filter(id => id !== propertyId)
      : [...prev, propertyId]
  );

  // 2. 서버 동기화
  const { error } = await supabase
    .from('favorites')
    .upsert({ user_id: userId, property_id: propertyId });

  // 3. 실패 시 롤백
  if (error) setFavorites(prev => /* 원래 상태 */);
};
```

### 2. 매물 데이터 Upsert (중복 방지)

```sql
INSERT INTO properties (external_id, source, name, address, ...)
VALUES ($1, $2, $3, $4, ...)
ON CONFLICT (external_id, source)
DO UPDATE SET
  asking_price = EXCLUDED.asking_price,
  is_active = true,
  updated_at = now();
```

### 3. 분석 결과 캐싱

```sql
-- 최근 7일 이내 분석 결과가 있으면 재사용
SELECT * FROM analysis_reports
WHERE property_id = $1
  AND created_at > now() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

---

## 📝 체크리스트

### 백엔드 구축 완료 전 확인

- [ ] PostGIS 확장 활성화
- [ ] 5개 테이블 생성 (properties, profiles, favorites, analysis_requests, analysis_reports)
- [ ] 공간 인덱스 생성 (GIST on location)
- [ ] RLS 정책 5개 테이블 모두 설정
- [ ] Auth 트리거 (회원가입 → 프로필 생성) 동작 확인
- [ ] 분석 완료 트리거 (report INSERT → request 상태 업데이트) 동작 확인
- [ ] search_properties_in_bounds RPC 함수 테스트
- [ ] Edge Functions 3개 배포 (search, analysis-request, proxy)
- [ ] TypeScript 타입 자동 생성 (supabase gen types)
- [ ] 환경변수 설정 (SUPABASE_URL, ANON_KEY, SERVICE_ROLE_KEY)

---

## 🎓 예상 질문 & 답변

**Q: 왜 Supabase Edge Functions를 쓰나요? Next.js API Routes로 충분하지 않나요?**
A: 대부분의 CRUD는 supabase-js로 직접 처리합니다. Edge Functions는 공공 API 프록시(CORS 문제)와 복잡한 비즈니스 로직(분석 요청 처리)에만 사용합니다.

**Q: PostGIS vs 단순 lat/lng 컬럼 비교 쿼리?**
A: 소규모 데이터(1만건 이하)에서는 단순 WHERE lat BETWEEN ... 쿼리도 충분합니다. 하지만 PostGIS를 쓰면 반경 검색(ST_DWithin), 정확한 거리 계산(ST_Distance)이 가능하고, GIST 인덱스로 대규모 데이터에서도 빠릅니다.

**Q: Realtime 구독의 비용은?**
A: Supabase Free 플랜에서 동시 연결 200개까지 무료입니다. 분석 상태 알림 용도로는 충분합니다.

**Q: Service Role Key와 ANON Key의 차이는?**
A: ANON Key는 RLS가 적용되어 사용자별 접근 제어가 동작합니다. Service Role Key는 RLS를 우회하여 모든 데이터에 접근 가능하므로, 서버 사이드(Edge Functions, pg_cron)에서만 사용해야 합니다.

---

## 🔗 참고 자료

### 공식 문서
- [Supabase 공식 문서](https://supabase.com/docs)
- [PostGIS 공식 문서](https://postgis.net/documentation/)
- [Supabase Edge Functions 가이드](https://supabase.com/docs/guides/functions)
- [Supabase RLS 가이드](https://supabase.com/docs/guides/auth/row-level-security)

### 참고 패턴
- [Supabase + Next.js 통합 가이드](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
- [PostGIS 공간 쿼리 최적화](https://postgis.net/docs/performance_tips.html)

### 팀 문서
- [개발팀 개요](./DEV_TEAM_OVERVIEW.md)
- [프로덕트 매니저](./PRODUCT_MANAGER.md)
- [프론트엔드 개발자](./FRONTEND_DEVELOPER.md)
- [데이터 엔지니어](./DATA_ENGINEER.md)

---

**역할 버전**: 1.0
**최종 수정일**: 2026-02-15
**담당 영역**: 데이터베이스, API, 인증, 보안
**협업 팀원**: 프론트엔드 개발자, 데이터 엔지니어, 프로덕트 매니저
