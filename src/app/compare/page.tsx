'use client';

import { useState } from 'react';
import { useCompareProperties } from '@/hooks/useCompareProperties';
import { useAnalysis } from '@/hooks/useAnalysis';
import { formatPrice, formatArea } from '@/lib/utils/format';
import { PROPERTY_TYPE_LABELS, PROPERTY_STATUS_LABELS, PROPERTY_STATUS_COLORS } from '@/types/property';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Loader2, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { Property } from '@/types/property';

function PropertyCompareColumn({ property, isHighlightPrice, isHighlightArea }: {
  property: Property;
  isHighlightPrice: boolean;
  isHighlightArea: boolean;
}) {
  const { data: analysisReports = [] } = useAnalysis(property.id);
  const avgScore = analysisReports.length > 0
    ? Math.round(analysisReports.reduce((sum, r) => sum + r.score, 0) / analysisReports.length)
    : null;

  return (
    <div className="min-w-[280px] flex-1">
      <Link href={`/property/${property.id}`}>
        <Card hover className="h-full">
          <CardHeader>
            <h3 className="text-lg font-bold text-neutral-900 line-clamp-2 hover:text-primary-600">
              {property.name}
            </h3>
            <p className="text-xs text-neutral-500 line-clamp-1">{property.address}</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <span className="text-xs text-neutral-500">가격</span>
                <p className={`text-base font-bold ${isHighlightPrice ? 'text-green-600' : 'text-neutral-900'}`}>
                  {formatPrice(property.asking_price)}
                </p>
              </div>
              <div>
                <span className="text-xs text-neutral-500">면적 (전용)</span>
                <p className={`text-sm font-medium ${isHighlightArea ? 'text-blue-600' : 'text-neutral-900'}`}>
                  {formatArea(property.area_sqm)}
                </p>
              </div>
              <div>
                <span className="text-xs text-neutral-500">유형</span>
                <p className="text-sm text-neutral-900">
                  {PROPERTY_TYPE_LABELS[property.property_type]}
                </p>
              </div>
              {property.floor && (
                <div>
                  <span className="text-xs text-neutral-500">층수</span>
                  <p className="text-sm text-neutral-900">
                    {property.floor}층 / {property.total_floors || '?'}층
                  </p>
                </div>
              )}
              {property.rooms && (
                <div>
                  <span className="text-xs text-neutral-500">방/화장실</span>
                  <p className="text-sm text-neutral-900">
                    {property.rooms}개 / {property.bathrooms || 0}개
                  </p>
                </div>
              )}
              {property.built_year && (
                <div>
                  <span className="text-xs text-neutral-500">건축년도</span>
                  <p className="text-sm text-neutral-900">
                    {property.built_year}년 (축 {new Date().getFullYear() - property.built_year}년)
                  </p>
                </div>
              )}
              {property.maintenance_fee && (
                <div>
                  <span className="text-xs text-neutral-500">관리비</span>
                  <p className="text-sm text-neutral-900">
                    {property.maintenance_fee.toLocaleString()}원
                  </p>
                </div>
              )}
              <div>
                <span className="text-xs text-neutral-500">상태</span>
                <div className="mt-1">
                  <Badge variant={PROPERTY_STATUS_COLORS[property.status] as any}>
                    {PROPERTY_STATUS_LABELS[property.status]}
                  </Badge>
                </div>
              </div>
              {avgScore !== null && (
                <div>
                  <span className="text-xs text-neutral-500">분석 점수</span>
                  <p className="text-lg font-bold text-primary-600">
                    {avgScore}점
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}

export default function ComparePage() {
  const { data: properties = [], isLoading } = useCompareProperties();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleSelection = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else {
      if (selectedIds.length >= 3) {
        alert('최대 3개까지만 비교할 수 있습니다.');
        return;
      }
      setSelectedIds([...selectedIds, id]);
    }
  };

  const selectedProperties = properties.filter((p) => selectedIds.includes(p.id));

  // 하이라이트 계산
  const minPrice = selectedProperties.length > 0
    ? Math.min(...selectedProperties.map((p) => p.asking_price))
    : null;
  const maxArea = selectedProperties.length > 0
    ? Math.max(...selectedProperties.map((p) => p.area_sqm))
    : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-8">
        <Card className="max-w-md w-full">
          <CardContent className="text-center py-12">
            <h1 className="text-2xl font-bold text-neutral-900 mb-2">비교할 매물이 없습니다</h1>
            <p className="text-neutral-500 mb-6">
              검색에서 매물을 관심 또는 후보로 등록하세요.
            </p>
            <Link href="/search">
              <Button>
                매물 검색하기
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-2">매물 비교</h1>
          <p className="text-sm text-neutral-500">
            최대 3개의 매물을 선택하여 비교하세요
          </p>
        </div>

        {/* 선택 가능한 매물 목록 */}
        <Card className="mb-6">
          <CardHeader>
            <h2 className="text-lg font-bold text-neutral-900">비교 대상 선택</h2>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {properties.map((property) => (
                <label
                  key={property.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedIds.includes(property.id)
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(property.id)}
                    onChange={() => toggleSelection(property.id)}
                    className="mt-1 h-4 w-4 text-primary-600 rounded border-neutral-300 focus:ring-primary-500"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-neutral-900 line-clamp-2">
                      {property.name}
                    </h3>
                    <p className="text-xs text-neutral-500 line-clamp-1 mt-1">
                      {property.address}
                    </p>
                    <p className="text-sm font-bold text-primary-600 mt-1">
                      {formatPrice(property.asking_price)}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 비교 결과 */}
        {selectedProperties.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-neutral-900 mb-4">
              비교 결과 ({selectedProperties.length}개 선택)
            </h2>
            <div className="overflow-x-auto pb-4">
              <div className="flex gap-4 min-w-max">
                {selectedProperties.map((property) => (
                  <PropertyCompareColumn
                    key={property.id}
                    property={property}
                    isHighlightPrice={minPrice !== null && property.asking_price === minPrice}
                    isHighlightArea={maxArea !== null && property.area_sqm === maxArea}
                  />
                ))}
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3 text-xs text-neutral-500">
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded bg-green-100 border border-green-300" />
                <span>최저가</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded bg-blue-100 border border-blue-300" />
                <span>최대 면적</span>
              </div>
            </div>
          </div>
        )}

        {selectedProperties.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-neutral-500">
                위에서 매물을 선택하여 비교를 시작하세요
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
