import { supabase } from '../lib/supabase';

/**
 * Ban status information
 */
export interface BanStatus {
  banned_until: string | null;
  username: string | null;
}

/**
 * Inquiry submission data
 */
export interface InquiryData {
  inquiryType: string;
  subject: string;
  contents: string;
  email?: string;
  files?: File[];
  nickname?: string | null;
}

/**
 * Signup inquiry data (public landing page)
 */
export interface SignupInquiryData {
  username: string;
  email: string;
  contents: string;
}

/**
 * Service for handling user inquiries and ban status
 */
export class InquiryService {
  /**
   * Get user's ban status from profiles table
   * @param userId - User ID
   * @returns Ban status information
   */
  static async getBanStatus(userId: string): Promise<BanStatus | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('banned_until, username')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('프로필 조회 실패:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('밴 상태 조회 실패:', error);
      return null;
    }
  }

  /**
   * Get username/nickname from profile tables
   * Tries to get username from profiles table first, then falls back to profile type tables
   * @param userId - User ID
   * @param fallbackUsername - Optional fallback username from profiles table
   * @returns Username or null if not found
   */
  static async getUsernameForInquiry(
    userId: string,
    fallbackUsername?: string | null
  ): Promise<{ nickname: string | null } | null> {
    try {
      // If we already have username from profiles table, use it
      if (fallbackUsername) {
        return { nickname: fallbackUsername || null };
      }

      // Try to get nickname from each profile type table
      // Artist: profile_artists.artist_name
      // Brand: profile_brands.brand_name
      // Creative: profile_creatives.nickname
      // Fan: profiles.nickname (not profile_fans.nickname)
      const [artistResult, brandResult, creativeResult, profilesResult] = await Promise.all([
        supabase
          .from('profile_artists')
          .select('artist_name')
          .eq('profile_id', userId)
          .maybeSingle(),
        supabase
          .from('profile_brands')
          .select('brand_name')
          .eq('profile_id', userId)
          .maybeSingle(),
        supabase
          .from('profile_creatives')
          .select('nickname')
          .eq('profile_id', userId)
          .maybeSingle(),
        supabase
          .from('profiles')
          .select('nickname')
          .eq('id', userId)
          .maybeSingle(),
      ]);

      return (
        {
          nickname: artistResult.data?.artist_name ||
          brandResult.data?.brand_name ||
          creativeResult.data?.nickname ||
          profilesResult.data?.nickname ||
          null
        }
      );
    } catch (error) {
      console.error('사용자 이름 조회 실패:', error);
      return null;
    }
  }

  /**
   * Upload file to Supabase Storage
   * @param file - File to upload
   * @returns Public URL of uploaded file
   */
  static async uploadFile(file: File): Promise<string> {
    try {
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}_${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`;
      const { error } = await supabase.storage
        .from('inquiry-files')
        .upload(fileName, file);

      if (error) throw error;

      const { data } = supabase.storage
        .from('inquiry-files')
        .getPublicUrl(fileName);

      return data.publicUrl;
    } catch (error) {
      console.error('파일 업로드 실패:', error);
      throw error;
    }
  }

  /**
   * Submit an inquiry to the inquiries table
   * @param userId - User ID
   * @param data - Inquiry data
   * @param username - Optional username (will be fetched if not provided)
   */
  static async submitInquiry(
    userId: string,
    data: InquiryData,
    username?: string | null
  ): Promise<void> {
    try {
      // Get username if not provided
      const finalUsername = username || (await this.getUsernameForInquiry(userId));

      const attachments: string[] = [];
      if (data.files && data.files.length > 0) {
        for (const file of data.files) {
          const url = await this.uploadFile(file);
          attachments.push(url);
        }
      }

      const { error } = await supabase.from('inquiries').insert({
        user_id: userId,
        username: finalUsername,
        nickname: data.nickname || null,
        inquiry_type: data.inquiryType,
        subject: data.subject,
        contents: data.contents,
        email: data.email,
        attachments: attachments.length > 0 ? attachments : null,
        status: 'pending',
      });

      if (error) {
        console.error('문의사항 제출 실패:', error);
        throw error;
      }

      console.log('✓ 문의사항 제출 완료');
    } catch (error) {
      console.error('문의사항 제출 실패:', error);
      throw error;
    }
  }

  /**
   * Submit a signup-related inquiry from the public landing page.
   * This does not require authentication and only stores basic contact info.
   */
  static async submitSignupInquiry(data: SignupInquiryData): Promise<void> {
    try {
      const { error } = await supabase.from('inquiries').insert({
        user_id: null,
        username: data.username,
        nickname: null,
        inquiry_type: 'account',
        subject: '가입 문의',
        contents: data.contents,
        email: data.email,
        attachments: null,
        status: 'pending',
      });

      if (error) {
        console.error('가입 문의 제출 실패:', error);
        throw error;
      }

      console.log('✓ 가입 문의 제출 완료');
    } catch (error) {
      console.error('가입 문의 제출 실패:', error);
      throw error;
    }
  }

  /**
   * Submit a ban appeal inquiry (convenience method)
   * @param userId - User ID
   * @param subject - Inquiry subject
   * @param contents - Inquiry contents
   * @param username - Optional username
   */
  static async submitBanAppeal(
    userId: string,
    subject: string,
    contents: string,
    username?: string | null
  ): Promise<void> {
    return this.submitInquiry(
      userId,
      {
        inquiryType: 'ban_appeal',
        subject,
        contents,
      },
      username
    );
  }

  /**
   * Check if user is currently banned
   * @param userId - User ID
   * @returns True if user is banned, false otherwise
   */
  static async isUserBanned(userId: string): Promise<boolean> {
    try {
      const banStatus = await this.getBanStatus(userId);
      if (!banStatus || !banStatus.banned_until) {
        return false;
      }

      // Check if ban is still active
      const bannedUntil = new Date(banStatus.banned_until);
      const now = new Date();
      return bannedUntil > now;
    } catch (error) {
      console.error('밴 상태 확인 실패:', error);
      return false;
    }
  }
}

// Export singleton instance
export const inquiryService = InquiryService;
