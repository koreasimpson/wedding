'use client';

import { useState } from 'react';
import { useProperties } from '@/hooks/useProperties';
import { usePreferences } from '@/hooks/usePreferences';
import { PropertyCard } from './PropertyCard';
import { PropertyCardSkeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Search, Download, Loader2, CheckCircle } from 'lucide-react';
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
  const { data: preferences } = usePreferences();
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [isCollecting, setIsCollecting] = useState(false);
  const [collectResult, setCollectResult] = useState<number | null>(null);

  const handleCollectData = async () => {
    if (!preferences?.preferred_regions?.length) return;

    setIsCollecting(true);
    setCollectResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('collect-apt-trade', {
        body: { regions: preferences.preferred_regions },
      });

      if (error) throw error;

      const count = data?.count ?? data?.inserted ?? 0;
      setCollectResult(count);
      queryClient.invalidateQueries({ queryKey: ['properties'] });
    } catch (err) {
      console.error('데이터 수집 실패:', err);
      alert('데이터 수집에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsCollecting(false);
    }
  };

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
      <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100">
          <Search className="h-6 w-6 text-neutral-400" />
        </div>
        <h3 className="text-base font-semibold text-neutral-900">검색 결과가 없어요</h3>
        <p className="mt-1.5 text-sm text-neutral-500">
          검색어나 필터 조건을 변경해보세요
        </p>

        {preferences?.preferred_regions && preferences.preferred_regions.length > 0 && (
          <div className="mt-6 border-t border-neutral-100 pt-6">
            {collectResult !== null ? (
              <div className="flex flex-col items-center gap-2">
                <CheckCircle className="h-8 w-8 text-green-500" />
                <p className="text-sm font-medium text-neutral-900">
                  {collectResult}건의 매물을 가져왔어요!
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCollectResult(null);
                    queryClient.invalidateQueries({ queryKey: ['properties'] });
                  }}
                >
                  목록 새로고침
                </Button>
              </div>
            ) : (
              <>
                <p className="mb-3 text-sm text-neutral-500">
                  관심 지역의 매물 데이터를 가져올 수 있어요
                </p>
                <Button
                  onClick={handleCollectData}
                  disabled={isCollecting}
                >
                  {isCollecting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      데이터를 가져오는 중...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      이 지역의 매물 데이터 가져오기
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        )}
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
