import { Dialog, Box, Typography, Button, useTheme } from '@mui/material';
import ExpandCircleDownOutlinedIcon from '@mui/icons-material/ExpandCircleDownOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import type { ReactNode } from 'react';

type Variant = 'success' | 'info' | 'warning';

interface ActionResultModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  onConfirm?: () => void;
  variant?: Variant;
  icon?: ReactNode;
}

export default function ActionResultModal({
  open,
  onClose,
  title,
  description,
  confirmLabel = '확인',
  onConfirm,
  variant = 'success',
  icon,
}: ActionResultModalProps) {
  const theme = useTheme();

  // Semantic colors kept for visual clarity (success/info/warning distinction)
  const VARIANT_STYLES: Record<Variant, { bg: string; iconColor: string; IconComponent: typeof ExpandCircleDownOutlinedIcon }> = {
    success: { bg: theme.palette.bgColor.default, iconColor: theme.palette.icon.default, IconComponent: ExpandCircleDownOutlinedIcon },
    info: { bg: theme.palette.bgColor.default, iconColor: theme.palette.icon.default, IconComponent: InfoOutlinedIcon },
    warning: { bg: theme.palette.bgColor.default, iconColor: theme.palette.icon.default, IconComponent: ErrorOutlineIcon },
  };

  const { IconComponent } = VARIANT_STYLES[variant];

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    } else {
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      PaperProps={{
        sx: {
          borderRadius: '12px',
          padding: 2,
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
          {icon ?? <IconComponent sx={{ fontSize: 24, color: theme.palette.icon.default }} />}
        </Box>

        <Box sx={{ textAlign: 'center' }}>
          <Typography
            sx={{
              fontFamily: 'Pretendard, sans-serif',
              fontSize: 18,
              fontWeight: 700,
              color: theme.palette.text.primary,
              mb: description ? 1 : 0,
              wordBreak: 'keep-all',
            }}
          >
            {title}
          </Typography>
          {description && (
            <Typography
              sx={{
                fontFamily: 'Pretendard, sans-serif',
                fontSize: 14,
                color: theme.palette.text.secondary,
                lineHeight: 1.5,
                wordBreak: 'keep-all',
                whiteSpace: 'pre-line',
              }}
            >
              {description}
            </Typography>
          )}
        </Box>

        <Button
          onClick={handleConfirm}
          variant="contained"
          fullWidth
          sx={{
            height: 40,
            width: '44%',
            borderRadius: '22px',
            backgroundColor: variant === 'warning' ? theme.palette.status.Error : theme.palette.primary.main,
            fontFamily: 'Pretendard, sans-serif',
            fontSize: 16,
            fontWeight: 600,
            textTransform: 'none',
            mt: 2,
          }}
        >
          {confirmLabel}
        </Button>
      </Box>
    </Dialog>
  );
}
