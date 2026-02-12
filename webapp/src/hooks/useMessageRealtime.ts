/**
 * Realtime subscription hooks for messages
 * Integrates Supabase Realtime with React Query cache
 */

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { getUserDetails } from '../services/messageService';
import type { ChatMessage, Attachment } from '../services/messageService';
import { useMessageStore } from '../stores/messageStore';

// Realtime message payload type (from Supabase)
type RealtimeMessageRow = {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  attachments?: Attachment[];
};

// Helper to format time in KST
const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const kstOptions: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  };

  if (diff < 24 * 60 * 60 * 1000 && date.getDate() === now.getDate()) {
    return new Intl.DateTimeFormat('ko-KR', kstOptions).format(date);
  }

  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
};

/**
 * Hook for subscribing to messages in a specific room
 * Updates React Query cache automatically
 */
export function useMessageRealtimeForRoom(roomId: string | undefined, enabled: boolean = true) {
  const queryClient = useQueryClient();
  const { addSubscriptionChannel, removeSubscriptionChannel, addSubscribedRoom, removeSubscribedRoom, isSubscribed } = useMessageStore();
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Get current user
    supabase.auth.getUser().then(({ data: { user } }) => {
      userIdRef.current = user?.id || null;
    });

    if (!roomId || !enabled) return;

    // Skip if already subscribed
    if (isSubscribed(roomId)) {
      return;
    }

    // Mark as subscribed
    addSubscribedRoom(roomId);

    // Subscribe to room messages
    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${roomId}`,
        },
        async (payload: { new: RealtimeMessageRow }) => {
          const newMsg = payload.new;
          if (!newMsg) return;

          const currentUserId = userIdRef.current;
          const isMe = currentUserId ? newMsg.sender_id === currentUserId : false;

          // Get sender details if not me
          let senderName = '나';
          let senderAvatar = undefined;

          if (!isMe && currentUserId) {
            const details = await getUserDetails(newMsg.sender_id);
            senderName = details?.name || '사용자';
            senderAvatar = details?.avatar;
          }

          // Map to ChatMessage format
          const mapped: ChatMessage = {
            id: newMsg.id,
            senderId: newMsg.sender_id,
            senderName,
            senderAvatar,
            content: newMsg.content,
            timestamp: formatTime(newMsg.created_at),
            isMe,
            attachments: newMsg.attachments || [],
            type: (newMsg as any).type || 'text',
          };

          // Update React Query cache
          queryClient.setQueryData<ChatMessage[]>(['messages', roomId], (old = []) => {
            // Skip if message already exists
            if (old.some((m) => m.id === mapped.id)) return old;

            // If it's my message, try to replace the most recent 'sending' message
            if (isMe) {
              const next = [...old];
              const idx = [...next].reverse().findIndex((m) => m.isMe && m.id.startsWith('temp-'));
              if (idx !== -1) {
                const realIndex = next.length - 1 - idx;
                next[realIndex] = mapped;
                // Note: Component will clean up failedMessages when it detects the temp message is gone
                return next;
              }
            }

            // Otherwise append
            return [...old, mapped];
          });

          // Invalidate rooms list to update last message preview
          queryClient.invalidateQueries({ queryKey: ['messageRooms'] });

          // Update unread count if not me AND not currently viewing this room
          // 현재 열려있는 채팅방이면 unread count를 증가시키지 않음 (이미 보고 있으므로)
          if (!isMe) {
            const { incrementUnreadCount, getCurrentRoomId } = useMessageStore.getState();
            const currentRoomId = getCurrentRoomId();
            if (currentRoomId !== roomId) {
              incrementUnreadCount(roomId);
            }
          }
        },
      )
      .subscribe();

    // Store channel reference
    addSubscriptionChannel(roomId, channel);

    // Cleanup
    return () => {
      removeSubscriptionChannel(roomId);
      removeSubscribedRoom(roomId);
    };
  }, [roomId, enabled, queryClient, isSubscribed, addSubscriptionChannel, removeSubscriptionChannel, addSubscribedRoom, removeSubscribedRoom]);
}

/**
 * Hook for subscribing to room list updates
 * Listens for new messages across all rooms to update room list
 */
export function useMessageRoomsRealtime(filter: string = 'all', enabled: boolean = true) {
  const queryClient = useQueryClient();
  const userIdRef = useRef<string | null>(null);
  const subscriptionRef = useRef<any>(null);

  useEffect(() => {
    if (!enabled) return;

    // Get current user
    supabase.auth.getUser().then(({ data: { user } }) => {
      userIdRef.current = user?.id || null;
    });

    // Subscribe to all message insertions
    const channel = supabase
      .channel('message-rooms-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        async (payload: { new: RealtimeMessageRow & { room_id: string } }) => {
          const newMsg = payload.new;
          if (!newMsg || !newMsg.room_id) return;

          // Invalidate the rooms list to refresh last message
          // This will trigger a refetch for the active filter
          queryClient.invalidateQueries({ queryKey: ['messageRooms'] });

          // If it's not my message AND not currently viewing this room, increment unread count
          // 현재 열려있는 채팅방이면 unread count를 증가시키지 않음 (이미 보고 있으므로)
          const currentUserId = userIdRef.current;
          if (currentUserId && newMsg.sender_id !== currentUserId) {
            const { incrementUnreadCount, getCurrentRoomId } = useMessageStore.getState();
            const currentRoomId = getCurrentRoomId();
            if (currentRoomId !== newMsg.room_id) {
              incrementUnreadCount(newMsg.room_id);
            }
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_participants',
        },
        () => {
          // Participant settings changed (pinned, notification, etc.)
          // Invalidate rooms list to refresh
          queryClient.invalidateQueries({ queryKey: ['messageRooms'] });
        },
      )
      .subscribe();

    subscriptionRef.current = channel;

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, [filter, enabled, queryClient]);
}

/**
 * Combined hook for both room messages and room list realtime updates
 */
export function useMessageRealtime(roomId: string | undefined, filter: string = 'all', enabled: boolean = true) {
  // Subscribe to individual room messages
  useMessageRealtimeForRoom(roomId, enabled && !!roomId);

  // Subscribe to room list updates
  useMessageRoomsRealtime(filter, enabled);
}

