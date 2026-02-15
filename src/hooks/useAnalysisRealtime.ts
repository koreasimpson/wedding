'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

export function useAnalysisRealtime(requestId: string | null) {
  const supabase = createClient();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!requestId) return;

    const channel = supabase
      .channel(`analysis-${requestId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'analysis_reports',
        filter: `request_id=eq.${requestId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['analysis'] });
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'analysis_requests',
        filter: `id=eq.${requestId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['analysis-request'] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [requestId, supabase, queryClient]);
}
