'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Property } from '@/types/property';

export function useCompareProperties() {
  const supabase = createClient();

  return useQuery<Property[]>({
    queryKey: ['properties', 'compare'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .in('status', ['candidate', 'interested'])
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return (data as Property[]) || [];
    },
    staleTime: 30 * 1000, // 30초
  });
}
