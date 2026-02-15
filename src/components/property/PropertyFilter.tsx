'use client';

import { useState } from 'react';
import { useQueryStates, parseAsString, parseAsInteger, parseAsFloat } from 'nuqs';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PROPERTY_TYPE_LABELS, PROPERTY_STATUS_LABELS } from '@/types/property';
import type { PropertyType, PropertyStatus } from '@/types/property';

export function PropertyFilter() {
  const [isExpanded, setIsExpanded] = useState(false);

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
  });

  const propertyTypes: PropertyType[] = ['apt', 'villa', 'officetel', 'house'];
  const propertyStatuses: PropertyStatus[] = ['none', 'interested', 'visit_planned', 'visited', 'candidate', 'rejected'];

  const handleReset = () => {
    setFilters({
      type: null,
      priceMin: null,
      priceMax: null,
      areaMin: null,
      areaMax: null,
      floorMin: null,
      floorMax: null,
      rooms: null,
      builtYearFrom: null,
      region: null,
      status: null,
    });
  };

  const pricePresets = [
    { label: '1억 이하', max: 100_000_000 },
    { label: '1~3억', min: 100_000_000, max: 300_000_000 },
    { label: '3~5억', min: 300_000_000, max: 500_000_000 },
    { label: '5~10억', min: 500_000_000, max: 1_000_000_000 },
    { label: '10억 이상', min: 1_000_000_000 },
  ];

  const areaPresets = [
    { label: '10평 이하', max: 33 },
    { label: '10~20평', min: 33, max: 66 },
    { label: '20~30평', min: 66, max: 99 },
    { label: '30~40평', min: 99, max: 132 },
    { label: '40평 이상', min: 132 },
  ];

  const builtYearOptions = [
    { label: '5년 이내', value: new Date().getFullYear() - 5 },
    { label: '10년 이내', value: new Date().getFullYear() - 10 },
    { label: '15년 이내', value: new Date().getFullYear() - 15 },
    { label: '20년 이내', value: new Date().getFullYear() - 20 },
  ];

  return (
    <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-neutral-50 transition-colors"
      >
        <span className="text-sm font-semibold text-neutral-900">필터 옵션</span>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-neutral-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-neutral-500" />
        )}
      </button>

      {isExpanded && (
        <div className="border-t border-neutral-200 p-4 space-y-5">
          {/* 매물 유형 */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">매물 유형</label>
            <div className="flex flex-wrap gap-2">
              {propertyTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => setFilters({ type: filters.type === type ? null : type })}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    filters.type === type
                      ? 'bg-primary-600 text-white'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  {PROPERTY_TYPE_LABELS[type]}
                </button>
              ))}
            </div>
          </div>

          {/* 가격 범위 */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">가격</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {pricePresets.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() =>
                    setFilters({
                      priceMin: preset.min ?? null,
                      priceMax: preset.max ?? null,
                    })
                  }
                  className="rounded-lg px-3 py-1.5 text-xs font-medium bg-neutral-100 text-neutral-600 hover:bg-neutral-200 transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="최소 (원)"
                value={filters.priceMin ?? ''}
                onChange={(e) => setFilters({ priceMin: e.target.value ? parseInt(e.target.value) : null })}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              <span className="text-neutral-400">~</span>
              <input
                type="number"
                placeholder="최대 (원)"
                value={filters.priceMax ?? ''}
                onChange={(e) => setFilters({ priceMax: e.target.value ? parseInt(e.target.value) : null })}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* 면적 */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">면적</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {areaPresets.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() =>
                    setFilters({
                      areaMin: preset.min ?? null,
                      areaMax: preset.max ?? null,
                    })
                  }
                  className="rounded-lg px-3 py-1.5 text-xs font-medium bg-neutral-100 text-neutral-600 hover:bg-neutral-200 transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="최소 (㎡)"
                value={filters.areaMin ?? ''}
                onChange={(e) => setFilters({ areaMin: e.target.value ? parseFloat(e.target.value) : null })}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              <span className="text-neutral-400">~</span>
              <input
                type="number"
                placeholder="최대 (㎡)"
                value={filters.areaMax ?? ''}
                onChange={(e) => setFilters({ areaMax: e.target.value ? parseFloat(e.target.value) : null })}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* 층수 */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">층수</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="최소"
                value={filters.floorMin ?? ''}
                onChange={(e) => setFilters({ floorMin: e.target.value ? parseInt(e.target.value) : null })}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              <span className="text-neutral-400">~</span>
              <input
                type="number"
                placeholder="최대"
                value={filters.floorMax ?? ''}
                onChange={(e) => setFilters({ floorMax: e.target.value ? parseInt(e.target.value) : null })}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* 방 수 */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">방 수</label>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4].map((num) => (
                <button
                  key={num}
                  onClick={() => setFilters({ rooms: filters.rooms === num ? null : num })}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    filters.rooms === num
                      ? 'bg-primary-600 text-white'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  {num}개 이상
                </button>
              ))}
            </div>
          </div>

          {/* 건축년도 */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">건축년도</label>
            <div className="flex flex-wrap gap-2">
              {builtYearOptions.map((option) => (
                <button
                  key={option.label}
                  onClick={() =>
                    setFilters({
                      builtYearFrom: filters.builtYearFrom === option.value ? null : option.value,
                    })
                  }
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    filters.builtYearFrom === option.value
                      ? 'bg-primary-600 text-white'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* 지역 */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">지역</label>
            <input
              type="text"
              placeholder="시/구/동 입력"
              value={filters.region ?? ''}
              onChange={(e) => setFilters({ region: e.target.value || null })}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          {/* 매물 상태 */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">매물 상태</label>
            <div className="flex flex-wrap gap-2">
              {propertyStatuses.map((status) => (
                <button
                  key={status}
                  onClick={() => setFilters({ status: filters.status === status ? null : status })}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    filters.status === status
                      ? 'bg-primary-600 text-white'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  {PROPERTY_STATUS_LABELS[status]}
                </button>
              ))}
            </div>
          </div>

          {/* 초기화 버튼 */}
          <Button variant="outline" size="sm" onClick={handleReset} className="w-full">
            필터 초기화
          </Button>
        </div>
      )}
    </div>
  );
}
