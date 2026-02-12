/**
 * 프로필 조회수 서비스
 * - 프로필 조회 기록
 * - 조회수 급증 감지
 */

import { supabase } from '../lib/supabase';
import { activityService } from './activityService';
import type { ProfileViewStats } from '../types/activity.types';

export class ProfileViewService {
  /**
   * 프로필 조회 기록
   * @param profileId 조회된 프로필 ID
   * @param viewerId 조회한 사용자 ID (NULL = 익명)
   */
  static async recordView(profileId: string, viewerId: string | null): Promise<boolean> {
    try {
      // 자기 자신 조회는 기록하지 않음
      if (profileId === viewerId) {
        return false;
      }

      // RPC 함수 사용
      const { data, error } = await supabase.rpc('record_profile_view', {
        p_profile_id: profileId,
        p_viewer_id: viewerId,
      });

      if (error) {
        // 중복 에러는 무시 (같은 날 같은 사용자가 여러 번 조회)
        if (error.code === '23505') {
          return false;
        }
        throw error;
      }

      // 조회 기록 성공 시 급증 체크 (비동기, fire-and-forget)
      if (data) {
        this.checkViewsSpike(profileId).catch((err) =>
          console.warn('[ProfileViewService] checkViewsSpike failed:', err)
        );
      }

      return data as boolean;
    } catch (error) {
      console.error('[ProfileViewService] recordView failed:', error);
      return false;
    }
  }

  /**
   * 프로필 조회 통계 조회
   */
  static async getViewStats(profileId: string): Promise<ProfileViewStats> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

      // 오늘 조회수
      const { count: todayViews } = await supabase
        .from('profile_views')
        .select('*', { count: 'exact', head: true })
        .eq('profile_id', profileId)
        .gte('viewed_at', today);

      // 지난 7일 조회수 (오늘 제외)
      const { count: weekViews } = await supabase
        .from('profile_views')
        .select('*', { count: 'exact', head: true })
        .eq('profile_id', profileId)
        .gte('viewed_at', sevenDaysAgo)
        .lt('viewed_at', today);

      // 전체 조회수
      const { count: totalViews } = await supabase
        .from('profile_views')
        .select('*', { count: 'exact', head: true })
        .eq('profile_id', profileId);

      const avgDaily = (weekViews || 0) / 7;
      const todayCount = todayViews || 0;

      // 급증 판단: 오늘 >= 평균 * 3 AND 최소 10명
      const isSpike = todayCount >= avgDaily * 3 && todayCount >= 10;

      return {
        totalViews: totalViews || 0,
        todayViews: todayCount,
        weeklyAverage: Math.round(avgDaily * 10) / 10, // 소수점 1자리
        isSpike,
      };
    } catch (error) {
      console.error('[ProfileViewService] getViewStats failed:', error);
      return {
        totalViews: 0,
        todayViews: 0,
        weeklyAverage: 0,
        isSpike: false,
      };
    }
  }

  /**
   * 조회수 급증 체크 및 활동 기록 생성
   * @returns true if spike detected and activity created
   */
  static async checkViewsSpike(profileId: string): Promise<boolean> {
    try {
      // RPC 함수로 급증 체크
      const { data: isSpike, error } = await supabase.rpc('check_profile_views_spike', {
        p_profile_id: profileId,
      });

      if (error) throw error;

      if (isSpike) {
        // 오늘 이미 급증 활동이 기록되었는지 확인
        const today = new Date().toISOString().split('T')[0];
        const { data: existingActivity } = await supabase
          .from('user_activities')
          .select('id')
          .eq('user_id', profileId)
          .eq('activity_type', 'profile_views_spike')
          .gte('created_at', today)
          .maybeSingle();

        if (existingActivity) {
          // 오늘 이미 기록됨
          return false;
        }

        // 통계 정보 가져오기
        const stats = await this.getViewStats(profileId);

        // 활동 기록 생성
        await activityService.createActivity({
          userId: profileId,
          activityType: 'profile_views_spike',
          title: '오늘 프로필 조회수가 급증했습니다!',
          description: `${stats.todayViews}명이 회원님의 프로필을 확인했어요.`,
          metadata: {
            todayViews: stats.todayViews,
            avgDaily: stats.weeklyAverage,
          },
        });

        return true;
      }

      return false;
    } catch (error) {
      console.error('[ProfileViewService] checkViewsSpike failed:', error);
      return false;
    }
  }

  /**
   * 최근 조회자 목록 조회
   */
  static async getRecentViewers(
    profileId: string,
    limit = 10
  ): Promise<Array<{ viewerId: string | null; viewedAt: string }>> {
    try {
      const { data, error } = await supabase
        .from('profile_views')
        .select('viewer_id, viewed_at')
        .eq('profile_id', profileId)
        .order('viewed_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map((row) => ({
        viewerId: row.viewer_id,
        viewedAt: row.viewed_at,
      }));
    } catch (error) {
      console.error('[ProfileViewService] getRecentViewers failed:', error);
      return [];
    }
  }

  /**
   * 일별 조회수 통계 (차트용)
   */
  static async getDailyViewStats(
    profileId: string,
    days = 30
  ): Promise<Array<{ date: string; views: number }>> {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

      const { data, error } = await supabase
        .from('profile_view_daily_stats')
        .select('view_date, daily_views')
        .eq('profile_id', profileId)
        .gte('view_date', startDate)
        .order('view_date', { ascending: true });

      if (error) throw error;

      return (data || []).map((row) => ({
        date: row.view_date,
        views: row.daily_views,
      }));
    } catch (error) {
      console.error('[ProfileViewService] getDailyViewStats failed:', error);
      return [];
    }
  }
}

// 싱글톤 export
export const profileViewService = ProfileViewService;
