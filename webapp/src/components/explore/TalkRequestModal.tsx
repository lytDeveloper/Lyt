import { useState } from 'react';
import {
  Dialog,
  Box,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  useTheme,
} from '@mui/material';
import { LightningLoader } from '../common';
import type { SelectChangeEvent } from '@mui/material';
import { TALK_REQUEST_TEMPLATES } from '../../types/talkRequest.types';

interface TalkRequestModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (templateMessage: string, additionalMessage?: string) => Promise<void>;
  partnerName: string;
  /** 모달 제목 (기본값: '대화 요청') */
  title?: string;
  /** 모달 부제목 (기본값: '{partnerName}님에게 대화를 요청합니다') */
  subtitle?: string;
  /** 사용할 템플릿 배열 (기본값: TALK_REQUEST_TEMPLATES) */
  templates?: readonly string[];
}

export default function TalkRequestModal({
  open,
  onClose,
  onSubmit,
  partnerName,
  title = '대화 요청',
  subtitle,
  templates = TALK_REQUEST_TEMPLATES,
}: TalkRequestModalProps) {
  const theme = useTheme();
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [additionalMessage, setAdditionalMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const displaySubtitle = subtitle ?? `${partnerName}님에게 대화를 요청합니다`;

  const handleTemplateChange = (event: SelectChangeEvent<string>) => {
    setSelectedTemplate(event.target.value);
  };

  const handleAdditionalMessageChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = event.target.value;
    if (value.length <= 500) {
      setAdditionalMessage(value);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setSelectedTemplate('');
      setAdditionalMessage('');
      onClose();
    }
  };

  const handleSubmit = async () => {
    if (!selectedTemplate || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit(selectedTemplate, additionalMessage || undefined);
      setSelectedTemplate('');
      setAdditionalMessage('');
    } catch (error) {
      // 에러는 상위에서 처리
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValid = selectedTemplate.length > 0;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      sx={{ zIndex: 1500 }}
      PaperProps={{
        sx: {
          borderRadius: '16px',
          padding: 3,
          margin: 2,
          maxWidth: 400,
        },
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {/* 헤더 */}
        <Box sx={{ textAlign: 'center' }}>
          <Typography
            sx={{
              fontFamily: 'Pretendard, sans-serif',
              fontSize: 18,
              fontWeight: 700,
              color: theme.palette.text.primary,
              mb: 0.5,
            }}
          >
            {title}
          </Typography>
          <Typography
            sx={{
              fontFamily: 'Pretendard, sans-serif',
              fontSize: 14,
              color: theme.palette.text.secondary,
            }}
          >
            {displaySubtitle}
          </Typography>
        </Box>

        {/* 템플릿 선택 */}
        <FormControl fullWidth>
          <InputLabel
            id="template-select-label"
            sx={{
              fontFamily: 'Pretendard, sans-serif',
              fontSize: 14,
            }}
          >
            메시지 선택
          </InputLabel>
          <Select
            labelId="template-select-label"
            value={selectedTemplate}
            onChange={handleTemplateChange}
            label="메시지 선택"
            disabled={isSubmitting}
            sx={{
              fontFamily: 'Pretendard, sans-serif',
              fontSize: 14,
              '& .MuiSelect-select': {
                whiteSpace: 'normal',
                wordBreak: 'keep-all',
              },
            }}
            MenuProps={{
              sx: { zIndex: 1600 },
              PaperProps: {
                sx: {
                  maxHeight: 300,
                },
              },
            }}
          >
            {templates.map((template, index) => (
              <MenuItem
                key={index}
                value={template}
                sx={{
                  fontFamily: 'Pretendard, sans-serif',
                  fontSize: 14,
                  whiteSpace: 'normal',
                  wordBreak: 'keep-all',
                  py: 1.5,
                }}
              >
                {template}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* 추가 메시지 입력 */}
        <Box>
          <TextField
            multiline
            rows={4}
            fullWidth
            placeholder="추가로 전달하고 싶은 내용을 입력하세요 (선택사항)"
            value={additionalMessage}
            onChange={handleAdditionalMessageChange}
            disabled={isSubmitting}
            sx={{
              '& .MuiInputBase-root': {
                fontFamily: 'Pretendard, sans-serif',
                fontSize: 14,
                borderRadius: '12px',
              },
              '& .MuiInputBase-input': {
                fontFamily: 'Pretendard, sans-serif',
              },
            }}
          />
          <Typography
            sx={{
              fontFamily: 'Pretendard, sans-serif',
              fontSize: 12,
              color: theme.palette.text.secondary,
              textAlign: 'right',
              mt: 0.5,
            }}
          >
            {additionalMessage.length}/500
          </Typography>
        </Box>

        {/* 버튼 영역 */}
        <Box sx={{ display: 'flex', gap: 1.5, mt: 1 }}>
          <Button
            onClick={handleClose}
            disabled={isSubmitting}
            sx={{
              flex: 1,
              height: 44,
              borderRadius: '22px',
              fontFamily: 'Pretendard, sans-serif',
              fontSize: 15,
              fontWeight: 600,
              color: theme.palette.text.secondary,
              backgroundColor: theme.palette.grey[100],
              textTransform: 'none',
              '&:hover': {
                backgroundColor: theme.palette.grey[200],
              },
            }}
          >
            취소
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || isSubmitting}
            sx={{
              flex: 1,
              height: 44,
              borderRadius: '22px',
              fontFamily: 'Pretendard, sans-serif',
              fontSize: 15,
              fontWeight: 600,
              color: '#fff',
              backgroundColor: theme.palette.primary.main,
              textTransform: 'none',
              '&:hover': {
                backgroundColor: theme.palette.primary.dark,
              },
              '&.Mui-disabled': {
                backgroundColor: theme.palette.grey[300],
                color: theme.palette.grey[500],
              },
            }}
          >
            {isSubmitting ? (
              <LightningLoader size={18} color="#fff" />
            ) : (
              '보내기'
            )}
          </Button>
        </Box>
      </Box>
    </Dialog>
  );
}
