/**
 * ConfirmDialog Component
 * Reusable confirmation dialog for user actions
 * 스타일: 아이콘(상단) + 제목(중앙) + 설명(중앙) + 버튼 2개(가로 배치)
 */

import { Dialog, Box, Button, Typography, useTheme } from '@mui/material';
import type { ReactNode } from 'react';

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: ReactNode;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  loading?: boolean;
  icon?: ReactNode;  // 커스텀 아이콘
}

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = '확인',
  cancelText = '취소',
  isDestructive = false,
  loading = false,
  icon,
}: ConfirmDialogProps) {
  const theme = useTheme();

  const handleConfirm = () => {
    onConfirm();
  };

  const renderMessage = typeof message === 'string'
    ? (
      <Typography
        sx={{
          fontFamily: 'Pretendard, sans-serif',
          fontSize: 14,
          color: theme.palette.text.secondary,
          lineHeight: 1.5,
          textAlign: 'center',
          whiteSpace: 'pre-line',
        }}
      >
        {message}
      </Typography>
    )
    : (
      <Box
        sx={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
        }}
      >
        {message}
      </Box>
    );

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '12px',
          padding: 3,
          margin: 2,
          width: '70%',
          maxWidth: 360,
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
        }}
      >
        {/* 아이콘 영역 */}
        {icon && (
          <Box
            sx={{
              width: 30,
              height: 30,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isDestructive ? theme.palette.status.Error : theme.palette.icon.default,
              '& svg': {
                fontSize: 24,
              },
            }}
          >
            {icon}
          </Box>
        )}

        {/* 제목 */}
        <Typography
          sx={{
            fontFamily: 'Pretendard, sans-serif',
            fontSize: 18,
            fontWeight: 700,
            color: theme.palette.text.primary,
            textAlign: 'center',
          }}
        >
          {title}
        </Typography>

        {/* 설명 */}
        {renderMessage}

        {/* 버튼 영역 */}
        <Box
          sx={{
            display: 'flex',
            gap: 1.5,
            width: '100%',
            mt: 1,
          }}
        >
          {/* 취소 버튼 */}
          <Button
            onClick={onClose}
            disabled={loading}
            variant="outlined"
            fullWidth
            sx={{
              height: 40,
              borderRadius: '22px',
              borderColor: theme.palette.divider,
              color: theme.palette.text.primary,
              fontSize: 16,
              fontWeight: 600,
              textTransform: 'none',
            }}
          >
            {cancelText}
          </Button>

          {/* 확인 버튼 */}
          <Button
            onClick={handleConfirm}
            disabled={loading}
            variant="contained"
            fullWidth
            sx={{
              height: 40,
              borderRadius: '24px',
              backgroundColor: isDestructive ? '#DC2626' : theme.palette.primary.main,
              fontFamily: 'Pretendard, sans-serif',
              fontSize: 16,
              fontWeight: 600,
              textTransform: 'none',
              '&:disabled': {
                backgroundColor: theme.palette.divider,
                color: theme.palette.text.secondary,
              },
            }}
          >
            {loading ? '처리 중...' : confirmText}
          </Button>
        </Box>
      </Box>
    </Dialog>
  );
}
