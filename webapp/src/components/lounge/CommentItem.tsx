/**
 * CommentItem Component
 *
 * Individual comment with:
 * - Avatar, name, elapsed time
 * - Content
 * - Like button
 * - Reply button
 * - Edit/Delete (owner only)
 * - Nested replies
 *
 * iOS 성능 최적화: React.memo로 리스트 스크롤 시 불필요한 리렌더링 방지
 */

import { memo, useState } from 'react';
import { Box, Avatar, Typography, IconButton, Button } from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import { formatElapsedTime } from '../../utils/timeFormatter';
import { communityService } from '../../services/communityService';
import { useAuth } from '../../providers/AuthContext';
import { useProfileStore } from '../../stores/profileStore';
import { profileService } from '../../services/profileService';
import { communityService as communityServiceAlias } from '../../services/communityService';
import { useTheme } from '@mui/material';

interface Comment {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  createdAt: string;
  likeCount: number;
  replyCount: number;
  isLiked: boolean;
  isOwner: boolean;
}

export interface ReplySelectPayload {
  commentId: string;
  userName: string;
  submitReply: (content: string) => Promise<void>;
}

interface Props {
  comment: Comment;
  itemId: string;
  itemType: 'project' | 'collaboration';
  onReplySelect?: (payload: ReplySelectPayload) => void;
}

// iOS 성능 최적화: React.memo로 리스트 스크롤 시 불필요한 리렌더링 방지
function CommentItem({ comment, itemId, itemType, onReplySelect }: Props) {
  const [showReplies, setShowReplies] = useState(false);
  const [replies, setReplies] = useState<Comment[]>([]);
  const [isLiked, setIsLiked] = useState(comment.isLiked);
  const [likeCount, setLikeCount] = useState(comment.likeCount);
  const [isDeleted, setIsDeleted] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingReplies, setDeletingReplies] = useState<Record<string, boolean>>({});
  const { user } = useAuth();
  const { type: activeRole, profileId, fanProfile, nonFanProfile } = useProfileStore();

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
        const roleProfile = await communityServiceAlias.getRolePriorityProfile(user.id);
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

  const fetchReplies = async () => {
    try {
      const loadedReplies = await communityService.getReplies(comment.id);
      setReplies(loadedReplies.map((r: any) => ({ ...r, replyCount: 0 })));
    } catch (error) {
      console.error('Failed to load replies:', error);
    }
  };

  const handleToggleReplies = async () => {
    if (!showReplies) {
      if (replies.length === 0 && comment.replyCount > 0) {
        await fetchReplies();
      }
      setShowReplies(true);
      return;
    }
    setShowReplies(false);
  };

  const handleLike = async () => {
    const newLiked = !isLiked;
    const newCount = newLiked ? likeCount + 1 : likeCount - 1;

    // Optimistic update
    setIsLiked(newLiked);
    setLikeCount(newCount);

    try {
      await communityService.toggleCommentLike(comment.id);
    } catch (error) {
      // Rollback on error
      setIsLiked(isLiked);
      setLikeCount(likeCount);
      console.error('Failed to toggle like:', error);
    }
  };

  const handleDelete = async () => {
    if (!confirm('댓글을 삭제하시겠습니까?')) return;

    if (isDeleting) return;

    // Optimistic delete
    setIsDeleted(true);
    setIsDeleting(true);

    try {
      await communityService.deleteComment(comment.id);
    } catch (error) {
      // Rollback on error
      setIsDeleted(false);
      setIsDeleting(false);
      alert('댓글 삭제에 실패했어요.');
    }
  };

  const handleReplyDelete = async (replyId: string) => {
    if (!confirm('댓글을 삭제하시겠습니까?')) return;
    if (deletingReplies[replyId]) return;

    const previousReplies = [...replies];

    // Optimistic remove
    setReplies((curr) => curr.filter((r) => r.id !== replyId));
    setDeletingReplies((curr) => ({ ...curr, [replyId]: true }));

    try {
      await communityService.deleteComment(replyId);
    } catch (error) {
      // Rollback on error
      setReplies(previousReplies);
      setDeletingReplies((curr) => {
        const updated = { ...curr };
        delete updated[replyId];
        return updated;
      });
      alert('댓글 삭제에 실패했어요.');
    }
  };

  const handleReplySubmit = async (content: string) => {
    const previousReplies = [...replies];
    const roleProfile = await resolveRoleProfile();
    const optimisticReply: Comment = {
      id: 'temp-' + Date.now(),
      userId: user?.id || '',
      userName: roleProfile.name,
      userAvatar: roleProfile.avatarUrl,
      content,
      createdAt: new Date().toISOString(),
      likeCount: 0,
      replyCount: 0,
      isLiked: false,
      isOwner: true,
    };

    // Optimistic add and keep replies open
    setReplies((curr) => [optimisticReply, ...curr]);
    setShowReplies(true);

    try {
      const authorRole =
        activeRole && activeRole !== 'customer' ? activeRole : undefined;
      await communityService.addComment(itemId, itemType, content, comment.id, authorRole);
      await fetchReplies();
    } catch (error) {
      // Rollback
      setReplies(previousReplies);
      alert('댓글 작성에 실패했어요.');
    }
  };

  if (isDeleted) return null;

  const theme = useTheme();
  return (
    <Box sx={{ py: 2, borderBottom: '1px solid #E5E7EB' }}>
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Avatar src={comment.userAvatar || undefined} sx={{ width: 40, height: 40 }}>
          {comment.userName.charAt(0)}
        </Avatar>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          {/* Header: Name + Time */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, justifyContent: 'flex-start' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" fontWeight={600}>
                {comment.userName}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatElapsedTime(comment.createdAt)}
              </Typography>
            </Box>
            {/* Delete Button (Owner Only) */}
            {comment.isOwner && (
              <Button size="small" onClick={handleDelete} sx={{ color: 'error.main' }} disabled={isDeleting}>
                삭제
              </Button>
            )}
          </Box>

          {/* Content */}
          <Typography variant="body2" sx={{ mb: 1, whiteSpace: 'pre-wrap' }}>
            {comment.content}
          </Typography>

          {/* Action Row */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1, flexWrap: 'wrap' }}>
            {/* Reply Button */}
            <Button
              size="small"
              onClick={() => {
                setShowReplies(true);
                onReplySelect?.({
                  commentId: comment.id,
                  userName: comment.userName,
                  submitReply: handleReplySubmit,
                });
              }}
            >
              답글 달기
            </Button>

            {/* Show Replies Button */}
            {(comment.replyCount > 0 || replies.length > 0) && (
              <Button size="small" onClick={handleToggleReplies}>
                {showReplies ? '답글 숨기기' : `답글 ${Math.max(comment.replyCount, replies.length)}개 더 보기`}
              </Button>
            )}
          </Box>

          {/* Nested Replies */}
          {showReplies && replies.length > 0 && (
            <Box sx={{ mt: 2, pl: 3 }}>
              {replies.map((reply) => (
                <Box key={reply.id} sx={{ py: 1 }}>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'start' }}>
                    <Avatar src={reply.userAvatar || undefined} sx={{ width: 32, height: 32 }}>
                      {reply.userName.charAt(0)}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 0.5 }}>
                        <Typography variant="caption" fontWeight={600}>
                          {reply.userName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatElapsedTime(reply.createdAt)}
                        </Typography>
                        {reply.isOwner && (
                          <Button
                            size="small"
                            onClick={() => handleReplyDelete(reply.id)}
                            disabled={deletingReplies[reply.id]}
                            sx={{ color: 'error.main', ml: 1, minWidth: 0, padding: 0, fontSize: 12 }}
                          >
                            삭제
                          </Button>
                        )}
                      </Box>
                      <Typography variant="body2">{reply.content}</Typography>
                    </Box>
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </Box>

        <Box
          sx={{
            alignSelf: 'flex-start',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 0.5,
            minWidth: 44,
          }}
        >
          <IconButton size="small" onClick={handleLike}>
            {isLiked ? (
              <FavoriteIcon fontSize="small" sx={{ color: theme.palette.status.red }} />
            ) : (
              <FavoriteBorderIcon fontSize="small" />
            )}
          </IconButton>
          <Typography variant="caption">{likeCount}</Typography>
        </Box>
      </Box>
    </Box>
  );
}

// iOS 성능 최적화: React.memo로 리스트 스크롤 시 불필요한 리렌더링 방지
export default memo(CommentItem);
