'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Heart, Calendar, CheckCircle, Star, Building2, Ruler, Layers, MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { usePreferences } from '@/hooks/usePreferences';
import { formatPriceEok } from '@/lib/utils/format';
import { createClient } from '@/lib/supabase/client';

type StatusCount = {
  status: string;
  count: number;
};

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const { data: preferences, isLoading: preferencesLoading } = usePreferences();

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

  // 상태별 카운트 헬퍼
  const getCount = (status: string) => {
    const found = statusCounts.find((c) => c.status === status);
    return found?.count || 0;
  };

  // 조건 항목 존재 여부
  const hasBudget = preferences && (preferences.budget_min || preferences.budget_max);
  const hasArea = preferences && (preferences.area_min || preferences.area_max);
  const hasFloor = preferences && (preferences.min_floor != null || preferences.max_floor != null);
  const hasBuiltYear = preferences && preferences.min_built_year;
  const hasRegions = preferences && preferences.preferred_regions && preferences.preferred_regions.length > 0;
  const hasAnyPreference = hasBudget || hasArea || hasFloor || hasBuiltYear || hasRegions;

  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-7xl p-6 md:p-8">
        {/* 인사말 */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-neutral-900">안녕하세요</h1>
          <p className="mt-1.5 text-neutral-500">오늘도 좋은 집을 찾아볼까요?</p>
        </div>

        <div className="space-y-8">
          {/* 섹션 1: 내 조건 (항목별 카드 레이아웃) */}
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
            ) : !hasAnyPreference ? (
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
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {hasBudget && (
                  <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50">
                      <Building2 className="h-4 w-4 text-primary-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-neutral-500">예산</p>
                      <p className="truncate text-sm font-semibold text-neutral-900">
                        {preferences!.budget_min ? formatPriceEok(preferences!.budget_min) : ''}
                        ~
                        {preferences!.budget_max ? formatPriceEok(preferences!.budget_max) : '제한없음'}
                      </p>
                    </div>
                  </div>
                )}

                {hasArea && (
                  <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                      <Ruler className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-neutral-500">면적</p>
                      <p className="truncate text-sm font-semibold text-neutral-900">
                        {preferences!.area_min ? `${Math.round(preferences!.area_min / 3.3058)}` : ''}
                        ~
                        {preferences!.area_max ? `${Math.round(preferences!.area_max / 3.3058)}평` : '제한없음'}
                      </p>
                    </div>
                  </div>
                )}

                {hasFloor && (
                  <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50">
                      <Layers className="h-4 w-4 text-amber-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-neutral-500">층수</p>
                      <p className="truncate text-sm font-semibold text-neutral-900">
                        {preferences!.min_floor ?? '1'}~{preferences!.max_floor ? `${preferences!.max_floor}층` : '최상층'}
                      </p>
                    </div>
                  </div>
                )}

                {hasBuiltYear && (
                  <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-50">
                      <Calendar className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-neutral-500">건물 연식</p>
                      <p className="truncate text-sm font-semibold text-neutral-900">
                        {currentYear - preferences!.min_built_year!}년 이내
                      </p>
                    </div>
                  </div>
                )}

                {hasRegions && (
                  <div className="col-span-2 flex items-start gap-3 rounded-xl border border-neutral-200 bg-white p-3.5 md:col-span-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-50">
                      <MapPin className="h-4 w-4 text-rose-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="mb-1.5 text-xs text-neutral-500">관심 지역</p>
                      <div className="flex flex-wrap gap-1.5">
                        {preferences!.preferred_regions!.map((region) => (
                          <span
                            key={region}
                            className="inline-block rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700"
                          >
                            {region.replace('서울특별시 ', '서울 ').replace('경기도 ', '경기 ')}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
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
        </div>
      </div>
    </div>
  );
}
