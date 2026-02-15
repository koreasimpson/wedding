'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/types/supabase';

type PropertyReview = Database['public']['Tables']['property_reviews']['Row'];

export function usePropertyReviews(propertyId: string) {
  const supabase = createClient();

  return useQuery<PropertyReview[]>({
    queryKey: ['property-reviews', propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('property_reviews')
        .select('*')
        .eq('property_id', propertyId)
        .order('published_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return (data as PropertyReview[]) || [];
    },
    staleTime: 5 * 60 * 1000,
  });
}
