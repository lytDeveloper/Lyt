/**
 * React Query Client Configuration
 * Provides centralized cache management for server state
 */

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache fresh data for 1 minute
      staleTime: 60_000, // 60 seconds
      // Keep unused data in cache for 5 minutes
      gcTime: 5 * 60_000, // 5 minutes (formerly cacheTime)
      // Don't refetch on window focus to reduce unnecessary calls
      refetchOnWindowFocus: false,
      // Retry failed requests once
      retry: 1,
      // Show previous data while fetching new data (smooth transitions)
      placeholderData: (previousData: unknown) => previousData,
    },
  },
});
