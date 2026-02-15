import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const apiKey = Deno.env.get(`API_KEY_${apiName.toUpperCase().replace(/-/g, '_')}`) || '';

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
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
