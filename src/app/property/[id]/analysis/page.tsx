'use client';

import { use } from 'react';
import Link from 'next/link';
import { useProperty } from '@/hooks/useProperty';
import { useAnalysis } from '@/hooks/useAnalysis';
import { useAnalysisRequest } from '@/hooks/useAnalysisRequest';
import { AnalysisRadar } from '@/components/analysis/AnalysisRadar';
import { AnalysisSection } from '@/components/analysis/AnalysisSection';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { ArrowLeft } from 'lucide-react';

export default function AnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: property } = useProperty(id);
  const { data: reports = [], isLoading } = useAnalysis(id);
  const requestAnalysis = useAnalysisRequest();

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href={`/property/${id}`} className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 mb-4">
        <ArrowLeft className="h-4 w-4" /> 매물 상세로 돌아가기
      </Link>

      <h1 className="text-2xl font-bold text-neutral-900">
        {property?.name || '매물'} 종합 분석
      </h1>

      {reports.length > 0 ? (
        <div className="mt-6 space-y-6">
          <div className="rounded-xl bg-white p-6 shadow-card">
            <AnalysisRadar reports={reports} />
          </div>

          {reports.map((report) => (
            <AnalysisSection key={report.analysis_type} report={report} />
          ))}
        </div>
      ) : (
        <div className="mt-8 rounded-xl bg-white p-8 shadow-card text-center">
          <p className="text-neutral-600 mb-4">아직 분석 결과가 없습니다.</p>
          <Button
            onClick={() => requestAnalysis.mutate(id)}
            disabled={requestAnalysis.isPending}
            size="lg"
          >
            {requestAnalysis.isPending ? '분석 요청 중...' : '종합 분석 요청하기'}
          </Button>
          {requestAnalysis.isError && (
            <p className="mt-2 text-sm text-red-600">
              분석 요청에 실패했습니다. 로그인이 필요할 수 있습니다.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
