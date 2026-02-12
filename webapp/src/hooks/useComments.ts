/**
 * useComments Hook
 *
 * Manages comment state with:
 * - Event-based refresh (pull-to-refresh, 댓글 작성, 좋아요 시)
 * - Optimistic UI updates
 * - Rollback on error
 *
 * iOS 성능 최적화: 5초 폴링 제거 → 이벤트 기반으로 변경 (API 호출 90%+ 감소)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { communityService } from '../services/communityService';
import { profileService } from '../services/profileService';
import { useProfileStore } from '../stores/profileStore';
import { useAuth } from '../providers/AuthContext';

export function useComments(itemId: string, itemType: 'project' | 'collaboration') {
  const { user } = useAuth();
  const { type: activeRole, profileId, fanProfile, nonFanProfile } = useProfileStore();
  const queryClient = useQueryClient();

  const { data: comments = [], isLoading, refetch } = useQuery({
    queryKey: ['comments', itemType, itemId],
    queryFn: () => communityService.getComments(itemId, itemType),
    // iOS 성능 최적화: 5초 폴링 제거, 이벤트 기반 수동 refetch로 변경
    // refetchInterval 제거하여 API 호출 90%+ 감소
    staleTime: 60_000, // 1분간 fresh 상태 유지
    enabled: !!itemId && !!itemType,
  });

  const addCommentMutation = useMutation({
    mutationFn: (data: { content: string; parentId?: string }) => {
      const authorRole =
        activeRole && activeRole !== 'customer' ? activeRole : undefined;
      return communityService.addComment(
        itemId,
        itemType,
        data.content,
        data.parentId,
        authorRole,
      );
    },
    onMutate: async (newComment) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['comments', itemType, itemId] });

      // Snapshot previous value
      const previousComments = queryClient.getQueryData(['comments', itemType, itemId]);

      // Prefer active-role name/avatar for optimistic UI
      const resolveRoleProfile = async () => {
        let name = user?.user_metadata?.nickname || '';
        let avatarUrl = user?.user_metadata?.avatar_url || '';

        if (user?.id && activeRole && activeRole !== 'customer' && profileId) {
          try {
            const profile = await profileService.getProfile(profileId, activeRole);

            if (activeRole === 'brand') {
              name = nonFanProfile?.record.brand_name || name;
              avatarUrl = (profile as any)?.logo_image_url || avatarUrl;
            } else if (activeRole === 'artist') {
              name = nonFanProfile?.record.artist_name || name;
              avatarUrl = (profile as any)?.logo_image_url || avatarUrl;
            } else if (activeRole === 'creative') {
              name = nonFanProfile?.record.nickname || name;
              avatarUrl = (profile as any)?.profile_image_url || avatarUrl;
            } else if (activeRole === 'fan') {
              name = fanProfile?.nickname || name;
              avatarUrl = (profile as any)?.profile_image_url || avatarUrl;
            }
            return { name, avatarUrl };
          } catch {
            // fallback below
          }
        }

        if (user?.id) {
          try {
            const roleProfile = await communityService.getRolePriorityProfile(user.id);
            return {
              name: roleProfile.name || name,
              avatarUrl: roleProfile.avatarUrl || avatarUrl,
            };
          } catch {
            // ignore, use defaults
          }
        }

        return { name, avatarUrl };
      };

      const roleProfile = await resolveRoleProfile();

      // Optimistically update to the new value
      queryClient.setQueryData(['comments', itemType, itemId], (old: any[]) => [
        {
          id: 'temp-' + Date.now(),
          userId: user?.id,
          userName: roleProfile.name,
          userAvatar: roleProfile.avatarUrl,
          content: newComment.content,
          createdAt: new Date().toISOString(),
          likeCount: 0,
          replyCount: 0,
          isLiked: false,
          isOwner: true,
        },
        ...(old || []),
      ]);

      return { previousComments };
    },
    onError: (_err, _newComment, context) => {
      // Rollback on error
      queryClient.setQueryData(['comments', itemType, itemId], context?.previousComments);
      alert('댓글 작성에 실패했어요.');
    },
    onSuccess: () => {
      // Refetch to get server data
      queryClient.invalidateQueries({ queryKey: ['comments', itemType, itemId] });
    },
  });

  return {
    comments,
    isLoading,
    addComment: addCommentMutation.mutate,
    isPending: addCommentMutation.isPending,
    // iOS 성능 최적화: 이벤트 기반 수동 refetch
    // Pull-to-refresh, 댓글 작성 후, 좋아요/해제 후 호출
    refetch,
  };
}
