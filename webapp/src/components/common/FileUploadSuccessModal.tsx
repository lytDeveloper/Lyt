import { Dialog, Box, Typography, Button, useTheme } from '@mui/material';
import ExpandCircleDownOutlinedIcon from '@mui/icons-material/ExpandCircleDownOutlined';

interface FileUploadSuccessModalProps {
  open: boolean;
  onClose: () => void;
}

export default function FileUploadSuccessModal({ open, onClose }: FileUploadSuccessModalProps) {
  const theme = useTheme();
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"

      PaperProps={{
        sx: {
          borderRadius: '12px',
          padding: 3,
          margin: 2,
          width: '60%',
          maxWidth: 360,
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        {/* Check Icon */}
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
          <ExpandCircleDownOutlinedIcon sx={{ fontSize: 24, color: theme.palette.icon.default }} />
        </Box>

        {/* Success Message */}
        <Typography
          sx={{
            fontFamily: 'Pretendard, sans-serif',
            fontSize: 18,
            fontWeight: 700,
            color: theme.palette.text.primary,
            textAlign: 'center',
          }}
        >
          파일 공유 완료!
        </Typography>

        {/* Confirm Button */}
        <Button
          onClick={onClose}
          variant="contained"
          fullWidth
          sx={{
            backgroundColor: theme.palette.primary.main,
            height: 40,
            width: '44%',
            borderRadius: '22px',
            fontSize: 16,
            fontWeight: 600,
            textTransform: 'none',
            mt: 2,
          }}
        >
          확인
        </Button>
      </Box>
    </Dialog>
  );
}
