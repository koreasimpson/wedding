'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/types/supabase';

type AnalysisRequestRow = Database['public']['Tables']['analysis_requests']['Row'];
type PropertyRow = Database['public']['Tables']['properties']['Row'];

interface AnalysisRequestWithProperty extends AnalysisRequestRow {
  property: PropertyRow | null;
}

export function useAnalysisRequests() {
  const supabase = createClient();

  return useQuery<AnalysisRequestWithProperty[]>({
    queryKey: ['analysis-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('analysis_requests')
        .select('*, property:properties(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data as AnalysisRequestWithProperty[]) || [];
    },
    staleTime: 30 * 1000,
  });
}
