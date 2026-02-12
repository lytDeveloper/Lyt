/**
 * useCommunityRealtime Hook
 *
 * Purpose: Supabase Realtime으로 lounge_likes 및 lounge_comments 테이블 변경사항 실시간 감지
 *
 * Pattern: useExploreRealtime.ts와 동일한 구조 (Realtime subscriptions)
 *
 * Features:
 * - lounge_likes 테이블 변경 감지 (INSERT, UPDATE, DELETE)
 * - lounge_comments 테이블 변경 감지 (INSERT, UPDATE, DELETE)
 * - TanStack Query cache 자동 invalidation
 * - 커뮤니티 탭 활성화 시에만 구독 (성능 최적화)
 *
 * Usage:
 * useCommunityRealtime(activeTab === 'community');
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export function useCommunityRealtime(enabled = true) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) {
      return;
    }

    console.log('[Community Realtime] Subscribing to likes and comments changes');

    // Subscribe to lounge_likes changes
    const likesChannel = supabase
      .channel('community-likes')
      .on(
        'postgres_changes',
        {
          event: '*', // All events: INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'lounge_likes',
        },
        (payload) => {
          console.log('[Community Realtime] Likes changed:', payload);

          // Invalidate community items to refetch with updated counts
          queryClient.invalidateQueries({ queryKey: ['community', 'items'] });

          // Invalidate activity feed to show new likes
          queryClient.invalidateQueries({ queryKey: ['community', 'activity'] });
        }
      )
      .subscribe();

    // Subscribe to lounge_comments changes
    const commentsChannel = supabase
      .channel('community-comments')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lounge_comments',
        },
        (payload) => {
          console.log('[Community Realtime] Comments changed:', payload);

          // Invalidate community items to refetch with updated counts
          queryClient.invalidateQueries({ queryKey: ['community', 'items'] });

          // Invalidate activity feed to show new comments
          queryClient.invalidateQueries({ queryKey: ['community', 'activity'] });
        }
      )
      .subscribe();

    // Cleanup function
    return () => {
      console.log('[Community Realtime] Unsubscribing from channels');
      supabase.removeChannel(likesChannel);
      supabase.removeChannel(commentsChannel);
    };
  }, [enabled, queryClient]);
}
