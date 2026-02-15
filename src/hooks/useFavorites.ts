'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Property, PropertyStatus } from '@/types/property';

/**
 * 관심 매물 훅 (status 기반)
 * - statusFilter가 null: 전체 관심 매물 (status !== 'none')
 * - statusFilter가 특정 값: 해당 상태만
 */
export function useFavorites(statusFilter?: PropertyStatus | null) {
  const supabase = createClient();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['favorites', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('properties')
        .select('*')
        .order('updated_at', { ascending: false });

      if (statusFilter) {
        // 특정 상태만
        query = query.eq('status', statusFilter);
      } else {
        // 전체 관심 매물 (none 제외)
        query = query.neq('status', 'none');
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Property[];
    },
    staleTime: 30_000,
  });

  const updateStatus = useMutation({
    mutationFn: async ({
      propertyId,
      status,
      memo,
    }: {
      propertyId: string;
      status: PropertyStatus;
      memo?: string;
    }) => {
      const { error } = await supabase
        .from('properties')
        .update({
          status,
          memo: memo || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', propertyId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['status-counts'] });
    },
  });

  return { ...query, updateStatus };
}
