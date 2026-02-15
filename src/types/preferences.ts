import { Database } from './supabase';

export type UserPreferences = Database['public']['Tables']['user_preferences']['Row'];
export type UserPreferencesInsert = Database['public']['Tables']['user_preferences']['Insert'];
export type UserPreferencesUpdate = Database['public']['Tables']['user_preferences']['Update'];

export type DealType = 'sale' | 'jeonse' | 'monthly';

export const DEAL_TYPE_LABELS: Record<DealType, string> = {
  sale: '매매',
  jeonse: '전세',
  monthly: '월세',
};

export interface PreferenceFilters {
  budgetMin?: number;
  budgetMax?: number;
  dealType?: DealType;
  propertyTypes?: string[];
  areaMin?: number;
  areaMax?: number;
  preferredRegions?: string[];
  minFloor?: number;
  maxFloor?: number;
  minRooms?: number;
  minBathrooms?: number;
  minBuiltYear?: number;
}
