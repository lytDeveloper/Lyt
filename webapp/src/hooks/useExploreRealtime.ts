/**
 * Custom hook for Supabase Realtime subscriptions on Explore page
 * Automatically invalidates React Query cache when database changes occur
 */

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from '@supabase/supabase-js';
import type { ProjectCategory } from '../types/exploreTypes';

interface UseExploreRealtimeOptions {
  /**
   * Current category filter (used for smart invalidation)
   */
  category?: ProjectCategory | '전체';

  /**
   * Enable/disable realtime subscriptions
   * @default true
   */
  enabled?: boolean;

  /**
   * Callback when cache is invalidated
   */
  onInvalidate?: () => void;
}

/**
 * Hook for Supabase Realtime subscriptions on Explore page
 *
 * Subscribes to:
 * - `projects` table (INSERT, UPDATE, DELETE)
 * - `collaborations` table (INSERT, UPDATE, DELETE)
 * - `profile_artists` table (INSERT, UPDATE, DELETE)
 * - `profile_creatives` table (INSERT, UPDATE, DELETE)
 *
 * Automatically invalidates React Query cache on changes to ensure UI stays in sync.
 *
 * @param options - Realtime subscription options
 *
 * @example
 * useExploreRealtime({
 *   category: 'fashion',
 *   enabled: true,
 *   onInvalidate: () => console.log('Cache invalidated'),
 * });
 */
export function useExploreRealtime(options: UseExploreRealtimeOptions = {}) {
  const { category, enabled = true, onInvalidate } = options;
  const queryClient = useQueryClient();
  const channelsRef = useRef<RealtimeChannel[]>([]);

  useEffect(() => {
    // Early return if disabled
    if (!enabled) {
      return;
    }

    // Helper to invalidate explore queries
    const invalidateExploreQueries = (
      table: string,
      payload: RealtimePostgresChangesPayload<any>
    ) => {
      console.log(`[Realtime] ${table} ${payload.eventType}:`, payload);

      // Invalidate all explore queries
      // React Query will only refetch visible queries (active tabs)
      queryClient.invalidateQueries({ queryKey: ['explore'] });

      // Call callback if provided
      onInvalidate?.();
    };

    // Subscribe to projects table
    const projectsChannel = supabase
      .channel('explore-projects')
      .on(
        'postgres_changes',
        {
          event: '*',  // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'projects',
        },
        (payload) => invalidateExploreQueries('projects', payload)
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[Realtime] Error subscribing to projects');
        }
      });

    // Subscribe to collaborations table
    const collaborationsChannel = supabase
      .channel('explore-collaborations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'collaborations',
        },
        (payload) => invalidateExploreQueries('collaborations', payload)
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[Realtime] Error subscribing to collaborations');
        }
      });

    // Subscribe to profile_artists table (for partners)
    const artistsChannel = supabase
      .channel('explore-artists')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profile_artists',
        },
        (payload) => invalidateExploreQueries('profile_artists', payload)
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[Realtime] Error subscribing to profile_artists');
        }
      });

    // Subscribe to profile_creatives table (for partners)
    const creativesChannel = supabase
      .channel('explore-creatives')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profile_creatives',
        },
        (payload) => invalidateExploreQueries('profile_creatives', payload)
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[Realtime] Error subscribing to profile_creatives');
        }
      });

    // Store channels for cleanup
    channelsRef.current = [
      projectsChannel,
      collaborationsChannel,
      artistsChannel,
      creativesChannel,
    ];

    // Cleanup function
    return () => {
      console.log('[Realtime] Unsubscribing from all channels');
      channelsRef.current.forEach((channel) => {
        supabase.removeChannel(channel);
      });
      channelsRef.current = [];
    };
  }, [enabled, category, queryClient, onInvalidate]);

  // Return nothing for now (could add pause/resume functions in future)
  return null;
}
