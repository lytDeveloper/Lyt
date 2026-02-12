import { Dialog, Box, Typography, Button, useTheme } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

interface SaveDraftDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function SaveDraftDialog({
  open,
  onConfirm,
  onCancel,
}: SaveDraftDialogProps) {
  const theme = useTheme();

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '20px',
          padding: 0,
        },
      }}
    >
      <Box sx={{ padding: '24px' }}>
        {/* Icon and Title */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Box
            sx={{
              width: 30,
              height: 30,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <InfoOutlinedIcon sx={{ color: theme.palette.icon.default, fontSize: 24 }} />
          </Box>
          <Typography
            sx={{
              fontFamily: 'Pretendard, sans-serif',
              fontWeight: 700,
              fontSize: 18,
              color: theme.palette.text.primary,
            }}
          >
            임시 저장
          </Typography>
        </Box>

        {/* Description */}
        <Typography
          sx={{
            fontFamily: 'Pretendard, sans-serif',
            fontWeight: 400,
            fontSize: 14,
            color: '#4B5563',
            marginBottom: 3,
            lineHeight: '20px',
          }}
        >
          작성 중인 내용을 임시 저장하시겠습니까?
          <br />
          저장하지 않으면 입력한 내용이 사라집니다.
        </Typography>

        {/* Buttons */}
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            justifyContent: 'flex-end',
          }}
        >
          <Button
            onClick={onCancel}
            sx={{
              fontFamily: 'Pretendard, sans-serif',
              fontWeight: 600,
              fontSize: 14,
              textTransform: 'none',
              borderRadius: '20px',
              padding: '10px 20px',
              backgroundColor: theme.palette.grey[100],
              color: '#4B5563',
            }}
          >
            취소
          </Button>
          <Button
            onClick={onConfirm}
            sx={{
              fontFamily: 'Pretendard, sans-serif',
              fontWeight: 600,
              fontSize: 14,
              textTransform: 'none',
              borderRadius: '20px',
              padding: '10px 20px',
              backgroundColor: '#2563EB',
              color: '#FFFFFF',
            }}
          >
            저장
          </Button>
        </Box>
      </Box>
    </Dialog>
  );
}

