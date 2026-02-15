export type AnalysisType = 'market' | 'location' | 'investment' | 'regulation' | 'risk' | 'news_summary' | 'review_summary';

/** 기존 5개 전문가 분석 타입 */
export type ExpertAnalysisType = 'market' | 'location' | 'investment' | 'regulation' | 'risk';

/** 신규 2개 종합 분석 타입 */
export type ContentAnalysisType = 'news_summary' | 'review_summary';

export const EXPERT_TYPES: ExpertAnalysisType[] = ['market', 'location', 'investment', 'regulation', 'risk'];
export const CONTENT_TYPES: ContentAnalysisType[] = ['news_summary', 'review_summary'];
export const ALL_ANALYSIS_TYPES: AnalysisType[] = [...EXPERT_TYPES, ...CONTENT_TYPES];

export interface AnalysisReport {
  id: string;
  request_id: string;
  property_id: string;
  analysis_type: AnalysisType;
  score: number;
  grade: string;
  summary: string;
  details: Record<string, unknown>;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  data_sources: string[];
  confidence: number;
  created_at: string;
}

export interface AnalysisRequest {
  id: string;
  property_id: string;
  user_id: string;
  analysis_types: AnalysisType[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  completed_count: number;
  total_count: number;
  created_at: string;
  completed_at: string | null;
  error_message: string | null;
}

export const ANALYSIS_TYPE_LABELS: Record<AnalysisType, string> = {
  market: '시세',
  location: '입지',
  investment: '투자',
  regulation: '규제',
  risk: '리스크',
  news_summary: '뉴스 종합',
  review_summary: '임장 후기',
};
