'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Property } from '@/types/property';

export function useRecommendedProperties(enabled: boolean = true, limit: number = 5) {
  const supabase = createClient();

  return useQuery<Property[]>({
    queryKey: ['recommended-properties', limit],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_recommended_properties', {
        p_limit: limit,
      });

      if (error) throw error;
      return (data as Property[]) || [];
    },
    enabled,
    staleTime: 30 * 1000,
    placeholderData: (prev) => prev,
  });
}
