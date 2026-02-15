// Database types
export type { Database } from './supabase';

// Property types
export type { Property, PropertyType, PropertyStatus } from './property';
export { PROPERTY_TYPE_LABELS, PROPERTY_TYPE_COLORS, PROPERTY_STATUS_LABELS, PROPERTY_STATUS_COLORS } from './property';

// Preference types
export type { UserPreferences, UserPreferencesInsert, UserPreferencesUpdate, DealType, PreferenceFilters } from './preferences';
export { DEAL_TYPE_LABELS } from './preferences';

// News types
export type { PropertyNews, PropertyNewsInsert, PropertyNewsUpdate, NewsSource } from './news';
export { NEWS_SOURCES } from './news';
