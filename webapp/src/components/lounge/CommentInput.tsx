/**
 * CommentInput Component
 *
 * Input field for adding comments/replies with:
 * - User avatar
 * - Text input
 * - Submit button
 */

import { useEffect, useState } from 'react';
import { Box, Avatar, TextField, IconButton, styled, useTheme, Typography, Button } from '@mui/material';
import { useAuth } from '../../providers/AuthContext';
import { communityService } from '../../services/communityService';
import { profileService } from '../../services/profileService';
import { useProfileStore } from '../../stores/profileStore';
import { useComments } from '../../hooks/useComments';
import ArrowCircleUpRoundedIcon from '@mui/icons-material/ArrowCircleUpRounded';

const InputContainer = styled(Box)({
  display: 'flex',
  alignItems: 'flex-end',
  gap: 12,
  padding: '10px 0',
});

interface Props {
  itemId: string;
  itemType: 'project' | 'collaboration';
  parentId?: string;
  replyToName?: string;
  onCommentAdded?: () => void;
  onCancel?: () => void;
  onFocus?: () => void;
  showTopBorder?: boolean;
  onSubmitOverride?: (content: string) => Promise<void>;
}

export default function CommentInput({
  itemId,
  itemType,
  parentId,
  replyToName,
  onCommentAdded,
  onCancel,
  onFocus,
  showTopBorder = true,
  onSubmitOverride,
}: Props) {
  const { user } = useAuth();
  const { type: activeRole, profileId, fanProfile, nonFanProfile } = useProfileStore();
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [displayAvatar, setDisplayAvatar] = useState('');
  const { addComment, isPending: isCommentPending } = useComments(itemId, itemType);

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      if (!user) return;
      let name = user.user_metadata?.nickname || '';
      let avatar = user.user_metadata?.avatar_url || '';

      if (activeRole && activeRole !== 'customer' && profileId) {
        try {
          const profile = await profileService.getProfile(profileId, activeRole);
          if (!isMounted) return;

          if (activeRole === 'brand') {
            name = nonFanProfile?.record.brand_name || name;
            avatar = (profile as any)?.logo_image_url || avatar;
          } else if (activeRole === 'artist') {
            name = nonFanProfile?.record.artist_name || name;
            avatar = (profile as any)?.logo_image_url || avatar;
          } else if (activeRole === 'creative') {
            name = nonFanProfile?.record.nickname || name;
            avatar = (profile as any)?.profile_image_url || avatar;
          } else if (activeRole === 'fan') {
            name = fanProfile?.nickname || name;
            avatar = (profile as any)?.profile_image_url || avatar;
          }
        } catch {
          // ignore and fall back
        }
      } else {
        try {
          const profile = await communityService.getRolePriorityProfile(user.id);
          name = profile.name || name;
          avatar = profile.avatarUrl || avatar;
        } catch {
          // ignore, use defaults
        }
      }

      if (!isMounted) return;
      setDisplayName(name);
      setDisplayAvatar(avatar);
    };

    loadProfile();
    return () => {
      isMounted = false;
    };
  }, [user, activeRole, profileId, fanProfile, nonFanProfile]);

  const handleSubmit = async () => {
    const trimmed = content.trim();
    if (!trimmed || isSubmitting || isCommentPending) return;

    // 외부에서 제출 로직을 제어(예: 대댓글 낙관적 처리)
    if (onSubmitOverride) {
      setIsSubmitting(true);
      try {
        await onSubmitOverride(trimmed);
        setContent('');
        onCommentAdded?.();
        if (onCancel) onCancel();
      } catch (error) {
        // 실패 시 입력값 유지
        setContent(trimmed);
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // 최상위 댓글은 react-query 훅으로 낙관적 업데이트
    if (!parentId) {
      const previousContent = trimmed;
      setContent('');

      addComment(
        { content: previousContent },
        {
          onSuccess: () => {
            onCommentAdded?.();
            if (onCancel) onCancel();
          },
          onError: () => {
            setContent(previousContent);
          },
        }
      );
      return;
    }

    // 대댓글은 기존 흐름 유지 (별도 리스트 상태 관리)
    setIsSubmitting(true);
    try {
      const authorRole =
        activeRole && activeRole !== 'customer' ? activeRole : undefined;

      await communityService.addComment(itemId, itemType, trimmed, parentId, authorRole);
      setContent('');
      onCommentAdded?.();
      if (onCancel) onCancel();
    } catch (error) {
      alert('댓글 작성에 실패했어요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;
  const theme = useTheme();
  return (
    <InputContainer
      sx={{
        pt: showTopBorder ? '10px' : 0,
      }}
    >
      <Avatar src={displayAvatar || undefined} sx={{ width: 40, height: 40 }}>
        {(displayName || user.user_metadata?.nickname || 'U').charAt(0)}
      </Avatar>

      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        {parentId && replyToName && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: theme.palette.action.hover,
              borderRadius: 12,
              px: 1.5,
              py: 0.5,
            }}
          >
            <Typography variant="caption" color="text.secondary" noWrap sx={{ flex: 1, minWidth: 0 }}>
              {`${replyToName}님에게 답글 남기는 중`}
            </Typography>
            {onCancel && (
              <Button
                size="small"
                onClick={() => {
                  setContent('');
                  onCancel();
                }}
                sx={{ minWidth: 0, ml: 1, color: 'text.secondary', textTransform: 'none', fontSize: 12 }}
              >
                취소
              </Button>
            )}
          </Box>
        )}

        <TextField
          fullWidth
          autoComplete="off"
          variant="outlined"
          placeholder={parentId ? '답글을 입력하세요' : '응원의 메시지를 남겨주세요'}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onFocus={onFocus}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 50, height: 40,
            },
          }}
        />
      </Box>

      <IconButton
        onClick={handleSubmit}
        disabled={!content.trim() || isSubmitting || isCommentPending}
        sx={{
          width: 32,
          height: 32,
          bgcolor: 'transparent',
          color: theme.palette.primary.main,
          '&:disabled': { color: 'grey.[100]' },
        }}
      >
        <ArrowCircleUpRoundedIcon sx={{ fontSize: 28, mb: 1 }} />
      </IconButton>
    </InputContainer>
  );
}
