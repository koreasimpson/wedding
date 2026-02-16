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
      const all = (data as AnalysisReport[]) || [];

      // 분석 유형별 최신 1건만 반환 (재분석 시 중복 방지)
      const latest = new Map<string, AnalysisReport>();
      for (const report of all) {
        if (!latest.has(report.analysis_type)) {
          latest.set(report.analysis_type, report);
        }
      }
      return Array.from(latest.values());
    },
  });
}
