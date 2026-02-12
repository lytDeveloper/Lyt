/**
 * Custom hook for fetching explore feed data with infinite scroll using React Query
 * Provides caching, prefetching, infinite scroll, and optimized data fetching
 */

import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchExploreBatch,
  type ExploreBatchResult,
  type ExploreCursors,
} from '../services/exploreService';
import type { ProjectCategory, ProjectStatus } from '../types/exploreTypes';

export type ExploreFeedTab = 'projects' | 'collaborations' | 'partners';

const FIRST_PAGE_LIMIT = 3;
const NEXT_PAGE_LIMIT = 10;

/**
 * Hook for fetching explore feed with infinite scroll support
 *
 * @param category - Category filter
 * @param statuses - Status filters
 * @param searchQuery - Search query (optional)
 * @param activeTab - Currently active explore tab
 * @returns React Query infinite query result with data, loading states, and helper functions
 *
 * @example
 * const {
 *   data,
 *   isLoading,
 *   fetchNextPage,
 *   hasNextPage,
 *   isFetchingNextPage,
 * } = useExploreFeed('fashion', ['in_progress']);
 *
 * const projects = data?.pages.flatMap(page => page.projects) ?? [];
 */
export function useExploreFeed(
  category: ProjectCategory | '전체',
  statuses: ProjectStatus[],
  searchQuery: string | undefined,
  activeTab: ExploreFeedTab
) {
  const queryClient = useQueryClient();

  const query = useInfiniteQuery<ExploreBatchResult>({
    queryKey: ['explore', activeTab, category, statuses, searchQuery],
    queryFn: async ({ pageParam }) => {
      // pageParam is now an object with type-specific cursors
      // For first page, it's undefined (from initialPageParam)
      // For subsequent pages, it contains { projectsCursor, collaborationsCursor, partnersCursor }
      const cursors = pageParam as ExploreCursors | undefined;
      const limit = cursors ? NEXT_PAGE_LIMIT : FIRST_PAGE_LIMIT;

      const result = await fetchExploreBatch({
        category,
        statuses,
        searchQuery,
        cursors,  // Type-specific cursors for independent pagination
        limit,
        activeTab,
        fetchMode: 'active-only',
      });

      return result;
    },
    initialPageParam: undefined as ExploreCursors | undefined,
    getNextPageParam: (lastPage) => {
      // Use type-specific cursors for independent pagination
      // Each type has its own cursor based on the last item returned
      const { projectsCursor, collaborationsCursor, partnersCursor } = lastPage;

      // Continue pagination if ANY type has a cursor (meaning there are older items)
      const hasMoreData = !!(projectsCursor || collaborationsCursor || partnersCursor);

      if (!hasMoreData) {
        return undefined; // No more pages for any type
      }

      // Return all cursors - each type will use its own cursor independently
      return {
        projectsCursor,
        collaborationsCursor,
        partnersCursor,
      };
    },
    staleTime: 5 * 60_000, // 5 minutes - avoid frequent tab reloading
    gcTime: 10 * 60_000, // 10 minutes - keep tab data warm longer
    refetchOnMount: false, // keep cached tab data when returning to a tab
    // Don't inherit global placeholderData(previousData) for tab switching.
    placeholderData: undefined,
  });

  /**
   * Prefetch a specific explore tab using the same filter/search context.
   */
  const prefetchTab = (tab: ExploreFeedTab) => {
    queryClient.prefetchInfiniteQuery({
      queryKey: ['explore', tab, category, statuses, searchQuery],
      queryFn: ({ pageParam }) => {
        const cursors = pageParam as ExploreCursors | undefined;
        const limit = cursors ? NEXT_PAGE_LIMIT : FIRST_PAGE_LIMIT;
        return fetchExploreBatch({
          category,
          statuses,
          searchQuery,
          cursors,
          limit,
          activeTab: tab,
          fetchMode: 'active-only',
        });
      },
      initialPageParam: undefined as ExploreCursors | undefined,
      getNextPageParam: (lastPage: ExploreBatchResult) => {
        const { projectsCursor, collaborationsCursor, partnersCursor } = lastPage;
        if (!projectsCursor && !collaborationsCursor && !partnersCursor) return undefined;
        return { projectsCursor, collaborationsCursor, partnersCursor };
      },
    });
  };

  return {
    ...query,
    prefetchTab,
  };
}
