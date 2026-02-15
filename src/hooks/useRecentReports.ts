'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { AnalysisRequest } from '@/types/analysis';
import type { Property } from '@/types/property';

export interface RecentReport extends AnalysisRequest {
  property: Property | null;
}

export function useRecentReports(limit: number = 5) {
  const supabase = createClient();

  return useQuery<RecentReport[]>({
    queryKey: ['recent-reports', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('analysis_requests')
        .select(`
          *,
          property:properties(*)
        `)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data as RecentReport[]) || [];
    },
    staleTime: 30 * 1000,
    placeholderData: (prev) => prev,
  });
}
