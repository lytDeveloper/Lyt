/**
 * 로그인 스트릭 서비스
 * - 연속 출석 기록 관리
 * - 꾸준함의 힘 배지 연동
 */

import { supabase } from '../lib/supabase';
import { badgeAutoGrantService } from './badgeAutoGrantService';
import type { LoginStreak } from '../types/activity.types';

export class LoginStreakService {
  /**
   * 로그인 시 스트릭 업데이트
   * @returns 현재 스트릭 수
   * 트리거 위치: AuthCallback.tsx 또는 앱 초기화 시
   */
  static async updateStreak(userId: string): Promise<number> {
    try {
      // RPC 함수 사용하여 스트릭 업데이트
      const { data, error } = await supabase.rpc('update_login_streak', {
        p_user_id: userId,
      });

      if (error) throw error;

      const currentStreak = data as number;

      // 꾸준함의 힘 배지 체크
      if (currentStreak >= 7) {
        await badgeAutoGrantService.checkPersistentBadge(userId);
      }

      return currentStreak;
    } catch (error) {
      console.error('[LoginStreakService] updateStreak failed:', error);

      // RPC 실패 시 직접 로직 실행
      return this.updateStreakManual(userId);
    }
  }

  /**
   * 스트릭 업데이트 (수동 로직 - RPC 실패 시 폴백)
   */
  private static async updateStreakManual(userId: string): Promise<number> {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    try {
      // 기존 스트릭 조회
      const { data: existing } = await supabase
        .from('user_login_streaks')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (!existing) {
        // 첫 로그인 - 새 레코드 생성
        await supabase.from('user_login_streaks').insert({
          user_id: userId,
          current_streak: 1,
          longest_streak: 1,
          last_login_date: today,
          streak_start_date: today,
        });
        return 1;
      }

      const lastDate = new Date(existing.last_login_date);
      const todayDate = new Date(today);
      const diffDays = Math.floor(
        (todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diffDays === 0) {
        // 오늘 이미 로그인 - 아무것도 하지 않음
        return existing.current_streak;
      } else if (diffDays === 1) {
        // 연속 로그인
        const newStreak = existing.current_streak + 1;
        const newLongest = Math.max(existing.longest_streak, newStreak);

        await supabase
          .from('user_login_streaks')
          .update({
            current_streak: newStreak,
            longest_streak: newLongest,
            last_login_date: today,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);

        // 꾸준함의 힘 배지 체크
        if (newStreak >= 7) {
          await badgeAutoGrantService.checkPersistentBadge(userId);
        }

        return newStreak;
      } else {
        // 스트릭 끊김 - 리셋
        await supabase
          .from('user_login_streaks')
          .update({
            current_streak: 1,
            last_login_date: today,
            streak_start_date: today,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);

        return 1;
      }
    } catch (error) {
      console.error('[LoginStreakService] updateStreakManual failed:', error);
      return 0;
    }
  }

  /**
   * 현재 스트릭 정보 조회
   */
  static async getStreak(userId: string): Promise<LoginStreak | null> {
    try {
      const { data, error } = await supabase
        .from('user_login_streaks')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return {
        userId: data.user_id,
        currentStreak: data.current_streak,
        longestStreak: data.longest_streak,
        lastLoginDate: data.last_login_date,
        streakStartDate: data.streak_start_date,
      };
    } catch (error) {
      console.error('[LoginStreakService] getStreak failed:', error);
      return null;
    }
  }

  /**
   * 스트릭이 끊길 위험이 있는지 확인
   * (마지막 로그인이 어제인 경우)
   */
  static async isStreakAtRisk(userId: string): Promise<boolean> {
    try {
      const streak = await this.getStreak(userId);
      if (!streak || streak.currentStreak === 0) return false;

      const lastDate = new Date(streak.lastLoginDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const diffDays = Math.floor(
        (today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      // 마지막 로그인이 어제면 위험
      return diffDays === 1;
    } catch (error) {
      console.error('[LoginStreakService] isStreakAtRisk failed:', error);
      return false;
    }
  }
}

// 싱글톤 export
export const loginStreakService = LoginStreakService;
