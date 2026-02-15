'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useFavorites } from '@/hooks/useFavorites';
import { useStatusCounts } from '@/hooks/useStatusCounts';
import { PropertyCard } from '@/components/property/PropertyCard';
import { AddPropertyModal } from '@/components/property/AddPropertyModal';
import type { PropertyStatus } from '@/types/property';

const STATUS_TABS = [
  { value: null, label: '전체' },
  { value: 'interested', label: '관심' },
  { value: 'visit_planned', label: '방문예정' },
  { value: 'visited', label: '방문완료' },
  { value: 'candidate', label: '후보' },
  { value: 'rejected', label: '탈락' },
] as const;

export default function FavoritesPage() {
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<PropertyStatus | null>(null);

  const { data: properties = [], isLoading } = useFavorites(activeTab);
  const { data: counts } = useStatusCounts();

  const getCount = (status: PropertyStatus | null) => {
    if (!counts) return 0;
    if (status === null) return counts.total;
    // PropertyStatus는 'interested' | 'visit_planned' | 'visited' | 'candidate' | 'rejected' | 'none'
    // StatusCounts는 'none'을 제외한 5개만 포함
    if (status === 'none') return 0;
    return counts[status] || 0;
  };

  return (
    <>
      <div className="min-h-screen bg-neutral-50">
        <div className="mx-auto max-w-screen-2xl px-4 py-8">
          {/* 헤더 */}
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-neutral-900">관심 매물</h1>
              <p className="mt-1 text-sm text-neutral-600">
                상태별로 매물을 관리하세요
              </p>
            </div>
            <button
              onClick={() => setAddModalOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              매물 추가
            </button>
          </div>

          {/* 상태별 탭 */}
          <div className="mb-6 flex flex-wrap gap-2">
            {STATUS_TABS.map((tab) => {
              const isActive = activeTab === tab.value;
              const count = getCount(tab.value);
              return (
                <button
                  key={tab.label}
                  onClick={() => setActiveTab(tab.value)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary-600 text-white'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  {tab.label}
                  {count > 0 && (
                    <span className={`ml-1.5 ${isActive ? 'text-white' : 'text-neutral-500'}`}>
                      ({count})
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* 매물 목록 */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
            </div>
          ) : properties.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="mb-4 h-20 w-20 rounded-full bg-neutral-100 flex items-center justify-center">
                <svg
                  className="h-10 w-10 text-neutral-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  />
                </svg>
              </div>
              <p className="text-base font-medium text-neutral-700">
                아직 관심 매물이 없어요
              </p>
              <p className="mt-1 text-sm text-neutral-500">
                매물을 추가하고 관심 표시해 보세요
              </p>
              <button
                onClick={() => setAddModalOpen(true)}
                className="mt-6 rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
              >
                매물 추가하기
              </button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {properties.map((property) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  showStatusSelect
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <AddPropertyModal open={addModalOpen} onClose={() => setAddModalOpen(false)} />
    </>
  );
}
