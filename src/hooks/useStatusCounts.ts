'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

export interface StatusCounts {
  interested: number;
  visit_planned: number;
  visited: number;
  candidate: number;
  rejected: number;
  total: number;
}

/**
 * 상태별 매물 개수 조회
 */
export function useStatusCounts() {
  const supabase = createClient();

  return useQuery({
    queryKey: ['status-counts'],
    queryFn: async () => {
      // 각 상태별로 count 조회
      const { data, error } = await supabase
        .from('properties')
        .select('status');

      if (error) throw error;

      const counts: StatusCounts = {
        interested: 0,
        visit_planned: 0,
        visited: 0,
        candidate: 0,
        rejected: 0,
        total: 0,
      };

      data.forEach((item) => {
        if (item.status === 'interested') counts.interested++;
        else if (item.status === 'visit_planned') counts.visit_planned++;
        else if (item.status === 'visited') counts.visited++;
        else if (item.status === 'candidate') counts.candidate++;
        else if (item.status === 'rejected') counts.rejected++;
      });

      counts.total =
        counts.interested +
        counts.visit_planned +
        counts.visited +
        counts.candidate +
        counts.rejected;

      return counts;
    },
    staleTime: 30_000,
  });
}
