/**
 * ReasonModal Component
 * Modal for selecting reason when hiding or blocking items
 * Based on Figma design: https://www.figma.com/design/xPg9csvnn9ZnbeyQCc0v97/Bridge-APP
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Radio,
  RadioGroup,
  FormControlLabel,
  Box,
  useTheme,
} from '@mui/material';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import NotInterestedOutlinedIcon from '@mui/icons-material/NotInterestedOutlined';

export type ActionType = 'hide' | 'block';
export type EntityType = 'project' | 'collaboration' | 'partner';

interface ReasonModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  actionType: ActionType; // 'hide' or 'block'
  entityType: EntityType; // 'project', 'collaboration', or 'partner'
  loading?: boolean;
  projectBrandName?: string;
  collaborationLeaderName?: string;
  partnerName?: string;
}

// Reason options based on Figma design
const HIDE_REASONS = [
  { value: '개인정보 보호', label: '개인정보 보호' },
  { value: '경쟁사 관계', label: '경쟁사 관계' },
  { value: '비즈니스 전략', label: '비즈니스 전략' },
  { value: '기타', label: '기타' },
];

const BLOCK_REASONS = [
  { value: '스팸 메시지 발송', label: '스팸 메시지 발송' },
  { value: '부적절한 콘텐츠 공유', label: '부적절한 콘텐츠 공유' },
  { value: '허위 정보 유포', label: '허위 정보 유포' },
  { value: '기타', label: '기타' },
];

const ENTITY_LABELS: Record<EntityType, { hide: string; block: string }> = {
  project: { hide: '프로젝트 숨김', block: '리더/마스터 차단' },
  collaboration: { hide: '협업 숨김', block: '리더/마스터 차단' },
  partner: { hide: '프로필 숨김', block: '사용자 차단' },
};

export default function ReasonModal({
  open,
  onClose,
  onConfirm,
  actionType,
  entityType,
  loading = false,
  projectBrandName,
  collaborationLeaderName,
  partnerName,
}: ReasonModalProps) {
  const theme = useTheme();
  const [selectedReason, setSelectedReason] = useState('');

  const reasons = actionType === 'hide' ? HIDE_REASONS : BLOCK_REASONS;
  const title = ENTITY_LABELS[entityType][actionType];
  const brandLabel = projectBrandName ? `${projectBrandName} 브랜드의 프로젝트` : '해당 프로젝트';
  const collaborationLabel = collaborationLeaderName
    ? `${collaborationLeaderName} 님의 협업`
    : '이 협업';
  const partnerLabel = partnerName ? `${partnerName}님` : '해당 사용자';
  const description = (() => {
    if (entityType === 'project') {
      return actionType === 'hide'
        ? `${brandLabel}를 숨기는 이유를 선택해주세요`
        : `${projectBrandName || '해당 프로젝트'} 리더/마스터를 차단하는 이유를 선택해주세요`;
    }
    if (entityType === 'collaboration') {
      return actionType === 'hide'
        ? `${collaborationLabel}을 숨기는 이유를 선택해주세요`
        : `${collaborationLeaderName || '해당 협업'} 리더/마스터를 차단하는 이유를 선택해주세요`;
    }
    return actionType === 'hide'
      ? `${partnerLabel}의 프로필을 숨기는 이유를 선택해주세요`
      : `${partnerLabel}을 차단하는 이유를 선택해주세요`;
  })();
  const Icon = actionType === 'hide' ? VisibilityOffOutlinedIcon : NotInterestedOutlinedIcon;
  const confirmText = actionType === 'hide' ? '숨기기' : '차단';
  // Semantic colors kept for visual clarity (hide=blue, block=red)
  const confirmColor = actionType === 'hide' ? theme.palette.primary.main : theme.palette.status.Error;

  const handleConfirm = () => {
    if (selectedReason) {
      onConfirm(selectedReason);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setSelectedReason('');
      onClose();
    }
  };

  const stopPropagation = (event: React.MouseEvent) => {
    event.stopPropagation();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          p: 1,
          maxWidth: 320,
        },
        onClick: stopPropagation,
      }}
    >
      <DialogContent sx={{ pt: 3, pb: 2, px: 3 }} onClick={stopPropagation}>
        {/* Icon + Title */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 1.5 }}>
          <Box
            sx={{
              width: 30,
              height: 30,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Icon
              sx={{
                fontSize: 24,
                color: actionType === 'hide' ? theme.palette.icon.default : theme.palette.icon.default,
              }}
            />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography
              sx={{
                fontFamily: 'Pretendard, sans-serif',
                fontSize: 18,
                fontWeight: 700,
                color: theme.palette.text.primary,
                lineHeight: 1.3,
                wordBreak: 'keep-all',
              }}
            >
              {title}
            </Typography>
            {/* Description */}
            <Typography
              sx={{
                fontFamily: 'Pretendard, sans-serif',
                fontSize: 14,
                fontWeight: 400,
                color: theme.palette.text.secondary,
                lineHeight: 1.5,
                mb: 2.5,
                wordBreak: 'keep-all',
              }}
            >
              {description}
            </Typography>
          </Box>
        </Box>



        {/* Reason Label */}
        <Typography
          sx={{
            fontFamily: 'Pretendard, sans-serif',
            fontSize: 16,
            fontWeight: 600,
            color: theme.palette.text.primary,
            mb: 0,
          }}
        >
          {actionType === 'hide' ? '숨김 사유' : '차단 사유'}
        </Typography>

        {/* Radio Group */}
        <RadioGroup value={selectedReason} onChange={(e) => setSelectedReason(e.target.value)}>
          {reasons.map((reason) => (
            <FormControlLabel
              key={reason.value}
              value={reason.value}
              control={
                <Radio
                  sx={{
                    color: theme.palette.divider,
                    '&.Mui-checked': {
                      color: theme.palette.primary.main,
                    },
                  }}
                />
              }
              label={
                <Typography
                  sx={{
                    fontFamily: 'Pretendard, sans-serif',
                    fontSize: 14,
                    fontWeight: 400,
                    color: theme.palette.text.secondary,

                  }}
                >
                  {reason.label}
                </Typography>
              }
              sx={{
                mx: 0,
                mb: -1,
                '&:last-child': {
                  mb: 0,
                },
              }}
            />
          ))}
        </RadioGroup>
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,
          pb: 3,
          pt: 2,
          gap: 1,
        }}
        onClick={stopPropagation}
      >
        <Button
          onClick={handleClose}
          disabled={loading}
          fullWidth
          sx={{
            height: 48,
            borderRadius: '24px',
            color: theme.palette.text.secondary,
            backgroundColor: theme.palette.grey[100],
            textTransform: 'none',
            fontFamily: 'Pretendard, sans-serif',
            fontSize: 15,
            fontWeight: 600,
            '&:disabled': {
              backgroundColor: theme.palette.grey[100],
              color: theme.palette.text.secondary,
              opacity: 0.5,
            },
          }}
        >
          취소
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={!selectedReason || loading}
          fullWidth
          sx={{
            height: 48,
            borderRadius: '24px',
            backgroundColor: confirmColor,
            color: theme.palette.primary.contrastText,
            textTransform: 'none',
            fontFamily: 'Pretendard, sans-serif',
            fontSize: 15,
            fontWeight: 600,
            // '&:hover': {
            //   // Semantic colors kept for hide/block distinction
            //   backgroundColor: actionType === 'hide' ? '#2563EB' : '#B91C1C',
            // },
            '&:disabled': {
              backgroundColor: theme.palette.divider,
              color: theme.palette.text.secondary,
              opacity: 0.5,
            },
          }}
        >
          {loading ? '처리 중...' : confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
