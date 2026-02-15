'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/types/supabase';
import type { AnalysisReport } from '@/types/analysis';

type AnalysisRequestRow = Database['public']['Tables']['analysis_requests']['Row'];
type PropertyRow = Database['public']['Tables']['properties']['Row'];

interface AnalysisRequestDetail extends AnalysisRequestRow {
  property: PropertyRow | null;
  reports: AnalysisReport[];
}

export function useAnalysisRequestDetail(requestId: string) {
  const supabase = createClient();

  return useQuery<AnalysisRequestDetail>({
    queryKey: ['analysis-request', requestId],
    queryFn: async () => {
      // 요청 정보 + 매물 정보
      const { data: requestData, error: requestError } = await supabase
        .from('analysis_requests')
        .select('*, property:properties(*)')
        .eq('id', requestId)
        .single();

      if (requestError) throw requestError;

      // 분석 리포트들
      const { data: reportsData, error: reportsError } = await supabase
        .from('analysis_reports')
        .select('*')
        .eq('request_id', requestId)
        .order('analysis_type');

      if (reportsError) throw reportsError;

      return {
        ...requestData,
        reports: (reportsData as AnalysisReport[]) || [],
      };
    },
    staleTime: 30 * 1000,
  });
}
