import { supabase } from '../lib/supabase';
import { imageUploadService } from './imageUploadService';

// Profile data interfaces
export interface BrandProfileData {
  brandName: string;
  description: string;
  activityField: string;
  targetAudiences: string[];
  preferredCreatorTypes: string[];
  collaborationTypes: string[];
  monthlyBudget: string;
  websiteUrl: string;
  snsChannel: string;
  contactInfo: string;
  tags: string[];
  region: string;
  businessRegistrationNumber: string;
  establishedAt?: string;
  coverFile?: File | null;
  logoFile?: File | null;
  existingCoverUrl?: string;
  existingLogoUrl?: string;
  resetApprovalStatus?: boolean;
}

export interface ArtistProfileData {
  artistName: string;
  activityField: string;
  tags: string[];
  highlightKeywords: string[];
  bio: string;
  portfolioUrl: string | null;
  region: string | null;
  coverFile?: File | null;
  logoFile?: File | null;
  existingCoverUrl?: string;
  existingLogoUrl?: string;
}

export interface CreativeProfileData {
  creatorName: string;
  activityField: string;
  tags: string[];
  bio: string;
  snsChannels: Array<{ platform: string; url: string; is_main: boolean; }>;
  acquisitionSource: string;
  region: string | null;
  coverFile?: File | null;
  logoFile?: File | null;
  existingCoverUrl?: string;
  existingLogoUrl?: string;
}

export interface FanProfileData {
  interests: string[];
  persona: string;
  specificInterests: string[];
  preferredRegions: string[];
  logoFile?: File | null;
  notificationPreferences: string[];
  nickname?: string;
  existingLogoUrl?: string;
}

export interface PortfolioItem {
  title: string;
  category: string;
  description: string;
  skills: string[];
  performed_YM: string;
  coverImage?: string;
}

export interface CareerItem {
  companyName: string;
  position: string;
  description: string;
  period: string;
  skills: string[];
}

export class ProfileService {
  /**
   * Create or update a brand profile
   *
   * @param data - Brand profile data including images
   * @returns Created/updated profile data
   */
  static async createBrandProfile(data: BrandProfileData) {
    try {
      // 1. Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('사용자 인증이 필요합니다.');
      }

      // 1.5. 기존 비팬 프로필 비활성화 (brand 생성 시 artist/creative 비활성화)
      await supabase.rpc('profile_switch', {
        p_user: user.id,
        p_target_type: 'brand'
      });

      // 2. Upload images only if new files are provided
      let coverUrl = data.existingCoverUrl || '';
      let logoUrl = data.existingLogoUrl || '';

      if (data.coverFile && data.logoFile) {
        const uploadResult = await imageUploadService.uploadProfileImages(
          data.coverFile,
          data.logoFile,
          'brand-images'
        );
        coverUrl = uploadResult.coverUrl;
        logoUrl = uploadResult.logoUrl;
      } else if (data.coverFile) {
        const result = await imageUploadService.uploadImage(data.coverFile, 'brand-images');
        coverUrl = result.publicUrl;
      } else if (data.logoFile) {
        const result = await imageUploadService.uploadLogoImage(data.logoFile, 'brand-images');
        logoUrl = result.logoUrl;
      }

      // 3. Save to database
      const { data: profileData, error: upsertError } = await supabase
        .from('profile_brands')
        .upsert({
          profile_id: user.id,
          brand_name: data.brandName,
          description: data.description,
          activity_field: data.activityField,
          target_audiences: data.targetAudiences,
          preferred_creator_types: data.preferredCreatorTypes,
          tags: data.tags,
          cover_image_url: coverUrl,
          logo_image_url: logoUrl,
          collaboration_types: data.collaborationTypes,
          monthly_budget: data.monthlyBudget,
          website_url: data.websiteUrl,
          sns_channel: data.snsChannel,
          contact_info: data.contactInfo,
          region: data.region,
          business_registration_number: data.businessRegistrationNumber,
          established_at: data.establishedAt ? `${data.establishedAt}T00:00:00Z` : null,
          // 사업자 등록번호 변경 시에만 approval_status 초기화
          ...(data.resetApprovalStatus ? { approval_status: 'pending' as const } : {}),
          is_active: true,
        }, {
          onConflict: 'profile_id'
        })
        .select();

      if (upsertError) throw upsertError;

      console.log('✓ 브랜드 프로필 저장 완료:', profileData);
      return profileData;
    } catch (error) {
      console.error('브랜드 프로필 생성 실패:', error);
      throw error;
    }
  }

  /**
   * Create or update an artist profile
   *
   * @param data - Artist profile data including images
   * @returns Created/updated profile data
   */
  static async createArtistProfile(data: ArtistProfileData) {
    try {
      // 1. Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('사용자 인증이 필요합니다.');
      }

      // 1.5. 기존 비팬 프로필 비활성화 (artist 생성 시 brand/creative 비활성화)
      await supabase.rpc('profile_switch', {
        p_user: user.id,
        p_target_type: 'artist'
      });

      // 2. Upload images only if new files are provided
      let coverUrl = data.existingCoverUrl || '';
      let logoUrl = data.existingLogoUrl || '';

      if (data.coverFile && data.logoFile) {
        const uploadResult = await imageUploadService.uploadProfileImages(
          data.coverFile,
          data.logoFile,
          'artist-images'
        );
        coverUrl = uploadResult.coverUrl;
        logoUrl = uploadResult.logoUrl;
      } else if (data.coverFile) {
        const result = await imageUploadService.uploadImage(data.coverFile, 'artist-images');
        coverUrl = result.publicUrl;
      } else if (data.logoFile) {
        const result = await imageUploadService.uploadLogoImage(data.logoFile, 'artist-images');
        logoUrl = result.logoUrl;
      }

      // 3. Save to database
      const { data: profileData, error: upsertError } = await supabase
        .from('profile_artists')
        .upsert({
          profile_id: user.id,
          artist_name: data.artistName,
          activity_field: data.activityField,
          tags: data.tags,
          highlight_keywords: data.highlightKeywords,
          bio: data.bio,
          portfolio_url: data.portfolioUrl || null,
          region: data.region || null,
          cover_image_url: coverUrl,
          logo_image_url: logoUrl,
          is_active: true,
          // 명시적으로 초기화하여 이전 데이터가 유지되지 않도록 함
          career: null,
          career_history: [],
        }, {
          onConflict: 'profile_id'
        })
        .select();

      if (upsertError) throw upsertError;

      console.log('✓ 아티스트 프로필 저장 완료:', profileData);
      return profileData;
    } catch (error) {
      console.error('아티스트 프로필 생성 실패:', error);
      throw error;
    }
  }

  /**
   * Create or update a creative profile
   *
   * @param data - Creative profile data including images
   * @returns Created/updated profile data
   */
  static async createCreativeProfile(data: CreativeProfileData) {
    try {
      // 1. Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('사용자 인증이 필요합니다.');
      }

      // 1.5. 기존 비팬 프로필 비활성화 (creative 생성 시 brand/artist 비활성화)
      await supabase.rpc('profile_switch', {
        p_user: user.id,
        p_target_type: 'creative'
      });

      // 2. Upload images only if new files are provided
      let coverUrl = data.existingCoverUrl || '';
      let logoUrl = data.existingLogoUrl || '';

      if (data.coverFile && data.logoFile) {
        const uploadResult = await imageUploadService.uploadProfileImages(
          data.coverFile,
          data.logoFile,
          'creative-images'
        );
        coverUrl = uploadResult.coverUrl;
        logoUrl = uploadResult.logoUrl;
      } else if (data.coverFile) {
        const result = await imageUploadService.uploadImage(data.coverFile, 'creative-images');
        coverUrl = result.publicUrl;
      } else if (data.logoFile) {
        const result = await imageUploadService.uploadLogoImage(data.logoFile, 'creative-images');
        logoUrl = result.logoUrl;
      }

      // 3. Convert snsChannels format: { platform, url, is_main } -> { type, url, is_main }
      const snsChannelsForDb = data.snsChannels.map((ch: any) => ({
        type: ch.platform || ch.type || '',
        url: ch.url || '',
        is_main: ch.is_main || false,
      }));

      // 4. Find main SNS channel (is_main: true)
      const mainSnsChannel = snsChannelsForDb.find((channel: any) => channel.is_main === true) || null;

      // 5. Save to database
      const { data: profileData, error: upsertError } = await supabase
        .from('profile_creatives')
        .upsert({
          profile_id: user.id,
          nickname: data.creatorName,
          activity_field: data.activityField,
          tags: data.tags,
          bio: data.bio,
          sns_channels: snsChannelsForDb,
          main_sns_channel: mainSnsChannel?.type || '',
          acquisition_source: data.acquisitionSource,
          region: data.region || null,
          cover_image_url: coverUrl,
          profile_image_url: logoUrl,
          is_active: true,
          // 명시적으로 초기화하여 이전 데이터가 유지되지 않도록 함
          career: null,
          career_history: [],
        }, {
          onConflict: 'profile_id'
        })
        .select();

      if (upsertError) throw upsertError;

      console.log('✓ 크리에이티브 프로필 저장 완료:', profileData);
      return profileData;
    } catch (error) {
      console.error('크리에이티브 프로필 생성 실패:', error);
      throw error;
    }
  }

  /**
   * Create or update a fan profile
   *
   * @param data - Fan profile data (images optional)
   * @returns Created/updated profile data
   */
  static async createFanProfile(data: FanProfileData) {
    try {
      // 1. Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('사용자 인증이 필요합니다.');
      }

      // 2. Upload images if provided
      let logoUrl = data.existingLogoUrl || '';

      if (data.logoFile) {
        const result = await imageUploadService.uploadLogoImage(
          data.logoFile,
          'fan-images'
        );
        logoUrl = result.logoUrl;
      }


      // 3. Save to database
      const { data: profileData, error: upsertError } = await supabase
        .from('profile_fans')
        .upsert({
          profile_id: user.id,
          interests: data.interests,
          persona: data.persona,
          specific_interests: data.specificInterests,
          preferred_regions: data.preferredRegions,
          notification_preferences: data.notificationPreferences,
          profile_image_url: logoUrl,
          is_active: true,
        }, {
          onConflict: 'profile_id'
        })
        .select();

      if (upsertError) throw upsertError;

      if (data.nickname && data.nickname.trim()) {
        const { error: nicknameError } = await supabase
          .from('profiles')
          .update({ nickname: data.nickname.trim() })
          .eq('id', user.id);

        if (nicknameError) throw nicknameError;
      }

      console.log('✓ 팬 프로필 저장 완료:', profileData);
      return profileData;
    } catch (error) {
      console.error('팬 프로필 생성 실패:', error);
      throw error;
    }
  }

  /**
   * Get profile by user ID and type
   *
   * @param userId - User ID
   * @param profileType - Profile type (brand, artist, creative, fan)
   * @returns Profile data
   */
  static async getProfile(
    userId: string,
    profileType: 'brand' | 'artist' | 'creative' | 'fan'
  ) {
    const tableMap = {
      brand: 'profile_brands',
      artist: 'profile_artists',
      creative: 'profile_creatives',
      fan: 'profile_fans'
    };

    const { data, error } = await supabase
      .from(tableMap[profileType])
      .select('*')
      .eq('profile_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      throw error;
    }

    return data;
  }

  /**
   * Delete a profile
   *
   * @param userId - User ID
   * @param profileType - Profile type to delete
   */
  static async deleteProfile(
    userId: string,
    profileType: 'brand' | 'artist' | 'creative' | 'fan'
  ) {
    const tableMap = {
      brand: 'profile_brands',
      artist: 'profile_artists',
      creative: 'profile_creatives',
      fan: 'profile_fans'
    };

    const { error } = await supabase
      .from(tableMap[profileType])
      .delete()
      .eq('profile_id', userId);

    if (error) throw error;
  }


  /**
   * Update portfolios for a profile
   */
  static async updatePortfolios(
    userId: string,
    profileType: 'brand' | 'artist' | 'creative',
    portfolios: PortfolioItem[]
  ) {
    const tableMap = {
      brand: 'profile_brands',
      artist: 'profile_artists',
      creative: 'profile_creatives'
    };

    const { error } = await supabase
      .from(tableMap[profileType])
      .update({ portfolios })
      .eq('profile_id', userId);

    if (error) throw error;

    // 포트폴리오 업데이트 활동 기록
    try {
      const { activityService } = await import('./activityService');
      const latestPortfolio = portfolios[portfolios.length - 1];
      const portfolioTitle = latestPortfolio?.title || '포트폴리오';

      await activityService.createActivityViaRPC({
        userId,
        activityType: 'portfolio_updated',
        relatedEntityType: 'user',
        relatedEntityId: userId,
        title: `포트폴리오를 업데이트했어요`,
        description: portfolioTitle,
        metadata: {
          portfolio_count: portfolios.length,
          latest_portfolio_title: portfolioTitle,
        },
      });
    } catch (err) {
      console.warn('[ProfileService] Failed to record portfolio_updated activity:', err);
    }
  }

  /**
   * Update careers for a profile
   */
  static async updateCareers(
    userId: string,
    profileType: 'brand' | 'artist' | 'creative',
    careers: CareerItem[]
  ) {
    const tableMap = {
      brand: 'profile_brands',
      artist: 'profile_artists',
      creative: 'profile_creatives'
    };

    const { error } = await supabase
      .from(tableMap[profileType])
      .update({ careers })
      .eq('profile_id', userId);

    if (error) throw error;

    // 경력 업데이트 활동 기록
    try {
      const { activityService } = await import('./activityService');
      const latestCareer = careers[careers.length - 1];
      const careerTitle = latestCareer?.companyName || '경력';

      await activityService.createActivityViaRPC({
        userId,
        activityType: 'career_updated',
        relatedEntityType: 'user',
        relatedEntityId: userId,
        title: `경력/히스토리를 업데이트했어요`,
        description: careerTitle,
        metadata: {
          career_count: careers.length,
          latest_career_company: careerTitle,
        },
      });
    } catch (err) {
      console.warn('[ProfileService] Failed to record career_updated activity:', err);
    }
  }
}

// Export singleton instance
export const profileService = ProfileService;
