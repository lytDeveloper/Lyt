import { Box, Typography , useTheme } from '@mui/material';
import { motion } from 'framer-motion';

interface ProgressBarProps {
  percentage: number; // 0-100
  label?: string;     // Optional label like "진행률"
}

export default function ProgressBar({ percentage, label = '진행률' }: ProgressBarProps) {
  const theme = useTheme();
  // Ensure percentage is between 0-100
  const clampedPercentage = Math.min(100, Math.max(0, percentage));

  return (
    <Box sx={{ width: '100%' }}>
      {/* Label and Percentage */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 1,
        }}
      >
        <Typography
          sx={{
            fontFamily: 'Pretendard, sans-serif',
            fontSize: 14,
            fontWeight: 300,
            color: theme.palette.text.primary,
          }}
        >
          {label}
        </Typography>
        <Typography
          sx={{
            fontFamily: 'Pretendard, sans-serif',
            fontSize: 14,
            fontWeight: 600,
            color: theme.palette.primary.main,
          }}
        >
          {Math.round(clampedPercentage)}%
        </Typography>
      </Box>

      {/* Progress Bar Background */}
      <Box
        sx={{
          width: '100%',
          height: 8,
          backgroundColor: theme.palette.grey[100],
          borderRadius: '100px',
          overflow: 'hidden',
        }}
      >
        {/* Animated Progress Bar Fill */}
        <motion.div
          style={{
            height: '100%',
            backgroundColor: theme.palette.primary.main,
            borderRadius: '100px',
          }}
          initial={{ width: 0 }}
          animate={{ width: `${clampedPercentage}%` }}
          transition={{
            duration: 1,
            ease: 'easeOut',
          }}
        />
      </Box>
    </Box>
  );
}
