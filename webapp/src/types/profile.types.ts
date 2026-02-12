/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Profile type definitions
 * Type definitions for user profiles
 */

// --- Base Profile Types ---

/** User role types */
export type UserRole = 'brand' | 'artist' | 'creative' | 'fan';

/** Profile status */
export type ProfileStatus = 'active' | 'inactive' | 'pending' | 'suspended' | 'banned';

/** Base profile interface */
export interface BaseProfile {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  status: ProfileStatus;
}

// --- Brand Profile ---

export interface BrandProfile extends BaseProfile {
  brand_name: string;
  activity_field: string;
  target_audiences: string[];
  preferred_creator_types: string[];
  cover_image_url: string | null;
  logo_image_url: string | null;
  collaboration_types: string[];
  monthly_budget: string;
  business_registration_number: string;
  website_url: string | null;
  sns_channel: string | null;
  contact_info: string | null;
  is_verified: boolean;
}

/** Brand profile creation data */
export interface CreateBrandProfileData {
  brand_name: string;
  activity_field: string;
  target_audiences: string[];
  preferred_creator_types: string[];
  coverFile: File | null;
  logoFile: File | null;
  collaboration_types: string[];
  monthly_budget: string;
  business_registration_number: string;
  website_url: string | null;
  sns_channel: string | null;
  contact_info: string | null;
}

// --- Artist Profile ---

export interface ArtistProfile extends BaseProfile {
  artist_name: string;
  activity_field: string;
  tags: string[];
  cover_image_url: string | null;
  logo_image_url: string | null;
  specialized_roles: string[];
  highlight_keywords: string[];
  bio: string;
  portfolio_url: string;
  is_verified: boolean;
}

/** Artist profile creation data */
export interface CreateArtistProfileData {
  artist_name: string;
  activity_field: string;
  tags: string[];
  coverFile: File | null;
  logoFile: File | null;
  specialized_roles: string[];
  highlight_keywords: string[];
  bio: string;
  portfolio_url: string;
}

// --- Creative Profile ---

export interface SnsChannelData {
  type: string;
  url: string;
  is_main: boolean;
  follower_count?: number;
  verified?: boolean;
}

export interface CreativeProfile extends BaseProfile {
  nickname: string;
  profile_image_url: string | null;
  sns_channels: SnsChannelData[];
  acquisition_source: string;
  total_followers?: number;
  engagement_rate?: number;
}

/** Creative profile creation data */
export interface CreateCreativeProfileData {
  nickname: string;
  profileImage: File | null;
  sns_channels: SnsChannelData[];
  acquisition_source: string;
}

// --- Fan Profile ---

export interface FanProfile extends BaseProfile {
  interests: string[];
  persona: string;
  specific_interests: string[];
  preferred_regions: string[];
  notification_preferences: string[];
  cover_image_url: string | null;
  profile_image_url: string | null;
}

/** Fan profile creation data */
export interface CreateFanProfileData {
  interests: string[];
  persona: string;
  specific_interests: string[];
  preferred_regions: string[];
  notification_preferences: string[];
  coverFile?: File | null;
  profileImage?: File | null;
}

// --- Profile Display ---

/** Simplified profile for cards/lists */
export interface ProfileCard {
  id: string;
  name: string;
  type: UserRole;
  avatar_url: string | null;
  cover_url: string | null;
  tags: string[];
  verified: boolean;
}

/** Profile stats */
export interface ProfileStats {
  followers: number;
  following: number;
  posts: number;
  projects: number;
}

// --- Profile Actions ---

/** Profile update data */
export interface UpdateProfileData {
  [key: string]: any;
}

/** Profile search filters */
export interface ProfileSearchFilters {
  role?: UserRole;
  category?: string;
  tags?: string[];
  verified?: boolean;
  status?: ProfileStatus;
  search_query?: string;
}

/** Profile search result */
export interface ProfileSearchResult {
  profiles: ProfileCard[];
  total: number;
  page: number;
  per_page: number;
}
