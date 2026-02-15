'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { UserPreferences, UserPreferencesInsert, UserPreferencesUpdate } from '@/types/preferences';

export function usePreferences() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  const query = useQuery<UserPreferences | null>({
    queryKey: ['preferences'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows found
          return null;
        }
        throw error;
      }
      return data as UserPreferences;
    },
    staleTime: 60 * 1000,
  });

  const upsertMutation = useMutation({
    mutationFn: async (preferences: Partial<UserPreferencesInsert | UserPreferencesUpdate>) => {
      const existingPreferences = query.data;

      if (existingPreferences) {
        // Update existing
        const { data, error } = await supabase
          .from('user_preferences')
          .update({
            ...preferences,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingPreferences.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('user_preferences')
          .insert({
            ...preferences,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preferences'] });
      queryClient.invalidateQueries({ queryKey: ['recommended-properties'] });
    },
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
    upsert: upsertMutation.mutate,
    isUpserting: upsertMutation.isPending,
  };
}
