'use client';

import { ScoreBadge } from './ScoreBadge';
import { ANALYSIS_TYPE_LABELS } from '@/types/analysis';
import type { AnalysisReport } from '@/types/analysis';
import { CheckCircle, AlertTriangle, Lightbulb, ChevronDown, ExternalLink } from 'lucide-react';
import { useState } from 'react';

interface AnalysisSectionProps {
  report: AnalysisReport;
}

export function AnalysisSection({ report }: AnalysisSectionProps) {
  const [showSources, setShowSources] = useState(false);

  const isNewsType = report.analysis_type === 'news_summary';
  const isReviewType = report.analysis_type === 'review_summary';

  // 뉴스 종합 타입일 때 details에서 감정별 카운트 추출
  const newsSentiment = isNewsType && report.details?.sentiment
    ? (report.details.sentiment as { positive?: number; neutral?: number; negative?: number })
    : null;

  // 후기 종합 타입일 때 details에서 키워드 추출
  const reviewKeywords = isReviewType && report.details?.keywords
    ? (report.details.keywords as string[])
    : null;

  return (
    <div className="rounded-xl bg-white p-6 shadow-card border border-neutral-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-neutral-900">
          {ANALYSIS_TYPE_LABELS[report.analysis_type]}
        </h3>
        <ScoreBadge score={report.score} label="" size="md" />
      </div>

      <p className="text-sm text-neutral-600 mb-4 leading-relaxed">{report.summary}</p>

      {/* 뉴스 종합 - 감정별 카운트 */}
      {isNewsType && newsSentiment && (
        <div className="mb-4 p-3 bg-neutral-50 rounded-lg">
          <p className="text-xs text-neutral-500 mb-2">최근 3개월 관련 뉴스 분석</p>
          <div className="flex items-center gap-3 text-sm">
            {newsSentiment.positive !== undefined && newsSentiment.positive > 0 && (
              <span className="flex items-center gap-1">
                <span className="text-green-600">✅ 긍정</span>
                <span className="font-semibold text-neutral-900">{newsSentiment.positive}건</span>
              </span>
            )}
            {newsSentiment.neutral !== undefined && newsSentiment.neutral > 0 && (
              <span className="flex items-center gap-1">
                <span className="text-amber-600">⚠️ 중립</span>
                <span className="font-semibold text-neutral-900">{newsSentiment.neutral}건</span>
              </span>
            )}
            {newsSentiment.negative !== undefined && newsSentiment.negative > 0 && (
              <span className="flex items-center gap-1">
                <span className="text-red-600">❌ 부정</span>
                <span className="font-semibold text-neutral-900">{newsSentiment.negative}건</span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* 후기 종합 - 키워드 칩 */}
      {isReviewType && reviewKeywords && reviewKeywords.length > 0 && (
        <div className="mb-4 p-3 bg-neutral-50 rounded-lg">
          <p className="text-xs text-neutral-500 mb-2">🔑 자주 언급된 키워드</p>
          <div className="flex flex-wrap gap-2">
            {reviewKeywords.slice(0, 8).map((keyword, i) => (
              <span
                key={i}
                className="inline-flex px-2.5 py-1 text-xs font-medium bg-primary-100 text-primary-700 rounded-full"
              >
                {keyword}
              </span>
            ))}
          </div>
        </div>
      )}

      {report.strengths.length > 0 && (
        <div className="mb-3">
          <h4 className="flex items-center gap-1.5 text-sm font-semibold text-green-700 mb-1.5">
            <CheckCircle className="h-4 w-4" /> {isNewsType || isReviewType ? '장점' : '강점'}
          </h4>
          <ul className="space-y-1">
            {report.strengths.map((s, i) => (
              <li key={i} className="text-sm text-neutral-600 pl-6">• {s}</li>
            ))}
          </ul>
        </div>
      )}

      {report.weaknesses.length > 0 && (
        <div className="mb-3">
          <h4 className="flex items-center gap-1.5 text-sm font-semibold text-red-700 mb-1.5">
            <AlertTriangle className="h-4 w-4" /> {isNewsType || isReviewType ? '단점' : '약점'}
          </h4>
          <ul className="space-y-1">
            {report.weaknesses.map((w, i) => (
              <li key={i} className="text-sm text-neutral-600 pl-6">• {w}</li>
            ))}
          </ul>
        </div>
      )}

      {report.recommendations.length > 0 && (
        <div className="mb-3">
          <h4 className="flex items-center gap-1.5 text-sm font-semibold text-amber-700 mb-1.5">
            <Lightbulb className="h-4 w-4" /> 권고사항
          </h4>
          <ul className="space-y-1">
            {report.recommendations.map((r, i) => (
              <li key={i} className="text-sm text-neutral-600 pl-6">• {r}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 참고 자료 접이식 */}
      {report.data_sources.length > 0 && (
        <div className="mt-4 border-t border-neutral-200 pt-3">
          <button
            onClick={() => setShowSources(!showSources)}
            className="flex items-center gap-1.5 text-sm text-neutral-600 hover:text-primary-600 transition-colors"
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${showSources ? 'rotate-180' : ''}`} />
            <span>참고 {isNewsType ? '기사' : isReviewType ? '후기' : '자료'} {report.data_sources.length}건</span>
          </button>

          {showSources && (
            <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
              {report.data_sources.map((source, i) => (
                <a
                  key={i}
                  href={source}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-2 p-2 rounded-lg hover:bg-neutral-50 text-xs text-neutral-600 hover:text-primary-600 transition-colors group"
                >
                  <ExternalLink className="h-3 w-3 mt-0.5 flex-shrink-0 opacity-50 group-hover:opacity-100" />
                  <span className="break-all line-clamp-2">{source}</span>
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-4 flex items-center gap-2 text-xs text-neutral-400">
        <span>신뢰도: {report.confidence}%</span>
        <span>·</span>
        <span>{new Date(report.created_at).toLocaleDateString('ko-KR')}</span>
      </div>
    </div>
  );
}
