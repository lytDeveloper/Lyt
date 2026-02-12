/**
 * 사용자 활동 기록 서비스
 * - 활동 CRUD 및 조회
 */

import { supabase } from '../lib/supabase';
import type {
  UserActivity,
  ActivityType,
  ActivityFilters,
  CreateActivityInput,
  DateRangeFilter,
  ActivityCategory,
} from '../types/activity.types';

/**
 * DB 행을 UserActivity 인터페이스로 매핑
 */
function mapActivityRow(row: Record<string, unknown>): UserActivity {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    activityType: row.activity_type as ActivityType,
    relatedEntityType: row.related_entity_type as string | undefined,
    relatedEntityId: row.related_entity_id as string | undefined,
    title: row.title as string,
    description: row.description as string | undefined,
    metadata: row.metadata as Record<string, unknown> | undefined,
    createdAt: row.created_at as string,
    isRead: row.is_read as boolean,
  };
}

/**
 * 날짜 범위 필터를 날짜 문자열로 변환
 */
function getDateRange(range: DateRangeFilter): { startDate?: string; endDate?: string } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (range) {
    case 'today':
      return { startDate: today.toISOString() };
    case 'week': {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return { startDate: weekAgo.toISOString() };
    }
    case 'month': {
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return { startDate: monthAgo.toISOString() };
    }
    default:
      return {};
  }
}

export class ActivityService {
  /**
   * 활동 기록 생성
   */
  static async createActivity(input: CreateActivityInput): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('user_activities')
        .insert({
          user_id: input.userId,
          activity_type: input.activityType,
          title: input.title,
          description: input.description,
          related_entity_type: input.relatedEntityType,
          related_entity_id: input.relatedEntityId,
          metadata: input.metadata || {},
        })
        .select('id')
        .single();

      if (error) throw error;
      return data?.id || null;
    } catch (error) {
      console.error('[ActivityService] createActivity failed:', error);
      return null;
    }
  }

  /**
   * RPC 함수를 통한 활동 기록 생성 (서비스 역할 권한)
   */
  static async createActivityViaRPC(input: CreateActivityInput): Promise<string | null> {
    try {
      const { data, error } = await supabase.rpc('insert_user_activity', {
        p_user_id: input.userId,
        p_activity_type: input.activityType,
        p_title: input.title,
        p_description: input.description || null,
        p_related_entity_type: input.relatedEntityType || null,
        p_related_entity_id: input.relatedEntityId || null,
        p_metadata: input.metadata || {},
      });

      if (error) throw error;
      return data as string | null;
    } catch (error) {
      console.error('[ActivityService] createActivityViaRPC failed:', error);
      return null;
    }
  }

  /**
   * 사용자 활동 목록 조회
   */
  static async getUserActivities(
    userId: string,
    filters?: ActivityFilters
  ): Promise<UserActivity[]> {
    try {
      let query = supabase
        .from('user_activities')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      // 활동 유형 필터
      if (filters?.type && filters.type.length > 0) {
        query = query.in('activity_type', filters.type);
      }

      // 날짜 필터
      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate);
      }

      // 페이지네이션
      if (filters?.limit) {
        const offset = filters.offset || 0;
        query = query.range(offset, offset + filters.limit - 1);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map(mapActivityRow);
    } catch (error) {
      console.error('[ActivityService] getUserActivities failed:', error);
      return [];
    }
  }

  /**
   * 카테고리 기반 활동 조회
   */
  static async getUserActivitiesByCategory(
    userId: string,
    category: ActivityCategory,
    filters?: Omit<ActivityFilters, 'type' | 'category'>
  ): Promise<UserActivity[]> {
    // 카테고리에 해당하는 활동 유형들 가져오기
    const categoryMap = await import('../types/activity.types').then(
      (m) => m.ACTIVITY_CATEGORY_MAP
    );

    const types = Object.entries(categoryMap)
      .filter(([_, cat]) => cat === category)
      .map(([type]) => type as ActivityType);

    return this.getUserActivities(userId, { ...filters, type: types });
  }

  /**
   * 최근 활동 조회 (MyProfile용)
   */
  static async getRecentActivities(userId: string, limit = 3): Promise<UserActivity[]> {
    return this.getUserActivities(userId, { limit });
  }

  /**
   * 날짜 범위 기반 활동 조회
   */
  static async getActivitiesByDateRange(
    userId: string,
    range: DateRangeFilter,
    additionalFilters?: Omit<ActivityFilters, 'startDate' | 'endDate'>
  ): Promise<UserActivity[]> {
    const dateFilter = getDateRange(range);
    return this.getUserActivities(userId, { ...additionalFilters, ...dateFilter });
  }

  /**
   * 활동 읽음 처리
   */
  static async markAsRead(activityId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_activities')
        .update({ is_read: true })
        .eq('id', activityId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('[ActivityService] markAsRead failed:', error);
      return false;
    }
  }

  /**
   * 여러 활동 일괄 읽음 처리
   */
  static async markAllAsRead(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_activities')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('[ActivityService] markAllAsRead failed:', error);
      return false;
    }
  }

  /**
   * 읽지 않은 활동 수 조회
   */
  static async getUnreadCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('user_activities')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('[ActivityService] getUnreadCount failed:', error);
      return 0;
    }
  }

  /**
   * 활동 삭제
   */
  static async deleteActivity(activityId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_activities')
        .delete()
        .eq('id', activityId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('[ActivityService] deleteActivity failed:', error);
      return false;
    }
  }

  /**
   * 날짜별 그룹핑된 활동 조회 (ActivityListPage용)
   */
  static async getGroupedActivities(
    userId: string,
    filters?: ActivityFilters
  ): Promise<Map<string, UserActivity[]>> {
    const activities = await this.getUserActivities(userId, filters);

    const grouped = new Map<string, UserActivity[]>();

    activities.forEach((activity) => {
      const date = new Date(activity.createdAt);
      const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD

      const existing = grouped.get(dateKey) || [];
      grouped.set(dateKey, [...existing, activity]);
    });

    return grouped;
  }
}

// 싱글톤 export
export const activityService = ActivityService;
