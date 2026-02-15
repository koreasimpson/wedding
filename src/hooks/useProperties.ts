'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Property, PropertyStatus } from '@/types/property';

export function useProperties(filters?: {
  search?: string | null;
  type?: 'apt' | 'villa' | 'officetel' | 'house' | null;
  priceMin?: number | null;
  priceMax?: number | null;
  areaMin?: number | null;
  areaMax?: number | null;
  floorMin?: number | null;
  floorMax?: number | null;
  rooms?: number | null;
  builtYearFrom?: number | null;
  region?: string | null;
  status?: PropertyStatus | null;
}) {
  const supabase = createClient();

  return useQuery<Property[]>({
    queryKey: ['properties', filters],
    queryFn: async () => {
      let query = supabase.from('properties').select('*');

      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,address.ilike.%${filters.search}%`);
      }
      if (filters?.type) {
        query = query.eq('property_type', filters.type);
      }
      if (filters?.priceMin) {
        query = query.gte('asking_price', filters.priceMin);
      }
      if (filters?.priceMax) {
        query = query.lte('asking_price', filters.priceMax);
      }
      if (filters?.areaMin) {
        query = query.gte('area_sqm', filters.areaMin);
      }
      if (filters?.areaMax) {
        query = query.lte('area_sqm', filters.areaMax);
      }
      if (filters?.floorMin) {
        query = query.gte('floor', filters.floorMin);
      }
      if (filters?.floorMax) {
        query = query.lte('floor', filters.floorMax);
      }
      if (filters?.rooms) {
        query = query.gte('rooms', filters.rooms);
      }
      if (filters?.builtYearFrom) {
        query = query.gte('built_year', filters.builtYearFrom);
      }
      if (filters?.region) {
        query = query.ilike('address', `%${filters.region}%`);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return (data as Property[]) || [];
    },
    staleTime: 30 * 1000,
    placeholderData: (prev) => prev,
  });
}
