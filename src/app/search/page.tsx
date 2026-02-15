'use client';

import { Suspense, useEffect, useRef } from 'react';
import { useQueryState, parseAsString } from 'nuqs';
import { Search } from 'lucide-react';
import { PropertyFilter } from '@/components/property/PropertyFilter';
import { PropertyList } from '@/components/property/PropertyList';
import { usePreferences } from '@/hooks/usePreferences';
import { useQueryStates, parseAsInteger, parseAsFloat } from 'nuqs';

function SearchContent() {
  const [search, setSearch] = useQueryState('search', parseAsString);
  const { data: preferences } = usePreferences();
  const preferencesApplied = useRef(false);

  const [filters, setFilters] = useQueryStates({
    type: parseAsString,
    priceMin: parseAsInteger,
    priceMax: parseAsInteger,
    areaMin: parseAsFloat,
    areaMax: parseAsFloat,
    floorMin: parseAsInteger,
    floorMax: parseAsInteger,
    rooms: parseAsInteger,
    builtYearFrom: parseAsInteger,
    region: parseAsString,
    status: parseAsString,
    fromPreferences: parseAsString,
  });

  // preferences → 필터 자동 적용
  useEffect(() => {
    if (!preferences || preferencesApplied.current) return;

    // fromPreferences 파라미터가 있거나 필터가 비어있을 때 자동 적용
    const hasNoFilters = !filters.priceMin && !filters.priceMax && !filters.areaMin && !filters.areaMax
      && !filters.floorMin && !filters.floorMax && !filters.builtYearFrom && !filters.region;

    if (filters.fromPreferences === 'true' || hasNoFilters) {
      const newFilters: Record<string, any> = {};

      if (preferences.budget_min) newFilters.priceMin = preferences.budget_min;
      if (preferences.budget_max) newFilters.priceMax = preferences.budget_max;
      if (preferences.area_min) newFilters.areaMin = preferences.area_min;
      if (preferences.area_max) newFilters.areaMax = preferences.area_max;
      if (preferences.min_floor != null) newFilters.floorMin = preferences.min_floor;
      if (preferences.max_floor != null) newFilters.floorMax = preferences.max_floor;
      if (preferences.min_built_year) newFilters.builtYearFrom = preferences.min_built_year;
      if (preferences.preferred_regions && preferences.preferred_regions.length > 0) {
        newFilters.region = preferences.preferred_regions[0];
      }

      // fromPreferences 파라미터 제거
      newFilters.fromPreferences = null;

      if (Object.keys(newFilters).length > 1 || (Object.keys(newFilters).length === 1 && !('fromPreferences' in newFilters))) {
        setFilters(newFilters);
      }

      preferencesApplied.current = true;
    }
  }, [preferences, filters, setFilters]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value || null);
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-neutral-900">매물 검색</h1>
          <p className="mt-1 text-sm text-neutral-500">원하는 조건으로 매물을 찾아보세요</p>
        </div>

        <form onSubmit={(e) => e.preventDefault()} className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="매물명 또는 주소를 입력하세요"
              value={search ?? ''}
              onChange={handleSearchChange}
              className="w-full rounded-xl border border-neutral-300 bg-white py-3 pl-10 pr-4 text-sm placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
          </div>
        </form>

        <div className="mb-6">
          <PropertyFilter />
        </div>

        <PropertyList
          filters={{
            search,
            type: filters.type as 'apt' | 'villa' | 'officetel' | 'house' | null,
            priceMin: filters.priceMin,
            priceMax: filters.priceMax,
            areaMin: filters.areaMin,
            areaMax: filters.areaMax,
            floorMin: filters.floorMin,
            floorMax: filters.floorMax,
            rooms: filters.rooms,
            builtYearFrom: filters.builtYearFrom,
            region: filters.region,
            status: filters.status as any,
          }}
        />
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <p className="text-neutral-500">로딩 중...</p>
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}
