'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { AnalysisReport } from '@/types/analysis';

export function useAnalysis(propertyId: string) {
  const supabase = createClient();

  return useQuery<AnalysisReport[]>({
    queryKey: ['analysis', propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('analysis_reports')
        .select('*')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data as AnalysisReport[]) || [];
    },
  });
}
