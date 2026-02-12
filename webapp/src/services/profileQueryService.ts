import { supabase } from '../lib/supabase';
import type { ProfileType, ProfileRecordSummary, NonFanProfileSummary } from '../stores/profileStore';

/**
 * Interface for complete user profiles data
 */
export interface UserProfiles {
  userId: string;
  fan: ProfileRecordSummary | null;
  nonfan: NonFanProfileSummary | null;
}

/**
 * Interface for profile with roles array
 */
export interface ProfileWithRoles {
  id: string;
  nickname: string;
  roles: ProfileType[];
  banned_until: string | null;
}

/**
 * Service for querying profile data
 * Centralizes all profile fetching operations to avoid direct Supabase calls in components
 */
export class ProfileQueryService {
  /**
   * Get user's profile with roles array from profiles table
   * @param userId - User ID
   * @returns Profile data with roles or null if not found
   */
  static async getProfileWithRoles(userId: string): Promise<ProfileWithRoles | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nickname, roles, banned_until')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows found
          return null;
        }
        throw error;
      }

      return data as ProfileWithRoles;
    } catch (error) {
      console.error('프로필 역할 조회 실패:', error);
      return null;
    }
  }

  /**
   * Get active fan profile for user
   * @param userId - User ID
   * @returns Fan profile or null if not found
   */
  static async getActiveFanProfile(userId: string): Promise<ProfileRecordSummary | null> {
    try {
      const { data, error } = await supabase
        .from('profile_fans')
        .select('profile_id')
        .eq('profile_id', userId)
        .eq('is_active', true)
        .maybeSingle();

      if (error || !data) return null;

      // Get nickname from profiles table
      const { data: profileData } = await supabase
        .from('profiles')
        .select('nickname')
        .eq('id', userId)
        .single();

      return {
        profile_id: data.profile_id,
        nickname: profileData?.nickname,
      };
    } catch (error) {
      console.error('팬 프로필 조회 실패:', error);
      return null;
    }
  }

  /**
   * Get active non-fan profile (brand, artist, or creative)
   * @param userId - User ID
   * @returns Non-fan profile or null if not found
   */
  static async getActiveNonFanProfile(userId: string): Promise<NonFanProfileSummary | null> {
    try {
      const [brandRes, artistRes, creativeRes] = await Promise.all([
        supabase
          .from('profile_brands')
          .select('profile_id, brand_name, approval_status')
          .eq('profile_id', userId)
          .eq('is_active', true)
          .maybeSingle(),
        supabase
          .from('profile_artists')
          .select('profile_id, artist_name')
          .eq('profile_id', userId)
          .eq('is_active', true)
          .maybeSingle(),
        supabase
          .from('profile_creatives')
          .select('profile_id, nickname')
          .eq('profile_id', userId)
          .eq('is_active', true)
          .maybeSingle(),
      ]);

      if (brandRes.data) {
        return {
          type: 'brand',
          record: {
            profile_id: brandRes.data.profile_id,
            brand_name: brandRes.data.brand_name,
            approval_status: brandRes.data.approval_status,
          },
        };
      }

      if (artistRes.data) {
        return {
          type: 'artist',
          record: {
            profile_id: artistRes.data.profile_id,
            artist_name: artistRes.data.artist_name,
          },
        };
      }

      if (creativeRes.data) {
        return {
          type: 'creative',
          record: {
            profile_id: creativeRes.data.profile_id,
            nickname: creativeRes.data.nickname,
          },
        };
      }

      return null;
    } catch (error) {
      console.error('비팬 프로필 조회 실패:', error);
      return null;
    }
  }

  /**
   * Get all active profiles for a user (fan + one non-fan if exists)
   * @param userId - User ID
   * @returns Object containing fan and non-fan profiles
   */
  static async getAllActiveProfiles(userId: string): Promise<UserProfiles> {
    try {
      const [fan, nonfan] = await Promise.all([
        this.getActiveFanProfile(userId),
        this.getActiveNonFanProfile(userId),
      ]);

      return {
        userId,
        fan,
        nonfan,
      };
    } catch (error) {
      console.error('전체 프로필 조회 실패:', error);
      return {
        userId,
        fan: null,
        nonfan: null,
      };
    }
  }

  /**
   * Check if nickname is already taken
   * @param nickname - Nickname to check
   * @returns True if nickname exists, false otherwise
   */
  static async checkNicknameDuplicate(nickname: string, excludeUserId?: string): Promise<boolean> {
    try {
      let query = supabase
        .from('profiles')
        .select('id')
        .eq('nickname', nickname);

      if (excludeUserId) {
        query = query.neq('id', excludeUserId);
      }

      const { data, error } = await query.maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return !!data;
    } catch (error) {
      console.error('닉네임 중복 확인 실패:', error);
      return false;
    }
  }

  /**
   * Check if artist name is already taken
   * @param artistName - Artist name to check
   * @param excludeProfileId - Optional profile ID to exclude from check (for self-update)
   * @returns True if artist name exists, false otherwise
   */
  static async checkArtistNameDuplicate(artistName: string, excludeProfileId?: string): Promise<boolean> {
    try {
      let query = supabase
        .from('profile_artists')
        .select('profile_id')
        .eq('artist_name', artistName)
        .eq('is_active', true);

      if (excludeProfileId) {
        query = query.neq('profile_id', excludeProfileId);
      }

      const { data, error } = await query.maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return !!data;
    } catch (error) {
      console.error('아티스트 이름 중복 확인 실패:', error);
      return false;
    }
  }

  /**
   * Check if creative nickname is already taken
   * @param nickname - Creative nickname to check
   * @param excludeProfileId - Optional profile ID to exclude from check (for self-update)
   * @returns True if creative nickname exists, false otherwise
   */
  static async checkCreativeNicknameDuplicate(nickname: string, excludeProfileId?: string): Promise<boolean> {
    try {
      let query = supabase
        .from('profile_creatives')
        .select('profile_id')
        .eq('nickname', nickname)
        .eq('is_active', true);

      if (excludeProfileId) {
        query = query.neq('profile_id', excludeProfileId);
      }

      const { data, error } = await query.maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return !!data;
    } catch (error) {
      console.error('크리에이티브 닉네임 중복 확인 실패:', error);
      return false;
    }
  }

  /**
   * Check if brand name is already taken
   * @param brandName - Brand name to check
   * @param excludeProfileId - Optional profile ID to exclude from check (for self-update)
   * @returns True if brand name exists, false otherwise
   */
  static async checkBrandNameDuplicate(brandName: string, excludeProfileId?: string): Promise<boolean> {
    try {
      let query = supabase
        .from('profile_brands')
        .select('profile_id')
        .eq('brand_name', brandName)
        .eq('is_active', true);

      if (excludeProfileId) {
        query = query.neq('profile_id', excludeProfileId);
      }

      const { data, error } = await query.maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return !!data;
    } catch (error) {
      console.error('브랜드명 중복 확인 실패:', error);
      return false;
    }
  }

  /**
   * Get nickname for a specific profile type
   * @param userId - User ID
   * @param type - Profile type
   * @returns Nickname/name for the profile
   */
  static async getNicknameForProfile(
    userId: string,
    type: ProfileType
  ): Promise<string | null> {
    try {
      if (type === 'fan') {
        const { data } = await supabase
          .from('profiles')
          .select('nickname')
          .eq('id', userId)
          .single();
        return data?.nickname || null;
      }

      if (type === 'brand') {
        const { data } = await supabase
          .from('profile_brands')
          .select('brand_name')
          .eq('profile_id', userId)
          .eq('is_active', true)
          .single();
        return data?.brand_name || null;
      }

      if (type === 'artist') {
        const { data } = await supabase
          .from('profile_artists')
          .select('artist_name')
          .eq('profile_id', userId)
          .eq('is_active', true)
          .single();
        return data?.artist_name || null;
      }

      if (type === 'creative') {
        const { data } = await supabase
          .from('profile_creatives')
          .select('nickname')
          .eq('profile_id', userId)
          .eq('is_active', true)
          .single();
        return data?.nickname || null;
      }

      return null;
    } catch (error) {
      console.error('프로필 이름 조회 실패:', error);
      return null;
    }
  }

  /**
   * Update nickname in profiles table
   * @param userId - User ID
   * @param nickname - New nickname
   */
  static async updateNickname(userId: string, nickname: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ nickname })
        .eq('id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('닉네임 업데이트 실패:', error);
      throw error;
    }
  }

  /**
   * Set initial nickname (onboarding)
   * @param userId - User ID
   * @param nickname - Nickname
   */
  static async setInitialNickname(
    userId: string,
    nickname: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          nickname: nickname.trim(),
          roles: ['customer']
        })
        .eq('id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('초기 닉네임 설정 실패:', error);
      throw error;
    }
  }

  /**
   * Switch non-fan profile type (deactivates current, prepares for new)
   * Uses the database RPC function for proper state management
   * @param userId - User ID
   * @param targetType - Target profile type to switch to
   */
  static async switchNonFanType(
    userId: string,
    targetType: Exclude<ProfileType, 'fan'>
  ): Promise<void> {
    try {
      await supabase.rpc('profile_switch', {
        p_user: userId,
        p_target_type: targetType,
      });
    } catch (error) {
      console.error('프로필 타입 전환 실패:', error);
      throw error;
    }
  }

  /**
   * Get profile type-specific data by type and filter
   * Generic method for fetching from profile tables
   * @param type - Profile type
   * @param userId - User ID
   * @returns Profile data or null
   */
  static async getProfileByType(
    type: Exclude<ProfileType, 'fan'>,
    userId: string
  ): Promise<ProfileRecordSummary | NonFanProfileSummary | null> {
    try {
      // customer 는 별도 프로필 테이블이 없으므로 여기서는 처리하지 않는다
      if (type === 'customer') {
        return null;
      }

      const tableMap = {
        brand: 'profile_brands',
        artist: 'profile_artists',
        creative: 'profile_creatives',
      } as const;

      const { data, error } = await supabase
        .from(tableMap[type])
        .select('*')
        .eq('profile_id', userId)
        .eq('is_active', true)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data;
    } catch (error) {
      console.error(`${type} 프로필 조회 실패:`, error);
      return null;
    }
  }

  /**
   * Get random artist profiles for recommendations
   * @param limit - Number of profiles to return
   * @returns Array of artist profiles
   */
  static async getRandomArtists(limit: number = 10): Promise<ProfileRecordSummary[]> {
    try {
      const { data, error } = await supabase
        .from('profile_artists')
        .select('*')
        .eq('is_active', true)
        .limit(limit);

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('아티스트 추천 조회 실패:', error);
      return [];
    }
  }

  /**
   * Get random creative profiles for recommendations
   * @param limit - Number of profiles to return
   * @returns Array of creative profiles
   */
  static async getRandomCreatives(limit: number = 10): Promise<ProfileRecordSummary[]> {
    try {
      const { data, error } = await supabase
        .from('profile_creatives')
        .select('*')
        .eq('is_active', true)
        .limit(limit);

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('크리에이티브 추천 조회 실패:', error);
      return [];
    }
  }
}

// Export singleton instance
export const profileQueryService = ProfileQueryService;
