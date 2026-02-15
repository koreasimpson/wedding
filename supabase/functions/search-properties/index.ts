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
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
