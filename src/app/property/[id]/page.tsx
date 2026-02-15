'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useProperty } from '@/hooks/useProperty';
import { usePropertyNews } from '@/hooks/usePropertyNews';
import { usePropertyReviews } from '@/hooks/usePropertyReviews';
import { useUpdateProperty } from '@/hooks/useUpdateProperty';
import { useAnalysis } from '@/hooks/useAnalysis';
import { useAnalysisRequest } from '@/hooks/useAnalysisRequest';
import { formatPriceEok, formatArea } from '@/lib/utils/format';
import { PROPERTY_TYPE_LABELS, PROPERTY_STATUS_LABELS, PROPERTY_STATUS_COLORS, type PropertyStatus } from '@/types/property';
import { EXPERT_TYPES, CONTENT_TYPES, ANALYSIS_TYPE_LABELS } from '@/types/analysis';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { AnalysisRadar } from '@/components/analysis/AnalysisRadar';
import { AnalysisSection } from '@/components/analysis/AnalysisSection';
import { ScoreBadge } from '@/components/analysis/ScoreBadge';
import { KakaoMap } from '@/components/map/KakaoMap';
import { ExternalLink, Loader2, RefreshCw, Sparkles, CheckCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

export default function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: property, isLoading: propertyLoading, error: propertyError } = useProperty(id);
  const { data: news = [], isLoading: newsLoading } = usePropertyNews(id);
  const { data: reviews = [], isLoading: reviewsLoading } = usePropertyReviews(id);
  const { data: analysisReports = [] } = useAnalysis(id);
  const updateProperty = useUpdateProperty();
  const analysisRequest = useAnalysisRequest();
  const queryClient = useQueryClient();
  const supabase = createClient();

  const [memo, setMemo] = useState('');
  const [visitMemo, setVisitMemo] = useState('');
  const [memoTab, setMemoTab] = useState<'memo' | 'visit'>('memo');
  const [memoSaved, setMemoSaved] = useState(false);
  const [isAnalysisProcessing, setIsAnalysisProcessing] = useState(false);

  // 뉴스 수집 mutation
  const crawlNewsMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('crawl-news', {
        body: { property_id: id },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property-news', id] });
    },
    onError: () => {
      alert('뉴스 수집에 실패했습니다.');
    },
  });

  // 후기 수집 mutation
  const crawlReviewsMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('crawl-reviews', {
        body: { property_id: id },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property-reviews', id] });
    },
    onError: () => {
      alert('후기 수집에 실패했습니다.');
    },
  });

  // 상태가 로드되면 메모 초기화
  if (property && memo === '' && property.memo) {
    setMemo(property.memo);
  }
  if (property && visitMemo === '' && property.visit_memo) {
    setVisitMemo(property.visit_memo);
  }

  const handleStatusChange = async (status: PropertyStatus) => {
    if (!property) return;
    try {
      await updateProperty.mutateAsync({ id: property.id, status });
    } catch (error) {
      console.error('상태 업데이트 실패:', error);
      alert('상태 변경에 실패했습니다.');
    }
  };

  const handleMemoSave = async () => {
    if (!property) return;
    try {
      if (memoTab === 'memo') {
        await updateProperty.mutateAsync({ id: property.id, memo });
      } else {
        await updateProperty.mutateAsync({ id: property.id, visit_memo: visitMemo });
      }
      setMemoSaved(true);
      setTimeout(() => setMemoSaved(false), 2000);
    } catch (error) {
      console.error('메모 저장 실패:', error);
      alert('메모 저장에 실패했습니다.');
    }
  };

  const handleAnalysisRequest = async () => {
    if (!property) return;
    setIsAnalysisProcessing(true);
    try {
      await analysisRequest.mutateAsync(property.id);
    } catch (error) {
      console.error('분석 요청 실패:', error);
      alert('분석 요청에 실패했습니다.');
      setIsAnalysisProcessing(false);
    }
  };

  // Realtime 구독으로 분석 진행 상황 감지
  useEffect(() => {
    if (!property) return;

    const channel = supabase
      .channel(`analysis:${property.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'analysis_reports',
          filter: `property_id=eq.${property.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['analysis', property.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [property, supabase, queryClient]);

  // 분석이 완료되면 processing 상태 해제
  useEffect(() => {
    if (analysisReports.length === 7) {
      setIsAnalysisProcessing(false);
    }
  }, [analysisReports]);

  const getNaverLink = () => {
    if (!property) return '#';
    if (property.naver_link) return property.naver_link;
    return `https://m.land.naver.com/search/result/${encodeURIComponent(property.name)}`;
  };

  const avgScore = analysisReports.length > 0
    ? Math.round(analysisReports.reduce((sum, r) => sum + r.score, 0) / analysisReports.length)
    : null;

  if (propertyLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (propertyError || !property) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <h1 className="text-2xl font-bold text-neutral-900 mb-2">매물을 찾을 수 없습니다</h1>
        <p className="text-neutral-500 mb-4">요청하신 매물이 존재하지 않거나 삭제되었습니다.</p>
        <Link href="/search">
          <Button>검색으로 돌아가기</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
        {/* 뒤로가기 */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          뒤로가기
        </button>

        {/* 상단 헤더 */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h1 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-2">
                  {property.name}
                </h1>
                <p className="text-sm text-neutral-500 mb-1">{property.address}</p>
                {property.address_detail && (
                  <p className="text-sm text-neutral-400">{property.address_detail}</p>
                )}
              </div>
              <a
                href={getNaverLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-4"
              >
                <Button variant="outline" size="sm">
                  <ExternalLink className="h-4 w-4 mr-1" />
                  네이버
                </Button>
              </a>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl font-extrabold text-primary-600">
                {formatPriceEok(property.asking_price)}
              </span>
              {property.monthly_rent && property.monthly_rent > 0 && (
                <span className="text-lg text-neutral-600">
                  / 월 {property.monthly_rent.toLocaleString()}만원
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 상태 관리 섹션 */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-bold text-neutral-900">상태 관리</h2>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-sm text-neutral-600">현재 상태:</span>
              <Badge variant={PROPERTY_STATUS_COLORS[property.status] as any}>
                {PROPERTY_STATUS_LABELS[property.status]}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(PROPERTY_STATUS_LABELS).map(([key, label]) => (
                <Button
                  key={key}
                  variant={property.status === key ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => handleStatusChange(key as PropertyStatus)}
                  disabled={updateProperty.isPending}
                >
                  {label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 메모 섹션 (탭 UI) */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setMemoTab('memo')}
                className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors ${
                  memoTab === 'memo'
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-neutral-500 hover:text-neutral-700'
                }`}
              >
                메모
              </button>
              <button
                onClick={() => setMemoTab('visit')}
                className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors ${
                  memoTab === 'visit'
                    ? 'bg-amber-50 text-amber-700'
                    : 'text-neutral-500 hover:text-neutral-700'
                }`}
              >
                방문 메모
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {memoTab === 'memo' ? (
              <textarea
                className="w-full min-h-[120px] p-3 border border-neutral-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="이 매물에 대한 메모를 작성하세요..."
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
              />
            ) : (
              <textarea
                className="w-full min-h-[120px] p-3 border border-amber-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="방문 후 느낀 점, 체크리스트 등을 기록하세요..."
                value={visitMemo}
                onChange={(e) => setVisitMemo(e.target.value)}
              />
            )}
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-neutral-400">
                {memoSaved && '저장되었습니다'}
              </span>
              <Button
                onClick={handleMemoSave}
                disabled={updateProperty.isPending}
                size="sm"
              >
                {updateProperty.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : '저장'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 매물 정보 카드 */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-bold text-neutral-900">매물 정보</h2>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-neutral-500">유형</span>
                <p className="text-base font-medium text-neutral-900">
                  {PROPERTY_TYPE_LABELS[property.property_type]}
                </p>
              </div>
              <div>
                <span className="text-sm text-neutral-500">면적 (전용)</span>
                <p className="text-base font-medium text-neutral-900">
                  {formatArea(property.area_sqm)}
                </p>
              </div>
              {property.supply_area_sqm && (
                <div>
                  <span className="text-sm text-neutral-500">면적 (공급)</span>
                  <p className="text-base font-medium text-neutral-900">
                    {formatArea(property.supply_area_sqm)}
                  </p>
                </div>
              )}
              {property.floor && (
                <div>
                  <span className="text-sm text-neutral-500">층수</span>
                  <p className="text-base font-medium text-neutral-900">
                    {property.floor}층{property.total_floors ? ` / ${property.total_floors}층` : ''}
                  </p>
                </div>
              )}
              {property.rooms && (
                <div>
                  <span className="text-sm text-neutral-500">방/화장실</span>
                  <p className="text-base font-medium text-neutral-900">
                    {property.rooms}개 / {property.bathrooms || 0}개
                  </p>
                </div>
              )}
              {property.direction && (
                <div>
                  <span className="text-sm text-neutral-500">향</span>
                  <p className="text-base font-medium text-neutral-900">
                    {property.direction}
                  </p>
                </div>
              )}
              {property.built_year && (
                <div>
                  <span className="text-sm text-neutral-500">건축년도</span>
                  <p className="text-base font-medium text-neutral-900">
                    {property.built_year}년 (건축 {new Date().getFullYear() - property.built_year}년차)
                  </p>
                </div>
              )}
              {property.maintenance_fee && (
                <div>
                  <span className="text-sm text-neutral-500">관리비</span>
                  <p className="text-base font-medium text-neutral-900">
                    {property.maintenance_fee.toLocaleString()}원
                  </p>
                </div>
              )}
            </div>
            {property.description && (
              <div className="mt-4 pt-4 border-t border-neutral-200">
                <span className="text-sm text-neutral-500">상세 설명</span>
                <p className="text-base text-neutral-700 mt-1 whitespace-pre-line">
                  {property.description}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 지도 */}
        {property.lat && property.lng && (
          <Card>
            <CardHeader>
              <h2 className="text-lg font-bold text-neutral-900">위치</h2>
            </CardHeader>
            <CardContent>
              <KakaoMap
                lat={property.lat}
                lng={property.lng}
                name={property.name}
                className="h-[300px] w-full"
              />
            </CardContent>
          </Card>
        )}

        {/* AI 종합 리포트 섹션 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary-600" />
                <h2 className="text-lg font-bold text-neutral-900">AI 종합 리포트</h2>
              </div>
              {analysisReports.length === 7 && (
                <div className="text-xs text-neutral-500">
                  {new Date(analysisReports[0]?.created_at || '').toLocaleDateString('ko-KR')} 분석
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {/* 리포트 미생성 상태 */}
            {analysisReports.length === 0 && !isAnalysisProcessing && (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-100 mb-4">
                  <Sparkles className="h-8 w-8 text-primary-600" />
                </div>
                <h3 className="text-lg font-bold text-neutral-900 mb-2">
                  아직 리포트가 없어요
                </h3>
                <p className="text-sm text-neutral-600 mb-6 max-w-sm mx-auto">
                  시세, 입지, 투자 가치는 물론<br />
                  뉴스와 후기까지 종합 분석해 드릴게요
                </p>
                <Button
                  onClick={handleAnalysisRequest}
                  disabled={analysisRequest.isPending}
                  size="lg"
                >
                  {analysisRequest.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      요청 중...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      리포트 만들기
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* 생성 중 상태 */}
            {(isAnalysisProcessing || (analysisReports.length > 0 && analysisReports.length < 7)) && (
              <div className="py-8">
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-neutral-900">
                      분석 진행 중
                    </span>
                    <span className="text-sm font-bold text-primary-600">
                      {analysisReports.length} / 7
                    </span>
                  </div>
                  <div className="w-full bg-neutral-200 rounded-full h-2">
                    <div
                      className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(analysisReports.length / 7) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  {[...CONTENT_TYPES, ...EXPERT_TYPES].map((type) => {
                    const completed = analysisReports.some(r => r.analysis_type === type);
                    return (
                      <div
                        key={type}
                        className={`flex items-center gap-2 p-2 rounded-lg ${
                          completed ? 'bg-green-50' : 'bg-neutral-50'
                        }`}
                      >
                        {completed ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <div className="h-4 w-4 rounded-full border-2 border-neutral-300 animate-pulse" />
                        )}
                        <span className={`text-sm ${completed ? 'text-neutral-900 font-medium' : 'text-neutral-500'}`}>
                          {ANALYSIS_TYPE_LABELS[type]} 분석 {completed ? '완료' : '대기 중...'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 완료 상태 */}
            {analysisReports.length === 7 && (
              <div className="space-y-6">
                {/* 레이더 차트 */}
                <div className="pb-6 border-b border-neutral-200">
                  <AnalysisRadar reports={analysisReports} />
                </div>

                {/* 뉴스 & 후기 종합 섹션 (먼저 표시) */}
                <div>
                  <h3 className="text-base font-bold text-neutral-700 mb-4 flex items-center gap-2">
                    <span className="inline-block w-1 h-4 bg-amber-600 rounded-full" />
                    뉴스와 후기는 이렇게 말하고 있어요
                  </h3>
                  <div className="space-y-4">
                    {CONTENT_TYPES.map((type) => {
                      const report = analysisReports.find(r => r.analysis_type === type);
                      return report ? <AnalysisSection key={type} report={report} /> : null;
                    })}
                  </div>
                </div>

                {/* 전문가 분석 섹션 */}
                <div>
                  <h3 className="text-base font-bold text-neutral-700 mb-4 flex items-center gap-2">
                    <span className="inline-block w-1 h-4 bg-primary-600 rounded-full" />
                    전문가는 이렇게 해석해요
                  </h3>
                  <div className="space-y-4">
                    {EXPERT_TYPES.map((type) => {
                      const report = analysisReports.find(r => r.analysis_type === type);
                      return report ? <AnalysisSection key={type} report={report} /> : null;
                    })}
                  </div>
                </div>

                {/* 재분석 버튼 */}
                <div className="pt-4 border-t border-neutral-200">
                  <Button
                    variant="outline"
                    onClick={handleAnalysisRequest}
                    disabled={analysisRequest.isPending}
                    className="w-full"
                  >
                    {analysisRequest.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        재분석 중...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        더 많은 자료로 다시 분석하기
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
