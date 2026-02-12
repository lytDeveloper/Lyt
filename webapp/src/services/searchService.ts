// =====================================================
// Search Service
// =====================================================
// Description: Service for handling all search operations
// =====================================================

import { supabase } from '../lib/supabase';
import type {
  SearchType,
  ProjectSearchResult,
  PartnerSearchResult,
  CollaborationSearchResult,
  SearchHistory,
  PopularSearch,
  TrendingSearch,
  GroupedSearchResults,
} from '../types/search.types';
import { BlockService } from './blockService';

export class SearchService {
  /**
   * 검색어 정규화 (소문자 변환, 공백 정리)
   */
  static normalizeQuery(query: string): string {
    return query.toLowerCase().trim().replace(/\s+/g, ' ');
  }

  /**
   * Search projects by title, description, or brand name
   */
  static async searchProjects(query: string, limit = 10): Promise<ProjectSearchResult[]> {
    if (!query || query.trim().length < 2) return [];

    const searchPattern = `%${query.trim()}%`;

    const { data, error } = await supabase
      .from('projects')
      .select('id, title, description, cover_image_url, created_at')
      .or(`title.ilike.${searchPattern},description.ilike.${searchPattern}`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error searching projects:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Search partners (brands, artists, creatives) by name
   * @param query - 검색어
   * @param limit - 결과 제한
   * @param userId - 로그인 사용자 ID (차단 필터링용, optional)
   */
  static async searchPartners(query: string, limit = 10, userId?: string): Promise<PartnerSearchResult[]> {
    if (!query || query.trim().length < 2) return [];

    const searchPattern = `%${query.trim()}%`;
    const results: PartnerSearchResult[] = [];

    // Search brands
    const { data: brands } = await supabase
      .from('profile_brands')
      .select('profile_id, brand_name, logo_image_url, activity_field')
      .ilike('brand_name', searchPattern)
      .eq('is_active', true)
      .limit(limit);

    if (brands) {
      results.push(
        ...brands.map((b) => ({
          profile_id: b.profile_id,
          type: 'brand' as const,
          name: b.brand_name || 'Unnamed Brand',
          logo_image_url: b.logo_image_url,
          category: b.activity_field,
          activity_field: b.activity_field,
        }))
      );
    }

    // Search artists
    const { data: artists } = await supabase
      .from('profile_artists')
      .select('profile_id, artist_name, logo_image_url, activity_field')
      .ilike('artist_name', searchPattern)
      .eq('is_active', true)
      .limit(limit);

    if (artists) {
      results.push(
        ...artists.map((a) => ({
          profile_id: a.profile_id,
          type: 'artist' as const,
          name: a.artist_name || 'Unnamed Artist',
          logo_image_url: a.logo_image_url,
          activity_field: a.activity_field,
        }))
      );
    }

    // Search creatives
    const { data: creatives } = await supabase
      .from('profile_creatives')
      .select('profile_id, nickname, profile_image_url')
      .ilike('nickname', searchPattern)
      .eq('is_active', true)
      .limit(limit);

    if (creatives) {
      results.push(
        ...creatives.map((c) => ({
          profile_id: c.profile_id,
          type: 'creative' as const,
          name: c.nickname || 'Unnamed Creative',
          profile_image_url: c.profile_image_url,
        }))
      );
    }

    // 로그인 사용자인 경우 차단 및 역방향 숨기기 필터링
    // - 내가 차단한 파트너 제외
    // - 나를 숨긴 파트너 제외 (역방향 숨기기)
    let filteredResults = results;
    if (userId) {
      const [blockedIds, hiddenByIds] = await Promise.all([
        BlockService.getBlockedUserIds(userId),
        BlockService.getHiddenByUserIds(userId),
      ]);
      const excludeSet = new Set([...blockedIds, ...hiddenByIds]);
      filteredResults = results.filter((r) => !excludeSet.has(r.profile_id));
    }

    // Sort by relevance (exact matches first, then partial matches)
    const queryLower = query.toLowerCase();
    return filteredResults
      .sort((a, b) => {
        const aExact = a.name.toLowerCase() === queryLower ? 1 : 0;
        const bExact = b.name.toLowerCase() === queryLower ? 1 : 0;
        return bExact - aExact;
      })
      .slice(0, limit);
  }

  /**
   * Search collaborations by title, brief description, or description
   */
  static async searchCollaborations(
    query: string,
    limit = 10
  ): Promise<CollaborationSearchResult[]> {
    if (!query || query.trim().length < 2) return [];

    const searchPattern = `%${query.trim()}%`;

    const { data, error } = await supabase
      .from('collaborations')
      .select('id, title, brief_description, description, cover_image_url, created_at')
      .or(`title.ilike.${searchPattern},brief_description.ilike.${searchPattern},description.ilike.${searchPattern}`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error searching collaborations:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Search all content types at once
   * @param query - 검색어
   * @param limit - 결과 제한
   * @param userId - 로그인 사용자 ID (차단 필터링용, optional)
   */
  static async searchAll(query: string, limit = 10, userId?: string): Promise<GroupedSearchResults> {
    if (!query || query.trim().length < 2) {
      return {
        projects: [],
        partners: [],
        collaborations: [],
      };
    }

    const [projects, partners, collaborations] = await Promise.all([
      this.searchProjects(query, limit),
      this.searchPartners(query, limit, userId),
      this.searchCollaborations(query, limit),
    ]);

    return {
      projects,
      partners,
      collaborations,
    };
  }

  /**
   * Save search query to search_queries table (신규)
   * @returns 생성된 검색 쿼리 ID (클릭 추적용)
   */
  static async saveSearchQuery(
    userId: string,
    query: string,
    searchType: SearchType = 'all',
    resultCount: number = 0
  ): Promise<string | null> {
    if (!userId || !query || query.trim().length < 2) return null;

    const normalizedQuery = this.normalizeQuery(query);

    const { data, error } = await supabase
      .from('search_queries')
      .insert({
        user_id: userId,
        query: query.trim(),
        normalized_query: normalizedQuery,
        search_type: searchType,
        result_count: resultCount,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error saving search query:', error);
      return null;
    }

    return data?.id || null;
  }

  /**
   * Update clicked result for a search query
   */
  static async updateClickedResult(
    searchQueryId: string,
    clickedResultId: string,
    clickedResultType: 'project' | 'partner' | 'collaboration'
  ): Promise<void> {
    if (!searchQueryId || !clickedResultId) return;

    const { error } = await supabase
      .from('search_queries')
      .update({
        clicked_result_id: clickedResultId,
        clicked_result_type: clickedResultType,
      })
      .eq('id', searchQueryId);

    if (error) {
      console.error('Error updating clicked result:', error);
    }
  }

  /**
   * Save search to history (기존 호환성 유지)
   * @deprecated Use saveSearchQuery instead
   */
  static async saveSearchHistory(
    userId: string,
    query: string,
    searchType?: SearchType
  ): Promise<void> {
    if (!userId || !query || query.trim().length < 2) return;

    // 신규 search_queries 테이블에 저장
    await this.saveSearchQuery(userId, query, searchType || 'all');

    // 기존 search_history 테이블에도 저장 (fallback)
    const { error } = await supabase.from('search_history').insert({
      user_id: userId,
      query: query.trim(),
      search_type: searchType,
    });

    if (error) {
      console.error('Error saving search history:', error);
    }
  }

  /**
   * Get user's recent searches
   */
  static async getRecentSearches(userId: string, limit = 5): Promise<SearchHistory[]> {
    if (!userId) return [];

    const { data, error } = await supabase
      .from('search_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching recent searches:', error);
      return [];
    }

    // Remove duplicates (keep most recent)
    const uniqueSearches = new Map<string, SearchHistory>();
    data?.forEach((search) => {
      const queryKey = search.query.toLowerCase();
      if (!uniqueSearches.has(queryKey)) {
        uniqueSearches.set(queryKey, search);
      }
    });

    return Array.from(uniqueSearches.values()).slice(0, limit);
  }

  /**
   * Get popular searches from all users (기존 View 기반)
   */
  static async getPopularSearches(limit = 10): Promise<PopularSearch[]> {
    const { data, error } = await supabase
      .from('popular_searches')
      .select('query, search_count')
      .limit(limit);

    if (error) {
      console.error('Error fetching popular searches:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get trending searches with rank change info (신규)
   */
  static async getTrendingSearches(limit = 10): Promise<TrendingSearch[]> {
    const { data, error } = await supabase
      .from('trending_searches')
      .select('*')
      .not('rank_current', 'is', null)
      .order('rank_current', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('Error fetching trending searches:', error);
      // Fallback: 기존 popular_searches View 사용
      const popular = await this.getPopularSearches(limit);
      return popular.map((p, index) => ({
        id: `fallback-${index}`,
        query: p.query,
        normalized_query: this.normalizeQuery(p.query),
        search_count_1h: p.search_count,
        search_count_24h: p.search_count,
        search_count_7d: p.search_count,
        rank_current: index + 1,
        rank_previous: null,
        rank_change: 0,
        is_rising: false,
        is_new: false,
        last_searched_at: p.last_searched || new Date().toISOString(),
      }));
    }

    return data || [];
  }

  /**
   * Delete a specific search from user's history
   */
  static async deleteSearchHistory(userId: string, query: string): Promise<void> {
    if (!userId || !query) return;

    const { error } = await supabase
      .from('search_history')
      .delete()
      .eq('user_id', userId)
      .eq('query', query);

    if (error) {
      console.error('Error deleting search history:', error);
    }
  }

  /**
   * Clear all search history for a user
   */
  static async clearSearchHistory(userId: string): Promise<void> {
    if (!userId) return;

    const { error } = await supabase
      .from('search_history')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Error clearing search history:', error);
    }
  }

  /**
   * Get trending projects and collaborations for discovery view
   */
  static async getTrendingContents(limit = 10): Promise<{
    projects: Array<{
      id: string;
      title: string;
      cover_image_url?: string | null;
      budget_range?: string | null;
      deadline?: string | null;
      tags?: string[] | null;
      category?: string | null;
      brand_name?: string;
    }>;
    collaborations: Array<{
      id: string;
      title: string;
      cover_image_url?: string | null;
      region?: string | null;
      duration?: string | null;
      team_size?: number | null;
      current_team_size?: number | null;
      tags?: string[] | null;
      category?: string | null;
      company_name?: string;
    }>;
  }> {
    try {
      // 1순위: is_trending = true인 프로젝트 (open 또는 in_progress 상태)
      const { data: trendingProjects, error: trendingError } = await supabase
        .from('projects')
        .select('id, title, cover_image_url, budget_range, deadline, tags, category, created_by')
        .eq('is_trending', true)
        .in('status', ['open', 'in_progress'])
        .order('display_order', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(limit);

      if (trendingError) {
        console.error('Error fetching trending projects:', trendingError);
      }

      let projects = trendingProjects || [];
      const trendingIds = projects.map((p) => p.id);

      // Fallback: 1순위가 limit보다 적으면 나머지를 조회수 높은 프로젝트로 채움
      if (projects.length < limit) {
        const remainingCount = limit - projects.length;
        const { data: fallbackProjects, error: fallbackError } = await supabase
          .from('projects')
          .select('id, title, cover_image_url, budget_range, deadline, tags, category, created_by')
          .in('status', ['open', 'in_progress'])
          .not('id', 'in', trendingIds.length > 0 ? `(${trendingIds.join(',')})` : '(00000000-0000-0000-0000-000000000000)')
          .order('view_count', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(remainingCount);

        if (fallbackError) {
          console.error('Error fetching fallback projects:', fallbackError);
        } else if (fallbackProjects) {
          projects = [...projects, ...fallbackProjects];
        }
      }

      // Get brand names for projects
      const projectIds = (projects || []).map((p) => p.created_by);
      const { data: brands } = await supabase
        .from('profile_brands')
        .select('profile_id, brand_name')
        .in('profile_id', projectIds);

      const brandMap = new Map(
        (brands || []).map((b) => [b.profile_id, b.brand_name])
      );

      // Get trending collaborations (open 또는 in_progress 상태)
      let collaborations: any[] = [];
      let partnerMap = new Map<string, string>();
      
      try {
        const { data: collabsData, error: collabsError } = await supabase
          .from('collaborations')
          .select('id, title, cover_image_url, region, duration, team_size, current_team_size, tags, category, created_by')
          .in('status', ['open', 'in_progress'])
          .order('view_count', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(limit);

        if (collabsError) {
          console.error('Error fetching trending collaborations:', collabsError);
        } else {
          collaborations = collabsData || [];
        }

        // Get partner names for collaborations
        if (collaborations.length > 0) {
          const collabIds = collaborations.map((c) => c.created_by);
          const { data: partners, error: partnersError } = await supabase
            .from('profile_artists')
            .select('profile_id, artist_name')
            .in('profile_id', collabIds);

          if (partnersError) {
            console.error('Error fetching collaboration partners:', partnersError);
          } else {
            partnerMap = new Map(
              (partners || []).map((p) => [p.profile_id, p.artist_name])
            );
          }
        }
      } catch (collabError) {
        console.error('Error in collaborations query:', collabError);
        // Continue with empty collaborations array
      }

      return {
        projects: (projects || []).map((p) => ({
          id: p.id,
          title: p.title,
          cover_image_url: p.cover_image_url,
          budget_range: p.budget_range,
          deadline: p.deadline,
          tags: p.tags,
          category: p.category,
          brand_name: brandMap.get(p.created_by) || undefined,
        })),
        collaborations: collaborations.map((c) => ({
          id: c.id,
          title: c.title,
          cover_image_url: c.cover_image_url,
          region: c.region,
          duration: c.duration,
          team_size: c.team_size,
          current_team_size: c.current_team_size,
          tags: c.tags,
          category: c.category,
          company_name: partnerMap.get(c.created_by) || undefined,
        })),
      };
    } catch (error) {
      console.error('Error fetching trending contents:', error);
      return { projects: [], collaborations: [] };
    }
  }
}

export const searchService = SearchService;
