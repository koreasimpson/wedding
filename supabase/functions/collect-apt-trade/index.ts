import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MOLIT_API_URL = 'http://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev';

const SGG_MAP: Record<string, string> = {
  '11110': '서울특별시 종로구', '11140': '서울특별시 중구',
  '11170': '서울특별시 용산구', '11200': '서울특별시 성동구',
  '11215': '서울특별시 광진구', '11230': '서울특별시 동대문구',
  '11260': '서울특별시 중랑구', '11290': '서울특별시 성북구',
  '11305': '서울특별시 강북구', '11320': '서울특별시 도봉구',
  '11350': '서울특별시 노원구', '11380': '서울특별시 은평구',
  '11410': '서울특별시 서대문구', '11440': '서울특별시 마포구',
  '11470': '서울특별시 양천구', '11500': '서울특별시 강서구',
  '11530': '서울특별시 구로구', '11545': '서울특별시 금천구',
  '11560': '서울특별시 영등포구', '11590': '서울특별시 동작구',
  '11620': '서울특별시 관악구', '11650': '서울특별시 서초구',
  '11680': '서울특별시 강남구', '11710': '서울특별시 송파구',
  '11740': '서울특별시 강동구',
  '41111': '경기도 수원시 장안구', '41113': '경기도 수원시 권선구',
  '41115': '경기도 수원시 팔달구', '41117': '경기도 수원시 영통구',
  '41131': '경기도 성남시 수정구', '41133': '경기도 성남시 중원구',
  '41135': '경기도 성남시 분당구',
};

// preferred_regions 문자열(예: "서울특별시 강남구")을 SGG_MAP에서 역매핑하여 법정동코드 목록 반환
function getRegionCodes(preferredRegions: string[]): string[] {
  const codes: string[] = [];
  for (const region of preferredRegions) {
    const trimmed = region.trim();
    if (!trimmed) continue;
    for (const [code, name] of Object.entries(SGG_MAP)) {
      if (name === trimmed || name.includes(trimmed) || trimmed.includes(name)) {
        codes.push(code);
      }
    }
  }
  return codes.length > 0 ? codes : Object.keys(SGG_MAP);
}

// 최근 N개월의 dealYmd 목록 생성 (YYYYMM 형식)
function getRecentDealYmds(monthCount: number): string[] {
  const ymds: string[] = [];
  const now = new Date();
  for (let i = 0; i < monthCount; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    ymds.push(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return ymds;
}

async function geocode(address: string, kakaoKey: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(
      `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(address)}`,
      { headers: { Authorization: `KakaoAK ${kakaoKey}` } }
    );
    const data = await res.json();
    if (data.documents && data.documents.length > 0) {
      return { lat: parseFloat(data.documents[0].y), lng: parseFloat(data.documents[0].x) };
    }
    return null;
  } catch { return null; }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const apiKey = Deno.env.get('API_KEY_MOLIT_APT_TRADE')!;
    const kakaoKey = Deno.env.get('KAKAO_REST_API_KEY')!;

    // req body에서 regions를 받거나, 없으면 user_preferences 조회
    let targetRegions: string[];
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // body가 없는 경우 무시
    }

    if (body.regions && Array.isArray(body.regions) && body.regions.length > 0) {
      // 요청 body에서 직접 regions 전달됨
      targetRegions = getRegionCodes(body.regions);
    } else if (body.user_id) {
      // user_id가 있으면 user_preferences에서 preferred_regions 조회
      const { data: prefs } = await supabase
        .from('user_preferences')
        .select('preferred_regions')
        .eq('user_id', body.user_id)
        .single();

      if (prefs?.preferred_regions && Array.isArray(prefs.preferred_regions) && prefs.preferred_regions.length > 0) {
        targetRegions = getRegionCodes(prefs.preferred_regions);
      } else {
        targetRegions = Object.keys(SGG_MAP);
      }
    } else {
      targetRegions = Object.keys(SGG_MAP);
    }

    // 최근 3개월 수집
    const dealYmds = getRecentDealYmds(3);

    let totalInserted = 0;
    let totalErrors = 0;

    for (const dealYmd of dealYmds) {
      for (const regionCode of targetRegions) {
        try {
          const url = `${MOLIT_API_URL}?serviceKey=${apiKey}&LAWD_CD=${regionCode}&DEAL_YMD=${dealYmd}&pageNo=1&numOfRows=100`;
          const response = await fetch(url);
          const text = await response.text();

          // Simple XML parsing for items
          const itemRegex = /<item>([\s\S]*?)<\/item>/g;
          let match;
          while ((match = itemRegex.exec(text)) !== null) {
            const item = match[1];
            const getValue = (tag: string) => {
              const m = item.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
              return m ? m[1].trim() : '';
            };

            const aptName = getValue('aptNm');
            const tradePrice = getValue('dealAmount');
            const excluUseAr = getValue('excluUseAr');
            const floor = getValue('floor');
            const buildYear = getValue('buildYear');
            const dongName = getValue('umdNm');
            const jibun = getValue('jibun');
            const dealYear = getValue('dealYear');
            const dealMonth = getValue('dealMonth');
            const dealDay = getValue('dealDay');
            const cdealDay = getValue('cdealDay');

            if (!aptName || !tradePrice) continue;
            // 해제된 거래 건은 제외
            if (cdealDay === 'O') continue;

            const address = `${SGG_MAP[regionCode] || ''} ${dongName} ${jibun}`.trim();
            const coords = await geocode(address, kakaoKey);
            if (!coords) continue;

            const priceManWon = parseInt(tradePrice.replace(/,/g, '').trim()) || 0;
            const price = priceManWon * 10000; // 만원 → 원 변환
            const dealDate = `${dealYear}-${dealMonth.padStart(2, '0')}-${dealDay.padStart(2, '0')}`;
            const externalId = `molit_trade_${regionCode}_${aptName}_${dealDate}_${floor}`;

            const { error } = await supabase.from('properties').upsert({
              external_id: externalId, source: 'molit_apt_trade',
              name: aptName, address, property_type: 'apt',
              asking_price: price,
              deposit: null,
              monthly_rent: null,
              area_sqm: parseFloat(excluUseAr) || 0,
              floor: parseInt(floor) || null, built_year: parseInt(buildYear) || null,
              lat: coords.lat, lng: coords.lng,
            }, { onConflict: 'external_id,source' });

            if (error) totalErrors++; else totalInserted++;
          }

          await new Promise(r => setTimeout(r, 200));
        } catch (err) {
          console.error(`Region ${regionCode} (${dealYmd}) failed:`, err);
          totalErrors++;
        }
      }
    }

    await supabase.from('collection_logs').insert({
      type: 'apt_trade', deal_ymd: dealYmds.join(','),
      inserted: totalInserted, errors: totalErrors,
    });

    return new Response(JSON.stringify({
      success: true, inserted: totalInserted, errors: totalErrors,
      deal_ymds: dealYmds, region_count: targetRegions.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
