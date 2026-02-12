/**
 * BudgetDurationRow Component
 *
 * Displays budget and duration as separate boxes:
 * - Budget with dollar icon (hidden if null)
 * - Duration with calendar icon
 */

import { Box, Typography, useTheme } from '@mui/material';
import MoneyOutlinedIcon from '@mui/icons-material/MoneyOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';

interface Props {
  budget: string | null;
  duration: string;
}

export default function BudgetDurationRow({ budget, duration }: Props) {
  const theme = useTheme();

  // If no budget and no duration, hide entirely
  if (!budget && !duration) return null;

  return (
    <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
      {/* Budget (only show if exists) */}
      {budget && (
        <Box sx={{
          flex: 1,
          px: 3,
          py: 2,
          boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.1)',
          borderRadius: '12px',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <MoneyOutlinedIcon sx={{ fontSize: 20, color: theme.palette.icon.default }} />
            <Typography
              sx={{
                fontFamily: 'Pretendard, sans-serif',
                fontSize: 14,
                fontWeight: 500,
                color: theme.palette.text.primary,
              }}
            >
              예산
            </Typography>
          </Box>
          <Typography
            sx={{
              fontFamily: 'Pretendard, sans-serif',
              fontSize: 15,
              color: theme.palette.text.primary,
              lineHeight: 1.6,
            }}
          >
            {budget}
          </Typography>
        </Box>
      )}

      {/* Duration */}
      {duration && (
        <Box sx={{
          flex: 1,
          px: 3,
          py: 2,
          boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.1)',
          borderRadius: '12px',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <CalendarMonthOutlinedIcon sx={{ fontSize: 20, color: theme.palette.icon.default }} />
            <Typography
              sx={{
                fontFamily: 'Pretendard, sans-serif',
                fontSize: 14,
                fontWeight: 500,
                color: theme.palette.text.primary,
              }}
            >
              기간
            </Typography>
          </Box>
          <Typography
            sx={{
              fontFamily: 'Pretendard, sans-serif',
              fontSize: 15,
              color: theme.palette.text.primary,
              lineHeight: 1.6,
            }}
          >
            {duration}
          </Typography>
        </Box>
      )}
    </Box>
  );
}
