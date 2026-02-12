/**
 * useViewerPresence Hook
 *
 * Purpose: Supabase Presence로 실시간 뷰어 수 추적
 *
 * How it works:
 * 1. 사용자가 카드를 보면 Presence 채널에 join (track)
 * 2. 같은 채널에 있는 사용자 수를 실시간 카운트
 * 3. 사용자가 떠나면 자동으로 leave (untrack)
 *
 * Features:
 * - 실시간 뷰어 카운트
 * - 자동 cleanup (컴포넌트 unmount 시)
 * - enabled 옵션으로 조건부 활성화 (성능 최적화)
 *
 * Usage:
 * const viewerCount = useViewerPresence({
 *   itemId: item.id,
 *   itemType: item.type,
 *   enabled: true
 * });
 */

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface ViewerPresenceOptions {
  itemId: string;
  itemType: 'project' | 'collaboration';
  enabled?: boolean;
  subscribeOnly?: boolean; // true면 채널 구독만 (count 읽기), false면 track도 수행 (count에 포함됨)
}

export function useViewerPresence({ itemId, itemType, enabled = true, subscribeOnly = false }: ViewerPresenceOptions) {
  const [viewerCount, setViewerCount] = useState(0);

  useEffect(() => {
    if (!enabled || !itemId) {
      setViewerCount(0);
      return;
    }

    const channelName = `${itemType}-${itemId}`;

    //console.log(`[Presence] Joining channel: ${channelName}`);

    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: itemId,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const count = Object.keys(state).length;
        setViewerCount(count);
 //       console.log(`[Presence] Viewer count updated: ${count}`);
      })
      // .on('presence', { event: 'join' }, ({ newPresences }) => {
      //   console.log('[Presence] User joined:', newPresences);
      // })
      // .on('presence', { event: 'leave' }, ({ leftPresences }) => {
      //   console.log('[Presence] User left:', leftPresences);
      // })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // subscribeOnly가 true면 구독만 하고 track하지 않음 (count에 포함되지 않음)
          if (subscribeOnly) {
            //console.log(`[Presence] Subscribe-only mode, not tracking in channel: ${channelName}`);
            return;
          }

          // Get current user
          const {
            data: { user },
          } = await supabase.auth.getUser();

          // Track this user's presence (count에 포함됨)
          await channel.track({
            online_at: new Date().toISOString(),
            user_id: user?.id || 'anonymous',
          });

          //console.log(`[Presence] Tracking user in channel: ${channelName}`);
        }
      });

    // Cleanup function
    return () => {
      //console.log(`[Presence] Leaving channel: ${channelName}`);
      channel.untrack();
      supabase.removeChannel(channel);
    };
  }, [itemId, itemType, enabled, subscribeOnly]);

  return viewerCount;
}
