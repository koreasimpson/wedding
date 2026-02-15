export type PropertyType = 'apt' | 'villa' | 'officetel' | 'house';

export type PropertyStatus = 'none' | 'interested' | 'visit_planned' | 'visited' | 'candidate' | 'rejected';

export interface Property {
  id: string;
  name: string;
  address: string;
  address_detail: string | null;
  property_type: PropertyType;
  asking_price: number;
  deposit: number | null;
  monthly_rent: number | null;
  maintenance_fee: number | null;
  area_sqm: number;
  supply_area_sqm: number | null;
  floor: number | null;
  total_floors: number | null;
  rooms: number | null;
  bathrooms: number | null;
  direction: string | null;
  built_year: number | null;
  lat: number;
  lng: number;
  images: string[];
  description: string | null;
  source: string | null;
  external_id: string | null;
  is_active: boolean;
  status: PropertyStatus;
  memo: string | null;
  naver_link: string | null;
  visit_date: string | null;
  visit_memo: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  apt: '아파트',
  villa: '빌라',
  officetel: '오피스텔',
  house: '단독주택',
};

export const PROPERTY_TYPE_COLORS: Record<PropertyType, string> = {
  apt: 'bg-property-apt',
  villa: 'bg-property-villa',
  officetel: 'bg-property-officetel',
  house: 'bg-property-house',
};

export const PROPERTY_STATUS_LABELS: Record<PropertyStatus, string> = {
  none: '미분류',
  interested: '관심',
  visit_planned: '방문예정',
  visited: '방문완료',
  candidate: '후보',
  rejected: '탈락',
};

export const PROPERTY_STATUS_COLORS: Record<PropertyStatus, string> = {
  none: 'default',
  interested: 'primary',
  visit_planned: 'warning',
  visited: 'success',
  candidate: 'primary',
  rejected: 'danger',
};
