/**
 * InvitationCard Component
 * 초대 목록에서 사용하는 카드 컴포넌트
 */

import { memo } from 'react';
import { Box, Typography, Avatar, Chip, Checkbox, useTheme } from '@mui/material';
import { IconButton, Tooltip } from '@mui/material';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import type { Invitation } from '../../types/invitation.types';
import { INVITATION_STATUS_CONFIG, INVITATION_TYPE_LABELS } from '../../types/invitation.types';

interface InvitationCardProps {
  invitation: Invitation;
  mode: 'sent' | 'received';
  onSelect: () => void;
  selected?: boolean;
  onCheckChange?: (checked: boolean) => void;
  showCheckbox?: boolean;
  isHidden?: boolean;
  onToggleHidden?: () => void;
  isNew?: boolean;
}

/**
 * 경과 시간을 포맷팅하는 함수
 * CLAUDE.md의 UI/UX 규칙을 따름
 */
const formatTimeAgo = (dateString: string): string => {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffMinutes < 1) return '방금 전';
  if (diffMinutes < 60) return `${diffMinutes}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전`;
  if (diffDays < 14) return `${diffDays}일 전`;
  if (diffWeeks < 4) return `${diffWeeks}주 전`;
  if (diffMonths < 12) return `${diffMonths}개월 전`;
  return `${diffYears}년 전`;
};

function InvitationCard({
  invitation,
  mode,
  onSelect,
  selected = false,
  onCheckChange,
  showCheckbox = false,
  isHidden,
  onToggleHidden,
  isNew = false,
}: InvitationCardProps) {
  const theme = useTheme();
  const statusConfig = INVITATION_STATUS_CONFIG[invitation.status];
  const typeLabel = INVITATION_TYPE_LABELS[invitation.invitationType];

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

  // 상대방 정보
  const person = mode === 'sent' ? invitation.receiver : invitation.sender;
  const roleBadgeStyle = getRoleBadgeStyle(person?.profileType);

  // Q&A 상태
  const hasUnansweredQuestion =
    invitation.questionAnswers.length > 0 && !invitation.questionAnswers[0].answer;

  // 배경색 결정: isNew이면 하늘색, 선택됨이면 선택색, 그 외 기본
  const bgColor = isNew
    ? '#EDF6FF'
    : selected
      ? theme.palette.action.selected
      : theme.palette.background.paper;

  return (
    <Box
      onClick={onSelect}
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
      {/* Checkbox */}
      {showCheckbox && (
        <Checkbox
          checked={selected}
          onChange={(e) => {
            e.stopPropagation();
            onCheckChange?.(e.target.checked);
          }}
          onClick={(e) => e.stopPropagation()}
          size="small"
          sx={{ p: 0, mt: 0.5 }}
        />
      )}

      {/* Avatar */}
      <Avatar
        src={person?.avatarUrl}
        sx={{ width: 44, height: 44, flexShrink: 0 }}
      >
        {person?.name?.[0] || '?'}
      </Avatar>

      {/* Content */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {/* Header: Name + Badges */}
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
            {person?.name || '알 수 없음'}
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

          {/* Type Badge */}
          <Chip
            label={typeLabel}
            size="small"
            sx={{
              height: 18,
              fontSize: 10,
              fontWeight: 600,
              bgcolor: invitation.invitationType === 'project'
                ? theme.palette.grey[100]
                : theme.palette.grey[100],
              color: invitation.invitationType === 'project'
                ? theme.palette.subText.default
                : theme.palette.subText.default,
              '& .MuiChip-label': { px: 0.75 },
            }}
          />

          {/* Status Badge */}
          <Chip
            label={statusConfig.label}
            size="small"
            sx={{
              height: 18,
              fontSize: 10,
              fontWeight: 600,
              bgcolor: statusConfig.bgcolor,
              color: statusConfig.color,
              '& .MuiChip-label': { px: 0.75 },
            }}
          />

          {/* Q&A Indicator */}
          {hasUnansweredQuestion && (
            <Chip
              label={mode === 'sent' ? '답변 필요' : '답변 대기'}
              size="small"
              sx={{
                height: 18,
                fontSize: 10,
                fontWeight: 600,
                bgcolor: '#FEF3C7',
                color: '#92400E',
                '& .MuiChip-label': { px: 0.75 },
              }}
            />
          )}
        </Box>

        {/* Target Title */}
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
          {invitation.target?.title || (invitation.invitationType === 'project' ? '프로젝트' : '협업')}
        </Typography>

        {/* Message Preview */}
        {invitation.message && (
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
            {invitation.message}
          </Typography>
        )}

        {/* Time */}
        <Typography sx={{ fontSize: 11, color: theme.palette.text.secondary }}>
          {formatTimeAgo(invitation.sentDate)}
        </Typography>
      </Box>
    </Box>
  );
}

export default memo(InvitationCard);
