/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '../lib/supabase';
import type { UserNotification, UserNotificationType } from '../types/userNotification';
import { getProfileDisplay } from './profileDisplayService';
import { BlockService } from './blockService';

interface UserDisplayInfo {
  name: string;
  avatar?: string;
  activityField?: string;
}

/**
 * 비팬 표기 규칙에 따른 사용자 표시 이름/아바타 조회
 * - 브랜드: profile_brands.brand_name
 * - 아티스트: profile_artists.artist_name
 * - 크리에이티브: profile_creatives.nickname
 * - 팬: profiles.nickname
 *
 * @deprecated 새 코드에서는 profileDisplayService의 getProfileDisplay 사용 권장
 */
export const getVfanDisplayInfo = async (userId: string): Promise<UserDisplayInfo | null> => {
  const { data: profile } = await supabase
    .from('profiles')
    .select('roles, nickname')
    .eq('id', userId)
    .maybeSingle();

  if (!profile) return null;

  const roles: string[] = Array.isArray(profile.roles) ? (profile.roles as string[]) : [];
  const hasBrand = roles.includes('brand');
  const hasArtist = roles.includes('artist');
  const hasCreative = roles.includes('creative');
  const hasFan = roles.includes('fan');

  try {
    // 1) 브랜드
    if (hasBrand) {
      const { data: brand } = await supabase
        .from('profile_brands')
        .select('brand_name, logo_image_url, activity_field')
        .eq('profile_id', userId)
        .eq('is_active', true)
        .maybeSingle();

      if (brand) {
        return { name: brand.brand_name, avatar: brand.logo_image_url, activityField: brand.activity_field || '브랜드' };
      }
    }

    // 2) 아티스트
    if (hasArtist) {
      const { data: artist } = await supabase
        .from('profile_artists')
        .select('artist_name, logo_image_url, activity_field')
        .eq('profile_id', userId)
        .eq('is_active', true)
        .maybeSingle();

      if (artist) {
        return { name: artist.artist_name, avatar: artist.logo_image_url, activityField: artist.activity_field || '아티스트' };
      }
    }

    // 3) 크리에이티브
    if (hasCreative) {
      const { data: creative } = await supabase
        .from('profile_creatives')
        .select('nickname, profile_image_url, activity_field')
        .eq('profile_id', userId)
        .eq('is_active', true)
        .maybeSingle();

      if (creative) {
        return { name: creative.nickname, avatar: creative.profile_image_url, activityField: creative.activity_field || '크리에이티브' };
      }
    }

    // 4) 팬
    if (hasFan) {
      const { data: fan } = await supabase
        .from('profile_fans')
        .select('profile_image_url')
        .eq('profile_id', userId)
        .eq('is_active', true)
        .maybeSingle();

      return { name: profile.nickname || '팬', avatar: fan?.profile_image_url, activityField: '팬' };
    }
  } catch (error) {
    console.error('[UserNotificationService] Error fetching Vfan display info:', error);
  }

  //Fallback: 기본 프로필 닉네임
  const primaryRole = roles[0] || '';
  return { name: profile.nickname || '사용자', avatar: undefined, activityField: primaryRole };
};

/**
 * 배치 버전: 여러 사용자의 비팬 표기 정보를 한 번에 조회
 * 브랜드 → 아티스트 → 크리에이티브 → 팬 → 프로필 순으로 우선순위
 *
 * @deprecated 새 코드에서는 profileDisplayService의 getProfileDisplayMap 사용 권장
 */
export const getVfanDisplayInfoMap = async (userIds: string[]): Promise<Map<string, UserDisplayInfo>> => {
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
  const result = new Map<string, UserDisplayInfo>();
  if (uniqueIds.length === 0) return result;

  try {
    // 1. 모든 프로필의 roles와 기본 닉네임 조회
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, roles, nickname, avatar_url')
      .in('id', uniqueIds);

    if (!profiles) return result;

    const profilesMap = new Map<string, { roles: string[]; nickname: string; avatar_url?: string }>();
    profiles.forEach(p => {
      profilesMap.set(p.id, {
        roles: Array.isArray(p.roles) ? p.roles : [],
        nickname: p.nickname || '',
        avatar_url: p.avatar_url,
      });
    });

    // 역할별로 유저 ID 분류 (여러 역할을 가진 사용자도 모두 분류 - else if 제거)
    const brandIds: string[] = [];
    const artistIds: string[] = [];
    const creativeIds: string[] = [];
    const fanIds: string[] = [];

    uniqueIds.forEach(id => {
      const profile = profilesMap.get(id);
      if (!profile) return;
      // 모든 역할에 대해 분류 (is_active=false인 경우 폴백 처리를 위해)
      if (profile.roles.includes('brand')) brandIds.push(id);
      if (profile.roles.includes('artist')) artistIds.push(id);
      if (profile.roles.includes('creative')) creativeIds.push(id);
      if (profile.roles.includes('fan')) fanIds.push(id);
    });

    // 2. 배치 쿼리로 각 테이블에서 정보 조회 (activity_field 포함)
    const [brandsResult, artistsResult, creativesResult, fansResult] = await Promise.all([
      brandIds.length > 0
        ? supabase.from('profile_brands').select('profile_id, brand_name, logo_image_url, activity_field').in('profile_id', brandIds).eq('is_active', true)
        : Promise.resolve({ data: null }),
      artistIds.length > 0
        ? supabase.from('profile_artists').select('profile_id, artist_name, logo_image_url, activity_field').in('profile_id', artistIds).eq('is_active', true)
        : Promise.resolve({ data: null }),
      creativeIds.length > 0
        ? supabase.from('profile_creatives').select('profile_id, nickname, profile_image_url, activity_field').in('profile_id', creativeIds).eq('is_active', true)
        : Promise.resolve({ data: null }),
      fanIds.length > 0
        ? supabase.from('profile_fans').select('profile_id, profile_image_url').in('profile_id', fanIds).eq('is_active', true)
        : Promise.resolve({ data: null }),
    ]);

    // 3. 브랜드 매핑
    (brandsResult.data || []).forEach(b => {
      result.set(b.profile_id, { name: b.brand_name || '브랜드', avatar: b.logo_image_url, activityField: b.activity_field || '브랜드' });
    });

    // 4. 아티스트 매핑
    (artistsResult.data || []).forEach(a => {
      if (!result.has(a.profile_id)) {
        result.set(a.profile_id, { name: a.artist_name || '아티스트', avatar: a.logo_image_url, activityField: a.activity_field || '아티스트' });
      }
    });

    // 5. 크리에이티브 매핑
    (creativesResult.data || []).forEach(c => {
      if (!result.has(c.profile_id)) {
        result.set(c.profile_id, { name: c.nickname || '크리에이티브', avatar: c.profile_image_url, activityField: c.activity_field || '크리에이티브' });
      }
    });

    // 6. 팬 매핑
    (fansResult.data || []).forEach(f => {
      if (!result.has(f.profile_id)) {
        const profile = profilesMap.get(f.profile_id);
        result.set(f.profile_id, { name: profile?.nickname || '팬', avatar: f.profile_image_url, activityField: '팬' });
      }
    });

    // 7. 나머지는 기본 프로필 정보로 폴백
    uniqueIds.forEach(id => {
      if (!result.has(id)) {
        const profile = profilesMap.get(id);
        const primaryRole = profile?.roles?.[0] || '';
        result.set(id, { name: profile?.nickname || '사용자', avatar: profile?.avatar_url, activityField: primaryRole });
      }
    });
  } catch (error) {
    console.error('[UserNotificationService] Error fetching Vfan display info map:', error);
    // 에러 시 빈 결과 반환
    uniqueIds.forEach(id => {
      if (!result.has(id)) {
        result.set(id, { name: '사용자', avatar: undefined });
      }
    });
  }

  return result;
};

/**
 * "김비팬님이 ..." 형태의 content에서 앞 이름만 교체
 *
 * @deprecated 새 코드에서는 buildNotificationDescription 사용 권장
 * @see webapp/src/utils/notificationHelper.ts
 */
export const replaceLeadingNameWithVfanName = (original: string, newName: string): string => {
  if (!original) return original;
  const nimiIndex = original.indexOf('님');
  if (nimiIndex === -1) return original;

  const rest = original.slice(nimiIndex + '님'.length);
  return `${newName}님${rest}`;
};

/**
 * "보낸이: 메시지내용" 형태의 content에서 이름만 교체 + 멘션 패턴 파싱
 *
 * @deprecated 새 코드에서는 buildNotificationDescription 사용 권장
 * @see webapp/src/utils/notificationHelper.ts
 */
export const rebuildMessageContentWithVfanName = (original: string, newName: string): string => {
  if (!original) return original;
  const colonIndex = original.indexOf(':');
  let messagePart: string;

  if (colonIndex === -1) {
    messagePart = original;
  } else {
    messagePart = original.slice(colonIndex + 1).trim();
  }

  // 멘션 패턴 @[이름](userId) → @이름 으로 변환
  const parsedMessage = messagePart.replace(/@\[([^\]]+)\]\([^)]+\)/g, '@$1');

  return `${newName}: ${parsedMessage}`;
};

// ============================================================================
// 프로필 표시 정보 캐시 (메모리)
// ============================================================================

/**
 * 프로필 표시 정보 캐시 (5분 TTL)
 */
const profileDisplayCache = new Map<string, { data: UserDisplayInfo; expiresAt: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5분

/**
 * 캐시에서 프로필 정보 조회 (TTL 체크)
 */
function getCachedProfileDisplay(userId: string): UserDisplayInfo | null {
  const cached = profileDisplayCache.get(userId);
  if (!cached) return null;

  if (Date.now() > cached.expiresAt) {
    profileDisplayCache.delete(userId);
    return null;
  }

  return cached.data;
}

/**
 * 프로필 정보를 캐시에 저장
 */
function setCachedProfileDisplay(userId: string, data: UserDisplayInfo): void {
  profileDisplayCache.set(userId, {
    data,
    expiresAt: Date.now() + CACHE_TTL,
  });
}

/**
 * 여러 사용자의 표시 정보를 일괄 조회 (성능 최적화)
 * @param userIds - 조회할 사용자 ID 목록
 * @returns userId -> UserDisplayInfo 맵
 */
async function getBatchUserDisplayInfo(userIds: string[]): Promise<Map<string, UserDisplayInfo>> {
  const result = new Map<string, UserDisplayInfo>();
  if (userIds.length === 0) return result;

  // 0. 캐시에서 먼저 조회
  const uncachedIds: string[] = [];
  userIds.forEach(userId => {
    const cached = getCachedProfileDisplay(userId);
    if (cached) {
      result.set(userId, cached);
    } else {
      uncachedIds.push(userId);
    }
  });

  // 모두 캐시 히트
  if (uncachedIds.length === 0) return result;

  // 1. profiles 테이블에서 기본 정보 일괄 조회 (캐시 미스만)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, roles, nickname')
    .in('id', uncachedIds);

  if (!profiles || profiles.length === 0) return result;

  // 역할별 userId 분류
  const brandIds: string[] = [];
  const artistIds: string[] = [];
  const creativeIds: string[] = [];
  const fanIds: string[] = [];
  const profileMap = new Map<string, { roles: string[]; nickname: string | null }>();

  profiles.forEach(p => {
    const roles: string[] = Array.isArray(p.roles) ? (p.roles as string[]) : [];
    profileMap.set(p.id, { roles, nickname: p.nickname });

    // 모든 역할에 대해 분류 (is_active=false인 경우 폴백 처리를 위해 - else if 제거)
    if (roles.includes('brand')) brandIds.push(p.id);
    if (roles.includes('artist')) artistIds.push(p.id);
    if (roles.includes('creative')) creativeIds.push(p.id);
    if (roles.includes('fan')) fanIds.push(p.id);
  });

  // 2. 각 역할별 테이블에서 일괄 조회 (병렬 실행)
  const [brands, artists, creatives, fans] = await Promise.all([
    brandIds.length > 0
      ? supabase.from('profile_brands').select('profile_id, brand_name, logo_image_url').in('profile_id', brandIds).eq('is_active', true)
      : Promise.resolve({ data: [] }),
    artistIds.length > 0
      ? supabase.from('profile_artists').select('profile_id, artist_name, logo_image_url').in('profile_id', artistIds).eq('is_active', true)
      : Promise.resolve({ data: [] }),
    creativeIds.length > 0
      ? supabase.from('profile_creatives').select('profile_id, nickname, profile_image_url').in('profile_id', creativeIds).eq('is_active', true)
      : Promise.resolve({ data: [] }),
    fanIds.length > 0
      ? supabase.from('profile_fans').select('profile_id, profile_image_url').in('profile_id', fanIds).eq('is_active', true)
      : Promise.resolve({ data: [] }),
  ]);

  // 3. 결과 조합 + 캐시 저장
  brands.data?.forEach((b: any) => {
    const info: UserDisplayInfo = { name: b.brand_name, avatar: b.logo_image_url };
    result.set(b.profile_id, info);
    setCachedProfileDisplay(b.profile_id, info);
  });
  artists.data?.forEach((a: any) => {
    const info: UserDisplayInfo = { name: a.artist_name, avatar: a.logo_image_url };
    result.set(a.profile_id, info);
    setCachedProfileDisplay(a.profile_id, info);
  });
  creatives.data?.forEach((c: any) => {
    const info: UserDisplayInfo = { name: c.nickname, avatar: c.profile_image_url };
    result.set(c.profile_id, info);
    setCachedProfileDisplay(c.profile_id, info);
  });
  fans.data?.forEach((f: any) => {
    const profile = profileMap.get(f.profile_id);
    const info: UserDisplayInfo = { name: profile?.nickname || '팬', avatar: f.profile_image_url };
    result.set(f.profile_id, info);
    setCachedProfileDisplay(f.profile_id, info);
  });

  // 4. 조회 결과가 없는 경우 기본 닉네임 사용 + 캐시 저장
  uncachedIds.forEach(uid => {
    if (!result.has(uid)) {
      const profile = profileMap.get(uid);
      if (profile) {
        const info: UserDisplayInfo = { name: profile.nickname || '사용자', avatar: undefined };
        result.set(uid, info);
        setCachedProfileDisplay(uid, info);
      }
    }
  });

  return result;
}

/**
 * User Notification Service (Phase 3)
 *
 * 유저 간 알림 서비스
 * - user_notifications 테이블 기반 (물리 테이블)
 * - 실시간 알림 구독 (Trigger 기반)
 * - 알림 설정 관리
 */
export class UserNotificationService {
  /**
   * 사용자의 모든 알림 조회 (성능 최적화 버전)
   * - metadata에 sender 정보가 있으면 추가 조회 없이 사용
   * - 없는 경우 일괄 조회로 N+1 문제 해결
   * @param userId - 사용자 ID
   * @param filters - 필터 옵션
   */
  static async getUserNotifications(
    userId: string,
    filters?: {
      type?: UserNotificationType;
      isRead?: boolean;
      limit?: number;
      offset?: number;
      profileType?: 'brand' | 'artist' | 'creative' | 'fan'; // 프로필 타입별 필터링
    }
  ): Promise<UserNotification[]> {
    let query = supabase
      .from('user_notifications')
      .select('*')
      .eq('receiver_id', userId)
      .order('created_at', { ascending: false });

    if (filters?.type) {
      query = query.eq('type', filters.type);
    }
    if (filters?.isRead !== undefined) {
      query = query.eq('is_read', filters.isRead);
    }
    // 프로필 타입 필터링
    // - 모든 프로필 동일하게 처리: 해당 타입 알림 + 기존 데이터(NULL)만 표시
    // - NULL은 마이그레이션 이전 기존 데이터 (모든 프로필에서 표시)
    if (filters?.profileType) {
      query = query.or(`receiver_profile_type.eq.${filters.profileType},receiver_profile_type.is.null`);
    }
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1);
    }

    const { data, error } = await query;

    if (error || !data) {
      console.error('Error fetching notifications:', error);
      return [];
    }

    // 차단된 사용자로부터의 알림 필터링
    const blockedIds = await BlockService.getBlockedUserIds(userId);
    const blockedSet = new Set(blockedIds);

    const filteredData = data.filter(item => {
      // sender_id 또는 related_id(팔로우/좋아요의 경우)가 차단 목록에 있으면 제외
      const senderId = item.metadata?.sender_id || item.sender_id;
      const relatedId = item.related_id;

      if (senderId && blockedSet.has(senderId)) return false;
      if (item.type === 'follow' && relatedId && blockedSet.has(relatedId)) return false;
      if (item.type === 'like' && relatedId && blockedSet.has(relatedId)) return false;

      // fan 유저가 보낸 초대/지원 알림 제외 (fan은 프로젝트/협업에 관여할 수 없음)
      const senderProfileType = item.sender_profile_type || item.metadata?.sender_profile_type;
      const isInvitationOrApplication = ['invitation', 'application', 'invitation_accepted', 'invitation_rejected', 'application_accepted', 'application_rejected'].includes(item.type);
      if (isInvitationOrApplication && senderProfileType === 'fan') return false;

      return true;
    });

    // 1. metadata에 sender 정보가 없는 알림들의 senderId 추출
    const senderIdsToFetch = new Set<string>();
    const notificationTypes = [
      'invitation', 'message', 'application', 'withdrawal', 'follow', 'like',
      'invitation_accepted', 'invitation_rejected',
      'application_accepted', 'application_rejected', 'question', 'answer'
    ];

    filteredData.forEach(item => {
      const isFollowOrLike = item.type === 'follow' || item.type === 'like';
      const senderId = isFollowOrLike
        ? (item.related_id || '')
        : (item.metadata?.sender_id || item.sender_id || '');

      if (senderId && notificationTypes.includes(item.type)) {
        senderIdsToFetch.add(senderId);
      }
    });

    // 2. 필요한 senderId들만 일괄 조회 (최대 5개 쿼리로 최적화)
    const displayInfoMap = await getBatchUserDisplayInfo(Array.from(senderIdsToFetch));

    // 3. 알림 데이터 변환 (동기 처리 - 추가 쿼리 없음)
    const notifications: UserNotification[] = filteredData.map(item => {
      const isFollowOrLike = item.type === 'follow' || item.type === 'like';
      const baseSenderId: string = isFollowOrLike
        ? (item.related_id || '')
        : (item.metadata?.sender_id || item.sender_id || '');

      // metadata 우선 사용, 필요 시 일괄 조회 결과로 보강/덮어쓰기
      let senderName: string | undefined = item.metadata?.sender_name;
      let senderAvatar: string | undefined = item.metadata?.sender_avatar;

      const display = baseSenderId ? displayInfoMap.get(baseSenderId) : undefined;
      if (display) {
        senderName = display.name;
        senderAvatar = display.avatar;
      }

      // description은 원본 content 그대로 반환
      // UI 레이어(컴포넌트)에서 buildNotificationDescription으로 생성
      const description = item.content;

      return {
        id: item.id,
        type: item.type as UserNotificationType,
        title: item.title,
        description,
        relatedId: item.related_id,
        senderId: baseSenderId,
        receiverId: item.receiver_id,
        isRead: item.is_read,
        isStarred: false,
        createdAt: item.created_at,
        senderName,
        senderAvatar,
        activityId: item.related_id,
        activityType: item.related_type,
        status: item.metadata?.status,
        metadata: item.metadata
      };
    });

    return notifications;
  }

  /**
   * 읽지 않은 알림 개수 조회
   */
  static async getUnreadCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('user_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('Error fetching unread count:', error);
      return 0;
    }
    return count || 0;
  }

  /**
   * 알림 읽음 처리
   */
  static async markAsRead(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('user_notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  /**
   * 모든 알림 읽음 처리
   */
  static async markAllAsRead(userId: string): Promise<void> {
    const { error } = await supabase
      .from('user_notifications')
      .update({ is_read: true })
      .eq('receiver_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('Error marking all as read:', error);
    }
  }

  /**
   * 특정 채팅방의 메시지 알림 일괄 읽음 처리
   * @param userId - 사용자 ID
   * @param roomId - 채팅방 ID
   * @returns 읽음 처리된 알림 수
   */
  static async markMessageNotificationsByRoomId(
    userId: string,
    roomId: string
  ): Promise<number> {
    try {
      // related_id가 roomId인 메시지 알림 조회 (미읽음만)
      const { data: notifications, error: fetchError } = await supabase
        .from('user_notifications')
        .select('id')
        .eq('receiver_id', userId)
        .eq('type', 'message')
        .eq('is_read', false)
        .eq('related_id', roomId);

      if (fetchError) {
        console.error('Error fetching room message notifications:', fetchError);
        return 0;
      }

      if (!notifications || notifications.length === 0) {
        return 0;
      }

      const ids = notifications.map(n => n.id);

      // 일괄 업데이트
      const { error: updateError } = await supabase
        .from('user_notifications')
        .update({ is_read: true })
        .in('id', ids);

      if (updateError) {
        console.error('Error marking room messages as read:', updateError);
        return 0;
      }

      return ids.length;
    } catch (error) {
      console.error('[UserNotificationService] markMessageNotificationsByRoomId failed:', error);
      return 0;
    }
  }

  /**
   * 실시간 알림 구독
   */
  static subscribeToNotifications(
    userId: string,
    onNotification: (notification: UserNotification) => void
  ): () => void {
    const channel = supabase.channel('user-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'user_notifications', filter: `receiver_id=eq.${userId}` },
        async (payload) => {
          const item = payload.new as any;

          // fan 유저가 보낸 초대/지원 알림 무시 (fan은 프로젝트/협업에 관여할 수 없음)
          const senderProfileType = item.sender_profile_type || item.metadata?.sender_profile_type;
          const isInvitationOrApplication = ['invitation', 'application', 'invitation_accepted', 'invitation_rejected', 'application_accepted', 'application_rejected'].includes(item.type);
          if (isInvitationOrApplication && senderProfileType === 'fan') {
            return; // 알림 무시
          }

          // follow/like 알림의 경우 related_id가 팔로우/좋아요한 사용자 ID
          const isFollowOrLike = item.type === 'follow' || item.type === 'like';
          const baseSenderId: string = isFollowOrLike
            ? (item.related_id || '')
            : (item.metadata?.sender_id || '');

          let senderName: string | undefined = item.metadata?.sender_name;
          let senderAvatar: string | undefined = item.metadata?.sender_avatar;
          let description: string = item.content;

          const shouldUseVfanName =
            baseSenderId &&
            [
              'invitation', 'message', 'application', 'withdrawal', 'follow', 'like',
              'invitation_accepted', 'invitation_rejected',
              'application_accepted', 'application_rejected'
            ].includes(item.type);

          if (shouldUseVfanName) {
            // 캐시 우선 확인
            let displayInfo = getCachedProfileDisplay(baseSenderId);

            // 캐시 미스 시 DB 조회
            if (!displayInfo) {
              const display = await getProfileDisplay(baseSenderId);
              if (display) {
                displayInfo = {
                  name: display.name,
                  avatar: display.avatar,
                  activityField: display.activityField,
                };
                // 캐시에 저장
                setCachedProfileDisplay(baseSenderId, displayInfo);
              }
            }

            if (displayInfo) {
              senderName = displayInfo.name;
              senderAvatar = displayInfo.avatar;

              if (item.type === 'message') {
                description = rebuildMessageContentWithVfanName(item.content, displayInfo.name);
              } else if (!isFollowOrLike) {
                // follow/like는 content를 그대로 사용 (이미 올바른 형식)
                description = replaceLeadingNameWithVfanName(item.content, displayInfo.name);
              }
            }
          }

          const notification: UserNotification = {
            id: item.id,
            type: item.type as UserNotificationType,
            title: item.title,
            description,
            relatedId: item.related_id,
            senderId: baseSenderId,
            receiverId: item.receiver_id,
            isRead: item.is_read,
            isStarred: false,
            createdAt: item.created_at,
            senderName,
            senderAvatar,
            activityId: item.related_id,
            activityType: item.related_type,
            status: item.metadata?.status,
            metadata: item.metadata
          };
          onNotification(notification);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  /**
   * 알림 설정 조회
   */
  static async getNotificationSettings(userId: string): Promise<Record<string, boolean>> {
    const { data, error } = await supabase
      .from('user_notification_settings')
      .select('notification_type, is_enabled')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching settings:', error);
      return {};
    }

    const settings: Record<string, boolean> = {};
    data.forEach(item => {
      settings[item.notification_type] = item.is_enabled;
    });
    return settings;
  }

  /**
   * 알림 설정 업데이트
   */
  static async updateNotificationSetting(userId: string, type: string, isEnabled: boolean): Promise<void> {
    const { error } = await supabase
      .from('user_notification_settings')
      .upsert({ user_id: userId, notification_type: type, is_enabled: isEnabled, updated_at: new Date().toISOString() });

    if (error) {
      console.error('Error updating setting:', error);
    }
  }

  /**
   * 푸시 알림 전역 설정 조회
   */
  static async getPushSettings(userId: string): Promise<{
    pushEnabled: boolean;
    quietModeEnabled: boolean;
    quietStartTime: string;
    quietEndTime: string;
  }> {
    const { data, error } = await supabase
      .from('user_push_settings')
      .select('push_enabled, quiet_mode_enabled, quiet_start_time, quiet_end_time')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching push settings:', error);
    }

    // 데이터가 없으면 기본값 반환
    return {
      pushEnabled: data?.push_enabled ?? true,
      quietModeEnabled: data?.quiet_mode_enabled ?? false,
      quietStartTime: data?.quiet_start_time ?? '22:00',
      quietEndTime: data?.quiet_end_time ?? '08:00',
    };
  }

  /**
   * 푸시 알림 전역 설정 업데이트
   */
  static async updatePushSettings(userId: string, settings: {
    pushEnabled?: boolean;
    quietModeEnabled?: boolean;
    quietStartTime?: string;
    quietEndTime?: string;
  }): Promise<void> {
    const updateData: Record<string, any> = {
      user_id: userId,
      updated_at: new Date().toISOString(),
    };

    if (settings.pushEnabled !== undefined) {
      updateData.push_enabled = settings.pushEnabled;
    }
    if (settings.quietModeEnabled !== undefined) {
      updateData.quiet_mode_enabled = settings.quietModeEnabled;
    }
    if (settings.quietStartTime !== undefined) {
      updateData.quiet_start_time = settings.quietStartTime;
    }
    if (settings.quietEndTime !== undefined) {
      updateData.quiet_end_time = settings.quietEndTime;
    }

    const { error } = await supabase
      .from('user_push_settings')
      .upsert(updateData);

    if (error) {
      console.error('Error updating push settings:', error);
      throw error;
    }
  }

  /**
   * 모든 알림 설정 통합 조회 (타입별 + 푸시)
   */
  static async getAllNotificationSettings(userId: string): Promise<{
    typeSettings: Record<string, boolean>;
    pushSettings: {
      pushEnabled: boolean;
      quietModeEnabled: boolean;
      quietStartTime: string;
      quietEndTime: string;
    };
  }> {
    const [typeSettings, pushSettings] = await Promise.all([
      this.getNotificationSettings(userId),
      this.getPushSettings(userId),
    ]);

    return { typeSettings, pushSettings };
  }

  /**
   * 모든 알림 설정 일괄 업데이트
   */
  static async updateAllNotificationSettings(
    userId: string,
    typeSettings: Record<string, boolean>,
    pushSettings: {
      pushEnabled?: boolean;
      quietModeEnabled?: boolean;
      quietStartTime?: string;
      quietEndTime?: string;
    }
  ): Promise<void> {
    // 타입별 설정 업데이트
    const typeUpdates = Object.entries(typeSettings).map(([type, isEnabled]) =>
      this.updateNotificationSetting(userId, type, isEnabled)
    );

    // 푸시 설정 업데이트
    const pushUpdate = this.updatePushSettings(userId, pushSettings);

    await Promise.all([...typeUpdates, pushUpdate]);
  }

  /**
   * 알림 생성 (직접 생성)
   * @param receiverId - 알림을 받을 사용자 ID
   * @param type - 알림 타입
   * @param title - 알림 제목
   * @param content - 알림 내용
   * @param metadata - 추가 메타데이터
   */
  static async createNotification(params: {
    receiverId: string;
    type: UserNotificationType;
    title: string;
    content: string;
    relatedId?: string;
    relatedType?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_notifications')
        .insert({
          receiver_id: params.receiverId,
          type: params.type,
          title: params.title,
          content: params.content,
          related_id: params.relatedId,
          related_type: params.relatedType,
          metadata: params.metadata || {},
          is_read: false,
        });

      if (error) {
        console.error('[UserNotificationService] Error creating notification:', error);
        throw error;
      }
    } catch (error) {
      console.error('[UserNotificationService] createNotification failed:', error);
      throw error;
    }
  }

  /**
   * 다수의 알림 일괄 생성
   * @param notifications - 생성할 알림 배열
   */
  static async createBulkNotifications(notifications: Array<{
    receiver_id: string;
    type: UserNotificationType | string;
    title: string;
    content: string;
    related_id?: string;
    related_type?: string;
    metadata?: Record<string, any>;
  }>): Promise<void> {
    if (notifications.length === 0) return;

    try {
      const insertData = notifications.map(n => ({
        receiver_id: n.receiver_id,
        type: n.type,
        title: n.title,
        content: n.content,
        related_id: n.related_id,
        related_type: n.related_type,
        metadata: n.metadata || {},
        is_read: false,
      }));

      const { error } = await supabase
        .from('user_notifications')
        .insert(insertData);

      if (error) {
        console.error('[UserNotificationService] Error creating bulk notifications:', error);
        throw error;
      }
    } catch (error) {
      console.error('[UserNotificationService] createBulkNotifications failed:', error);
      throw error;
    }
  }
}

export const userNotificationService = UserNotificationService;
