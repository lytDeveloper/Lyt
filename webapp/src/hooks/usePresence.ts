import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { usePresenceStore } from '../stores/presenceStore';
import { isFeatureEnabled } from '../lib/featureFlags';
import type { RealtimeChannel, RealtimePresenceState } from '@supabase/supabase-js';

/** Presence 채널 토픽명 */
const PRESENCE_CHANNEL = 'app:presence';

interface PresencePayload {
  user_id: string;
  online_at: string;
}

/**
 * Supabase Realtime Presence를 사용하여 온라인 상태를 추적하는 Hook
 * 
 * @param userId - 현재 로그인한 사용자 ID (null이면 구독하지 않음)
 * @returns { connect, disconnect, isConnected }
 */
export function usePresence(userId: string | null) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isConnectingRef = useRef(false);

  const {
    setOnlineUsers,
    addOnlineUser,
    removeOnlineUser,
    setChannel,
    setIsConnected,
    isConnected,
    reset,
  } = usePresenceStore();

  /**
   * Presence 상태에서 온라인 사용자 ID 목록 추출
   */
  const extractOnlineUserIds = useCallback((presenceState: RealtimePresenceState<PresencePayload>): string[] => {
    const userIds: string[] = [];

    // presenceState는 { [key: string]: PresencePayload[] } 형태
    Object.keys(presenceState).forEach((key) => {
      const presences = presenceState[key];
      if (Array.isArray(presences)) {
        presences.forEach((presence) => {
          if (presence.user_id) {
            userIds.push(presence.user_id);
          }
        });
      }
    });

    return [...new Set(userIds)]; // 중복 제거
  }, []);

  /**
   * Presence 채널 연결
   */
  const connect = useCallback(async () => {
    if (!userId) {
 //     console.log('[Presence] userId가 없어 연결하지 않아요.');
      return;
    }

    if (channelRef.current || isConnectingRef.current) {
 //     console.log('[Presence] 이미 연결되어 있거나 연결 중이에요.');
      return;
    }

    isConnectingRef.current = true;
 //   console.log('[Presence] 연결 시작...', userId);

    try {
      const channel = supabase.channel(PRESENCE_CHANNEL, {
        config: {
          presence: {
            key: userId, // 사용자 ID를 presence key로 사용
          },
        },
      });

      channel
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState<PresencePayload>();
          const onlineIds = extractOnlineUserIds(state);
 //         console.log('[Presence] Sync - 온라인 사용자:', onlineIds.length);
          setOnlineUsers(onlineIds);
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          console.log('[Presence] Join:', key, newPresences);
          if (newPresences && newPresences.length > 0) {
            const presence = newPresences[0] as unknown as PresencePayload;
            const joinedUserId = presence.user_id;
            if (joinedUserId) {
              addOnlineUser(joinedUserId);
            }
          }
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
          console.log('[Presence] Leave:', key, leftPresences);
          if (leftPresences && leftPresences.length > 0) {
            const presence = leftPresences[0] as unknown as PresencePayload;
            const leftUserId = presence.user_id;
            if (leftUserId) {
              removeOnlineUser(leftUserId);
            }
          }
        });

      const status = await channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
         console.log('[Presence] 채널 구독 완료, 상태 추적 시작...');

          // 자신의 온라인 상태 브로드캐스트
          const trackStatus = await channel.track({
            user_id: userId,
            online_at: new Date().toISOString(),
          });

          console.log('[Presence] Track 상태:', trackStatus);

          channelRef.current = channel;
          setChannel(channel);
          setIsConnected(true);
        } else if (status === 'CHANNEL_ERROR') {
//         console.error('[Presence] 채널 에러 발생');
          setIsConnected(false);
        } else if (status === 'CLOSED') {
//         console.log('[Presence] 채널 닫힘');
          setIsConnected(false);
        }
      });

 console.log('[Presence] Subscribe 상태:', status);
    } catch (error) {
 //     console.error('[Presence] 연결 실패:', error);
      setIsConnected(false);
    } finally {
      isConnectingRef.current = false;
    }
  }, [userId, setOnlineUsers, addOnlineUser, removeOnlineUser, setChannel, setIsConnected, extractOnlineUserIds]);

  /**
   * Presence 채널 연결 해제
   */
  const disconnect = useCallback(async () => {
 //   console.log('[Presence] 연결 해제 시작...');

    if (channelRef.current) {
      try {
        // 먼저 untrack 호출하여 다른 클라이언트에게 오프라인 알림
        await channelRef.current.untrack();
 //       console.log('[Presence] Untrack 완료');

        // 채널 제거
        await supabase.removeChannel(channelRef.current);
 //       console.log('[Presence] 채널 제거 완료');
      } catch (error) {
 //       console.error('[Presence] 연결 해제 실패:', error);
      } finally {
        channelRef.current = null;
        reset();
      }
    } else {
      reset();
    }
  }, [reset]);

  // userId가 변경되면 재연결
  useEffect(() => {
    if (userId) {
      connect();
    } else {
      disconnect();
    }

    // Cleanup on unmount
    return () => {
      // 컴포넌트 언마운트 시에는 disconnect를 호출하지 않음
      // AuthProvider에서 관리
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]); // connect, disconnect는 의도적으로 제외

  // Phase 2: visibilitychange 시 re-track (오래 백그라운드 후 복귀 시)
  useEffect(() => {
    if (!isFeatureEnabled('REALTIME_HEALTH_CHECK')) return;
    if (!userId) return;

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && channelRef.current && isConnected) {
        try {
          // 복귀 시 re-track으로 다른 클라이언트에게 온라인 상태 알림
          await channelRef.current.track({
            user_id: userId,
            online_at: new Date().toISOString(),
          });
 //          console.log('[Presence] Re-tracked on visibility change');
        } catch (error) {
 //         console.warn('[Presence] Re-track failed:', error);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [userId, isConnected]);

  return {
    connect,
    disconnect,
    isConnected,
  };
}

/**
 * 온라인 상태만 구독하는 간단한 Hook
 * 특정 사용자가 온라인인지 확인할 때 사용
 */
export function useIsUserOnline(userId: string | null): boolean {
  const onlineUsers = usePresenceStore((state) => state.onlineUsers);

  if (!userId) return false;
  return onlineUsers.has(userId);
}

/**
 * 온라인 사용자 수를 반환하는 Hook
 */
export function useOnlineUserCount(): number {
  const onlineUsers = usePresenceStore((state) => state.onlineUsers);
  return onlineUsers.size;
}

