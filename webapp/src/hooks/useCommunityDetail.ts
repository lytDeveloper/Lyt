/**
 * useCommunityDetail Hook
 *
 * Fetches full details for a community item (project/collaboration) including:
 * - Basic information (title, description, etc.)
 * - Engagement stats (likes, comments, views)
 * - Team members (from project_members/collaboration_members)
 * - Progress calculation from workflow steps
 */

import { useQuery } from '@tanstack/react-query';
import { communityService } from '../services/communityService';

export function useCommunityDetail(id: string, type: 'project' | 'collaboration') {
  return useQuery({
    queryKey: ['community', 'detail', type, id],
    queryFn: async () => {
      // Fetch both item details and team members in parallel
      const [item, members] = await Promise.all([
        communityService.getCommunityItemDetail(id, type),
        communityService.getTeamMembers(id, type),
      ]);

      return {
        ...item,
        teamMembers: members,
      };
    },
    staleTime: 30_000, // 30 seconds
    gcTime: 5 * 60_000, // 5 minutes (formerly cacheTime)
    enabled: !!id && !!type, // Only run if we have both id and type
  });
}
