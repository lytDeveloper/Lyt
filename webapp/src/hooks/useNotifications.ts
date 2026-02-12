/**
 * React Query hooks for user notifications
 * Provides caching, automatic refetching, and optimized data fetching
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userNotificationService } from '../services/userNotificationService';
import type { UserNotification, UserNotificationType } from '../types/userNotification';
import { useNotificationStore } from '../stores/notificationStore';

/**
 * Hook for fetching user notifications
 * 
 * @param userId - User ID to fetch notifications for
 * @param filters - Optional filters (type, isRead, limit, offset)
 * @param enabled - Whether the query should run (default: true if userId is provided)
 * @returns React Query result with notifications data and loading state
 */
export function useNotifications(
  userId: string | undefined,
  filters?: {
    type?: UserNotificationType;
    isRead?: boolean;
    limit?: number;
    offset?: number;
  },
  enabled: boolean = true
) {
  return useQuery<UserNotification[]>({
    queryKey: ['notifications', userId, filters],
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required');
      return userNotificationService.getUserNotifications(userId, filters);
    },
    enabled: enabled && !!userId,
    staleTime: 30_000, // 30 seconds - notifications change frequently
    gcTime: 5 * 60_000, // 5 minutes
    placeholderData: (previousData) => previousData,
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook for fetching unread notification count
 * 
 * @param userId - User ID to fetch count for
 * @param enabled - Whether the query should run (default: true if userId is provided)
 * @returns React Query result with unread count
 */
export function useUnreadNotificationCount(
  userId: string | undefined,
  enabled: boolean = true
) {
  return useQuery<number>({
    queryKey: ['unreadNotificationCount', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required');
      const count = await userNotificationService.getUnreadCount(userId);
      // Zustand 스토어와 동기화
      useNotificationStore.getState().setUnreadCount(count);
      return count;
    },
    enabled: enabled && !!userId,
    staleTime: 10_000, // 10 seconds - count changes frequently
    gcTime: 2 * 60_000, // 2 minutes
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook for marking a notification as read
 * Uses optimistic updates for instant UI feedback
 * 
 * @returns Mutation function for marking notification as read
 */
export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();
  const { decrementUnreadCount } = useNotificationStore();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      await userNotificationService.markAsRead(notificationId);
    },
    onMutate: async (notificationId) => {
      // 진행 중인 쿼리 취소
      await queryClient.cancelQueries({ queryKey: ['notifications'] });

      // 이전 상태 스냅샷 저장
      const previousNotifications = queryClient.getQueriesData<UserNotification[]>({
        queryKey: ['notifications'],
      });

      // Optimistic update: 모든 notifications 쿼리에서 해당 알림을 읽음 처리
      queryClient.setQueriesData<UserNotification[]>(
        { queryKey: ['notifications'] },
        (old = []) => {
          return old.map((n) =>
            n.id === notificationId ? { ...n, isRead: true } : n
          );
        }
      );

      // 읽지 않은 알림 수 감소
      decrementUnreadCount();

      // unread count 쿼리도 업데이트
      queryClient.setQueriesData<number>(
        { queryKey: ['unreadNotificationCount'] },
        (old = 0) => Math.max(0, old - 1)
      );

      return { previousNotifications };
    },
    onError: (_err, _notificationId, context) => {
      // 에러 시 롤백
      if (context?.previousNotifications) {
        context.previousNotifications.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      // 읽지 않은 알림 수 복원
      useNotificationStore.getState().incrementUnreadCount();
    },
    onSettled: () => {
      // 성공/실패 관계없이 관련 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unreadNotificationCount'] });
    },
  });
}

/**
 * Hook for marking all notifications as read
 * Uses optimistic updates for instant UI feedback
 * 
 * @returns Mutation function for marking all notifications as read
 */
export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();
  const { setUnreadCount } = useNotificationStore();

  return useMutation({
    mutationFn: async (userId: string) => {
      await userNotificationService.markAllAsRead(userId);
    },
    onMutate: async (userId) => {
      // 진행 중인 쿼리 취소
      await queryClient.cancelQueries({ queryKey: ['notifications'] });

      // 이전 상태 스냅샷 저장
      const previousNotifications = queryClient.getQueriesData<UserNotification[]>({
        queryKey: ['notifications'],
      });
      const previousCount = queryClient.getQueryData<number>([
        'unreadNotificationCount',
        userId,
      ]);

      // Optimistic update: 모든 알림을 읽음 처리
      queryClient.setQueriesData<UserNotification[]>(
        { queryKey: ['notifications'] },
        (old = []) => old.map((n) => ({ ...n, isRead: true }))
      );

      // 읽지 않은 알림 수를 0으로 설정
      setUnreadCount(0);
      queryClient.setQueryData<number>(['unreadNotificationCount', userId], 0);

      return { previousNotifications, previousCount };
    },
    onError: (_err, userId, context) => {
      // 에러 시 롤백
      if (context?.previousNotifications) {
        context.previousNotifications.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      if (context?.previousCount !== undefined) {
        queryClient.setQueryData(['unreadNotificationCount', userId], context.previousCount);
        setUnreadCount(context.previousCount);
      }
    },
    onSettled: () => {
      // 성공/실패 관계없이 관련 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unreadNotificationCount'] });
    },
  });
}

/**
 * Hook for fetching notification settings
 * 
 * @param userId - User ID to fetch settings for
 * @param enabled - Whether the query should run (default: true if userId is provided)
 * @returns React Query result with settings data
 */
export function useNotificationSettings(
  userId: string | undefined,
  enabled: boolean = true
) {
  return useQuery<Record<string, boolean>>({
    queryKey: ['notificationSettings', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required');
      return userNotificationService.getNotificationSettings(userId);
    },
    enabled: enabled && !!userId,
    staleTime: 5 * 60_000, // 5 minutes - settings don't change often
    gcTime: 10 * 60_000, // 10 minutes
    refetchOnWindowFocus: false,
  });
}

/**
 * 특정 채팅방의 메시지 알림 일괄 읽음 처리 훅
 * 채팅방 입장 시 해당 방의 모든 미읽음 메시지 알림을 일괄 처리
 *
 * @returns Mutation function for marking room messages as read
 */
export function useMarkRoomMessagesAsRead() {
  const queryClient = useQueryClient();
  const { setUnreadCount } = useNotificationStore();

  return useMutation({
    mutationFn: async ({ userId, roomId }: { userId: string; roomId: string }) => {
      return userNotificationService.markMessageNotificationsByRoomId(userId, roomId);
    },
    onSuccess: (markedCount, { userId, roomId }) => {
      if (markedCount > 0) {
        // 캐시에서 해당 채팅방 알림 읽음 처리
        queryClient.setQueriesData<UserNotification[]>(
          { queryKey: ['notifications'] },
          (old = []) => old.map(n =>
            n.type === 'message' &&
            (n.relatedId === roomId || n.activityId === roomId)
              ? { ...n, isRead: true }
              : n
          )
        );

        // unreadCount 감소
        queryClient.setQueryData<number>(
          ['unreadNotificationCount', userId],
          (old = 0) => Math.max(0, old - markedCount)
        );

        // Zustand store도 업데이트
        const currentCount = useNotificationStore.getState().unreadCount;
        setUnreadCount(Math.max(0, currentCount - markedCount));
      }
    },
    onSettled: () => {
      // 쿼리 무효화하여 최신 상태 동기화
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unreadNotificationCount'] });
      // 메시지 룸 리스트의 unreadCount도 갱신 (탭 배지 업데이트)
      queryClient.invalidateQueries({ queryKey: ['messageRooms'] });
    },
  });
}

/**
 * Hook for updating notification setting
 *
 * @returns Mutation function for updating notification setting
 */
export function useUpdateNotificationSetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      type,
      isEnabled,
    }: {
      userId: string;
      type: string;
      isEnabled: boolean;
    }) => {
      await userNotificationService.updateNotificationSetting(userId, type, isEnabled);
    },
    onMutate: async ({ userId, type, isEnabled }) => {
      // 진행 중인 쿼리 취소
      await queryClient.cancelQueries({ queryKey: ['notificationSettings', userId] });

      // 이전 상태 스냅샷 저장
      const previousSettings = queryClient.getQueryData<Record<string, boolean>>([
        'notificationSettings',
        userId,
      ]);

      // Optimistic update
      queryClient.setQueryData<Record<string, boolean>>(
        ['notificationSettings', userId],
        (old = {}) => ({
          ...old,
          [type]: isEnabled,
        })
      );

      return { previousSettings };
    },
    onError: (_err, variables, context) => {
      // 에러 시 롤백
      if (context?.previousSettings) {
        queryClient.setQueryData(
          ['notificationSettings', variables.userId],
          context.previousSettings
        );
      }
    },
    onSettled: (_data, _error, variables) => {
      // 성공/실패 관계없이 관련 쿼리 무효화
      queryClient.invalidateQueries({
        queryKey: ['notificationSettings', variables.userId],
      });
    },
  });
}

