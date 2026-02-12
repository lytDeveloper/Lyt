/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * API type definitions
 * Type definitions for API requests and responses
 */

// --- API Response Types ---

/** Generic API response wrapper */
export interface ApiResponse<T = any> {
  data: T;
  error: ApiError | null;
  status: number;
}

/** API error object */
export interface ApiError {
  message: string;
  code: string;
  details?: any;
}

/** Paginated response */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

// --- Image Upload Types ---

/** Storage bucket types */
export type StorageBucket =
  | 'brand-covers'
  | 'brand-logos'
  | 'artist-covers'
  | 'artist-logos'
  | 'creative-profiles'
  | 'fan-profiles';

/** Image upload result */
export interface ImageUploadResult {
  url: string;
  path: string;
  filename: string;
}

/** Profile images upload result */
export interface ProfileImagesUploadResult {
  coverUrl: string | null;
  logoUrl: string | null;
}

// --- Auth Types ---

/** User session */
export interface UserSession {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: UserData;
}

/** User data */
export interface UserData {
  id: string;
  email: string;
  email_confirmed_at: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
  user_metadata: UserMetadata;
}

/** User metadata */
export interface UserMetadata {
  avatar_url?: string;
  full_name?: string;
  provider?: string;
}

/** Auth state */
export interface AuthState {
  isAuthenticated: boolean;
  user: UserData | null;
  session: UserSession | null;
  loading: boolean;
}

// --- Notification Types ---

/** Notification audience */
export type NotificationAudience = 'all' | 'creator' | 'brand' | 'admin';

/** Notification type */
export type NotificationType = 'announcement' | 'update' | 'maintenance' | 'event';

/** Notification object */
export interface Notification {
  id: string;
  title: string;
  content: string;
  type: NotificationType;
  audience: NotificationAudience[];
  start_date: string;
  end_date: string | null;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  priority: number;
  action_url: string | null;
  dismissable: boolean;
}

/** Notification creation data */
export interface CreateNotificationData {
  title: string;
  content: string;
  type: NotificationType;
  audience: NotificationAudience[];
  start_date: string;
  end_date: string | null;
  priority?: number;
  action_url?: string | null;
  dismissable?: boolean;
}

// --- Admin Types ---

/** Admin role */
export type AdminRole = 'admin' | 'super_admin';

/** Admin permissions */
export type AdminPermission =
  | 'users_read'
  | 'users_write'
  | 'approvals_read'
  | 'approvals_write'
  | 'notifications_read'
  | 'notifications_write'
  | 'homepage_read'
  | 'homepage_write';

/** Admin user */
export interface AdminUser {
  id: string;
  user_id: string;
  role: AdminRole;
  permissions: AdminPermission[];
  created_at: string;
  updated_at: string;
  last_login: string | null;
}

/** Admin activity log */
export interface AdminActivityLog {
  id: string;
  admin_id: string;
  action: string;
  target_type: string;
  target_id: string | null;
  details: any;
  ip_address: string | null;
  created_at: string;
}

// --- Homepage Management Types ---

/** Homepage section types */
export type HomepageSectionType =
  | 'slider'
  | 'trending_projects'
  | 'recommended_profiles'
  | 'new_brands'
  | 'magazines'
  | 'popular_events'
  | 'spotlight_brands';

/** Slider image */
export interface SliderImage {
  id: string;
  image_url: string;
  link_url: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

/** Magazine article */
export interface Magazine {
  id: string;
  title: string;
  subtitle: string | null;
  content: string;
  hero_image_urls: string[];
  author: string;
  published_at: string;
  is_featured: boolean;
  tags: string[];
  view_count: number;
  created_at: string;
  updated_at: string;
}

// --- Inquiry Types ---

/** Inquiry status */
export type InquiryStatus = 'pending' | 'in_progress' | 'resolved' | 'closed';

/** Inquiry type */
export type InquiryType = 'general' | 'technical' | 'billing' | 'report' | 'other';

/** Inquiry object */
export interface Inquiry {
  id: string;
  user_id: string;
  type: InquiryType;
  subject: string;
  content: string;
  status: InquiryStatus;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

// --- Request/Response Helpers ---

/** Query parameters */
export interface QueryParams {
  [key: string]: string | number | boolean | undefined;
}

/** Request config */
export interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  params?: QueryParams;
  timeout?: number;
}
