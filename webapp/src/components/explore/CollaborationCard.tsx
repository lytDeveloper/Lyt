import { useState, memo, useCallback } from 'react';
import { Box, Typography, Button, Avatar, Chip, IconButton, useTheme } from '@mui/material';
import Favorite from '@mui/icons-material/Favorite';
import FavoriteBorder from '@mui/icons-material/FavoriteBorder';
import { toast } from 'react-toastify';
import { useQueryClient } from '@tanstack/react-query';
import { STATUS_LABELS } from '../../constants/projectConstants';
import ProjectCardMenu, { type MenuActionItem } from './ProjectCardMenu';
import ReasonModal, { type ActionType } from '../common/ReasonModal';
import ActionResultModal from '../common/ActionResultModal';
import { ReportModal, type ReportTargetType } from '../common';
import LazyImage from '../common/LazyImage';
import type { Collaboration } from '../../services/exploreService';
import { useExploreStore } from '../../stores/exploreStore';
import { hideCollaboration } from '../../services/collaborationService';
import { blockService } from '../../services/blockService';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import NotInterestedOutlinedIcon from '@mui/icons-material/NotInterestedOutlined';
import { getCategoryLabel } from '../../constants/projectConstants';
import { getThumbnailUrl } from '../../utils/signedUrl';
interface CollaborationCardProps {
  collaboration: Collaboration & { briefDescription?: string };
  onClick: () => void;
  onActionSuccess?: (collaborationId: string, action: ActionType) => void;
  currentUserId?: string;  // Props로 전달받아 개별 auth 요청 제거
  menuItems?: MenuActionItem[];
  simpleView?: boolean;
  isLoggedIn?: boolean;
  onRequireLogin?: () => void;
  typeTag?: string;
  bottomAction?: React.ReactNode;
}

const CollaborationCard = memo(({
  collaboration,
  onClick,
  onActionSuccess,
  currentUserId,
  menuItems,
  simpleView,
  isLoggedIn = false,
  onRequireLogin,
  typeTag,
  bottomAction,
}: CollaborationCardProps) => {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { isCollaborationLiked, toggleLikeCollaboration } = useExploreStore();
  const isLiked = isLoggedIn ? isCollaborationLiked(collaboration.id) : false;
  const [modalAction, setModalAction] = useState<ActionType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [resultAction, setResultAction] = useState<ActionType | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);

  // 리스트 카드에서는 createdBy를 리더 기준으로 사용
  const leaderId = collaboration.createdBy || '';
  const isMyCollaboration = !!currentUserId && (
    !!leaderId && leaderId === currentUserId
  );

  const collaborationMenuItems = [
    {
      action: 'hide' as const, label: '협업 숨김', icon: <VisibilityOffOutlinedIcon sx={{ fontSize: 18, color: theme.palette.icon.default }} />
    },
    { action: 'block' as const, label: '리더/마스터 차단하기', icon: <NotInterestedOutlinedIcon sx={{ color: theme.palette.icon.default, fontSize: 18 }} /> },
    {
      label: '협업 신고',
      icon: <NotInterestedOutlinedIcon sx={{ fontSize: 18, color: theme.palette.status.Error }} />,
      textColor: theme.palette.status.Error,
      onClick: () => setShowReportModal(true),
    },
  ];

  const handleLikeClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isLoggedIn) {
      onRequireLogin?.();
      return;
    }
    toggleLikeCollaboration(collaboration.id);
  }, [isLoggedIn, onRequireLogin, collaboration.id, toggleLikeCollaboration]);

  const handleHide = useCallback((_collaborationId: string) => {
    void _collaborationId;
    setModalAction('hide');
  }, []);

  const handleBlock = useCallback((_collaborationId: string) => {
    void _collaborationId;
    setModalAction('block');
  }, []);

  const handleReasonConfirm = useCallback(async (reason: string) => {
    if (!modalAction) return;
    const currentAction = modalAction;

    setIsLoading(true);
    try {
      if (modalAction === 'hide') {
        await hideCollaboration(collaboration.id, reason);
        toast.success('협업이 숨겨졌습니다');
        // Invalidate explore cache to hide the collaboration immediately
        queryClient.invalidateQueries({ queryKey: ['explore'] });
      } else {
        // Block the leader/master instead of the collaboration
        const leaderIdToBlock = collaboration.createdBy;
        if (leaderIdToBlock && currentUserId) {
          await blockService.blockUser(currentUserId, leaderIdToBlock, reason);
          toast.success('리더/마스터가 차단되었습니다');
          // Invalidate explore cache to hide all content from blocked user
          queryClient.invalidateQueries({ queryKey: ['explore'] });
        } else {
          toast.error('차단할 사용자 정보를 찾을 수 없습니다');
        }
      }
      setModalAction(null);
      setIsVisible(false);
      setResultAction(currentAction);
      onActionSuccess?.(collaboration.id, currentAction);
    } catch (error) {
      console.error(`Failed to ${modalAction} collaboration:`, error);
      toast.error(`협업 ${modalAction === 'hide' ? '숨김' : '차단'}에 실패했습니다`);
    } finally {
      setIsLoading(false);
    }
  }, [modalAction, collaboration.id, collaboration.createdBy, currentUserId, queryClient, onActionSuccess]);

  return (
    <>
      {isVisible && (
        <Box
          onClick={onClick}
          sx={{
            backgroundColor: theme.palette.background.paper,
            overflow: 'hidden',
            p: 2,
            borderRadius: '12px',
            boxShadow: '0px 2px 5px 0px rgba(50, 50, 105, 0.15), 0px 1px 1px 0px rgba(0, 0, 0, 0.05)',
            cursor: 'pointer',
          }}
        >
          {/* Header: Image + Info */}
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            {/* Cover Image - Left */}
            <LazyImage
              src={collaboration.coverImageUrl}
              type="background"
              fallbackColor="#E9E9ED"
              alt={collaboration.title}
              targetWidth={160}
              targetHeight={160}
              sx={{
                width: 80,
                height: 80,
                flexShrink: 0,
                borderRadius: '8px',
              }}
            />

            {/* Info - Right */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {/* Row 1: Title, Status, Menu */}
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <Typography
                  sx={{
                    flex: 1,
                    fontFamily: 'Pretendard, sans-serif',
                    fontSize: 13.5,
                    fontWeight: 600,
                    color: theme.palette.text.primary,
                    lineHeight: 1.3,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}
                >
                  {collaboration.title}
                </Typography>

                {/* Type Tag */}
                {typeTag && (
                  <Chip
                    label={typeTag}
                    size="small"
                    sx={{
                      height: 22,
                      fontSize: 11,
                      fontFamily: 'Pretendard, sans-serif',
                      fontWeight: 600,
                      backgroundColor: theme.palette.grey[100],
                      color: theme.palette.text.secondary,
                      flexShrink: 0,
                    }}
                  />
                )}

                <Chip
                  label={STATUS_LABELS[collaboration.status]}
                  size="small"
                  sx={{
                    height: 22,
                    fontSize: 11,
                    fontFamily: 'Pretendard, sans-serif',
                    fontWeight: 600,
                    backgroundColor: theme.palette.background.paper,
                    color: collaboration.status === 'in_progress' ? '#2563EB' : '#1FA350',
                    flexShrink: 0,
                  }}
                />
                {isLoggedIn && !isMyCollaboration && (
                  <ProjectCardMenu
                    projectId={collaboration.id}
                    menuItems={menuItems || collaborationMenuItems}
                    onHide={handleHide}
                    onBlock={handleBlock}
                  />
                )}
              </Box>

              {/* Row 2: Creator display name and field */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography
                  sx={{
                    fontFamily: 'Pretendard, sans-serif',
                    fontSize: 14,
                    fontWeight: 300,
                    color: theme.palette.subText.default,
                  }}
                >
                  {collaboration.display?.displayName || ''}
                </Typography>
                {collaboration.display?.displayField && (
                  <Chip
                    label={getCategoryLabel(collaboration.category)}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: 11,
                      fontFamily: 'Pretendard, sans-serif',
                      fontWeight: 500,
                      backgroundColor: theme.palette.grey[50],
                      color: theme.palette.subText.default,
                    }}
                  />
                )}
              </Box>


              {/* Row 3: Brief Description */}
              <Box sx={{ mt: 0.5 }}>
                <Typography
                  sx={{
                    fontFamily: 'Pretendard, sans-serif',
                    fontSize: 13,
                    color: theme.palette.text.secondary,
                    lineHeight: 1.4,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}
                >
                  {collaboration.briefDescription}
                </Typography>
              </Box>

              {/* Row 4: Capacity and Keyword */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mt: 0.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <PeopleAltOutlinedIcon sx={{ fontSize: 12, color: theme.palette.icon.default }} />
                  <Typography
                    sx={{
                      fontFamily: 'Pretendard, sans-serif',
                      fontSize: 12,
                      color: theme.palette.text.secondary,
                    }}
                  >
                    {collaboration.capacity}명
                  </Typography>
                </Box>
                {/* <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <FolderOutlinedIcon sx={{ fontSize: 12, color: theme.palette.icon.default }} />
                  <Typography
                    sx={{
                      fontFamily: 'Pretendard, sans-serif',
                      fontSize: 12,
                      color: theme.palette.text.secondary,
                    }}
                  >
                    {collaboration.skills?.join(', ') || ''}
                  </Typography>
                </Box> */}
              </Box>
            </Box>
          </Box>

          {/* Tags Section with Like Button */}
          {!simpleView && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1,
              }}
            >
              {/* Tags */}
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', flex: 1 }}>
                {(collaboration.tags || []).map((tag) => (
                  <Chip
                    key={tag}
                    label={`#${tag}`}
                    size="small"
                    sx={{
                      height: 24,
                      fontSize: 11,
                      fontFamily: 'Pretendard, sans-serif',
                      fontWeight: 500,
                      backgroundColor: theme.palette.grey[100],
                      color: theme.palette.text.secondary,
                      '& .MuiChip-label': {
                        px: 1,
                      },
                    }}
                  />
                ))}
              </Box>

              {/* Like Button */}
              {!isMyCollaboration && (
                <IconButton
                  onClick={handleLikeClick}
                  sx={{
                    width: 36,
                    height: 36,
                    flexShrink: 0,
                    color: isLiked ? theme.palette.status.red : theme.palette.text.secondary,
                  }}
                >
                  {isLiked ? <Favorite sx={{ fontSize: 20 }} /> : <FavoriteBorder sx={{ fontSize: 20 }} />}
                </IconButton>
              )}
            </Box>
          )}

          {/* Team Section */}
          {(() => {
            const leaderName = collaboration.display?.displayName || '';
            const leaderField = collaboration.display?.displayField || collaboration.display?.displayCategory || '';
            const avatarCandidate = collaboration.display?.displayAvatar || '';
            const leaderAvatar = avatarCandidate.includes('googleusercontent') ? '' : avatarCandidate;
            const hasTeamInfo = leaderName;
            return hasTeamInfo && (
              <Box
                sx={{
                  pt: 1,
                }}
              >
                <Typography
                  sx={{
                    fontFamily: 'Pretendard, sans-serif',
                    fontSize: 12,
                    fontWeight: 500,
                    color: theme.palette.subText.secondary,
                    mb: 1,
                  }}
                >
                  팀
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Avatar
                    src={
                      leaderAvatar
                        ? getThumbnailUrl(leaderAvatar, 72, 72, 75) ?? leaderAvatar
                        : undefined
                    }
                    alt={leaderName}
                    sx={{ width: 36, height: 36 }}
                  />
                  <Box sx={{ flex: 1 }}>
                    <Typography
                      sx={{
                        fontFamily: 'Pretendard, sans-serif',
                        fontSize: 12,
                        fontWeight: 400,
                        color: theme.palette.subText.secondary,
                      }}
                    >
                      {leaderName}
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily: 'Pretendard, sans-serif',
                        fontSize: 12,
                        color: theme.palette.text.secondary,
                      }}
                    >
                      {leaderField}
                    </Typography>
                  </Box>
                  {collaboration.currentTeamSize > 1 && (
                    <Typography
                      sx={{
                        fontFamily: 'Pretendard, sans-serif',
                        fontSize: 12,
                        color: theme.palette.text.secondary,
                      }}
                    >
                      외 {collaboration.currentTeamSize - 1}명
                    </Typography>
                  )}
                </Box>
              </Box>
            );
          })()}

          {/* Action Button */}
          {!simpleView && (
            <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onClick();
                }}
                disabled={isLoading}
                sx={{
                  height: '34px',
                  width: '58%',
                  borderRadius: '24px',
                  backgroundColor: theme.palette.primary.main,
                  color: '#fff',
                  fontFamily: 'Pretendard, sans-serif',
                  fontSize: 14,
                  fontWeight: 400,
                  textTransform: 'none',
                  minWidth: 230,
                }}
              >
                상세보기
              </Button>
            </Box>
          )}

          {bottomAction && (
            <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', mt: 2 }}>
              {bottomAction}
            </Box>
          )}

        </Box >
      )}

      <ReasonModal
        open={modalAction !== null}
        onClose={() => setModalAction(null)}
        onConfirm={handleReasonConfirm}
        actionType={modalAction || 'hide'}
        entityType="collaboration"
        loading={isLoading}
        collaborationLeaderName={collaboration.display?.displayName || '리더'}
      />

      <ReportModal
        open={showReportModal}
        onClose={() => setShowReportModal(false)}
        targetType={'collaboration' as ReportTargetType}
        targetId={collaboration.id}
        targetName={collaboration.title}
      />


      <ActionResultModal
        open={resultAction !== null}
        onClose={() => setResultAction(null)}
        title={
          !resultAction
            ? ''
            : resultAction === 'hide'
              ? `${collaboration.display?.displayName || '리더'}님의 협업을 숨겼어요`
              : `${collaboration.display?.displayName || '리더'}님이 차단 되었어요.`
        }
        description={
          !resultAction
            ? ''
            : resultAction === 'hide'
              ? '해당 협업은 탐색 피드에서 더 이상 노출되지 않아요.'
              : `차단된 사용자는 설정 > 차단계정관리에서 확인할 수 있어요. `
        }
      />
    </>
  );
});

CollaborationCard.displayName = 'CollaborationCard';

export default CollaborationCard;
