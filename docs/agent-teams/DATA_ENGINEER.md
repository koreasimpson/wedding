# 데이터 엔지니어 (Data Engineer)

## 👤 역할 정의

부동산 매물 분석 웹 앱의 **데이터 수집, 정제, 파이프라인 구축**을 담당하는 에이전트입니다.
공공 API(국토교통부, 학교알리미, 에어코리아)에서 데이터를 수집하고, Geocoding으로 좌표를 부여하며,
분석팀에 전달할 데이터 패키지를 구성합니다. pg_cron으로 자동 수집 스케줄링을 관리합니다.

---

## 🎯 핵심 책임

### 1. 공공 API 데이터 수집
- 국토교통부 아파트 실거래가 API
- 학교알리미 학교 정보 API
- 에어코리아 대기질 API
- 카카오 로컬 API (Geocoding, 키워드 검색)

### 2. 데이터 정제 & 변환
- XML → JSON 파싱 (공공 API)
- 주소 → 좌표 변환 (Geocoding)
- 데이터 정규화 (면적, 가격 단위 통일)
- 중복 제거 및 유효성 검증

### 3. 수집 파이프라인 자동화
- pg_cron 기반 스케줄링
- 실거래가: 매일 06:00 수집
- 매물 정보: 4시간마다 갱신
- 인프라 데이터: 주 1회 수집

### 4. 분석팀 데이터 인터페이스
- AnalysisDataPackage 구성 (실거래가 + 인프라 + 학군)
- 분석 요청 시 필요 데이터 자동 조립
- 데이터 품질 점수 제공

### 5. 데이터 품질 모니터링
- 수집 실패 알림
- 데이터 완전성 검증
- 이상치 탐지 및 보고

---

## 🛠️ 기술 스택 & 도구

### 수집 도구
| 기술 | 용도 |
|------|------|
| **Supabase Edge Functions** | API 호출 및 데이터 처리 |
| **pg_cron** | DB 내 스케줄링 |
| **xml2js** | XML → JSON 변환 (공공 API) |

### 외부 API
| API | 용도 | 데이터 형식 | 일일 제한 |
|-----|------|------------|----------|
| **국토교통부 실거래가** | 아파트 매매 실거래 데이터 | XML | 1,000건 |
| **학교알리미** | 학교 정보 (학군) | JSON | 제한 낮음 |
| **에어코리아** | 대기질 측정 데이터 | JSON | 500건 |
| **카카오 로컬 API** | Geocoding, 키워드 검색 | JSON | 30,000건 |
| **공공데이터포털** | 기타 부동산 관련 데이터 | XML/JSON | API별 상이 |

### 저장소
| 기술 | 용도 |
|------|------|
| **PostgreSQL** | 정제된 데이터 저장 |
| **PostGIS** | 공간 데이터 (좌표) |
| **Supabase Storage** | 대용량 원본 데이터 백업 |

---

## 🔍 개발 프로세스

### Step 1: API 키 발급 및 설정

#### 필수 API 키 목록

```
1. 공공데이터포털 (data.go.kr)
   - 국토교통부 아파트매매 실거래자료
   - URL: https://www.data.go.kr/data/15057511/openapi.do
   - 발급: 회원가입 → 활용 신청 → 즉시 발급

2. 학교알리미 (schoolinfo.go.kr)
   - 학교 기본정보
   - URL: https://open.neis.go.kr/
   - 발급: 회원가입 → API 키 발급

3. 에어코리아 (airkorea.or.kr)
   - 실시간 대기질
   - URL: https://www.data.go.kr/data/15073861/openapi.do
   - 발급: 공공데이터포털에서 신청

4. 카카오 개발자 (developers.kakao.com)
   - 로컬 API (Geocoding, 키워드 검색)
   - URL: https://developers.kakao.com/
   - 발급: 앱 등록 → REST API 키
```

#### 환경변수 설정

```bash
# Supabase Edge Functions 환경변수
supabase secrets set API_KEY_MOLIT_APT_TRADE="발급받은키"
supabase secrets set API_KEY_SCHOOLINFO="발급받은키"
supabase secrets set API_KEY_AIRKOREA="발급받은키"
supabase secrets set KAKAO_REST_API_KEY="발급받은키"
```

### Step 2: 실거래가 수집 파이프라인

#### 수집 Edge Function

```typescript
// supabase/functions/collect-apt-trade/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { parse } from 'https://deno.land/x/xml@2.1.3/mod.ts';

const MOLIT_API_URL = 'http://openapi.molit.go.kr/OpenAPI_ToolInstall498/service/rest/RTMSOBJSvc/getRTMSDataSvcAptTradeDev';

interface AptTrade {
  dealAmount: string;   // 거래금액 (만원, 콤마 포함)
  dealYear: string;
  dealMonth: string;
  dealDay: string;
  aptName: string;      // 아파트명
  excluUseAr: string;   // 전용면적
  floor: string;        // 층
  buildYear: string;    // 건축년도
  roadName: string;     // 도로명
  roadNameBonbun: string;
  jibun: string;        // 지번
  sggCd: string;        // 시군구코드
}

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!  // Service Role Key 사용
    );

    const apiKey = Deno.env.get('API_KEY_MOLIT_APT_TRADE')!;
    const kakaoKey = Deno.env.get('KAKAO_REST_API_KEY')!;

    // 수집 대상: 주요 시군구 코드 (서울 25개구 + 수도권)
    const targetRegions = [
      '11110', '11140', '11170', '11200', '11215', // 서울 종로, 중구, 용산, 성동, 광진
      '11230', '11260', '11290', '11305', '11320', // 동대문, 중랑, 성북, 강북, 도봉
      '11350', '11380', '11410', '11440', '11470', // 노원, 은평, 서대문, 마포, 양천
      '11500', '11530', '11545', '11560', '11590', // 강서, 구로, 금천, 영등포, 동작
      '11620', '11650', '11680', '11710', '11740', // 관악, 서초, 강남, 송파, 강동
      '41111', '41113', '41115', '41117',           // 수원 장안, 권선, 팔달, 영통
      '41131', '41133', '41135',                    // 성남 수정, 중원, 분당
    ];

    // 현재 월 기준 수집 (YYYYMM)
    const now = new Date();
    const dealYmd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

    let totalInserted = 0;
    let totalErrors = 0;

    for (const regionCode of targetRegions) {
      try {
        // 1. 국토부 API 호출
        const url = `${MOLIT_API_URL}?serviceKey=${apiKey}&LAWD_CD=${regionCode}&DEAL_YMD=${dealYmd}&pageNo=1&numOfRows=100`;
        const response = await fetch(url);
        const xml = await response.text();

        // 2. XML 파싱
        const parsed = parse(xml);
        const items = parsed?.response?.body?.items?.item;
        if (!items) continue;

        const trades: AptTrade[] = Array.isArray(items) ? items : [items];

        // 3. 각 거래 데이터 처리
        for (const trade of trades) {
          const address = `${trade.roadName} ${trade.roadNameBonbun}`.trim();
          const fullAddress = await getFullAddress(regionCode, address);

          // 4. Geocoding (주소 → 좌표)
          const coords = await geocode(fullAddress, kakaoKey);
          if (!coords) continue;

          // 5. Upsert
          const price = parseInt(trade.dealAmount.replace(/,/g, '').trim());
          const externalId = `molit_${regionCode}_${trade.aptName}_${trade.dealYear}${trade.dealMonth}${trade.dealDay}_${trade.floor}`;

          const { error } = await supabase
            .from('properties')
            .upsert({
              external_id: externalId,
              source: 'molit_apt_trade',
              name: trade.aptName.trim(),
              address: fullAddress,
              property_type: 'apt',
              asking_price: price,
              area_sqm: parseFloat(trade.excluUseAr),
              floor: parseInt(trade.floor),
              built_year: parseInt(trade.buildYear),
              lat: coords.lat,
              lng: coords.lng,
            }, {
              onConflict: 'external_id,source',
            });

          if (error) {
            totalErrors++;
          } else {
            totalInserted++;
          }
        }

        // API 호출 간격 (Rate Limit 방지)
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (err) {
        console.error(`Region ${regionCode} failed:`, err);
        totalErrors++;
      }
    }

    // 수집 로그 기록
    await supabase.from('collection_logs').insert({
      type: 'apt_trade',
      deal_ymd: dealYmd,
      inserted: totalInserted,
      errors: totalErrors,
    });

    return new Response(JSON.stringify({
      success: true,
      inserted: totalInserted,
      errors: totalErrors,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

// Geocoding 함수
async function geocode(address: string, kakaoKey: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(
      `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(address)}`,
      { headers: { Authorization: `KakaoAK ${kakaoKey}` } }
    );
    const data = await res.json();

    if (data.documents && data.documents.length > 0) {
      return {
        lat: parseFloat(data.documents[0].y),
        lng: parseFloat(data.documents[0].x),
      };
    }
    return null;
  } catch {
    return null;
  }
}

// 시군구코드 → 전체 주소 조합 (간략화)
async function getFullAddress(sggCd: string, roadAddress: string): Promise<string> {
  const SGG_MAP: Record<string, string> = {
    '11110': '서울특별시 종로구',
    '11140': '서울특별시 중구',
    '11170': '서울특별시 용산구',
    '11680': '서울특별시 강남구',
    '11710': '서울특별시 송파구',
    '41117': '경기도 수원시 영통구',
    '41135': '경기도 성남시 분당구',
    // ... (전체 매핑)
  };
  return `${SGG_MAP[sggCd] || ''} ${roadAddress}`;
}
```

### Step 3: pg_cron 스케줄링 설정

```sql
-- pg_cron 확장 활성화
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 실거래가 수집: 매일 06:00 (KST)
SELECT cron.schedule(
  'collect-apt-trade-daily',
  '0 21 * * *',  -- UTC 21:00 = KST 06:00
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/collect-apt-trade',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- 비활성 매물 정리: 매주 일요일 03:00 (KST)
SELECT cron.schedule(
  'cleanup-inactive-properties',
  '0 18 * * 0',  -- UTC 18:00 SUN = KST 03:00 MON
  $$
  UPDATE properties
  SET is_active = false
  WHERE updated_at < now() - INTERVAL '30 days'
  AND is_active = true;
  $$
);

-- 수집 로그 정리: 매월 1일 (90일 이전 삭제)
SELECT cron.schedule(
  'cleanup-collection-logs',
  '0 0 1 * *',
  $$
  DELETE FROM collection_logs
  WHERE created_at < now() - INTERVAL '90 days';
  $$
);
```

#### 수집 로그 테이블

```sql
CREATE TABLE collection_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,          -- 'apt_trade', 'school', 'air_quality'
  deal_ymd TEXT,               -- 수집 대상 기간
  inserted INTEGER DEFAULT 0,
  updated INTEGER DEFAULT 0,
  errors INTEGER DEFAULT 0,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_collection_logs_type ON collection_logs (type, created_at DESC);
```

### Step 4: 인프라 데이터 수집

#### 학교 정보 수집

```typescript
// supabase/functions/collect-schools/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SCHOOL_API_URL = 'https://open.neis.go.kr/hub/schoolInfo';

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const apiKey = Deno.env.get('API_KEY_SCHOOLINFO')!;
  const kakaoKey = Deno.env.get('KAKAO_REST_API_KEY')!;

  // 서울 + 경기 교육청 코드
  const eduOffices = ['B10', 'J10']; // 서울, 경기

  let totalInserted = 0;

  for (const office of eduOffices) {
    let pageNo = 1;
    let hasMore = true;

    while (hasMore) {
      const url = `${SCHOOL_API_URL}?KEY=${apiKey}&Type=json&ATPT_OFCDC_SC_CODE=${office}&pIndex=${pageNo}&pSize=100`;
      const res = await fetch(url);
      const data = await res.json();

      const schools = data?.schoolInfo?.[1]?.row;
      if (!schools || schools.length === 0) {
        hasMore = false;
        break;
      }

      for (const school of schools) {
        // Geocoding
        const coords = await geocode(school.ORG_RDNMA, kakaoKey);
        if (!coords) continue;

        const { error } = await supabase
          .from('infrastructure')
          .upsert({
            type: 'school',
            sub_type: school.SCHUL_KND_SC_NM, // 초등학교, 중학교, 고등학교
            name: school.SCHUL_NM,
            address: school.ORG_RDNMA,
            lat: coords.lat,
            lng: coords.lng,
            details: {
              edu_office: school.ATPT_OFCDC_SC_NM,
              founded: school.FOND_YMD,
              coedu: school.COEDU_SC_NM,
            },
            external_id: school.SD_SCHUL_CODE,
            source: 'neis',
          }, {
            onConflict: 'external_id,source',
          });

        if (!error) totalInserted++;
      }

      pageNo++;
      if (schools.length < 100) hasMore = false;
      await new Promise(r => setTimeout(r, 100));
    }
  }

  return new Response(JSON.stringify({ inserted: totalInserted }));
});
```

#### 인프라 테이블

```sql
CREATE TABLE infrastructure (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,              -- 'school', 'subway', 'hospital', 'park', 'mart'
  sub_type TEXT,                   -- '초등학교', '2호선', '종합병원' 등
  name TEXT NOT NULL,
  address TEXT,
  lat NUMERIC(10,7) NOT NULL,
  lng NUMERIC(10,7) NOT NULL,
  location GEOGRAPHY(POINT, 4326)
    GENERATED ALWAYS AS (
      ST_SetSRID(ST_MakePoint(lng::float, lat::float), 4326)::geography
    ) STORED,
  details JSONB DEFAULT '{}',
  external_id TEXT,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE (external_id, source)
);

CREATE INDEX idx_infrastructure_location ON infrastructure USING GIST (location);
CREATE INDEX idx_infrastructure_type ON infrastructure (type);
```

### Step 5: 분석팀 데이터 패키지 인터페이스

```typescript
// 분석팀에 전달할 데이터 패키지 타입
interface AnalysisDataPackage {
  // 대상 매물 정보
  property: {
    id: string;
    name: string;
    address: string;
    property_type: string;
    asking_price: number;
    area_sqm: number;
    floor: number;
    built_year: number;
    lat: number;
    lng: number;
  };

  // 실거래가 이력 (시세 분석가 사용)
  trade_history: {
    deal_date: string;      // YYYY-MM-DD
    price: number;          // 만원
    area_sqm: number;
    floor: number;
    apt_name: string;
    distance_m: number;     // 대상 매물과의 거리 (m)
  }[];

  // 주변 인프라 (입지 분석가 사용)
  nearby_infrastructure: {
    schools: InfraItem[];       // 반경 1km 내 학교
    subways: InfraItem[];       // 반경 2km 내 지하철역
    hospitals: InfraItem[];     // 반경 3km 내 병원
    parks: InfraItem[];         // 반경 1km 내 공원
    marts: InfraItem[];         // 반경 2km 내 대형마트
  };

  // 환경 데이터 (리스크 분석가 사용)
  environment: {
    air_quality: {
      station_name: string;
      pm10: number;
      pm25: number;
      grade: string;
    } | null;
  };

  // 주변 매물 (시세 비교)
  comparable_properties: {
    id: string;
    name: string;
    asking_price: number;
    area_sqm: number;
    built_year: number;
    distance_m: number;
  }[];

  // 데이터 품질 정보
  data_quality: {
    trade_history_count: number;   // 실거래가 데이터 수
    trade_data_freshness: string;  // 최신 데이터 날짜
    geocoding_accuracy: 'high' | 'medium' | 'low';
    overall_score: number;         // 0-100
  };
}

interface InfraItem {
  type: string;
  sub_type: string;
  name: string;
  distance_m: number;
  details: Record<string, any>;
}
```

#### 데이터 패키지 조립 함수

```sql
-- 매물 주변 실거래가 조회
CREATE OR REPLACE FUNCTION get_nearby_trades(
  p_lat NUMERIC,
  p_lng NUMERIC,
  p_radius_m INTEGER DEFAULT 3000,
  p_months INTEGER DEFAULT 12
)
RETURNS TABLE (
  deal_date TEXT,
  price BIGINT,
  area_sqm NUMERIC,
  floor INTEGER,
  apt_name TEXT,
  distance_m NUMERIC
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    to_char(p.created_at, 'YYYY-MM-DD') AS deal_date,
    p.asking_price AS price,
    p.area_sqm,
    p.floor,
    p.name AS apt_name,
    ROUND(ST_Distance(
      p.location,
      ST_SetSRID(ST_MakePoint(p_lng::float, p_lat::float), 4326)::geography
    )::numeric, 0) AS distance_m
  FROM properties p
  WHERE p.source = 'molit_apt_trade'
    AND p.created_at > now() - (p_months || ' months')::interval
    AND ST_DWithin(
      p.location,
      ST_SetSRID(ST_MakePoint(p_lng::float, p_lat::float), 4326)::geography,
      p_radius_m
    )
  ORDER BY p.created_at DESC
  LIMIT 100;
$$;

-- 매물 주변 인프라 조회
CREATE OR REPLACE FUNCTION get_nearby_infrastructure(
  p_lat NUMERIC,
  p_lng NUMERIC,
  p_type TEXT,
  p_radius_m INTEGER DEFAULT 3000
)
RETURNS TABLE (
  type TEXT,
  sub_type TEXT,
  name TEXT,
  distance_m NUMERIC,
  details JSONB
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    i.type,
    i.sub_type,
    i.name,
    ROUND(ST_Distance(
      i.location,
      ST_SetSRID(ST_MakePoint(p_lng::float, p_lat::float), 4326)::geography
    )::numeric, 0) AS distance_m,
    i.details
  FROM infrastructure i
  WHERE i.type = p_type
    AND ST_DWithin(
      i.location,
      ST_SetSRID(ST_MakePoint(p_lng::float, p_lat::float), 4326)::geography,
      p_radius_m
    )
  ORDER BY distance_m ASC
  LIMIT 20;
$$;
```

---

## 📄 산출물 예시

### 수집 모니터링 쿼리

```sql
-- 최근 7일 수집 현황
SELECT
  type,
  DATE(created_at) AS date,
  SUM(inserted) AS total_inserted,
  SUM(errors) AS total_errors,
  COUNT(*) AS runs
FROM collection_logs
WHERE created_at > now() - INTERVAL '7 days'
GROUP BY type, DATE(created_at)
ORDER BY date DESC, type;

-- 데이터 완전성 검증
SELECT
  property_type,
  COUNT(*) AS total,
  COUNT(CASE WHEN lat IS NOT NULL THEN 1 END) AS with_coords,
  COUNT(CASE WHEN built_year IS NOT NULL THEN 1 END) AS with_built_year,
  COUNT(CASE WHEN area_sqm IS NOT NULL THEN 1 END) AS with_area,
  ROUND(AVG(asking_price)) AS avg_price
FROM properties
WHERE is_active = true
GROUP BY property_type;
```

---

## 🤝 팀원 간 협업

### 백엔드로부터 받는 정보
```
"백엔드님, 다음 테이블 스키마를 기반으로 파이프라인을 구축합니다:
1. properties 테이블 - external_id + source UNIQUE 제약 확인
2. infrastructure 테이블 - 동일 구조
3. PostGIS location 컬럼은 GENERATED ALWAYS이므로 lat/lng만 넣으면 됨
4. Service Role Key 접근 권한 확인"
```

### 분석팀에 전달
```
"분석팀에 AnalysisDataPackage를 전달합니다:
- 시세 분석가: trade_history (실거래가 이력) + comparable_properties (주변 매물)
- 입지 분석가: nearby_infrastructure (학교, 지하철, 병원, 공원, 마트)
- 투자 분석가: trade_history (시세 추이 분석용)
- 규제 분석가: property 기본 정보 (지역, 면적, 가격 기반 규제 판단)
- 리스크 분석가: environment (대기질) + property.built_year (노후도)
data_quality.overall_score가 50 미만이면 분석 신뢰도 경고를 표시해주세요."
```

### PM에게 보고
```
"PM님, 데이터 수집 현황 보고:
- 서울 25개구 + 수원/성남 실거래가 매일 수집 중
- 학교 정보 서울+경기 약 5,000건 수집 완료
- Geocoding 성공률: 약 95% (5%는 주소 불일치)
- 데이터 갱신 주기: 실거래가 매일, 인프라 주 1회
추가 수집 지역이나 데이터 유형이 필요하면 알려주세요."
```

---

## ⚠️ 주의사항

### API 호출 주의사항
- 공공 API 일일 호출 횟수 제한 준수 (초과 시 차단)
- API 호출 간 최소 100ms 간격 유지 (Rate Limiting)
- XML 응답에 에러 코드가 포함될 수 있음 (resultCode != '00' 체크)
- 공공 API 점검 시간 (보통 새벽 1-5시) 피해서 스케줄링

### 데이터 품질 주의사항
- 실거래가 데이터는 1-2개월 지연 (신고 기반)
- Geocoding 실패 시 해당 데이터 건너뛰기 (NULL 좌표 방지)
- 가격 단위 통일 (만원 기준)
- 면적은 전용면적 기준 (공급면적과 혼동 주의)

### 보안 주의사항
- 모든 API 키는 Supabase Vault/환경변수에 저장
- Service Role Key는 Edge Function 내부에서만 사용
- 수집 Edge Function은 인증 헤더 검증 필수

### 성능 주의사항
- 대량 INSERT 시 batch 처리 (100건 단위)
- Geocoding은 비용이 크므로 이미 좌표가 있는 데이터 skip
- pg_cron 작업은 DB 부하가 적은 시간대에 스케줄링

---

## 📈 고급 구현 패턴

### 1. 증분 수집 (Incremental Collection)

```sql
-- 마지막 수집 시점 이후 데이터만 수집
SELECT MAX(created_at) AS last_collected
FROM collection_logs
WHERE type = 'apt_trade'
AND inserted > 0;
```

### 2. Geocoding 캐시

```sql
CREATE TABLE geocoding_cache (
  address TEXT PRIMARY KEY,
  lat NUMERIC(10,7),
  lng NUMERIC(10,7),
  accuracy TEXT, -- 'exact', 'approximate'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 캐시 히트 시 API 호출 절약
SELECT lat, lng FROM geocoding_cache WHERE address = $1;
```

### 3. 데이터 품질 점수 계산

```sql
CREATE OR REPLACE FUNCTION calculate_data_quality(p_property_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  quality INTEGER := 0;
  trade_count INTEGER;
  infra_count INTEGER;
  freshness INTERVAL;
BEGIN
  -- 실거래가 데이터 수 (최대 40점)
  SELECT COUNT(*) INTO trade_count
  FROM properties
  WHERE source = 'molit_apt_trade'
    AND ST_DWithin(
      location,
      (SELECT location FROM properties WHERE id = p_property_id),
      3000
    )
    AND created_at > now() - INTERVAL '12 months';

  quality := quality + LEAST(trade_count * 4, 40);

  -- 주변 인프라 데이터 (최대 30점)
  SELECT COUNT(*) INTO infra_count
  FROM infrastructure
  WHERE ST_DWithin(
    location,
    (SELECT location FROM properties WHERE id = p_property_id),
    3000
  );

  quality := quality + LEAST(infra_count * 2, 30);

  -- 데이터 신선도 (최대 30점)
  SELECT now() - MAX(created_at) INTO freshness
  FROM properties
  WHERE source = 'molit_apt_trade'
    AND ST_DWithin(
      location,
      (SELECT location FROM properties WHERE id = p_property_id),
      3000
    );

  IF freshness < INTERVAL '1 month' THEN quality := quality + 30;
  ELSIF freshness < INTERVAL '3 months' THEN quality := quality + 20;
  ELSIF freshness < INTERVAL '6 months' THEN quality := quality + 10;
  END IF;

  RETURN quality;
END;
$$;
```

---

## 📝 체크리스트

### 데이터 파이프라인 구축 완료 전 확인

- [ ] 공공데이터포털 API 키 발급 (국토부, 학교알리미, 에어코리아)
- [ ] 카카오 개발자 REST API 키 발급
- [ ] 환경변수 설정 (supabase secrets set)
- [ ] 실거래가 수집 Edge Function 배포 및 테스트
- [ ] 학교 정보 수집 Edge Function 배포 및 테스트
- [ ] infrastructure 테이블 생성 + 공간 인덱스
- [ ] collection_logs 테이블 생성
- [ ] geocoding_cache 테이블 생성
- [ ] pg_cron 스케줄 등록 (실거래가 매일, 인프라 주 1회)
- [ ] 데이터 품질 모니터링 쿼리 준비
- [ ] AnalysisDataPackage 조립 함수 테스트
- [ ] 분석팀에 데이터 인터페이스 문서 전달

---

## 🎓 예상 질문 & 답변

**Q: 왜 별도 ETL 도구(Airflow 등) 대신 pg_cron을 쓰나요?**
A: MVP 규모에서는 pg_cron으로 충분합니다. Supabase 내장 기능이라 추가 인프라 없이 사용 가능하고, Edge Function 호출로 복잡한 로직도 처리할 수 있습니다. 규모가 커지면 Airflow나 Temporal로 전환합니다.

**Q: Geocoding API 비용이 걱정되는데?**
A: 카카오 로컬 API는 일 30,000건 무료입니다. geocoding_cache 테이블로 캐싱하면 동일 주소 재호출을 방지하여 실제 사용량은 훨씬 적습니다. 초기 수집 시에만 대량 호출이 발생합니다.

**Q: 데이터 수집 실패 시 어떻게 되나요?**
A: collection_logs에 에러 수가 기록됩니다. 연속 3회 이상 실패 시 알림을 보내도록 설정합니다. 실패한 지역은 다음 스케줄에서 자동 재시도됩니다.

**Q: 실시간 매물 데이터는 안 되나요?**
A: 공공 API 특성상 실시간은 불가합니다. 실거래가는 1-2개월 지연, 매물 정보는 수집 주기(4시간)에 따라 갱신됩니다. 사용자에게 "데이터 기준일"을 항상 명시합니다.

---

## 🔗 참고 자료

### 공공 API
- [공공데이터포털](https://www.data.go.kr/)
- [국토교통부 실거래가 API](https://www.data.go.kr/data/15057511/openapi.do)
- [학교알리미 API](https://open.neis.go.kr/)
- [에어코리아 API](https://www.data.go.kr/data/15073861/openapi.do)

### 카카오 API
- [카카오 로컬 API (Geocoding)](https://developers.kakao.com/docs/latest/ko/local/dev-guide)

### 팀 문서
- [개발팀 개요](./DEV_TEAM_OVERVIEW.md)
- [백엔드 개발자](./BACKEND_DEVELOPER.md)
- [프론트엔드 개발자](./FRONTEND_DEVELOPER.md)
- [프로덕트 매니저](./PRODUCT_MANAGER.md)

### 분석팀 역할 문서
- [시세 분석가](./MARKET_ANALYST.md) - trade_history 데이터 소비자
- [입지 분석가](./LOCATION_ANALYST.md) - infrastructure 데이터 소비자
- [리스크 분석가](./RISK_ANALYST.md) - environment 데이터 소비자

---

**역할 버전**: 1.0
**최종 수정일**: 2026-02-15
**담당 영역**: 데이터 수집, 정제, 파이프라인, 분석팀 데이터 인터페이스
**협업 팀원**: 백엔드 개발자, 프로덕트 매니저, 분석팀 전원
