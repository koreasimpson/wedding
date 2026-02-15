'use client';

import { useProperties } from '@/hooks/useProperties';
import { PropertyCard } from './PropertyCard';
import { PropertyCardSkeleton } from '@/components/ui/Skeleton';
import type { PropertyStatus } from '@/types/property';

interface PropertyListProps {
  filters?: {
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
  };
}

export function PropertyList({ filters }: PropertyListProps) {
  const { data: properties = [], isLoading, error } = useProperties(filters);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <PropertyCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-sm text-red-600">
        매물을 불러오는 중 오류가 발생했습니다.
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-neutral-500">
        검색 결과가 없습니다.
        <br />
        검색어나 필터 조건을 변경해보세요.
      </div>
    );
  }

  return (
    <div>
      <p className="mb-3 text-sm font-medium text-neutral-600">
        검색 결과 {properties.length}건
      </p>
      <div className="space-y-4">
        {properties.map((property) => (
          <PropertyCard
            key={property.id}
            property={property}
          />
        ))}
      </div>
    </div>
  );
}
