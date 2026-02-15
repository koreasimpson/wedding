export type Database = {
  public: {
    Tables: {
      properties: {
        Row: {
          id: string;
          name: string;
          address: string;
          address_detail: string | null;
          property_type: 'apt' | 'villa' | 'officetel' | 'house';
          asking_price: number;
          deposit: number | null;
          monthly_rent: number | null;
          maintenance_fee: number | null;
          area_sqm: number;
          supply_area_sqm: number | null;
          floor: number | null;
          total_floors: number | null;
          rooms: number | null;
          bathrooms: number | null;
          direction: string | null;
          built_year: number | null;
          lat: number;
          lng: number;
          images: string[];
          description: string | null;
          source: string | null;
          external_id: string | null;
          is_active: boolean;
          status: 'none' | 'interested' | 'visit_planned' | 'visited' | 'candidate' | 'rejected';
          memo: string | null;
          naver_link: string | null;
          visit_date: string | null;
          visit_memo: string | null;
          rejection_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          address: string;
          address_detail?: string | null;
          property_type: 'apt' | 'villa' | 'officetel' | 'house';
          asking_price: number;
          deposit?: number | null;
          monthly_rent?: number | null;
          maintenance_fee?: number | null;
          area_sqm: number;
          supply_area_sqm?: number | null;
          floor?: number | null;
          total_floors?: number | null;
          rooms?: number | null;
          bathrooms?: number | null;
          direction?: string | null;
          built_year?: number | null;
          lat: number;
          lng: number;
          images?: string[];
          description?: string | null;
          source?: string | null;
          external_id?: string | null;
          is_active?: boolean;
          status?: 'none' | 'interested' | 'visit_planned' | 'visited' | 'candidate' | 'rejected';
          memo?: string | null;
          naver_link?: string | null;
          visit_date?: string | null;
          visit_memo?: string | null;
          rejection_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          address?: string;
          address_detail?: string | null;
          property_type?: 'apt' | 'villa' | 'officetel' | 'house';
          asking_price?: number;
          deposit?: number | null;
          monthly_rent?: number | null;
          maintenance_fee?: number | null;
          area_sqm?: number;
          supply_area_sqm?: number | null;
          floor?: number | null;
          total_floors?: number | null;
          rooms?: number | null;
          bathrooms?: number | null;
          direction?: string | null;
          built_year?: number | null;
          lat?: number;
          lng?: number;
          images?: string[];
          description?: string | null;
          source?: string | null;
          external_id?: string | null;
          is_active?: boolean;
          status?: 'none' | 'interested' | 'visit_planned' | 'visited' | 'candidate' | 'rejected';
          memo?: string | null;
          naver_link?: string | null;
          visit_date?: string | null;
          visit_memo?: string | null;
          rejection_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          email: string | null;
          nickname: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          nickname?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          nickname?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      favorites: {
        Row: {
          id: string;
          user_id: string | null;
          property_id: string;
          memo: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          property_id: string;
          memo?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          property_id?: string;
          memo?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'favorites_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'favorites_property_id_fkey';
            columns: ['property_id'];
            isOneToOne: false;
            referencedRelation: 'properties';
            referencedColumns: ['id'];
          },
        ];
      };
      analysis_requests: {
        Row: {
          id: string;
          property_id: string;
          user_id: string | null;
          analysis_types: string[];
          status: 'pending' | 'processing' | 'completed' | 'failed';
          completed_count: number;
          total_count: number;
          created_at: string;
          completed_at: string | null;
          error_message: string | null;
        };
        Insert: {
          id?: string;
          property_id: string;
          user_id?: string | null;
          analysis_types: string[];
          status?: 'pending' | 'processing' | 'completed' | 'failed';
          completed_count?: number;
          total_count: number;
          created_at?: string;
          completed_at?: string | null;
          error_message?: string | null;
        };
        Update: {
          id?: string;
          property_id?: string;
          user_id?: string | null;
          analysis_types?: string[];
          status?: 'pending' | 'processing' | 'completed' | 'failed';
          completed_count?: number;
          total_count?: number;
          created_at?: string;
          completed_at?: string | null;
          error_message?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'analysis_requests_property_id_fkey';
            columns: ['property_id'];
            isOneToOne: false;
            referencedRelation: 'properties';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'analysis_requests_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      analysis_reports: {
        Row: {
          id: string;
          request_id: string;
          property_id: string;
          analysis_type: 'market' | 'location' | 'investment' | 'regulation' | 'risk' | 'news_summary' | 'review_summary';
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
        };
        Insert: {
          id?: string;
          request_id: string;
          property_id: string;
          analysis_type: 'market' | 'location' | 'investment' | 'regulation' | 'risk' | 'news_summary' | 'review_summary';
          score: number;
          grade: string;
          summary: string;
          details: Record<string, unknown>;
          strengths: string[];
          weaknesses: string[];
          recommendations: string[];
          data_sources: string[];
          confidence: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          request_id?: string;
          property_id?: string;
          analysis_type?: 'market' | 'location' | 'investment' | 'regulation' | 'risk' | 'news_summary' | 'review_summary';
          score?: number;
          grade?: string;
          summary?: string;
          details?: Record<string, unknown>;
          strengths?: string[];
          weaknesses?: string[];
          recommendations?: string[];
          data_sources?: string[];
          confidence?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'analysis_reports_request_id_fkey';
            columns: ['request_id'];
            isOneToOne: false;
            referencedRelation: 'analysis_requests';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'analysis_reports_property_id_fkey';
            columns: ['property_id'];
            isOneToOne: false;
            referencedRelation: 'properties';
            referencedColumns: ['id'];
          },
        ];
      };
      user_preferences: {
        Row: {
          id: string;
          budget_min: number | null;
          budget_max: number | null;
          deal_type: 'sale' | 'jeonse' | 'monthly';
          property_types: string[] | null;
          area_min: number | null;
          area_max: number | null;
          preferred_regions: string[] | null;
          min_floor: number | null;
          max_floor: number | null;
          min_rooms: number | null;
          min_bathrooms: number | null;
          min_built_year: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          budget_min?: number | null;
          budget_max?: number | null;
          deal_type?: 'sale' | 'jeonse' | 'monthly';
          property_types?: string[] | null;
          area_min?: number | null;
          area_max?: number | null;
          preferred_regions?: string[] | null;
          min_floor?: number | null;
          max_floor?: number | null;
          min_rooms?: number | null;
          min_bathrooms?: number | null;
          min_built_year?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          budget_min?: number | null;
          budget_max?: number | null;
          deal_type?: 'sale' | 'jeonse' | 'monthly';
          property_types?: string[] | null;
          area_min?: number | null;
          area_max?: number | null;
          preferred_regions?: string[] | null;
          min_floor?: number | null;
          max_floor?: number | null;
          min_rooms?: number | null;
          min_bathrooms?: number | null;
          min_built_year?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      property_news: {
        Row: {
          id: string;
          property_id: string | null;
          title: string;
          url: string;
          source: string | null;
          summary: string | null;
          thumbnail_url: string | null;
          published_at: string | null;
          crawled_at: string;
        };
        Insert: {
          id?: string;
          property_id?: string | null;
          title: string;
          url: string;
          source?: string | null;
          summary?: string | null;
          thumbnail_url?: string | null;
          published_at?: string | null;
          crawled_at?: string;
        };
        Update: {
          id?: string;
          property_id?: string | null;
          title?: string;
          url?: string;
          source?: string | null;
          summary?: string | null;
          thumbnail_url?: string | null;
          published_at?: string | null;
          crawled_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'property_news_property_id_fkey';
            columns: ['property_id'];
            isOneToOne: false;
            referencedRelation: 'properties';
            referencedColumns: ['id'];
          },
        ];
      };
      property_reviews: {
        Row: {
          id: string;
          property_id: string | null;
          title: string;
          url: string;
          source: string | null;
          summary: string | null;
          author: string | null;
          published_at: string | null;
          crawled_at: string;
        };
        Insert: {
          id?: string;
          property_id?: string | null;
          title: string;
          url: string;
          source?: string | null;
          summary?: string | null;
          author?: string | null;
          published_at?: string | null;
          crawled_at?: string;
        };
        Update: {
          id?: string;
          property_id?: string | null;
          title?: string;
          url?: string;
          source?: string | null;
          summary?: string | null;
          author?: string | null;
          published_at?: string | null;
          crawled_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'property_reviews_property_id_fkey';
            columns: ['property_id'];
            isOneToOne: false;
            referencedRelation: 'properties';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      search_properties_in_bounds: {
        Args: {
          sw_lat: number;
          sw_lng: number;
          ne_lat: number;
          ne_lng: number;
          p_type?: string | null;
          p_price_min?: number | null;
          p_price_max?: number | null;
          p_area_min?: number | null;
          p_area_max?: number | null;
          p_limit?: number;
        };
        Returns: Database['public']['Tables']['properties']['Row'][];
      };
      search_properties_nearby: {
        Args: {
          p_lat: number;
          p_lng: number;
          p_radius_m?: number;
          p_limit?: number;
        };
        Returns: Array<Database['public']['Tables']['properties']['Row'] & { distance_m: number }>;
      };
      search_properties_by_text: {
        Args: {
          query: string;
          p_limit?: number;
        };
        Returns: Database['public']['Tables']['properties']['Row'][];
      };
      search_properties_filtered: {
        Args: {
          p_query?: string | null;
          p_type?: string | null;
          p_price_min?: number | null;
          p_price_max?: number | null;
          p_area_min?: number | null;
          p_area_max?: number | null;
          p_min_floor?: number | null;
          p_max_floor?: number | null;
          p_min_rooms?: number | null;
          p_min_bathrooms?: number | null;
          p_min_built_year?: number | null;
          p_region?: string | null;
          p_status?: string | null;
          p_limit?: number;
          p_offset?: number;
        };
        Returns: Database['public']['Tables']['properties']['Row'][];
      };
      get_recommended_properties: {
        Args: {
          p_limit?: number;
        };
        Returns: Database['public']['Tables']['properties']['Row'][];
      };
      update_property_status: {
        Args: {
          p_property_id: string;
          p_status: string;
          p_memo?: string | null;
        };
        Returns: Database['public']['Tables']['properties']['Row'];
      };
      get_property_news: {
        Args: {
          p_property_id: string;
          p_limit?: number;
        };
        Returns: Database['public']['Tables']['property_news']['Row'][];
      };
      get_property_reviews: {
        Args: {
          p_property_id: string;
          p_limit?: number;
        };
        Returns: Database['public']['Tables']['property_reviews']['Row'][];
      };
      get_properties_by_status: {
        Args: {
          p_status?: string | null;
          p_limit?: number;
          p_offset?: number;
        };
        Returns: Database['public']['Tables']['properties']['Row'][];
      };
      get_property_status_counts: {
        Args: Record<string, never>;
        Returns: Array<{ status: string; count: number }>;
      };
      get_unanalyzed_properties: {
        Args: {
          p_limit?: number;
        };
        Returns: Database['public']['Tables']['properties']['Row'][];
      };
    };
  };
};
