import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  IconButton,
  TextField,
  Select,
  MenuItem,
  FormControl,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import type { WorkflowStep } from '../../services/exploreService';

interface TeamMemberOption {
  id: string;
  name: string;
}

interface AddWorkflowStepModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (step: WorkflowStep) => void;
  teamMembers: TeamMemberOption[];
}

export default function AddWorkflowStepModal({
  open,
  onClose,
  onSubmit,
  teamMembers,
}: AddWorkflowStepModalProps) {
  const theme = useTheme();
  const [name, setName] = useState('');
  const [detail, setDetail] = useState('');
  const [personInCharge, setPersonInCharge] = useState('');
  const [deadline, setDeadline] = useState('');

  useEffect(() => {
    if (open) {
      // Reset form when modal opens
      setName('');
      setDetail('');
      setPersonInCharge('');
      setDeadline('');
    }
  }, [open]);

  const handleSubmit = () => {
    if (!name || !personInCharge || !deadline) {
      alert('필수 항목을 모두 입력해주세요.');
      return;
    }

    // 고유 ID 생성 (UUID 또는 timestamp 기반)
    const generateId = () => {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
      }
      // Fallback: timestamp + random
      return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    };

    const newStep: WorkflowStep = {
      id: generateId(),
      name,
      detail,
      personInCharge,
      deadline,
      isCompleted: false,
      completedAt: null,
    };

    onSubmit(newStep);
  };

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
          새 작업 추가
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Content */}
      <DialogContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {/* Task Name */}
          <Box>
            <Typography
              sx={{
                fontFamily: 'Pretendard, sans-serif',
                fontSize: 14,
                fontWeight: 500,
                color: theme.palette.text.primary,
                mb: 1,
              }}
            >
              작업명 <span style={{ color: 'red' }}>*</span>
            </Typography>
            <TextField
              fullWidth
              placeholder="작업 이름을 입력하세요"
              value={name}
              onChange={(e) => setName(e.target.value)}
              variant="outlined"
              size="small"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                  backgroundColor: '#F9FAFB',
                  '& fieldset': { borderColor: '#E5E7EB' },
                },
              }}
            />
          </Box>

          {/* Detail */}
          <Box>
            <Typography
              sx={{
                fontFamily: 'Pretendard, sans-serif',
                fontSize: 14,
                fontWeight: 500,
                color: theme.palette.text.primary,
                mb: 1,
              }}
            >
              상세 설명
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={3}
              placeholder="작업에 대한 설명을 입력하세요"
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              variant="outlined"
              size="small"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                  backgroundColor: '#F9FAFB',
                  '& fieldset': { borderColor: '#E5E7EB' },
                },
              }}
            />
          </Box>

          {/* Person in Charge */}
          <Box>
            <Typography
              sx={{
                fontFamily: 'Pretendard, sans-serif',
                fontSize: 14,
                fontWeight: 500,
                color: theme.palette.text.primary,
                mb: 1,
              }}
            >
              담당자 <span style={{ color: 'red' }}>*</span>
            </Typography>
            <FormControl fullWidth size="small">
              <Select
                value={personInCharge}
                onChange={(e) => setPersonInCharge(e.target.value)}
                displayEmpty
                sx={{
                  borderRadius: '8px',
                  backgroundColor: '#F9FAFB',
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#E5E7EB' },
                }}
              >
                <MenuItem value="" disabled>
                  <Typography sx={{ color: theme.palette.text.secondary, fontSize: 14 }}>담당자를 선택하세요</Typography>
                </MenuItem>
                {teamMembers.map((member) => (
                  <MenuItem key={member.id} value={member.name}>
                    {member.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {/* Deadline */}
          <Box>
            <Typography
              sx={{
                fontFamily: 'Pretendard, sans-serif',
                fontSize: 14,
                fontWeight: 500,
                color: theme.palette.text.primary,
                mb: 1,
              }}
            >
              마감일 <span style={{ color: 'red' }}>*</span>
            </Typography>
            <TextField
              fullWidth
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              variant="outlined"
              size="small"
              InputLabelProps={{
                shrink: true,
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                  backgroundColor: '#F9FAFB',
                  '& fieldset': { borderColor: '#E5E7EB' },
                },
              }}
            />
          </Box>
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
            취소
          </Typography>
        </Box>
        <Box
          onClick={handleSubmit}
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
              fontWeight: 600,
              color: '#fff',
            }}
          >
            추가하기
          </Typography>
        </Box>
      </DialogActions>
    </Dialog>
  );
}

