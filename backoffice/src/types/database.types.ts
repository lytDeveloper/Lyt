// Supabase Database Types
export interface Database {
  public: {
    Tables: {
      admins: {
        Row: Admin;
        Insert: Omit<Admin, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Admin, 'profile_id' | 'created_at'>>;
      };
      profile_artists: {
        Row: ProfileArtist;
        Insert: Omit<ProfileArtist, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ProfileArtist, 'id' | 'created_at'>>;
      };
      profile_brands: {
        Row: ProfileBrand;
        Insert: Omit<ProfileBrand, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ProfileBrand, 'id' | 'created_at'>>;
      };
      profile_creatives: {
        Row: ProfileCreative;
        Insert: Omit<ProfileCreative, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<ProfileCreative>;
      };
      profile_fans: {
        Row: ProfileFan;
        Insert: Omit<ProfileFan, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ProfileFan, 'id' | 'created_at'>>;
      };
      admin_activity_logs: {
        Row: AdminActivityLog;
        Insert: Omit<AdminActivityLog, 'id' | 'created_at'>;
        Update: Partial<Omit<AdminActivityLog, 'id' | 'created_at'>>;
      };
      inquiries: {
        Row: Inquiry;
        Insert: Omit<Inquiry, 'inquiry_id' | 'created_at'>;
        Update: Partial<Omit<Inquiry, 'inquiry_id' | 'created_at'>>;
      };
      feedbacks: {
        Row: Feedback;
        Insert: Omit<Feedback, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Feedback, 'id' | 'user_id' | 'created_at'>>;
      };
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>;
      };
      homepage_slider_images: {
        Row: HomepageSliderImage;
        Insert: Omit<HomepageSliderImage, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<HomepageSliderImage, 'id' | 'created_at'>>;
      };
      homepage_trending_projects: {
        Row: HomepageTrendingProject;
        Insert: Omit<HomepageTrendingProject, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<HomepageTrendingProject, 'id' | 'created_at'>>;
      };
    };
    Views: {
      admin_all_users: {
        Row: AdminAllUsersView;
      };
    };
  };
}

// ============================================
// Admin Types
// ============================================
export type AdminPermission =
  | 'inquiry_management'
  | 'user_management'
  | 'content_management'
  | 'statistics_view'
  | 'approval_management'
  | 'admin_management'
  | 'system_settings'
  | 'log_view'
  | 'feedback_management';

export interface Admin {
  profile_id: string;
  email: string;
  username?: string | null;
  role: 'admin' | 'super_admin';
  permissions: AdminPermission[];
  created_at: string;
  updated_at: string;
}

export interface AdminActivityLog {
  id: string;
  admin_profile_id: string;
  target_admin_profile_id: string | null;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
}

// ============================================
// Profile Types
// ============================================

// Base Profile (public.profiles 테이블)
export interface Profile {
  id: string;
  nickname: string | null;
  roles: string[]; // 활성화된 프로필들의 role 배열 (fan, brand, artist, creative)
  last_access: string | null;
  banned_until: string | null;
  created_at: string;
  updated_at: string;
}

// Artist Profile
export interface ProfileArtist {
  id: string;
  profile_id: string;
  artist_name: string;
  activity_field: string;
  tags: string[];
  specialized_roles: string[];
  highlight_keywords: string[];
  bio: string;
  portfolio_url: string | null;
  cover_image_url: string;
  logo_image_url: string;
  created_at: string;
  updated_at: string;
}

// Brand Profile
export interface ProfileBrand {
  id: string;
  profile_id: string;
  brand_name: string;
  activity_field: string;
  target_audience: string[];
  preferred_creator_type: string[];
  cover_image_url: string;
  logo_image_url: string;
  collaboration_types: string[];
  monthly_budget: string;
  website_url: string | null;
  sns_channel: string | null;
  contact_info: string | null;
  established_at: string | null;
  approval_status: 'pending' | 'approved' | 'rejected';
  approved_at: string | null;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
}

// Creative Profile
export interface ProfileCreative {
  id: string;
  profile_id: string;
  nickname: string;
  profile_image_url: string | null;
  sns_channels: SnsChannel[];
  acquisition_source: string;
  created_at: string;
  updated_at: string;
}

export interface SnsChannel {
  type: string;
  url: string;
  is_main: boolean;
}

// Fan Profile
export interface ProfileFan {
  id: string;
  profile_id: string;
  nickname: string;
  interests: string[];
  persona: string;
  specific_interests: string[];
  preferred_regions: string[];
  notification_preferences: string[];
  created_at: string;
  updated_at: string;
}

// ============================================
// View Types
// ============================================

// Admin All Users View
export interface AdminAllUsersView {
  user_type: 'artist' | 'brand' | 'creative' | 'fan';
  profile_id: string;
  display_name: string;
  category: string | null;
  created_at: string;
  approval_status: 'pending' | 'approved' | 'rejected';
  email: string;
  last_access: string | null;
}

// ============================================
// Dashboard Statistics Types
// ============================================

export interface DashboardStats {
  totalUsers: number;
  totalArtists: number;
  totalBrands: number;
  totalCreatives: number;
  totalFans: number;
  pendingApprovals: number;
}

export interface DailySignupData {
  date: string;
  count: number;
  artists: number;
  brands: number;
  creatives: number;
  fans: number;
}

export interface UserTypeDistribution {
  name: string;
  value: number;
  color: string;
}

// ============================================
// User Type Guard
// ============================================

export type UserType = 'artist' | 'brand' | 'creative' | 'fan';

export type UserProfile = ProfileArtist | ProfileBrand | ProfileCreative | ProfileFan;

// ============================================
// Inquiry Types
// ============================================

export type InquiryType = 'ban_appeal' | 'general' | 'account' | 'project' | 'payment' | 'bug' | 'technical' | 'other';

export type InquiryStatus = 'pending' | 'in_progress' | 'resolved' | 'closed';

export interface Inquiry {
  inquiry_id: string;
  user_id: string;
  username: string | null;
  nickname: string | null;
  email: string | null;
  inquiry_type: InquiryType;
  subject: string;
  contents: string;
  created_at: string;
  status: InquiryStatus;
  manager_profile_id: string | null;
  answered_at: string | null;
  answer_content: string | null;
  attachments: unknown;
}

// ============================================
// Feedback Types
// ============================================

export type FeedbackStatus = 'pending' | 'in_progress' | 'resolved' | 'rejected';

export interface Feedback {
  id: string;
  user_id: string;
  feedback_type: string;
  satisfaction_rating: number | null;
  email: string | null;
  title: string;
  content: string;
  status: FeedbackStatus;
  responder_id: string | null;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// Homepage Management Types
// ============================================

export interface HomepageSliderImage {
  id: string;
  image_url: string | null;
  video_url: string | null;
  media_type: 'image' | 'video' | null;
  link_url: string | null;
  background_color: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface HomepageTrendingProject {
  id: string;
  title: string;
  category: string | null;
  cover_image_url: string | null;
  display_order: number | null;
  is_trending: boolean;
  status: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExploreFeaturedItem {
  id: string;
  title: string;
  type: 'project' | 'collaboration';
  category: string | null;
  cover_image_url: string | null;
  explore_order: number | null;
  status: string | null;
}

export interface HomepageMagazine {
  id: string;
  title: string;
  subtitle: string | null;
  content: string | null;
  cover_image_url: string | null;
  images: string[] | null;
  is_featured: boolean;
  is_trending: boolean;
  author_id: string | null;
  published_at: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface MagazineContentBlock {
  type: 'text' | 'image';
  content?: string | null;
  url?: string | null;
  caption?: string | null;
}

export interface Magazine {
  id: string;
  author_id: string | null;
  title: string;
  subtitle: string | null;
  content: string;
  content_blocks: MagazineContentBlock[] | null;
  excerpt: string | null;
  category: '트렌드' | '인터뷰' | '가이드' | '뉴스' | '리뷰' | '케이스스터디' | '인사이트' | '브랜드 스토리';
  tags: string[] | null;
  cover_image_url: string;
  images: string[] | null;
  video_url: string | null;
  reading_time: number | null;
  difficulty_level: 'beginner' | 'intermediate' | 'advanced' | null;
  view_count: number | null;
  like_count: number | null;
  comment_count: number | null;
  bookmark_count: number | null;
  share_count: number | null;
  status: 'draft' | 'published' | 'archived' | 'deleted';
  is_featured: boolean | null;
  is_trending: boolean | null;
  is_editor_pick: boolean | null;
  meta_title: string | null;
  meta_description: string | null;
  meta_keywords: string[] | null;
  slug: string | null;
  created_at: string | null;
  updated_at: string | null;
  published_at: string | null;
  display_order: number;
  related_project: string | null;
  is_active: boolean | null;
  updated_by: string | null;
}

