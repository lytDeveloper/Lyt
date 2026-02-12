import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  useTheme,
  CircularProgress,
} from '@mui/material';
import ExpandCircleDownOutlinedIcon from '@mui/icons-material/ExpandCircleDownOutlined';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import PauseCircleOutlinedIcon from '@mui/icons-material/PauseCircleOutlined';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import { getStatusLabel } from '../../constants/projectConstants';
import type { ProjectStatus } from '../../types/exploreTypes';

interface StatusChangeConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  currentStatus: ProjectStatus;
  newStatus: ProjectStatus;
  itemTitle: string;
  itemType: 'project' | 'collaboration';
  loading?: boolean;
}

// 상태별 아이콘 및 색상
const getStatusConfig = (status: ProjectStatus) => {
  switch (status) {
    case 'completed':
      return {
        icon: ExpandCircleDownOutlinedIcon,
        color: '#2563EB',
        bgColor: '#EFF6FF',
      };
    case 'cancelled':
      return {
        icon: CancelOutlinedIcon,
        color: '#EF4444',
        bgColor: '#FEF2F2',
      };
    case 'on_hold':
      return {
        icon: PauseCircleOutlinedIcon,
        color: '#D97706',
        bgColor: '#FEF3C7',
      };
    case 'deleted':
      return {
        icon: DeleteOutlinedIcon,
        color: '#DC2626',
        bgColor: '#FEE2E2',
      };
    default:
      return {
        icon: ExpandCircleDownOutlinedIcon,
        color: '#6B7280',
        bgColor: '#F3F4F6',
      };
  }
};

/**
 * 상태 변경 확인 다이얼로그
 * - 앱 스타일 커스텀 (둥근 모서리, 커스텀 버튼)
 * - 상태별 아이콘 표시
 * - deleted 변경 시 destructive 스타일
 */
export default function StatusChangeConfirmDialog({
  open,
  onClose,
  onConfirm,
  currentStatus: _currentStatus,
  newStatus,
  itemTitle,
  itemType,
  loading = false,
}: StatusChangeConfirmDialogProps) {
  void _currentStatus; // 향후 사용을 위해 유지
  const theme = useTheme();
  const isDestructive = newStatus === 'deleted';
  const statusConfig = getStatusConfig(newStatus);
  const StatusIcon = statusConfig.icon;

  const itemTypeLabel = itemType === 'project' ? '프로젝트' : '협업';

  // 상태별 메시지
  const getMessage = () => {
    switch (newStatus) {
      case 'completed':
        return `이 ${itemTypeLabel}을(를) 완료 처리하시겠어요? 아카이브로 이동되요.`;
      case 'cancelled':
        return `이 ${itemTypeLabel}을(를) 취소 처리하시겠어요? 아카이브로 이동되요.`;
      case 'on_hold':
        return `이 ${itemTypeLabel}을(를) 보류 처리하시겠어요? 아카이브로 이동되요.`;
      case 'deleted':
        return `이 ${itemTypeLabel}을(를) 삭제하시겠어요? 삭제 후 복구할 수 없어요.`;
      default:
        return `상태를 '${getStatusLabel(newStatus)}'(으)로 변경하시겠어요?`;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      PaperProps={{
        sx: {
          borderRadius: '16px',
          maxWidth: 340,
          width: '60%',
          m: 2,
        },
      }}
    >
      <DialogTitle sx={{ pb: 1, pt: 3, px: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
          {/* 상태 아이콘 */}
          <Box
            sx={{
              width: 30,
              height: 30,
              borderRadius: '50%',
              // backgroundColor: statusConfig.bgColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <StatusIcon sx={{ fontSize: 24, color: statusConfig.color }} />
          </Box>
          <Typography
            sx={{
              fontSize: 16,
              fontWeight: 600,
              color: theme.palette.text.primary,
              textAlign: 'center',
            }}
          >
            {isDestructive ? '삭제 확인' : '상태 변경'}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ px: 3, pt: 1, pb: 2 }}>
        <Typography
          sx={{
            fontSize: 14,
            color: theme.palette.text.secondary,
            textAlign: 'center',
            lineHeight: 1.6,
          }}
        >
          {getMessage()}
        </Typography>
        {/* 아이템 제목 표시 */}
        <Box
          sx={{
            mt: 2,
            p: 1.5,
            backgroundColor: theme.palette.grey[50],
            borderRadius: '8px',
          }}
        >
          <Typography
            sx={{
              fontSize: 13,
              fontWeight: 500,
              color: theme.palette.text.primary,
              textAlign: 'center',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {itemTitle}
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, pt: 0, gap: 1 }}>
        <Button
          fullWidth
          onClick={onClose}
          disabled={loading}
          sx={{
            borderRadius: '24px',
            height: 44,
            width: '50%',
            fontSize: 14,
            fontWeight: 500,
            color: theme.palette.text.secondary,
            backgroundColor: theme.palette.grey[100],
            '&:hover': {
              backgroundColor: theme.palette.grey[200],
            },
          }}
        >
          취소
        </Button>
        <Button
          fullWidth
          variant="contained"
          onClick={onConfirm}
          disabled={loading}
          sx={{
            borderRadius: '24px',
            height: 44,
            width: '50%',
            fontSize: 14,
            fontWeight: 500,
            backgroundColor: isDestructive ? '#EF4444' : theme.palette.primary.main,
            boxShadow: 'none',
            '&:hover': {
              backgroundColor: isDestructive ? '#DC2626' : theme.palette.primary.dark,
              boxShadow: 'none',
            },
          }}
        >
          {loading ? (
            <CircularProgress size={20} color="inherit" />
          ) : isDestructive ? (
            '삭제'
          ) : (
            '확인'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
