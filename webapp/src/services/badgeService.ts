import { supabase } from '../lib/supabase';

export interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export interface UserBadge extends Badge {
  obtainedAt: string;
}

export class BadgeService {
  /**
   * Get all available badges
   */
  static async getAllBadges(): Promise<Badge[]> {
    try {
      const { data, error } = await supabase
        .from('badges')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('배지 목록 조회 실패:', error);
      return [];
    }
  }

  /**
   * Get badges earned by a user
   */
  static async getUserBadges(userId: string): Promise<UserBadge[]> {
    try {
      const { data, error } = await supabase
        .from('user_badges')
        .select(`
          obtained_at,
          badges (
            id,
            name,
            icon,
            description
          )
        `)
        .eq('user_id', userId);

      if (error) throw error;

      return (data || []).map((item: any) => ({
        id: item.badges.id,
        name: item.badges.name,
        icon: item.badges.icon,
        description: item.badges.description,
        obtainedAt: item.obtained_at,
      }));
    } catch (error) {
      console.error('사용자 배지 조회 실패:', error);
      return [];
    }
  }

  /**
   * Get all badges with earned status for a user (for display in profile)
   */
  static async getUserBadgesStatus(userId: string): Promise<(Badge & { obtained: boolean })[]> {
    try {
      const [allBadges, userBadges] = await Promise.all([
        this.getAllBadges(),
        this.getUserBadges(userId),
      ]);

      const earnedBadgeIds = new Set(userBadges.map(b => b.id));

      return allBadges.map(badge => ({
        ...badge,
        obtained: earnedBadgeIds.has(badge.id),
      }));
    } catch (error) {
      console.error('배지 상태 조회 실패:', error);
      return [];
    }
  }
}

export const badgeService = BadgeService;

