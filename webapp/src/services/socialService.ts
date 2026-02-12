import { supabase } from '../lib/supabase';
import { getProfileDisplay, getProfileDisplayMapOptimized } from './profileDisplayService';
import { BlockService } from './blockService';
import { getSignedUrls, extractStoragePath } from '../utils/signedUrl';
import { activityService } from './activityService';

// Target types for likes and follows
export type LikeableEntityType = 'user' | 'project' | 'collaboration' | 'brand' | 'partner';

export interface SocialStats {
  followerCount: number;
  followingCount: number;
  likeCount: number; // Received likes (from users)
}

/**
 * 사용자 표시 정보 조회 (알림 metadata용)
 * getProfileDisplay를 사용하여 is_active=true인 활성 프로필만 조회하고, 역할 우선순위 적용
 */
async function getUserDisplayInfo(userId: string): Promise<{ name: string; avatar?: string } | null> {
  try {
    const profileInfo = await getProfileDisplay(userId);
    if (!profileInfo) return null;
    return { name: profileInfo.name, avatar: profileInfo.avatar };
  } catch {
    return null;
  }
}

export class SocialService {
  /**
   * Get social stats for a user (followers, following, likes received)
   */
  static async getSocialStats(userId: string): Promise<SocialStats> {
    try {
      // 1. Count Followers (users following this user)
      const { count: followerCount, error: followerError } = await supabase
        .from('user_user_preferences')
        .select('*', { count: 'exact', head: true })
        .eq('target_id', userId)
        .eq('target_type', 'user')
        .eq('preference_type', 'follow');

      if (followerError) throw followerError;

      // 2. Count Following (users this user follows)
      const { count: followingCount, error: followingError } = await supabase
        .from('user_user_preferences')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('target_type', 'user')
        .eq('preference_type', 'follow');

      if (followingError) throw followingError;

      // 3. Count Likes Received (from other users liking this user)
      // 파트너/브랜드 좋아요도 포함 (target_type이 'user', 'partner', 'brand' 모두 카운트)
      const { count: likeCount, error: likeError } = await supabase
        .from('user_user_preferences')
        .select('*', { count: 'exact', head: true })
        .eq('target_id', userId)
        .in('target_type', ['user', 'partner', 'brand'])
        .eq('preference_type', 'like');

      if (likeError) throw likeError;

      return {
        followerCount: followerCount || 0,
        followingCount: followingCount || 0,
        likeCount: likeCount || 0,
      };
    } catch (error) {
      console.error('소셜 통계 조회 실패:', error);
      return { followerCount: 0, followingCount: 0, likeCount: 0 };
    }
  }

  /**
   * Follow a user
   * Also creates a notification for the target user
   *
   * @param userId - 팔로우하는 사용자 ID
   * @param targetUserId - 팔로우 대상 사용자 ID
   * @param actorInfo - 팔로우 시점의 활성 프로필 정보 (스냅샷 저장용)
   */
  static async followUser(
    userId: string,
    targetUserId: string,
    actorInfo?: {
      role: 'fan' | 'brand' | 'artist' | 'creative';
      profileId: string;
      name: string;
      avatarUrl?: string;
    }
  ): Promise<void> {
    // 자기 자신 팔로우 방지
    if (userId === targetUserId) {
      console.warn('자기 자신을 팔로우할 수 없어요.');
      return;
    }

    try {
      const { error } = await supabase
        .from('user_user_preferences')
        .insert({
          user_id: userId,
          target_id: targetUserId,
          target_type: 'user',
          preference_type: 'follow',
          actor_role: actorInfo?.role ?? null,
          actor_profile_id: actorInfo?.profileId ?? null,
          actor_name: actorInfo?.name ?? null,
          actor_avatar_url: actorInfo?.avatarUrl ?? null,
        });

      if (error) {
        // Ignore duplicate key error (already followed)
        if (error.code === '23505') {
          console.log('이미 팔로우한 사용자에요.');
          return;
        }
        throw error;
      }

      // 팔로우 알림 생성 (타겟 유저에게)
      try {
        // actorInfo가 있으면 스냅샷 사용, 없으면 기존 동적 조회
        let senderName = actorInfo?.name;
        let senderAvatar = actorInfo?.avatarUrl;
        let senderProfileType: 'brand' | 'artist' | 'creative' | 'fan' | undefined = actorInfo?.role;

        if (!senderName) {
          const senderInfo = await getProfileDisplay(userId);
          senderName = senderInfo?.name || '사용자';
          senderAvatar = senderInfo?.avatar;
          // customer는 제외하고 할당
          const pt = senderInfo?.profileType;
          senderProfileType = pt && pt !== 'customer' ? pt : undefined;
        }

        // 수신자의 활성 프로필 타입 조회
        const receiverInfo = await getProfileDisplay(targetUserId);
        const receiverPt = receiverInfo?.profileType;
        const receiverProfileType = receiverPt && receiverPt !== 'customer' ? receiverPt : undefined;

        await supabase
          .from('user_notifications')
          .insert({
            receiver_id: targetUserId, // 알림을 받을 사용자
            receiver_profile_type: receiverProfileType, // 수신자 프로필 타입
            sender_profile_type: senderProfileType, // 발신자 프로필 타입
            type: 'follow',
            title: '새로운 팔로워',
            content: '회원님을 팔로우하기 시작했어요.',
            related_id: userId, // 팔로우한 사용자 프로필로 링크
            related_type: 'user',
            is_read: false,
            metadata: {
              actor_id: userId,
              sender_id: userId,
              sender_name: senderName,
              sender_avatar: senderAvatar,
              sender_profile_type: senderProfileType,
              actor_role: actorInfo?.role,
            },
          });

        // 새 팔로워 활동 기록 (타겟 유저에게)
        await activityService.createActivityViaRPC({
          userId: targetUserId,
          activityType: 'new_follower',
          relatedEntityType: 'user',
          relatedEntityId: userId,
          title: `${senderName || '사용자'}님이 회원님을 팔로우했어요`,
          description: '',
          metadata: {
            follower_id: userId,
            follower_name: senderName,
            follower_avatar: senderAvatar,
          },
        });

        // 팔로우한 활동 기록 (팔로우하는 유저에게)
        await activityService.createActivityViaRPC({
          userId: userId,
          activityType: 'user_followed',
          relatedEntityType: 'user',
          relatedEntityId: targetUserId,
          title: `${receiverInfo?.name || '사용자'}님을 팔로우했어요`,
          description: '',
          metadata: {
            followed_id: targetUserId,
            followed_name: receiverInfo?.name,
            followed_avatar: receiverInfo?.avatar,
          },
        });
      } catch (notificationError) {
        // 알림 생성 실패해도 팔로우는 성공으로 처리
        console.warn('팔로우 알림 생성 실패:', notificationError);
      }
    } catch (error) {
      console.error('팔로우 실패:', error);
      throw error;
    }
  }

  /**
   * Unfollow a user
   */
  static async unfollowUser(userId: string, targetUserId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_user_preferences')
        .delete()
        .eq('user_id', userId)
        .eq('target_id', targetUserId)
        .eq('target_type', 'user')
        .eq('preference_type', 'follow');

      if (error) throw error;
    } catch (error) {
      console.error('언팔로우 실패:', error);
      throw error;
    }
  }

  /**
   * Check if following a user
   */
  static async isFollowing(userId: string, targetUserId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('user_user_preferences')
        .select('user_id')
        .eq('user_id', userId)
        .eq('target_id', targetUserId)
        .eq('target_type', 'user')
        .eq('preference_type', 'follow')
        .maybeSingle();

      if (error) throw error;
      return !!data;
    } catch (error) {
      console.error('팔로우 여부 확인 실패:', error);
      return false;
    }
  }

  // =============================================
  // Generic Like Methods for All Entity Types
  // =============================================

  /**
   * Like an entity (project, collaboration, brand, partner, or user)
   * Also creates a notification for the target user (if target is a user)
   *
   * @param userId - 좋아요하는 사용자 ID
   * @param targetId - 좋아요 대상 ID
   * @param targetType - 대상 타입
   * @param actorInfo - 좋아요 시점의 활성 프로필 정보 (스냅샷 저장용)
   */
  static async likeEntity(
    userId: string,
    targetId: string,
    targetType: LikeableEntityType,
    actorInfo?: {
      role: 'fan' | 'brand' | 'artist' | 'creative';
      profileId: string;
      name: string;
      avatarUrl?: string;
    }
  ): Promise<void> {
    // 자기 자신 좋아요 방지 (user, partner, brand 타입인 경우)
    if ((targetType === 'user' || targetType === 'partner' || targetType === 'brand') && userId === targetId) {
      console.warn('자기 자신을 좋아요할 수 없어요.');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_user_preferences')
        .insert({
          user_id: userId,
          target_id: targetId,
          target_type: targetType,
          preference_type: 'like',
          actor_role: actorInfo?.role ?? null,
          actor_profile_id: actorInfo?.profileId ?? null,
          actor_name: actorInfo?.name ?? null,
          actor_avatar_url: actorInfo?.avatarUrl ?? null,
        })
        .select();

      if (error) {
        // Ignore duplicate key error (already liked)
        if (error.code === '23505') {
          console.log('이미 좋아요한 항목에요.');
          return;
        }
        console.error('likeEntity insert error:', error);
        throw error;
      }

      // Insert 성공 확인
      if (!data || data.length === 0) {
        console.warn('likeEntity: Insert succeeded but no data returned');
      }

      // 좋아요 알림 생성 (타겟이 user 또는 partner인 경우)
      if (targetType === 'user' || targetType === 'partner' || targetType === 'brand') {
        try {
          // actorInfo가 있으면 스냅샷 사용, 없으면 기존 동적 조회
          let senderName = actorInfo?.name;
          let senderAvatar = actorInfo?.avatarUrl;

          if (!senderName) {
            const senderInfo = await getUserDisplayInfo(userId);
            senderName = senderInfo?.name || '사용자';
            senderAvatar = senderInfo?.avatar;
          }

          await supabase
            .from('user_notifications')
            .insert({
              receiver_id: targetId, // 알림을 받을 사용자 (파트너의 profile_id)
              type: 'like',
              title: '새로운 좋아요',
              content: '회원님의 프로필을 좋아해요.',
              related_id: userId, // 좋아요한 사용자 프로필로 링크
              related_type: 'user',
              is_read: false,
              metadata: {
                actor_id: userId,
                sender_id: userId,
                sender_name: senderName,
                sender_avatar: senderAvatar,
                actor_role: actorInfo?.role,
              },
            });
        } catch (notificationError) {
          // 알림 생성 실패해도 좋아요는 성공으로 처리
          console.warn('좋아요 알림 생성 실패:', notificationError);
        }
      }
    } catch (error) {
      console.error('좋아요 실패:', error);
      throw error;
    }
  }

  /**
   * Unlike an entity (remove like)
   */
  static async unlikeEntity(userId: string, targetId: string, targetType: LikeableEntityType): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_user_preferences')
        .delete()
        .eq('user_id', userId)
        .eq('target_id', targetId)
        .eq('target_type', targetType)
        .eq('preference_type', 'like');

      if (error) throw error;
    } catch (error) {
      console.error('좋아요 취소 실패:', error);
      throw error;
    }
  }

  /**
   * Toggle like status
   *
   * @param userId - 좋아요하는 사용자 ID
   * @param targetId - 좋아요 대상 ID
   * @param targetType - 대상 타입
   * @param actorInfo - 좋아요 시점의 활성 프로필 정보 (스냅샷 저장용)
   */
  static async toggleLike(
    userId: string,
    targetId: string,
    targetType: LikeableEntityType,
    actorInfo?: {
      role: 'fan' | 'brand' | 'artist' | 'creative';
      profileId: string;
      name: string;
      avatarUrl?: string;
    }
  ): Promise<boolean> {
    try {
      const liked = await this.isLiked(userId, targetId, targetType);
      if (liked) {
        await this.unlikeEntity(userId, targetId, targetType);
        return false;
      } else {
        await this.likeEntity(userId, targetId, targetType, actorInfo);
        return true;
      }
    } catch (error) {
      console.error('toggleLike failed:', error);
      throw error;
    }
  }

  /**
   * Check if an entity is liked by the user
   */
  static async isLiked(userId: string, targetId: string, targetType: LikeableEntityType): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('user_user_preferences')
        .select('user_id')
        .eq('user_id', userId)
        .eq('target_id', targetId)
        .eq('target_type', targetType)
        .eq('preference_type', 'like')
        .maybeSingle();

      if (error) throw error;
      return !!data;
    } catch (error) {
      console.error('좋아요 여부 확인 실패:', error);
      return false;
    }
  }

  /**
   * Get like count for an entity
   */
  static async getLikeCount(targetId: string, targetType: LikeableEntityType): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('user_user_preferences')
        .select('*', { count: 'exact', head: true })
        .eq('target_id', targetId)
        .eq('target_type', targetType)
        .eq('preference_type', 'like');

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('좋아요 수 조회 실패:', error);
      return 0;
    }
  }

  /**
   * Get multiple like counts at once (batch)
   */
  static async getLikeCounts(targetIds: string[], targetType: LikeableEntityType): Promise<Record<string, number>> {
    try {
      const { data, error } = await supabase
        .from('user_user_preferences')
        .select('target_id')
        .in('target_id', targetIds)
        .eq('target_type', targetType)
        .eq('preference_type', 'like');

      if (error) throw error;

      // Count likes per target_id
      const counts: Record<string, number> = {};
      targetIds.forEach(id => counts[id] = 0);

      (data || []).forEach((row: { target_id: string }) => {
        counts[row.target_id] = (counts[row.target_id] || 0) + 1;
      });

      return counts;
    } catch (error) {
      console.error('좋아요 수 일괄 조회 실패:', error);
      return {};
    }
  }

  /**
   * Check if multiple entities are liked by the user (batch)
   */
  static async areLiked(userId: string, targetIds: string[], targetType: LikeableEntityType): Promise<Record<string, boolean>> {
    try {
      const { data, error } = await supabase
        .from('user_user_preferences')
        .select('target_id')
        .eq('user_id', userId)
        .in('target_id', targetIds)
        .eq('target_type', targetType)
        .eq('preference_type', 'like');

      if (error) throw error;

      const likedSet = new Set((data || []).map((row: { target_id: string }) => row.target_id));
      const result: Record<string, boolean> = {};
      targetIds.forEach(id => result[id] = likedSet.has(id));

      return result;
    } catch (error) {
      console.error('좋아요 여부 일괄 확인 실패:', error);
      return {};
    }
  }

  /**
   * Get all entities liked by a user of a specific type
   */
  static async getLikedEntities(userId: string, targetType: LikeableEntityType): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('user_user_preferences')
        .select('target_id')
        .eq('user_id', userId)
        .eq('target_type', targetType)
        .eq('preference_type', 'like');

      if (error) throw error;
      return (data || []).map((row: { target_id: string }) => row.target_id);
    } catch (error) {
      console.error('좋아요 목록 조회 실패:', error);
      return [];
    }
  }

  /**
   * Get all users followed by a user
   */
  static async getFollowedUsers(userId: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('user_user_preferences')
        .select('target_id')
        .eq('user_id', userId)
        .eq('target_type', 'user')
        .eq('preference_type', 'follow');

      if (error) throw error;
      return (data || []).map((row: { target_id: string }) => row.target_id);
    } catch (error) {
      console.error('팔로우 목록 조회 실패:', error);
      return [];
    }
  }

  /**
   * Get all users following a user (Followers)
   */
  static async getFollowers(userId: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('user_user_preferences')
        .select('user_id')
        .eq('target_id', userId)
        .eq('target_type', 'user')
        .eq('preference_type', 'follow');

      if (error) throw error;
      return (data || []).map((row: { user_id: string }) => row.user_id);
    } catch (error) {
      console.error('팔로워 목록 조회 실패:', error);
      return [];
    }
  }

  /**
   * Get mutual follows (users who follow each other)
   */
  static async getMutualFollows(userId: string): Promise<string[]> {
    try {
      const [followers, following] = await Promise.all([
        this.getFollowers(userId),
        this.getFollowedUsers(userId),
      ]);

      const followingSet = new Set(following);
      return followers.filter(id => followingSet.has(id));
    } catch (error) {
      console.error('맞팔 목록 조회 실패:', error);
      return [];
    }
  }

  /**
   * Get all favorites (liked/followed users) with their profile details
   * Used for 'Favorites' section in MyProfile
   *
   * 최적화: N+1 문제 해결 - displayService.getDisplayInfoMap 배치 패턴 사용
   * Before: 10 즐겨찾기 = 13 쿼리 (2 + 1 프로필 + 10 타입별)
   * After: 10 즐겨찾기 = 5 쿼리 (2 + 3 배치)
   */
  static async getFavoritesWithDetails(userId: string): Promise<{
    id: string;
    type: 'brand' | 'artist' | 'creative';
    name: string;
    image: string | null;
    role: string;
  }[]> {
    try {
      // 1. Get all liked/followed targets of type 'user', 'brand', 'partner'
      const targetTypes = ['user', 'brand', 'partner'];

      const [likes, follows] = await Promise.all([
        supabase
          .from('user_user_preferences')
          .select('target_id')
          .eq('user_id', userId)
          .in('target_type', targetTypes)
          .eq('preference_type', 'like'),
        supabase
          .from('user_user_preferences')
          .select('target_id')
          .eq('user_id', userId)
          .in('target_type', targetTypes)
          .eq('preference_type', 'follow')
      ]);

      const likedIds = (likes.data || []).map((r: any) => r.target_id);
      const followedIds = (follows.data || []).map((r: any) => r.target_id);

      const uniqueIds = Array.from(new Set([...likedIds, ...followedIds]));

      // 본인 제외 (즐겨찾기 목록에 자기 자신이 표시되지 않도록)
      // 차단한 파트너 제외 (차단한 사용자는 즐겨찾기에 표시되지 않도록)
      const blockedUserIds = await BlockService.getBlockedUserIds(userId);
      const filteredIds = uniqueIds.filter(id =>
        id !== userId && !blockedUserIds.includes(id)
      );

      if (filteredIds.length === 0) return [];

      // 2. getProfileDisplayMapOptimized는 is_active=true인 활성 프로필만 조회하고
      //    역할 우선순위(브랜드>아티스트>크리에이티브>팬)를 적용
      //    성능 개선: 5개 쿼리 → 1개 RPC 쿼리 (또는 폴백 시 5개 쿼리)
      const displayMap = await getProfileDisplayMapOptimized(filteredIds);

      // 이미지 URL 추출 및 배치 서명 URL 생성 (성능 최적화)
      const imageUrls = Array.from(displayMap.values())
        .map(info => info.avatar)
        .filter((url): url is string => !!url);

      // 일괄 서명 URL 생성 (50개 이미지 → 1개 API 호출)
      const signedUrlsMap = await getSignedUrls(imageUrls, 3600); // 1시간 유효

      // 3. displayMap을 기반으로 결과 생성
      //    displayMap에 is_active=false인 프로필은 이미 제외되었으므로 추가 필터링 불필요
      const results = filteredIds.map((id) => {
        const displayInfo = displayMap.get(id);

        // displayInfo가 없거나 이름이 없거나 비활성 프로필인 경우 제외
        if (!displayInfo || !displayInfo.name || !displayInfo.isActive) return null;

        // profileType으로 타입 결정
        let type: 'brand' | 'artist' | 'creative' = 'creative';

        if (displayInfo.profileType === 'brand') {
          type = 'brand';
        } else if (displayInfo.profileType === 'artist') {
          type = 'artist';
        } else if (displayInfo.profileType === 'creative') {
          type = 'creative';
        }

        // fan은 제외
        if (displayInfo.profileType === 'fan') return null;

        // 서명 URL 사용 (배치 생성된 서명 URL 또는 원본)
        const originalAvatar = displayInfo.avatar;
        const signedAvatar = originalAvatar
          ? signedUrlsMap.get(extractStoragePath(originalAvatar) || '') || originalAvatar
          : null;

        return {
          id,
          type,
          name: displayInfo.name,
          image: signedAvatar,
          role: type.charAt(0).toUpperCase() + type.slice(1),
        };
      });

      return results.filter((item): item is NonNullable<typeof item> => item !== null);

    } catch (error) {
      console.error('즐겨찾기 목록 조회 실패:', error);
      return [];
    }
  }
}

export const socialService = SocialService;

