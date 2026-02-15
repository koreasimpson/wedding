import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// HTML 태그 제거 함수
function stripHtml(html: string): string {
  return html.replace(/<\/?[^>]+(>|$)/g, '').trim();
}

// 네이버 뉴스 검색
async function searchNaverNews(query: string, clientId: string, clientSecret: string) {
  const url = `https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(query)}&display=5&sort=date`;

  const response = await fetch(url, {
    headers: {
      'X-Naver-Client-Id': clientId,
      'X-Naver-Client-Secret': clientSecret,
    },
  });

  if (!response.ok) {
    throw new Error(`Naver API error: ${response.status}`);
  }

  return await response.json();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const naverClientId = Deno.env.get('NAVER_CLIENT_ID');
    const naverClientSecret = Deno.env.get('NAVER_CLIENT_SECRET');

    if (!naverClientId || !naverClientSecret) {
      return new Response(
        JSON.stringify({ error: 'Naver API credentials not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // body에서 property_id 확인 (단일 매물 크롤링 지원)
    let targetPropertyId: string | null = null;
    try {
      const body = await req.json();
      if (body.property_id) {
        targetPropertyId = body.property_id;
      }
    } catch {
      // body가 없는 경우 (GET 호출 등) 무시
    }

    let properties: { id: string; name: string }[];

    if (targetPropertyId) {
      // 단일 매물 크롤링
      const { data, error } = await supabase
        .from('properties')
        .select('id, name')
        .eq('id', targetPropertyId)
        .single();

      if (error || !data) {
        return new Response(
          JSON.stringify({ error: '매물을 찾을 수 없습니다' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      properties = [data];
    } else {
      // 기존: 관심 매물 전체 크롤링
      const { data, error: fetchError } = await supabase
        .from('properties')
        .select('id, name')
        .in('status', ['interested', 'visit_planned', 'candidate'])
        .eq('is_active', true);

      if (fetchError) {
        throw new Error(`Failed to fetch properties: ${fetchError.message}`);
      }

      if (!data || data.length === 0) {
        return new Response(
          JSON.stringify({ success: true, message: 'No properties to crawl', crawled: 0 }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      properties = data;
    }

    let totalCrawled = 0;
    let totalFailed = 0;
    const errors: string[] = [];

    for (const property of properties) {
      try {
        // 네이버 뉴스 검색
        const newsData = await searchNaverNews(
          property.name,
          naverClientId,
          naverClientSecret
        );

        if (newsData.items && newsData.items.length > 0) {
          // 뉴스 항목 삽입
          for (const item of newsData.items) {
            const newsItem = {
              property_id: property.id,
              title: stripHtml(item.title),
              url: item.originallink || item.link,
              source: item.source || null,
              summary: item.description ? stripHtml(item.description) : null,
              published_at: item.pubDate ? new Date(item.pubDate).toISOString() : null,
            };

            // URL 중복 방지 (ON CONFLICT DO NOTHING)
            const { error: insertError } = await supabase
              .from('property_news')
              .insert(newsItem)
              .select()
              .single();

            // 23505는 unique_violation (중복)
            if (insertError && insertError.code !== '23505') {
              console.error(`Failed to insert news for ${property.name}:`, insertError);
            }
          }

          totalCrawled++;
        }

        // Rate limit 고려: 100ms 대기
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        totalFailed++;
        const errorMsg = `Failed to crawl news for ${property.name}: ${(error as Error).message}`;
        errors.push(errorMsg);
        console.error(errorMsg);
        // 한 매물 실패해도 다음 매물 계속 처리
        continue;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        total_properties: properties.length,
        crawled: totalCrawled,
        failed: totalFailed,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Crawl news error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
