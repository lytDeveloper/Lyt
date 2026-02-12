/**
 * React Query hooks for message rooms and messages
 * Provides caching, automatic refetching, and optimized data fetching
 * 
 * 최적화: currentUserId를 전달받아 각 쿼리에서 getUser() 중복 호출 제거
 */

import { useQuery } from '@tanstack/react-query';
import { messageService } from '../services/messageService';
import type { MessageRoom, ChatMessage } from '../services/messageService';

/**
 * Hook for fetching message rooms with filter
 * 
 * @param filter - Filter type: 'all' | 'project' | 'team' | 'partner'
 * @param currentUserId - Current user ID to avoid getUser() calls
 * @returns React Query result with rooms data and loading state
 */
export function useMessageRooms(filter: string = 'all', currentUserId?: string) {
  return useQuery<MessageRoom[]>({
    queryKey: ['messageRooms', filter],
    queryFn: () => messageService.getRooms(filter, currentUserId),
    staleTime: 30_000, // 30 seconds - messages change frequently
    gcTime: 5 * 60_000, // 5 minutes - keep in cache for a while
    placeholderData: (previousData) => previousData, // Keep previous data while fetching
    refetchOnWindowFocus: false, // Don't refetch on window focus to reduce unnecessary calls
  });
}

/**
 * Hook for fetching messages in a specific room
 * 
 * @param roomId - Room ID to fetch messages for
 * @param enabled - Whether the query should run (default: true if roomId is provided)
 * @param currentUserId - Current user ID to avoid getUser() calls
 * @returns React Query result with messages data and loading state
 */
export function useMessages(roomId: string | undefined, enabled: boolean = true, currentUserId?: string) {
  return useQuery<ChatMessage[]>({
    queryKey: ['messages', roomId],
    queryFn: () => {
      if (!roomId) throw new Error('Room ID is required');
      return messageService.getMessages(roomId, currentUserId);
    },
    enabled: enabled && !!roomId, // Only fetch if roomId is provided and enabled
    staleTime: 30_000, // 30 seconds
    gcTime: 5 * 60_000, // 5 minutes
    placeholderData: (previousData) => previousData,
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook for fetching a specific room by ID
 * Uses the rooms list to find the room (more efficient than separate query)
 * 
 * @param roomId - Room ID to fetch
 * @param enabled - Whether the query should run (default: true if roomId is provided)
 * @param currentUserId - Current user ID to avoid getUser() calls
 * @returns React Query result with room data and loading state
 */
export function useMessageRoom(roomId: string | undefined, enabled: boolean = true, currentUserId?: string) {
  return useQuery<MessageRoom | null>({
    queryKey: ['messageRoom', roomId],
    queryFn: async () => {
      if (!roomId) return null;
      // Use getRoomById which internally calls getRooms('all')
      // This is more efficient than creating a separate query
      return (await messageService.getRoomById(roomId, currentUserId)) ?? null;
    },
    enabled: enabled && !!roomId,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    placeholderData: (previousData) => previousData,
    refetchOnWindowFocus: false,
  });
}

