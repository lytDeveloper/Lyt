import { supabase } from '../lib/supabase';
import { CATEGORY_VALUES, getCategoryLabel } from '../constants/projectConstants';
import { BlockService } from './blockService';

// Homepage data interfaces
export interface SliderImage {
  id: string;
  image_url: string | null;
  video_url?: string | null;
  media_type?: 'image' | 'video' | null;
  link_url?: string | null;
  background_color?: string | null;
  display_order?: number;
}

export interface TrendingProject {
  id: string;
  title: string;
  tag: string;
  color: string;
  image_url?: string | null;
  category?: string | null;
  display_order?: number | null;
  status?: string | null;
}

export interface RecommendedProfile {
  id: string;
  name: string;
  job: string;
  color: string;
  image_url?: string | null;
}

export interface NewBrand {
  id: string;
  name: string;
  role: 'brand' | 'partner';
  logo_image_url?: string | null;
  category_field?: string | null;
  created_at?: string;
}

export interface Magazine {
  id: string;
  title: string;
  sub_title: string;
  description: string | null;
  thumbnail_url?: string | null;
  image_url: string[];
}

export interface CategoryProjectItem {
  id: string;
  title: string;
  description: string;
  category?: string | null;
  cover_image_url?: string | null;
}

export interface HomepageData {
  sliderImages: SliderImage[];
  trendingProjects: TrendingProject[];
  recommendedProfiles: RecommendedProfile[];
  newBrands: NewBrand[];
  magazines: Magazine[];
}

/**
 * Service for fetching homepage content data
 * Read-only operations for webapp (backoffice has write operations)
 */
export class HomepageService {
  /**
   * Get all slider images for homepage
   * @returns Array of slider images sorted by display order
   */
  static async getSliderImages(): Promise<SliderImage[]> {
    try {
      const { data, error } = await supabase
        .from('homepage_slider_images')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;

      // Additional client-side sorting to ensure order
      const sortedData = (data || []).sort((a, b) => {
        const orderA = typeof a.display_order === 'number' ? a.display_order : 0;
        const orderB = typeof b.display_order === 'number' ? b.display_order : 0;
        return orderA - orderB;
      });

      return sortedData.map(item => ({
        id: item.id,
        image_url: item.image_url,
        video_url: item.video_url,
        media_type: item.media_type,
        link_url: item.link_url,
        background_color: item.background_color,
        display_order: item.display_order,
      }));
    } catch (error) {
      console.error('슬라이더 이미지 로드 실패:', error);
      return [];
    }
  }

  /**
   * Get trending projects
   * @returns Array of trending projects
   */
  static async getTrendingProjects(): Promise<TrendingProject[]> {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id,title,category,cover_image_url,display_order,is_trending,status')
        .eq('is_trending', true)
        .order('display_order', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(item => ({
        id: item.id,
        title: item.title,
        tag: item.category ? getCategoryLabel(item.category) : '프로젝트',
        category: item.category,
        color: '#E5E7EB',
        image_url: item.cover_image_url,
        display_order: item.display_order,
        status: item.status,
      }));
    } catch (error) {
      console.error('급상승 프로젝트 로드 실패:', error);
      return [];
    }
  }

  /**
   * Get recommended profiles
   * @param offset - Pagination offset (default: 0)
   * @param limit - Pagination limit (default: 10)
   * @param userId - 로그인 사용자 ID (차단 필터링용, optional)
   * @returns Array of recommended profiles
   */
  static async getRecommendedProfiles(offset: number = 0, limit: number = 10, userId?: string): Promise<RecommendedProfile[]> {
    try {
      // 차단 필터링을 위해 더 많은 데이터 조회
      const fetchLimit = userId ? limit + 20 : limit;

      const { data, error } = await supabase
        .from('partners')
        .select('id, name, activity_field, role, profile_image_url')
        .order('rating', { ascending: false })
        .range(offset, offset + fetchLimit - 1);

      if (error) throw error;

      let filteredData = data || [];

      // 로그인 사용자인 경우 차단 및 역방향 숨기기 필터링
      // - 내가 차단한 프로필 제외
      // - 나를 숨긴 프로필 제외 (역방향 숨기기)
      if (userId && filteredData.length > 0) {
        const [blockedIds, hiddenByIds] = await Promise.all([
          BlockService.getBlockedUserIds(userId),
          BlockService.getHiddenByUserIds(userId),
        ]);
        const excludeSet = new Set([...blockedIds, ...hiddenByIds]);
        filteredData = filteredData.filter((item) => !excludeSet.has(item.id));
      }

      // limit 적용
      filteredData = filteredData.slice(0, limit);

      const fallbackColors = ['#FDE68A', '#BFDBFE', '#FBCFE8', '#A7F3D0', '#FECACA', '#DDD6FE'];

      return filteredData.map((item, index) => ({
        id: item.id,
        name: item.name,
        job: item.activity_field || item.role || 'Creator',
        color: fallbackColors[(offset + index) % fallbackColors.length],
        image_url: item.profile_image_url,
      }));
    } catch (error) {
      console.error('추천 프로필 로드 실패:', error);
      return [];
    }
  }

  /**
   * Get new brands/artists
   * @param userId - 로그인 사용자 ID (차단 필터링용, optional)
   * @returns Array of new brands and artists (latest 8)
   */
  static async getNewBrands(userId?: string): Promise<NewBrand[]> {
    try {
      // 차단 필터링을 위해 더 많은 데이터 조회
      const fetchLimit = userId ? 20 : 8;

      const { data, error } = await supabase
        .from('homepage_new_brands_artists')
        .select('id, name, role, logo_image_url, category_field, created_at')
        .order('created_at', { ascending: false })
        .limit(fetchLimit);

      if (error) throw error;

      let filteredData = data || [];

      // 로그인 사용자인 경우 차단 및 역방향 숨기기 필터링
      // - 내가 차단한 브랜드/파트너 제외
      // - 나를 숨긴 브랜드/파트너 제외 (역방향 숨기기)
      if (userId && filteredData.length > 0) {
        const [blockedIds, hiddenByIds] = await Promise.all([
          BlockService.getBlockedUserIds(userId),
          BlockService.getHiddenByUserIds(userId),
        ]);
        const excludeSet = new Set([...blockedIds, ...hiddenByIds]);
        filteredData = filteredData.filter((item) => !excludeSet.has(item.id));
      }

      // 8개로 제한
      filteredData = filteredData.slice(0, 8);

      return filteredData.map(item => ({
        id: item.id,
        name: item.name ?? '',
        role: item.role === 'brand' ? 'brand' : 'partner',
        logo_image_url: item.logo_image_url,
        category_field: item.category_field,
        created_at: item.created_at,
      }));
    } catch (error) {
      console.error('새로운 브랜드/파트너 로드 실패:', error);
      return [];
    }
  }

  /**
   * Get magazines
   * @returns Array of magazines
   */
  static async getMagazines(): Promise<Magazine[]> {
    try {
      const { data, error } = await supabase
        .from('magazines')
        .select('id, title, subtitle, excerpt, cover_image_url, images, display_order')
        .eq('status', 'published')
        .eq('is_active', true)
        .not('display_order', 'is', null)
        .lt('display_order', 5)
        .order('display_order', { ascending: true })
        .limit(5);

      if (error) throw error;

      return (data || []).map(item => ({
        id: item.id,
        title: item.title,
        sub_title: item.subtitle,
        description: item.excerpt,
        thumbnail_url: item.cover_image_url || (Array.isArray(item.images) ? item.images[0] : null),
        image_url: item.images || [],
        display_order: item.display_order,
      }));
    } catch (error) {
      console.error('매거진 로드 실패:', error);
      return [];
    }
  }

  /**
   * Get projects for a specific category (lightweight for homepage)
   * @param categoryLabel - Korean UI label (e.g., '음악')
   * @param limit - Number of items to fetch (default: 10)
   */
  static async getCategoryProjects(categoryLabel: string, limit: number = 10): Promise<CategoryProjectItem[]> {
    try {
      const categoryValue = CATEGORY_VALUES[categoryLabel] ?? categoryLabel;

      const { data, error } = await supabase
        .from('projects')
        .select('id,title,description,category,cover_image_url,created_at')
        .eq('category', categoryValue)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map(item => ({
        id: item.id,
        title: item.title ?? '',
        description: item.description ?? '',
        category: item.category,
        cover_image_url: item.cover_image_url,
      }));
    } catch (error) {
      console.error('카테고리별 프로젝트 로드 실패:', error);
      return [];
    }
  }

  /**
   * Get a single magazine by ID
   * @param magazineId - Magazine ID
   * @returns Magazine data or null if not found
   */
  static async getMagazineById(magazineId: string): Promise<Magazine | null> {
    try {
      const { data, error } = await supabase
        .from('magazines')
        .select('*')
        .eq('id', magazineId)
        .eq('is_active', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows found
          return null;
        }
        throw error;
      }

      return {
        id: data.id,
        title: data.title,
        sub_title: data.sub_title,
        description: data.description,
        thumbnail_url: data.thumbnail_url,
        image_url: data.image_url || [],
      };
    } catch (error) {
      console.error('매거진 상세 로드 실패:', error);
      return null;
    }
  }

  /**
   * Get all homepage data in one call (parallel fetching)
   * @returns Complete homepage data object
   */
  static async getAllHomepageData(includePersonalized: boolean = true): Promise<HomepageData> {
    try {
      const [sliderImages, trendingProjects, magazines] = await Promise.all([
        this.getSliderImages(),
        this.getTrendingProjects(),
        this.getMagazines(),
      ]);

      const [recommendedProfiles, newBrands] = includePersonalized
        ? await Promise.all([
          this.getRecommendedProfiles(),
          this.getNewBrands(),
        ])
        : [[], []];

      return {
        sliderImages,
        trendingProjects,
        recommendedProfiles,
        newBrands,
        magazines
      };
    } catch (error) {
      console.error('홈페이지 데이터 로드 실패:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const homepageService = HomepageService;
