/**
 * InvitationModal Component
 * 통합 초대 모달 - 프로젝트/협업 초대를 하나의 UI로 처리
 */

import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  ToggleButtonGroup,
  ToggleButton,
  useTheme,
} from '@mui/material';
import { LightningLoader } from './index';
import { toast } from 'react-toastify';
import {
  createInvitation,
  getInvitableTargets,
} from '../../services/invitationService';
import type {
  InvitationType,
  CreateInvitationInput,
  InvitableTarget,
} from '../../types/invitation.types';
import { getCategoryLabel } from '../../constants/projectConstants';

interface InvitationModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  receiverId: string;
  receiverName: string;
  defaultType?: InvitationType;
}

export default function InvitationModal({
  open,
  onClose,
  onSuccess,
  receiverId,
  receiverName,
  defaultType = 'project',
}: InvitationModalProps) {
  const theme = useTheme();
  const [invitationType, setInvitationType] = useState<InvitationType>(defaultType);
  const [targets, setTargets] = useState<InvitableTarget[]>([]);
  const [loadingTargets, setLoadingTargets] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [selectedTargetId, setSelectedTargetId] = useState('');
  const [message, setMessage] = useState('');
  const [position, setPosition] = useState('');
  const [responsibilities, setResponsibilities] = useState('');
  const [budgetRange, setBudgetRange] = useState('');
  const [duration, setDuration] = useState('');

  // 뒤로 가기 처리를 위한 ref
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const historyPushedRef = useRef(false);

  // OS/브라우저 뒤로 가기 시 모달만 닫히도록 처리
  useEffect(() => {
    if (!open) {
      historyPushedRef.current = false;
      return;
    }

    // 모달이 열릴 때 history에 상태 추가
    window.history.pushState({ modal: 'invitation' }, '');
    historyPushedRef.current = true;

    const handlePopState = () => {
      historyPushedRef.current = false;
      onCloseRef.current();
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      // 모달이 닫힐 때 history 정리 (정상 닫기 시)
      if (historyPushedRef.current) {
        window.history.back();
        historyPushedRef.current = false;
      }
    };
  }, [open]);

  // 모달 열릴 때 초기화
  useEffect(() => {
    if (open) {
      setInvitationType(defaultType);
      resetForm();
      loadTargets(defaultType);
    }
  }, [open, defaultType]);

  // 타입 변경 시 대상 목록 다시 로드
  useEffect(() => {
    if (open) {
      loadTargets(invitationType);
      setSelectedTargetId('');
    }
  }, [invitationType]);

  const resetForm = () => {
    setSelectedTargetId('');
    setMessage('');
    setPosition('');
    setResponsibilities('');
    setBudgetRange('');
    setDuration('');
  };

  const loadTargets = async (type: InvitationType) => {
    setLoadingTargets(true);
    try {
      const result = await getInvitableTargets(type, receiverId);
      setTargets(result);

      if (result.length === 0) {
        const typeLabel = type === 'project' ? '프로젝트' : '협업';
        toast.info(`초대 가능한 ${typeLabel}(이)가 없어요. ${typeLabel}를 먼저 생성해주세요.`);
      }
    } catch (error) {
      console.error('[InvitationModal] Failed to load targets:', error);
      toast.error('목록을 불러오는데 실패했어요');
    } finally {
      setLoadingTargets(false);
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!selectedTargetId) {
      toast.error(invitationType === 'project' ? '프로젝트를 선택해주세요' : '협업을 선택해주세요');
      return;
    }

    if (!message.trim() || message.trim().length < 10) {
      toast.error('메시지는 최소 10자 이상 입력해주세요');
      return;
    }

    setSubmitting(true);
    try {
      const input: CreateInvitationInput = {
        invitationType,
        targetId: selectedTargetId,
        receiverId,
        message: message.trim(),
        position: position.trim() || undefined,
        responsibilities: responsibilities.trim() || undefined,
        budgetRange: budgetRange.trim() || undefined,
        duration: duration.trim() || undefined,
      };

      await createInvitation(input);
      toast.success('초대를 보냈습니다');
      onSuccess();
    } catch (error: unknown) {
      console.error('[InvitationModal] Failed to send invitation:', error);
      toast.error(error instanceof Error ? error.message : '초대 전송에 실패했습니다');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      onClose();
    }
  };

  const stopPropagation = (event: React.MouseEvent) => {
    event.stopPropagation();
  };

  const typeLabel = invitationType === 'project' ? '프로젝트' : '협업';

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          p: 1,
          maxWidth: 480,
          maxHeight: '90vh',
        },
        onClick: stopPropagation,
      }}
    >
      <DialogContent sx={{ pt: 3, pb: 2, px: 3 }} onClick={stopPropagation}>
        {/* Title */}
        <Box sx={{ mb: 3 }}>
          <Typography
            sx={{
              fontSize: 18,
              fontWeight: 700,
              color: theme.palette.text.primary,
              lineHeight: 1.3,
            }}
          >
            {receiverName}님에게 초대 보내기
          </Typography>
          <Typography
            sx={{
              fontSize: 14,
              fontWeight: 400,
              color: theme.palette.text.secondary,
              lineHeight: 1.5,
              mt: 0.5,
            }}
          >
            프로젝트 또는 협업에 초대합니다
          </Typography>
        </Box>

        {/* Type Selection */}
        <Box sx={{ mb: 3 }}>
          <ToggleButtonGroup
            value={invitationType}
            exclusive
            onChange={(_, value) => value && setInvitationType(value)}
            fullWidth
            sx={{
              gap: 1.5,
              '& .MuiToggleButtonGroup-grouped': {
                border: `1px solid ${theme.palette.divider}`,
                '&:not(:first-of-type)': {
                  borderRadius: '24px',
                  borderLeft: `1px solid ${theme.palette.divider}`,
                  marginLeft: 0,
                },
                '&:first-of-type': {
                  borderRadius: '24px',
                },
              },
              '& .MuiToggleButton-root': {
                borderRadius: '24px',
                py: 1,
                textTransform: 'none',
                fontSize: 14,
                fontWeight: 600,
                '&.Mui-selected': {
                  bgcolor: theme.palette.primary.main,
                  color: theme.palette.primary.contrastText,
                  borderColor: theme.palette.primary.main,
                  '&:hover': {
                    bgcolor: theme.palette.primary.dark,
                  },
                },
              },
            }}
          >
            <ToggleButton value="project">프로젝트</ToggleButton>
            <ToggleButton value="collaboration">협업</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* Form Fields */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Target Selection */}
          <FormControl fullWidth required>
            <InputLabel
              sx={{
                fontSize: 14,
                '&.Mui-focused': { color: theme.palette.primary.main },
              }}
            >
              {typeLabel} 선택
            </InputLabel>
            <Select
              key={invitationType}
              value={selectedTargetId}
              onChange={(e) => setSelectedTargetId(e.target.value)}
              label={`${typeLabel} 선택`}
              disabled={loadingTargets || targets.length === 0}
              MenuProps={{
                disableAutoFocusItem: true,
                autoFocus: false,
              }}
              sx={{
                fontSize: 14,
                borderRadius: '16px',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: theme.palette.divider,
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: theme.palette.primary.main,
                },
              }}
            >
              {loadingTargets ? (
                <MenuItem disabled>
                  <LightningLoader size={18} />
                  <Typography sx={{ ml: 1, fontSize: 14 }}>로딩 중...</Typography>
                </MenuItem>
              ) : targets.length === 0 ? (
                <MenuItem disabled>초대 가능한 {typeLabel}가 없습니다</MenuItem>
              ) : (
                targets.map((target) => (
                  <MenuItem
                    key={target.id}
                    value={target.id}
                    sx={{ fontSize: 14 }}
                  >
                    <Box>
                      <Typography sx={{ fontSize: 14, fontWeight: 600 }}>
                        {target.title}
                      </Typography>
                      {target.category && (
                        <Typography sx={{ fontSize: 12, color: theme.palette.text.secondary }}>
                          {getCategoryLabel(target.category)}
                        </Typography>
                      )}
                    </Box>
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>

          {/* Position */}
          <TextField
            label="포지션/역할 (선택)"
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            placeholder="예: 리드 디자이너, 프론트엔드 개발자"
            sx={{
              '& .MuiInputLabel-root': { fontSize: 14 },
              '& .MuiInputBase-root': { fontSize: 14 },
              '& .MuiOutlinedInput-root': { borderRadius: '16px' },
            }}
          />

          {/* Responsibilities */}
          <TextField
            label="담당 업무 (선택)"
            multiline
            rows={2}
            value={responsibilities}
            onChange={(e) => setResponsibilities(e.target.value)}
            placeholder="맡게 될 구체적인 업무를 설명해주세요"
            sx={{
              '& .MuiInputLabel-root': { fontSize: 14 },
              '& .MuiInputBase-root': { fontSize: 14 },
              '& .MuiOutlinedInput-root': { borderRadius: '16px' },
            }}
          />

          {/* Budget Range (프로젝트용) */}
          {invitationType === 'project' && (
            <TextField
              label="예산 범위 (선택)"
              value={budgetRange}
              onChange={(e) => setBudgetRange(e.target.value)}
              placeholder="예: 300-500만원"
              sx={{
                '& .MuiInputLabel-root': { fontSize: 14 },
                '& .MuiInputBase-root': { fontSize: 14 },
                '& .MuiOutlinedInput-root': { borderRadius: '16px' },
              }}
            />
          )}

          {/* Duration */}
          <TextField
            label="기간 (선택)"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="예: 2개월, 3주"
            sx={{
              '& .MuiInputLabel-root': { fontSize: 14 },
              '& .MuiInputBase-root': { fontSize: 14 },
              '& .MuiOutlinedInput-root': { borderRadius: '16px' },
            }}
          />

          {/* Message */}
          <TextField
            label="초대 메시지"
            required
            multiline
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={`${receiverName}님께 ${typeLabel}를 소개하고, 함께하고 싶은 이유를 작성해주세요 (최소 10자)`}
            helperText={`${message.length}/500 자`}
            inputProps={{ maxLength: 500 }}
            sx={{
              '& .MuiInputLabel-root': {
                fontSize: 14,
                '&.Mui-focused': { color: theme.palette.primary.main },
              },
              '& .MuiInputBase-root': { fontSize: 14 },
              '& .MuiOutlinedInput-root': { borderRadius: '16px' },
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: theme.palette.divider,
              },
              '& .Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: theme.palette.primary.main,
              },
            }}
          />
        </Box>
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
          disabled={submitting}
          fullWidth
          sx={{
            height: 44,
            borderRadius: '24px',
            color: theme.palette.text.secondary,
            backgroundColor: theme.palette.grey[100],
            textTransform: 'none',
            fontSize: 15,
            fontWeight: 600,
            '&:disabled': {
              backgroundColor: theme.palette.grey[100],
              color: theme.palette.text.disabled,
            },
          }}
        >
          취소
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!selectedTargetId || !message.trim() || message.trim().length < 10 || submitting}
          fullWidth
          sx={{
            height: 44,
            borderRadius: '24px',
            backgroundColor: theme.palette.primary.main,
            color: theme.palette.primary.contrastText,
            textTransform: 'none',
            fontSize: 15,
            fontWeight: 600,
            '&:disabled': {
              backgroundColor: theme.palette.grey[300],
              color: theme.palette.text.disabled,
            },
            '&:hover': {
              backgroundColor: theme.palette.primary.dark,
            },
          }}
        >
          {submitting ? '전송 중...' : '초대 보내기'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
