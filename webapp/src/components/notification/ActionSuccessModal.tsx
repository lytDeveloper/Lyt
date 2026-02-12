import { Dialog, Box, Typography, Button, useTheme } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import ExpandCircleDownOutlinedIcon from '@mui/icons-material/ExpandCircleDownOutlined';
interface ActionSuccessModalProps {
  open: boolean;
  onClose: () => void;
  message: string;
  type?: 'success' | 'error';
}

export default function ActionSuccessModal({ open, onClose, message, type = 'success' }: ActionSuccessModalProps) {
  const theme = useTheme();
  const [primaryLine, secondaryLine] = message.split('\n');

  return (
    <Dialog
      open={open}
      onClose={onClose}
      sx={{ zIndex: 3000 }}
      PaperProps={{
        sx: {
          borderRadius: '12px',
          padding: 2,
          margin: 2,
          width: '60%',
          maxWidth: 360,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
        },
      }}
    >
      {/* Icon */}
      <Box sx={{ mt: 1, mb: 0.5 }}>
        {type === 'success' ? (
          <ExpandCircleDownOutlinedIcon sx={{ fontSize: 24, color: theme.palette.icon.default }} />
        ) : (
          <ErrorOutlineIcon sx={{ fontSize: 24, color: theme.palette.status.Error }} />
        )}
      </Box>

      {/* Message */}
      <Box sx={{ textAlign: 'center', mb: 2 }}>
        <Typography
          sx={{
            fontFamily: 'Pretendard, sans-serif',
            fontSize: 18,
            fontWeight: 700,
            color: theme.palette.text.primary,
          }}
        >
          {primaryLine}
        </Typography>
        {secondaryLine && (
          <Typography
            sx={{
              mt: 0.75,
              fontFamily: 'Pretendard, sans-serif',
              fontSize: 14,
              fontWeight: 500,
              color: theme.palette.text.secondary,
            }}
          >
            {secondaryLine}
          </Typography>
        )}
      </Box>

      {/* Confirm Button */}
      <Button
        onClick={onClose}
        fullWidth
        variant="contained"
        sx={{
          height: 40,
          width: '44%',
          borderRadius: '22px',
          backgroundColor: theme.palette.primary.main,
          fontSize: 16,
          fontWeight: 600,
          color: theme.palette.primary.contrastText,
          boxShadow: 'none',
        }}
      >
        확인
      </Button>
    </Dialog>
  );
}

