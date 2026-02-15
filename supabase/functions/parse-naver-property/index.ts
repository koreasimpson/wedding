import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SearchResult {
  name: string;
  address: string;
  lat: number;
  lng: number;
  kakao_id?: string;
  category?: string;
}

// 카카오 키워드 검색으로 아파트 검색
async function searchApartments(query: string, kakaoKey: string): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  try {
    const res = await fetch(
      `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&size=10`,
      { headers: { Authorization: `KakaoAK ${kakaoKey}` } }
    );
    const data = await res.json();
    if (data.documents) {
      for (const doc of data.documents) {
        results.push({
          name: doc.place_name,
          address: doc.road_address_name || doc.address_name,
          lat: parseFloat(doc.y),
          lng: parseFloat(doc.x),
          kakao_id: doc.id,
          category: doc.category_name,
        });
      }
    }
  } catch (err) {
    console.error('Kakao search failed:', err);
  }
  return results;
}

// 카카오 주소 검색으로 좌표 변환
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
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const kakaoKey = Deno.env.get('KAKAO_REST_API_KEY');
    if (!kakaoKey) {
      return new Response(
        JSON.stringify({ error: 'KAKAO_REST_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { action } = body;

    // ─── 검색 모드: 아파트명/주소로 검색하여 결과 리스트 반환 ───
    if (action === 'search') {
      const { query } = body;
      if (!query || query.trim().length < 2) {
        return new Response(
          JSON.stringify({ error: '검색어를 2글자 이상 입력해 주세요', results: [] }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const results = await searchApartments(query.trim(), kakaoKey);

      return new Response(
        JSON.stringify({ results }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ─── 저장 모드: 검색 결과에서 선택한 매물을 DB에 저장 ───
    if (action === 'save') {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );

      const { name, address, lat, lng, kakao_id, naver_link } = body;
      if (!name || !address) {
        return new Response(
          JSON.stringify({ error: '이름과 주소가 필요해요' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const externalId = kakao_id ? `kakao_${kakao_id}` : `manual_${Date.now()}`;

      const { data: property, error: upsertError } = await supabase
        .from('properties')
        .upsert({
          external_id: externalId,
          source: kakao_id ? 'kakao' : 'manual',
          name,
          address,
          property_type: 'apt',
          asking_price: 0,
          area_sqm: 0,
          lat: lat || 37.5665,
          lng: lng || 126.978,
          naver_link: naver_link || null,
        }, { onConflict: 'external_id,source' })
        .select()
        .single();

      if (upsertError) throw new Error(`DB 저장 실패: ${upsertError.message}`);

      return new Response(
        JSON.stringify({ success: true, property }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ─── 기존 URL 파싱 모드 (하위 호환) ───
    const { url } = body;
    if (!url) {
      return new Response(
        JSON.stringify({ error: 'action 또는 url 파라미터가 필요합니다' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // URL에서 검색어 힌트 추출 후 검색 결과 반환 (사용자가 선택하도록)
    const complexMatch = url.match(/complexes\/(\d+)/);
    const complexId = complexMatch ? complexMatch[1] : null;

    // URL의 ms 파라미터에서 좌표 추출
    let urlCoords: { lat: number; lng: number } | null = null;
    try {
      const urlObj = new URL(url);
      const ms = urlObj.searchParams.get('ms');
      if (ms) {
        const parts = ms.split(',');
        if (parts.length >= 2) {
          const lat = parseFloat(parts[0]);
          const lng = parseFloat(parts[1]);
          if (!isNaN(lat) && !isNaN(lng) && lat > 33 && lat < 43 && lng > 124 && lng < 132) {
            urlCoords = { lat, lng };
          }
        }
      }
    } catch { /* ignore */ }

    // 좌표가 있으면 근처 아파트 검색
    if (urlCoords) {
      const results: SearchResult[] = [];
      try {
        const res = await fetch(
          `https://dapi.kakao.com/v2/local/search/keyword.json?query=아파트&x=${urlCoords.lng}&y=${urlCoords.lat}&radius=1000&sort=distance&size=5`,
          { headers: { Authorization: `KakaoAK ${kakaoKey}` } }
        );
        const data = await res.json();
        if (data.documents) {
          for (const doc of data.documents) {
            results.push({
              name: doc.place_name,
              address: doc.road_address_name || doc.address_name,
              lat: parseFloat(doc.y),
              lng: parseFloat(doc.x),
              kakao_id: doc.id,
              category: doc.category_name,
            });
          }
        }
      } catch { /* ignore */ }

      if (results.length > 0) {
        return new Response(
          JSON.stringify({
            needs_selection: true,
            results,
            complex_id: complexId,
            naver_link: url,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({ error: '매물 정보를 찾을 수 없어요', needs_manual: true }),
      { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Parse naver property error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
