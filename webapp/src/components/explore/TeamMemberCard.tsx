import { useState, useEffect } from 'react';
import { Box, Typography, Avatar, IconButton, useTheme, Menu, MenuItem } from '@mui/material';
import TextsmsOutlinedIcon from '@mui/icons-material/TextsmsOutlined';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import PersonRemoveOutlinedIcon from '@mui/icons-material/PersonRemoveOutlined';
import { toast } from 'react-toastify';
import { useProfileStore } from '../../stores/profileStore';
import { getThumbnailUrl } from '../../utils/signedUrl';
import { JOIN_REQUEST_TEMPLATES } from '../../types/talkRequest.types';
import { createTalkRequest } from '../../services/talkRequestService';
import TalkRequestModal from './TalkRequestModal';
import ActionSuccessModal from '../notification/ActionSuccessModal';
import ConfirmDialog from '../common/ConfirmDialog';
import { BlockService } from '../../services/blockService';

interface BasicMemberInfo {
  id?: string;
  name?: string | null;
  profileImageUrl?: string | null;
  activityField?: string | null;
  isOnline?: boolean | null;
}

interface TeamMemberCardProps {
  member?: BasicMemberInfo | null;
  isLeader: boolean;
  leaderName?: string;
  leaderAvatar?: string;
  leaderField?: string;
  onlineStatus: boolean;
  leaderId?: string;
  teamMemberIds?: string[];
  entityType?: 'project' | 'collaboration';
  entityId?: string;
  // 멤버 관리 콜백
  onLeave?: () => void;
  onRemove?: (targetUserId: string, targetName: string) => void;
}

export default function TeamMemberCard({
  member,
  isLeader = false,
  leaderName,
  leaderAvatar,
  leaderField,
  onlineStatus = false,
  leaderId,
  teamMemberIds = [],
  // entityId는 대화 요청 시 컨텍스트 정보로 활용 가능 (현재 미사용)
  entityType = 'project',
  entityId: _entityId,
  onLeave,
  onRemove,
}: TeamMemberCardProps) {
  const theme = useTheme();
  const roleLabel = entityType === 'collaboration' ? '리더' : '마스터';
  const currentUserId = useProfileStore((state) => state.userId);
  const [talkRequestModalOpen, setTalkRequestModalOpen] = useState(false);
  const [resultModalOpen, setResultModalOpen] = useState(false);
  // 숨김 상태: 리더가 나를 숨겼는지 여부 (Talk Request 버튼 숨김용)
  const [isHiddenByLeader, setIsHiddenByLeader] = useState(false);

  // 멤버 관리 메뉴 상태
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(menuAnchorEl);

  // 확인 다이얼로그 상태
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    confirmText: string;
    onConfirm: () => void;
  }>({
    open: false,
    title: '',
    message: '',
    confirmText: '확인',
    onConfirm: () => { },
  });

  const displayName = isLeader ? leaderName : member?.name;
  const displayAvatar = (isLeader ? leaderAvatar : member?.profileImageUrl) ?? undefined;
  const optimizedAvatar = displayAvatar
    ? (getThumbnailUrl(displayAvatar, 96, 96, 75) ?? displayAvatar)
    : undefined;
  const displayField = isLeader ? leaderField : member?.activityField;
  // Always use onlineStatus prop (passed from useIsUserOnline hook)
  const isOnline = onlineStatus;
  const isCurrentUserLeader = !!leaderId && !!currentUserId && leaderId === currentUserId;
  const isCurrentUserTeamMember = !!currentUserId && teamMemberIds.includes(currentUserId);

  // 리더가 나를 숨겼는지 확인
  useEffect(() => {
    const checkHiddenStatus = async () => {
      if (isLeader && leaderId && currentUserId && leaderId !== currentUserId) {
        const hidden = await BlockService.isHiddenBy(leaderId, currentUserId);
        setIsHiddenByLeader(hidden);
      } else {
        setIsHiddenByLeader(false);
      }
    };
    checkHiddenStatus();
  }, [isLeader, leaderId, currentUserId]);

  // 팀 멤버가 아닌 외부인만 마스터에게 대화 요청 버튼 표시 (리더가 나를 숨기지 않은 경우에만)
  const shouldShowMessageButton = isLeader && !isCurrentUserLeader && !isCurrentUserTeamMember && !!currentUserId && !isHiddenByLeader;

  // 현재 카드가 본인인지 확인
  const memberId = isLeader ? leaderId : member?.id;
  const isCurrentUserCard = !!currentUserId && !!memberId && currentUserId === memberId;

  // 메뉴 표시 조건:
  // 1. 본인 카드 + 팀 멤버인 경우 → 나가기 메뉴
  // 2. 리더인데 다른 멤버 카드인 경우 → 내보내기 메뉴
  const canLeave = isCurrentUserCard && isCurrentUserTeamMember && !!onLeave;
  const canRemove = isCurrentUserLeader && !isCurrentUserCard && !isLeader && !!onRemove;
  const shouldShowMenu = canLeave || canRemove;

  // 메뉴 핸들러
  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    setMenuAnchorEl(e.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  // 나가기 핸들러
  const handleLeaveClick = () => {
    handleMenuClose();
    setConfirmDialog({
      open: true,
      title: isCurrentUserLeader ? '리더 권한 이전 필요' : '나가기',
      message: isCurrentUserLeader
        ? '리더는 다른 멤버에게 권한을 이전한 후 나갈 수 있어요.'
        : '정말 나가시겠어요?\n나가면 다시 초대를 받아야 참여할 수 있어요.',
      confirmText: isCurrentUserLeader ? '확인' : '나가기',
      onConfirm: () => {
        setConfirmDialog(prev => ({ ...prev, open: false }));
        if (!isCurrentUserLeader && onLeave) {
          onLeave();
        }
      },
    });
  };

  // 내보내기 핸들러
  const handleRemoveClick = () => {
    handleMenuClose();
    const targetName = displayName || '멤버';
    setConfirmDialog({
      open: true,
      title: '멤버 내보내기',
      message: `${targetName}님을 내보내시겠어요?\n내보내면 알림이 전송되어요.`,
      confirmText: '내보내기',
      onConfirm: () => {
        setConfirmDialog(prev => ({ ...prev, open: false }));
        if (onRemove && memberId) {
          onRemove(memberId, targetName);
        }
      },
    });
  };

  const handleMessageClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!leaderId) {
      toast.error('리더 정보를 불러오지 못했어요.');
      return;
    }

    if (!currentUserId) {
      toast.warn('로그인이 필요해요.');
      return;
    }

    setTalkRequestModalOpen(true);
  };

  const handleTalkRequestSubmit = async (templateMessage: string, additionalMessage?: string) => {
    if (!leaderId) return;
    try {
      await createTalkRequest({
        receiverId: leaderId,
        templateMessage,
        additionalMessage,
      });
      setTalkRequestModalOpen(false);
      setResultModalOpen(true);
    } catch (error) {
      console.error('[TeamMemberCard] handleTalkRequestSubmit error:', error);
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('대화 요청 전송에 실패했어요');
      }
      throw error;
    }
  };

  return (
    <Box
      sx={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        py: 2,
        px: 2,
        borderRadius: '12px',
        boxShadow: '0px 3px 5px rgba(0,0,0,0.04)',
        backgroundColor: theme.palette.background.paper,
        marginTop: '12px',
      }}
    >
      {/* Avatar with Online Status */}
      <Box sx={{ position: 'relative' }}>
        <Avatar
          src={optimizedAvatar}
          alt={displayName || ''}
          sx={{
            width: 48,
            height: 48,
          }}
        />
        {/* Online Status Indicator */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: 14,
            height: 14,
            backgroundColor: isOnline ? '#10B981' : '#9CA3AF',
            border: '2px solid #fff',
            borderRadius: '50%',
          }}
        />
      </Box>

      {/* Member Info */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {/* Name + Role Label */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Typography
            sx={{
              fontFamily: 'Pretendard, sans-serif',
              fontSize: 15,
              fontWeight: 600,
              color: theme.palette.text.primary,
            }}
          >
            {displayName}
          </Typography>
          {isLeader && (
            <Box
              sx={{
                px: 1,
                py: 0.6,
                backgroundColor: theme.palette.primary.main,
                borderRadius: '6px',
              }}
            >
              <Typography
                sx={{
                  fontFamily: 'Pretendard, sans-serif',
                  fontSize: 11,
                  fontWeight: 500,
                  color: '#fff',
                  lineHeight: 1,
                }}
              >
                {roleLabel}
              </Typography>
            </Box>
          )}
        </Box>

        {/* Activity Field */}
        <Typography
          sx={{
            fontFamily: 'Pretendard, sans-serif',
            fontSize: 13,
            color: theme.palette.text.secondary,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {displayField}
        </Typography>

        {/* Online Status Text */}
        <Typography
          sx={{
            fontFamily: 'Pretendard, sans-serif',
            fontSize: 12,
            color: isOnline ? theme.palette.status.Success : theme.palette.icon.inner,
          }}
        >
          {isOnline ? '온라인' : '오프라인'}
        </Typography>
      </Box>

      {/* Message Button (Only for Leader, external users) */}
      {shouldShowMessageButton && (
        <IconButton
          onClick={handleMessageClick}
          sx={{
            width: 36,
            height: 36,
            flexShrink: 0,
          }}
        >
          <TextsmsOutlinedIcon
            sx={{
              fontSize: 20,
              color: theme.palette.icon.inner,
            }}
          />
        </IconButton>
      )}

      {/* Member Management Menu Button */}
      {shouldShowMenu && (
        <IconButton
          onClick={handleMenuOpen}
          sx={{
            width: 36,
            height: 36,
            flexShrink: 0,
          }}
        >
          <MoreVertIcon
            sx={{
              fontSize: 20,
              color: theme.palette.icon.inner,
            }}
          />
        </IconButton>
      )}

      {/* Member Management Menu */}
      <Menu
        anchorEl={menuAnchorEl}
        open={menuOpen}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              borderRadius: '12px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
              minWidth: 120,
              mt: 0.5,
            },
          },
        }}
      >
        {canLeave && (
          <MenuItem
            onClick={handleLeaveClick}
            sx={{
              py: 1.5,
              px: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              color: '#DC2626',
              fontSize: 14,
            }}
          >
            <ExitToAppIcon sx={{ fontSize: 18 }} />
            나가기
          </MenuItem>
        )}
        {canRemove && (
          <MenuItem
            onClick={handleRemoveClick}
            sx={{
              py: 1.5,
              px: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              color: '#DC2626',
              fontSize: 14,
            }}
          >
            <PersonRemoveOutlinedIcon sx={{ fontSize: 18 }} />
            내보내기
          </MenuItem>
        )}
      </Menu>

      {/* 대화 요청 모달 */}
      <TalkRequestModal
        open={talkRequestModalOpen}
        onClose={() => setTalkRequestModalOpen(false)}
        onSubmit={handleTalkRequestSubmit}
        partnerName={displayName || '마스터'}
        title="대화 요청"
        subtitle={`${displayName || '마스터'}님에게 대화를 요청해요`}
        templates={JOIN_REQUEST_TEMPLATES}
      />

      {/* 대화 요청 완료 결과 모달 */}
      <ActionSuccessModal
        open={resultModalOpen}
        onClose={() => setResultModalOpen(false)}
        message="마스터에게 대화요청을 보냈어요."
      />

      {/* 나가기/내보내기 확인 다이얼로그 */}
      <ConfirmDialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog(prev => ({ ...prev, open: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        cancelText="취소"
        isDestructive={confirmDialog.confirmText !== '확인'}
        icon={confirmDialog.confirmText === '내보내기' ? <PersonRemoveOutlinedIcon /> : <ExitToAppIcon />}
      />
    </Box>
  );
}
