/**
 * LikeButton Component
 *
 * Purpose: Row 8 - "❤️ 응원하기" 버튼 (Optimistic UI 업데이트)
 *
 * Features:
 * - 좋아요 토글 (liked/unliked 상태)
 * - 클릭 시 즉시 UI 업데이트 (Optimistic)
 * - API 호출 실패 시 롤백
 * - 좋아요 수 증감 표시
 * - 로그인 체크 (비로그인 시 알림)
 *
 * Design Spec:
 * - Liked: Primary color background, white text
 * - Unliked: White background, border, primary text
 * - Font: 14px, 600 weight
 * - Transition: 0.2s all
 *
 * Usage:
 * <LikeButton
 *   itemId={item.id}
 *   itemType={item.type}
 *   initialLiked={isLiked}
 *   initialCount={item.likeCount}
 * />
 */

import { useState, useEffect, useCallback, type MouseEvent } from 'react';
import { Button, styled } from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { communityService } from '../../services/communityService';
import { useAuth } from '../../providers/AuthContext';
import { useCommunityStore } from '../../stores/communityStore';
import { useProfileStore } from '../../stores/profileStore';
import { supabase } from '../../lib/supabase';

const StyledButton = styled(Button, {
  shouldForwardProp: (prop) => prop !== 'isLiked',
})<{ isLiked: boolean }>(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  borderRadius: 20,
  padding: '8px 16px',
  fontSize: 14,
  fontWeight: 500,
  textTransform: 'none',
  transition: 'all 0.2s',
  width: '100%',
  '&:disabled': {
    opacity: 0.9,
  },
  '& .MuiButton-startIcon': {
    marginRight: 6,
  },
}));

interface LikeButtonProps {
  itemId: string;
  itemType: 'project' | 'collaboration';
  initialLiked: boolean;
  initialCount: number;
  isLoggedIn?: boolean;
  onRequireLogin?: () => void;
}

export default function LikeButton({
  itemId,
  itemType,
  initialLiked,
  initialCount,
  isLoggedIn,
  onRequireLogin,
}: LikeButtonProps) {
  const { user } = useAuth();
  const { toggleLike: toggleStoreLike } = useCommunityStore();
  const queryClient = useQueryClient();
  const { type: activeRole, profileId, fanProfile, nonFanProfile } = useProfileStore();

  const [isLiked, setIsLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialCount);

  // Sync internal state when initialLiked or initialCount changes
  useEffect(() => {
    setIsLiked(initialLiked);
  }, [initialLiked]);

  useEffect(() => {
    setLikeCount(initialCount);
  }, [initialCount]);

  /**
   * 현재 활성 프로필의 actorInfo를 수집
   * 좋아요 시점의 프로필 정보를 스냅샷으로 저장하기 위해 사용
   */
  const getActorInfo = useCallback(async () => {
    // customer 는 프로필 테이블이 없으므로 actor 스냅샷을 남기지 않는다
    if (!activeRole || activeRole === 'customer' || !profileId) return undefined;

    let name = '';
    let avatarUrl = '';

    if (activeRole === 'fan') {
      name = fanProfile?.nickname || '';
      const { data } = await supabase
        .from('profile_fans')
        .select('profile_image_url')
        .eq('profile_id', profileId)
        .maybeSingle();
      avatarUrl = data?.profile_image_url || '';
    } else if (activeRole === 'brand') {
      name = nonFanProfile?.record?.brand_name || '';
      const { data } = await supabase
        .from('profile_brands')
        .select('logo_image_url')
        .eq('profile_id', profileId)
        .maybeSingle();
      avatarUrl = data?.logo_image_url || '';
    } else if (activeRole === 'artist') {
      name = nonFanProfile?.record?.artist_name || '';
      const { data } = await supabase
        .from('profile_artists')
        .select('logo_image_url')
        .eq('profile_id', profileId)
        .maybeSingle();
      avatarUrl = data?.logo_image_url || '';
    } else if (activeRole === 'creative') {
      name = nonFanProfile?.record?.nickname || '';
      const { data } = await supabase
        .from('profile_creatives')
        .select('profile_image_url')
        .eq('profile_id', profileId)
        .maybeSingle();
      avatarUrl = data?.profile_image_url || '';
    }

    return { role: activeRole, profileId, name, avatarUrl };
  }, [activeRole, profileId, fanProfile, nonFanProfile]);

  const likeMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        throw new Error('User not authenticated');
      }
      const actorInfo = await getActorInfo();
      return communityService.toggleLike(itemId, itemType, user.id, actorInfo);
    },
    onMutate: async () => {
      // Optimistic update
      const previousLiked = isLiked;
      const previousCount = likeCount;

      // Update UI immediately
      setIsLiked(!isLiked);
      setLikeCount((prev) => (isLiked ? prev - 1 : prev + 1));
      toggleStoreLike(itemId);

      console.log('[LikeButton] Optimistic update:', {
        itemId,
        newLiked: !isLiked,
        newCount: isLiked ? likeCount - 1 : likeCount + 1,
      });

      // Return context for rollback
      return { previousLiked, previousCount };
    },
    onError: (error, _variables, context) => {
      // Rollback on error
      if (context) {
        setIsLiked(context.previousLiked);
        setLikeCount(context.previousCount);
        toggleStoreLike(itemId); // Revert store
      }
      console.error('[LikeButton] Failed to toggle like:', error);
      alert('좋아요 처리에 실패했어요. 다시 시도해주세요.');
    },
    onSuccess: (data) => {
      console.log('[LikeButton] Like toggled successfully:', data);

      // Invalidate queries to get fresh data from server
      queryClient.invalidateQueries({ queryKey: ['community', 'items'] });
      queryClient.invalidateQueries({ queryKey: ['community', 'activity'] });
    },
  });

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    // Prevent parent card click
    event.stopPropagation();

    // Check if user is logged in
    const loggedIn = typeof isLoggedIn === 'boolean' ? isLoggedIn : Boolean(user);
    if (!loggedIn) {
      onRequireLogin?.();
      return;
    }

    // Trigger mutation
    likeMutation.mutate();
  };

  return (
    <StyledButton
      isLiked={isLiked}
      startIcon={isLiked ? <FavoriteIcon /> : <FavoriteBorderIcon />}
      onClick={handleClick}
      disabled={likeMutation.isPending}
    >
      {isLiked ? '응원중' : '응원하기'} ({likeCount})
    </StyledButton>
  );
}
