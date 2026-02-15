import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function stripHtml(html: string): string {
  return html.replace(/<\/?[^>]+(>|$)/g, '').trim();
}

async function searchNaverBlog(query: string, clientId: string, clientSecret: string) {
  const url = `https://openapi.naver.com/v1/search/blog.json?query=${encodeURIComponent(query)}&display=10&sort=date`;

  const response = await fetch(url, {
    headers: {
      'X-Naver-Client-Id': clientId,
      'X-Naver-Client-Secret': clientSecret,
    },
  });

  if (!response.ok) {
    throw new Error(`Naver Blog API error: ${response.status}`);
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

    // body에서 property_id 확인
    let targetPropertyId: string | null = null;
    try {
      const body = await req.json();
      if (body.property_id) {
        targetPropertyId = body.property_id;
      }
    } catch {
      // body가 없는 경우 무시
    }

    let properties: { id: string; name: string }[];

    if (targetPropertyId) {
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
      // 관심 매물 전체
      const { data, error } = await supabase
        .from('properties')
        .select('id, name')
        .in('status', ['interested', 'visit_planned', 'candidate'])
        .eq('is_active', true);

      if (error) {
        throw new Error(`Failed to fetch properties: ${error.message}`);
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
        // 두 가지 검색어로 블로그 검색
        const searchQueries = [
          `${property.name} 임장 후기`,
          `${property.name} 실거주`,
        ];

        for (const query of searchQueries) {
          const blogData = await searchNaverBlog(query, naverClientId, naverClientSecret);

          if (blogData.items && blogData.items.length > 0) {
            for (const item of blogData.items) {
              const review = {
                property_id: property.id,
                title: stripHtml(item.title),
                url: item.link,
                source: 'naver_blog',
                summary: item.description ? stripHtml(item.description).slice(0, 500) : null,
                author: item.bloggername || null,
                published_at: item.postdate
                  ? new Date(`${item.postdate.slice(0, 4)}-${item.postdate.slice(4, 6)}-${item.postdate.slice(6, 8)}`).toISOString()
                  : null,
              };

              const { error: insertError } = await supabase
                .from('property_reviews')
                .insert(review);

              // 23505는 unique_violation (URL 중복)
              if (insertError && insertError.code !== '23505') {
                console.error(`Failed to insert review for ${property.name}:`, insertError);
              }
            }
          }

          // Rate limit: 100ms 대기
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        totalCrawled++;
      } catch (error) {
        totalFailed++;
        const errorMsg = `Failed to crawl reviews for ${property.name}: ${(error as Error).message}`;
        errors.push(errorMsg);
        console.error(errorMsg);
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
    console.error('Crawl reviews error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
