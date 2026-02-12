/**
 * Explore Types
 * Common types used across explore services
 *
 * IMPORTANT: These types use English values that match the database schema.
 * Use label mapping constants (from projectConstants.ts) to display Korean labels in UI.
 */

// Database values (English)
export type ProjectCategory = 'fashion' | 'beauty' | 'music' | 'contents' | 'healing' | 'market' | 'event' | 'ticket' | 'tech' | 'life' | 'liveShopping' | 'Investment';
export type ProjectStatus = 'draft' | 'open' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold' | 'deleted';
// Stored in profile_brands.activity_field and partners.activity_field (VIEW)


export type DisplaySource = 'partner' | 'brand' | 'profile' | 'fallback';

export interface DisplayInfo {
  displayName: string;
  displayAvatar?: string;
  // Primary domain/field: brand.activity_field / partner.activity_field / profile.roles[0]
  displayField?: string;
  // Secondary label: partner.role (artist/creative). Brands/profiles keep empty.
  displayCategory?: string;
  displaySource: DisplaySource;
}

export interface WorkflowStep {
  id?: string; // 고유 식별자 (uuid 또는 name-personInCharge-deadline 기반 해시)
  name: string;
  detail: string;
  personInCharge: string;
  isCompleted: boolean;
  completedAt: string | null;
  deadline: string;
}

export interface CollaborationMember {
  id: string;
  collaborationId: string;
  userId: string;
  position: string;
  responsibilities?: string;
  status: string; // 'active' | 'inactive' | etc.
  isLeader: boolean;
  canInvite: boolean;
  canEdit: boolean;
  contribution?: string;
  profitShare?: number;
  joinedDate: string;
  leftDate?: string;
  // Partner information (from partners VIEW)
  name: string;
  activityField: string;
  profileImageUrl: string;
  isOnline?: boolean;
}

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  position: string;
  responsibilities?: string;
  status: string; // 'active' | 'inactive' | etc.
  isLeader: boolean;
  canInvite: boolean;
  canEdit: boolean;
  compensation?: string;
  paymentAmount?: number;
  joinedDate: string;
  leftDate?: string;
  // Partner information (from partners VIEW)
  name: string;
  activityField: string;
  profileImageUrl: string;
  isOnline?: boolean;
}

export interface ProjectFile {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedAt: string;
  uploadedBy: string;
  uploadedById?: string; // 업로드한 사용자 ID
  description?: string;
  sharedWith?: 'all' | string[]; // 'all' = 전체 팀원, string[] = 특정 멤버 ID 배열
}

export interface CareerHistoryItem {
  year: string;
  title: string;
  description: string;
}

// Project creation types
export interface CreateProjectInput {
  title: string;
  description: string;
  category: ProjectCategory;
  goal?: string;
  requirements?: string[];
  budget?: string;
  duration?: string; // Will be converted to deadline
  capacity?: number;
  skills?: string[];
  tags?: string[];
  cover_image_url?: string;
  cover_image_file?: File | null;
  video_url?: string;
  scheduled_start_date?: string;
  scheduled_end_date?: string;
}
