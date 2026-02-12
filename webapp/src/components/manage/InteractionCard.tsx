import { useEffect, useState, memo } from 'react';
import {
  Box,
  Typography,
  Checkbox,
  Chip,
  Avatar,
  IconButton,
  Tooltip,
  useTheme,
} from '@mui/material';
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import type { ProjectApplication } from '../../services/projectService';
import { updateApplicationReviewerNote } from '../../services/projectService';
import type { CollaborationApplication } from '../../services/collaborationService';
import { updateCollaborationApplicationReviewerNote } from '../../services/collaborationService';
import { formatElapsedTime } from '../../utils/timeFormatter';
import ReviewerNoteInput from './ReviewerNoteInput';
import StatusChip from './StatusChip';

type InteractionType = 'application';
type InteractionMode = 'sent' | 'received';

interface InteractionCardProps {
  // 공통
  type: InteractionType;
  mode: InteractionMode;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  item: ProjectApplication | CollaborationApplication | any;

  // 편집 모드
  editMode?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;

  // 숨김(지원)
  isHidden?: boolean;
  onToggleHidden?: () => void;

  // 새로운 아이템 표시
  isNew?: boolean;

  // 액션
  onViewDetail: () => void;
  onAccept?: () => void;
  onReject?: () => void;
  onWithdraw?: () => void;
  onCancel?: () => void;
  onAskQuestion?: () => void;
}

/**
 * 지원(Application) 카드 컴포넌트
 */
const InteractionCard = memo(({
  type,
  mode,
  item,
  editMode = false,
  selected = false,
  onToggleSelect,
  isHidden,
  onToggleHidden,
  isNew = false,
  onViewDetail,
}: InteractionCardProps) => {
  const theme = useTheme();
  const [reviewerNote, setReviewerNote] = useState<string>('');

  useEffect(() => {
    if ('reviewerNote' in item) {
      setReviewerNote(item.reviewerNote || '');
    } else {
      setReviewerNote('');
    }
  }, [item]);

  const isReceivedApplication = type === 'application' && mode === 'received';
  const reviewerNoteSupported = isReceivedApplication && 'reviewerNote' in item;

  const handleSaveReviewerNote = async (_applicationId: string, note: string) => {
    if (!reviewerNoteSupported) return;
    const applicationId = (item as { id?: string }).id;
    if (!applicationId) return;

    try {
      if ('projectId' in item) {
        await updateApplicationReviewerNote(applicationId, note);
      } else if ('collaborationId' in item) {
        await updateCollaborationApplicationReviewerNote(applicationId, note);
      }
      setReviewerNote(note);
    } catch (error) {
      console.error('Failed to save reviewer note:', error);
    }
  };

  const isProjectApp = 'projectId' in item;

  const personName =
    mode === 'received'
      ? (item.applicant?.name as string | undefined) || '알 수 없음'
      : isProjectApp
        ? (item.project?.brandName as string | undefined) || '브랜드'
        : (item.collaboration?.display?.displayName as string | undefined) || '협업';

  const avatarUrl =
    mode === 'received'
      ? (item.applicant?.avatarUrl as string | undefined)
      : isProjectApp
        ? (item.project?.coverImage as string | undefined)
        : (item.collaboration?.coverImageUrl as string | undefined);

  const title =
    isProjectApp
      ? (item.project?.title as string | undefined) || '프로젝트'
      : (item.collaboration?.title as string | undefined) || '협업';

  const messageContent = item.coverLetter as string | undefined;
  const createdAt = item.createdAt || item.sentDate || item.appliedDate;
  const timeAgo = createdAt ? formatElapsedTime(createdAt) : '';

  const typeLabel = isProjectApp ? '프로젝트' : '협업';

  const getRoleBadgeStyle = (type?: string) => {
    switch (type) {
      case 'brand':
        return { bgcolor: theme.palette.userTypeBg.brand, color: theme.palette.userTypeText.brand, label: '브랜드' };
      case 'artist':
        return { bgcolor: theme.palette.userTypeBg.artist, color: theme.palette.userTypeText.artist, label: '아티스트' };
      case 'creative':
        return { bgcolor: theme.palette.userTypeBg.creative, color: theme.palette.userTypeText.creative, label: '크리에이티브' };
      case 'fan':
        return { bgcolor: theme.palette.userTypeBg.fan, color: theme.palette.userTypeText.fan, label: '팬' };
      default:
        return { bgcolor: theme.palette.grey[100], color: theme.palette.text.primary, label: '알 수 없음' };
    }
  };

  const profileType =
    mode === 'received'
      ? item.applicant?.profileType
      : isProjectApp
        ? (item as ProjectApplication).project?.profileType
        : (item as CollaborationApplication).collaboration?.profileType;

  const roleBadgeStyle = getRoleBadgeStyle(profileType);

  // 배경색 결정: isNew이면 하늘색, 선택됨이면 선택색, 그 외 기본
  const bgColor = isNew
    ? '#EDF6FF'
    : selected
      ? theme.palette.action.selected
      : theme.palette.background.paper;

  return (
    <Box
      onClick={onViewDetail}
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1.5,
        p: 2,
        bgcolor: bgColor,
        borderRadius: '12px',
        boxShadow: '0px 2px 5px 0px rgba(50, 50, 105, 0.15), 0px 1px 1px 0px rgba(0, 0, 0, 0.05)',
        cursor: 'pointer',
        transition: 'all 0.2s',
        position: 'relative',
      }}
    >
      {onToggleHidden && typeof isHidden === 'boolean' && (
        <Tooltip title={isHidden ? '숨김 해제' : '숨기기'}>
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              onToggleHidden();
            }}
            sx={{ position: 'absolute', top: 6, right: 6, fontSize: '18px' }}
          >
            {isHidden ? <VisibilityOutlinedIcon sx={{ fontSize: '18px', color: theme.palette.icon.inner }} /> : <VisibilityOffOutlinedIcon sx={{ fontSize: '18px', color: theme.palette.icon.inner }} />}
          </IconButton>
        </Tooltip>
      )}

      {editMode && (
        <Checkbox
          checked={selected}
          onChange={(e) => {
            e.stopPropagation();
            onToggleSelect?.();
          }}
          onClick={(e) => e.stopPropagation()}
          size="small"
          sx={{ p: 0, mt: 0.5 }}
        />
      )}

      <Avatar src={avatarUrl} sx={{ width: 44, height: 44, flexShrink: 0 }}>
        {personName?.[0] || '?'}
      </Avatar>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5, flexWrap: 'wrap' }}>
          <Typography
            sx={{
              fontSize: 14,
              fontWeight: 600,
              color: theme.palette.text.primary,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '120px',
            }}
          >
            {personName}
          </Typography>

          {/* Kind Badge (초대/지원 구분) */}
          <Chip
            label={roleBadgeStyle.label}
            size="small"
            sx={{
              height: 18,
              fontSize: 10,
              fontWeight: 500,
              bgcolor: roleBadgeStyle.bgcolor,
              color: roleBadgeStyle.color,
              borderRadius: '12px',
              px: 0.2,
              '& .MuiChip-label': { px: 0.75 },
            }}
          />

          {/* Type Badge (프로젝트/협업) */}
          <Chip
            label={typeLabel}
            size="small"
            sx={{
              height: 18,
              fontSize: 10,
              fontWeight: 600,
              bgcolor: isProjectApp ? theme.palette.grey[100] : theme.palette.grey[100],
              color: isProjectApp ? theme.palette.subText.default : theme.palette.subText.default,
              '& .MuiChip-label': { px: 0.75 },
            }}
          />

          {/* Status Badge */}
          <StatusChip status={item.status} type="interaction" />
        </Box>

        <Typography
          sx={{
            fontSize: 13,
            color: theme.palette.text.primary,
            mb: 0.5,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {title}
        </Typography>

        {messageContent && (
          <Typography
            sx={{
              fontSize: 12,
              color: theme.palette.text.secondary,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              mb: 0.5,
            }}
          >
            {messageContent}
          </Typography>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <AccessTimeOutlinedIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
          <Typography sx={{ fontSize: 11, color: theme.palette.text.secondary }}>
            {timeAgo}
          </Typography>
          {reviewerNoteSupported && (
            <ReviewerNoteInput
              applicationId={(item as { id?: string }).id || ''}
              currentNote={reviewerNote}
              onSave={handleSaveReviewerNote}
            />
          )}
        </Box>
      </Box>
    </Box>
  );
});

InteractionCard.displayName = 'InteractionCard';

export default InteractionCard;
