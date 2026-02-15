'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Heart, Calendar, CheckCircle, Star, Plus, Search, Settings, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AddPropertyModal } from '@/components/property/AddPropertyModal';
import { usePreferences } from '@/hooks/usePreferences';
import { formatPriceEok, formatArea } from '@/lib/utils/format';
import { createClient } from '@/lib/supabase/client';
import type { Property } from '@/types/property';

type StatusCount = {
  status: string;
  count: number;
};

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const { data: preferences, isLoading: preferencesLoading } = usePreferences();
  const [showAddModal, setShowAddModal] = useState(false);

  // 상태별 매물 수 조회
  const { data: statusCounts = [], isLoading: countsLoading } = useQuery<StatusCount[]>({
    queryKey: ['property-status-counts'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_property_status_counts');
      if (error) throw error;
      return (data || []) as StatusCount[];
    },
    staleTime: 30_000,
  });

  // 분석이 필요한 매물 조회 (관심/방문예정 상태이지만 AI 분석 안 한 매물)
  const { data: unanalyzedProperties = [], isLoading: unanalyzedLoading } = useQuery<Property[]>({
    queryKey: ['unanalyzed-properties'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_unanalyzed_properties', { p_limit: 3 });
      if (error) throw error;
      return (data || []) as Property[];
    },
    staleTime: 30_000,
  });

  // 상태별 카운트 헬퍼
  const getCount = (status: string) => {
    const found = statusCounts.find((c) => c.status === status);
    return found?.count || 0;
  };

  // 내 조건 한 줄 요약 생성
  const getPreferencesSummary = () => {
    if (!preferences) return null;

    const parts: string[] = [];

    // 예산
    if (preferences.budget_min || preferences.budget_max) {
      const min = preferences.budget_min ? formatPriceEok(preferences.budget_min) : '0';
      const max = preferences.budget_max ? formatPriceEok(preferences.budget_max) : '제한없음';
      parts.push(`${min}~${max}`);
    }

    // 면적
    if (preferences.area_min || preferences.area_max) {
      const minPyeong = preferences.area_min ? Math.round(preferences.area_min / 3.3058) : 0;
      const maxPyeong = preferences.area_max ? Math.round(preferences.area_max / 3.3058) : null;
      if (maxPyeong) {
        parts.push(`${minPyeong}~${maxPyeong}평`);
      } else {
        parts.push(`${minPyeong}평 이상`);
      }
    }

    // 지역
    if (preferences.preferred_regions && preferences.preferred_regions.length > 0) {
      const regions = preferences.preferred_regions
        .map((r) => r.replace('서울특별시 ', '서울 ').replace('경기도 ', '경기 '))
        .slice(0, 2)
        .join('/');
      const extra = preferences.preferred_regions.length > 2 ? ` 외 ${preferences.preferred_regions.length - 2}곳` : '';
      parts.push(regions + extra);
    }

    return parts.length > 0 ? parts.join(' · ') : null;
  };

  const summary = getPreferencesSummary();

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-7xl p-6 md:p-8">
        {/* 인사말 */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-neutral-900">안녕하세요</h1>
          <p className="mt-1.5 text-neutral-500">오늘도 좋은 집을 찾아볼까요?</p>
        </div>

        <div className="space-y-8">
          {/* 섹션 1: 내 조건 (간소화, 한 줄 요약) */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-neutral-900">내 조건</h2>
              <Link href="/settings">
                <Button variant="ghost" size="sm">
                  수정
                </Button>
              </Link>
            </div>

            {preferencesLoading ? (
              <Card>
                <CardContent>
                  <p className="py-4 text-center text-sm text-neutral-500">조건을 불러오고 있어요...</p>
                </CardContent>
              </Card>
            ) : !summary ? (
              <Card>
                <CardContent>
                  <div className="py-6 text-center">
                    <p className="text-neutral-600">어떤 집을 찾고 계세요?</p>
                    <Link href="/settings" className="mt-3 inline-block">
                      <Button>조건 설정하기</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent>
                  <p className="py-3 text-center text-neutral-900">{summary}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* 섹션 2: 진행 상황 */}
          <div>
            <h2 className="mb-3 text-lg font-semibold text-neutral-900">진행 상황</h2>

            {countsLoading ? (
              <Card>
                <CardContent>
                  <p className="py-4 text-center text-sm text-neutral-500">불러오는 중...</p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {/* 관심 */}
                  <Card
                    hover
                    onClick={() => router.push('/favorites?status=interested')}
                    className="cursor-pointer"
                  >
                    <CardContent>
                      <div className="py-4 text-center">
                        <Heart className="mx-auto mb-2 h-6 w-6 text-primary-500" />
                        <p className="text-2xl font-bold text-neutral-900">{getCount('interested')}</p>
                        <p className="mt-1 text-xs text-neutral-500">관심</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 방문 예정 */}
                  <Card
                    hover
                    onClick={() => router.push('/favorites?status=visit_planned')}
                    className="cursor-pointer"
                  >
                    <CardContent>
                      <div className="py-4 text-center">
                        <Calendar className="mx-auto mb-2 h-6 w-6 text-amber-500" />
                        <p className="text-2xl font-bold text-neutral-900">{getCount('visit_planned')}</p>
                        <p className="mt-1 text-xs text-neutral-500">방문 예정</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 방문 완료 */}
                  <Card
                    hover
                    onClick={() => router.push('/favorites?status=visited')}
                    className="cursor-pointer"
                  >
                    <CardContent>
                      <div className="py-4 text-center">
                        <CheckCircle className="mx-auto mb-2 h-6 w-6 text-green-500" />
                        <p className="text-2xl font-bold text-neutral-900">{getCount('visited')}</p>
                        <p className="mt-1 text-xs text-neutral-500">방문 완료</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 후보 */}
                  <Card hover onClick={() => router.push('/favorites?status=candidate')} className="cursor-pointer">
                    <CardContent>
                      <div className="py-4 text-center">
                        <Star className="mx-auto mb-2 h-6 w-6 text-primary-500" />
                        <p className="text-2xl font-bold text-neutral-900">{getCount('candidate')}</p>
                        <p className="mt-1 text-xs text-neutral-500">후보</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="mt-4 text-center">
                  <Link href="/favorites">
                    <Button variant="ghost" size="sm">
                      관심 매물 보기 →
                    </Button>
                  </Link>
                </div>
              </>
            )}
          </div>

          {/* 섹션 3: 분석이 필요한 매물 */}
          {!unanalyzedLoading && unanalyzedProperties.length > 0 && (
            <div>
              <h2 className="mb-3 text-lg font-semibold text-neutral-900">분석이 필요한 매물</h2>

              <div className="space-y-3">
                {unanalyzedProperties.map((property) => (
                  <Card key={property.id} hover>
                    <CardContent>
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate font-medium text-neutral-900">{property.name}</h3>
                          <p className="mt-0.5 truncate text-sm text-neutral-500">{property.address}</p>
                          <div className="mt-1 flex items-center gap-2 text-xs text-neutral-400">
                            <span>{formatPriceEok(property.asking_price)}</span>
                            <span>·</span>
                            <span>{formatArea(property.area_sqm)}</span>
                          </div>
                        </div>
                        <Link href={`/property/${property.id}`}>
                          <Button variant="outline" size="sm">
                            <FileText className="mr-1.5 h-4 w-4" />
                            리포트 만들기
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* 섹션 4: 빠른 액션 */}
          <div>
            <h2 className="mb-3 text-lg font-semibold text-neutral-900">빠른 액션</h2>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {/* 매물 추가 */}
              <Card hover onClick={() => setShowAddModal(true)} className="cursor-pointer">
                <CardContent>
                  <div className="flex items-center gap-3 py-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50">
                      <Plus className="h-5 w-5 text-primary-600" />
                    </div>
                    <div>
                      <p className="font-medium text-neutral-900">매물 추가</p>
                      <p className="text-xs text-neutral-500">관심 매물을 직접 추가해요</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 새 매물 찾기 */}
              <Card hover onClick={() => router.push('/search')} className="cursor-pointer">
                <CardContent>
                  <div className="flex items-center gap-3 py-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50">
                      <Search className="h-5 w-5 text-primary-600" />
                    </div>
                    <div>
                      <p className="font-medium text-neutral-900">새 매물 찾기</p>
                      <p className="text-xs text-neutral-500">지도에서 매물을 검색해요</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 조건 수정 */}
              <Card hover onClick={() => router.push('/settings')} className="cursor-pointer">
                <CardContent>
                  <div className="flex items-center gap-3 py-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50">
                      <Settings className="h-5 w-5 text-primary-600" />
                    </div>
                    <div>
                      <p className="font-medium text-neutral-900">조건 수정</p>
                      <p className="text-xs text-neutral-500">찾는 집 조건을 바꿔요</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* 매물 추가 모달 */}
      <AddPropertyModal open={showAddModal} onClose={() => setShowAddModal(false)} />
    </div>
  );
}
