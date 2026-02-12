/**
 * Community Tab Types
 *
 * Defines types for real-time community features including
 * community items (projects/collaborations), activity feed,
 * and tab navigation.
 */

export interface CommunityItem {
  id: string;
  type: 'project' | 'collaboration';
  title: string;
  description: string;
  coverImageUrl: string;
  category: string;
  status: string;
  brandName: string;
  tags: string[];
  viewCount: number;
  likeCount: number;
  commentCount: number;
  latestSupporters: Array<{
    userId: string;
    name: string;
    avatarUrl: string;
  }>;
  latestSupportAt?: string;
  createdAt: string;
  // Progress calculation (workflow steps) - jsonb column from DB
  workflowSteps?: Array<{
    name: string;
    detail: string;
    personInCharge: string;
    isCompleted: boolean;
    completedAt: string | null;
    deadline: string;
  }>;
}

export interface ActivityFeedItem {
  id: string;
  activityType: 'like' | 'comment';
  userId: string;
  userName: string;
  userAvatar: string;
  userRole?: CommunityRole; // 활동 시점의 역할 스냅샷 (좋아요의 경우 actor_role에서 가져옴)
  entityId: string;
  entityType: 'project' | 'collaboration';
  entityTitle: string;
  entityImage: string;
  createdAt: string;
}

export type CommunityTabKey = 'all' | 'project' | 'collaboration';

export interface CommunityFilters {
  itemType?: 'project' | 'collaboration' | 'all';
  category?: string;
  limit?: number;
}

export type CommunityRole = 'artist' | 'creative' | 'brand' | 'fan' | 'unknown';

export interface SupporterUser {
  userId: string;
  name: string;
  avatarUrl: string;
  role: CommunityRole;
  likedAt: string;
}

export interface ViewerUser {
  userId: string;
  name: string;
  avatarUrl: string;
  role: CommunityRole;
  viewedAt: string;
}
