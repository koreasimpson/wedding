'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { PropertyStatus } from '@/types/property';

interface UpdatePropertyParams {
  id: string;
  status?: PropertyStatus;
  memo?: string;
}

export function useUpdateProperty() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status, memo }: UpdatePropertyParams) => {
      const updateData: { status?: PropertyStatus; memo?: string; updated_at: string } = {
        updated_at: new Date().toISOString(),
      };

      if (status !== undefined) updateData.status = status;
      if (memo !== undefined) updateData.memo = memo;

      const { data, error } = await supabase
        .from('properties')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['property', data.id] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
    },
  });
}
