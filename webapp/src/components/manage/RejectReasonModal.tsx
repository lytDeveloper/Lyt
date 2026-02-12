import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  TextField,
  IconButton,
  Chip,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

interface RejectReasonModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => void;
  title?: string;
  description?: string;
  confirmLabel?: string;
  isProcessing?: boolean;
  type?: 'application' | 'invitation' | 'talk_request';
}

const PRESET_REASONS: Record<string, string[]> = {
  application: [
    '현재 모집이 완료되었습니다',
    '포트폴리오가 프로젝트 방향과 맞지 않습니다',
    '경력/스킬이 요구사항과 맞지 않습니다',
    '다른 지원자를 선정하였습니다',
  ],
  invitation: [
    '현재 다른 프로젝트에 참여 중입니다',
    '협업 방향성이 맞지 않습니다',
    '일정이 맞지 않습니다',
    '개인 사정으로 참여가 어렵습니다',
  ],
  talk_request: [
    '현재 협업 가능한 상황이 아닙니다',
    '관심 분야가 맞지 않습니다',
    '일정이 맞지 않습니다',
    '개인 사정으로 대화가 어렵습니다',
  ],
};

export default function RejectReasonModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  isProcessing = false,
  type = 'invitation',
}: RejectReasonModalProps) {
  const theme = useTheme();
  const [reason, setReason] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  const presetReasons = PRESET_REASONS[type] || PRESET_REASONS['invitation'];

  const handlePresetClick = (preset: string) => {
    if (selectedPreset === preset) {
      setSelectedPreset(null);
      setReason('');
    } else {
      setSelectedPreset(preset);
      setReason(preset);
    }
  };

  const handleConfirm = () => {
    onConfirm(reason.trim() || undefined);
    handleClose();
  };

  const handleClose = () => {
    setReason('');
    setSelectedPreset(null);
    onClose();
  };

  const getTitle = () => {
    if (title) return title;
    switch (type) {
      case 'application':
        return '지원 거절';
      case 'invitation':
        return '초대 거절';
      case 'talk_request':
        return '대화 요청 거절';
      default:
        return '거절';
    }
  };

  const getDescription = () => {
    if (description) return description;
    switch (type) {
      case 'application':
        return '이 지원을 거절하시겠어요? 선택적으로 거절 사유를 남길 수 있어요.';
      case 'invitation':
        return '초대를 거절하시겠어요? 선택적으로 거절 사유를 남길 수 있어요.';
      case 'talk_request':
        return '대화 요청을 거절하시겠어요? 선택적으로 거절 사유를 남길 수 있어요.';
      default:
        return '정말 거절하시겠어요?';
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: '16px' },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Typography sx={{ fontSize: 18, fontWeight: 700, color: '#DC2626' }}>
          {getTitle()}
        </Typography>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 2.5 }}>
        <Typography sx={{ fontSize: 14, color: theme.palette.text.secondary, mb: 3 }}>
          {getDescription()}
        </Typography>

        {/* Preset Reasons */}
        <Box sx={{ mb: 2 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: theme.palette.text.primary, mb: 1 }}>
            빠른 선택
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {presetReasons.map((preset, index) => (
              <Chip
                key={index}
                label={preset}
                onClick={() => handlePresetClick(preset)}
                sx={{
                  bgcolor: selectedPreset === preset ? '#FEE2E2' : '#F3F4F6',
                  color: selectedPreset === preset ? '#DC2626' : theme.palette.text.secondary,
                  borderColor: selectedPreset === preset ? '#DC2626' : 'transparent',
                  border: selectedPreset === preset ? '1px solid' : 'none',
                  cursor: 'pointer',
                }}
              />
            ))}
          </Box>
        </Box>

        {/* Custom Reason */}
        <Box>
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: theme.palette.text.primary, mb: 1 }}>
            직접 입력 (선택)
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            placeholder="거절 사유를 직접 입력해주세요"
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setSelectedPreset(null);
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '8px',
              },
            }}
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button
          onClick={handleClose}
          disabled={isProcessing}
          sx={{ color: theme.palette.text.secondary }}
        >
          취소
        </Button>
        <Button
          variant="contained"
          onClick={handleConfirm}
          disabled={isProcessing}
          sx={{
            bgcolor: '#DC2626',
            boxShadow: 'none',
          }}
        >
          {confirmLabel || '거절하기'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}























