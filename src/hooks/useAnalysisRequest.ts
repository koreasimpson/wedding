'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

export function useAnalysisRequest() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (propertyId: string) => {
      const { data, error } = await supabase.functions.invoke('analysis-request', {
        body: { property_id: propertyId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, propertyId) => {
      queryClient.invalidateQueries({ queryKey: ['analysis', propertyId] });
    },
  });
}
