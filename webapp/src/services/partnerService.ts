/**
 * Partner Service
 * Manages partner data with Supabase backend integration (uses partners VIEW)
 */

import {
  type ProjectCategory,
  type CareerHistoryItem,
  type DisplayInfo,
} from '../types/exploreTypes';
import { supabase } from '../lib/supabase';
import { mapPartner } from '../utils/mappers';
import { getExcludedPartnerIds } from '../utils/preferenceHelpers';
import { socialService } from './socialService';

const DEFAULT_PAGE_SIZE = 10;

interface PaginationOptions {
  from?: number;
  limit?: number;
}

export interface PartnerListOptions extends PaginationOptions {
  category?: ProjectCategory | '전체';
  sortBy?: 'rating' | 'created_at';
}

const resolveRange = (options?: PaginationOptions): { from: number; to: number } => {
  const limit = options?.limit ?? DEFAULT_PAGE_SIZE;
  const from = options?.from ?? 0;
  const to = from + limit - 1;
  return { from, to };
};

export interface Partner {
  id: string;
  name: string;
  activityField: string;  // Korean label stored directly in DB (e.g., "음악", "패션")
  role?: 'artist' | 'creative' | string;
  specializedRoles: string[];
  tags: string[];
  bio: string;
  profileImageUrl: string;
  coverImageUrl: string;
  portfolioImages: string[];
  region: string;
  career: string; // e.g., "10년"
  //Stats
  rating: number;
  reviewCount: number;
  completedProjects: number;
  matchingRate: number; // 0-100
  responseRate: number; // 0-100
  responseTime: string; // e.g., "1시간 이내"
  // Status
  isOnline: boolean;
  isVerified: boolean;
  // Career history for detail page
  careerHistory: CareerHistoryItem[];
  // Derived for backward-compat: mirrors activityField until UI fully migrates
  category: string;
  display: DisplayInfo;
  // For brand: establishment date
  established_at?: string;
}


export interface PartnerStats {
  rating: number | null;
  reviewCount: number;
  responseRate: number | null;
  responseTime: string | null;
  matchingRate: number | null;
}

interface PartnerMetrics {
  user_id: string;
  response_rate: number | null;
  response_time_hours: number | null;
  matching_rate: number | null;
}

const formatResponseTime = (hours?: number | null): string => {
  if (hours === null || hours === undefined || Number.isNaN(hours)) return '24시간 이내';
  if (hours < 1) {
    const minutes = Math.max(Math.round(hours * 60), 1);
    return `${minutes}분 이내`;
  }
  if (hours >= 24) {
    const days = Math.round(hours / 24);
    return `${days}일 이내`;
  }
  return `${Math.round(hours * 10) / 10}시간 이내`;
};

const fetchPartnerMetrics = async (ids: string[]): Promise<Map<string, PartnerMetrics>> => {
  const map = new Map<string, PartnerMetrics>();
  if (!ids || ids.length === 0) return map;

  const { data, error } = await supabase
    .from('live_partner_metrics')
    .select('user_id, response_rate, response_time_hours, matching_rate')
    .in('user_id', ids);

  if (error) {
    console.error('[partnerService] Error fetching partner metrics:', error);
    return map;
  }

  (data || []).forEach((row) => {
    if (row?.user_id) {
      map.set(row.user_id, {
        user_id: row.user_id,
        response_rate: row.response_rate,
        response_time_hours: row.response_time_hours,
        matching_rate: row.matching_rate,
      });
    }
  });

  return map;
};

const applyPartnerMetrics = async (partners: Partner[]): Promise<Partner[]> => {
  const ids = Array.from(new Set(partners.map((p) => p.id).filter(Boolean)));
  const metricsMap = await fetchPartnerMetrics(ids);

  return partners.map((partner) => {
    const metric = metricsMap.get(partner.id);
    if (!metric) return partner;

    return {
      ...partner,
      responseRate:
        typeof metric.response_rate === 'number' ? Math.max(0, Math.min(100, metric.response_rate)) : partner.responseRate,
      responseTime:
        metric.response_time_hours !== null && metric.response_time_hours !== undefined
          ? formatResponseTime(metric.response_time_hours)
          : partner.responseTime,
      matchingRate:
        typeof metric.matching_rate === 'number' ? Math.max(0, Math.min(100, metric.matching_rate)) : partner.matchingRate,
    };
  });
};

/**
 * Get all partners from Supabase (partners VIEW) with optional pagination and filters
 * Automatically filters out hidden and blocked partners for the current user
 */
export const getAllPartners = async (options: PartnerListOptions = {}): Promise<Partner[]> => {
  try {
    const limit = options?.limit ?? DEFAULT_PAGE_SIZE;
    const baseFrom = options?.from ?? 0;
    const sortBy = options?.sortBy ?? 'rating';
    const sortColumn = sortBy === 'created_at' ? 'created_at' : 'rating';

    // Get current user and excluded IDs
    const { data: { user } } = await supabase.auth.getUser();
    const excludedIds = user ? await getExcludedPartnerIds(user.id) : new Set<string>();
    const excludedIdsArray = Array.from(excludedIds);

    let allResults: Partner[] = [];
    let currentFrom = baseFrom;
    const maxIterations = 3;
    let iteration = 0;

    while (allResults.length < limit && iteration < maxIterations) {
      const currentTo = currentFrom + limit - 1;

      let queryBuilder = supabase
        .from('partners')
        .select(
          'id, name, activity_field, role, profile_image_url, cover_image_url, specialized_roles, tags, rating, review_count, completed_projects, region, matching_rate, response_rate, response_time, is_online, is_verified'
        )
        .order(sortColumn, { ascending: false });

      // Apply excluded IDs filter
      if (excludedIdsArray.length > 0) {
        queryBuilder = queryBuilder.not('id', 'in', `(${excludedIdsArray.join(',')})`);
      }

      if (options.category && options.category !== '전체') {
        queryBuilder = queryBuilder.eq('activity_field', options.category);
      }

      const { data, error } = await queryBuilder.range(currentFrom, currentTo);

      if (error) {
        console.error('[partnerService] Error fetching partners:', error);
        throw new Error(`파트너 목록을 불러오는데 실패했습니다: ${error.message}`);
      }

      const fetchedPartners = (data || []).map(mapPartner);
      const enrichedPartners = await applyPartnerMetrics(fetchedPartners);

      if (enrichedPartners.length === 0) {
        break;
      }

      allResults = [...allResults, ...enrichedPartners];
      currentFrom = currentTo + 1;
      iteration++;
    }

    return allResults.slice(0, limit);
  } catch (error) {
    console.error('[partnerService] getAllPartners failed:', error);
    throw error;
  }
};

/**
 * Get partner by ID
 */
export const getPartnerById = async (id: string): Promise<Partner | null> => {
  try {
    const { data, error } = await supabase
      .from('partners')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('[partnerService] Error fetching partner:', error);
      throw new Error(`파트너를 불러오는데 실패했습니다: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    const partner = mapPartner(data);
    if (!partner) return null;

    const [enriched] = await applyPartnerMetrics([partner]);
    return enriched || partner;
  } catch (error) {
    console.error('[partnerService] getPartnerById failed:', error);
    throw error;
  }
};

/**
 * Get partners by category (activity_field)
 */
export const getPartnersByCategory = async (category: string): Promise<Partner[]> => {
  try {
    const { data, error } = await supabase
      .from('partners')
      .select('*')
      .eq('activity_field', category)
      .order('rating', { ascending: false });

    if (error) {
      console.error('[partnerService] Error fetching partners by category:', error);
      throw new Error(`카테고리별 파트너를 불러오는데 실패했습니다: ${error.message}`);
    }

    return applyPartnerMetrics((data || []).map(mapPartner));
  } catch (error) {
    console.error('[partnerService] getPartnersByCategory failed:', error);
    throw error;
  }
};

/**
 * Get partners by activity field
 */
export const getPartnersByActivityField = async (activityField: string): Promise<Partner[]> => {
  try {
    const { data, error } = await supabase
      .from('partners')
      .select('*')
      .eq('activity_field', activityField)
      .order('rating', { ascending: false });

    if (error) {
      console.error('[partnerService] Error fetching partners by activity field:', error);
      throw new Error(`활동 분야별 파트너를 불러오는데 실패했습니다: ${error.message}`);
    }

    return applyPartnerMetrics((data || []).map(mapPartner));
  } catch (error) {
    console.error('[partnerService] getPartnersByActivityField failed:', error);
    throw error;
  }
};

/**
 * Search partners by query (name, activityField, specializedRoles, tags, bio)
 * Uses pg_trgm GIN indexes for optimized text search
 */
export const searchPartners = async (query: string): Promise<Partner[]> => {
  try {
    if (!query.trim()) {
      return getAllPartners();
    }

    const lowerQuery = query.toLowerCase().trim();

    // Supabase full-text search using ilike (optimized with pg_trgm GIN indexes)
    const { data, error } = await supabase
      .from('partners')
      .select('*')
      .or(`name.ilike.%${lowerQuery}%,activity_field.ilike.%${lowerQuery}%,bio.ilike.%${lowerQuery}%`)
      .order('rating', { ascending: false });

    if (error) {
      console.error('[partnerService] Error searching partners:', error);
      throw new Error(`파트너 검색에 실패했습니다: ${error.message}`);
    }

    // Additional client-side filtering for tags and specializedRoles (arrays)
    const results = (data || []).map(mapPartner);
    const filtered = results.filter(
      (partner) =>
        partner.specializedRoles.some((role) => role.toLowerCase().includes(lowerQuery))
        || partner.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
        || results.includes(partner) // Already matched by name/activityField/bio
    );
    return applyPartnerMetrics(filtered);
  } catch (error) {
    console.error('[partnerService] searchPartners failed:', error);
    throw error;
  }
};

/**
 * Search partners with filters (query, category)
 * Server-side filtering for better performance
 * Automatically filters out hidden and blocked partners for the current user
 */
export const searchPartnersWithFilters = async (
  query: string,
  category: ProjectCategory | '전체',
  options: PaginationOptions = {},
): Promise<Partner[]> => {
  try {
    const { from, to } = resolveRange(options);
    const trimmedQuery = query.trim();
    const hasQuery = trimmedQuery.length > 0;
    const lowerQuery = trimmedQuery.toLowerCase();

    // Get current user and excluded IDs
    const { data: { user } } = await supabase.auth.getUser();
    const excludedIds = user ? await getExcludedPartnerIds(user.id) : new Set<string>();
    const excludedIdsArray = Array.from(excludedIds);

    let queryBuilder = supabase
      .from('partners')
      .select('*');

    // Apply excluded IDs filter
    if (excludedIdsArray.length > 0) {
      queryBuilder = queryBuilder.not('id', 'in', `(${excludedIdsArray.join(',')})`);
    }

    // Apply search query filter (uses pg_trgm GIN indexes)
    if (hasQuery) {
      queryBuilder = queryBuilder.or(
        `name.ilike.%${lowerQuery}%,activity_field.ilike.%${lowerQuery}%,bio.ilike.%${lowerQuery}%`
      );
    }

    // Apply category filter
    if (category !== '전체') {
      queryBuilder = queryBuilder.eq('activity_field', category);
    }

    // Order by rating
    queryBuilder = queryBuilder.order('rating', { ascending: false }).range(from, to);

    const { data, error } = await queryBuilder;

    if (error) {
      console.error('[partnerService] Error searching partners with filters:', error);
      throw new Error(`파트너 검색에 실패했습니다: ${error.message}`);
    }

    // Map results and filter tags/specializedRoles client-side
    const results = (data || []).map(mapPartner);

    // Additional client-side filtering for tags and specializedRoles if query exists
    if (hasQuery) {
      const filtered = results.filter(
        (partner) =>
          partner.specializedRoles.some((role) => role.toLowerCase().includes(lowerQuery))
          || partner.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
          || results.includes(partner) // Already matched by name/activityField/bio
      );
      return applyPartnerMetrics(filtered);
    }

    return applyPartnerMetrics(results);
  } catch (error) {
    console.error('[partnerService] searchPartnersWithFilters failed:', error);
    throw error;
  }
};

/**
 * Filter partners by search query and category (client-side for flexibility)
 */
export const filterPartners = (
  partners: Partner[],
  searchQuery: string,
  selectedCategory: ProjectCategory | '전체',
): Partner[] => {
  let filtered = [...partners];

  // Filter by search query (name, activityField, specializedRoles, tags, bio)
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase().trim();
    filtered = filtered.filter(
      (partner) =>
        partner.name.toLowerCase().includes(query) ||
        partner.activityField.toLowerCase().includes(query) ||
        partner.bio.toLowerCase().includes(query) ||
        partner.specializedRoles.some((role) => role.toLowerCase().includes(query)) ||
        partner.tags.some((tag) => tag.toLowerCase().includes(query)),
    );
  }

  // Filter by category
  if (selectedCategory !== '전체') {
    filtered = filtered.filter((partner) => partner.category === selectedCategory);
  }

  return filtered;
};

// ============================================================================
// User Preferences: Hide/Block Functionality
// ============================================================================



/**
 * Hide a partner from the user's feed
 */
export const hidePartner = async (partnerId: string, reason?: string): Promise<void> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('로그인이 필요합니다');
    }

    const { error } = await supabase
      .from('user_partner_preferences')
      .upsert({
        profile_id: user.id,
        partner_id: partnerId,
        status: 'hidden',
        reason: reason || null,
      }, {
        onConflict: 'profile_id,partner_id',
      });

    if (error) {
      console.error('[partnerService] Error hiding partner:', error);
      throw new Error(`파트너 숨김에 실패했습니다: ${error.message}`);
    }
  } catch (error) {
    console.error('[partnerService] hidePartner failed:', error);
    throw error;
  }
};

/**
 * Unhide a partner (removes preference record)
 */
export const unhidePartner = async (partnerId: string): Promise<void> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('로그인이 필요합니다');
    }

    const { error } = await supabase
      .from('user_partner_preferences')
      .delete()
      .eq('profile_id', user.id)
      .eq('partner_id', partnerId)
      .eq('status', 'hidden');

    if (error) {
      console.error('[partnerService] Error unhiding partner:', error);
      throw new Error(`파트너 숨김 해제에 실패했습니다: ${error.message}`);
    }
  } catch (error) {
    console.error('[partnerService] unhidePartner failed:', error);
    throw error;
  }
};

/**
 * Block a partner permanently
 * Also automatically removes follow and like relationships
 */
export const blockPartner = async (partnerId: string, reason?: string): Promise<void> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('로그인이 필요합니다');
    }

    const { error } = await supabase
      .from('user_partner_preferences')
      .upsert({
        profile_id: user.id,
        partner_id: partnerId,
        status: 'blocked',
        reason: reason || null,
      }, {
        onConflict: 'profile_id,partner_id',
      });

    if (error) {
      console.error('[partnerService] Error blocking partner:', error);
      throw new Error(`파트너 차단에 실패했습니다: ${error.message}`);
    }

    // 차단 성공 시 팔로우/좋아요 자동 해제
    try {
      await Promise.all([
        socialService.unfollowUser(user.id, partnerId).catch((err) => {
          console.warn('[partnerService] Failed to unfollow partner:', err);
        }),
        // 파트너는 'user', 'brand', 'partner' 타입일 수 있으므로 모두 시도
        socialService.unlikeEntity(user.id, partnerId, 'user').catch((err) => {
          console.warn('[partnerService] Failed to unlike partner (user):', err);
        }),
        socialService.unlikeEntity(user.id, partnerId, 'brand').catch((err) => {
          console.warn('[partnerService] Failed to unlike partner (brand):', err);
        }),
        socialService.unlikeEntity(user.id, partnerId, 'partner').catch((err) => {
          console.warn('[partnerService] Failed to unlike partner (partner):', err);
        }),
      ]);
    } catch (err) {
      // 팔로우/좋아요 해제 실패는 차단 자체를 실패로 간주하지 않음
      console.error('[partnerService] Error removing follow/like on block:', err);
    }
  } catch (error) {
    console.error('[partnerService] blockPartner failed:', error);
    throw error;
  }
};

/**
 * Unblock a partner (removes preference record)
 */
export const unblockPartner = async (partnerId: string): Promise<void> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('로그인이 필요합니다');
    }

    const { error } = await supabase
      .from('user_partner_preferences')
      .delete()
      .eq('profile_id', user.id)
      .eq('partner_id', partnerId)
      .eq('status', 'blocked');

    if (error) {
      console.error('[partnerService] Error unblocking partner:', error);
      throw new Error(`파트너 차단 해제에 실패했습니다: ${error.message}`);
    }
  } catch (error) {
    console.error('[partnerService] unblockPartner failed:', error);
    throw error;
  }
};

/**
 * Get all hidden partners for the current user
 */
export const getHiddenPartners = async (): Promise<Partner[]> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('로그인이 필요합니다');
    }

    // Get hidden partner IDs
    const { data: preferences, error: prefError } = await supabase
      .from('user_partner_preferences')
      .select('partner_id')
      .eq('profile_id', user.id)
      .eq('status', 'hidden');

    if (prefError) {
      console.error('[partnerService] Error fetching hidden partners:', prefError);
      throw new Error(`숨긴 파트너 목록을 불러오는데 실패했습니다: ${prefError.message}`);
    }

    if (!preferences || preferences.length === 0) return [];

    const partnerIds = preferences.map(p => p.partner_id);

    // Fetch partner details from partners VIEW
    const { data, error } = await supabase
      .from('partners')
      .select('*')
      .in('id', partnerIds)
      .order('rating', { ascending: false });

    if (error) {
      console.error('[partnerService] Error fetching hidden partner details:', error);
      throw new Error(`숨긴 파트너 상세 정보를 불러오는데 실패했습니다: ${error.message}`);
    }

    return applyPartnerMetrics((data || []).map(mapPartner));
  } catch (error) {
    console.error('[partnerService] getHiddenPartners failed:', error);
    throw error;
  }
};

/**
 * Get all blocked partners for the current user
 */
export const getBlockedPartners = async (): Promise<Partner[]> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('로그인이 필요합니다');
    }

    // Get blocked partner IDs
    const { data: preferences, error: prefError } = await supabase
      .from('user_partner_preferences')
      .select('partner_id')
      .eq('profile_id', user.id)
      .eq('status', 'blocked');

    if (prefError) {
      console.error('[partnerService] Error fetching blocked partners:', prefError);
      throw new Error(`차단한 파트너 목록을 불러오는데 실패했습니다: ${prefError.message}`);
    }

    if (!preferences || preferences.length === 0) return [];

    const partnerIds = preferences.map(p => p.partner_id);

    // Fetch partner details from partners VIEW
    const { data, error } = await supabase
      .from('partners')
      .select('*')
      .in('id', partnerIds)
      .order('rating', { ascending: false });

    if (error) {
      console.error('[partnerService] Error fetching blocked partner details:', error);
      throw new Error(`차단한 파트너 상세 정보를 불러오는데 실패했습니다: ${error.message}`);
    }

    return applyPartnerMetrics((data || []).map(mapPartner));
  } catch (error) {
    console.error('[partnerService] getBlockedPartners failed:', error);
    throw error;
  }
};

/**
 * Check if a partner is hidden
 */
export const isPartnerHidden = async (partnerId: string): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data } = await supabase
      .from('user_partner_preferences')
      .select('status')
      .eq('profile_id', user.id)
      .eq('partner_id', partnerId)
      .single();

    return data?.status === 'hidden';
  } catch (error) {
    console.error('[partnerService] isPartnerHidden failed:', error);
    return false;
  }
};

/**
 * Check if a partner is blocked
 */
export const isPartnerBlocked = async (partnerId: string): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data } = await supabase
      .from('user_partner_preferences')
      .select('status')
      .eq('profile_id', user.id)
      .eq('partner_id', partnerId)
      .single();

    return data?.status === 'blocked';
  } catch (error) {
    console.error('[partnerService] isPartnerBlocked failed:', error);
    return false;
  }
};


/**
 * Fetch aggregate stats for a single partner:
 * - rating/reviewCount from reviews table
 * - response/matching metrics from live_partner_metrics view
 */
export const getPartnerStats = async (partnerId: string): Promise<PartnerStats> => {
  let rating: number | null = null;
  let reviewCount = 0;
  let responseRate: number | null = null;
  let responseTime: string | null = null;
  let matchingRate: number | null = null;

  try {
    const { data: reviewsData, error: reviewsError } = await supabase
      .from('reviews')
      .select('rating')
      .eq('reviewee_id', partnerId)
      .eq('is_visible', true);

    if (!reviewsError && Array.isArray(reviewsData)) {
      reviewCount = reviewsData.length;
      if (reviewCount > 0) {
        const sum = reviewsData.reduce((acc, cur) => acc + (cur?.rating || 0), 0);
        const avg = sum / reviewCount;
        rating = Number.isFinite(avg) ? Math.round(avg * 10) / 10 : null;
      }
    }
  } catch (error) {
    console.warn('[partnerService] getPartnerStats: reviews fetch failed:', error);
  }

  try {
    const { data: metrics, error: metricsError } = await supabase
      .from('live_partner_metrics')
      .select('response_rate, response_time_hours, matching_rate')
      .eq('user_id', partnerId)
      .maybeSingle();

    if (!metricsError && metrics) {
      // PostgreSQL numeric 타입은 문자열로 반환될 수 있으므로 parseFloat 사용
      const parsedResponseRate = parseFloat(metrics.response_rate as unknown as string);
      const parsedMatchingRate = parseFloat(metrics.matching_rate as unknown as string);
      const parsedResponseTimeHours = parseFloat(metrics.response_time_hours as unknown as string);

      responseRate = !isNaN(parsedResponseRate)
        ? Math.max(0, Math.min(100, parsedResponseRate))
        : null;
      matchingRate = !isNaN(parsedMatchingRate)
        ? Math.max(0, Math.min(100, parsedMatchingRate))
        : null;
      responseTime = !isNaN(parsedResponseTimeHours)
        ? formatResponseTime(parsedResponseTimeHours)
        : null;
    }
  } catch (error) {
    console.warn('[partnerService] getPartnerStats: metrics fetch failed:', error);
  }

  return {
    rating,
    reviewCount,
    responseRate,
    responseTime,
    matchingRate,
  };
};

export const partnerService = {
  getAllPartners,
  getPartnerById,
  getPartnersByCategory,
  getPartnersByActivityField,
  searchPartners,
  searchPartnersWithFilters,
  filterPartners,
  // User preferences
  hidePartner,
  unhidePartner,
  blockPartner,
  unblockPartner,
  getHiddenPartners,
  getBlockedPartners,
  isPartnerHidden,
  isPartnerBlocked,
  getPartnerStats,
};


/* ============================================================================
 * MOCK DATA (Archived for reference)
 * ============================================================================
 *
 * The mock partner data is not migrated to Supabase because it requires
 * actual profile_artists and profile_creatives records created through onboarding.
 *
 * Instead, partner_stats table should be populated when users complete onboarding,
 * and the partners VIEW will automatically combine artists + creatives data.
 *
 * Keeping this commented code for reference during development.
 *
 * ============================================================================

const MOCK_PARTNERS: Partner[] = [
  {
    id: 'p1',
    name: 'Luna Kim',
    activityField: '패션 디자이너',
    specializedRoles: ['지속가능한 패션', '한복 모던화'],
    tags: ['전통적', '미니멀', '브랜딩'],
    bio: '10년 경력의 싱어송라이터입니다. K-POP부터 인디까지 다양한 장르를 소화하며, 감성적이고 트렌디한 음악을 만듭니다.',
    profileImageUrl: 'https://i.pravatar.cc/150?img=1',
    coverImageUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800',
    portfolioImages: [
      'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800',
      'https://images.unsplash.com/photo-1445205170230-053b83016050?w=800',
      'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800',
    ],
    rating: 4.9,
    reviewCount: 23,
    completedProjects: 23,
    region: '서울',
    matchingRate: 95,
    responseRate: 98,
    responseTime: '1시간 이내',
    career: '10년',
    isOnline: true,
    isVerified: true,
    careerHistory: [
      { year: '2024', title: 'Seoul Fashion Week 메인 디자이너', description: '지속가능한 패션을 주제로 한 컬렉션 발표' },
      { year: '2023', title: '한국전통문화대학교 특강', description: '한복의 현대적 재해석에 대한 강연' },
      { year: '2021', title: 'Eco Fashion Award 수상', description: '친환경 소재 활용 우수 디자이너상' },
    ],
    category: '패션',
  },
  // ... (remaining 9 mock partners omitted for brevity)
];

============================================================================ */
