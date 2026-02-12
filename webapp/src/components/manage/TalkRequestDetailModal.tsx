/**
 * TalkRequestDetailModal Component
 * 대화 요청 상세 모달 - 상세 보기, 수락/거절/철회 처리
 */

import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Avatar,
  Button,
  Chip,
  IconButton,
  useTheme,
} from '@mui/material';
import { LightningLoader } from '../../components/common';
import CloseIcon from '@mui/icons-material/Close';
import type { TalkRequest } from '../../types/talkRequest.types';
import { TALK_REQUEST_STATUS_CONFIG } from '../../types/talkRequest.types';
import RejectReasonModal from './RejectReasonModal';

interface TalkRequestDetailModalProps {
  open: boolean;
  onClose: () => void;
  talkRequest: TalkRequest | null;
  mode: 'sent' | 'received';
  onWithdraw?: (id: string) => Promise<void>;
  onAccept?: (id: string) => Promise<string | undefined>;
  onReject?: (id: string, reason?: string) => Promise<void>;
}

export default function TalkRequestDetailModal({
  open,
  onClose,
  talkRequest,
  mode,
  onWithdraw,
  onAccept,
  onReject,
}: TalkRequestDetailModalProps) {
  const theme = useTheme();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);

  if (!talkRequest) return null;

  const isPending = talkRequest.status === 'pending';
  const statusConfig = TALK_REQUEST_STATUS_CONFIG[talkRequest.status];
  const person = mode === 'sent' ? talkRequest.receiver : talkRequest.sender;

  const formatDate = (value?: string) => (value ? new Date(value).toLocaleDateString() : '');

  const formatExpiresInfo = (expiresAt: string): string => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diffMs = expires.getTime() - now.getTime();

    if (diffMs <= 0) return '만료됨';

    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (diffDays > 0) {
      return `${diffDays}일 후 만료`;
    }
    if (diffHours > 0) {
      return `${diffHours}시간 후 만료`;
    }
    return '곧 만료';
  };

  const handleWithdraw = async () => {
    if (!onWithdraw || isProcessing) return;
    setIsProcessing(true);
    try {
      await onWithdraw(talkRequest.id);
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAccept = async () => {
    if (!onAccept || isProcessing) return;
    setIsProcessing(true);
    try {
      await onAccept(talkRequest.id);
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectClick = () => {
    setShowRejectModal(true);
  };

  const handleRejectConfirm = async (reason?: string) => {
    if (!onReject || isProcessing) return;
    setIsProcessing(true);
    try {
      await onReject(talkRequest.id, reason || undefined);
      setShowRejectModal(false);
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: '16px', maxHeight: '90vh' },
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ fontSize: 18, fontWeight: 700 }}>
              {mode === 'sent' ? '보낸 대화 요청' : '받은 대화 요청'}
            </Typography>
            <Chip
              label="대화 요청"
              size="small"
              sx={{
                bgcolor: theme.palette.subText.default,
                color: theme.palette.primary.contrastText,
                fontWeight: 600,
                fontSize: 11,
                lineHeight: 1
              }}
            />
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ p: 2.5 }}>
          {/* Person Info */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
            <Avatar
              src={person?.avatarUrl}
              sx={{ width: 56, height: 56 }}
            >
              {person?.name?.[0] || '?'}
            </Avatar>
            <Box>
              <Typography sx={{ fontSize: 16, fontWeight: 700, color: theme.palette.text.primary }}>
                {person?.name || '알 수 없음'}
              </Typography>
              {person?.activityField && (
                <Typography sx={{ fontSize: 13, color: theme.palette.text.secondary }}>
                  {person.activityField}
                </Typography>
              )}
            </Box>
            <Box sx={{ ml: 'auto' }}>
              <Chip
                label={statusConfig.label}
                size="small"
                sx={{ bgcolor: statusConfig.bgcolor, color: statusConfig.color, fontWeight: 600 }}
              />
            </Box>
          </Box>

          {/* Message Content */}
          <Box sx={{ mb: 3 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: theme.palette.text.primary, mb: 1 }}>
              메시지
            </Typography>
            <Box sx={{ p: 2, bgcolor: theme.palette.grey[100], borderRadius: '12px' }}>
              <Typography sx={{ fontSize: 15, color: theme.palette.text.primary, lineHeight: 1.6 }}>
                {talkRequest.templateMessage}
              </Typography>
            </Box>
          </Box>

          {/* Additional Message */}
          {talkRequest.additionalMessage && (
            <Box sx={{ mb: 3 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: theme.palette.text.primary, mb: 1 }}>
                추가 메시지
              </Typography>
              <Box sx={{ p: 2, bgcolor: theme.palette.grey[50], borderRadius: '12px', border: `1px solid ${theme.palette.divider}` }}>
                <Typography sx={{ fontSize: 14, color: theme.palette.text.primary, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {talkRequest.additionalMessage}
                </Typography>
              </Box>
            </Box>
          )}

          {/* Rejection Reason */}
          {talkRequest.status === 'rejected' && talkRequest.rejectionReason && (
            <Box sx={{ p: 2, bgcolor: '#FEF2F2', borderRadius: '12px', mb: 3 }}>
              <Typography sx={{ fontSize: 12, color: '#991B1B', mb: 0.5, fontWeight: 600 }}>거절 사유</Typography>
              <Typography sx={{ fontSize: 14, color: '#7F1D1D', lineHeight: 1.5 }}>{talkRequest.rejectionReason}</Typography>
            </Box>
          )}

          {/* Date Info */}
          <Box sx={{ pt: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
            <Typography sx={{ fontSize: 12, color: theme.palette.text.secondary, mb: 0.5 }}>
              요청일: {formatDate(talkRequest.sentAt)}
            </Typography>
            {isPending && (
              <Typography sx={{ fontSize: 12, color: '#92400E', fontWeight: 500 }}>
                {formatExpiresInfo(talkRequest.expiresAt)}
              </Typography>
            )}
            {talkRequest.respondedAt && (
              <Typography sx={{ fontSize: 12, color: theme.palette.text.secondary }}>
                응답일: {formatDate(talkRequest.respondedAt)}
              </Typography>
            )}
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2, gap: 1 }}>
          {/* 보낸 요청 - pending일 때 철회 버튼 */}
          {mode === 'sent' && isPending && onWithdraw && (
            <>
              <Button
                onClick={onClose}
                disabled={isProcessing}
                sx={{ color: theme.palette.text.secondary, borderRadius: '24px' }}
              >
                닫기
              </Button>
              <Button
                variant="outlined"
                color="error"
                onClick={handleWithdraw}
                disabled={isProcessing}
                sx={{ borderRadius: '24px', minWidth: 100 }}
              >
                {isProcessing ? <LightningLoader size={18} /> : '요청 철회'}
              </Button>
            </>
          )}

          {/* 받은 요청 - pending일 때 수락/거절 버튼 */}
          {mode === 'received' && isPending && (
            <>
              <Button
                onClick={onClose}
                disabled={isProcessing}
                sx={{ color: theme.palette.text.secondary, borderRadius: '24px' }}
              >
                닫기
              </Button>
              {onReject && (
                <Button
                  variant="outlined"
                  onClick={handleRejectClick}
                  disabled={isProcessing}
                  sx={{ borderColor: theme.palette.divider, color: theme.palette.text.secondary, borderRadius: '24px' }}
                >
                  거절하기
                </Button>
              )}
              {onAccept && (
                <Button
                  variant="contained"
                  onClick={handleAccept}
                  disabled={isProcessing}
                  sx={{ bgcolor: theme.palette.primary.main, boxShadow: 'none', borderRadius: '24px', minWidth: 100 }}
                >
                  {isProcessing ? <LightningLoader size={18} color="#fff" /> : '수락하기'}
                </Button>
              )}
            </>
          )}

          {/* 처리된 요청 (pending 아닐 때) */}
          {!isPending && (
            <Button
              onClick={onClose}
              variant="contained"
              sx={{ bgcolor: theme.palette.primary.main, boxShadow: 'none', borderRadius: '24px' }}
            >
              닫기
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* 거절 사유 입력 모달 */}
      <RejectReasonModal
        open={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        onConfirm={handleRejectConfirm}
        type="talk_request"
        isProcessing={isProcessing}
      />
    </>
  );
}
