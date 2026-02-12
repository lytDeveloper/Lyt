import { useState, forwardRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  IconButton,
  Alert,
  Slide,
} from '@mui/material';
import { LightningLoader } from './index';
import CloseIcon from '@mui/icons-material/Close';
import type { TransitionProps } from '@mui/material/transitions';
import { useMutation } from '@tanstack/react-query';
import { inquiryService } from '../../services/inquiryService';

interface SignupInquiryModalProps {
  open: boolean;
  onClose: () => void;
  onSubmitted: () => void;
}

const MAX_CONTENT_LENGTH = 500;

const Transition = forwardRef(function Transition(
  props: TransitionProps & { children: React.ReactElement<any, any> },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export default function SignupInquiryModal({
  open,
  onClose,
  onSubmitted,
}: SignupInquiryModalProps) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [contents, setContents] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const resetForm = () => {
    setUsername('');
    setEmail('');
    setContents('');
    setErrorMessage(null);
  };

  const handleClose = () => {
    if (!mutation.isPending) {
      resetForm();
      onClose();
    }
  };

  const isValidEmail = (value: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (!username.trim() || !email.trim() || !contents.trim()) {
        throw new Error('이름, 이메일, 상세 내용을 모두 입력해주세요.');
      }
      if (!isValidEmail(email)) {
        throw new Error('올바른 이메일 형식이 아닙니다.');
      }

      await inquiryService.submitSignupInquiry({
        username: username.trim(),
        email: email.trim(),
        contents: contents.trim(),
      });
    },
    onSuccess: () => {
      resetForm();
      onSubmitted();
    },
    onError: (error: Error) => {
      setErrorMessage(error.message || '문의 제출에 실패했어요. 잠시 후 다시 시도해주세요.');
    },
  });

  const handleSubmit = () => {
    setErrorMessage(null);
    mutation.mutate();
  };

  const handleContentsChange = (value: string) => {
    if (value.length <= MAX_CONTENT_LENGTH) {
      setContents(value);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      TransitionComponent={Transition}
      keepMounted
      fullWidth
      maxWidth="xs"
      sx={{
        // 컨테이너를 화면 하단으로 정렬
        '& .MuiDialog-container': {
          alignItems: 'flex-end',
        },
      }}
      PaperProps={{
        sx: {
          borderRadius: '22px 22px 0 0',
          p: 1,
          width: 'calc(100% - 32px)',
          m: 0,
          position: 'relative',
          bottom: 0,
        },
      }}
      BackdropProps={{
        sx: {
          backgroundColor: 'rgba(15, 23, 42, 0.4)',
        },
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, pb: 0 }}>
        <DialogTitle
          sx={{
            p: 0,
            fontWeight: 700,
            fontSize: 18,
          }}
        >
          가입 문의하기
        </DialogTitle>
        <IconButton onClick={handleClose} size="small" aria-label="close">
          <CloseIcon />
        </IconButton>
      </Box>

      <DialogContent sx={{ pt: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {errorMessage && (
            <Alert severity="error" sx={{ mb: 1 }}>
              {errorMessage}
            </Alert>
          )}

          {/* 이름 */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 500 }}>
              이름 <Typography component="span" sx={{ color: '#EF4444' }}>*</Typography>
            </Typography>
            <TextField
              fullWidth
              size="small"
              placeholder="이름을 입력해 주세요"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              InputProps={{ sx: { borderRadius: 2 } }}
            />
          </Box>

          {/* 이메일 */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 500 }}>
              이메일 <Typography component="span" sx={{ color: '#EF4444' }}>*</Typography>
            </Typography>
            <TextField
              fullWidth
              size="small"
              placeholder="example@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              InputProps={{ sx: { borderRadius: 2 } }}
            />
          </Box>

          {/* 상세 내용 */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 500 }}>
              상세 내용 <Typography component="span" sx={{ color: '#EF4444' }}>*</Typography>
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={5}
              placeholder="문제에 대해 자세히 설명해 주세요"
              value={contents}
              onChange={(e) => handleContentsChange(e.target.value)}
              InputProps={{ sx: { borderRadius: 2 } }}
            />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5 }}>
              <Typography sx={{ fontSize: 12, color: '#9CA3AF' }}>
                {contents.length}/{MAX_CONTENT_LENGTH}
              </Typography>
            </Box>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, pt: 1, justifyContent: 'center' }}>
        <Button
          onClick={handleSubmit}
          variant="contained"
          fullWidth
          size="large"
          disabled={mutation.isPending}
          sx={{
            borderRadius: '26px',
            py: 1.4,
            fontSize: 16,
            fontWeight: 600,
            width: '100%',
            backgroundColor: '#2563EB',
          }}
        >
          {mutation.isPending ? <LightningLoader size={20} color="inherit" /> : '문의하기'}
        </Button>
      </DialogActions>
      <Typography sx={{ mt: 1, fontWeight: 400, textAlign: 'center', color: '#949196', fontSize: 12, pb: 2 }}>
        영업일 기준 1-2일 내에 답변드릴게요.
      </Typography>
    </Dialog>
  );
}

