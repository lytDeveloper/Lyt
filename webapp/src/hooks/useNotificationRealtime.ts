/**
 * Realtime subscription hooks for notifications
 * Integrates Supabase Realtime with React Query cache
 */

import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { UserNotification, UserNotificationType } from '../types/userNotification';
import { useNotificationStore } from '../stores/notificationStore';
import { getProfileDisplay } from '../services/profileDisplayService';
import { buildNotificationDescription } from '../utils/notificationHelper';
import { useMessageStore } from '../stores/messageStore';

// Realtime notification payload type (from Supabase)
type RealtimeNotificationRow = {
  id: string;
  type: string;
  title: string;
  content: string;
  related_id: string;
  sender_id?: string;
  receiver_id: string;
  is_read: boolean;
  created_at: string;
  related_type?: string;
  metadata?: Record<string, any>;
};

/**
 * Hook for subscribing to user notifications in realtime
 * Updates React Query cache automatically
 *
 * @param userId - User ID to subscribe to notifications for
 * @param enabled - Whether the subscription should be active
 * @param onNewNotification - Optional callback for handling new notifications (e.g., showing in-app banner)
 */
export function useNotificationRealtime(
  userId: string | undefined,
  enabled: boolean = true,
  onNewNotification?: (notification: UserNotification) => void
) {
  const queryClient = useQueryClient();
  const { setSubscriptionChannel, setIsSubscribed, clearSubscription, incrementUnreadCount } = useNotificationStore();
  const subscriptionRef = useRef<any>(null);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isCleaningUpRef = useRef(false); // cleanup 중인지 추적
  const MAX_RETRIES = 2;
  const RETRY_DELAYS = [1000, 2000]; // 지수 백오프: 1초, 2초
  
  // useRef로 콜백 참조 저장 - 의존성 배열에서 제거하여 재구독 방지
  const onNewNotificationRef = useRef(onNewNotification);
  useEffect(() => {
    onNewNotificationRef.current = onNewNotification;
  }, [onNewNotification]);

  // 구독 생성 및 설정 함수
  const setupSubscription = useCallback((currentUserId: string) => {
    // 기존 재시도 타이머 정리
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    // 기존 채널 정리
    if (subscriptionRef.current) {
      try {
        isCleaningUpRef.current = true; // cleanup 시작
        subscriptionRef.current.unsubscribe();
      } catch (e) {
        console.warn('[useNotificationRealtime] Error unsubscribing old channel:', e);
      } finally {
        isCleaningUpRef.current = false; // cleanup 완료
      }
    }

    // Mark as subscribed
    setIsSubscribed(true);

    // Subscribe to user notifications
    const channel = supabase
      .channel(`user-notifications:${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_notifications',
          filter: `receiver_id=eq.${currentUserId}`,
        },
        (payload: { new: RealtimeNotificationRow }) => {
          const item = payload.new;
          if (!item) return;


          // Transform to UserNotification format (즉시 처리)
          // follow/like 알림의 경우 related_id가 팔로우/좋아요한 사용자 ID
          const isFollowOrLike = item.type === 'follow' || item.type === 'like';
          const baseSenderId: string = isFollowOrLike 
            ? (item.related_id || '')
            : (item.metadata?.sender_id || item.sender_id || '');

          // 즉시 알림 생성 (프로필 정보는 metadata에서 가져오거나 기본값 사용)
          const notification: UserNotification = {
            id: item.id,
            type: item.type as UserNotificationType,
            title: item.title,
            description: item.content,
            relatedId: item.related_id,
            senderId: baseSenderId,
            receiverId: item.receiver_id,
            isRead: item.is_read,
            isStarred: false,
            createdAt: item.created_at,
            senderName: item.metadata?.sender_name || '사용자',
            senderAvatar: item.metadata?.sender_avatar,
            activityId: item.related_id,
            activityType: item.related_type,
            status: item.metadata?.status,
            metadata: item.metadata,
          };

          // 인앱 알림 배너 즉시 표시 (메시지 필터링)
          // useRef를 사용하여 최신 콜백 참조 사용
          const callback = onNewNotificationRef.current;
          if (callback) {
            if (notification.type === 'message') {
              const currentRoomId = useMessageStore.getState().getCurrentRoomId();
              const messageRoomId = notification.relatedId || notification.activityId;
              if (!(currentRoomId && messageRoomId === currentRoomId)) {
                callback(notification);
              }
            } else {
              callback(notification);
            }
          }

          // Update React Query cache - add to all notification queries for this user
          queryClient.setQueriesData<UserNotification[]>(
            { queryKey: ['notifications'] },
            (old = []) => {
              if (old.some((n) => n.id === notification.id)) return old;
              return [notification, ...old];
            }
          );

          // Update unread count
          // 메시지 알림이고, 현재 해당 채팅방에 있으면 count 증가 안 함
          if (!notification.isRead) {
            let shouldIncrementCount = true;

            if (notification.type === 'message') {
              const currentRoomId = useMessageStore.getState().getCurrentRoomId();
              const messageRoomId = notification.relatedId || notification.activityId;
              if (currentRoomId && messageRoomId === currentRoomId) {
                shouldIncrementCount = false;
              }
            }

            if (shouldIncrementCount) {
              incrementUnreadCount();
              queryClient.setQueryData<number>(
                ['unreadNotificationCount', currentUserId],
                (old = 0) => old + 1
              );
            }
          }

          // 백그라운드에서 프로필 정보 업데이트 (비동기)
          const shouldUseProfileDisplay =
            baseSenderId &&
            [
              'invitation', 'message', 'application', 'withdrawal', 'follow', 'like',
              'invitation_accepted', 'invitation_rejected',
              'application_accepted', 'application_rejected', 'question', 'answer'
            ].includes(item.type);

          if (shouldUseProfileDisplay) {
            getProfileDisplay(baseSenderId).then((display) => {
              if (display) {
                let updatedDescription = item.content;

                // follow/like는 content 그대로 사용
                if (!isFollowOrLike) {
                  const action = item.metadata?.action as string | undefined;
                  const targetTitle = item.metadata?.target_title as string | undefined;

                  updatedDescription = buildNotificationDescription(
                    item.type as UserNotificationType,
                    action,
                    display.name,
                    targetTitle,
                    item.type === 'message'
                      ? { messageContent: item.content, ...item.metadata }
                      : item.metadata
                  );
                }

                // 캐시에서 알림 업데이트 (프로필 정보 반영)
                queryClient.setQueriesData<UserNotification[]>(
                  { queryKey: ['notifications'] },
                  (old = []) => old.map((n) =>
                    n.id === notification.id
                      ? {
                          ...n,
                          senderName: display.name,
                          senderAvatar: display.avatar,
                          description: updatedDescription,
                        }
                      : n
                  )
                );
              }
            }).catch(() => {
              // 프로필 정보 조회 실패 시 무시 (이미 기본값 사용 중)
            });
          }
        },
      )
      .on(
        'postgres_changes' as any,
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_notifications',
          filter: `receiver_id=eq.${currentUserId}`,
        },
        (payload: { new: RealtimeNotificationRow; old: RealtimeNotificationRow }) => {
          const updated = payload.new;
          if (!updated) return;

          // Update React Query cache for read status changes
          queryClient.setQueriesData<UserNotification[]>(
            { queryKey: ['notifications', currentUserId] },
            (old = []) => {
              return old.map((n) =>
                n.id === updated.id
                  ? {
                      ...n,
                      isRead: updated.is_read,
                    }
                  : n
              );
            }
          );

          // Update unread count if read status changed
          const wasRead = payload.old.is_read;
          const isNowRead = updated.is_read;

          if (!wasRead && isNowRead) {
            // Notification was marked as read
            const { decrementUnreadCount } = useNotificationStore.getState();
            decrementUnreadCount();
            queryClient.setQueryData<number>(
              ['unreadNotificationCount', currentUserId],
              (old = 0) => Math.max(0, old - 1)
            );
          } else if (wasRead && !isNowRead) {
            // Notification was unread (unlikely but handle it)
            incrementUnreadCount();
            queryClient.setQueryData<number>(
              ['unreadNotificationCount', currentUserId],
              (old = 0) => old + 1
            );
          }
        },
      )
      .subscribe((status) => {
        // 구독 상태 관측 및 로깅
        if (status === 'SUBSCRIBED') {
          console.log(`[useNotificationRealtime] Successfully subscribed to notifications for user: ${currentUserId}`);
          retryCountRef.current = 0; // 성공 시 재시도 카운터 리셋
        } else if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR' || status === 'CLOSED') {
          // cleanup 중이면 재시도하지 않음
          if (isCleaningUpRef.current) {
            console.log(`[useNotificationRealtime] Subscription closed during cleanup, skipping retry`);
            return;
          }

          console.warn(`[useNotificationRealtime] Subscription error (${status}) for user: ${currentUserId}`);

          // 재시도 로직 (최대 MAX_RETRIES회)
          if (retryCountRef.current < MAX_RETRIES) {
            const delay = RETRY_DELAYS[retryCountRef.current] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
            console.log(`[useNotificationRealtime] Retrying subscription in ${delay}ms (attempt ${retryCountRef.current + 1}/${MAX_RETRIES})`);

            retryTimeoutRef.current = setTimeout(() => {
              retryCountRef.current += 1;
              setupSubscription(currentUserId);
            }, delay);
          } else {
            console.error(`[useNotificationRealtime] Max retries exceeded for user: ${currentUserId}`);
            setIsSubscribed(false);
          }
        }
      });

    // Store channel reference
    subscriptionRef.current = channel;
    setSubscriptionChannel(channel);
  }, [queryClient, incrementUnreadCount, setSubscriptionChannel, setIsSubscribed]);

  useEffect(() => {
    if (!userId || !enabled) {
      // Cleanup if disabled
      if (subscriptionRef.current) {
        isCleaningUpRef.current = true;
        clearSubscription();
        subscriptionRef.current = null;
        isCleaningUpRef.current = false;
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      retryCountRef.current = 0;
      return;
    }

    // 구독 설정
    setupSubscription(userId);

    // Cleanup
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      isCleaningUpRef.current = true;
      clearSubscription();
      subscriptionRef.current = null;
      retryCountRef.current = 0;
      isCleaningUpRef.current = false;
    };
  }, [userId, enabled, setupSubscription, clearSubscription]);
}

