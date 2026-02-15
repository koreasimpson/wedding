'use client';

import {
  RadarChart, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip,
} from 'recharts';
import type { AnalysisReport } from '@/types/analysis';
import { ANALYSIS_TYPE_LABELS, ALL_ANALYSIS_TYPES, type AnalysisType } from '@/types/analysis';
import { getGrade } from '@/lib/utils/score';

interface AnalysisRadarProps {
  reports: AnalysisReport[];
}

export function AnalysisRadar({ reports }: AnalysisRadarProps) {
  // 7축 순서를 정의 (시계방향)
  const orderedTypes: AnalysisType[] = [
    'market',
    'location',
    'investment',
    'regulation',
    'risk',
    'news_summary',
    'review_summary',
  ];

  // 각 분석 타입별 점수 매핑
  const scoreMap = reports.reduce((acc, report) => {
    acc[report.analysis_type] = report.score;
    return acc;
  }, {} as Record<AnalysisType, number>);

  // 7축 데이터 생성 (없는 항목은 0점)
  const data = orderedTypes.map((type) => ({
    subject: ANALYSIS_TYPE_LABELS[type],
    score: scoreMap[type] || 0,
    fullMark: 100,
  }));

  const avgScore = reports.length > 0
    ? Math.round(reports.reduce((sum, r) => sum + r.score, 0) / reports.length)
    : 0;

  const grade = getGrade(avgScore);

  return (
    <div className="flex flex-col items-center">
      <div className="text-center mb-4">
        <div className="flex items-baseline justify-center gap-2">
          <span className="text-4xl font-extrabold text-primary-600">{avgScore}</span>
          <span className="text-2xl font-bold text-primary-500">{grade}</span>
        </div>
        <p className="text-sm text-neutral-500 mt-1">종합 점수</p>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <RadarChart data={data}>
          <PolarGrid stroke="#E5E7EB" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: '#374151', fontSize: 12, fontWeight: 500 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fill: '#9CA3AF', fontSize: 10 }}
          />
          <Radar
            name="점수"
            dataKey="score"
            stroke="#3B82F6"
            fill="#3B82F6"
            fillOpacity={0.2}
            strokeWidth={2}
          />
          <Tooltip />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
