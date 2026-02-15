'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/types/supabase';

type PropertyNews = Database['public']['Tables']['property_news']['Row'];

export function usePropertyNews(propertyId: string) {
  const supabase = createClient();

  return useQuery<PropertyNews[]>({
    queryKey: ['property-news', propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('property_news')
        .select('*')
        .eq('property_id', propertyId)
        .order('published_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return (data as PropertyNews[]) || [];
    },
    staleTime: 5 * 60 * 1000, // 5분
  });
}
