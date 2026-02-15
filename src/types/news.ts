import { Database } from './supabase';

export type PropertyNews = Database['public']['Tables']['property_news']['Row'];
export type PropertyNewsInsert = Database['public']['Tables']['property_news']['Insert'];
export type PropertyNewsUpdate = Database['public']['Tables']['property_news']['Update'];

export interface NewsSource {
  name: string;
  icon?: string;
  color?: string;
}

export const NEWS_SOURCES: Record<string, NewsSource> = {
  naver: {
    name: '네이버뉴스',
    icon: '📰',
    color: 'green',
  },
  daum: {
    name: '다음뉴스',
    icon: '📰',
    color: 'blue',
  },
  mk: {
    name: '매일경제',
    icon: '💼',
    color: 'orange',
  },
  joins: {
    name: '중앙일보',
    icon: '📰',
    color: 'purple',
  },
  default: {
    name: '기타',
    icon: '📄',
    color: 'gray',
  },
};
