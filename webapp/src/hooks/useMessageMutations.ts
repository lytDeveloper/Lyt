/**
 * React Query mutation hooks for message operations
 * Handles optimistic updates and cache invalidation
 * 
 * 최적화: currentUserId를 전달받아 각 mutation에서 getUser() 중복 호출 제거
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { messageService } from '../services/messageService';
import type { Attachment, ChatMessage } from '../services/messageService';
import { useMessageStore } from '../stores/messageStore';

/**
 * Hook for sending a message
 * Includes optimistic update logic
 * @param currentUserId - Current user ID to avoid getUser() calls
 */
export function useSendMessage(currentUserId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      roomId,
      content,
      attachments,
      userId,
      type,
      mentionedUserIds,
    }: {
      roomId: string;
      content: string;
      attachments?: Attachment[];
      userId?: string;
      type?: 'text' | 'system' | string;
      mentionedUserIds?: string[];
    }) => {
      // userId 우선순위: 파라미터 > hook 인자
      const effectiveUserId = userId || currentUserId;
      return messageService.sendMessage(roomId, content, attachments || [], effectiveUserId, type || 'text', mentionedUserIds);
    },
    // Optimistic update: add temporary message to cache
    onMutate: async ({ roomId, content, attachments, userId, type }) => {
      // Cancel outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ['messages', roomId] });

      // Snapshot previous value
      const previousMessages = queryClient.getQueryData<ChatMessage[]>(['messages', roomId]);

      // userId 결정 (파라미터 > hook 인자)
      const effectiveUserId = userId || currentUserId;
      if (!effectiveUserId) return { previousMessages };

      // Create optimistic message with unique ID
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const optimisticMessage: ChatMessage = {
        id: tempId,
        senderId: effectiveUserId,
        senderName: '나',
        content,
        timestamp: new Intl.DateTimeFormat('ko-KR', {
          timeZone: 'Asia/Seoul',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        }).format(new Date()),
        isMe: true,
        attachments: attachments || [],
        type: type || 'text',
      };

      // Optimistically update cache
      queryClient.setQueryData<ChatMessage[]>(['messages', roomId], (old = []) => [
        ...old,
        optimisticMessage,
      ]);

      // Return context with message info for error handling
      return { 
        previousMessages, 
        optimisticMessageId: tempId,
        content,
        attachments: attachments || [],
      };
    },
    // On error, keep optimistic message for UI display
    // The 10-second timeout will show retry/cancel buttons
    onError: (err) => {
      console.error('Failed to send message:', err);
    },
    // On success, invalidate to refetch and get server response
    // The realtime subscription will actually update the cache
    onSettled: (_data, _error, variables) => {
      // Invalidate messages to ensure sync
      queryClient.invalidateQueries({ queryKey: ['messages', variables.roomId] });
      // Invalidate rooms list to update last message preview
      queryClient.invalidateQueries({ queryKey: ['messageRooms'] });
    },
  });
}

/**
 * Hook for pinning a room
 * @param currentUserId - Current user ID to avoid getUser() calls
 */
export function usePinRoom(currentUserId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (roomId: string) => {
      return messageService.pinRoom(roomId, currentUserId);
    },
    // Optimistic update
    onMutate: async (roomId) => {
      await queryClient.cancelQueries({ queryKey: ['messageRooms'] });
      const previousRooms = queryClient.getQueryData<any[]>(['messageRooms']);

      // Optimistically update all room queries
      queryClient.setQueriesData<any[]>({ queryKey: ['messageRooms'] }, (old = []) => {
        return old.map((room) =>
          room.id === roomId
            ? {
                ...room,
                isPinned: true,
                pinnedAt: new Date().toISOString(),
              }
            : room,
        );
      });

      return { previousRooms };
    },
    onError: (_err, _roomId, context) => {
      if (context?.previousRooms) {
        queryClient.setQueryData(['messageRooms'], context.previousRooms);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['messageRooms'] });
    },
  });
}

/**
 * Hook for unpinning a room
 * @param currentUserId - Current user ID to avoid getUser() calls
 */
export function useUnpinRoom(currentUserId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (roomId: string) => {
      return messageService.unpinRoom(roomId, currentUserId);
    },
    // Optimistic update
    onMutate: async (roomId) => {
      await queryClient.cancelQueries({ queryKey: ['messageRooms'] });
      const previousRooms = queryClient.getQueryData<any[]>(['messageRooms']);

      queryClient.setQueriesData<any[]>({ queryKey: ['messageRooms'] }, (old = []) => {
        return old.map((room) =>
          room.id === roomId
            ? {
                ...room,
                isPinned: false,
                pinnedAt: undefined,
              }
            : room,
        );
      });

      return { previousRooms };
    },
    onError: (_err, _roomId, context) => {
      if (context?.previousRooms) {
        queryClient.setQueryData(['messageRooms'], context.previousRooms);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['messageRooms'] });
    },
  });
}

/**
 * Hook for toggling notification settings
 * @param currentUserId - Current user ID to avoid getUser() calls
 */
export function useToggleNotification(currentUserId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ roomId, enabled }: { roomId: string; enabled: boolean }) => {
      return messageService.toggleNotification(roomId, enabled, currentUserId);
    },
    // Optimistic update
    onMutate: async ({ roomId, enabled }) => {
      await queryClient.cancelQueries({ queryKey: ['messageRooms'] });
      const previousRooms = queryClient.getQueryData<any[]>(['messageRooms']);

      queryClient.setQueriesData<any[]>({ queryKey: ['messageRooms'] }, (old = []) => {
        return old.map((room) =>
          room.id === roomId
            ? {
                ...room,
                isNotificationEnabled: enabled,
              }
            : room,
        );
      });

      return { previousRooms };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousRooms) {
        queryClient.setQueryData(['messageRooms'], context.previousRooms);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['messageRooms'] });
    },
  });
}

/**
 * Hook for marking messages as read
 * Includes debouncing to batch multiple reads
 * @param currentUserId - Current user ID to avoid getUser() calls
 */
export function useMarkAsRead(currentUserId?: string) {
  const queryClient = useQueryClient();
  const { setLastReadAt, resetUnreadCount } = useMessageStore();

  // Debounce timer ref (managed outside of hook to persist)
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  return useMutation({
    mutationFn: async (roomId: string) => {
      // Clear any pending debounce
      if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }

      return messageService.markAsRead(roomId, currentUserId);
    },
    onMutate: async (roomId) => {
      // Immediately update Zustand store
      const now = new Date().toISOString();
      setLastReadAt(roomId, now);
      resetUnreadCount(roomId);

      // Optimistically update rooms list to clear unread count
      await queryClient.cancelQueries({ queryKey: ['messageRooms'] });
      const previousRooms = queryClient.getQueryData<any[]>(['messageRooms']);

      queryClient.setQueriesData<any[]>({ queryKey: ['messageRooms'] }, (old = []) => {
        return old.map((room) =>
          room.id === roomId
            ? {
                ...room,
                unreadCount: 0,
              }
            : room,
        );
      });

      return { previousRooms };
    },
    onError: (_err, _roomId, context) => {
      if (context?.previousRooms) {
        queryClient.setQueryData(['messageRooms'], context.previousRooms);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['messageRooms'] });
    },
  });
}

