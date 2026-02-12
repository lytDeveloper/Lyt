import { supabase } from '../lib/supabase';
import type {
  MagazineWithProject,
  MagazineDetail,
  MagazineFilters,
  MagazineListItem,
  DBMagazineCategory,
} from '../types/magazine.types';

// 리스트용 필드만 select (content_blocks, images, content 제외 - 데이터 전송량 90% 감소)
const LIST_SELECT_FIELDS = `
  id, title, subtitle, category, tags, cover_image_url,
  reading_time, view_count, like_count, is_featured,
  is_trending, is_editor_pick, display_order, created_at, related_project,
  project:projects!magazines_related_project_fkey(id, title, status)
`;

class MagazineService {
  /**
   * Get magazines with optional filtering (최적화: 리스트용 필드만 조회)
   * @param filters - Category, featured, trending, editorPick
   * @returns Array of magazines with related project data
   */
  async getMagazines(filters?: MagazineFilters): Promise<MagazineListItem[]> {
    try {
      // Base query - 리스트용 필드만 조회 (content_blocks, images, content 제외)
      let query = supabase
        .from('magazines')
        .select(LIST_SELECT_FIELDS)
        .eq('status', 'published')
        .order('display_order', { ascending: true });

      // Apply filters
      if (filters?.category) {
        query = query.eq('category', filters.category);
      }
      if (filters?.featured !== undefined) {
        query = query.eq('is_featured', filters.featured);
      }
      if (filters?.trending !== undefined) {
        query = query.eq('is_trending', filters.trending);
      }
      if (filters?.editorPick !== undefined) {
        query = query.eq('is_editor_pick', filters.editorPick);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Defensive: Ensure arrays are never undefined
      return (data || []).map((magazine: any) => ({
        ...magazine,
        tags: magazine.tags || [],
        project: Array.isArray(magazine.project) ? magazine.project[0] : magazine.project,
      }));
    } catch (error) {
      console.error('Error fetching magazines:', error);
      return [];
    }
  }

  /**
   * Get magazines with pagination for infinite scroll (최적화: 리스트용 필드만 조회)
   * @param filters - Category filter
   * @param page - Page number (0-indexed)
   * @param pageSize - Items per page (default 5)
   * @returns Paginated magazines with hasMore flag
   */
  async getMagazinesPaginated(
    filters?: { category?: DBMagazineCategory },
    page: number = 0,
    pageSize: number = 5
  ): Promise<{ data: MagazineListItem[]; hasMore: boolean }> {
    try {
      // Fetch pageSize + 1 items to determine if there are more pages
      // 카테고리 필터를 먼저 적용한 후, 해당 카테고리 내에서만 display_order로 정렬
      let query = supabase
        .from('magazines')
        .select(LIST_SELECT_FIELDS)
        .eq('status', 'published');

      // 카테고리 필터를 먼저 적용 (WHERE 절이 ORDER BY보다 우선)
      if (filters?.category) {
        query = query.eq('category', filters.category);
      }

      // 카테고리 필터링 후, 해당 카테고리 내에서만 display_order로 정렬
      query = query
        .order('display_order', { ascending: true })
        .range(page * pageSize, page * pageSize + pageSize); // Inclusive range, fetches pageSize + 1 items

      const { data, error } = await query;

      if (error) throw error;

      const items = data || [];
      const hasMore = items.length > pageSize;
      const resultData = hasMore ? items.slice(0, pageSize) : items;

      return {
        data: resultData.map((magazine: any) => ({
          ...magazine,
          tags: magazine.tags || [],
          project: Array.isArray(magazine.project) ? magazine.project[0] : magazine.project,
        })),
        hasMore,
      };
    } catch (error) {
      console.error('Error fetching paginated magazines:', error);
      return { data: [], hasMore: false };
    }
  }

  /**
   * Get featured magazines (limit 3) - 최적화: 리스트용 필드만 조회
   */
  async getFeaturedMagazines(): Promise<MagazineListItem[]> {
    try {
      const { data, error } = await supabase
        .from('magazines')
        .select(LIST_SELECT_FIELDS)
        .eq('status', 'published')
        .eq('is_featured', true)
        .order('display_order', { ascending: true })
        .limit(3);

      if (error) throw error;

      return (data || []).map((magazine: any) => ({
        ...magazine,
        tags: magazine.tags || [],
        project: Array.isArray(magazine.project) ? magazine.project[0] : magazine.project,
      }));
    } catch (error) {
      console.error('Error fetching featured magazines:', error);
      return [];
    }
  }

  /**
   * Get single magazine by ID
   * @param id - Magazine UUID
   * @returns Magazine with author and project data
   */
  async getMagazineById(id: string): Promise<MagazineDetail | null> {
    try {
      const { data, error } = await supabase
        .from('magazines')
        .select(
          `
          *,
          author:profiles!magazines_author_id_fkey(
            id,
            nickname,
            avatar_url,
            roles
          ),
          project:projects!magazines_related_project_fkey(
            id,
            title,
            status,
            budget_range,
            deadline
          )
        `
        )
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) return null;

      // Defensive: Handle arrays
      return {
        ...data,
        tags: data.tags || [],
        images: data.images || [],
        content_blocks: data.content_blocks || [],
        meta_keywords: data.meta_keywords || [],
        author: Array.isArray(data.author) ? data.author[0] : data.author,
        project: Array.isArray(data.project) ? data.project[0] : data.project,
      };
    } catch (error) {
      console.error('Error fetching magazine by ID:', error);
      return null;
    }
  }

  /**
   * Increment view count
   * @param id - Magazine UUID
   */
  async incrementViewCount(id: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('increment_magazine_view_count', {
        magazine_id: id,
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error incrementing view count:', error);
    }
  }

  /**
   * Toggle like on magazine
   * @param magazineId - Magazine UUID
   * @param userId - User UUID
   * @returns New like state
   */
  async toggleLike(magazineId: string, userId: string): Promise<boolean> {
    try {
      // Check if already liked (active or canceled)
      const { data: existing } = await supabase
        .from('lounge_likes')
        .select('id, is_canceled')
        .eq('magazine_id', magazineId)
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        if (existing.is_canceled) {
          // Re-like without creating new row
          const { error } = await supabase
            .from('lounge_likes')
            .update({ is_canceled: false })
            .eq('id', existing.id);

          if (error) throw error;
          return true;
        }

        // Cancel like
        const { error } = await supabase
          .from('lounge_likes')
          .update({ is_canceled: true })
          .eq('id', existing.id);

        if (error) throw error;
        return false;
      } else {
        // First like
        const { error } = await supabase.from('lounge_likes').insert({
          magazine_id: magazineId,
          user_id: userId,
          is_canceled: false,
        });

        if (error) throw error;
        return true;
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      return false;
    }
  }

  /**
   * Check if user liked magazine
   * @param magazineId - Magazine UUID
   * @param userId - User UUID
   */
  async checkLiked(magazineId: string, userId: string): Promise<boolean> {
    try {
      const { data } = await supabase
        .from('lounge_likes')
        .select('id')
        .eq('magazine_id', magazineId)
        .eq('user_id', userId)
        .eq('is_canceled', false)
        .maybeSingle();

      return !!data;
    } catch (error) {
      console.error('Error checking like status:', error);
      return false;
    }
  }

  /**
   * Toggle bookmark on magazine
   * @param magazineId - Magazine UUID
   * @param userId - User UUID
   * @returns New bookmark state
   */
  async toggleBookmark(magazineId: string, userId: string): Promise<boolean> {
    try {
      // Check if already bookmarked
      const { data: existing } = await supabase
        .from('lounge_bookmarks')
        .select('id')
        .eq('magazine_id', magazineId)
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        // Remove bookmark
        const { error } = await supabase.from('lounge_bookmarks').delete().eq('id', existing.id);

        if (error) throw error;
        return false;
      } else {
        // Add bookmark
        const { error } = await supabase.from('lounge_bookmarks').insert({
          magazine_id: magazineId,
          user_id: userId,
        });

        if (error) throw error;
        return true;
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      return false;
    }
  }

  /**
   * Check if user bookmarked magazine
   * @param magazineId - Magazine UUID
   * @param userId - User UUID
   */
  async checkBookmarked(magazineId: string, userId: string): Promise<boolean> {
    try {
      const { data } = await supabase
        .from('lounge_bookmarks')
        .select('id')
        .eq('magazine_id', magazineId)
        .eq('user_id', userId)
        .maybeSingle();

      return !!data;
    } catch (error) {
      console.error('Error checking bookmark status:', error);
      return false;
    }
  }

  /**
   * Get related magazines (same category, exclude current)
   * @param magazineId - Current magazine ID
   * @param category - Magazine category
   * @param limit - Number of results (default 4)
   */
  async getRelatedMagazines(
    magazineId: string,
    category: string,
    limit: number = 4
  ): Promise<MagazineWithProject[]> {
    try {
      const { data, error } = await supabase
        .from('magazines')
        .select(
          `
          *,
          project:projects!magazines_related_project_fkey(
            id,
            title,
            status
          )
        `
        )
        .eq('status', 'published')
        .eq('category', category)
        .neq('id', magazineId)
        .order('display_order', { ascending: true })
        .limit(limit);

      if (error) throw error;

      return (data || []).map((magazine: any) => ({
        ...magazine,
        tags: magazine.tags || [],
        images: magazine.images || [],
        meta_keywords: magazine.meta_keywords || [],
        project: Array.isArray(magazine.project) ? magazine.project[0] : magazine.project,
      }));
    } catch (error) {
      console.error('Error fetching related magazines:', error);
      return [];
    }
  }

  /**
   * Calculate reading time based on content length
   * Assumes 500 characters per minute for Korean text
   * @param content - Article content
   * @returns Reading time in minutes
   */
  calculateReadingTime(content: string): number {
    if (!content) return 1;
    const charCount = content.length;
    const readingTime = Math.ceil(charCount / 500);
    return Math.max(readingTime, 1); // Minimum 1 minute
  }

  /**
   * Get user's reaction to a magazine (like/dislike)
   * @param magazineId - Magazine UUID
   * @param userId - User UUID
   * @returns Reaction type or null if no reaction
   */
  async getUserReaction(magazineId: string, userId: string): Promise<'like' | 'dislike' | null> {
    try {
      const { data, error } = await supabase
        .from('magazine_reactions')
        .select('reaction_type')
        .eq('magazine_id', magazineId)
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      return (data?.reaction_type as 'like' | 'dislike') || null;
    } catch (error) {
      console.error('Error getting user reaction:', error);
      return null;
    }
  }

  /**
   * Toggle like/dislike reaction on magazine
   * @param magazineId - Magazine UUID
   * @param userId - User UUID
   * @param reactionType - 'like' or 'dislike'
   * @returns New reaction state or null if removed
   */
  async toggleReaction(
    magazineId: string,
    userId: string,
    reactionType: 'like' | 'dislike'
  ): Promise<'like' | 'dislike' | null> {
    try {
      // Check existing reaction
      const { data: existing } = await supabase
        .from('magazine_reactions')
        .select('id, reaction_type')
        .eq('magazine_id', magazineId)
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        if (existing.reaction_type === reactionType) {
          // Same reaction clicked - remove it
          const { error } = await supabase
            .from('magazine_reactions')
            .delete()
            .eq('id', existing.id);

          if (error) throw error;
          return null;
        } else {
          // Different reaction - update it
          const { error } = await supabase
            .from('magazine_reactions')
            .update({ reaction_type: reactionType, updated_at: new Date().toISOString() })
            .eq('id', existing.id);

          if (error) throw error;
          return reactionType;
        }
      } else {
        // No existing reaction - insert new
        const { error } = await supabase.from('magazine_reactions').insert({
          magazine_id: magazineId,
          user_id: userId,
          reaction_type: reactionType,
        });

        if (error) throw error;
        return reactionType;
      }
    } catch (error) {
      console.error('Error toggling reaction:', error);
      return null;
    }
  }

  /**
   * Get reaction counts for a magazine
   * @param magazineId - Magazine UUID
   * @returns Object with like_count and dislike_count
   */
  async getReactionCounts(magazineId: string): Promise<{ like_count: number; dislike_count: number }> {
    try {
      const { data, error } = await supabase
        .from('magazines')
        .select('like_count, dislike_count')
        .eq('id', magazineId)
        .single();

      if (error) throw error;
      return {
        like_count: data?.like_count || 0,
        dislike_count: data?.dislike_count || 0,
      };
    } catch (error) {
      console.error('Error getting reaction counts:', error);
      return { like_count: 0, dislike_count: 0 };
    }
  }

  /**
   * 사용자가 북마크한 매거진 목록 조회 (최적화: 리스트용 필드만 조회)
   * @param userId - User UUID
   * @returns Array of bookmarked magazines with project data
   */
  async getBookmarkedMagazines(userId: string): Promise<MagazineListItem[]> {
    try {
      const { data, error } = await supabase
        .from('lounge_bookmarks')
        .select(
          `
          id,
          magazine_id,
          created_at,
          magazine:magazines!lounge_bookmarks_magazine_id_fkey(
            id, title, subtitle, category, tags, cover_image_url,
            reading_time, view_count, like_count, is_featured,
            is_trending, is_editor_pick, display_order, created_at, related_project,
            project:projects!magazines_related_project_fkey(id, title, status)
          )
        `
        )
        .eq('user_id', userId)
        .not('magazine_id', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // 매거진 데이터 추출 및 변환
      return (data || [])
        .filter((item: any) => item.magazine)
        .map((item: any) => {
          const magazine = item.magazine;
          return {
            ...magazine,
            tags: magazine.tags || [],
            project: Array.isArray(magazine.project) ? magazine.project[0] : magazine.project,
          };
        });
    } catch (error) {
      console.error('Error fetching bookmarked magazines:', error);
      return [];
    }
  }

  /**
   * 사용자가 북마크한 매거진 개수 조회
   * @param userId - User UUID
   * @returns Bookmark count
   */
  async getBookmarkCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('lounge_bookmarks')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .not('magazine_id', 'is', null);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error fetching bookmark count:', error);
      return 0;
    }
  }

  /**
   * 여러 북마크 일괄 삭제
   * @param bookmarkIds - Array of magazine IDs to remove from bookmarks
   * @param userId - User UUID
   * @returns Success status
   */
  async removeBookmarks(magazineIds: string[], userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('lounge_bookmarks')
        .delete()
        .eq('user_id', userId)
        .in('magazine_id', magazineIds);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error removing bookmarks:', error);
      return false;
    }
  }
}

export const magazineService = new MagazineService();
