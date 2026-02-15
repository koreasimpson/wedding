import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SCHOOL_API_URL = 'https://open.neis.go.kr/hub/schoolInfo';

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

serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  const apiKey = Deno.env.get('API_KEY_SCHOOLINFO')!;
  const kakaoKey = Deno.env.get('KAKAO_REST_API_KEY')!;
  const eduOffices = ['B10', 'J10'];
  let totalInserted = 0;

  for (const office of eduOffices) {
    let pageNo = 1;
    let hasMore = true;
    while (hasMore) {
      const url = `${SCHOOL_API_URL}?KEY=${apiKey}&Type=json&ATPT_OFCDC_SC_CODE=${office}&pIndex=${pageNo}&pSize=100`;
      const res = await fetch(url);
      const data = await res.json();
      const schools = data?.schoolInfo?.[1]?.row;
      if (!schools || schools.length === 0) { hasMore = false; break; }

      for (const school of schools) {
        const coords = await geocode(school.ORG_RDNMA, kakaoKey);
        if (!coords) continue;

        const { error } = await supabase.from('infrastructure').upsert({
          type: 'school', sub_type: school.SCHUL_KND_SC_NM,
          name: school.SCHUL_NM, address: school.ORG_RDNMA,
          lat: coords.lat, lng: coords.lng,
          details: { edu_office: school.ATPT_OFCDC_SC_NM, founded: school.FOND_YMD, coedu: school.COEDU_SC_NM },
          external_id: school.SD_SCHUL_CODE, source: 'neis',
        }, { onConflict: 'external_id,source' });

        if (!error) totalInserted++;
      }
      pageNo++;
      if (schools.length < 100) hasMore = false;
      await new Promise(r => setTimeout(r, 100));
    }
  }

  return new Response(JSON.stringify({ inserted: totalInserted }));
});
