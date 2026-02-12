/* eslint-disable @typescript-eslint/no-explicit-any */
// =====================================================
// Search Types
// =====================================================
// Description: Type definitions for search functionality
// =====================================================

/**
 * Type of searchable content
 */
export type SearchType = 'project' | 'partner' | 'collaboration' | 'all';

/**
 * Type of partner profile
 */
export type PartnerType = 'brand' | 'artist' | 'creative';

/**
 * Unified search result interface
 */
export interface SearchResult {
  /** Type of search result */
  type: SearchType;
  /** Unique identifier */
  id: string;
  /** Main title/name */
  title: string;
  /** Secondary information (brand name, description, etc) */
  subtitle?: string;
  /** Preview image URL */
  imageUrl?: string;
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Project search result
 */
export interface ProjectSearchResult {
  id: string;
  title: string;
  description?: string;
  brand_name?: string;
  cover_image_url?: string;
  created_at: string;
}

/**
 * Partner search result (Brand/Artist/Creative)
 */
export interface PartnerSearchResult {
  profile_id: string;
  type: PartnerType;
  name: string;
  logo_image_url?: string;
  profile_image_url?: string;
  category?: string;
  activity_field?: string;
}

/**
 * Collaboration search result
 */
export interface CollaborationSearchResult {
  id: string;
  title: string;
  brief_description?: string;
  description?: string;
  cover_image_url?: string;
  created_at: string;
}

/**
 * Search history entry
 */
export interface SearchHistory {
  id: string;
  user_id: string;
  query: string;
  search_type?: SearchType;
  created_at: string;
}

/**
 * Popular search entry (기존 View 기반)
 */
export interface PopularSearch {
  query: string;
  search_count: number;
  last_searched?: string;
}

/**
 * Trending search entry (실시간 인기 검색어)
 */
export interface TrendingSearch {
  id: string;
  query: string;
  normalized_query: string;
  search_count_1h: number;
  search_count_24h: number;
  search_count_7d: number;
  rank_current: number | null;
  rank_previous: number | null;
  rank_change: number;
  is_rising: boolean;  // 🔥 급상승
  is_new: boolean;     // NEW 배지
  last_searched_at: string;
}

/**
 * Search query record (검색 기록)
 */
export interface SearchQuery {
  id: string;
  query: string;
  normalized_query: string;
  user_id: string;
  search_type: SearchType;
  result_count: number;
  clicked_result_id?: string;
  clicked_result_type?: 'project' | 'partner' | 'collaboration';
  created_at: string;
}

/**
 * Recently viewed item (서버 저장용)
 */
export interface RecentlyViewedItem {
  id: string;
  user_id: string;
  item_id: string;
  item_type: 'project' | 'partner' | 'collaboration';
  title: string;
  image_url?: string | null;
  subtitle?: string | null;
  viewed_at: string;
}

/**
 * Search results grouped by type
 */
export interface GroupedSearchResults {
  projects: ProjectSearchResult[];
  partners: PartnerSearchResult[];
  collaborations: CollaborationSearchResult[];
}

/**
 * Search service response
 */
export interface SearchResponse<T> {
  data: T[];
  error?: Error;
}
