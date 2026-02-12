import { Dialog, DialogContent, DialogActions, Box, Typography, IconButton, useTheme } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import type { WorkflowStep } from '../../services/exploreService';

interface WorkflowDetailModalProps {
  open: boolean;
  step: WorkflowStep | null;
  onClose: () => void;
  onClick: () => void;
}

export default function WorkflowDetailModal({
  open,
  step,
  onClose,
  onClick,
}: WorkflowDetailModalProps) {
  const theme = useTheme();
  if (!step) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '16px',
          maxWidth: '400px',
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          pl: 2.5,
          pr: 2.5,
          pt: 2.5,
          pb: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',

        }}
      >
        <Typography
          sx={{
            fontFamily: 'Pretendard, sans-serif',
            fontSize: 18,
            fontWeight: 700,
            color: theme.palette.text.primary,
          }}
        >
          작업 상세
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Content */}
      <DialogContent sx={{ p: 3 }}>
        {/* Task Name */}
        <Box sx={{ mb: 0.5 }}>
          <Typography
            sx={{
              fontFamily: 'Pretendard, sans-serif',
              fontSize: 16,
              fontWeight: 600,
              color: theme.palette.text.primary,
            }}
          >
            {step.name}
          </Typography>
        </Box>

        {/* Detail */}
        <Box sx={{ mb: 1.5 }}>
          <Typography
            sx={{
              fontFamily: 'Pretendard, sans-serif',
              fontSize: 14,
              color: theme.palette.text.secondary,
              lineHeight: 1.6,
            }}
          >
            {step.detail}
          </Typography>
        </Box>

        {/* Person in Charge */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            mb: 2,
          }}
        >
          <Box>
            <Typography
              sx={{
                fontFamily: 'Pretendard, sans-serif',
                fontSize: 13,
                color: theme.palette.text.secondary,
              }}
            >
              담당자
            </Typography>
            <Typography
              sx={{
                fontFamily: 'Pretendard, sans-serif',
                fontSize: 14,
                fontWeight: 600,
                color: theme.palette.text.primary,
              }}
            >
              {step.personInCharge}
            </Typography>
          </Box>

          {/* Deadline */}

          <Box sx={{ ml: 12 }}>
            <Typography
              sx={{
                fontFamily: 'Pretendard, sans-serif',
                fontSize: 13,
                color: theme.palette.text.secondary,
              }}
            >
              마감일
            </Typography>
            <Typography
              sx={{
                fontFamily: 'Pretendard, sans-serif',
                fontSize: 14,
                fontWeight: 600,
                color: theme.palette.text.primary,
              }}
            >
              {step.deadline}
            </Typography>
          </Box>
        </Box>

        {/* Status */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: step.isCompleted ? '#10B981' : '#D1D5DB',
            }}
          />
          <Typography
            sx={{
              fontFamily: 'Pretendard, sans-serif',
              fontSize: 14,
              color: theme.palette.text.primary,
            }}
          >
            {step.isCompleted ? '완료됨' : '진행 중'}
          </Typography>
        </Box>
      </DialogContent>

      {/* Actions */}
      <DialogActions sx={{ p: 3, pt: 0, gap: 1 }}>
        <Box
          onClick={onClose}
          sx={{
            flex: 1,
            height: 48,
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: '100px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <Typography
            sx={{
              fontFamily: 'Pretendard, sans-serif',
              fontSize: 14,
              fontWeight: 400,
            }}
          >
            닫기
          </Typography>
        </Box>
        {!step.isCompleted && (
          <Box
            onClick={onClick}
            sx={{
              flex: 1,
              height: 48,
              backgroundColor: theme.palette.primary.main,
              borderRadius: '100px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <Typography
              sx={{
                fontFamily: 'Pretendard, sans-serif',
                fontSize: 14,
                fontWeight: 350,
                color: '#fff',
              }}
            >
              완료 표시
            </Typography>
          </Box>
        )}
        {step.isCompleted && (
          <Box
            onClick={onClick}
            sx={{
              flex: 1,
              height: 48,
              backgroundColor: theme.palette.primary.main,
              borderRadius: '100px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <Typography
              sx={{
                fontFamily: 'Pretendard, sans-serif',
                fontSize: 14,
                fontWeight: 350,
                color: '#fff',
              }}
            >
              진행중으로 변경
            </Typography>
          </Box>
        )}
      </DialogActions>
    </Dialog>
  );
}
