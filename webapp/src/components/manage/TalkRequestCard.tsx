/**
 * TalkRequestCard Component
 * 대화 요청 목록에서 사용하는 카드 컴포넌트
 */

import { memo } from 'react';
import { Box, Typography, Avatar, Chip, Checkbox, useTheme } from '@mui/material';
import { IconButton, Tooltip } from '@mui/material';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import type { TalkRequest } from '../../types/talkRequest.types';
import { TALK_REQUEST_STATUS_CONFIG } from '../../types/talkRequest.types';

interface TalkRequestCardProps {
  talkRequest: TalkRequest;
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

/**
 * 남은 만료 시간을 포맷팅하는 함수
 */
const formatExpiresIn = (expiresAt: string): string | null => {
  const now = new Date();
  const expires = new Date(expiresAt);
  const diffMs = expires.getTime() - now.getTime();

  if (diffMs <= 0) return null;

  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (diffDays > 0) {
    return `${diffDays}일 남음`;
  }
  if (diffHours > 0) {
    return `${diffHours}시간 남음`;
  }
  return '곧 만료';
};

function TalkRequestCard({
  talkRequest,
  mode,
  onSelect,
  selected = false,
  onCheckChange,
  showCheckbox = false,
  isHidden,
  onToggleHidden,
  isNew = false,
}: TalkRequestCardProps) {
  const theme = useTheme();
  const statusConfig = TALK_REQUEST_STATUS_CONFIG[talkRequest.status];

  // 상대방 정보
  const person = mode === 'sent' ? talkRequest.receiver : talkRequest.sender;

  // 만료 정보 (pending 상태일 때만 표시)
  const expiresIn = talkRequest.status === 'pending' ? formatExpiresIn(talkRequest.expiresAt) : null;

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
            }}
          >
            {person?.name || '알 수 없음'}
          </Typography>

          {/* Role Tag (브랜드/아티스트/크리에이티브) */}
          {person?.profileType && (
            <Chip
              label={
                person.profileType === 'brand' ? '브랜드' :
                  person.profileType === 'artist' ? '아티스트' :
                    person.profileType === 'creative' ? '크리에이티브' :
                      person.profileType === 'fan' ? '팬' : ''
              }
              size="small"
              sx={{
                height: 18,
                fontSize: 10,
                fontWeight: 500,
                borderRadius: '12px',
                px: 0.2,
                bgcolor:
                  person.profileType === 'brand' ? theme.palette.userTypeBg.brand :
                    person.profileType === 'artist' ? theme.palette.userTypeBg.artist :
                      person.profileType === 'creative' ? theme.palette.userTypeBg.creative :
                        person.profileType === 'fan' ? theme.palette.userTypeBg.fan : theme.palette.grey[100],
                color:
                  person.profileType === 'brand' ? theme.palette.userTypeText.brand :
                    person.profileType === 'artist' ? theme.palette.userTypeText.artist :
                      person.profileType === 'creative' ? theme.palette.userTypeText.creative :
                        person.profileType === 'fan' ? theme.palette.userTypeText.fan : theme.palette.text.primary,
                '& .MuiChip-label': { px: 0.75 },
              }}
            />
          )}

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

          {/* Expires In Badge (pending일 때만) */}
          {expiresIn && (
            <Chip
              label={expiresIn}
              size="small"
              sx={{
                height: 18,
                fontSize: 10,
                fontWeight: 600,
                bgcolor: theme.palette.bgColor.green,
                color: theme.palette.status.green,
                '& .MuiChip-label': { px: 0.75 },
              }}
            />
          )}
        </Box>

        {/* Activity Field */}
        {person?.activityField && (
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
            {person.activityField}
          </Typography>
        )}

        {/* Template Message Preview */}
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
          {talkRequest.templateMessage}
        </Typography>

        {/* Time */}
        <Typography sx={{ fontSize: 11, color: theme.palette.text.secondary }}>
          {formatTimeAgo(talkRequest.sentAt)}
        </Typography>
      </Box>
    </Box>
  );
}

export default memo(TalkRequestCard);
