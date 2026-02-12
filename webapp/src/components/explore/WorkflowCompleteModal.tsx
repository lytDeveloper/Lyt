import { Dialog, DialogContent, Box, Typography, useTheme } from '@mui/material';
import ExpandCircleDownOutlinedIcon from '@mui/icons-material/ExpandCircleDownOutlined';

interface WorkflowCompleteModalProps {
  open: boolean;
  onClose: () => void;
}

export default function WorkflowCompleteModal({ open, onClose }: WorkflowCompleteModalProps) {
  const theme = useTheme();
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '12px',
          width: '60%',
          maxWidth: 360,
          margin: 2,
        },
      }}
    >
      <DialogContent
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: 2,
        }}
      >
        {/* Check Icon */}
        <ExpandCircleDownOutlinedIcon
          sx={{
            fontSize: 24,
            color: theme.palette.icon.default,
          }}
        />

        {/* Message */}
        <Typography
          sx={{
            fontFamily: 'Pretendard, sans-serif',
            fontSize: 18,
            fontWeight: 600,
            color: theme.palette.text.primary,
          }}
        >
          완료되었어요.
        </Typography>

        {/* Confirm Button */}
        <Box
          onClick={onClose}
          sx={{
            height: 40,
            width: '44%',
            borderRadius: '22px',
            backgroundColor: theme.palette.primary.main,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            mt: 1,
          }}
        >
          <Typography
            sx={{
              fontFamily: 'Pretendard, sans-serif',
              fontSize: 16,
              fontWeight: 600,
              color: theme.palette.primary.contrastText,
            }}
          >
            확인
          </Typography>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
